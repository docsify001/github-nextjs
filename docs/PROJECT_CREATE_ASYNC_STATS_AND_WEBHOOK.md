# 创建项目后异步流程：仓库统计入库与 Webhook 同步

## 1. 目标与范围

- **触发时机**：项目创建成功（API `POST /api/projects/create` 或 UI 添加项目）后，在**异步任务**中完成两件事，且顺序固定：
  1. **获取仓库统计数据并入库**：从 GitHub API 拉取该仓库的统计信息（stars、forks、watchers、contributors、releases、commits 等），写入 `repos` 表。
  2. **成功后再同步到 Webhook**：仅当（1）成功后，将**当前项目数据**（含已入库的仓库统计）同步到请求中指定的 **webhook 地址**。
- **不阻塞创建**：上述流程全部异步执行，创建接口/UI 立即返回，不等待统计拉取与 webhook 调用。
- **与现有能力的关系**：
  - **README 同步**（含翻译、失败记录与重试）：仍按 [README_SYNC_DESIGN.md](./README_SYNC_DESIGN.md) 独立执行，可与本流程并行或独立触发，互不依赖。
  - **全量每日任务**（`runUpdateGitHubDataTask`）：仍可用于定时全量更新；创建时的「统计入库 + webhook」采用本设计，保证「先入库、再推送」的明确顺序。

---

## 2. 流程说明

### 2.1 顺序约定

```
创建项目（同步）
    ↓
返回创建成功
    ↓
异步任务启动
    ↓
Step 1: 获取仓库统计数据并写入 repos 表
    ↓
Step 1 成功？
    ├─ 是 → Step 2: 使用当前项目+repo 数据组装 payload，POST 到 webhookUrl
    │         （若未提供 webhookUrl，则跳过 Step 2）
    └─ 否 → 记录日志，不调用 webhook
```

- **Webhook 仅在「统计入库成功」之后调用**，保证接收端拿到的项目数据中已包含最新仓库统计（来自 DB）。
- 若未传 `webhookUrl`，则只执行 Step 1，不发送 webhook。

### 2.2 Step 1：获取仓库统计数据并入库

- **数据来源**：GitHub API（与现有 `createGitHubClient().fetchRepoInfo(fullName)`、`fetchContributorCount(fullName)` 等一致）。
- **写入目标**：当前项目关联的 `repos` 记录。
- **建议写入字段**（与现有 `repos` 表一致）：  
  `stars`、`forks`、`watchers_count`、`contributor_count`、`releases_count`、`commit_count`、`last_commit`、`pushed_at`、`description`、`topics`、`default_branch`、`license_spdx_id` 等可由 GitHub 直接得到的统计与元数据。不强制在本步骤内完成 README、翻译、快照等，由 README 同步与每日任务负责。
- **失败处理**：若拉取或写入失败，**将错误信息入库**（见第 5 节），**不执行 Step 2**（不调用 webhook）。

### 2.3 Step 2：同步项目数据到 Webhook

- **触发条件**：Step 1 成功，且创建请求中提供了 `webhookUrl`（API 请求体中的 `webhookUrl` 字段）。
- **Payload 来源**：从 DB 读取当前项目及其关联的 repo（已含 Step 1 更新后的统计），组装为与现有 [PROJECT_CREATION_API.md](./PROJECT_CREATION_API.md) 一致的 **project.created** 结构（如 `event`、`timestamp`、`data`：id、name、slug、description、fullName、stars、ownerId、homepage、topics、createdAt、pushedAt、lastCommit、contributorCount、packages、bundleSize 等）。
- **调用方式**：与现有 `sendWebhookData(webhookUrl, projectData)` 一致，POST 到 `webhookUrl`。失败时**将错误信息入库**（见第 5 节），便于重试。

### 2.4 与 README 同步、runUpdateGitHubDataTask 的配合

- **README 同步**：创建后仍可独立触发（写入 `readme_sync_jobs` 并异步执行），与「统计入库 + webhook」无先后依赖，可并行。
- **runUpdateGitHubDataTask**：创建后是否再跑全量任务由现有逻辑决定；若跑，其内部也会更新 repo 并可能发 webhook。本设计仅约束「创建时若带了 webhookUrl，则必须先在异步任务中完成统计入库，再调用该 webhook」，与全量任务可并存。
- **建议实现**：创建后触发**一条**异步流水线，顺序为「Step 1 统计入库 → Step 2 若成功且存在 webhookUrl 则发送 webhook」；README 同步继续单独触发，互不阻塞。

---

