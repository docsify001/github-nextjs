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

// 全局变量，用于在 serverless 环境中保持调度器实例
let scheduler: CronerScheduler | null = null;

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  if (scheduler) {
    scheduler.stop();
    logger.info('Scheduler stopped');
  }
  
  process.exit(0);
};

// 处理未捕获的异常
const handleUncaughtException = (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
};

// 处理未处理的 Promise 拒绝
const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
};

// 设置进程事件监听器
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

// 主函数
async function main() {
  try {
    logger.info('Starting Croner Task Scheduler...');
    
    // 创建调度器实例
    scheduler = new CronerScheduler(db);
    
    // 启动调度器
    await scheduler.start();
    
    logger.success('Croner Task Scheduler started successfully');
    
    // 在 serverless 环境中，保持进程运行
    // 注意：在 Vercel 的 serverless 环境中，这个脚本可能不会长期运行
    // 实际的定时任务应该通过 Vercel Cron Jobs 或其他外部调度服务来触发
    
    // 输出调度器状态
    const status = scheduler.getStatus();
    logger.info('Scheduler status:', status);
    
    // 定期输出状态信息（用于调试）
    setInterval(() => {
      if (scheduler) {
        const currentStatus = scheduler.getStatus();
        logger.debug('Current scheduler status:', currentStatus);
      }
    }, 60000); // 每分钟输出一次状态
    
  } catch (error) {
    logger.error('Failed to start scheduler:', error);
    process.exit(1);
  }
}

// 导出主函数，以便在其他地方调用
export { main, scheduler };

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
} 