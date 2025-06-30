# GitHub 字段更新说明

## 概述

根据最新的 `repo-info-query.ts` 中的 GraphQL 查询，我们新增了以下 GitHub 仓库信息字段，并将其保存到数据库并在项目页面上展示。

## 新增字段

### 数据库字段 (repos 表)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| `mentionable_users_count` | integer | 可提及用户数量 |
| `watchers_count` | integer | 关注者数量 |
| `license_spdx_id` | text | 许可证 SPDX ID |
| `pull_requests_count` | integer | 拉取请求数量 |
| `releases_count` | integer | 发布数量 |
| `languages` | jsonb | 编程语言列表 |
| `open_graph_image_url` | text | Open Graph 图片 URL |
| `uses_custom_open_graph_image` | boolean | 是否使用自定义 OG 图片 |
| `latest_release_name` | text | 最新发布名称 |
| `latest_release_tag_name` | text | 最新发布标签名 |
| `latest_release_published_at` | timestamp | 最新发布时间 |
| `latest_release_url` | text | 最新发布 URL |
| `latest_release_description` | text | 最新发布描述 |
| `forks` | integer | Fork 数量 |

### 页面展示

在项目页面的 GitHub Repository 部分，新增信息按以下分类展示：

#### 1. 基础信息 (Basic Information)
- 仓库全名
- 描述
- 主页
- 创建时间
- 最后提交
- 推送时间
- 提交数量
- 贡献者数量

#### 2. 活动与参与度 (Activity & Engagement)
- 可提及用户数量
- 关注者数量
- 拉取请求数量
- 发布数量
- **Fork 数量** (新增)

#### 3. 技术详情 (Technical Details)
- 许可证
- 编程语言

#### 4. 社交媒体与品牌 (Social Media & Branding)
- Open Graph 图片
- 是否使用自定义 OG 图片

#### 5. 最新发布 (Latest Release)
- 发布名称
- 标签名
- 发布时间
- 发布 URL
- 发布描述

## Snapshots 增强功能

### 新增的每日数据字段

在 snapshots 中增加了以下每日数据字段：

| 字段名 | 类型 | 描述 |
|--------|------|------|
| `mentionableUsers` | number | 每日可提及用户数量 |
| `watchers` | number | 每日关注者数量 |
| `pullRequests` | number | 每日拉取请求数量 |
| `releases` | number | 每日发布数量 |
| `forks` | number | 每日 Fork 数量 |

### Snapshots 页面展示

在 ViewSnapshots 组件中新增了以下列：

- **Forks**: 显示最新的 Fork 数量
- **Watchers**: 显示最新的关注者数量
- **PRs**: 显示最新的拉取请求数量
- **Releases**: 显示最新的发布数量

### 数据结构更新

```typescript
// 更新后的 Snapshot 类型
export type Snapshot = YearMonthDay & {
  stars: number;
  mentionableUsers?: number;
  watchers?: number;
  pullRequests?: number;
  releases?: number;
  forks?: number;
};

// 更新后的 MonthSchema
const MonthSchema = z.object({
  month: z.number(),
  snapshots: z.array(
    z.object({
      day: z.number(),
      stars: z.number(),
      mentionableUsers: z.number().optional(),
      watchers: z.number().optional(),
      pullRequests: z.number().optional(),
      releases: z.number().optional(),
      forks: z.number().optional(),
    })
  ),
});
```

## 状态管理

### 功能特性
- **可折叠部分**: 每个信息部分都可以独立展开/折叠
- **全局控制**: 提供"展开全部"和"折叠全部"按钮
- **智能显示**: 只有有数据的部分才会显示
- **响应式设计**: 适配不同屏幕尺寸

### 状态管理 Hook

使用 `useRepoSections` hook 来管理各个部分的展开状态：

```typescript
const { 
  expandedSections, 
  toggleSection, 
  expandAll, 
  collapseAll, 
  isExpanded 
} = useRepoSections();
```

## 数据更新

### 更新任务

`update-github-data.task.ts` 已更新，现在会保存所有新字段：

```typescript
const data = {
  ...githubData,
  stars,
  contributor_count,
  // 映射新字段
  mentionable_users_count: githubData.mentionableUsers_count,
  watchers_count: githubData.watchers_count,
  license_spdx_id: githubData.license_spdxId,
  pull_requests_count: githubData.pullRequests_count,
  releases_count: githubData.releases_count,
  languages: githubData.languages_nodes,
  open_graph_image_url: githubData.openGraphImageUrl,
  uses_custom_open_graph_image: githubData.usesCustomOpenGraphImage,
  latest_release_name: githubData.latestRelease_name,
  latest_release_tag_name: githubData.latestRelease_tagName,
  latest_release_published_at: githubData.latestRelease_publishedAt ? new Date(githubData.latestRelease_publishedAt) : null,
  latest_release_url: githubData.latestRelease_url,
  latest_release_description: githubData.latestRelease_description,
  forks: githubData.forks,
  updatedAt: new Date(),
};
```

### Snapshots 数据更新

`SnapshotsService.addSnapshot` 方法已更新，现在接受额外的数据：

```typescript
async addSnapshot(
  repoId: string,
  stars: number,
  additionalData?: {
    mentionableUsers?: number;
    watchers?: number;
    pullRequests?: number;
    releases?: number;
    forks?: number;
  },
  { year, month, day } = normalizeDate(new Date())
) {
  // ... 实现逻辑
}
```

### 测试

创建了测试 API 端点：
- `/api/test-github-fields`: 验证新字段是否正常工作
- `/api/test-snapshots`: 验证新的 snapshots 数据结构

## 数据库迁移

已创建迁移文件：
- `0002_lovely_gamora.sql`: 添加初始的新字段
- `0003_lethal_tomas.sql`: 添加 forks 字段

## 架构修复

### 问题描述
在实现过程中遇到了运行时错误：
```
<ViewRelatedProjects> is an async Client Component. Only Server Components can be async at the moment.
```

### 解决方案
将数据获取逻辑从客户端组件移到服务器端：

1. **重构 ViewRelatedProjects**: 从异步组件改为同步组件，接受数据作为 props
2. **更新主页面**: 在服务器端获取相关项目数据
3. **传递数据**: 将获取的数据传递给客户端组件

### 修改的文件
- `src/app/protected/projects/[slug]/view-repo.tsx`: 添加 `relatedProjectsData` prop
- `src/app/protected/projects/[slug]/view-related-projects.tsx`: 改为同步组件，接受数据 props
- `src/app/protected/projects/[slug]/page.tsx`: 在服务器端获取相关项目数据

### 架构优势
- **性能优化**: 数据在服务器端获取，减少客户端请求
- **类型安全**: 保持 TypeScript 类型安全
- **用户体验**: 保持交互式状态管理功能

## 使用说明

1. **运行数据库迁移**: 确保新字段已添加到数据库
2. **更新数据**: 运行 `update-github-data` 任务来获取新数据
3. **查看页面**: 访问项目页面查看新的 GitHub 信息展示
4. **查看 Snapshots**: 在 snapshots 页面查看每日数据变化

## 技术栈

- **数据库**: PostgreSQL + Drizzle ORM
- **前端**: React + TypeScript + Tailwind CSS
- **状态管理**: React Hooks
- **图标**: Lucide React
- **组件**: shadcn/ui
- **架构**: Next.js App Router (服务器组件 + 客户端组件) 