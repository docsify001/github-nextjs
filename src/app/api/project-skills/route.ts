import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/drizzle/database";
import {
  projectSkills,
  projects,
  repos,
} from "@/drizzle/schema";
import { verifyApiAuth } from "@/lib/auth/auth-utils";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const STATUS_VALUES = ["all", "synced", "failed", "pending"] as const;
type StatusValue = (typeof STATUS_VALUES)[number];

export async function GET(request: NextRequest) {
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "all";
  const status: StatusValue = STATUS_VALUES.includes(statusParam as any)
    ? (statusParam as StatusValue)
    : "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (status === "synced") {
    conditions.push(isNotNull(projectSkills.syncedToWebAt));
  } else if (status === "failed") {
    conditions.push(isNotNull(projectSkills.lastSyncError));
  } else if (status === "pending") {
    conditions.push(isNull(projectSkills.syncedToWebAt));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: projectSkills.id,
      projectId: projectSkills.projectId,
      skillDir: projectSkills.skillDir,
      name: projectSkills.name,
      description: projectSkills.description,
      descriptionZh: projectSkills.descriptionZh,
      version: projectSkills.version,
      contentHash: projectSkills.contentHash,
      syncedToWebAt: projectSkills.syncedToWebAt,
      lastSyncError: projectSkills.lastSyncError,
      lastSyncAttemptAt: projectSkills.lastSyncAttemptAt,
      createdAt: projectSkills.createdAt,
      updatedAt: projectSkills.updatedAt,
      projectName: projects.name,
      projectSlug: projects.slug,
      repoOwner: repos.owner,
      repoName: repos.name,
    })
    .from(projectSkills)
    .innerJoin(projects, eq(projects.id, projectSkills.projectId))
    .innerJoin(repos, eq(repos.id, projects.repoId))
    .where(where)
    .orderBy(desc(projectSkills.updatedAt), desc(projectSkills.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: count() })
    .from(projectSkills)
    .where(where);
  const total = totalRow?.count ?? 0;

  const items = rows.map((r) => ({
    id: r.id,
    project_id: r.projectId,
    skill_dir: r.skillDir,
    name: r.name,
    description: r.description,
    description_zh: r.descriptionZh,
    version: r.version,
    content_hash: r.contentHash,
    synced_to_web_at: r.syncedToWebAt?.toISOString() ?? null,
    last_sync_error: r.lastSyncError,
    last_sync_attempt_at: r.lastSyncAttemptAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt?.toISOString() ?? null,
    project_name: r.projectName,
    project_slug: r.projectSlug,
    repo_full_name: `${r.repoOwner}/${r.repoName}`,
  }));

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    status,
  });
}