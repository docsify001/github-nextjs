import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/database";
import { projectSyncJobs } from "@/drizzle/schema";
import { verifyApiAuth } from "@/lib/auth/auth-utils";
import { incrementProjectSyncJobRetryAndSetRunning } from "@/lib/project-sync/job-helpers";
import { runStatsAndWebhookPipeline } from "@/lib/project-sync/run-stats-and-webhook";

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
    .from(projectSyncJobs)
    .where(eq(projectSyncJobs.id, jobId))
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

  await incrementProjectSyncJobRetryAndSetRunning(db, jobId);
  void runStatsAndWebhookPipeline(
    db,
    jobId,
    job.project_id,
    job.repo_id,
    job.webhook_url
  );

  return NextResponse.json(
    {
      message: "Retry started",
      job_id: jobId,
      project_id: job.project_id,
      repo_id: job.repo_id,
    },
    { status: 202 }
  );
}
