/**
 * Skill 类型仓库同步任务：拉取 SKILL.md → 解析 → 调用 web POST /api/webhook/daily/skills。
 * 设计见 docs/SKILL_REPO_SYNC_DESIGN.md；执行顺序建议在每日仓库 webhook 之后。
 */

import { and, eq, not } from "drizzle-orm";
import { createTask } from "@/lib/tasks/task-runner";
import { schema } from "@/drizzle/database";
import { fetchSkillMd, parseSkillMd } from "@/lib/skill-sync/fetch-and-parse-skill";
import {
  buildSkillWebhookPayload,
  sendSkillToWeb,
} from "@/lib/skill-sync/send-skill-to-web";

const SKILLS_WEBHOOK_URL = process.env.SKILLS_WEBHOOK_URL;
const SKILLS_WEBHOOK_TOKEN = process.env.SKILLS_WEBHOOK_TOKEN;

export const syncSkillReposTask = createTask({
  name: "sync-skill-repos",
  description:
    "Sync type=skill projects: fetch SKILL.md from GitHub, parse, and POST to web skills webhook. Run after daily repo webhook.",
  run: async ({ db, processProjects, logger }) => {
    if (!SKILLS_WEBHOOK_URL?.trim()) {
      logger.warn("SKILLS_WEBHOOK_URL not set; skipping skill sync");
      return {
        data: { skipped: true, reason: "SKILLS_WEBHOOK_URL not set" },
        meta: { processed: 0, success: 0, failed: 0 },
      };
    }

    type SkillItemData = { slug: string; fullName?: string; skillName?: string };

    const results = await processProjects(
      async (project): Promise<{ data: SkillItemData; meta: { updated: number; error?: number } }> => {
        const repo = project.repo;
        if (!repo) {
          logger.warn(`Project ${project.slug} has no repo; skip`);
          return {
            meta: { updated: 0, error: 1 },
            data: { slug: project.slug },
          };
        }

        const owner = repo.owner;
        const name = repo.name;
        const fullName = repo.full_name ?? `${owner}/${name}`;
        const defaultBranch = (repo as { default_branch?: string }).default_branch ?? "main";
        const skillMdPath = (project as { skillMdPath?: string }).skillMdPath ?? "SKILL.md";

        try {
          const raw = await fetchSkillMd(owner, name, skillMdPath, defaultBranch);
          const parsed = parseSkillMd(raw);

          const payload = buildSkillWebhookPayload({
            repoOwner: owner,
            repoName: name,
            skillDir: name,
            name: parsed.name,
            description: parsed.description,
            descriptionZh: "",
            readme: parsed.readme,
            readmeZh: "",
            version: parsed.version,
          });

          const sendResult = await sendSkillToWeb(SKILLS_WEBHOOK_URL, payload, {
            token: SKILLS_WEBHOOK_TOKEN,
          });

          if (!sendResult.success) {
            logger.error(`Skill webhook failed for ${fullName}: ${sendResult.error}`);
            return {
              meta: { updated: 0, error: 1 },
              data: { slug: project.slug, fullName },
            };
          }

          logger.debug(`Skill synced: ${fullName} -> ${parsed.name}`);
          return {
            meta: { updated: 1 },
            data: { slug: project.slug, fullName, skillName: parsed.name },
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`Skill sync failed for ${fullName}: ${msg}`);
          return {
            meta: { updated: 0, error: 1 },
            data: { slug: project.slug, fullName },
          };
        }
      },
      {
        where: and(
          eq(schema.projects.type, "skill"),
          not(eq(schema.projects.status, "deprecated"))
        ),
      }
    );

    const aggMeta = results.meta as Record<string, number>;
    const success = Number(aggMeta.updated) || 0;
    const failed = Number(aggMeta.error) || 0;
    const total = results.data?.length ?? 0;

    return {
      data: { processed: total, success, failed, items: results.data ?? [] },
      meta: {
        processed: total,
        success,
        failed,
        ...results.meta,
      },
    };
  },
});
