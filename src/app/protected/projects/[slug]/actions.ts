"use server";

import { unstable_noStore as noStore, revalidatePath } from "next/cache";

import { createGitHubClient } from "@/lib/github/github-api-client";
import {
  addPackage,
  ProjectData,
  removePackage,
  saveTags,
  updateProjectById,
} from "@/drizzle/projects";
import { EditableTagData, updateTagById } from "@/drizzle/tags";
import { snapshotsService } from "@/lib/db";

type EditableProjectData = Omit<
  ProjectData,
  "repoId" | "id" | "createdAt" | "updatedAt"
>;

export async function updateProjectData(
  projectId: string,
  projectData: Partial<EditableProjectData>
) {
  noStore();
  await updateProjectById(projectId, projectData);
  revalidatePath(`/projects/${projectData.slug}`);
}

export async function updateProjectTags(
  projectId: string,
  projectSlug: string,
  tagIds: string[]
) {
  await saveTags(projectId, tagIds);
  revalidatePath(`/projects/${projectSlug}`);
}

export async function updateTagData(tagId: string, tagData: EditableTagData) {
  await updateTagById(tagId, tagData);
  revalidatePath(`/tags/${tagData.code}`);
  revalidatePath(`/tags`);
}

export async function addPackageAction(
  projectId: string,
  projectSlug: string,
  packageName: string
) {
  await addPackage(projectId, packageName);
  revalidatePath(`/projects/${projectSlug}`);
}

export async function removePackageAction(
  projectId: string,
  projectSlug: string,
  packageName: string
) {
  await removePackage(projectId, packageName);
  revalidatePath(`/projects/${projectSlug}`);
}

export async function addSnapshotAction(
  projectSlug: string,
  repoId: string,
  repoFullName: string
) {
  const gitHubClient = createGitHubClient();
  const data = await gitHubClient.fetchRepoInfo(repoFullName);
  const stars = data.stargazers_count as number;

  // 获取额外的数据字段
  const additionalData = {
    mentionableUsers: data.mentionableUsers_count,
    watchers: data.watchers_count,
    pullRequests: data.pullRequests_count,
    releases: data.releases_count,
    forks: data.forks,
  };

  console.log("Adding snapshot for", repoId, stars, additionalData);

  await snapshotsService.addSnapshot(repoId, stars, additionalData);

  revalidatePath(`/projects/${projectSlug}`);
}
