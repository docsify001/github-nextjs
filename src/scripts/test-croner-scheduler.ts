#!/usr/bin/env tsx

import { createConsola } from 'consola';
import { db } from '@/drizzle/database';
import { CronerScheduler } from '@/lib/tasks/croner-scheduler';

const logger = createConsola({
  level: 4,
  formatOptions: {
    colors: true,
    date: true,
  }
});

async function testCronerScheduler() {
  try {
    logger.info('Testing Croner Scheduler...');
    
    // 创建调度器实例
    const scheduler = new CronerScheduler(db);
    
    // 初始化任务定义
    await scheduler.initializeTaskDefinitions();
    
    // 获取任务列表
    const tasks = await scheduler.getTaskDefinitions();
    logger.info(`Found ${tasks.length} task definitions:`, tasks.map(t => t.name));
    
    // 测试获取任务状态
    for (const task of tasks) {
      const status = await scheduler.getTaskStatus(task.id);
      logger.info(`Task ${task.name} status:`, status);
    }
    
    // 测试获取任务执行历史
    for (const task of tasks) {
      const executions = await scheduler.getTaskExecutions(task.id, 3);
      logger.info(`Task ${task.name} recent executions:`, executions.length);
    }
    
    // 测试调度器状态
    const status = scheduler.getStatus();
    logger.info('Scheduler status:', status);
    
    // 测试手动执行任务（选择第一个启用的任务）
    const enabledTask = tasks.find(t => t.isEnabled);
    if (enabledTask) {
      logger.info(`Testing manual execution of task: ${enabledTask.name}`);
      
      try {
        const executionId = await scheduler.executeTask(enabledTask.id, 'manual');
        logger.success(`Task executed successfully with execution ID: ${executionId}`);
        
        // 等待一段时间后检查执行状态
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const executions = await scheduler.getTaskExecutions(enabledTask.id, 1);
        if (executions.length > 0) {
          const latestExecution = executions[0];
          logger.info(`Latest execution status: ${latestExecution.status}`);
          if (latestExecution.error) {
            logger.error(`Execution error: ${latestExecution.error}`);
          }
        }
      } catch (error) {
        logger.error(`Failed to execute task ${enabledTask.name}:`, error);
      }
    }
    
    // 测试启用/禁用任务
    if (enabledTask) {
      logger.info(`Testing toggle functionality for task: ${enabledTask.name}`);
      
      // 禁用任务
      await scheduler.toggleTask(enabledTask.id, false);
      logger.info(`Task ${enabledTask.name} disabled`);
      
      // 重新启用任务
      await scheduler.toggleTask(enabledTask.id, true);
      logger.info(`Task ${enabledTask.name} enabled`);
    }
    
    logger.success('Croner Scheduler test completed successfully');
    
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// 运行测试
testCronerScheduler().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
}); 