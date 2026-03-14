import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { createProject, type CreateProjectType } from '@/drizzle/projects/create';
import { createConsola } from 'consola';
import { eq, and } from 'drizzle-orm';
import { schema } from '@/drizzle/database';
import { verifyApiAuth } from '@/lib/auth/auth-utils';
import { createReadmeSyncJob } from '@/lib/readme-sync/job-helpers';
import { runReadmeSyncForRepo } from '@/lib/readme-sync/run-readme-sync-for-repo';
import { createProjectSyncJob } from '@/lib/project-sync/job-helpers';
import { runStatsAndWebhookPipeline } from '@/lib/project-sync/run-stats-and-webhook';
import { getFullProjectData as getFullProjectDataShared, fetchProjectData as fetchProjectDataShared, sendWebhookData as sendWebhookDataShared } from '@/lib/project-sync/project-webhook';

export const dynamic = "force-dynamic";

const logger = createConsola();

const CREATE_PROJECT_TYPES: CreateProjectType[] = ["skill", "application", "client", "server"];

interface CreateProjectRequest {
  githubUrl: string;
  webhookUrl?: string;
  /** 项目类型：skill | application | client | server，不传时默认 application */
  type?: CreateProjectType;
}

interface ProjectData {
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
  bundleSize?: {
    size?: number;
    gzip?: number;
  };
}

export async function POST(request: NextRequest) {
  // 验证用户认证
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }
  
  try {
    const { githubUrl, webhookUrl, type: requestType }: CreateProjectRequest = await request.json();

    if (!githubUrl) {
      return NextResponse.json(
        { success: false, error: '请提供GitHub URL' },
        { status: 400 }
      );
    }

    const projectType: CreateProjectType =
      requestType && CREATE_PROJECT_TYPES.includes(requestType) ? requestType : "application";

    // 验证和清理GitHub URL
    const cleanedUrl = validateAndCleanGitHubUrl(githubUrl);
    if (!cleanedUrl) {
      return NextResponse.json(
        { success: false, error: 'GitHub URL格式不正确' },
        { status: 400 }
      );
    }

    logger.info(`Processing GitHub URL: ${cleanedUrl}`);

    // 检查仓库是否已存在
    const existingProject = await checkExistingProject(cleanedUrl);
    
    if (existingProject) {
      logger.info(`Project already exists: ${existingProject.name} (${existingProject.id})`);
      
      // 如果项目已存在，直接返回现有数据
      const projectData = await fetchProjectDataShared(existingProject);
      
      // 如果有webhook URL，异步发送数据
      if (webhookUrl) {
        sendWebhookDataShared(webhookUrl, projectData).catch(error => {
          logger.error(`Failed to send webhook for existing project ${existingProject.name}:`, error);
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          project: {
            id: existingProject.id,
            name: existingProject.name,
            description: existingProject.description,
            slug: existingProject.slug,
            status: 'existing'
          },
          message: '项目已存在. 数据从数据库中获取.',
          webhookUrl: webhookUrl ? '将异步发送' : '未提供'
        }
      });
    }

    // 创建新项目
    const project = await createProject(cleanedUrl, projectType);
    logger.info(`Project created: ${project.name} (${project.id})`);

    // 获取完整的项目数据，包括 repo 信息
    const fullProjectData = await getFullProjectData(project.id);
    logger.info(`Full project data retrieved for: ${fullProjectData.name}`);

    const repoId = fullProjectData.repo.id;
    try {
      const readmeJob = await createReadmeSyncJob(db, {
        repoId,
        triggeredBy: 'project_create',
      });
      runReadmeSyncForRepo(db, repoId, readmeJob.id).then((result) => {
        if (result.success) {
          logger.info(`README sync succeeded for repo ${repoId}`);
        } else {
          logger.error(`README sync failed for repo ${repoId}:`, result.error);
        }
      }).catch((err) => {
        logger.error(`README sync error for repo ${repoId}:`, err);
      });
    } catch (jobErr) {
      logger.error('Failed to create readme sync job:', jobErr);
    }

    // 异步：统计入库 + 成功后同步 webhook（错误入库，支持重试）
    try {
      const projectSyncJob = await createProjectSyncJob(db, {
        projectId: fullProjectData.id,
        repoId,
        triggeredBy: 'project_create',
        webhookUrl: webhookUrl ?? null,
      });
      runStatsAndWebhookPipeline(db, projectSyncJob.id, fullProjectData.id, repoId, webhookUrl ?? null).then(() => {
        logger.info(`Project sync pipeline finished for project ${fullProjectData.name}`);
      }).catch((err) => {
        logger.error(`Project sync pipeline error for project ${fullProjectData.name}:`, err);
      });
    } catch (jobErr) {
      logger.error('Failed to create project sync job:', jobErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          slug: project.slug,
          status: 'created'
        },
        message: '项目创建成功. GitHub数据更新和webhook发送正在异步处理.',
        webhookUrl: webhookUrl ? '将异步发送' : '未提供'
      }
    });

  } catch (error) {
    logger.error('Error creating project:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

function validateAndCleanGitHubUrl(url: string): string | null {
  try {
    // 去掉末尾的 .git
    const cleanedUrl = url.replace(/\.git$/, '');
    
    // 验证是否是GitHub URL
    const githubUrlPattern = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+$/;
    if (!githubUrlPattern.test(cleanedUrl)) {
      return null;
    }
    
    return cleanedUrl;
  } catch (error) {
    logger.error('Error validating and cleaning GitHub URL:', error);
    return null;
  }
}

async function checkExistingProject(githubUrl: string) {
  try {
    // 从URL中提取owner和name
    const urlParts = githubUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const name = urlParts[urlParts.length - 1];
    
    // 查询数据库中是否已存在该仓库
    const existingRepo = await db.query.repos.findFirst({
      where: and(eq(schema.repos.owner, owner), eq(schema.repos.name, name)),
      with: {
        projects: {
          with: {
            packages: true,
          },
        },
      },
    });

    if (existingRepo && existingRepo.projects.length > 0) {
      // 返回第一个项目，并确保包含repo信息
      const project = existingRepo.projects[0];
      return {
        ...project,
        repo: existingRepo, // 确保项目包含repo信息
      };
    }

    return null;
  } catch (error) {
    logger.error('Error checking existing project:', error);
    return null;
  }
}

async function getFullProjectData(projectId: string) {
  return getFullProjectDataShared(db, projectId);
} 