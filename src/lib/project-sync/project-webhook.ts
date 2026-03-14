import { eq } from "drizzle-orm";
import type { DB } from "@/drizzle/database";
import { schema } from "@/drizzle/database";
import { createGitHubClient } from "@/lib/github/github-api-client";
import { createNpmClient } from "@/lib/shared/npm-api-client";
import { sendWebhookToMultipleUrls } from "@/lib/shared/webhook-utils";

export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  description: string;
  fullName: string;
  stars: number;
  ownerId: number;
  homepage?: string;
  topics: string[];
  createdAt: string;
  pushedAt: string;
  lastCommit?: string;
  contributorCount?: number;
  packages?: Array<{
    name: string;
    version?: string;
    downloads?: number;
    dependencies?: string[];
    deprecated?: boolean;
  }>;
  bundleSize?: { size?: number; gzip?: number };
}

export async function getFullProjectData(db: DB, projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
    with: { repo: true, packages: true },
  });
  if (!project || !project.repo) {
    throw new Error(`Project or repo not found for project ID: ${projectId}`);
  }
  return project;
}

export async function fetchProjectData(project: {
  id: string;
  name: string;
  slug: string;
  description: string;
  repo: { owner: string; name: string; stars?: number | null; owner_id: number; homepage?: string | null; topics?: unknown; created_at?: Date; pushed_at?: Date; last_commit?: Date | null; contributor_count?: number | null };
  packages?: Array<{ name: string; version?: string | null; monthlyDownloads?: number | null }>;
}): Promise<ProjectData> {
  const githubClient = createGitHubClient();
  const npmClient = createNpmClient();
  const fullName = `${project.repo.owner}/${project.repo.name}`;

  if (project.repo && project.repo.stars != null) {
    const packages: ProjectData["packages"] = [];
    if (project.packages?.length) {
      for (const pkg of project.packages) {
        try {
          const packageInfo = await npmClient.fetchPackageInfo(pkg.name);
          const monthlyDownloads = await npmClient.fetchMonthlyDownloadCount(pkg.name);
          packages.push({
            name: pkg.name,
            version: packageInfo.version,
            downloads: monthlyDownloads,
            dependencies: packageInfo.dependencies ? Object.keys(packageInfo.dependencies) : [],
            deprecated: Boolean(packageInfo.deprecated),
          });
        } catch {
          packages.push({ name: pkg.name, version: pkg.version ?? undefined, downloads: pkg.monthlyDownloads ?? undefined });
        }
      }
    }
    let bundleSize: ProjectData["bundleSize"];
    if (project.packages?.length) {
      try {
        const bundleData = await npmClient.fetchBundleData(project.packages[0].name);
        bundleSize = { size: bundleData.size, gzip: bundleData.gzip };
      } catch {
        // ignore
      }
    }
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      fullName,
      stars: project.repo.stars || 0,
      ownerId: project.repo.owner_id,
      homepage: project.repo.homepage ?? undefined,
      topics: (Array.isArray(project.repo.topics) ? project.repo.topics : []) as string[],
      createdAt: project.repo.created_at ? project.repo.created_at.toISOString() : "",
      pushedAt: project.repo.pushed_at ? project.repo.pushed_at.toISOString() : "",
      lastCommit: project.repo.last_commit ? project.repo.last_commit.toISOString() : undefined,
      contributorCount: project.repo.contributor_count ?? undefined,
      packages,
      bundleSize,
    };
  }

  const githubData = await githubClient.fetchRepoInfo(fullName);
  const contributorCount = await githubClient.fetchContributorCount(fullName);
  const packages: ProjectData["packages"] = [];
  if (project.packages?.length) {
    for (const pkg of project.packages) {
      try {
        const packageInfo = await npmClient.fetchPackageInfo(pkg.name);
        const monthlyDownloads = await npmClient.fetchMonthlyDownloadCount(pkg.name);
        packages.push({
          name: pkg.name,
          version: packageInfo.version,
          downloads: monthlyDownloads,
          dependencies: packageInfo.dependencies ? Object.keys(packageInfo.dependencies) : [],
          deprecated: Boolean(packageInfo.deprecated),
        });
      } catch {
        packages.push({ name: pkg.name, version: pkg.version ?? undefined, downloads: pkg.monthlyDownloads ?? undefined });
      }
    }
  }
  let bundleSize: ProjectData["bundleSize"];
  if (project.packages?.length) {
    try {
      const bundleData = await npmClient.fetchBundleData(project.packages[0].name);
      bundleSize = { size: bundleData.size, gzip: bundleData.gzip };
    } catch {
      // ignore
    }
  }
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    fullName,
    stars: githubData.stargazers_count || 0,
    ownerId: githubData.owner_id,
    homepage: githubData.homepage ?? undefined,
    topics: githubData.topics ?? [],
    createdAt: String(githubData.created_at),
    pushedAt: String(githubData.pushed_at),
    lastCommit: githubData.last_commit ? new Date(githubData.last_commit).toISOString() : undefined,
    contributorCount,
    packages,
    bundleSize,
  };
}

export async function sendWebhookData(webhookUrl: string, data: ProjectData): Promise<void> {
  const payload = {
    event: "project.created",
    timestamp: new Date().toISOString(),
    data,
  };
  const results = await sendWebhookToMultipleUrls(webhookUrl, payload, {
    timestamp: new Date().toISOString(),
  });
  const successfulCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  if (successfulCount === 0) {
    throw new Error(`Webhook request failed for all ${totalCount} endpoints`);
  }
}
