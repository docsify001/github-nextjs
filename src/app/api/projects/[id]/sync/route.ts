import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { eq } from 'drizzle-orm';
import { schema } from '@/drizzle/database';
import { verifyApiAuth } from '@/lib/auth/auth-utils';
import { updateGitHubDataTask } from '@/lib/tasks/bestofjs/update-github-data.task';
import { createTaskRunner } from '@/lib/tasks/task-runner';
import { runSkillSyncForProject } from '@/lib/skill-sync/run-skill-sync-for-project';
import { createConsola } from 'consola';

export const dynamic = "force-dynamic";

const logger = createConsola();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const projectId = (await params).id;

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
        { success: false, error: '项目或仓库不存在' },
        { status: 404 }
      );
    }

    logger.info(`Starting sync for project: ${project.name} (${projectId})`);

    // skill 项目：先执行 skill 同步（拉取 SKILL.md、翻译、落库、发送 skill webhook）
    const isSkill = (project as { type?: string }).type === 'skill';
    if (isSkill) {
      runSkillSyncForProject(db, projectId, {
        logger: { info: logger.info, debug: logger.debug, warn: logger.warn, error: logger.error },
      }).then((result) => {
        logger.info(`Skill sync completed for project: ${project.name}`, { success: result.success, synced: result.synced, error: result.error });
      }).catch((error) => {
        logger.error(`Skill sync failed for project ${project.name}:`, error);
      });
    }

    // 异步执行 GitHub 数据同步任务
    runUpdateGitHubDataTask(project).then(async (result) => {
      logger.info(`GitHub data updated for project: ${project.name}`, result);
    }).catch(error => {
      logger.error(`Failed to update GitHub data for project ${project.name}:`, error);
    });

    return NextResponse.json({
      success: true,
      data: {
        message: '同步任务已启动，正在异步处理GitHub数据更新和webhook发送',
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
        },
      },
    });

  } catch (error) {
    logger.error('Error starting sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

async function runUpdateGitHubDataTask(project: any) {
  try {
    // 创建任务运行器
    const runner = createTaskRunner([updateGitHubDataTask as any]);
    
    // 获取项目的 fullName
    const fullName = `${project.repo.owner}/${project.repo.name}`;
    
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

    logger.info(`Task runner completed for project: ${project.name} (${fullName})`);
    return result;
  } catch (error) {
    logger.error(`Task runner failed for project: ${project.name}:`, error);
    throw error;
  }
} 