# 创建项目时 README 获取与翻译 · 失败记录与重试机制设计

## 1. 目标与范围

- **触发时机**：项目创建成功（含 UI 添加项目、API `POST /api/projects/create`）后，**异步**执行「获取 README + 翻译」流程，不阻塞创建响应。
- **失败可观测**：将每次执行的结果（成功/失败）落库，失败时记录错误信息与时间，便于排查与重试。
- **重试能力**：支持对失败记录进行**手动触发重试**；可选支持定时/自动重试（本设计先实现手动，自动重试可后续扩展）。
- **失败任务列表页**：提供独立页面展示**失败任务列表**，并在页面上提供「重试」操作，便于集中查看与一键重试。

---

## 2. 现状简要

- **项目创建**：`createProject(cleanedUrl, type)` 写入 `repos` + `projects`，随后异步调用 `runUpdateGitHubDataTask(fullProjectData)`。
- **README 与翻译**：`updateGitHubDataTask` 内已实现：
  - `client.fetchRepoReadMeAsMarkdown(full_name)` 获取 README 原文；
  - `translator.translateReadme(readmeContent)` 得到中文；
  - 可选 `processReadMeMd` 处理图片与相对链接；
  - 结果写入 `repos.readme_content`、`repos.readme_content_zh`、`repos.description_zh` 等。
- **缺口**：异步任务失败时仅打日志，无持久化失败记录，也无「按记录重试」或「手动再跑一次」的入口。

---

## 3. 设计概览

| 环节 | 说明 |
|------|------|
| **创建时** | 创建项目后，写入一条「待执行」的 README 同步任务记录，再异步执行现有 README 获取 + 翻译逻辑；成功则更新为成功，失败则更新为失败并写入错误信息。 |
| **存储** | 新增表 `readme_sync_jobs`，按「单次执行」记录状态与错误，并与 `repo_id` 关联。 |
| **重试** | 提供「按 job 重试」与「按 repo 重试」两种方式，均可手动触发；重试时复用同一套 README 获取与翻译逻辑，并更新同一条或新一条 job 记录。 |
| **手动触发** | 提供 API 与 **失败任务列表页**：对指定 repo/项目「立即执行一次 README 同步」；页面上可对失败任务触发重试。 |
| **失败任务列表页** | 独立页面列出所有 `status=failed` 的 job，展示 repo、错误信息、时间等，每行提供「重试」按钮。 |

---

## 4. 数据模型：`readme_sync_jobs`

在 **github-nextjs** 的 Drizzle schema 中新增表（包路径建议：`apps/github-nextjs/src/drizzle/schema/readme-sync-jobs.ts`，并在 `schema/index.ts` 中导出）。

### 4.1 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `text` PK | 主键，如 nanoid/cuid。 |
| `repo_id` | `text` FK → `repos.id` | 关联仓库，便于按 repo 查询与重试。 |
| `status` | `text` enum | `pending` \| `running` \| `success` \| `failed`。 |
| `triggered_by` | `text` | `project_create` \| `manual` \| `retry`，用于区分来源。 |
| `started_at` | `timestamp` | 开始执行时间（进入 running 时写入）。 |
| `completed_at` | `timestamp` | 结束时间（成功或失败时写入）。 |
| `error_message` | `text` | 失败时的错误信息（可截断长度，如 2000 字符）。 |
| `retry_count` | `integer` default 0 | 本 job 被重试的次数（仅统计「同一 job 重试」时递增；若每次重试新建 job 则可为 0）。 |
| `created_at` | `timestamp` | 记录创建时间。 |
| `updated_at` | `timestamp` | 最后更新时间。 |

- **唯一与索引**：不要求 `(repo_id, ...)` 唯一，允许同一 repo 有多条历史记录；建议对 `repo_id`、`status`、`created_at` 建索引，便于「按 repo 查最近一次失败」和「列表筛失败」。

### 4.2 状态流转

- `pending` → 创建后立即写入；异步 worker 取到任务后改为 `running`。
- `running` → 执行完毕改为 `success` 或 `failed`，并写入 `completed_at`、`error_message`（仅 failed）。

---

## 5. 流程说明

### 5.1 项目创建时（异步，不阻塞）

1. 在 **同一事务或紧接** 在 `createProject(cleanedUrl, type)` 之后，插入一条 `readme_sync_jobs`：
   - `repo_id` = 新创建的 repo.id
   - `status` = `pending`
   - `triggered_by` = `project_create`
   - `retry_count` = 0
