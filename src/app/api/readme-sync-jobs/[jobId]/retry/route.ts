import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/database";
import { readmeSyncJobs } from "@/drizzle/schema";
import { verifyApiAuth } from "@/lib/auth/auth-utils";
import { incrementJobRetryAndSetRunning } from "@/lib/readme-sync/job-helpers";
import { runReadmeSyncForRepo } from "@/lib/readme-sync/run-readme-sync-for-repo";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const [job] = await db
    .select()
    .from(readmeSyncJobs)
    .where(eq(readmeSyncJobs.id, jobId))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed jobs can be retried" },
      { status: 400 }
    );
  }

  await incrementJobRetryAndSetRunning(db, jobId);
  void runReadmeSyncForRepo(db, job.repo_id, jobId).then(() => {
    // 状态已在 runReadmeSyncForRepo 内更新
  });

  return NextResponse.json(
    {
      message: "Retry started",
      job_id: jobId,
      repo_id: job.repo_id,
    },
    { status: 202 }
  );
}
