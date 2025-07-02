# 图片处理功能说明

## 功能概述

`process-readme-md.ts` 模块提供了智能的图片处理功能，能够自动处理README中的图片链接，包括：

1. **HTTP头信息检测文件格式**：通过发送HEAD请求获取图片的Content-Type，确保正确的文件扩展名
2. **缓存机制**：相同URL的图片只上传一次，避免重复处理
3. **多种图片格式支持**：支持PNG、JPEG、GIF、SVG、WebP、ICO、BMP、TIFF等格式
4. **相对路径转换**：自动将相对路径转换为GitHub绝对路径
5. **OSS上传**：将图片上传到阿里云OSS并替换为OSS链接

## 核心功能

### 1. 文件格式检测

```typescript
async function getFileExtensionFromUrl(url: string): Promise<string>
```

- 发送HEAD请求获取Content-Type头信息
- 映射Content-Type到文件扩展名
- 支持多种图片格式的自动识别
- 提供多层fallback机制

**支持的格式映射：**
- `image/png` → `.png`
- `image/jpeg` → `.jpg`
- `image/gif` → `.gif`
- `image/svg+xml` → `.svg`
- `image/webp` → `.webp`
- `image/x-icon` → `.ico`
- `image/bmp` → `.bmp`
- `image/tiff` → `.tiff`

### 2. 缓存机制

```typescript
const processedImageCache = new Map<string, string>();
```

- 使用内存缓存存储已处理的图片URL
- 相同绝对URL返回相同的OSS链接
- 避免重复上传和处理
- 提高处理效率

### 3. 图片处理流程

```typescript
async function processImages(markdown: string, repo: string, branch: string): Promise<string>
```

**处理步骤：**
1. 识别Markdown图片链接：`![alt](url)`
2. 识别HTML图片标签：`<img src="url" />`
3. 转换相对路径为绝对路径
4. 获取文件格式信息
5. 上传到OSS
6. 替换原始链接

### 4. 文件名生成

```typescript
function getFileNameFromUrl(url: string, fileExtension: string): string
```

- 从URL中提取文件名
- 移除现有扩展名
- 添加正确的文件扩展名
- 处理异常情况

## 使用示例

### 基本使用

```typescript
import { processReadMeMd } from "@/lib/github/process-readme-md";

const markdown = `
# 项目标题

![Logo](./logo.png)
![截图](./images/screenshot.jpg)

<img src="./icon.svg" alt="图标" />
`;

const processed = await processReadMeMd(markdown, "owner/repo", "main");
```

### 测试功能

```bash
# 运行图片处理测试
npm run test-image-processing
```

## 错误处理

### 网络错误
- HTTP请求失败时使用URL中的扩展名作为fallback
- 如果URL中也没有扩展名，使用默认的`.png`

### 格式检测失败
- 优先使用HTTP头信息
- 其次使用URL中的扩展名
- 最后使用默认格式

### 上传失败
- 记录错误日志
- 保持原始链接不变
- 不影响其他图片的处理

## 性能优化

### 1. 缓存策略
- 内存缓存避免重复处理
- 相同URL直接返回缓存结果

### 2. 并发处理
- 支持多个图片同时处理
- 异步上传提高效率

### 3. 错误恢复
- 单个图片失败不影响整体处理
- 提供详细的错误日志

## 配置说明

### 环境变量
确保以下环境变量已配置：
- `ALIYUN_OSS_ACCESS_KEY_ID`
- `ALIYUN_OSS_ACCESS_KEY_SECRET`
- `ALIYUN_OSS_BUCKET`
- `ALIYUN_OSS_REGION`

### OSS路径生成
图片上传到OSS的路径格式：
```
readme-images/{repo}/{filename}
```

## 注意事项

1. **网络依赖**：需要访问GitHub和阿里云OSS
2. **内存使用**：缓存机制会占用一定内存
3. **处理时间**：大量图片可能需要较长时间
4. **错误容忍**：单个图片失败不会影响整体处理

## 扩展性

### 添加新格式支持
在 `getFileExtensionFromUrl` 函数中添加新的Content-Type映射：

```typescript
const extensionMap: Record<string, string> = {
  // 现有映射...
  'image/avif': '.avif',  // 新增AVIF格式
};
```

### 自定义缓存策略
可以修改缓存实现，支持持久化存储或分布式缓存。

### 自定义上传逻辑
可以扩展 `uploadImageToOSS` 函数，支持其他云存储服务。 