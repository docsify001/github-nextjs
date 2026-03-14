"use server";

// The only purpose of this file is to export server actions we can include from client components to avoid the error:
// > It is not allowed to define inline "use server" annotated Server Actions in Client Components.
// > To use Server Actions in a Client Component, you can either export them from a separate file with "use server" at the top, or pass them down through props from a Server Component."
import { addProjectToRepo, createProject, CreateProjectType } from "@/drizzle/projects";
import { db } from "@/drizzle/database";
import { createReadmeSyncJob } from "@/lib/readme-sync/job-helpers";
import { runReadmeSyncForRepo } from "@/lib/readme-sync/run-readme-sync-for-repo";
import { runSkillSyncForProject } from "@/lib/skill-sync/run-skill-sync-for-project";

export async function createProjectAction(gitHubURL: string, type: CreateProjectType) {
  const project = await createProject(gitHubURL, type);
  const repoId = project.repoId;
  try {
    const readmeJob = await createReadmeSyncJob(db, {
      repoId,
      triggeredBy: "project_create",
    });
    void runReadmeSyncForRepo(db, repoId, readmeJob.id);
  } catch {
    // 不影响创建结果，仅记录失败
  }
  if (type === "skill") {
    console.log("[skill-sync] 创建 skill 项目，触发异步 skill 同步", {
      projectId: project.id,
      slug: project.slug,
    });
    runSkillSyncForProject(db, project.id)
      .then((result) => {
        console.log("[skill-sync] 异步 skill 同步完成", {
          projectId: project.id,
          slug: project.slug,
          success: result.success,
          synced: result.synced,
          error: result.error,
        });
      })
      .catch((err) => {
        console.error("[skill-sync] 异步 skill 同步失败", {
          projectId: project.id,
          slug: project.slug,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }
  return project;
}

export async function retrySkillSyncAction(projectId: string) {
  const result = await runSkillSyncForProject(db, projectId);
  return result;
}

export async function addProjectToRepoAction({
  name,
  description,
  type,
  repoId,
}: {
  name: string;
  description: string;
  type: CreateProjectType;
  repoId: string;
}) {
  const project = await addProjectToRepo({ name, description, type, repoId });
  return project;
}
