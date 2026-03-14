import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { repos } from "./repos";

export const PROJECT_SYNC_JOB_STATUSES = ["pending", "running", "success", "failed"] as const;
export const PROJECT_SYNC_TRIGGERED_BY = ["project_create", "retry"] as const;

export const projectSyncJobs = pgTable(
  "project_sync_jobs",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repo_id: text("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    status: text("status", { enum: PROJECT_SYNC_JOB_STATUSES }).notNull().default("pending"),
    triggered_by: text("triggered_by", { enum: PROJECT_SYNC_TRIGGERED_BY }).notNull(),
    webhook_url: text("webhook_url"),
    error_message: text("error_message"),
    started_at: timestamp("started_at"),
    completed_at: timestamp("completed_at"),
    retry_count: integer("retry_count").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at"),
  },
  (table) => []
);

export const projectSyncJobsRelations = relations(projectSyncJobs, ({ one }) => ({
  project: one(projects, { fields: [projectSyncJobs.project_id], references: [projects.id] }),
  repo: one(repos, { fields: [projectSyncJobs.repo_id], references: [repos.id] }),
}));
