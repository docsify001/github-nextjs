import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { TaskScheduler } from '@/lib/tasks/scheduler';

// 获取任务列表
export async function GET() {
  try {
    const scheduler = new TaskScheduler(db);
    await scheduler.initializeTaskDefinitions();
    
    const tasks = await scheduler.getTaskDefinitions();
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        const status = await scheduler.getTaskStatus(task.id);
        const executions = await scheduler.getTaskExecutions(task.id, 5);
        return {
          ...task,
          status,
          recentExecutions: executions,
        };
      })
    );
    
    return NextResponse.json({ success: true, data: tasksWithStatus });
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
  try {
    const { taskDefinitionId, triggeredBy = 'manual' } = await request.json();

    if (!taskDefinitionId) {
      return NextResponse.json(
        { success: false, error: 'Task definition ID is required' },
        { status: 400 }
      );
    }

    const scheduler = new TaskScheduler(db);
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