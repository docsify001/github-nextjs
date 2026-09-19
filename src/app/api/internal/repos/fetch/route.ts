import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/drizzle/database';
import { eq, and } from 'drizzle-orm';
import { schema } from '@/drizzle/database';
import { parseGithubRepoUrl } from '@/lib/github/repo-url';
import { createProjectAction } from '@/actions/projects-actions';
import { CreateProjectType } from '@/drizzle/projects';
import { createConsola } from 'consola';

export const dynamic = 'force-dynamic';

const logger = createConsola();

const ALLOWED_TYPES = ['skill', 'application', 'client', 'server', 'persona'];

interface RequestBody {
  url?: string;
  repoUrl?: string;
  githubUrl?: string;
  owner?: string;
  name?: string;
  type?: string;
}

/**
 * 内部按需抓取接口：供 openmcp 等协作应用调用。
 *
 * 入参：{ url / repoUrl / githubUrl, type }
 * - url 支持 owner/repo 或完整 https 链接（含 .git 后缀）
 * - type 默认 skill
 *
 * 认证：请求头 Authorization: Bearer <GITHUB_NEXTJS_API_TOKEN>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const expected = process.env.GITHUB_NEXTJS_API_TOKEN;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json(
      { success: false, error: '未授权，请携带有效的 Bearer Token' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const rawUrl = body.url ?? body.repoUrl ?? body.githubUrl;

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: '缺少 GitHub 仓库地址（url）' },
        { status: 400 }
      );
    }

    const parsed = parseGithubRepoUrl(rawUrl);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: '无法识别该 GitHub 仓库地址，请使用 owner/repo 或完整的 https 链接' },
        { status: 400 }
      );
    }

    const projectType: CreateProjectType =
      body.type && (ALLOWED_TYPES as string[]).includes(body.type)
        ? (body.type as CreateProjectType)
        : 'skill';

    logger.info(`[internal] fetch repo: ${parsed.fullName} type=${projectType}`);

    // 已存在的仓库 + 已存在项目：直接返回，不重复创建
    const existingRepo = await db.query.repos.findFirst({
      where: and(eq(schema.repos.owner, parsed.owner), eq(schema.repos.name, parsed.name)),
      columns: { id: true },
    });
    if (existingRepo) {
      const existingProject = await db.query.projects.findFirst({
        where: eq(schema.projects.repoId, existingRepo.id),
        columns: { id: true, name: true, slug: true, type: true },
      });
      if (existingProject) {
        return NextResponse.json({
          success: true,
          status: 'existing',
          message: '仓库与项目已存在',
          data: {
            fullName: parsed.fullName,
            project: existingProject,
          },
        });
      }
    }

    // 创建项目（内部会自动 upsert 仓库 + 异步刷新 GitHub 数据 / skill 同步）
    const project = await createProjectAction(parsed.fullName, projectType);

    return NextResponse.json({
      success: true,
      status: 'created',
      message: '项目创建成功，GitHub 数据正在异步同步',
      data: {
        fullName: parsed.fullName,
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          type: project.type,
        },
      },
    });
  } catch (error) {
    logger.error('[internal] fetch repo failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 }
    );
  }
}