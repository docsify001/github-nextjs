# 任务管理系统

这个项目实现了一个完整的任务管理系统，包括定时任务调度、任务状态管理和Web界面。

## 功能特性

### 1. 定时任务调度
- **每日任务**: 每天凌晨2点自动执行
  - 从GitHub API更新仓库数据
  - 生成静态API文件 (`projects.json`)
- **每月任务**: 每月1号凌晨3点自动执行
  - 生成每月项目排行榜

### 2. 任务管理界面
- 查看所有任务的状态和历史记录
- 手动执行任务
- 停止正在运行的任务
- 启用/禁用任务

### 3. 任务状态管理
- 实时任务状态跟踪
- 任务执行历史记录
- 错误日志和结果存储

## 数据库结构

### task_definitions (任务定义表)
- `id`: 任务唯一标识
- `name`: 任务名称
- `description`: 任务描述
- `cronExpression`: cron表达式
- `isEnabled`: 是否启用
- `isDaily`: 是否为每日任务
- `isMonthly`: 是否为每月任务
- `taskType`: 任务类型

### task_executions (任务执行记录表)
- `id`: 执行记录唯一标识
- `taskDefinitionId`: 关联的任务定义ID
- `status`: 执行状态 (pending/running/completed/failed/cancelled)
- `startedAt`: 开始时间
- `completedAt`: 完成时间
- `duration`: 执行时长
- `result`: 执行结果
- `error`: 错误信息
- `triggeredBy`: 触发方式 (system/manual)

### task_status (任务状态表)
- `id`: 状态记录唯一标识
- `taskDefinitionId`: 关联的任务定义ID
- `isRunning`: 是否正在运行
- `lastRunAt`: 上次执行时间
- `nextRunAt`: 下次执行时间
- `lastExecutionId`: 上次执行记录ID

## 使用方法

### 1. 启动定时任务调度器

```bash
# 启动定时任务调度器
pnpm run scheduler
```

### 2. 访问任务管理界面

在浏览器中访问 `/tasks` 页面来管理任务。

### 3. API接口

#### 获取任务列表
```http
GET /api/tasks
```

#### 执行任务
```http
POST /api/tasks
Content-Type: application/json

{
  "taskDefinitionId": "task-id",
  "triggeredBy": "manual"
}
```

#### 停止任务
```http
POST /api/tasks/{id}/stop
```

#### 启用/禁用任务
```http
POST /api/tasks/{id}/toggle
Content-Type: application/json

{
  "enabled": true
}
```

## 任务类型

### 每日任务 (daily-update)
- **描述**: 每日更新：从GitHub API更新仓库数据，生成静态API
- **定时**: 每天凌晨2点 (`0 2 * * *`)
- **功能**:
  1. 更新GitHub仓库数据
  2. 生成静态API文件

### 每月任务 (monthly-rankings)
- **描述**: 每月排行：生成每月项目排行榜
- **定时**: 每月1号凌晨3点 (`0 3 1 * *`)
- **功能**:
  1. 生成每月项目排行榜数据

## 开发说明

### 添加新任务

1. 在 `src/lib/tasks/bestofjs/` 目录下创建新的任务文件
2. 使用 `createTask` 函数定义任务
3. 在 `src/lib/tasks/scheduler.ts` 中注册任务
4. 在数据库中创建任务定义记录

### 自定义定时表达式

系统支持标准的cron表达式格式：
```
分钟 小时 日期 月份 星期
```

示例：
- `0 2 * * *` - 每天凌晨2点
- `0 3 1 * *` - 每月1号凌晨3点
- `*/15 * * * *` - 每15分钟
- `0 9-17 * * 1-5` - 工作日上午9点到下午5点

## 监控和日志

- 任务执行日志存储在数据库中
- 控制台输出详细的执行信息
- 支持错误追踪和调试

## 部署说明

1. 确保数据库迁移已执行
2. 启动定时任务调度器
3. 配置环境变量 (POSTGRES_URL等)
4. 部署Web应用

## 故障排除

### 常见问题

1. **任务不执行**
   - 检查任务是否已启用
   - 验证cron表达式格式
   - 查看调度器日志

2. **数据库连接错误**
   - 检查POSTGRES_URL环境变量
   - 确认数据库服务状态

3. **任务执行失败**
   - 查看任务执行记录中的错误信息
   - 检查相关API服务状态 