# 异常处理系统说明

本项目实现了完整的异常处理系统，确保所有异常都能在页面上优雅地提示用户，并提供相应的解决方案。

## 系统架构

### 1. 异常处理工具 (`src/lib/error/error-handler.ts`)

提供统一的异常处理逻辑，支持多种错误类型：

#### 支持的错误类型
- **API 错误**: 网络连接、认证失败、权限不足、服务器错误等
- **认证错误**: 登录失败、邮箱未验证、请求过于频繁等
- **表单错误**: 输入验证失败、字段错误等
- **文件错误**: 文件过大、文件类型不支持等
- **数据库错误**: 数据已存在、关联数据错误、数据不存在等
- **通用错误**: 未知错误的统一处理

#### 错误信息格式
```typescript
interface ErrorInfo {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### 2. 通知系统 (`src/components/notification.tsx`)

提供用户友好的通知显示：

#### 功能特性
- 支持四种通知类型：成功、错误、警告、信息
- 自动显示和隐藏（默认5秒）
- 支持手动关闭
- 支持操作按钮（如重试、重新登录等）
- 右上角固定位置显示
- 支持多个通知同时显示

#### 使用示例
```javascript
import { useNotification } from '@/components/notification';

function MyComponent() {
  const { addNotification } = useNotification();

  const showSuccess = () => {
    addNotification({
      type: 'success',
      title: '操作成功',
      message: '数据已保存',
    });
  };

  const showError = () => {
    addNotification({
      type: 'error',
      title: '操作失败',
      message: '请稍后重试',
      action: {
        label: '重试',
        onClick: () => window.location.reload(),
      },
    });
  };
}
```

### 3. 错误边界 (`src/components/error-boundary.tsx`)

捕获 React 组件中的未处理异常：

#### 功能特性
- 自动捕获组件渲染错误
- 区分认证错误和一般应用错误
- 提供错误恢复机制
- 支持自定义错误显示

### 4. API 客户端集成 (`src/lib/api/api-client.ts`)

自动处理 API 调用中的异常：

#### 功能特性
- 自动处理 401 认证错误
- 统一错误信息格式
- 自动显示错误通知
- 支持重试机制

## 异常处理流程

### 1. 异常捕获
```javascript
try {
  // 可能出错的操作
  const result = await apiClient.get('/api/data');
} catch (error) {
  // 自动处理异常
  const errorInfo = ErrorHandler.handleGenericError(error, '获取数据');
  addNotification({
    type: errorInfo.type,
    title: errorInfo.title,
    message: errorInfo.message,
    action: errorInfo.action,
  });
}
```

### 2. 错误分类处理
系统会根据错误信息自动分类：

- **网络错误**: 提示检查网络连接，提供重试按钮
- **认证错误**: 提示重新登录，提供登录链接
- **权限错误**: 提示权限不足
- **数据错误**: 提示数据已存在或不存在
- **服务器错误**: 提示稍后重试

### 3. 用户提示
- 错误信息以通知形式显示在右上角
- 提供相应的操作按钮（重试、重新登录等）
- 自动隐藏或手动关闭

## 常见错误处理

### 1. 数据库约束错误
```javascript
// 处理重复键错误
if (error.message.includes('duplicate key')) {
  return {
    type: 'warning',
    title: '数据已存在',
    message: '您要创建的数据已存在，请检查后重试。',
  };
}
```

### 2. 认证错误
```javascript
// 处理登录失败
if (error.message.includes('Invalid login credentials')) {
  return {
    type: 'error',
    title: '登录失败',
    message: '邮箱或密码错误，请检查后重试。',
  };
}
```

### 3. 网络错误
```javascript
// 处理网络连接错误
if (error.name === 'TypeError' && error.message.includes('fetch')) {
  return {
    type: 'error',
    title: '网络连接错误',
    message: '无法连接到服务器，请检查网络连接后重试。',
    action: {
      label: '重试',
      onClick: () => window.location.reload(),
    },
  };
}
```

## 测试异常处理

访问 `/protected/auth-status` 页面可以：

1. **测试 API 认证**: 验证 API 调用的认证功能
2. **测试错误处理**: 故意触发错误，查看错误处理效果
3. **查看通知系统**: 观察不同类型通知的显示效果

## 最佳实践

### 1. 在组件中使用
```javascript
import { useNotification } from '@/components/notification';
import { ErrorHandler } from '@/lib/error/error-handler';

function MyComponent() {
  const { addNotification } = useNotification();

  const handleOperation = async () => {
    try {
      // 执行操作
      const result = await someApiCall();
      
      // 成功通知
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '数据已保存',
      });
    } catch (error) {
      // 错误处理
      const errorInfo = ErrorHandler.handleGenericError(error, '保存数据');
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

### 2. 在 API 路由中使用
```javascript
import { createApiHandler } from '@/lib/error/global-error-handler';

export const POST = createApiHandler(async (request) => {
  // API 逻辑
  const data = await request.json();
  
  // 业务处理
  const result = await processData(data);
  
  return NextResponse.json({ success: true, data: result });
});
```

### 3. 自定义错误处理
```javascript
// 处理特定业务错误
const handleBusinessError = (error) => {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    return {
      type: 'warning',
      title: '余额不足',
      message: '您的账户余额不足，请充值后重试。',
      action: {
        label: '去充值',
        onClick: () => router.push('/recharge'),
      },
    };
  }
  
  return ErrorHandler.handleGenericError(error);
};
```

## 配置选项

### 通知配置
- 默认显示时间：5秒
- 位置：右上角
- 最大显示数量：无限制
- 自动关闭：是

### 错误处理配置
- 自动重试：否（需要手动配置）
- 错误日志：是（控制台输出）
- 用户友好提示：是

## 故障排除

### 常见问题

1. **通知不显示**
   - 检查 NotificationProvider 是否正确包装
   - 确认组件在 protected 布局内

2. **错误处理不生效**
   - 检查错误类型是否被正确识别
   - 确认 ErrorHandler 导入正确

3. **API 错误未捕获**
   - 确认使用 useApiClient 而不是原生 fetch
   - 检查 API 路由是否正确返回错误状态

### 调试方法

1. 查看浏览器控制台错误日志
2. 使用 `/protected/auth-status` 页面测试
3. 检查网络请求的响应状态
4. 查看通知组件的渲染状态 