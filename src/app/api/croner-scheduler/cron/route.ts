import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { CronerScheduler } from '@/lib/tasks/croner-scheduler';
import { createConsola } from 'consola';

export const dynamic = "force-dynamic";

const logger = createConsola({
  level: 4,
  formatOptions: {
    colors: true,
    date: true,
  }
});

// 处理 Vercel Cron Jobs 的请求
export async function GET(request: NextRequest) {
  try {
    logger.info('Vercel Cron Job triggered');
    
    // 获取当前时间
    const now = new Date();
    const hour = now.getHours();
    const dayOfMonth = now.getDate();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // 根据当前时间确定应该执行哪个任务
    let taskName: string | null = null;
    
    if (hour === 2) {
      // 每天凌晨2点 - daily-update
      taskName = 'daily-update';
    } else if (hour === 3 && dayOfMonth === 1) {
      // 每月1号凌晨3点 - monthly-rankings
      taskName = 'monthly-rankings';
    } else if (hour === 3 && dayOfWeek === 1) {
      // 每周一凌晨3点 - weekly-rankings
      taskName = 'weekly-rankings';
    } else if (hour === 4) {
      // 每天凌晨4点 - process-repo-assets
      taskName = 'process-repo-assets';
    }
    
    if (!taskName) {
      logger.warn(`No task scheduled for current time: ${now.toISOString()}`);
      return NextResponse.json({ 
        success: true, 
        message: 'No task scheduled for current time' 
      });
    }
    
    logger.info(`Executing scheduled task: ${taskName}`);
    
    // 创建调度器实例
    const scheduler = new CronerScheduler(db);
    
    // 初始化任务定义
    await scheduler.initializeTaskDefinitions();
    
    // 查找对应的任务
    const tasks = await scheduler.getTaskDefinitions();
    const task = tasks.find(t => t.name === taskName);
    
    if (!task) {
      logger.error(`Task not found: ${taskName}`);
      return NextResponse.json(
        { success: false, error: `Task not found: ${taskName}` },
        { status: 404 }
      );
    }
    
    if (!task.isEnabled) {
      logger.warn(`Task is disabled: ${taskName}`);
      return NextResponse.json({ 
        success: true, 
        message: `Task is disabled: ${taskName}` 
      });
    }
    
    // 执行任务
    const executionId = await scheduler.executeTask(task.id, 'system');
    
    logger.success(`Task executed successfully: ${taskName} (executionId: ${executionId})`);
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        taskName,
        executionId,
        executedAt: now.toISOString()
      },
      message: `Task executed successfully: ${taskName}` 
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

// 处理 POST 请求（如果需要）
export async function POST(request: NextRequest) {
  try {
    const { taskName } = await request.json();
    
    if (!taskName) {
      return NextResponse.json(
        { success: false, error: 'Task name is required' },
        { status: 400 }
      );
    }
    
    logger.info(`Manual cron execution requested for task: ${taskName}`);
    
    // 创建调度器实例
    const scheduler = new CronerScheduler(db);
    
    // 初始化任务定义
    await scheduler.initializeTaskDefinitions();
    
    // 查找对应的任务
    const tasks = await scheduler.getTaskDefinitions();
    const task = tasks.find(t => t.name === taskName);
    
    if (!task) {
      logger.error(`Task not found: ${taskName}`);
      return NextResponse.json(
        { success: false, error: `Task not found: ${taskName}` },
        { status: 404 }
      );
    }
    
    if (!task.isEnabled) {
      logger.warn(`Task is disabled: ${taskName}`);
      return NextResponse.json(
        { success: false, error: `Task is disabled: ${taskName}` },
        { status: 400 }
      );
    }
    
    // 执行任务
    const executionId = await scheduler.executeTask(task.id, 'system');
    
    logger.success(`Task executed successfully: ${taskName} (executionId: ${executionId})`);
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        taskName,
        executionId,
        executedAt: new Date().toISOString()
      },
      message: `Task executed successfully: ${taskName}` 
    });
    
  } catch (error) {
    logger.error('Error executing manual cron job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 