## 3. 请求与响应（无变更）

- **API**：仍为 `POST /api/projects/create`，请求体含 `githubUrl`、可选 `webhookUrl`、可选 `type`。
- **响应**：创建成功即返回，响应体中可继续提示「统计更新与 webhook 将异步处理」；不等待 Step 1/Step 2 完成。

---

## 4. 实现要点（确认后编码）

| 序号 | 项目 | 说明 |
|------|------|------|
| 1 | **抽离「仅统计入库」函数** | 从现有 GitHub 客户端与 repos 更新逻辑中抽出一个函数，例如 `fetchRepoStatsAndSave(db, repoId)`：根据 repo 查 fullName，调用 fetchRepoInfo + fetchContributorCount，将统计与基础元数据写入该 repo 记录。 |
| 2 | **创建后统一异步流水线** | 创建项目成功后，**先写入一条 project_sync_jobs 记录（pending）**，再启动异步任务：先执行 `fetchRepoStatsAndSave(db, repoId)`；若成功且请求中有 `webhookUrl`，再组装项目数据并 `sendWebhookData`；成功则更新 job 为 success，任一步失败则更新为 failed 并写入 **error_message**（见第 5 节）。 |
| 3 | **API 与 UI** | API 创建时传入的 `webhookUrl` 需传入该异步流水线；UI 创建项目若未来支持填写 webhook，同样传入。若当前仅 API 支持 webhookUrl，则仅 API 侧在异步流水线中执行 Step 2。 |
| 4 | **错误入库与重试** | 见第 5 节。 |

---

## 5. 错误日志入库与重试

### 5.1 目标

- **错误入库**：Step 1（统计入库）或 Step 2（webhook）任一步失败时，将**错误信息写入数据库**，而非仅打日志，便于排查与重试。
- **重试**：支持对失败记录进行**手动重试**（列表展示失败任务，点击重试后重新执行「统计入库 → webhook」）。

### 5.2 数据模型：`project_sync_jobs`

新增表，与 `readme_sync_jobs` 类似，用于记录「统计入库 + webhook」单次执行。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | text PK | 主键。 |
| `project_id` | text FK → projects.id | 关联项目。 |
| `repo_id` | text FK → repos.id | 关联仓库。 |
| `status` | text enum | `pending` \| `running` \| `success` \| `failed`。 |
| `triggered_by` | text | `project_create` \| `retry`。 |
| `webhook_url` | text nullable | 创建时传入的 webhook 地址，重试时沿用。 |
| `error_message` | text | 失败时的错误信息（建议截断，如 2000 字符）。 |
| `started_at` | timestamp | 开始执行时间。 |
| `completed_at` | timestamp | 结束时间。 |
| `retry_count` | integer default 0 | 重试次数。 |
| `created_at` | timestamp | 创建时间。 |
| `updated_at` | timestamp | 更新时间。 |

- 索引：`repo_id`、`status`、`created_at`，便于按失败筛选与列表分页。

### 5.3 流程

- **创建时**：插入一条 `project_sync_jobs`（status=pending，triggered_by=project_create，webhook_url=请求中的 webhookUrl），然后异步执行流水线；执行过程中将 job 置为 running，结束则置为 success 或 failed，**failed 时写入 error_message**。
- **重试**：仅对 `status=failed` 的 job 允许重试；将该 job 置为 running、retry_count+1，使用该 job 记录的 **webhook_url** 重新执行「统计入库 → 若 webhook_url 存在则发送 webhook」；结束同上，更新 status 与 error_message。

### 5.4 接口

- `GET /api/project-sync-jobs?status=failed&page=&pageSize=`：列出失败任务（返回 job 列表及 project/repo 展示信息），鉴权，支持分页。
- `POST /api/project-sync-jobs/[jobId]/retry`：对指定 failed job 重试，鉴权，返回 202。

### 5.5 失败任务列表页（可选）

- 路由示例：`/protected/project-sync-failures`。
- 表格展示失败 job：项目名、仓库、webhook_url、失败时间、error_message，每行「重试」按钮调用上述 retry 接口；空状态「暂无失败任务」。导航中可添加入口「项目同步失败」。

---

## 6. 参考

- README 同步失败与重试（同构设计）：`docs/README_SYNC_DESIGN.md`、表 `readme_sync_jobs`。
- 现有创建与 webhook：`apps/github-nextjs/src/app/api/projects/create/route.ts`（`fetchProjectData`、`sendWebhookData`）。
- 项目创建 API 文档：`docs/PROJECT_CREATION_API.md`。
