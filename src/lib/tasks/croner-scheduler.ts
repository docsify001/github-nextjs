import { Cron } from 'croner';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@/drizzle/database';
import { createConsola } from 'consola';
import { Task } from './task-types';
import { buildStaticApiTask } from './bestofjs/build-static-api.task';
import { createTaskRunner } from './task-runner';
import { updateGitHubDataTask } from './bestofjs/update-github-data.task';
import { updateBundleSizeTask } from './bestofjs/update-bundle-size.task';
import { updatePackageDataTask } from './bestofjs/update-package-data.task';
import { buildMonthlyRankingsTask } from './bestofjs/build-monthly-rankings.task';
import { triggerMonthlyFinishedTask } from './bestofjs/trigger-monthly-finished.task';
import { buildWeeklyRankingsTask } from './bestofjs/build-weekly-rankings.task';
import { triggerWeeklyFinishedTask } from './bestofjs/trigger-weekly-finished.task';
import { buildDailyDataTask } from './bestofjs/build-daily-data.task';
import { notifyDailyTask } from './bestofjs/notify-daily.task';

// 创建logger实例
const logger = createConsola({
  level: 4, // 设置为debug级别
  formatOptions: {
    colors: true,
    date: true,
  }
});

export interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  cronExpression?: string;
  isEnabled: boolean;
  isDaily: boolean;
  isMonthly: boolean;
  isWeekly: boolean;
  taskType: string;
}

export interface TaskExecution {
  id: string;
  taskDefinitionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
  logs?: string;
  triggeredBy: 'system' | 'manual';
  createdAt: Date;
}

export class CronerScheduler {
  private db: any;
  private runningTasks: Map<string, Promise<any>> = new Map();
  private cronJobs: Map<string, Cron> = new Map();
  private isRunning = false;

  constructor(db: any) {
    this.db = db;
  }

