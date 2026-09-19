import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { CronerScheduler } from '@/lib/tasks/croner-scheduler';
import { createConsola } from 'consola';

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const logger = createConsola({
  level: 4,
  formatOptions: {
    colors: true,
    date: true,
  }
});

// 任务按顺序执行；单个任务失败不影响其他任务
type PlannedTask = {
  name: string;
  reason: string;
};

function planTasks(shanghai: Date): PlannedTask[] {
  const dayOfWeek = shanghai.getUTCDay(); // 0 = Sunday, 1 = Monday
  const dayOfMonth = shanghai.getUTCDate();
  const isMonday = dayOfWeek === 1;
  const isFirstOfMonth = dayOfMonth === 1;

  const tasks: PlannedTask[] = [
    { name: 'daily-update', reason: 'daily' },
  ];

  if (isMonday) {
    // 每周一：weekly-rankings 已包含 updateGitHubDataTask，跳过 process-repo-assets 避免重复抓取
    tasks.push({ name: 'weekly-rankings', reason: 'weekly-monday' });
  } else {
    tasks.push({ name: 'process-repo-assets', reason: 'daily' });
  }

  if (isFirstOfMonth) {
    tasks.push({ name: 'monthly-rankings', reason: 'monthly-first' });
  }

  tasks.push({ name: 'sync-skill-repos', reason: 'daily' });

  return tasks;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 未配置密钥：仅用于本地/Debug
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

// 处理 Vercel Cron Jobs 的请求（每日触发一次，UTC 18:00 = 北京时间 02:00）
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Vercel Cron Job triggered');

    // 北京时间用于判断周期任务（Vercel cron 按 UTC 评估）
    const now = new Date();
    const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const planned = planTasks(shanghai);
    if (planned.length === 0) {
      logger.warn(`No tasks scheduled for current time: ${now.toISOString()}`);
      return NextResponse.json({ success: true, message: 'No task scheduled' });
    }

    const scheduler = new CronerScheduler(db);
    await scheduler.initializeTaskDefinitions();

    const tasks = await scheduler.getTaskDefinitions();
    const results: { task: string; reason: string; status: string; executionId?: string; error?: string }[] = [];

    for (const plannedTask of planned) {
      const task = tasks.find((t) => t.name === plannedTask.name);
      if (!task) {
        results.push({ task: plannedTask.name, reason: plannedTask.reason, status: 'not-found' });
        logger.error(`Task not found: ${plannedTask.name}`);
        continue;
      }
      if (!task.isEnabled) {
        results.push({ task: plannedTask.name, reason: plannedTask.reason, status: 'disabled' });
        logger.warn(`Task is disabled: ${plannedTask.name}`);
        continue;
      }

      try {
        const executionId = await scheduler.executeTask(task.id, 'system');
        results.push({ task: plannedTask.name, reason: plannedTask.reason, status: 'completed', executionId });
        logger.success(`Task executed: ${plannedTask.name} (${executionId})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ task: plannedTask.name, reason: plannedTask.reason, status: 'failed', error: errorMessage });
        logger.error(`Task failed: ${plannedTask.name}`, error);
      }
    }

    const failedCount = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      data: {
        executedAt: now.toISOString(),
        shanghaiTime: shanghai.toISOString(),
        results,
      },
      summary: `${results.length} tasks, ${failedCount} failed`,
    });
  } catch (error) {
    logger.error('Error executing cron job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// 手动触发指定任务（POST /api/croner-scheduler/cron）
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const taskNames: string[] = Array.isArray(body?.taskNames)
      ? body.taskNames
      : body?.taskName
        ? [body.taskName]
        : [];

    if (taskNames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'taskName or taskNames is required' },
        { status: 400 }
      );
    }

    const scheduler = new CronerScheduler(db);
    await scheduler.initializeTaskDefinitions();

    const tasks = await scheduler.getTaskDefinitions();
    const results: { task: string; status: string; executionId?: string; error?: string }[] = [];

    for (const name of taskNames) {
      const task = tasks.find((t) => t.name === name);
      if (!task) {
        results.push({ task: name, status: 'not-found' });
        continue;
      }
      if (!task.isEnabled) {
        results.push({ task: name, status: 'disabled' });
        continue;
      }
      try {
        const executionId = await scheduler.executeTask(task.id, 'system');
        results.push({ task: name, status: 'completed', executionId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ task: name, status: 'failed', error: errorMessage });
      }
    }

    return NextResponse.json({ success: true, data: { results } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}