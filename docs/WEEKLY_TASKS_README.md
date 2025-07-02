# 周计划任务实现

## 概述

基于现有的月度排名任务，我们实现了完整的周计划任务系统，包括：

1. **周趋势计算函数** - 计算项目在指定周内的星数增长
2. **周排名构建任务** - 生成每周项目排行榜
3. **周排名完成触发任务** - 发送 webhook 通知
4. **调度器支持** - 自动执行周任务

## 文件结构

### 1. 周趋势计算 (`src/drizzle/snapshots/weekly-trends.ts`)

```typescript
// 主要函数
- getWeeklyDelta(snapshots, date) // 获取指定周的星数增长
- getWeekNumber(date) // 获取日期对应的周数
- getWeekStartDate(year, week) // 获取周开始日期
- getWeekEndDate(year, week) // 获取周结束日期
```

### 2. 周排名构建任务 (`src/lib/tasks/bestofjs/build-weekly-rankings.task.ts`)

- 基于月度排名任务修改
- 使用 `getWeeklyDelta` 计算周增长
- 生成 `weekly/{year}/{year}-W{week}.json` 文件
- 包含 trending 和 byRelativeGrowth 两个排行榜

### 3. 周排名完成触发任务 (`src/lib/tasks/bestofjs/trigger-weekly-finished.task.ts`)

- 读取生成的周排名 JSON 文件
- 发送 webhook 到指定地址
- 支持 dry run 模式
- 包含认证 token

### 4. 调度器更新 (`src/lib/tasks/scheduler.ts`)

- 添加 `isWeekly` 字段支持
- 新增 `runWeeklyTasks` 方法
- 配置每周一凌晨3点执行

## 环境变量

需要配置以下环境变量：

```bash
# 周排名 webhook 地址
WEEKLY_WEBHOOK_URL=https://your-webhook-url.com

# 周排名 webhook 认证 token
WEEKLY_WEBHOOK_TOKEN=your-token-here
```

## 数据库更新

添加了 `is_weekly` 字段到 `task_definitions` 表：

```sql
ALTER TABLE "task_definitions" ADD COLUMN "is_weekly" boolean DEFAULT false NOT NULL;
```

## 执行计划

- **频率**: 每周一凌晨3点
- **Cron 表达式**: `0 3 * * 1`
- **任务序列**: 
  1. `build-weekly-rankings` - 构建周排名
  2. `trigger-weekly-finished` - 发送 webhook

## 数据格式

### 生成的 JSON 文件格式

```json
{
  "year": 2024,
  "week": 1,
  "isFirst": false,
  "isLatest": true,
  "trending": [
    {
      "name": "project-name",
      "full_name": "owner/project-name",
      "description": "Project description",
      "stars": 1000,
      "delta": 50,
      "relativeGrowth": 0.05,
      "tags": ["javascript", "react"],
      "owner_id": 123,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "byRelativeGrowth": [...]
}
```

### Webhook 发送的数据格式

```json
{
  "year": 2024,
  "week": 1,
  "projects": [
    {
      "rank": 1,
      "name": "project-name",
      "full_name": "owner/project-name",
      "description": "Project description",
      "stars": 1000,
      "delta": 50,
      "url": "https://github.com/owner/project-name",
      "icon": "https://example.com/icon.png"
    }
  ],
  "total_projects": 50,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 测试

可以使用以下命令测试周任务：

```bash
# 运行测试脚本
npx tsx test-weekly-task.ts

# 或者直接运行任务
npx tsx src/cli.ts run build-weekly-rankings --year 2024 --week 1 --dry-run
npx tsx src/cli.ts run trigger-weekly-finished --year 2024 --week 1 --dry-run
```

## 注意事项

1. 周数计算使用 ISO 8601 标准（周一为每周第一天）
2. 文件保存在 `build/weekly/{year}/` 目录下
3. 支持 dry run 模式进行测试
4. 包含完整的错误处理和日志记录
5. 与现有的月度任务保持一致的接口和格式 