2. 不等待执行，直接返回创建成功响应。
3. **异步执行**（与现有 `runUpdateGitHubDataTask` 类似）：
   - 将对应 job 置为 `running`，写 `started_at`；
   - 调用现有「获取 README + 翻译 + 写 repos」逻辑（可抽成共享函数，被 create 与重试共用）；
   - 成功：更新 job 为 `success`，写 `completed_at`、`updated_at`；
   - 失败：更新 job 为 `failed`，写 `error_message`（截断）、`completed_at`、`updated_at`。

若希望「创建即入队、由统一 worker 消费」，也可采用「只写 pending，再由定时或事件驱动 worker 扫 pending 执行」；本设计先采用「创建时写 pending 并立即起异步任务」以最少改动落地。

### 5.2 失败记录保存

- 所有「执行结束」的分支（成功/失败）都更新同一条 job 的 `status`、`completed_at`、`updated_at`。
- 仅在 `failed` 时写入 `error_message`；可对内容做长度限制（如 2000 字符）并去掉敏感信息。

### 5.3 手动触发（首次执行或重试）

- **按 repo 触发**：对指定 `repo_id`（或通过 project 解析出 repo_id）「立即执行一次」README 同步。
  - 可选策略 A：**新建一条 job**（`triggered_by=manual` 或 `retry`），再异步执行；便于保留完整历史。
  - 可选策略 B：仅对「最近一条 failed 的 job」重试并更新同一条记录（如将 status 改为 running 再执行）。  
  建议采用 **策略 A**，便于审计与统计。
- **按 job 重试**：对指定 `job_id`（仅当 `status=failed`）重试：
  - 将该 job 的 `status` 改为 `running`，`retry_count += 1`，清空或保留 `error_message`（建议保留直至本次执行结束再覆盖）；
  - 异步执行同一套 README 获取与翻译逻辑；
  - 执行结束后按结果更新为 `success` 或 `failed`。

接口形态建议：

- `POST /api/repos/[repoId]/readme-sync`：对 repo 触发一次同步（新建 job 并执行）。
- `POST /api/readme-sync-jobs/[jobId]/retry`：对失败 job 重试。
- `GET /api/readme-sync-jobs?status=failed`：列出失败任务（用于失败任务列表页）；支持分页（如 `page`、`pageSize`）。

前两个接口均需鉴权，返回 202 Accepted + 新 job 信息或当前 job 信息，实际执行异步进行；列表接口需鉴权，返回 JSON 列表。

### 5.4 与现有 `runUpdateGitHubDataTask` 的关系

- **方案 A（推荐）**：将「单 repo 的 README 获取 + 翻译 + 写 repos」抽成独立函数（如 `runReadmeSyncForRepo(repoId)`），内部完成：拉 README、翻译、写 `repos.readme_content` / `readme_content_zh` 等；  
  - 项目创建时：插入 job → 调用 `runReadmeSyncForRepo(repoId)` 并更新 job 状态；  
  - `runUpdateGitHubDataTask` 仍可保留现有逻辑，若希望「每日全量」也写 job，可再在任务内对每个 repo 调用同一函数并写 job。  
- **方案 B**：不抽函数，仅在项目创建后的异步链路里「先写 job，再调现有 runUpdateGitHubDataTask（仅该 fullName）」，在 task 外部根据 run 结果更新 job 状态（需在 runner 外再包一层以捕获成功/失败）。  

优先建议 **方案 A**，逻辑清晰、便于重试与手动触发复用。

---

## 6. 重试机制（手动）

- **触发方式**：仅支持手动。主要入口为 **失败任务列表页**（见第 8 节）每行的「重试」按钮；也可直接调用 API `POST /api/readme-sync-jobs/[jobId]/retry`。
- **幂等**：同一 job 可多次重试；每次重试要么更新原 job 的 `status/retry_count`，要么新建一条 job（建议新建，便于历史清晰）。
- **并发**：同一 repo 可限制「同时仅有一个 running 的 job」（可选）：在更新为 `running` 时加条件「该 repo 当前无 running」或使用 DB 锁，避免重复拉 README/翻译。
- **限流**：手动触发可加简单限流（如每 repo 每分钟最多 1 次），防止误点或脚本刷接口。

---

## 7. API 与鉴权

- 创建项目：沿用现有 `POST /api/projects/create` 及 UI 的 create 流程，不改动请求/响应结构；仅在其后增加「写 job + 异步执行」。
- `POST /api/repos/[repoId]/readme-sync`：需验证当前用户/服务有权限操作该 repo（如通过 project 归属或 admin）。
- `POST /api/readme-sync-jobs/[jobId]/retry`：需验证该 job 属于当前用户可操作的 repo，且 `status=failed`。
- `GET /api/readme-sync-jobs?status=failed&page=1&pageSize=20`：列出失败任务（用于失败任务列表页），需鉴权。
- 可选：`GET /api/repos/[repoId]/readme-sync-jobs`：列出该 repo 最近 N 条 job，便于项目详情页展示「最近一次失败」并展示「重试」按钮。

