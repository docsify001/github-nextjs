/**
 * 增量导出已同步的 SKILL（供 web 端 cron 对账拉取，与实时 push 互为兜底）。
 * 数据源：project_skills 左连 projects、repos；按 projectSkills.id 游标分页。
 */

import { and, asc, eq, gte, gt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DB } from "@/drizzle/database";
import { schema } from "@/drizzle/database";
import {
  buildSkillWebhookPayload,
  type SkillWebhookPayload,
} from "./send-skill-to-web";

/** 与 web 端共享的 repo 统计（仅 pull 通道附带，用于 trust tier / quality 计算） */
export interface SkillExportRepoStats {
  stars: number | null;
  forks: number | null;
  license: string | null;
  archived: boolean | null;
  /** raw GitHub topics */
  topics: string[] | null;
  pushedAt: Date | null;
  repoDescription: string | null;
}

export interface SkillExportItem {
  payload: SkillWebhookPayload;
  contentHash: string | null;
  syncedToWebAt: Date | null;
  repoStats: SkillExportRepoStats | null;
}

export interface ExportSyncedSkillsOptions {
  /** 只导出 syncedToWebAt >= since 的记录（ISO 字符串） */
  since?: string;
  /** 每页条数，1..500，默认 100 */
  limit?: number;
  /** 游标（上一页 nextCursor 返回的 project_skills.id） */
  cursor?: string;
  /** 是否附带 repo 统计，默认 true */
  includeStats?: boolean;
}

export interface ExportSyncedSkillsResult {
  items: SkillExportItem[];
  nextCursor: string | null;
}

function parseCursor(cursor?: string): string | null {
  const trimmed = cursor?.trim();
  return trimmed?.length ? trimmed : null;
}

export async function exportSyncedSkills(
  db: DB,
  options: ExportSyncedSkillsOptions = {}
): Promise<ExportSyncedSkillsResult> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const includeStats = options.includeStats ?? true;
  const cursor = parseCursor(options.cursor);

  const conditions: SQL[] = [];
  if (cursor) conditions.push(gt(schema.projectSkills.id, cursor));
  if (options.since) {
    const since = new Date(options.since);
    if (!Number.isNaN(since.getTime())) {
      conditions.push(gte(schema.projectSkills.syncedToWebAt, since));
    }
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      skillId: schema.projectSkills.id,
      skillDir: schema.projectSkills.skillDir,
      name: schema.projectSkills.name,
      description: schema.projectSkills.description,
      descriptionZh: schema.projectSkills.descriptionZh,
      readme: schema.projectSkills.readme,
      readmeZh: schema.projectSkills.readmeZh,
      version: schema.projectSkills.version,
      contentHash: schema.projectSkills.contentHash,
      syncedToWebAt: schema.projectSkills.syncedToWebAt,
      repoOwner: schema.repos.owner,
      repoName: schema.repos.name,
      defaultBranch: schema.repos.default_branch,
      stars: schema.repos.stars,
      forks: schema.repos.forks,
      license: schema.repos.license_spdx_id,
      archived: schema.repos.archived,
      topics: schema.repos.topics,
      pushedAt: schema.repos.pushed_at,
      repoDescription: schema.repos.description,
    })
    .from(schema.projectSkills)
    .innerJoin(schema.projects, eq(schema.projectSkills.projectId, schema.projects.id))
    .innerJoin(schema.repos, eq(schema.projects.repoId, schema.repos.id))
    .where(where)
    .orderBy(asc(schema.projectSkills.id))
    .limit(limit);

  const items: SkillExportItem[] = rows.map((row) => ({
    payload: buildSkillWebhookPayload({
      repoOwner: row.repoOwner,
      repoName: row.repoName,
      skillDir: row.skillDir,
      name: row.name,
      description: row.description,
      descriptionZh: row.descriptionZh,
      readme: row.readme,
      readmeZh: row.readmeZh,
      version: row.version,
    }),
    contentHash: row.contentHash,
    syncedToWebAt: row.syncedToWebAt,
    repoStats:
      includeStats && row.repoOwner
        ? {
            stars: row.stars,
            forks: row.forks,
            license: row.license,
            archived: row.archived,
            topics: Array.isArray(row.topics)
              ? row.topics.filter((t): t is string => typeof t === "string")
              : null,
            pushedAt: row.pushedAt,
            repoDescription: row.repoDescription,
          }
        : null,
  }));

  const nextCursor = rows.length === limit ? rows[rows.length - 1].skillId : null;
  return { items, nextCursor };
}