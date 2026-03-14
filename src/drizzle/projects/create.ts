"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import slugify from "slugify";
import { z } from "zod";

import { db } from "../database";
import * as schema from "../schema";
import { generateProjectDefaultSlug } from "./project-helpers";

export type CreateProjectType = "skill" | "application" | "client" | "server" | "persona";

const PROJECT_ALREADY_EXISTS_MSG = "项目已经存在";

export async function createProject(gitHubURL: string, type: CreateProjectType) {
  const fullName = gitHubURL.split("/").slice(-2).join("/");
  const [owner, name] = fullName.split("/");
  if (!owner || !name) {
    throw new Error("无效的 GitHub 仓库 URL");
  }

  const repoData = await fetchGitHubRepoData(fullName);

  // 若该 repo 已存在且已有项目，直接提示项目已存在
  const existingRepo = await db.query.repos.findFirst({
    where: and(eq(schema.repos.owner, owner), eq(schema.repos.name, name)),
    columns: { id: true },
  });
  if (existingRepo) {
    const existingProject = await db.query.projects.findFirst({
      where: eq(schema.projects.repoId, existingRepo.id),
      columns: { id: true },
    });
    if (existingProject) {
      throw new Error(PROJECT_ALREADY_EXISTS_MSG);
    }
  }

  const slug = generateProjectDefaultSlug(repoData.name);
  const now = new Date();
  const updateSet = {
    description: repoData.description,
    default_branch: repoData.default_branch,
    homepage: repoData.homepage,
    stars: repoData.stars,
    pushed_at: repoData.pushed_at,
    created_at: repoData.created_at,
    topics: repoData.topics,
    updated_at: now,
  };

  const createdProjects = await db.transaction(async (tx) => {
    const [repo] = await tx
      .insert(schema.repos)
      .values({ id: nanoid(), ...repoData })
      .onConflictDoUpdate({
        target: [schema.repos.owner, schema.repos.name],
        set: updateSet,
      })
      .returning();

    if (!repo) throw new Error("创建或更新仓库失败");
    const repoId = repo.id;

    const skillMdPath = type === "skill" ? "skills" : undefined;

    return await tx
      .insert(schema.projects)
      .values({
        id: nanoid(),
        repoId,
        name: repoData.name,
        slug,
        description: repoData.description || "(No description)",
        url: repoData.homepage,
        status: "active",
        type,
        ...(skillMdPath != null && { skillMdPath }),
      })
      .returning();
  });

  console.log("Project created", createdProjects);

  return createdProjects[0];
}

async function fetchGitHubRepoData(fullName: string) {
  const rawData = await fetch(`https://api.github.com/repos/${fullName}`).then(
    (res) => res.json()
  );
  const data = apiResponseSchema.parse(rawData);
  return {
    owner_id: data.owner.id,
    owner: data.owner.login,
    name: data.name,
    description: data.description,
    default_branch: data.default_branch,
    homepage: data.homepage,
    stars: data.stargazers_count,
    created_at: new Date(data.created_at),
    pushed_at: new Date(data.pushed_at),
    topics: data.topics,
  };
}

export async function addProjectToRepo({
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
  const createdProjects = await db
    .insert(schema.projects)
    .values({
      id: nanoid(),
      createdAt: new Date(),
      repoId,
      name,
      description,
      type,
      slug: slugify(name).toLowerCase(),
      status: "active",
    })
    .returning();

  return createdProjects[0];
}

const apiResponseSchema = z.object({
  name: z.string(),
  owner: z.object({
    id: z.number(),
    login: z.string(),
  }),
  homepage: z.string().nullable(),
  default_branch: z.string().nullable(),
  description: z.string().nullable(),
  stargazers_count: z.number(),
  created_at: z.string(),
  pushed_at: z.string(),
  topics: z.array(z.string()),
});