  // 初始化任务定义
  async initializeTaskDefinitions() {
    const defaultTasks: Omit<TaskDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'daily-update',
        description: '每日更新：从GitHub API更新仓库数据，生成静态API',
        cronExpression: '0 2 * * *', // 每天凌晨2点
        isEnabled: true,
        isDaily: true,
        isMonthly: false,
        isWeekly: false,
        taskType: 'daily',
      },
      {
        name: 'monthly-rankings',
        description: '每月排行：生成每月项目排行榜',
        cronExpression: '0 3 1 * *', // 每月1号凌晨3点
        isEnabled: true,
        isDaily: false,
        isMonthly: true,
        isWeekly: false,
        taskType: 'monthly',
      },
      {
        name: 'weekly-rankings',
        description: '每周排行：生成每周项目排行榜',
        cronExpression: '0 3 * * 1', // 每周一凌晨3点
        isEnabled: true,
        isDaily: false,
        isMonthly: false,
        isWeekly: true,
        taskType: 'weekly',
      },
      {
        name: 'process-repo-assets',
        description: '处理仓库资源：下载图标、翻译内容、上传Open Graph图片',
        cronExpression: '0 4 * * *', // 每天凌晨4点
        isEnabled: true,
        isDaily: true,
        isMonthly: false,
        isWeekly: false,
        taskType: 'daily',
      },
    ];

    for (const task of defaultTasks) {
      const existing = await this.db
        .select()
        .from(schema.taskDefinitions)
        .where(eq(schema.taskDefinitions.name, task.name))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(schema.taskDefinitions).values({
          id: crypto.randomUUID(),
          ...task,
        });
        logger.info(`Created task definition: ${task.name}`);
      }
    }
  }

  // 启动定时任务调度器
  async start() {
    if (this.isRunning) {
      logger.warn('Croner scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting croner scheduler...');

    // 初始化任务定义
    await this.initializeTaskDefinitions();

    // 获取所有启用的任务
    const tasks = await this.getTaskDefinitions();
    const enabledTasks = tasks.filter(task => task.isEnabled && task.cronExpression);

    // 为每个任务创建 cron job
    for (const task of enabledTasks) {
      this.scheduleTask(task);
    }

    logger.info(`Croner scheduler started with ${enabledTasks.length} tasks`);
  }

  // 停止定时任务调度器
  stop() {
    if (!this.isRunning) {
      logger.warn('Croner scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    // 停止所有 cron jobs
    for (const [taskId, cronJob] of this.cronJobs) {
      cronJob.stop();
      logger.info(`Stopped cron job for task: ${taskId}`);
    }
    this.cronJobs.clear();

    logger.info('Croner scheduler stopped');
  }

  // 为单个任务创建 cron job
  private scheduleTask(task: TaskDefinition) {
    if (!task.cronExpression) {
      return;
    }

    try {
      // 使用 croner 创建定时任务
      const cronJob = new Cron(task.cronExpression, {
        timezone: 'Asia/Shanghai', // 使用中国时区
        maxRuns: Infinity, // 无限运行
        catch: true, // 捕获错误
      }, async () => {
        try {
          logger.info(`Executing scheduled task: ${task.name}`);
          await this.executeTask(task.id, 'system');
          logger.info(`Scheduled task completed: ${task.name}`);
        } catch (error) {
          logger.error(`Scheduled task failed: ${task.name}`, error);
        }
      });

      this.cronJobs.set(task.id, cronJob);
      
      // 更新任务状态中的下次执行时间
      const nextRun = cronJob.nextRun();
      if (nextRun) {
        this.upsertTaskStatus(task.id, {
          nextRunAt: nextRun,
        });
      }

      logger.info(`Scheduled task ${task.name} with cron expression: ${task.cronExpression}`);
      logger.info(`Next run for ${task.name}: ${nextRun?.toISOString()}`);
    } catch (error) {
      logger.error(`Failed to schedule task ${task.name}:`, error);
    }
  }

  // 获取所有任务定义
  async getTaskDefinitions(): Promise<TaskDefinition[]> {
    return await this.db
      .select()
      .from(schema.taskDefinitions)
      .orderBy(desc(schema.taskDefinitions.createdAt));
  }

  // 获取任务状态
  async getTaskStatus(taskDefinitionId: string) {
    const status = await this.db
      .select()
      .from(schema.taskStatus)
      .where(eq(schema.taskStatus.taskDefinitionId, taskDefinitionId))
      .limit(1);
    
    return status[0] || null;
  }

  // 获取任务执行历史
  async getTaskExecutions(taskDefinitionId: string, limit = 10): Promise<TaskExecution[]> {
    return await this.db
      .select()
      .from(schema.taskExecutions)
      .where(eq(schema.taskExecutions.taskDefinitionId, taskDefinitionId))
      .orderBy(desc(schema.taskExecutions.createdAt))
      .limit(limit);
  }

  // 手动执行任务
  async executeTask(taskDefinitionId: string, triggeredBy: 'system' | 'manual' = 'manual') {
    const taskDef = await this.db
      .select()
      .from(schema.taskDefinitions)
      .where(eq(schema.taskDefinitions.id, taskDefinitionId))
      .limit(1);

    if (!taskDef[0]) {
      throw new Error(`Task definition not found: ${taskDefinitionId}`);
    }

    if (!taskDef[0].isEnabled) {
      throw new Error(`Task is disabled: ${taskDef[0].name}`);
    }

    // 检查任务是否正在运行
    const isRunning = this.runningTasks.has(taskDefinitionId);
    if (isRunning) {
      throw new Error(`Task is already running: ${taskDef[0].name}`);
    }

    const executionId = crypto.randomUUID();
    const startTime = new Date();

    // 创建执行记录
    await this.db.insert(schema.taskExecutions).values({
      id: executionId,
      taskDefinitionId,
      status: 'pending',
      triggeredBy,
      createdAt: startTime,
    });

    // 更新任务状态
    await this.upsertTaskStatus(taskDefinitionId, {
      isRunning: true,
      lastRunAt: startTime,
      lastExecutionId: executionId,
    });

    // 执行任务
    const executionPromise = this.runTask(taskDef[0], executionId, startTime);
    this.runningTasks.set(taskDefinitionId, executionPromise);

    try {
      await executionPromise;
    } finally {
      this.runningTasks.delete(taskDefinitionId);
    }

    return executionId;
  }

  // 停止任务
  async stopTask(taskDefinitionId: string) {
    const isRunning = this.runningTasks.has(taskDefinitionId);
    if (!isRunning) {
      throw new Error('Task is not running');
    }

    // 更新执行记录状态
    const status = await this.getTaskStatus(taskDefinitionId);
    if (status?.lastExecutionId) {
      await this.db
        .update(schema.taskExecutions)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
        })
        .where(eq(schema.taskExecutions.id, status.lastExecutionId));
    }

    // 更新任务状态
    await this.upsertTaskStatus(taskDefinitionId, {
      isRunning: false,
    });

    // 从运行中任务列表中移除
    this.runningTasks.delete(taskDefinitionId);

    logger.info(`Task stopped: ${taskDefinitionId}`);
  }

  // 启用/禁用任务
  async toggleTask(taskDefinitionId: string, enabled: boolean) {
    await this.db
      .update(schema.taskDefinitions)
      .set({
        isEnabled: enabled,
        updatedAt: new Date(),
      })
      .where(eq(schema.taskDefinitions.id, taskDefinitionId));

    // 如果启用了任务，重新调度
    if (enabled) {
      const task = await this.db
        .select()
        .from(schema.taskDefinitions)
        .where(eq(schema.taskDefinitions.id, taskDefinitionId))
        .limit(1);

      if (task[0] && task[0].cronExpression) {
        // 停止现有的 cron job
        const existingJob = this.cronJobs.get(taskDefinitionId);
        if (existingJob) {
          existingJob.stop();
          this.cronJobs.delete(taskDefinitionId);
        }

        // 重新调度任务
        this.scheduleTask(task[0]);
      }
    } else {
      // 如果禁用了任务，停止 cron job
      const existingJob = this.cronJobs.get(taskDefinitionId);
      if (existingJob) {
        existingJob.stop();
        this.cronJobs.delete(taskDefinitionId);
      }
    }

    logger.info(`Task ${enabled ? 'enabled' : 'disabled'}: ${taskDefinitionId}`);
  }

  // 私有方法：运行任务
  private async runTask(taskDef: TaskDefinition, executionId: string, startTime: Date) {
    try {
      // 更新执行记录状态为运行中
      await this.db
        .update(schema.taskExecutions)
        .set({
          status: 'running',
          startedAt: startTime,
        })
        .where(eq(schema.taskExecutions.id, executionId));

      logger.info(`Starting task: ${taskDef.name}`);

      let result;
      if (taskDef.isDaily) {
        // 执行每日任务序列
        result = await this.runDailyTasks(taskDef, startTime);
      } else if (taskDef.isMonthly) {
        // 执行每月任务
        const now = new Date();
        result = await this.runMonthlyTasks(taskDef, now.getFullYear(), now.getMonth() + 1);
      } else if (taskDef.isWeekly) {
        // 执行每周任务
        const now = new Date();
        const weekNumber = this.getWeekNumber(now);
        result = await this.runWeeklyTasks(taskDef, now.getFullYear(), weekNumber);
      } else {
        // 执行单个任务
        result = { message: 'Task executed successfully' };
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 更新执行记录为完成
      await this.db
        .update(schema.taskExecutions)
        .set({
          status: 'completed',
          completedAt: endTime,
          duration,
          result: result,
        })
        .where(eq(schema.taskExecutions.id, executionId));

      // 更新任务状态
      await this.upsertTaskStatus(taskDef.id, {
        isRunning: false,
        lastRunAt: endTime,
        lastExecutionId: executionId,
      });

      logger.success(`Task completed: ${taskDef.name} (${duration}ms)`);
      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Task failed: ${taskDef.name}`, error);

      // 更新执行记录为失败
      await this.db
        .update(schema.taskExecutions)
        .set({
          status: 'failed',
          completedAt: endTime,
          duration,
          error: errorMessage,
        })
        .where(eq(schema.taskExecutions.id, executionId));

      // 更新任务状态
      await this.upsertTaskStatus(taskDef.id, {
        isRunning: false,
        lastRunAt: endTime,
        lastExecutionId: executionId,
      });

      throw error;
    }
  }

  // 私有方法：运行每日任务序列
  private async runDailyTasks(taskDef: TaskDefinition, now: Date) {
    logger.info(`Running daily task: ${taskDef.name} for ${now.getFullYear()}-${now.getMonth() + 1}`);
    const results: { task: string; status: string }[] = [];
    const tasks: Task<any>[] = [];

    if(taskDef.name === "process-repo-assets") {
      logger.info(`Running process-repo-assets task sequence`);
      tasks.push(
        updateGitHubDataTask, // 更新GitHub数据
      );
    } else if(taskDef.name === "daily-update") {
      logger.info(`Running daily-update task sequence`);
      tasks.push(
        buildDailyDataTask, // 构建每日数据，包括GitHub数据、贡献者数量、快照记录、数据库记录、webhook回调，每条记录发送一次。
        notifyDailyTask, // 发送每日通知
      );
    } 
    
    if (tasks.length > 0) {
      const runner = createTaskRunner(tasks);
      try {
        const result = await runner.run({
          db: this.db,
          logger: logger,
          dryRun: false,
          limit: undefined,
          skip: 0,
          concurrency: 1,
          throttleInterval: 200,
          logLevel: 4
        });
        logger.success(`Task runner completed successfully`);
        logger.debug(`Task runner result:`, result);
        
        // 记录每个任务的完成状态
        tasks.forEach((task) => {
          results.push({ task: task.name, status: 'completed' });
        });
      } catch (error) {
        logger.error(`Task runner failed:`, error);
        tasks.forEach((task) => {
          results.push({ task: task.name, status: 'failed' });
        });
      }
    } else {
      logger.warn(`No tasks configured for task definition: ${taskDef.name}`);
      results.push({ task: 'no-tasks', status: 'skipped' });
    }

    return results;
  }

  // 私有方法：运行每月任务
  private async runMonthlyTasks(taskDef: TaskDefinition, year: number, month: number) {
    logger.info(`Running monthly task: ${taskDef.name} Build rankings for ${year}-${month}`);
    const results: { task: string; status: string }[] = [];
    const tasks: Task<any>[] = [];

    if(taskDef.name === "monthly-rankings") {
      logger.info(`Running monthly-rankings task sequence`);
      tasks.push(
        buildMonthlyRankingsTask,   // 构件每月排行数据，并将排行数据保存到文件
        triggerMonthlyFinishedTask, // 触发每月排行完成事件，并发送webhook回调
      );
    }

    if (tasks.length > 0) {
      const runner = createTaskRunner(tasks);
      try {
        const result = await runner.run({
          // 共享标志
          dryRun: false,
          limit: undefined,
          skip: 0,
          concurrency: 1,
          throttleInterval: 200,
          // 任务特定标志
          year: year,
          month: month,
        });
        logger.success(`Task runner completed successfully`);
        logger.debug(`Task runner result:`, result);
        
        // 记录每个任务的完成状态
        tasks.forEach((task) => {
          results.push({ task: task.name, status: 'completed' });
        });
      } catch (error) {
        logger.error(`Task runner failed:`, error);
        tasks.forEach((task) => {
          results.push({ task: task.name, status: 'failed' });
        });
      }
    } else {
      logger.warn(`No tasks configured for task definition: ${taskDef.name}`);
      results.push({ task: 'no-tasks', status: 'skipped' });
    }
    return results;
  }

  // 私有方法：运行每周任务
  private async runWeeklyTasks(taskDef: TaskDefinition, year: number, week: number) {
    logger.info(`Running weekly task: ${taskDef.name} Build rankings for ${year}-W${week}`);
    const results: { task: string; status: string }[] = [];
    const tasks: Task<any>[] = [];

    if(taskDef.name === "weekly-rankings") {
      logger.info(`Running weekly-rankings task sequence`);
      tasks.push(
        updateGitHubDataTask, // 更新GitHub数据，包括README内容、Open Graph图片、描述翻译、README翻译、release note翻译
        updateBundleSizeTask, // 更新包大小
        updatePackageDataTask, // 更新包数据
        buildWeeklyRankingsTask, // 构件每周排行数据，并将排行数据保存到文件
        triggerWeeklyFinishedTask, // 触发每周排行完成事件，并发送webhook回调
      );
    }

    if (tasks.length > 0) {
      const runner = createTaskRunner(tasks);
      try {
        const result = await runner.run({
          // 共享标志
          dryRun: false,
          limit: undefined,
          skip: 0,
          concurrency: 1,
          throttleInterval: 200,
          // 任务特定标志
          year: year,
          week: week,
        });
        logger.success(`Task runner completed successfully`);
        logger.debug(`Task runner result:`, result);
        
        // 记录每个任务的完成状态
        tasks.forEach((task) => {
          results.push({ task: task.name, status: 'completed' });
        });
      } catch (error) {
        logger.error(`Task runner failed:`, error);
        tasks.forEach((task) => {
          results.push({ task: task.name, status: 'failed' });
        });
      }
    } else {
      logger.warn(`No tasks configured for task definition: ${taskDef.name}`);
      results.push({ task: 'no-tasks', status: 'skipped' });
    }
    return results;
  }

  // 获取周数
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // 私有方法：更新任务状态
  private async upsertTaskStatus(taskDefinitionId: string, data: any) {
    const existing = await this.db
      .select()
      .from(schema.taskStatus)
      .where(eq(schema.taskStatus.taskDefinitionId, taskDefinitionId))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(schema.taskStatus)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.taskStatus.taskDefinitionId, taskDefinitionId));
    } else {
      await this.db.insert(schema.taskStatus).values({
        id: crypto.randomUUID(),
        taskDefinitionId,
        ...data,
      });
    }
  }

  // 获取正在运行的任务
  getRunningTasks(): string[] {
    return Array.from(this.runningTasks.keys());
  }

  // 获取调度器状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledTasks: Array.from(this.cronJobs.keys()),
      taskCount: this.cronJobs.size,
      runningTasks: this.getRunningTasks(),
    };
  }

  // 重新加载任务配置
  async reloadTasks() {
    logger.info('Reloading task configurations...');
    
    // 停止所有现有的 cron jobs
    for (const [taskId, cronJob] of this.cronJobs) {
      cronJob.stop();
    }
    this.cronJobs.clear();

    // 重新获取任务定义并调度
    const tasks = await this.getTaskDefinitions();
    const enabledTasks = tasks.filter(task => task.isEnabled && task.cronExpression);

    for (const task of enabledTasks) {
      this.scheduleTask(task);
    }

    logger.info(`Reloaded ${enabledTasks.length} tasks`);
  }
} 