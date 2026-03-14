import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { repos } from "./repos";

export const README_SYNC_JOB_STATUSES = ["pending", "running", "success", "failed"] as const;
export const README_SYNC_TRIGGERED_BY = ["project_create", "manual", "retry"] as const;

export const readmeSyncJobs = pgTable(
  "readme_sync_jobs",
  {
    id: text("id").primaryKey(),
    repo_id: text("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    status: text("status", { enum: README_SYNC_JOB_STATUSES }).notNull().default("pending"),
    triggered_by: text("triggered_by", { enum: README_SYNC_TRIGGERED_BY }).notNull(),
    started_at: timestamp("started_at"),
    completed_at: timestamp("completed_at"),
    error_message: text("error_message"),
    retry_count: integer("retry_count").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at"),
  },
  (table) => []
);

export const readmeSyncJobsRelations = relations(readmeSyncJobs, ({ one }) => ({
  repo: one(repos, { fields: [readmeSyncJobs.repo_id], references: [repos.id] }),
}));
