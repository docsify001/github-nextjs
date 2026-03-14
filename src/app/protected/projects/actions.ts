"use server";

import { revalidatePath } from "next/cache";

import { deleteProject } from "@/drizzle/projects";

export type DeleteProjectResult = { success: true } | { success: false; error: string };

export async function deleteProjectAction(projectId: string): Promise<DeleteProjectResult> {
  try {
    const deleted = await deleteProject(projectId);
    if (!deleted) {
      return { success: false, error: "项目不存在或已删除" };
    }
    revalidatePath("/protected/projects");
    return { success: true };
  } catch (e) {
    console.error("deleteProjectAction", e);
    return { success: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}
