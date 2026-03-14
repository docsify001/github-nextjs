import { NextRequest, NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/drizzle/database";
import { readmeSyncJobs, repos } from "@/drizzle/schema";
import { verifyApiAuth } from "@/lib/auth/auth-utils";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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
  const status =
    statusParam === "pending" || statusParam === "running" || statusParam === "success" || statusParam === "failed"
      ? statusParam
      : "failed";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: readmeSyncJobs.id,
      repo_id: readmeSyncJobs.repo_id,
      status: readmeSyncJobs.status,
      triggered_by: readmeSyncJobs.triggered_by,
      started_at: readmeSyncJobs.started_at,
      completed_at: readmeSyncJobs.completed_at,
      error_message: readmeSyncJobs.error_message,
      retry_count: readmeSyncJobs.retry_count,
      created_at: readmeSyncJobs.created_at,
      updated_at: readmeSyncJobs.updated_at,
      repo_owner: repos.owner,
      repo_name: repos.name,
    })
    .from(readmeSyncJobs)
    .innerJoin(repos, eq(repos.id, readmeSyncJobs.repo_id))
    .where(eq(readmeSyncJobs.status, status))
    .orderBy(desc(readmeSyncJobs.created_at))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: count() })
    .from(readmeSyncJobs)
    .where(eq(readmeSyncJobs.status, status));
  const total = totalRow?.count ?? 0;

  const items = rows.map((r) => ({
    id: r.id,
    repo_id: r.repo_id,
    status: r.status,
    triggered_by: r.triggered_by,
    started_at: r.started_at?.toISOString() ?? null,
    completed_at: r.completed_at?.toISOString() ?? null,
    error_message: r.error_message,
    retry_count: r.retry_count,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at?.toISOString() ?? null,
    repo_full_name: `${r.repo_owner}/${r.repo_name}`,
  }));

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
  });
}
