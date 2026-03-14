"use server";

import { eq } from "drizzle-orm";

import { db } from "../database";
import * as schema from "../schema";

/**
 * 物理删除项目。数据库外键已配置 onDelete: "cascade"，
 * 会级联删除 projects_to_tags、packages、hall_of_fame_to_projects 等相关记录。
 */
export async function deleteProject(projectId: string) {
  const deleted = await db
    .delete(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .returning({ id: schema.projects.id });
  return deleted.length > 0;
}
