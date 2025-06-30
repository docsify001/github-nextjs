import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// 任务定义表
export const taskDefinitions = pgTable("task_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  cronExpression: text("cron_expression"), // 定时表达式
  isEnabled: boolean("is_enabled").notNull().default(true),
  isDaily: boolean("is_daily").notNull().default(false), // 是否为每日任务
  isMonthly: boolean("is_monthly").notNull().default(false), // 是否为每月任务
  isWeekly: boolean("is_weekly").notNull().default(false), // 是否为每周任务
  taskType: varchar("task_type", { length: 50 }).notNull(), // 任务类型
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// 任务执行记录表
export const taskExecutions = pgTable("task_executions", {
  id: text("id").primaryKey(),
  taskDefinitionId: text("task_definition_id")
    .notNull()
    .references(() => taskDefinitions.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, running, completed, failed, cancelled
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // 执行时长（毫秒）
  result: jsonb("result"), // 执行结果
  error: text("error"), // 错误信息
  logs: text("logs"), // 执行日志
  triggeredBy: varchar("triggered_by", { length: 50 }).notNull().default("system"), // system, manual
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 任务状态表（用于实时状态管理）
export const taskStatus = pgTable("task_status", {
  id: text("id").primaryKey(),
  taskDefinitionId: text("task_definition_id")
    .notNull()
    .unique()
    .references(() => taskDefinitions.id, { onDelete: "cascade" }),
  isRunning: boolean("is_running").notNull().default(false),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  lastExecutionId: text("last_execution_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskDefinitionsRelations = relations(taskDefinitions, ({ many }) => ({
  executions: many(taskExecutions),
  status: many(taskStatus),
}));

export const taskExecutionsRelations = relations(taskExecutions, ({ one }) => ({
  taskDefinition: one(taskDefinitions, {
    fields: [taskExecutions.taskDefinitionId],
    references: [taskDefinitions.id],
  }),
}));

export const taskStatusRelations = relations(taskStatus, ({ one }) => ({
  taskDefinition: one(taskDefinitions, {
    fields: [taskStatus.taskDefinitionId],
    references: [taskDefinitions.id],
  }),
})); 