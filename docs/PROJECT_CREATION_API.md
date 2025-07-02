# 项目创建API

这个API端点允许根据GitHub URL创建新项目，并异步获取项目数据，然后通过webhook回传。

## 功能特性

### 1. 项目创建
- 根据GitHub URL自动创建项目
- 自动生成项目slug和基本信息
- 支持事务性操作确保数据一致性

### 2. 异步数据获取
- 从GitHub API获取最新项目数据
- 获取贡献者数量
- 获取NPM包信息（如果存在）
- 获取Bundle size数据（如果可用）

### 3. Webhook回传
- 异步发送完整项目数据到指定URL
- 包含所有获取的数据
- 错误处理和重试机制

## API端点

### POST /api/projects/create

#### 请求体
```json
{
  "githubUrl": "https://github.com/owner/repo",
  "webhookUrl": "https://your-webhook-url.com/webhook" // 可选
}
```

#### 响应格式
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "project-id",
      "name": "project-name",
      "slug": "project-slug",
      "status": "created"
    },
    "message": "Project created successfully. Data fetching and webhook delivery are being processed asynchronously.",
    "webhookUrl": "Will be sent asynchronously"
  }
}
```

## Webhook数据格式

如果提供了webhook URL，系统会异步发送以下格式的数据：

```json
{
  "event": "project.created",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "id": "project-id",
    "name": "project-name",
    "slug": "project-slug",
    "description": "Project description",
    "fullName": "owner/repo",
    "stars": 1000,
    "ownerId": 12345,
    "homepage": "https://project-homepage.com",
    "topics": ["javascript", "react"],
    "createdAt": "2020-01-01T00:00:00Z",
    "pushedAt": "2024-01-01T00:00:00Z",
    "lastCommit": "2024-01-01T00:00:00Z",
    "contributorCount": 50,
    "packages": [
      {
        "name": "package-name",
        "version": "1.0.0",
        "downloads": 1000000,
        "dependencies": ["react", "typescript"],
        "deprecated": false
      }
    ],
    "bundleSize": {
      "size": 50000,
      "gzip": 15000
    }
  }
}
```

## 使用示例

### 1. 使用Web界面

访问 `/projects/create` 页面，填写GitHub URL和可选的webhook URL，点击创建按钮。

### 2. 使用curl命令

```bash
curl -X POST http://localhost:3000/api/projects/create \
  -H "Content-Type: application/json" \
  -d '{
    "githubUrl": "https://github.com/facebook/react",
    "webhookUrl": "https://your-webhook-url.com/webhook"
  }'
```

### 3. 使用JavaScript

```javascript
const response = await fetch('/api/projects/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    githubUrl: 'https://github.com/facebook/react',
    webhookUrl: 'https://your-webhook-url.com/webhook'
  }),
});

const data = await response.json();
console.log(data);
```

## 错误处理

### 常见错误

1. **GitHub URL无效**
   ```json
   {
     "success": false,
     "error": "Invalid GitHub URL"
   }
   ```

2. **仓库不存在**
   ```json
   {
     "success": false,
     "error": "Repository not found"
   }
   ```

3. **项目已存在**
   ```json
   {
     "success": false,
     "error": "Project already exists"
   }
   ```

4. **Webhook发送失败**
   - 不会影响项目创建
   - 错误会记录在日志中
   - 不会重试webhook发送

## 数据获取详情

### GitHub数据
- 仓库基本信息（名称、描述、主页等）
- 星标数量
- 创建时间和最后推送时间
- 仓库主题
- 贡献者数量（通过网页抓取）

### NPM数据（如果存在）
- 包版本信息
- 月度下载量
- 依赖列表
- 是否已弃用

### Bundle Size数据（如果可用）
- 包大小（字节）
- Gzip压缩后大小

## 性能考虑

1. **异步处理**: 数据获取和webhook发送都是异步的，不会阻塞API响应
2. **错误隔离**: 单个数据源失败不会影响其他数据获取
3. **超时处理**: 设置了合理的超时时间避免长时间等待
4. **日志记录**: 详细的操作日志便于调试和监控

## 安全考虑

1. **输入验证**: 验证GitHub URL格式
2. **错误信息**: 不暴露敏感信息
3. **Webhook验证**: 建议在webhook接收端验证请求来源
4. **速率限制**: 建议在生产环境中添加速率限制

## 部署说明

1. **环境变量**: 确保设置了 `GITHUB_ACCESS_TOKEN`
2. **数据库**: 确保数据库迁移已执行
3. **网络**: 确保可以访问GitHub API和NPM API

## 监控和日志

- 所有操作都有详细的日志记录
- 可以通过日志监控API使用情况
- Webhook发送状态会记录在日志中
- 错误信息包含详细的上下文信息 