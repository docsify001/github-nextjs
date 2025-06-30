import debugModule from "debug";

const debug = debugModule("api");

export type BundleSizeInfo = {
  name: string;
  version: string;
  size: number;
  gzip: number;
  brotli: number;
  dependencyCount: number;
  hasJS: boolean;
  hasCSS: boolean;
  hasMap: boolean;
  files: BundleFile[];
};

export type BundleFile = {
  name: string;
  size: number;
  gzip: number;
  brotli: number;
  type: "js" | "css" | "map" | "other";
};

/**
 * 获取指定npm包的bundle size信息
 * 使用bundlephobia API来获取包的大小信息
 * @param packageName 包名
 * @param version 版本号（可选，默认为最新版本）
 * @returns bundle size信息
 */
export async function fetchBundleSize(
  packageName: string,
  version?: string
): Promise<BundleSizeInfo> {
  const versionParam = version ? `@${version}` : "";
  const url = `https://bundlephobia.com/api/size?package=${packageName}${versionParam}`;
  
  debug("Fetch bundle size for package", packageName, version || "latest");
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bundle size: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 检查是否有错误信息
    if (data.error) {
      throw new Error(`Bundle size error: ${data.error}`);
    }
    
    const result: BundleSizeInfo = {
      name: data.name,
      version: data.version,
      size: data.size,
      gzip: data.gzip,
      brotli: data.brotli,
      dependencyCount: data.dependencyCount,
      hasJS: data.hasJS,
      hasCSS: data.hasCSS,
      hasMap: data.hasMap,
      files: [],
    };
    
    // 处理文件信息（如果有的话）
    if (data.files && Array.isArray(data.files)) {
      result.files = data.files.map((file: any) => ({
        name: file.name,
        size: file.size,
        gzip: file.gzip,
        brotli: file.brotli,
        type: file.type || "other",
      }));
    }
    
    return result;
  } catch (error) {
    debug("Error fetching bundle size:", error);
    throw error;
  }
}

/**
 * 获取多个包的bundle size信息
 * @param packages 包名数组
 * @returns 多个包的bundle size信息
 */
export async function fetchMultipleBundleSizes(
  packages: string[]
): Promise<Record<string, BundleSizeInfo | null>> {
  const results: Record<string, BundleSizeInfo | null> = {};
  
  // 并发获取所有包的信息
  const promises = packages.map(async (packageName) => {
    try {
      const bundleSize = await fetchBundleSize(packageName);
      return { packageName, bundleSize };
    } catch (error) {
      debug(`Error fetching bundle size for ${packageName}:`, error);
      return { packageName, bundleSize: null };
    }
  });
  
  const resolvedPromises = await Promise.all(promises);
  
  resolvedPromises.forEach(({ packageName, bundleSize }) => {
    results[packageName] = bundleSize;
  });
  
  return results;
}

/**
 * 获取包的依赖树大小信息
 * @param packageName 包名
 * @param version 版本号（可选）
 * @returns 包含依赖树大小的信息
 */
export async function fetchDependencyTreeSize(
  packageName: string,
  version?: string
): Promise<{
  package: BundleSizeInfo;
  dependencies: Record<string, BundleSizeInfo>;
  totalSize: number;
  totalGzip: number;
  totalBrotli: number;
}> {
  const versionParam = version ? `@${version}` : "";
  const url = `https://bundlephobia.com/api/size?package=${packageName}${versionParam}&record=true`;
  
  debug("Fetch dependency tree size for package", packageName, version || "latest");
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dependency tree: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Dependency tree error: ${data.error}`);
    }
    
    const mainPackage: BundleSizeInfo = {
      name: data.name,
      version: data.version,
      size: data.size,
      gzip: data.gzip,
      brotli: data.brotli,
      dependencyCount: data.dependencyCount,
      hasJS: data.hasJS,
      hasCSS: data.hasCSS,
      hasMap: data.hasMap,
      files: data.files || [],
    };
    
    const dependencies: Record<string, BundleSizeInfo> = {};
    let totalSize = data.size;
    let totalGzip = data.gzip;
    let totalBrotli = data.brotli;
    
    // 处理依赖信息
    if (data.dependencySizes && Array.isArray(data.dependencySizes)) {
      data.dependencySizes.forEach((dep: any) => {
        dependencies[dep.name] = {
          name: dep.name,
          version: dep.version || "unknown",
          size: dep.approximateSize,
          gzip: dep.approximateGzipSize || 0,
          brotli: dep.approximateBrotliSize || 0,
          dependencyCount: 0,
          hasJS: true,
          hasCSS: false,
          hasMap: false,
          files: [],
        };
        
        totalSize += dep.approximateSize;
        totalGzip += dep.approximateGzipSize || 0;
        totalBrotli += dep.approximateBrotliSize || 0;
      });
    }
    
    return {
      package: mainPackage,
      dependencies,
      totalSize,
      totalGzip,
      totalBrotli,
    };
  } catch (error) {
    debug("Error fetching dependency tree size:", error);
    throw error;
  }
} 