import { NextRequest, NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/drizzle/database";
import { projectSyncJobs, projects, repos } from "@/drizzle/schema";
import { verifyApiAuth } from "@/lib/auth/auth-utils";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const STATUS_VALUES = ["pending", "running", "success", "failed"] as const;

export async function GET(request: NextRequest) {
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "failed";
  const status = STATUS_VALUES.includes(statusParam as any) ? (statusParam as (typeof STATUS_VALUES)[number]) : "failed";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: projectSyncJobs.id,
      project_id: projectSyncJobs.project_id,
      repo_id: projectSyncJobs.repo_id,
      status: projectSyncJobs.status,
      triggered_by: projectSyncJobs.triggered_by,
      webhook_url: projectSyncJobs.webhook_url,
      started_at: projectSyncJobs.started_at,
      completed_at: projectSyncJobs.completed_at,
      error_message: projectSyncJobs.error_message,
      retry_count: projectSyncJobs.retry_count,
      created_at: projectSyncJobs.created_at,
      updated_at: projectSyncJobs.updated_at,
      project_name: projects.name,
      repo_owner: repos.owner,
      repo_name: repos.name,
    })
    .from(projectSyncJobs)
    .innerJoin(projects, eq(projects.id, projectSyncJobs.project_id))
    .innerJoin(repos, eq(repos.id, projectSyncJobs.repo_id))
    .where(eq(projectSyncJobs.status, status))
    .orderBy(desc(projectSyncJobs.created_at))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: count() })
    .from(projectSyncJobs)
    .where(eq(projectSyncJobs.status, status));
  const total = totalRow?.count ?? 0;

  const items = rows.map((r) => ({
    id: r.id,
    project_id: r.project_id,
    repo_id: r.repo_id,
    status: r.status,
    triggered_by: r.triggered_by,
    webhook_url: r.webhook_url,
    started_at: r.started_at?.toISOString() ?? null,
    completed_at: r.completed_at?.toISOString() ?? null,
    error_message: r.error_message,
    retry_count: r.retry_count,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at?.toISOString() ?? null,
    project_name: r.project_name,
    repo_full_name: `${r.repo_owner}/${r.repo_name}`,
  }));

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
  });
}
