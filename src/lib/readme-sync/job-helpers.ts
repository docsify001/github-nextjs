import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import type { DB } from "@/drizzle/database";
import { readmeSyncJobs } from "@/drizzle/schema/readme-sync-jobs";

const ERROR_MESSAGE_MAX_LENGTH = 2000;

function truncateError(msg: string): string {
  if (msg.length <= ERROR_MESSAGE_MAX_LENGTH) return msg;
  return msg.slice(0, ERROR_MESSAGE_MAX_LENGTH - 3) + "...";
}

export type TriggeredBy = (typeof readmeSyncJobs.$inferSelect.triggered_by);

export async function createReadmeSyncJob(
  db: DB,
  params: { repoId: string; triggeredBy: TriggeredBy }
) {
  const now = new Date();
  const [row] = await db
    .insert(readmeSyncJobs)
    .values({
      id: nanoid(),
      repo_id: params.repoId,
      status: "pending",
      triggered_by: params.triggeredBy,
      retry_count: 0,
      created_at: now,
      updated_at: now,
    })
    .returning();
  return row!;
}

export async function updateJobToRunning(db: DB, jobId: string) {
  const now = new Date();
  await db
    .update(readmeSyncJobs)
    .set({ status: "running", started_at: now, updated_at: now })
    .where(eq(readmeSyncJobs.id, jobId));
}

export async function updateJobToSuccess(db: DB, jobId: string) {
  const now = new Date();
  await db
    .update(readmeSyncJobs)
    .set({
      status: "success",
      completed_at: now,
      updated_at: now,
      error_message: null,
    })
    .where(eq(readmeSyncJobs.id, jobId));
}

export async function updateJobToFailed(db: DB, jobId: string, errorMessage: string) {
  const now = new Date();
  await db
    .update(readmeSyncJobs)
    .set({
      status: "failed",
      completed_at: now,
      updated_at: now,
      error_message: truncateError(errorMessage),
    })
    .where(eq(readmeSyncJobs.id, jobId));
}

export async function incrementJobRetryAndSetRunning(db: DB, jobId: string) {
  const [job] = await db
    .select({ retry_count: readmeSyncJobs.retry_count })
    .from(readmeSyncJobs)
    .where(eq(readmeSyncJobs.id, jobId))
    .limit(1);
  const now = new Date();
  await db
    .update(readmeSyncJobs)
    .set({
      status: "running",
      started_at: now,
      updated_at: now,
      retry_count: (job?.retry_count ?? 0) + 1,
    })
    .where(eq(readmeSyncJobs.id, jobId));
}
