import type { DB } from "@/drizzle/database";
import {
  updateProjectSyncJobToRunning,
  updateProjectSyncJobToSuccess,
  updateProjectSyncJobToFailed,
} from "./job-helpers";
import { fetchRepoStatsAndSave } from "./fetch-repo-stats-and-save";
import { getFullProjectData, fetchProjectData, sendWebhookData } from "./project-webhook";

/**
 * 统计入库 → 成功后再同步 webhook；失败则错误入库。
 */
export async function runStatsAndWebhookPipeline(
  db: DB,
  jobId: string,
  projectId: string,
  repoId: string,
  webhookUrl: string | null
): Promise<void> {
  await updateProjectSyncJobToRunning(db, jobId);
  const statsResult = await fetchRepoStatsAndSave(db, repoId);
  if (!statsResult.success) {
    await updateProjectSyncJobToFailed(db, jobId, statsResult.error ?? "Unknown error");
    return;
  }
  if (webhookUrl) {
    try {
      const fullProject = await getFullProjectData(db, projectId);
      const projectData = await fetchProjectData(fullProject);
      await sendWebhookData(webhookUrl, projectData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateProjectSyncJobToFailed(db, jobId, msg);
      return;
    }
  }
  await updateProjectSyncJobToSuccess(db, jobId);
}
