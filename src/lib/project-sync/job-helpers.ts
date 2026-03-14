import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import type { DB } from "@/drizzle/database";
import { projectSyncJobs } from "@/drizzle/schema/project-sync-jobs";

const ERROR_MESSAGE_MAX_LENGTH = 2000;

function truncateError(msg: string): string {
  if (msg.length <= ERROR_MESSAGE_MAX_LENGTH) return msg;
  return msg.slice(0, ERROR_MESSAGE_MAX_LENGTH - 3) + "...";
}

export type TriggeredBy = (typeof projectSyncJobs.$inferSelect.triggered_by);

export async function createProjectSyncJob(
  db: DB,
  params: {
    projectId: string;
    repoId: string;
    triggeredBy: TriggeredBy;
    webhookUrl?: string | null;
  }
) {
  const now = new Date();
  const [row] = await db
    .insert(projectSyncJobs)
    .values({
      id: nanoid(),
      project_id: params.projectId,
      repo_id: params.repoId,
      status: "pending",
      triggered_by: params.triggeredBy,
      webhook_url: params.webhookUrl ?? null,
      retry_count: 0,
      created_at: now,
      updated_at: now,
    })
    .returning();
  return row!;
}

export async function updateProjectSyncJobToRunning(db: DB, jobId: string) {
  const now = new Date();
  await db
    .update(projectSyncJobs)
    .set({ status: "running", started_at: now, updated_at: now })
    .where(eq(projectSyncJobs.id, jobId));
}

export async function updateProjectSyncJobToSuccess(db: DB, jobId: string) {
  const now = new Date();
  await db
    .update(projectSyncJobs)
    .set({
      status: "success",
      completed_at: now,
      updated_at: now,
      error_message: null,
    })
    .where(eq(projectSyncJobs.id, jobId));
}

export async function updateProjectSyncJobToFailed(db: DB, jobId: string, errorMessage: string) {
  const now = new Date();
  await db
    .update(projectSyncJobs)
    .set({
      status: "failed",
      completed_at: now,
      updated_at: now,
      error_message: truncateError(errorMessage),
    })
    .where(eq(projectSyncJobs.id, jobId));
}

export async function incrementProjectSyncJobRetryAndSetRunning(db: DB, jobId: string) {
  const [job] = await db
    .select({ retry_count: projectSyncJobs.retry_count })
    .from(projectSyncJobs)
    .where(eq(projectSyncJobs.id, jobId))
    .limit(1);
  const now = new Date();
  await db
    .update(projectSyncJobs)
    .set({
      status: "running",
      started_at: now,
      updated_at: now,
      retry_count: (job?.retry_count ?? 0) + 1,
    })
    .where(eq(projectSyncJobs.id, jobId));
}
