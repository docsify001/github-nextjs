import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/database";
import { eq } from "drizzle-orm";
import { schema } from "@/drizzle/database";
import { verifyApiAuth } from "@/lib/auth/auth-utils";
import { createRepoWebhookRequest } from "@/lib/webhook/repo-webhook-schema";
import { sendWebhookToMultipleUrls } from "@/lib/shared/webhook-utils";
import { ensureSkillTranslationsAndSync } from "@/lib/skill-sync/run-skill-sync-for-project";
import { createConsola } from "consola";
import { CreateProjectType } from "@/drizzle/projects";
import { upsertHallOfFameFromRepo } from "@/lib/hall-of-fame/hall-of-fame-service";

export const dynamic = "force-dynamic";

const logger = createConsola();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 验证用户认证
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    let { webhookUrl } = await request.json();
    const projectId = (await params).id;

    if (!webhookUrl) {
      webhookUrl = process.env.DAILY_WEBHOOK_URL ?? '';
      if (!webhookUrl) {
        return NextResponse.json(
        { success: false, error: "请提供webhook URL" },
          { status: 400 }
        );
      }
    }

    // 获取项目数据
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
      with: {
        repo: true,
        packages: true,
      },
    });

    if (!project || !project.repo) {
      return NextResponse.json(
        { success: false, error: "项目或仓库不存在" },
        { status: 404 }
      );
    }

    logger.info(`Sending webhook for project: ${project.name} (${projectId})`);

    // skill 项目：若 project_skills 的简介/readme 未翻译，先翻译并落库，再发 webhook
    if ((project as { type?: string }).type === "skill") {
      try {
        const ensureResult = await ensureSkillTranslationsAndSync(db, projectId, {
          logger: { info: logger.info, debug: logger.debug, warn: logger.warn, error: logger.error },
        });
        if (!ensureResult.ok && ensureResult.error) {
          logger.warn("Skill translations ensure failed, continuing webhook", { error: ensureResult.error });
        }
      } catch (err) {
        logger.warn("ensureSkillTranslationsAndSync threw, continuing webhook", err);
      }
    }

    // 确保作者信息已同步到 hall_of_fame（含头像上传）
    try {
      await upsertHallOfFameFromRepo(db, project.repo, {
        syncAvatarToOss: true,
        logger,
      });
    } catch (err) {
      logger.error(
        "Failed to sync hall_of_fame author before manual webhook:",
        err,
      );
    }

    // 查询 hall_of_fame 得到 avatar(OSS)、avatarUrl(GitHub)，随 webhook 发给 openmcp
    const hallOfFameAuthor = await db.query.hallOfFame.findFirst({
      where: eq(schema.hallOfFame.username, project.repo.owner),
      columns: {
        username: true,
        name: true,
        avatar: true,
        avatarUrl: true,
        bio: true,
        homepage: true,
        twitter: true,
        linkedin: true,
        github: true,
        verified: true,
        status: true,
        metadata: true,
      },
    });
    const webhookAuthor =
      hallOfFameAuthor != null
        ? {
            name: hallOfFameAuthor.name,
            username: hallOfFameAuthor.username,
            avatar: hallOfFameAuthor.avatar ?? undefined,
            avatar_url: hallOfFameAuthor.avatarUrl ?? undefined,
            bio: hallOfFameAuthor.bio ?? undefined,
            website: hallOfFameAuthor.homepage ?? undefined,
            twitter: hallOfFameAuthor.twitter ?? undefined,
            linkedin: hallOfFameAuthor.linkedin ?? undefined,
            github: hallOfFameAuthor.github ?? undefined,
            verified: hallOfFameAuthor.verified ?? undefined,
            status: hallOfFameAuthor.status ?? undefined,
            metadata: hallOfFameAuthor.metadata ?? undefined,
          }
        : undefined;

    // 创建webhook数据
    const processingStatus = {
      icon_processed: true,
      description_translated: true,
      readme_translated: true,
      og_image_processed: true,
      release_note_translated: true,
    };

    const meta = {
      task_name: "manual-webhook",
      processed_at: new Date().toISOString(),
      processing_time_ms: 0,
      success: true,
    };

    const webhookRequest = createRepoWebhookRequest(
      project.type as CreateProjectType,
      project.repo,
      processingStatus,
      meta,
      webhookAuthor,
    );

    // 发送webhook
    const results = await sendWebhookToMultipleUrls(
      webhookUrl,
      webhookRequest,
      {
        token: process.env.DAILY_WEBHOOK_TOKEN,
        signature: process.env.DAILY_WEBHOOK_SIGNATURE,
        timestamp: new Date().toISOString(),
      }
    );

    const successfulCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    if (successfulCount === 0) {
      throw new Error(`Webhook request failed for all ${totalCount} endpoints`);
    }

    logger.success(`Webhook sent successfully to ${successfulCount}/${totalCount} endpoints for project: ${project.name}`);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Webhook发送成功',
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
        },
        webhookUrl,
      },
    });

  } catch (error) {
    logger.error("Error sending webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 