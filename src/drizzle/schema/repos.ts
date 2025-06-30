import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { hallOfFame } from "./hall-of-fame";
import { projects } from "./projects";
import { snapshots } from "./snapshots";

export const repos = pgTable(
  "repos",
  {
    id: text("id").primaryKey(),
    // Date of addition to Best of JS
    added_at: timestamp("added_at").notNull().defaultNow(),
    // Last update (by the daily task)
    updated_at: timestamp("updated_at"),
    // From GitHub REST API
    archived: boolean("archived"),
    default_branch: text("default_branch"),
    description: text("description"),
    homepage: text("homepage"),
    name: text("name").notNull(),
    owner: text("owner").notNull(),
    owner_id: integer("owner_id").notNull(), // used in GitHub users avatar URLs
    stars: integer("stargazers_count"),
    topics: jsonb("topics"),

    pushed_at: timestamp("pushed_at").notNull(),
    created_at: timestamp("created_at").notNull(),

    // From GitHub GraphQL API
    last_commit: timestamp("last_commit"),
    commit_count: integer("commit_count"),

    // From scrapping
    contributor_count: integer("contributor_count"),

    // New fields from GitHub GraphQL API
    mentionable_users_count: integer("mentionable_users_count"),
    watchers_count: integer("watchers_count"),
    license_spdx_id: text("license_spdx_id"),
    pull_requests_count: integer("pull_requests_count"),
    releases_count: integer("releases_count"),
    languages: jsonb("languages"),
    open_graph_image_url: text("open_graph_image_url"),
    uses_custom_open_graph_image: boolean("uses_custom_open_graph_image"),
    latest_release_name: text("latest_release_name"),
    latest_release_tag_name: text("latest_release_tag_name"),
    latest_release_published_at: timestamp("latest_release_published_at"),
    latest_release_url: text("latest_release_url"),
    latest_release_description: text("latest_release_description"),
    forks: integer("forks"),

    // 新增字段：README内容和翻译
    readme_content: text("readme_content"), // 英文README内容
    readme_content_zh: text("readme_content_zh"), // 中文README内容
    description_zh: text("description_zh"), // 翻译后的描述
    icon_url: text("icon_url"), // 上传到OSS的图标URL
    open_graph_image_oss_url: text("open_graph_image_oss_url"), // 上传到OSS的Open Graph图片URL
    latest_release_description_zh: text("latest_release_description_zh"), // 翻译后的Release Note内容
  },
  (table) => [uniqueIndex("name_owner_index").on(table.owner, table.name)]
);

export const reposRelations = relations(repos, ({ many, one }) => ({
  projects: many(projects),
  snapshots: many(snapshots),
  hallOfFameMember: one(hallOfFame, {
    fields: [repos.owner],
    references: [hallOfFame.username],
  }),
}));
