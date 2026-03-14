/**
 * 仅获取仓库统计数据并写入 repos 表（不包含 README、翻译、快照等）。
 */

import { eq } from "drizzle-orm";
import type { DB } from "@/drizzle/database";
import { schema } from "@/drizzle/database";
import { createGitHubClient } from "@/lib/github/github-api-client";

export async function fetchRepoStatsAndSave(db: DB, repoId: string): Promise<{ success: boolean; error?: string }> {
  const repo = await db.query.repos.findFirst({
    where: eq(schema.repos.id, repoId),
  });

  if (!repo) {
    return { success: false, error: `Repo not found: ${repoId}` };
  }

  const fullName = `${repo.owner}/${repo.name}`;

  try {
    const client = createGitHubClient();
    const githubData = await client.fetchRepoInfo(fullName);
    const contributor_count = await client.fetchContributorCount(fullName);
    const stars = githubData.stargazers_count ?? 0;

    const updatePayload = {
      stars,
      forks: githubData.forks ?? null,
      watchers_count: githubData.watchers_count ?? null,
      contributor_count,
      mentionable_users_count: githubData.mentionableUsers_count ?? null,
      pull_requests_count: githubData.pullRequests_count ?? null,
      releases_count: githubData.releases_count ?? null,
      commit_count: githubData.commit_count ?? null,
      last_commit: githubData.last_commit ? new Date(githubData.last_commit) : null,
      pushed_at: githubData.pushed_at ? new Date(githubData.pushed_at) : repo.pushed_at,
      description: githubData.description ?? repo.description,
      topics: githubData.topics ?? repo.topics,
      default_branch: githubData.default_branch ?? repo.default_branch,
      license_spdx_id: githubData.license_spdxId ?? repo.license_spdx_id,
      archived: githubData.archived ?? repo.archived,
      updated_at: new Date(),
    };

    await db
      .update(schema.repos)
      .set(updatePayload)
      .where(eq(schema.repos.id, repoId));

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
