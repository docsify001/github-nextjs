import type { DB } from "@/drizzle/database";
import { schema } from "@/drizzle/database";
import type { repos } from "@/drizzle/schema/repos";
import { aliyunOSSClient } from "@/lib/oss/aliyun-oss";

type Repo = typeof repos.$inferSelect;

interface UpsertHallOfFameOptions {
  syncAvatarToOss?: boolean;
  logger?: {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

export async function upsertHallOfFameFromRepo(
  db: DB,
  repo: Repo,
  options: UpsertHallOfFameOptions = {},
) {
  const { syncAvatarToOss = true, logger } = options;

  const owner = repo.owner;
  const ownerId = repo.owner_id;

  if (!owner || !ownerId) {
    logger?.warn?.(
      "[hall-of-fame] 跳过同步，缺少 owner 或 owner_id",
      repo.id,
      owner,
      ownerId,
    );
    return;
  }

  const sourceAvatarUrl = `https://avatars.githubusercontent.com/u/${ownerId}?v=3&s=100`;

  let avatarOssUrl: string | null = null;

  if (syncAvatarToOss) {
    try {
      logger?.debug?.(
        "[hall-of-fame] 开始上传作者头像到 OSS",
        owner,
        sourceAvatarUrl,
      );
      const ossPath = `mcp/authors/${owner}/avatar.png`;
      const uploadedUrl = await aliyunOSSClient.uploadFromUrl(
        sourceAvatarUrl,
        ossPath,
      );
      avatarOssUrl = uploadedUrl || null;
      if (avatarOssUrl) {
        logger?.info?.(
          "[hall-of-fame] 作者头像上传成功",
          owner,
          avatarOssUrl,
        );
      } else {
        logger?.warn?.(
          "[hall-of-fame] 作者头像上传返回空 URL",
          owner,
          sourceAvatarUrl,
        );
      }
    } catch (error) {
      logger?.error?.(
        "[hall-of-fame] 作者头像上传失败，不影响主流程",
        owner,
        error,
      );
    }
  }

  const githubProfileUrl = `https://github.com/${owner}`;

  await db
    .insert(schema.hallOfFame)
    .values({
      username: owner,
      name: owner,
      followers: null,
      bio: null,
      homepage: repo.homepage ?? null,
      twitter: null,
      avatar: avatarOssUrl,
      avatarUrl: sourceAvatarUrl,
      linkedin: null,
      github: githubProfileUrl,
      verified: false,
      metadata: null,
      npmUsername: null,
      npmPackageCount: null,
      status: "active",
    })
    .onConflictDoUpdate({
      target: schema.hallOfFame.username,
      set: {
        name: owner,
        homepage: repo.homepage ?? null,
        avatarUrl: sourceAvatarUrl,
        github: githubProfileUrl,
        ...(avatarOssUrl ? { avatar: avatarOssUrl } : {}),
      },
    });

  logger?.debug?.("[hall-of-fame] 同步作者到 hall_of_fame 完成", {
    username: owner,
    avatarUrl: sourceAvatarUrl,
    avatar: avatarOssUrl,
  });
}

