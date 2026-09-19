# Vercel Cron Jobs 配置指南

本文档说明如何在 Vercel 上配置定时任务，内容基于本项目现有的调度架构（DB 驱动，`/api/croner-scheduler/cron` 为统一触发入口）。

## 1. 架构概览

- Vercel **Cron Jobs** 会按 `vercel.json` 中 `crons` 字段的调度表达式，定时向你的 API 路由发送 `GET` 请求。
- 本项目的统一入口是 `src/app/api/croner-scheduler/cron/route.ts`：
  - `GET`：接收 Vercel Cron 触发，按**北京时间**判断当天要执行哪些任务（每日/周一/每月1号）。
  - `POST`：手动触发指定任务，body 传 `{ "taskName": "daily-update" }` 或 `{ "taskNames": [...] }`。
- 执行状态以数据库为准：`task_definitions`（任务定义）、`task_status`（运行状态）、`task_executions`（执行历史）。与本地 croner 调度器无关，serverless 场景下不该依赖进程内定时器。

当前 `vercel.json`：

```json
{
  "crons": [
    {
      "path": "/api/croner-scheduler/cron",
      "schedule": "0 18 * * *"
    }
  ]
}
```

`0 18 * * *` 表示每天 **UTC 18:00**，即**北京时间次日 02:00**。所有 Vercel cron 表达式都是按 **UTC** 评估的。

## 2. 配置步骤

### 2.1 确认/添加触发路由

`src/app/api/croner-scheduler/cron/route.ts` 已存在，无需新建。若从零开始，需要准备一个接收 `GET` 请求的路由。

### 2.2 在 `vercel.json` 声明 cron

在项目根目录 `vercel.json` 的 `crons` 数组追加条目：

```json
{
  "crons": [
    {
      "path": "/api/croner-scheduler/cron",
      "schedule": "0 18 * * *"
    },
    {
      "path": "/api/croner-scheduler/cron",
      "schedule": "0 6 * * 1"
    }
  ]
}
```

- `schedule` 使用标准 cron 格式 `分 时 日 月 星期`。
- 可以配置多条 schedule 指向同一个入口路由（入口内再按请求时间分流）。
- **备选方式**：在 Vercel Dashboard 的 Project → Cron Jobs 页面添加，Vercel 会自动回写 `vercel.json`。推荐以提交 `vercel.json` 为准，保证配置进版本控制。

### 2.3 设置鉴权密钥 `CRON_SECRET`

路由会校验请求头 `Authorization: Bearer $CRON_SECRET`。

- 未设置 `CRON_SECRET` 时会直接放行（仅用于本地调试，生产必须设置）。
- 在 Vercel Dashboard → 项目 → **Settings → Environment Variables** 添加生产环境的 `CRON_SECRET`，填入一段随机字符串：

```bash
openssl rand -hex 32
```

- 部署后该变量会注入到函数进程，Vercel Cron 触发时请求头将由你在 Dashboard Cron Jobs 配置里填写的保护令牌（或自定义 header）携带。保证实际发出的 header 值与 `CRON_SECRET` 一致。

### 2.4 将新任务接入调度（可选）

只有当你要新增一个「任务」（而非单纯换触发时间）时才需要：

1. 在 `src/lib/tasks/bestofjs/` 下用 `createTask` 实现任务（参考 `discover-skill-repos.task.ts`）。
2. 在 `src/lib/tasks/croner-scheduler.ts` 中注册：
   - 在 `initializeTaskDefinitions()` 的 `defaultTasks` 添加定义（含 `cronExpression`）；
   - 在 `runDailyTasks()` / `runMonthlyTasks()` / `runWeeklyTasks()` 的 `name` 分支里 push 对应任务。
3. 在 `src/app/api/croner-scheduler/cron/route.ts` 的 `planTasks()` 中按当天判断是否执行该任务。

### 2.5 部署

- 提交修改后正常部署（生产分支）。Vercel 会在部署完成后自动注册/更新 cron。
- 若使用 Dashboard 方式添加 cron，保存后同样需要等待下次部署生效。
- 注意 cron 只对**指定环境**生效，默认跟随生产分支，与部署环境一致。

## 3. 验证

### 3.1 手动触发测试

本地先起服务（`pnpm dev`），然后用 `CRON_SECRET` 手动触发：

```bash
curl -G http://localhost:3000/api/croner-scheduler/cron \
  -H "Authorization: Bearer ${CRON_SECRET}"

# 或手动触发单个任务
curl -X POST http://localhost:3000/api/croner-scheduler/cron \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"taskName":"discover-skill-repos"}'
```

生产环境把 `localhost:3000` 换成部署域名即可（此时不设置 `Authorization` 头的话需要先取回 `CRON_SECRET` 值）。

### 3.2 观察执行结果

- API 响应的 `data.results` 会列出每个任务的 `status`（completed / disabled / failed / not-found）。
- DB 中核对 `task_executions` 新增记录、`task_status.isRunning` 在下一次运行前恢复为 `false`。
- Vercel Dashboard → Deployments → 对应 Deployment → **Functions/Runtime Logs** 查看函数日志。

## 4. 时区与执行时间

| 需求                    | cron 表达式（UTC） | 北京时间     |
| ----------------------- | ------------------ | ------------ |
| 每天 02:00              | `0 18 * * *`       | 次日 02:00   |
| 每周一 03:00            | `0 19 * * 1`       | 周一 03:00   |
| 每月 1 号 03:00         | `0 19 1 * *`       | 1 号 03:00   |
| 每天 04:00              | `0 20 * * *`       | 次日 04:00   |

- 换算规则：`北京时间 = UTC + 8h`，即表达式小时取「北京时间 − 8」，日期/星期可能跨天，务必注意（如每天 02:00 北京时间是前一天的 18:00 UTC）。
- 路由内部已将触发时间换算为北京时间来判断周几/每月几号（见 `cron/route.ts` 的 `planTasks`），所以你只需保证「触发时刻」正确。

## 5. 计划限制与注意事项

- **套餐限制**：Hobby 计划最多 2 个 cron job，且最小触发间隔为每天 1 次；Pro 及以上支持更多任务与更细粒度（可到每分钟），按调用量计费。以 Vercel 官方文档为准。
- **函数超时**：`cron/route.ts` 声明了 `export const maxDuration = 300`。Hobby/Pro 对函数最大时长限制不同，超时会导致任务中断；耗时任务依赖 DB 记录状态，中断后可在 `/protected/tasks` 查看并手动重跑。
- **不要依赖进程内调度**：serverless 环境函数是无状态的，本项目特意让 Vercel Cron 充当触发器、DB 充当状态源，避免 `croner` 内存任务失效。
- **重复触发**：同一任务同时执行会抛「Task is already running」，`planTasks` 每次只规划一次，正常不会冲突。
- **Vercel Cron 幂等**：Vercel 不保证不重试，路由与任务本身应可重入；任务执行失败不影响其他计划任务（逐个 try/catch）。

## 6. 相关文档

- 调度器实现细节：`docs/CRONER_SCHEDULER.md`
- 任务/执行记录管理：`docs/TASK_MANAGEMENT.md`