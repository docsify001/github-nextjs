import { CronerScheduler } from '@/lib/tasks/croner-scheduler';
import { db } from '@/drizzle/database';
import { createConsola } from 'consola';

const logger = createConsola();

/**
 * Croner 调度器使用示例
 * 
 * 这个示例展示了如何使用 CronerScheduler 来管理定时任务
 */
async function cronerSchedulerExample() {
  try {
    logger.info('=== Croner 调度器使用示例 ===');
    
    // 1. 创建调度器实例
    const scheduler = new CronerScheduler(db);
    
    // 2. 初始化任务定义
    await scheduler.initializeTaskDefinitions();
    logger.success('任务定义初始化完成');
    
    // 3. 获取所有任务
    const tasks = await scheduler.getTaskDefinitions();
    logger.info(`找到 ${tasks.length} 个任务定义:`);
    tasks.forEach(task => {
      logger.info(`  - ${task.name}: ${task.description} (${task.cronExpression})`);
    });
    
    // 4. 启动调度器（在本地环境中）
    // 注意：在 Vercel serverless 环境中，不需要手动启动调度器
    // 定时任务通过 Vercel Cron Jobs 自动触发
    if (process.env.NODE_ENV === 'development') {
      await scheduler.start();
      logger.success('调度器已启动');
    }
    
    // 5. 获取调度器状态
    const status = scheduler.getStatus();
    logger.info('调度器状态:', status);
    
    // 6. 手动执行任务示例
    const enabledTask = tasks.find(t => t.isEnabled);
    if (enabledTask) {
      logger.info(`手动执行任务: ${enabledTask.name}`);
      
      try {
        const executionId = await scheduler.executeTask(enabledTask.id, 'manual');
        logger.success(`任务执行成功，执行ID: ${executionId}`);
        
        // 等待任务完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查执行状态
        const executions = await scheduler.getTaskExecutions(enabledTask.id, 1);
        if (executions.length > 0) {
          const latestExecution = executions[0];
          logger.info(`最新执行状态: ${latestExecution.status}`);
          if (latestExecution.duration) {
            logger.info(`执行时长: ${latestExecution.duration}ms`);
          }
          if (latestExecution.error) {
            logger.error(`执行错误: ${latestExecution.error}`);
          }
        }
      } catch (error) {
        logger.error(`任务执行失败: ${error}`);
      }
    }
    
    // 7. 任务管理示例
    if (enabledTask) {
      logger.info(`任务管理示例 - 任务: ${enabledTask.name}`);
      
      // 获取任务状态
      const taskStatus = await scheduler.getTaskStatus(enabledTask.id);
      logger.info('任务状态:', taskStatus);
      
      // 获取执行历史
      const executions = await scheduler.getTaskExecutions(enabledTask.id, 5);
      logger.info(`最近 ${executions.length} 次执行记录`);
      
      // 启用/禁用任务示例（注释掉以避免影响实际运行）
      // await scheduler.toggleTask(enabledTask.id, false);
      // logger.info('任务已禁用');
      // await scheduler.toggleTask(enabledTask.id, true);
      // logger.info('任务已启用');
    }
    
    // 8. 在开发环境中停止调度器
    if (process.env.NODE_ENV === 'development') {
      scheduler.stop();
      logger.success('调度器已停止');
    }
    
    logger.success('=== 示例执行完成 ===');
    
  } catch (error) {
    logger.error('示例执行失败:', error);
    throw error;
  }
}

/**
 * 在 Vercel serverless 环境中的使用示例
 */
export async function vercelServerlessExample() {
  try {
    logger.info('=== Vercel Serverless 环境示例 ===');
    
    // 在 serverless 环境中，每次请求都会创建新的调度器实例
    const scheduler = new CronerScheduler(db);
    
    // 初始化任务定义
    await scheduler.initializeTaskDefinitions();
    
    // 根据当前时间确定要执行的任务
    const now = new Date();
    const hour = now.getHours();
    const dayOfMonth = now.getDate();
    const dayOfWeek = now.getDay();
    
    let taskName: string | null = null;
    
    if (hour === 2) {
      taskName = 'daily-update';
    } else if (hour === 3 && dayOfMonth === 1) {
      taskName = 'monthly-rankings';
    } else if (hour === 3 && dayOfWeek === 1) {
      taskName = 'weekly-rankings';
    } else if (hour === 4) {
      taskName = 'process-repo-assets';
    }
    
    if (taskName) {
      logger.info(`执行定时任务: ${taskName}`);
      
      const tasks = await scheduler.getTaskDefinitions();
      const task = tasks.find(t => t.name === taskName);
      
      if (task && task.isEnabled) {
        const executionId = await scheduler.executeTask(task.id, 'system');
        logger.success(`任务执行成功: ${taskName} (执行ID: ${executionId})`);
        
        return {
          success: true,
          taskName,
          executionId,
          executedAt: now.toISOString()
        };
      } else {
        logger.warn(`任务未找到或已禁用: ${taskName}`);
        return {
          success: false,
          error: `Task not found or disabled: ${taskName}`
        };
      }
    } else {
      logger.info('当前时间没有预定的任务');
      return {
        success: true,
        message: 'No task scheduled for current time'
      };
    }
    
  } catch (error) {
    logger.error('Serverless 示例执行失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 导出示例函数
export { cronerSchedulerExample };

// 如果直接运行此文件
if (require.main === module) {
  cronerSchedulerExample().catch((error) => {
    logger.error('示例运行失败:', error);
    process.exit(1);
  });
} 