# NPM API 模块

这个模块提供了访问npmjs.org的各种功能，包括获取包的下载量、依赖信息和bundle size信息。

## 功能列表

### 1. 月度下载量 (Monthly Downloads)
- `fetchMonthlyDownloads(packageName: string)` - 获取指定包过去12个月的下载量

### 2. 依赖信息 (Dependencies)
- `fetchPackageDependencies(packageName: string, version?: string)` - 获取指定包的依赖信息
- `fetchPackageVersions(packageName: string)` - 获取指定包的所有可用版本

### 3. Bundle Size 信息
- `fetchBundleSize(packageName: string, version?: string)` - 获取指定包的bundle size信息
- `fetchMultipleBundleSizes(packages: string[])` - 批量获取多个包的bundle size信息
- `fetchDependencyTreeSize(packageName: string, version?: string)` - 获取包含依赖树的完整大小信息

## 使用示例

### 获取依赖信息

```typescript
import { fetchPackageDependencies, fetchPackageVersions } from "@bestofjs/api/npm";

// 获取React包的最新版本依赖信息
const reactDeps = await fetchPackageDependencies("react");
console.log(`React ${reactDeps.version} 有 ${reactDeps.dependencies.length} 个依赖`);

// 获取特定版本的依赖信息
const react18Deps = await fetchPackageDependencies("react", "18.2.0");

// 获取所有可用版本
const versions = await fetchPackageVersions("react");
console.log(`React 有 ${versions.length} 个版本`);
```

### 获取Bundle Size信息

```typescript
import { fetchBundleSize, fetchMultipleBundleSizes } from "@bestofjs/api/npm";

// 获取单个包的bundle size
const bundleInfo = await fetchBundleSize("react");
console.log(`React 大小: ${(bundleInfo.size / 1024).toFixed(2)} KB`);
console.log(`Gzip压缩后: ${(bundleInfo.gzip / 1024).toFixed(2)} KB`);

// 批量获取多个包的bundle size
const packages = ["react", "lodash", "axios"];
const results = await fetchMultipleBundleSizes(packages);
Object.entries(results).forEach(([name, info]) => {
  if (info) {
    console.log(`${name}: ${(info.size / 1024).toFixed(2)} KB`);
  }
});
```

### 获取依赖树大小

```typescript
import { fetchDependencyTreeSize } from "@bestofjs/api/npm";

// 获取包含所有依赖的完整大小信息
const treeSize = await fetchDependencyTreeSize("react");
console.log(`主包大小: ${(treeSize.package.size / 1024).toFixed(2)} KB`);
console.log(`总大小(含依赖): ${(treeSize.totalSize / 1024).toFixed(2)} KB`);
console.log(`依赖包数量: ${Object.keys(treeSize.dependencies).length}`);
```

## API 参考

### fetchPackageDependencies

获取指定npm包的依赖信息。

**参数:**
- `packageName: string` - 包名
- `version?: string` - 版本号（可选，默认为最新版本）

**返回:**
```typescript
{
  name: string;
  version: string;
  dependencies: Array<{name: string, version: string}>;
  devDependencies: Array<{name: string, version: string}>;
  peerDependencies: Array<{name: string, version: string}>;
  optionalDependencies: Array<{name: string, version: string}>;
}
```

### fetchBundleSize

获取指定npm包的bundle size信息。

**参数:**
- `packageName: string` - 包名
- `version?: string` - 版本号（可选，默认为最新版本）

**返回:**
```typescript
{
  name: string;
  version: string;
  size: number;           // 原始大小（字节）
  gzip: number;           // Gzip压缩后大小（字节）
  brotli: number;         // Brotli压缩后大小（字节）
  dependencyCount: number; // 依赖数量
  hasJS: boolean;         // 是否包含JS文件
  hasCSS: boolean;        // 是否包含CSS文件
  hasMap: boolean;        // 是否包含Source Map
  files: Array<{          // 文件列表
    name: string;
    size: number;
    gzip: number;
    brotli: number;
    type: "js" | "css" | "map" | "other";
  }>;
}
```

### fetchMultipleBundleSizes

批量获取多个包的bundle size信息。

**参数:**
- `packages: string[]` - 包名数组

**返回:**
```typescript
Record<string, BundleSizeInfo | null>
```

### fetchDependencyTreeSize

获取包含依赖树的完整大小信息。

**参数:**
- `packageName: string` - 包名
- `version?: string` - 版本号（可选，默认为最新版本）

**返回:**
```typescript
{
  package: BundleSizeInfo;
  dependencies: Record<string, BundleSizeInfo>;
  totalSize: number;
  totalGzip: number;
  totalBrotli: number;
}
```

## 错误处理

所有函数都会抛出错误，建议使用 try-catch 进行错误处理：

```typescript
try {
  const deps = await fetchPackageDependencies("non-existent-package");
} catch (error) {
  console.error("获取依赖信息失败:", error.message);
}
```

## 数据源

- **依赖信息**: 来自 npm registry API (`https://registry.npmjs.org/`)
- **Bundle Size**: 来自 Bundlephobia API (`https://bundlephobia.com/api/`)
- **下载量**: 来自 npm downloads API (`https://api.npmjs.org/downloads/`)

## 注意事项

1. 所有API调用都是异步的，需要使用 `await` 或 `.then()`
2. Bundlephobia API可能有请求限制，建议合理控制请求频率
3. 某些包可能没有bundle size信息（如纯Node.js包）
4. 版本号格式支持语义化版本（如 "1.2.3"）或范围（如 "^1.2.3"） 