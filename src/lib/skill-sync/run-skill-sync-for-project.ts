/**
 * 对单个 skill 项目执行同步：拉取 SKILL.md → 解析 → 翻译 → 本地 DB 保存 → 发送 webhook。
 * 供「项目创建后异步触发」与定时任务 sync-skill-repos 共用。
 */

import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DB } from "@/drizzle/database";
import { schema } from "@/drizzle/database";
import { ProjectService } from "@/drizzle/projects";
import {
  fetchSkillMd,
  isSkillDirMode,
  listSkillDirs,
  parseSkillMd,
} from "@/lib/skill-sync/fetch-and-parse-skill";
import {
  buildSkillWebhookPayload,
  sendSkillToWeb,
} from "@/lib/skill-sync/send-skill-to-web";
import { translateSkillToZh } from "@/lib/skill-sync/translate-skill";

const SKILLS_WEBHOOK_URL = process.env.SKILLS_WEBHOOK_URL;
const SKILLS_WEBHOOK_TOKEN = process.env.SKILLS_WEBHOOK_TOKEN;

export type SkillSyncLogger = {
  info: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
};

function defaultLogger(): SkillSyncLogger {
  const prefix = "[skill-sync]";
  return {
    info: (msg, ...args) => console.log(prefix, msg, ...args),
    debug: (msg, ...args) => console.debug(prefix, msg, ...args),
    warn: (msg, ...args) => console.warn(prefix, msg, ...args),
    error: (msg, ...args) => console.error(prefix, msg, ...args),
  };
}

export type RunSkillSyncOptions = {
  logger?: SkillSyncLogger;
};

export type RunSkillSyncResult = {
  success: boolean;
  synced: number;
  error?: string;
};

