CREATE TABLE IF NOT EXISTS "project_sync_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "repo_id" text NOT NULL REFERENCES "repos"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "triggered_by" text NOT NULL,
  "webhook_url" text,
  "error_message" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp
);

CREATE INDEX IF NOT EXISTS "project_sync_jobs_repo_id_idx" ON "project_sync_jobs" ("repo_id");
CREATE INDEX IF NOT EXISTS "project_sync_jobs_status_idx" ON "project_sync_jobs" ("status");
CREATE INDEX IF NOT EXISTS "project_sync_jobs_created_at_idx" ON "project_sync_jobs" ("created_at");
