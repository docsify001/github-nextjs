import debugModule from "debug";

const debug = debugModule("api");

export type DependencyInfo = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

export type PackageInfo = {
  name: string;
  version: string;
  dependencies: DependencyInfo[];
  devDependencies: DependencyInfo[];
  peerDependencies: DependencyInfo[];
  optionalDependencies: DependencyInfo[];
};

/**
 * 获取指定npm包的依赖信息
 * @param packageName 包名
 * @param version 版本号（可选，默认为最新版本）
 * @returns 包的依赖信息
 */
export async function fetchPackageDependencies(
  packageName: string,
  version?: string
): Promise<PackageInfo> {
  const versionParam = version ? `/${version}` : "";
  const url = `https://registry.npmjs.org/${packageName}${versionParam}`;
  
  debug("Fetch dependencies for package", packageName, version || "latest");
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch package info: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 获取最新版本或指定版本的信息
    const versionData = version ? data.versions[version] : data.versions[data["dist-tags"].latest];
    
    if (!versionData) {
      throw new Error(`Version ${version || "latest"} not found for package ${packageName}`);
    }
    
    const result: PackageInfo = {
      name: versionData.name,
      version: versionData.version,
      dependencies: [],
      devDependencies: [],
      peerDependencies: [],
      optionalDependencies: [],
    };
    
    // 处理各种依赖类型
    if (versionData.dependencies) {
      result.dependencies = Object.entries(versionData.dependencies).map(([name, version]) => ({
        name,
        version: version as string,
      }));
    }
    
    if (versionData.devDependencies) {
      result.devDependencies = Object.entries(versionData.devDependencies).map(([name, version]) => ({
        name,
        version: version as string,
      }));
    }
    
    if (versionData.peerDependencies) {
      result.peerDependencies = Object.entries(versionData.peerDependencies).map(([name, version]) => ({
        name,
        version: version as string,
      }));
    }
    
    if (versionData.optionalDependencies) {
      result.optionalDependencies = Object.entries(versionData.optionalDependencies).map(([name, version]) => ({
        name,
        version: version as string,
      }));
    }
    
    return result;
  } catch (error) {
    debug("Error fetching dependencies:", error);
    throw error;
  }
}

/**
 * 获取指定npm包的所有可用版本
 * @param packageName 包名
 * @returns 版本列表
 */
export async function fetchPackageVersions(packageName: string): Promise<string[]> {
  const url = `https://registry.npmjs.org/${packageName}`;
  
  debug("Fetch versions for package", packageName);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch package info: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Object.keys(data.versions);
  } catch (error) {
    debug("Error fetching versions:", error);
    throw error;
  }
} 