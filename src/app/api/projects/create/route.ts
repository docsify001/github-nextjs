import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { createProject } from '@/drizzle/projects/create';
import { createGitHubClient } from '@/lib/github/github-api-client';
import { createNpmClient } from '@/lib/shared/npm-api-client';
import { createConsola } from 'consola';
import { updateGitHubDataTask } from '@/lib/tasks/bestofjs/update-github-data.task';
import { createTaskRunner } from '@/lib/tasks/task-runner';
import { eq, and } from 'drizzle-orm';
import { schema } from '@/drizzle/database';

const logger = createConsola();

interface CreateProjectRequest {
  githubUrl: string;
  webhookUrl?: string;
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
  const token = request.headers.get('Authorization');
  if (token !== process.env.PROJECT_API_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  try {
    const { githubUrl, webhookUrl }: CreateProjectRequest = await request.json();

    if (!githubUrl) {
      return NextResponse.json(
        { success: false, error: '请提供GitHub URL' },
        { status: 400 }
      );
    }

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
      const projectData = await fetchProjectData(existingProject);
      
      // 如果有webhook URL，异步发送数据
      if (webhookUrl) {
        sendWebhookData(webhookUrl, projectData).catch(error => {
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
    const project = await createProject(cleanedUrl);
    logger.info(`Project created: ${project.name} (${project.id})`);

    // 获取完整的项目数据，包括 repo 信息
    const fullProjectData = await getFullProjectData(project.id);
    logger.info(`Full project data retrieved for: ${fullProjectData.name}`);

    // 异步执行 updateGitHubDataTask 来获取当前项目对应的 repo 数据
    runUpdateGitHubDataTask(fullProjectData).then(async (result) => {
      logger.info(`GitHub data updated for project: ${fullProjectData.name}`, result);
      
      // 如果有webhook URL，发送webhook数据
      if (webhookUrl) {
        try {
          const projectData = await fetchProjectData(fullProjectData);
          await sendWebhookData(webhookUrl, projectData);
          logger.success(`Webhook sent successfully for project: ${fullProjectData.name}`);
        } catch (error) {
          logger.error(`Failed to send webhook for project ${fullProjectData.name}:`, error);
        }
      }
    }).catch(error => {
      logger.error(`Failed to update GitHub data for project ${fullProjectData.name}:`, error);
    });

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
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
    with: {
      repo: true,
      packages: true,
    },
  });

  if (!project || !project.repo) {
    throw new Error(`Project or repo not found for project ID: ${projectId}`);
  }

  return project;
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

async function fetchProjectData(project: any): Promise<ProjectData> {
  const githubClient = createGitHubClient();
  const npmClient = createNpmClient();

  const fullName = `${project.repo.owner}/${project.repo.name}`;

  // 如果项目已存在且有完整的repo数据，直接使用数据库中的数据
  if (project.repo && project.repo.stars !== undefined) {
    logger.info(`Using existing data for project: ${project.name}`);
    
    // 获取NPM包数据（如果有的话）
    const packages = [];
    if (project.packages && project.packages.length > 0) {
      for (const pkg of project.packages) {
        try {
          const packageInfo = await npmClient.fetchPackageInfo(pkg.name);
          const monthlyDownloads = await npmClient.fetchMonthlyDownloadCount(pkg.name);

          packages.push({
            name: pkg.name,
            version: packageInfo.version,
            downloads: monthlyDownloads,
            dependencies: packageInfo.dependencies ? Object.keys(packageInfo.dependencies) : [],
            deprecated: Boolean(packageInfo.deprecated)
          });
        } catch (error) {
          logger.warn(`Failed to fetch package data for ${pkg.name}:`, error);
          packages.push({
            name: pkg.name,
            version: pkg.version,
            downloads: pkg.monthlyDownloads
          });
        }
      }
    }

    // 获取bundle size数据（如果有的话）
    let bundleSize;
    if (project.packages && project.packages.length > 0) {
      try {
        const bundleData = await npmClient.fetchBundleData(project.packages[0].name);
        bundleSize = {
          size: bundleData.size,
          gzip: bundleData.gzip
        };
      } catch (error) {
        logger.warn(`Failed to fetch bundle size for ${project.name}:`, error);
      }
    }

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      fullName: fullName,
      stars: project.repo.stars || 0,
      ownerId: project.repo.owner_id,
      homepage: project.repo.homepage,
      topics: project.repo.topics || [],
      createdAt: project.repo.created_at ? project.repo.created_at.toISOString() : '',
      pushedAt: project.repo.pushed_at ? project.repo.pushed_at.toISOString() : '',
      lastCommit: project.repo.last_commit ? project.repo.last_commit.toISOString() : undefined,
      contributorCount: project.repo.contributor_count,
      packages,
      bundleSize
    };
  }

  // 如果项目是新创建的或数据不完整，重新获取GitHub数据
  logger.info(`Fetching fresh data for project: ${project.name}`);
  
  // 获取GitHub数据
  const githubData = await githubClient.fetchRepoInfo(fullName);
  const contributorCount = await githubClient.fetchContributorCount(fullName);

  // 获取NPM包数据（如果有的话）
  const packages = [];
  if (project.packages && project.packages.length > 0) {
    for (const pkg of project.packages) {
      try {
        const packageInfo = await npmClient.fetchPackageInfo(pkg.name);
        const monthlyDownloads = await npmClient.fetchMonthlyDownloadCount(pkg.name);

        packages.push({
          name: pkg.name,
          version: packageInfo.version,
          downloads: monthlyDownloads,
          dependencies: packageInfo.dependencies ? Object.keys(packageInfo.dependencies) : [],
          deprecated: Boolean(packageInfo.deprecated)
        });
      } catch (error) {
        logger.warn(`Failed to fetch package data for ${pkg.name}:`, error);
        packages.push({
          name: pkg.name,
          version: pkg.version,
          downloads: pkg.monthlyDownloads
        });
      }
    }
  }

  // 获取bundle size数据（如果有的话）
  let bundleSize;
  if (project.packages && project.packages.length > 0) {
    try {
      const bundleData = await npmClient.fetchBundleData(project.packages[0].name);
      bundleSize = {
        size: bundleData.size,
        gzip: bundleData.gzip
      };
    } catch (error) {
      logger.warn(`Failed to fetch bundle size for ${project.name}:`, error);
    }
  }

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    fullName: fullName,
    stars: githubData.stargazers_count || 0,
    ownerId: githubData.owner.id,
    homepage: githubData.homepage,
    topics: githubData.topics || [],
    createdAt: String(githubData.created_at),
    pushedAt: String(githubData.pushed_at),
    lastCommit: githubData.last_commit ? new Date(githubData.last_commit).toISOString() : undefined,
    contributorCount,
    packages,
    bundleSize
  };
}

async function sendWebhookData(webhookUrl: string, data: ProjectData) {
  try {
    logger.info(`Sending webhook data to: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BestOfJS-Project-Creator/1.0'
      },
      body: JSON.stringify({
        event: 'project.created',
        timestamp: new Date().toISOString(),
        data: data
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed with status: ${response.status}`);
    }

    logger.success(`Webhook sent successfully for project: ${data.name}`);
  } catch (error) {
    logger.error(`Failed to send webhook:`, error);
    throw error;
  }
} 