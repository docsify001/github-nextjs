/**
 * Skill 类型仓库同步任务：拉取 SKILL.md → 解析 → 翻译为中文 → 调用 web POST /api/webhook/daily/skills。
 * 支持一仓多 skill（skills 目录下按子目录扫描）。设计见 docs/SKILL_REPO_SYNC_DESIGN.md、SKILL_REPO_MULTI_SKILL_ANALYSIS.md。
 * 单项目逻辑复用 runSkillSyncForProject，与「项目创建后异步同步」一致。
 */

import { and, eq, not } from "drizzle-orm";
import { createTask } from "@/lib/tasks/task-runner";
import { schema } from "@/drizzle/database";
import { runSkillSyncForProject } from "@/lib/skill-sync/run-skill-sync-for-project";

const SKILLS_WEBHOOK_URL = process.env.SKILLS_WEBHOOK_URL;

export const syncSkillReposTask = createTask({
  name: "sync-skill-repos",
  description:
    "Sync type=skill projects: fetch SKILL.md from GitHub, parse, translate to zh, and POST to web skills webhook. Supports multi-skill repo (skills/ dir). Run after daily repo webhook.",
  run: async ({ db, processProjects, logger }) => {
    if (!SKILLS_WEBHOOK_URL?.trim()) {
      logger.warn("SKILLS_WEBHOOK_URL not set; skipping skill sync");
      return {
        data: { skipped: true, reason: "SKILLS_WEBHOOK_URL not set" },
        meta: { processed: 0, success: 0, failed: 0 },
      };
    }

    type SkillItemData = { slug: string; fullName?: string; count?: number };

    const results = await processProjects(
      async (project): Promise<{
        data: SkillItemData;
        meta: { updated: number; error?: number };
      }> => {
        const fullName = project.repo
          ? `${project.repo.owner}/${project.repo.name}`
          : undefined;

        const skillSyncLogger = {
          info: (msg: string, ...args: unknown[]) => logger.info(msg, ...args),
          debug: (msg: string, ...args: unknown[]) => logger.debug(msg, ...args),
          warn: (msg: string, ...args: unknown[]) => logger.warn(msg, ...args),
          error: (msg: string, ...args: unknown[]) => logger.error(msg, ...args),
        };
        const result = await runSkillSyncForProject(db, project.id, { logger: skillSyncLogger });

        const updated = result.synced;
        const failed = result.success ? 0 : 1;

        return {
          meta: { updated, ...(failed > 0 && { error: failed }) },
          data: {
            slug: project.slug,
            fullName,
            count: updated,
          },
        };
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
