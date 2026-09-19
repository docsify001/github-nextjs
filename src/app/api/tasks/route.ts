import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/drizzle/database';
import { schema } from '@/drizzle/database';
import { CronerScheduler } from '@/lib/tasks/croner-scheduler';
import { verifyApiAuth } from '@/lib/auth/auth-utils';

export const dynamic = "force-dynamic";

// 获取任务列表（DB 驱动：运行状态从 task_status / task_executions 读取，
// 无论在本地 croner 调度器还是 Vercel Cron 触发，均可反映真实执行状态）
export async function GET(request: NextRequest) {
  // 验证用户认证
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const scheduler = new CronerScheduler(db);
    await scheduler.initializeTaskDefinitions();

    const tasks = await scheduler.getTaskDefinitions();
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task: any) => {
        const status = await scheduler.getTaskStatus(task.id);
        const executions = await scheduler.getTaskExecutions(task.id, 5);
        // 运行中：task_status.isRunning 或存在 running/pending 的执行记录
        const isCurrentlyRunning =
          status?.isRunning === true ||
          executions.some(
            (exec) => exec.status === 'running' || exec.status === 'pending'
          );
        return {
          ...task,
          status,
          recentExecutions: executions,
          isCurrentlyRunning,
        };
      })
    );

    // 最近跨任务执行记录（用于"失败任务 / 最近执行"展示）
    const recentRows = await db
      .select()
      .from(schema.taskExecutions)
      .orderBy(desc(schema.taskExecutions.createdAt))
      .limit(30);

    const nameById = new Map(tasks.map((task: any) => [task.id, task.name]));
    const recentExecutions = recentRows.map((row: any) => ({
      ...row,
      taskName: nameById.get(row.taskDefinitionId) || row.taskDefinitionId,
    }));

    return NextResponse.json({
      success: true,
      data: { tasks: tasksWithStatus, recentExecutions },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// 执行任务
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
    const { taskDefinitionId, triggeredBy = 'manual' } = await request.json();

    if (!taskDefinitionId) {
      return NextResponse.json(
        { success: false, error: 'Task definition ID is required' },
        { status: 400 }
      );
    }

    const scheduler = new CronerScheduler(db);
    const executionId = await scheduler.executeTask(taskDefinitionId, triggeredBy);

    return NextResponse.json({ success: true, data: { executionId } });
  } catch (error) {
    console.error('Error executing task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}