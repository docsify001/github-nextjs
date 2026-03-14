import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * 按「项目 + skill 目录」保存 SKILL.md 的解析与翻译结果，供本地查询与同步到 web。
 * 设计见 docs/SKILL_REPO_MULTI_SKILL_ANALYSIS.md 第 2 节。
 */
export const projectSkills = pgTable(
  "project_skills",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillDir: text("skill_dir").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    descriptionZh: text("description_zh").notNull().default(""),
    readme: text("readme").notNull(),
    readmeZh: text("readme_zh").notNull().default(""),
    version: text("version"),
    contentHash: text("content_hash"),
    syncedToWebAt: timestamp("synced_to_web_at"),
    lastSyncError: text("last_sync_error"),
    lastSyncAttemptAt: timestamp("last_sync_attempt_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("project_skills_project_id_skill_dir_idx").on(
      table.projectId,
      table.skillDir
    ),
  ]
);

export const projectSkillsRelations = relations(projectSkills, ({ one }) => ({
  project: one(projects, {
    fields: [projectSkills.projectId],
    references: [projects.id],
  }),
}));