---

## 8. 失败任务列表页（UI）

### 8.1 路由与入口

- **路由**：`/protected/readme-sync-failures`（或 `/protected/readme-sync-jobs`，默认展示失败筛选项）。
- **导航**：在 protected 布局的导航（如 Header）中增加入口，例如「README 同步失败」或「失败任务」，指向该页面。

### 8.2 页面内容

- **标题**：如「README 同步失败任务」。
- **列表**：表格或卡片列表，每行一条 **status=failed** 的 `readme_sync_jobs` 记录，包含：
  - **仓库**：repo 的 `owner/name`（通过 `repo_id` 关联查询 `repos` 得到 `full_name` 或 `owner`+`name`）。
  - **触发方式**：`triggered_by`（project_create / manual / retry）的友好文案。
  - **失败时间**：`completed_at` 或 `updated_at`。
  - **错误信息**：`error_message`（可折叠或截断展示，如最多 2 行，点击展开）。
  - **操作**：「重试」按钮。
- **重试**：点击「重试」后调用 `POST /api/readme-sync-jobs/[jobId]/retry`；请求成功后可在当前页刷新列表或乐观更新该行状态（如显示「重试中」），避免重复点击。
- **分页**：若失败数量较多，列表支持分页（与 `GET /api/readme-sync-jobs?status=failed&page=&pageSize=` 对齐）。
- **空状态**：无失败任务时展示「暂无失败任务」。

### 8.3 数据来源

- 列表数据：`GET /api/readme-sync-jobs?status=failed&page=1&pageSize=20`，返回体中需包含每条 job 的 id、repo_id、status、triggered_by、error_message、completed_at、updated_at，以及关联的 **repo 展示信息**（如 full_name 或 owner/name），便于表格展示。

### 8.4 与鉴权一致

- 该页面位于 `protected` 下，仅登录用户可访问；列表与重试 API 使用与现有 protected API 一致的鉴权方式。

---

## 9. 实现清单（确认后编码）

| 序号 | 项目 | 说明 |
|------|------|------|
| 1 | 新增表 `readme_sync_jobs` | Drizzle schema + migration，含 repo_id、status、triggered_by、started_at、completed_at、error_message、retry_count、created_at、updated_at。 |
| 2 | 抽离 `runReadmeSyncForRepo(repoId)` | 从 updateGitHubDataTask 中抽出「单 repo：拉 README、翻译、写 repos」的可复用函数，供创建与重试共用。 |
| 3 | 创建项目后写 job + 异步执行 | 在 create 路由（及 UI 的 createProjectAction 成功后的服务端路径）中，插入 pending job，然后异步执行 `runReadmeSyncForRepo` 并更新 job 状态。 |
| 4 | 失败记录写入 | 执行异常时，将 job 置为 failed，写入 error_message（截断）、completed_at。 |
| 5 | `POST /api/repos/[repoId]/readme-sync` | 对指定 repo 新建 job 并异步执行；鉴权；返回 202 + job 信息。 |
| 6 | `POST /api/readme-sync-jobs/[jobId]/retry` | 仅对 failed 的 job 重试；鉴权；返回 202。 |
| 7 | `GET /api/readme-sync-jobs?status=failed&page=&pageSize=` | 列出失败任务，返回 job 列表及关联 repo 展示信息（如 full_name）；鉴权；支持分页。 |
| 8 | **失败任务列表页** | 路由 `/protected/readme-sync-failures`：表格展示失败 job（仓库、触发方式、失败时间、错误信息），每行「重试」按钮调用 retry API；导航中添加入口。 |
| 9 | 可选 | `GET /api/repos/[repoId]/readme-sync-jobs`；项目详情页展示「README 同步状态」与「重试」按钮。 |

---

## 10. 后续可扩展

- **自动重试**：定时任务扫描 `status=failed` 且 `retry_count < N` 的 job，按退避策略自动重试。
- **更细粒度步骤**：将「获取 README」「翻译」「写库」拆成子步骤，job 记录每步状态，便于定位是拉取失败还是翻译失败。

---

## 11. 参考

- 现有 README/翻译逻辑：`apps/github-nextjs/src/lib/tasks/bestofjs/update-github-data.task.ts`
- 项目创建：`apps/github-nextjs/src/app/api/projects/create/route.ts`、`apps/github-nextjs/src/drizzle/projects/create.ts`
- 翻译与 README 处理：`apps/github-nextjs/src/lib/translate/translator.ts`、`apps/github-nextjs/src/lib/github/process-readme-md.ts`
