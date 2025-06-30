# README 处理功能说明

## 概述

本项目实现了完整的README处理功能，包括图片上传到阿里云OSS、链接处理和翻译功能。

## 功能特性

### 1. 图片处理
- **自动上传到OSS**: 将README中的所有图片（包括相对路径和绝对路径）上传到阿里云OSS
- **支持多种格式**: 支持PNG、JPG、SVG、GIF等常见图片格式
- **智能路径处理**: 自动处理相对路径和绝对路径的图片URL
- **SVG特殊处理**: 为SVG文件添加`sanitize=true`参数以确保正确显示

### 2. 链接处理
- **相对链接转换**: 将仓库内的相对链接转换为GitHub绝对链接
- **锚点链接处理**: 正确处理页面内的锚点链接
- **外部链接保持**: 保持外部链接不变
- **HTML标签处理**: 处理HTML img标签中的图片链接

### 3. 翻译功能
- **描述翻译**: 自动翻译项目描述为中文
- **README翻译**: 将英文README翻译为中文
- **智能检测**: 自动检测文本语言，避免重复翻译

## 技术实现

### 核心组件

#### 1. processReadMeMd 函数
```typescript
async function processReadMeMd(md: string, repo: string, branch = "main")
```

**功能**:
- 处理markdown内容中的图片和链接
- 上传图片到阿里云OSS
- 替换相对链接为绝对链接

**处理流程**:
1. 扫描markdown中的图片链接（`![alt](url)`格式）
2. 扫描HTML img标签（`<img src="url">`格式）
3. 下载图片并上传到OSS
4. 替换原始URL为OSS URL
5. 处理相对链接为GitHub绝对链接

#### 2. 图片上传处理
```typescript
async function uploadImageToOSS(imageUrl: string, repo: string, branch: string)
```

**功能**:
- 将相对图片URL转换为GitHub raw URL
- 上传图片到阿里云OSS
- 返回OSS URL

**OSS路径格式**:
```
mcp/repos/{repoName}/readme-images/{timestamp}.{extension}
```

#### 3. 链接处理
- **相对链接**: `/docs` → `https://github.com/owner/repo/blob/main/docs`
- **锚点链接**: `#section` → `https://github.com/owner/repo#section`
- **图片链接**: `images/logo.png` → `OSS_URL`

### 支持的图片格式

| 格式 | 支持情况 | 特殊处理 |
|------|----------|----------|
| PNG | ✅ | 标准处理 |
| JPG/JPEG | ✅ | 标准处理 |
| SVG | ✅ | 添加sanitize参数 |
| GIF | ✅ | 标准处理 |
| WebP | ✅ | 标准处理 |

### 链接处理规则

#### 1. 相对路径图片
```markdown
![Logo](images/logo.png)
```
↓
```markdown
![Logo](https://oss-aliyuncs.com/.../logo.png)
```

#### 2. 绝对路径图片
```markdown
![Logo](https://example.com/logo.png)
```
↓
```markdown
![Logo](https://oss-aliyuncs.com/.../logo.png)
```

#### 3. 相对链接
```markdown
[文档](/docs)
```
↓
```markdown
[文档](https://github.com/owner/repo/blob/main/docs)
```

#### 4. 锚点链接
```markdown
[快速开始](#quick-start)
```
↓
```markdown
[快速开始](https://github.com/owner/repo#quick-start)
```

## 使用方法

### 1. 环境配置

确保配置了以下环境变量：

```bash
# 阿里云OSS配置
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OSS_BUCKET=your_bucket_name
ALIYUN_OSS_REGION=your_region

# 翻译API配置（可选）
TRANSLATE_API_KEY=your_translate_api_key
```

### 2. 运行测试

```bash
# 测试README处理功能
pnpm run test-readme
```

### 3. 自动处理

README处理功能已集成到每日任务中，会自动处理所有仓库的README内容。

### 4. 手动处理

```typescript
import { createGitHubClient } from "@/lib/github/github-api-client";

const client = createGitHubClient();
const readme = await client.fetchRepoReadMeAsMarkdown("owner/repo");
// readme 已经过处理，包含OSS图片URL和绝对链接
```

## 页面展示

### ReadmeViewer 组件

在项目详情页面中，`ReadmeViewer`组件提供以下功能：

- **可折叠界面**: 支持展开/折叠README内容
- **中英文切换**: 支持中英文README切换显示
- **Markdown渲染**: 使用react-markdown进行完整渲染
- **图片预览**: 显示项目图标和Open Graph图片
- **链接处理**: 所有链接在新窗口打开

### 组件特性

- **响应式设计**: 适配不同屏幕尺寸
- **暗色模式支持**: 支持暗色主题
- **代码高亮**: 支持代码块语法高亮
- **图片优化**: 自动调整图片大小和样式

## 错误处理

### 1. 图片上传失败
- 如果图片上传失败，保持原始URL
- 记录错误日志，不影响其他图片处理
- 支持重试机制

### 2. 网络错误
- 处理网络超时和连接错误
- 提供降级方案，返回原始内容
- 记录详细错误信息

### 3. 格式错误
- 处理无效的URL格式
- 处理损坏的图片文件
- 提供默认文件名和扩展名

## 性能优化

### 1. 并发处理
- 图片上传使用并发处理
- 避免阻塞主流程
- 控制并发数量避免API限制

### 2. 缓存机制
- 检查OSS中是否已存在相同图片
- 避免重复上传
- 使用时间戳确保唯一性

### 3. 错误恢复
- 单个图片失败不影响整体处理
- 提供部分成功的结果
- 支持增量处理

## 监控和日志

### 1. 调试日志
```typescript
const debug = debugModule("api:readme:md");
debug("Processing README for", repo);
debug("Uploaded image:", originalUrl, "->", ossUrl);
```

### 2. 处理统计
- 图片上传数量
- 链接处理数量
- 处理时间统计
- 错误率统计

### 3. 性能指标
- 平均处理时间
- 图片上传成功率
- 网络请求延迟

## 未来改进

### 1. 功能增强
- 支持更多图片格式（AVIF、WebP等）
- 图片压缩和优化
- 支持视频文件处理

### 2. 性能优化
- 图片懒加载
- CDN加速
- 智能缓存策略

### 3. 用户体验
- 处理进度显示
- 错误提示优化
- 自定义样式支持 