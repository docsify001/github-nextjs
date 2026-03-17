"use server";

// The only purpose of this file is to export server actions we can include from client components to avoid the error:
// > It is not allowed to define inline "use server" annotated Server Actions in Client Components.
// > To use Server Actions in a Client Component, you can either export them from a separate file with "use server" at the top, or pass them down through props from a Server Component."
import { addProjectToRepo, createProject, CreateProjectType } from "@/drizzle/projects";
import { db, schema } from "@/drizzle/database";
import { eq } from "drizzle-orm";
import { runSkillSyncForProject } from "@/lib/skill-sync/run-skill-sync-for-project";
import { createTaskRunner } from "@/lib/tasks/task-runner";
import { updateGitHubDataTask } from "@/lib/tasks/bestofjs/update-github-data.task";

export async function createProjectAction(gitHubURL: string, type: CreateProjectType) {
  const project = await createProject(gitHubURL, type);
  try {
    // 异步执行同步任务
    runUpdateGitHubDataTask(project).then(async (result) => {
      console.log(`GitHub data updated for project: ${project.name}`, result);
    }).catch(error => {
      console.error(`Failed to update GitHub data for project ${project.name}:`, error);
    });
  } catch (error) {
    console.error(`Failed to update GitHub data for project ${project.name}:`, error);
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

async function runUpdateGitHubDataTask(project: any) {
  try {
    // 创建任务运行器
    const runner = createTaskRunner([updateGitHubDataTask as any]);

    // 获取项目对应仓库的 fullName（owner/name）
    const fullName = await getRepoFullName(project);

    // 运行任务，只处理当前项目对应的 repo
    const result = await runner.run({
      // 共享标志
      dryRun: false,
      fullName: fullName, // 只处理特定的 repo
      skip: 0,
      concurrency: 1,
      throttleInterval: 200,
      logLevel: 4
    });

    console.log(`Task runner completed for project: ${project.name} (${fullName})`);
    return result;
  } catch (error) {
    console.error(`Task runner failed for project: ${project.name}:`, error);
    throw error;
  }
}

async function getRepoFullName(project: any): Promise<string> {
  // 如果调用方已经携带了 repo 信息，优先使用
  if (project?.repo?.owner && project?.repo?.name) {
    return `${project.repo.owner}/${project.repo.name}`;
  }

  const repoId = project.repoId ?? project.repo_id ?? project?.repo?.id;
  if (!repoId) {
    throw new Error("项目未关联仓库，无法更新 GitHub 数据");
  }

  const repo = await db.query.repos.findFirst({
    where: eq(schema.repos.id, repoId),
  });

  if (!repo) {
    throw new Error("未找到项目对应的仓库，无法更新 GitHub 数据");
  }

  return `${repo.owner}/${repo.name}`;
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
