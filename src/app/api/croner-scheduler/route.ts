import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { CronerScheduler } from '@/lib/tasks/croner-scheduler';
import { verifyApiAuth } from '@/lib/auth/auth-utils';

export const dynamic = "force-dynamic";

// 全局调度器实例（在 serverless 环境中，每次请求都会重新创建）
let schedulerInstance: CronerScheduler | null = null;
let isInitialized = false;

// 获取调度器实例并确保初始化
async function getScheduler(): Promise<CronerScheduler> {
  if (!schedulerInstance) {
    schedulerInstance = new CronerScheduler(db);
  }
  
  // 确保任务定义已初始化
  if (!isInitialized) {
    await schedulerInstance.initializeTaskDefinitions();
    isInitialized = true;
  }
  
  return schedulerInstance;
}

// 获取调度器状态
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
    // 注意：不再自动启动本地调度器。生产环境（Vercel）任务由 Vercel Cron 触发，
    // 运行状态以 DB（task_status / task_executions）为准，见 /api/tasks。
    const scheduler = await getScheduler();
    
    const tasks = await scheduler.getTaskDefinitions();
    const runningTasks = scheduler.getRunningTasks();
    const cronStatus = scheduler.getStatus();

    // 运行中任务：本地调度器进程内的运行任务 + DB 中运行中的执行记录
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        const status = await scheduler.getTaskStatus(task.id);
        const isCurrentlyRunning =
          runningTasks.includes(task.id) ||
          status?.isRunning === true;
        return {
          ...task,
          status,
          isCurrentlyRunning,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        cronScheduler: cronStatus,
        tasks: tasksWithStatus,
        runningTasks,
        autoStarted: false, // 不再自动启动
      },
    });
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduler status' },
      { status: 500 }
    );
  }
}

// 启动调度器
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
    const { action, taskId, enabled } = await request.json();
    const scheduler = await getScheduler();

    switch (action) {
      case 'start':
        await scheduler.start();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler started successfully' 
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler stopped successfully' 
        });

      case 'reload':
        await scheduler.reloadTasks();
        return NextResponse.json({ 
          success: true, 
          message: 'Tasks reloaded successfully' 
        });

      case 'execute':
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'Task ID is required for execute action' },
            { status: 400 }
          );
        }
        const executionId = await scheduler.executeTask(taskId, 'manual');
        return NextResponse.json({ 
          success: true, 
          data: { executionId },
          message: 'Task executed successfully' 
        });

      case 'toggle':
        if (!taskId || typeof enabled !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'Task ID and enabled flag are required for toggle action' },
            { status: 400 }
          );
        }
        await scheduler.toggleTask(taskId, enabled);
        return NextResponse.json({ 
          success: true, 
          message: `Task ${enabled ? 'enabled' : 'disabled'} successfully` 
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing scheduler action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 