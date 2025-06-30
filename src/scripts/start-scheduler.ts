#!/usr/bin/env node

import { db } from '@/drizzle/database';
import { TaskScheduler } from '@/lib/tasks/scheduler';
import { CronScheduler } from '@/lib/tasks/cron-scheduler';
import { createConsola } from 'consola';

const logger = createConsola();

async function main() {
  try {
    logger.info('Starting task scheduler...');

    // 创建任务调度器
    const taskScheduler = new TaskScheduler(db);
    const cronScheduler = new CronScheduler(taskScheduler);

    // 启动定时任务调度器
    await cronScheduler.start();

    logger.success('Task scheduler started successfully');

    // 保持进程运行
    process.on('SIGINT', async () => {
      logger.info('Shutting down task scheduler...');
      cronScheduler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down task scheduler...');
      cronScheduler.stop();
      process.exit(0);
    });

    // 定期输出状态
    setInterval(() => {
      const status = cronScheduler.getStatus();
      logger.info('Scheduler status:', status);
    }, 60000); // 每分钟输出一次状态

  } catch (error) {
    logger.error('Failed to start task scheduler:', error);
    process.exit(1);
  }
}

main(); 