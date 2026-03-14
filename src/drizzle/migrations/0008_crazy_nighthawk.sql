CREATE TABLE "readme_sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"repo_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"triggered_by" text NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"repo_id" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "project_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"skill_dir" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"description_zh" text DEFAULT '' NOT NULL,
	"readme" text NOT NULL,
	"readme_zh" text DEFAULT '' NOT NULL,
	"version" text,
	"content_hash" text,
	"synced_to_web_at" timestamp,
	"last_sync_error" text,
	"last_sync_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "skill_md_path" text DEFAULT 'SKILL.md';--> statement-breakpoint
ALTER TABLE "readme_sync_jobs" ADD CONSTRAINT "readme_sync_jobs_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sync_jobs" ADD CONSTRAINT "project_sync_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sync_jobs" ADD CONSTRAINT "project_sync_jobs_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_skills_project_id_skill_dir_idx" ON "project_skills" USING btree ("project_id","skill_dir");