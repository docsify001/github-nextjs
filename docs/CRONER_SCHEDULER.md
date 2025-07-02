# Croner 任务调度器

本项目使用 `croner` 库实现了一个现代化的任务调度系统，适配 Vercel serverless 环境。

## 特性

- ✅ 使用 `croner` 库进行精确的定时任务调度
- ✅ 支持每日、每周、每月任务
- ✅ 适配 Vercel serverless 环境
- ✅ 完整的任务状态管理和执行历史
- ✅ 支持手动执行、启动和关闭任务
- ✅ 优雅的错误处理和异常恢复
- ✅ 实时任务状态监控

## 架构设计

### 1. 核心组件

- **CronerScheduler**: 主要的调度器类，使用 croner 库管理定时任务
- **API 路由**: 提供 RESTful API 接口进行任务管理
- **Vercel Cron Jobs**: 在 serverless 环境中触发定时任务

### 2. 数据库表结构

- `task_definitions`: 任务定义表
- `task_executions`: 任务执行记录表
- `task_status`: 任务状态表

## 任务类型

### 每日任务 (Daily Tasks)

1. **daily-update** (`0 2 * * *`)
   - 每天凌晨2点执行
   - 更新 GitHub 数据，生成静态API
   - 发送每日通知

2. **process-repo-assets** (`0 4 * * *`)
   - 每天凌晨4点执行
   - 处理仓库资源：下载图标、翻译内容、上传 Open Graph 图片

### 每周任务 (Weekly Tasks)

1. **weekly-rankings** (`0 3 * * 1`)
   - 每周一凌晨3点执行
   - 生成每周项目排行榜
   - 更新 GitHub 数据、包大小、包数据

### 每月任务 (Monthly Tasks)

1. **monthly-rankings** (`0 3 1 * *`)
   - 每月1号凌晨3点执行
   - 生成每月项目排行榜

## 使用方法

### 1. 本地开发

```bash
# 启动 croner 调度器
pnpm run croner-scheduler

# 测试调度器功能
pnpm run test-croner-scheduler
```

### 2. 生产环境 (Vercel)

在 Vercel 中，定时任务通过 `vercel.json` 配置的 Cron Jobs 自动触发：

```json
{
  "crons": [
    {
      "path": "/api/croner-scheduler",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/croner-scheduler",
      "schedule": "0 3 1 * *"
    },
    {
      "path": "/api/croner-scheduler",
      "schedule": "0 3 * * 1"
    },
    {
      "path": "/api/croner-scheduler",
      "schedule": "0 4 * * *"
    }
  ]
}
```

### 3. API 接口

#### 获取调度器状态
```http
GET /api/croner-scheduler
```

#### 执行调度器操作
```http
POST /api/croner-scheduler
Content-Type: application/json

{
  "action": "start|stop|reload|execute|toggle",
  "taskId": "task-id", // 可选，用于 execute 和 toggle 操作
  "enabled": true // 可选，用于 toggle 操作
}
```

#### 手动执行任务
```http
POST /api/croner-scheduler/cron
Content-Type: application/json

{
  "taskName": "daily-update"
}
```

### 4. Web 界面

访问 `/protected/tasks` 页面可以：
- 查看所有任务的状态和历史记录
- 手动执行任务
- 停止正在运行的任务
- 启用/禁用任务

## 配置说明

### 环境变量

确保以下环境变量已正确配置：

```env
# 数据库连接
POSTGRES_URL=your_postgres_connection_string

# GitHub API
GITHUB_TOKEN=your_github_token

# 其他必要的环境变量...
```

### 时区设置

调度器使用 `Asia/Shanghai` 时区，确保所有时间计算都基于中国时区。

## 错误处理

### 1. 异常捕获

- 所有任务执行都有完整的错误捕获
- 错误信息会记录到数据库和日志中
- 支持任务重试和恢复机制

### 2. Serverless 环境适配

- 处理冷启动问题
- 优雅处理进程终止信号
- 支持长时间运行的任务

### 3. 监控和日志

- 详细的执行日志记录
- 任务执行状态实时更新
- 支持调试和问题排查

## 开发指南

### 添加新任务

1. 在 `src/lib/tasks/bestofjs/` 目录下创建任务文件
2. 使用 `createTask` 函数定义任务
3. 在 `CronerScheduler` 中注册任务
4. 更新 `vercel.json` 添加对应的 cron 配置

### 自定义定时表达式

支持标准的 cron 表达式格式：

```
分钟 小时 日期 月份 星期
```

示例：
- `0 2 * * *` - 每天凌晨2点
- `0 3 1 * *` - 每月1号凌晨3点
- `0 3 * * 1` - 每周一凌晨3点
- `*/15 * * * *` - 每15分钟

### 测试

```bash
# 运行完整的调度器测试
pnpm run test-croner-scheduler

# 测试特定功能
# 可以修改测试脚本中的参数来测试不同的场景
```

## 故障排除

### 常见问题

1. **任务不执行**
   - 检查任务是否已启用
   - 验证 cron 表达式格式
   - 查看 Vercel 日志

2. **数据库连接错误**
   - 检查 `POSTGRES_URL` 环境变量
   - 确认数据库服务状态

3. **任务执行失败**
   - 查看任务执行记录中的错误信息
   - 检查相关 API 服务状态
   - 验证环境变量配置

### 调试技巧

1. 使用 `pnpm run test-croner-scheduler` 进行本地测试
2. 查看 Vercel 函数日志
3. 检查数据库中的任务执行记录
4. 使用 Web 界面监控任务状态

## 性能优化

1. **并发控制**: 任务执行使用并发限制，避免资源竞争
2. **超时处理**: 设置合理的任务超时时间
3. **资源清理**: 及时清理完成的任务和临时资源
4. **缓存策略**: 合理使用缓存减少重复计算

## 安全考虑

1. **API 认证**: 所有管理接口都需要用户认证
2. **输入验证**: 严格验证所有输入参数
3. **错误信息**: 避免在错误响应中暴露敏感信息
4. **权限控制**: 确保只有授权用户可以管理任务 