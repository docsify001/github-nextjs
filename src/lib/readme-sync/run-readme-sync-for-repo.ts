/**
 * 单 repo 的 README 获取 + 翻译 + 写 repos。
 * 供项目创建后异步执行与手动/重试共用。
 * 若传入 jobId，会更新对应 readme_sync_jobs 状态（running -> success/failed）。
 */

import { eq } from "drizzle-orm";
import type { DB } from "@/drizzle/database";
import { schema } from "@/drizzle/database";
import { createGitHubClient } from "@/lib/github/github-api-client";
import { translator } from "@/lib/translate/translator";
import {
  updateJobToRunning,
  updateJobToSuccess,
  updateJobToFailed,
} from "./job-helpers";

export async function runReadmeSyncForRepo(
  db: DB,
  repoId: string,
  jobId: string | null
): Promise<{ success: boolean; error?: string }> {
  const repo = await db.query.repos.findFirst({
    where: eq(schema.repos.id, repoId),
  });

  if (!repo) {
    const err = `Repo not found: ${repoId}`;
    if (jobId) await updateJobToFailed(db, jobId, err);
    return { success: false, error: err };
  }

  const fullName = `${repo.owner}/${repo.name}`;
  const defaultBranch = repo.default_branch ?? "main";

  if (jobId) await updateJobToRunning(db, jobId);

  try {
    const client = createGitHubClient();
    const githubData = await client.fetchRepoInfo(fullName);
    const readmeContent = await client.fetchRepoReadMeAsMarkdown(fullName, defaultBranch);
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (githubData.description) {
      try {
        const translatedDescription = await translator.translateDescription(githubData.description);
        updateData.description_zh = translatedDescription;
      } catch (e) {
        console.error("描述翻译失败:", e);
      }
    }

    if (readmeContent) {
      try {
        const translatedReadme = await translator.translateReadme(readmeContent);
        updateData.readme_content = readmeContent;
        updateData.readme_content_zh = translatedReadme;
      } catch (e) {
        console.error("README翻译失败:", e);
        updateData.readme_content = readmeContent;
      }
    } else {
      updateData.readme_content = null;
      updateData.readme_content_zh = null;
    }

    await db
      .update(schema.repos)
      .set(updateData as any)
      .where(eq(schema.repos.id, repoId));

    if (jobId) await updateJobToSuccess(db, jobId);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jobId) await updateJobToFailed(db, jobId, message);
    return { success: false, error: message };
  }
}
