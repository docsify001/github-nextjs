import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { CronerScheduler } from '@/lib/tasks/croner-scheduler';
import { verifyApiAuth } from '@/lib/auth/auth-utils';

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

    const tasks = await scheduler.getTaskDefinitions();
    const runningTasks = scheduler.getRunningTasks();
    const cronStatus = scheduler.getStatus();

    const tasksWithStatus = await Promise.all(
      tasks.map(async (task: any) => {
        const status = await scheduler.getTaskStatus(task.id);
        return {
          ...task,
          status,
          isCurrentlyRunning: runningTasks.includes(task.id),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        cronScheduler: cronStatus,
        tasks: tasksWithStatus,
        runningTasks,
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