function contentHash(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * 对指定 project（type=skill）执行一次 skill 同步：拉取 → 解析 → 翻译 → 写入 project_skills → 推送到 web。
 * 若 SKILLS_WEBHOOK_URL 未配置则直接返回 success: false。
 */
export async function runSkillSyncForProject(
  db: DB,
  projectId: string,
  options: RunSkillSyncOptions = {}
): Promise<RunSkillSyncResult> {
  const log = options.logger ?? defaultLogger();

  if (!SKILLS_WEBHOOK_URL?.trim()) {
    log.warn("SKILLS_WEBHOOK_URL 未配置，跳过 skill 同步");
    return { success: false, synced: 0, error: "SKILLS_WEBHOOK_URL not set" };
  }

  log.info("runSkillSyncForProject 开始", { projectId });

  const projectService = new ProjectService(db);
  let project: Awaited<ReturnType<ProjectService["getProjectById"]>>;
  try {
    project = await projectService.getProjectById(projectId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("project load failed", { projectId, error: msg });
    return { success: false, synced: 0, error: msg };
  }

  const repo = project.repo;
  if (!repo) {
    log.error("project has no repo", { project: project.slug });
    return { success: false, synced: 0, error: `Project ${project.slug} has no repo` };
  }

  const owner = repo.owner;
  const name = repo.name;
  const fullName = repo.full_name ?? `${owner}/${name}`;
  const defaultBranch = (repo as { default_branch?: string }).default_branch ?? "main";
  const skillMdPath = (project as { skillMdPath?: string }).skillMdPath ?? "skills";

  log.info("project sync start 开始同步", { project: project.slug, repo: fullName, skillMdPath });

  const runOne = async (skillDir: string, mdPath: string): Promise<boolean> => {
    const ctx = { project: project.slug, skill_dir: skillDir };
    const now = new Date();

    try {
      log.info("skill 拉取 SKILL.md", ctx);
      const raw = await fetchSkillMd(owner, name, mdPath, defaultBranch);
      log.info("skill 拉取完成", { ...ctx, size: raw.length });

      log.info("skill 解析 SKILL.md", ctx);
      const parsed = parseSkillMd(raw);
      log.info("skill 解析完成", { ...ctx, name: parsed.name });

      let descriptionZh = "";
      let readmeZh = "";
      try {
        log.info("skill 翻译中", ctx);
        const translated = await translateSkillToZh(parsed.description, parsed.readme);
        descriptionZh = translated.descriptionZh;
        readmeZh = translated.readmeZh;
        log.info("skill 翻译完成", ctx);
      } catch (translateErr) {
        const translateMsg = translateErr instanceof Error ? translateErr.message : String(translateErr);
        log.error("skill 翻译失败，已保存英文内容，中文为空", { ...ctx, error: translateMsg });
      }

      const hash = contentHash(raw);
      const row = {
        id: nanoid(),
        projectId: project.id,
        skillDir,
        name: parsed.name,
        description: parsed.description,
        descriptionZh,
        readme: parsed.readme,
        readmeZh,
        version: parsed.version ?? null,
        contentHash: hash,
        updatedAt: now,
      };

      log.info("skill 保存到本地 DB", ctx);
      await db
        .insert(schema.projectSkills)
        .values({
          ...row,
          syncedToWebAt: null,
          lastSyncError: null,
          lastSyncAttemptAt: null,
        })
        .onConflictDoUpdate({
          target: [schema.projectSkills.projectId, schema.projectSkills.skillDir],
          set: {
            name: row.name,
            description: row.description,
            descriptionZh: row.descriptionZh,
            readme: row.readme,
            readmeZh: row.readmeZh,
            version: row.version,
            contentHash: row.contentHash,
            updatedAt: row.updatedAt,
          },
        });
      log.info("skill 已写入 project_skills 表", { ...ctx, name: parsed.name });

      await db
        .update(schema.projectSkills)
        .set({ lastSyncAttemptAt: now })
        .where(
          and(
            eq(schema.projectSkills.projectId, project.id),
            eq(schema.projectSkills.skillDir, skillDir)
          )
        );

      const payload = buildSkillWebhookPayload({
        repoOwner: owner,
        repoName: name,
        skillDir,
        name: parsed.name,
        description: parsed.description,
        descriptionZh,
        readme: parsed.readme,
        readmeZh,
        version: parsed.version,
      });

      log.info("skill 同步到 web 发送 webhook", ctx);
      const sendResult = await sendSkillToWeb(SKILLS_WEBHOOK_URL, payload, {
        token: SKILLS_WEBHOOK_TOKEN,
      });

      if (!sendResult.success) {
        log.error("skill webhook 失败，已记录错误支持重试", { ...ctx, error: sendResult.error });
        await db
          .update(schema.projectSkills)
          .set({ lastSyncError: sendResult.error ?? "Unknown error", lastSyncAttemptAt: now })
          .where(
            and(
              eq(schema.projectSkills.projectId, project.id),
              eq(schema.projectSkills.skillDir, skillDir)
            )
          );
        return false;
      }

      await db
        .update(schema.projectSkills)
        .set({ syncedToWebAt: now, lastSyncError: null })
        .where(
          and(
            eq(schema.projectSkills.projectId, project.id),
            eq(schema.projectSkills.skillDir, skillDir)
          )
        );

      log.info("skill 已同步到 web", { ...ctx, name: parsed.name });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("skill 拉取/解析/保存失败", { ...ctx, error: msg });
      return false;
    }
  };

  try {
    if (isSkillDirMode(skillMdPath)) {
      log.info("读取 skills 目录列表", { project: project.slug, path: skillMdPath });
      const dirs = await listSkillDirs(owner, name, skillMdPath, defaultBranch);
      log.info("skills 目录列表获取完成", { project: project.slug, count: dirs.length, dirs });

      let synced = 0;
      for (let i = 0; i < dirs.length; i++) {
        const dir = dirs[i];
        log.info("skill progress", {
          project: project.slug,
          skill_dir: dir,
          current: i + 1,
          total: dirs.length,
        });
        const mdPath = `${skillMdPath}/${dir}/SKILL.md`;
        if (await runOne(dir, mdPath)) synced++;
      }

      log.info("project sync done 项目同步完成", {
        project: project.slug,
        synced,
        total: dirs.length,
      });
      return { success: true, synced };
    }

    log.info("skill progress 单文件模式", { project: project.slug, skill_dir: name, current: 1, total: 1 });
    const ok = await runOne(name, skillMdPath);
    log.info("project sync done 项目同步完成", { project: project.slug, synced: ok ? 1 : 0, total: 1 });
    return { success: true, synced: ok ? 1 : 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("project sync failed", { project: project.slug, error: msg });
    return { success: false, synced: 0, error: msg };
  }
}
