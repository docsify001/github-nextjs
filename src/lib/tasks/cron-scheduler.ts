import { TaskScheduler } from './scheduler';
import { createConsola } from 'consola';

const logger = createConsola();

export class CronScheduler {
  private scheduler: TaskScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(scheduler: TaskScheduler) {
    this.scheduler = scheduler;
  }

  // 启动定时任务调度器
  async start() {
    if (this.isRunning) {
      logger.warn('Cron scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting cron scheduler...');

    // 初始化任务定义
    await this.scheduler.initializeTaskDefinitions();

    // 获取所有启用的任务
    const tasks = await this.scheduler.getTaskDefinitions();
    const enabledTasks = tasks.filter(task => task.isEnabled && task.cronExpression);

    // 为每个任务设置定时器
    for (const task of enabledTasks) {
      this.scheduleTask(task);
    }

    logger.info(`Cron scheduler started with ${enabledTasks.length} tasks`);
  }

  // 停止定时任务调度器
  stop() {
    if (!this.isRunning) {
      logger.warn('Cron scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    // 清除所有定时器
    for (const [taskId, interval] of this.intervals) {
      clearInterval(interval);
      logger.info(`Stopped cron for task: ${taskId}`);
    }
    this.intervals.clear();

    logger.info('Cron scheduler stopped');
  }

  // 为单个任务设置定时器
  private scheduleTask(task: any) {
    if (!task.cronExpression) {
      return;
    }

    // 解析cron表达式
    const cronParts = this.parseCronExpression(task.cronExpression);
    if (!cronParts) {
      logger.error(`Invalid cron expression for task ${task.name}: ${task.cronExpression}`);
      return;
    }

    // 计算下次执行时间
    const nextRun = this.getNextRunTime(cronParts);
    const now = new Date();
    const delay = nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      logger.warn(`Task ${task.name} should have run in the past, scheduling for next interval`);
      this.scheduleNextRun(task, cronParts);
      return;
    }

    logger.info(`Scheduling task ${task.name} to run at ${nextRun.toISOString()}`);

    // 设置定时器
    const timeout = setTimeout(async () => {
      try {
        await this.scheduler.executeTask(task.id, 'system');
        logger.info(`Cron task completed: ${task.name}`);
      } catch (error) {
        logger.error(`Cron task failed: ${task.name}`, error);
      } finally {
        // 安排下次执行
        this.scheduleNextRun(task, cronParts);
      }
    }, delay);

    this.intervals.set(task.id, timeout as any);
  }

  // 安排下次执行
  private scheduleNextRun(task: any, cronParts: any) {
    const nextRun = this.getNextRunTime(cronParts);
    const now = new Date();
    const delay = nextRun.getTime() - now.getTime();

    logger.info(`Scheduling next run for task ${task.name} at ${nextRun.toISOString()}`);

    const timeout = setTimeout(async () => {
      try {
        await this.scheduler.executeTask(task.id, 'system');
        logger.info(`Cron task completed: ${task.name}`);
      } catch (error) {
        logger.error(`Cron task failed: ${task.name}`, error);
      } finally {
        // 递归安排下次执行
        this.scheduleNextRun(task, cronParts);
      }
    }, delay);

    this.intervals.set(task.id, timeout as any);
  }

  // 解析cron表达式
  private parseCronExpression(expression: string) {
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      return null;
    }

    return {
      minute: this.parseCronPart(parts[0], 0, 59),
      hour: this.parseCronPart(parts[1], 0, 23),
      dayOfMonth: this.parseCronPart(parts[2], 1, 31),
      month: this.parseCronPart(parts[3], 1, 12),
      dayOfWeek: this.parseCronPart(parts[4], 0, 6),
    };
  }

  // 解析cron表达式的单个部分
  private parseCronPart(part: string, min: number, max: number): number[] {
    if (part === '*') {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }

    if (part.includes(',')) {
      return part.split(',').map(p => parseInt(p)).filter(n => n >= min && n <= max);
    }

    if (part.includes('-')) {
      const [start, end] = part.split('-').map(p => parseInt(p));
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const stepNum = parseInt(step);
      const rangePart = range === '*' ? Array.from({ length: max - min + 1 }, (_, i) => min + i) : this.parseCronPart(range, min, max);
      return rangePart.filter((_, i) => i % stepNum === 0);
    }

    const num = parseInt(part);
    return num >= min && num <= max ? [num] : [];
  }

  // 计算下次执行时间
  private getNextRunTime(cronParts: any): Date {
    const now = new Date();
    const next = new Date(now);

    // 重置秒和毫秒
    next.setSeconds(0, 0);

    // 找到下一个匹配的时间
    while (true) {
      const month = next.getMonth() + 1; // getMonth() 返回 0-11
      const dayOfMonth = next.getDate();
      const dayOfWeek = next.getDay();
      const hour = next.getHours();
      const minute = next.getMinutes();

      // 检查月份
      if (!cronParts.month.includes(month)) {
        next.setMonth(month);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        continue;
      }

      // 检查日期
      if (!cronParts.dayOfMonth.includes(dayOfMonth) && !cronParts.dayOfWeek.includes(dayOfWeek)) {
        next.setDate(dayOfMonth + 1);
        next.setHours(0, 0, 0, 0);
        continue;
      }

      // 检查小时
      if (!cronParts.hour.includes(hour)) {
        next.setHours(hour + 1, 0, 0, 0);
        continue;
      }

      // 检查分钟
      if (!cronParts.minute.includes(minute)) {
        const nextMinute = cronParts.minute.find((m: number) => m > minute);
        if (nextMinute !== undefined) {
          next.setMinutes(nextMinute, 0, 0);
        } else {
          next.setHours(hour + 1, cronParts.minute[0], 0, 0);
        }
        continue;
      }

      // 如果时间已经过去，增加一分钟
      if (next <= now) {
        next.setMinutes(minute + 1, 0, 0);
        continue;
      }

      break;
    }

    return next;
  }

  // 获取调度器状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledTasks: Array.from(this.intervals.keys()),
      taskCount: this.intervals.size,
    };
  }
} 