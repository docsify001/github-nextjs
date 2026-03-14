import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/database";
import { repos } from "@/drizzle/schema";
import { verifyApiAuth } from "@/lib/auth/auth-utils";
import { createReadmeSyncJob } from "@/lib/readme-sync/job-helpers";
import { runReadmeSyncForRepo } from "@/lib/readme-sync/run-readme-sync-for-repo";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { repoId } = await params;
  if (!repoId) {
    return NextResponse.json({ error: "repoId required" }, { status: 400 });
  }

  const [repo] = await db
    .select({ id: repos.id })
    .from(repos)
    .where(eq(repos.id, repoId))
    .limit(1);

  if (!repo) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  const job = await createReadmeSyncJob(db, {
    repoId,
    triggeredBy: "manual",
  });
  void runReadmeSyncForRepo(db, repoId, job.id);

  return NextResponse.json(
    {
      message: "README sync started",
      job_id: job.id,
      repo_id: repoId,
    },
    { status: 202 }
  );
}
