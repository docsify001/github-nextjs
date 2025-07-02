# 认证系统说明

本项目实现了完整的用户认证系统，包括页面级认证、API 级认证和全局状态管理，确保 `/protected` 目录下的所有访问路径和 API 接口都需要登录后才能访问。

## 认证机制

### 1. 页面级认证

#### 中间件保护
- 在 `middleware.ts` 中配置了全局中间件
- 所有以 `/protected` 开头的路径都会自动检查用户登录状态
- 未登录用户会被重定向到 `/auth/login` 页面

#### 页面级验证
- 所有 `/protected` 目录下的页面都包含服务器端认证检查
- 使用 Supabase session 验证用户登录状态
- 未登录用户会被重定向到登录页面

#### 客户端认证保护
- 使用 `AuthGuard` 组件包装所有受保护的页面
- 提供统一的认证状态检查和错误处理
- 支持加载状态和错误状态的优雅显示

### 2. API 级认证

#### 认证工具
- 创建了 `src/lib/auth/auth-utils.ts` 认证工具文件
- 提供统一的 API 认证验证功能
- 支持多种认证方式

#### API 客户端
- 创建了 `src/lib/api/api-client.ts` API 客户端
- 统一处理 API 调用和认证错误
- 提供 React Hook 用于组件中的 API 调用
- 自动处理 401 认证错误和其他 HTTP 错误

#### 支持的认证方式

1. **Session 认证**
   - 通过 Supabase session 验证用户登录状态
   - 适用于前端页面发起的 API 请求

2. **API Key 认证**
   - 通过 `x-api-key` 请求头进行认证
   - 使用环境变量 `PROJECT_API_TOKEN` 作为 API key
   - 适用于外部系统调用

3. **Bearer Token 认证**
   - 通过 `Authorization: Bearer <token>` 请求头进行认证
   - 预留了 JWT token 验证接口

#### API 接口保护
以下 API 接口都已添加认证保护：

- `POST /api/repos` - 创建仓库任务
- `POST /api/projects/create` - 创建项目
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 执行任务
- `POST /api/tasks/[id]/stop` - 停止任务
- `POST /api/tasks/[id]/toggle` - 切换任务状态
- `GET /api/scheduler/status` - 获取调度器状态

#### Webhook 接口
- `/api/webhook/*` 接口不需要用户认证
- 这些接口由外部系统调用，用于定时任务

### 3. 状态管理

#### 认证上下文
- 创建了 `src/contexts/auth-context.tsx` 认证上下文
- 提供全局认证状态管理
- 自动监听认证状态变化
- 支持认证状态实时同步

#### 错误处理
- 创建了 `src/components/error-boundary.tsx` 错误边界组件
- 统一处理认证相关错误
- 提供优雅的错误显示和恢复机制
- 区分认证错误和一般应用错误

#### 异常处理系统
- 创建了 `src/lib/error/error-handler.ts` 异常处理工具
- 支持多种错误类型的识别和处理
- 提供统一的错误信息格式
- 自动显示用户友好的错误提示

#### 通知系统
- 创建了 `src/components/notification.tsx` 通知组件
- 支持成功、错误、警告、信息四种通知类型
- 自动显示和隐藏通知
- 支持通知操作按钮

## 使用方法

### 前端页面访问
1. 用户访问任何 `/protected` 路径
2. 中间件自动检查认证状态
3. 如果未登录，自动重定向到登录页面
4. 登录成功后可以正常访问受保护的页面
5. 认证状态实时更新，支持自动刷新

### 组件中使用认证状态
```javascript
import { useAuth } from '@/contexts/auth-context';
import { useApiClient } from '@/lib/api/api-client';
import { useNotification } from '@/components/notification';
import { ErrorHandler } from '@/lib/error/error-handler';

function MyComponent() {
  const { user, loading, error } = useAuth();
  const apiClient = useApiClient();
  const { addNotification } = useNotification();

  // 使用认证状态
  if (loading) return <div>加载中...</div>;
  if (!user) return <div>需要登录</div>;

  // 使用 API 客户端（自动处理错误）
  const handleApiCall = async () => {
    const result = await apiClient.get('/api/tasks');
    if (result.success) {
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '数据获取成功',
      });
    }
  };

  // 手动处理异常
  const handleError = async () => {
    try {
      // 可能出错的操作
      throw new Error('测试错误');
    } catch (error) {
      const errorInfo = ErrorHandler.handleGenericError(error, '测试操作');
      addNotification({
        type: errorInfo.type,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
      });
    }
  };
}
```

### API 调用

#### 使用 Session 认证（推荐）
```javascript
// 前端页面中的 API 调用
const response = await fetch('/api/tasks', {
  method: 'GET',
  // 不需要额外的认证头部，会自动使用 session
});
```

#### 使用 API Key 认证
```javascript
// 外部系统调用
const response = await fetch('/api/projects/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key-here'
  },
  body: JSON.stringify({
    githubUrl: 'https://github.com/owner/repo'
  })
});
```

#### 使用 Bearer Token 认证
```javascript
// 使用 JWT token
const response = await fetch('/api/tasks', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your-jwt-token-here'
  }
});
```

## 环境变量配置

确保以下环境变量已正确配置：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# API Key 配置
PROJECT_API_TOKEN=your-api-token-here
```

## 测试认证功能

访问 `/protected/auth-status` 页面可以：
1. 查看当前用户的认证状态
2. 测试 API 接口的认证功能
3. 了解认证机制的详细说明

## 安全注意事项

1. **API Key 安全**
   - 不要在客户端代码中暴露 API key
   - 定期轮换 API key
   - 使用环境变量存储敏感信息

2. **Session 安全**
   - Supabase 自动处理 session 安全
   - 定期清理过期的 session

3. **HTTPS 部署**
   - 生产环境必须使用 HTTPS
   - 确保所有认证信息在传输过程中加密

## 故障排除

### 常见问题

1. **401 未授权错误**
   - 检查用户是否已登录
   - 验证 API key 是否正确
   - 确认 session 是否有效

2. **重定向循环**
   - 检查中间件配置
   - 确认登录页面路径正确

3. **API 调用失败**
   - 检查请求头格式
   - 验证认证信息
   - 查看服务器日志

### 调试方法

1. 访问 `/protected/auth-status` 页面查看认证状态
2. 检查浏览器开发者工具中的网络请求
3. 查看服务器端日志
4. 使用 Postman 等工具测试 API 接口