import { 
  fetchPackageDependencies, 
  fetchPackageVersions,
  fetchBundleSize,
  fetchMultipleBundleSizes,
  fetchDependencyTreeSize 
} from "./index";

/**
 * 示例：获取React包的依赖信息
 */
async function exampleGetReactDependencies() {
  try {
    console.log("获取React包的依赖信息...");
    const dependencies = await fetchPackageDependencies("react");
    
    console.log(`包名: ${dependencies.name}`);
    console.log(`版本: ${dependencies.version}`);
    console.log(`依赖数量: ${dependencies.dependencies.length}`);
    console.log(`开发依赖数量: ${dependencies.devDependencies.length}`);
    console.log(`对等依赖数量: ${dependencies.peerDependencies.length}`);
    console.log(`可选依赖数量: ${dependencies.optionalDependencies.length}`);
    
    // 显示前5个依赖
    if (dependencies.dependencies.length > 0) {
      console.log("主要依赖:");
      dependencies.dependencies.slice(0, 5).forEach(dep => {
        console.log(`  - ${dep.name}@${dep.version}`);
      });
    }
  } catch (error) {
    console.error("获取依赖信息失败:", error);
  }
}

/**
 * 示例：获取React包的所有版本
 */
async function exampleGetReactVersions() {
  try {
    console.log("获取React包的所有版本...");
    const versions = await fetchPackageVersions("react");
    
    console.log(`总版本数: ${versions.length}`);
    console.log("最新5个版本:");
    versions.slice(-5).forEach(version => {
      console.log(`  - ${version}`);
    });
  } catch (error) {
    console.error("获取版本信息失败:", error);
  }
}

/**
 * 示例：获取React包的bundle size信息
 */
async function exampleGetReactBundleSize() {
  try {
    console.log("获取React包的bundle size信息...");
    const bundleSize = await fetchBundleSize("react");
    
    console.log(`包名: ${bundleSize.name}`);
    console.log(`版本: ${bundleSize.version}`);
    console.log(`大小: ${bundleSize.size} bytes (${(bundleSize.size / 1024).toFixed(2)} KB)`);
    console.log(`Gzip压缩后: ${bundleSize.gzip} bytes (${(bundleSize.gzip / 1024).toFixed(2)} KB)`);
    console.log(`Brotli压缩后: ${bundleSize.brotli} bytes (${(bundleSize.brotli / 1024).toFixed(2)} KB)`);
    console.log(`依赖数量: ${bundleSize.dependencyCount}`);
    console.log(`包含JS: ${bundleSize.hasJS}`);
    console.log(`包含CSS: ${bundleSize.hasCSS}`);
    console.log(`包含Source Map: ${bundleSize.hasMap}`);
  } catch (error) {
    console.error("获取bundle size信息失败:", error);
  }
}

/**
 * 示例：获取多个包的bundle size信息
 */
async function exampleGetMultipleBundleSizes() {
  try {
    console.log("获取多个包的bundle size信息...");
    const packages = ["react", "lodash", "axios"];
    const results = await fetchMultipleBundleSizes(packages);
    
    packages.forEach(pkg => {
      const result = results[pkg];
      if (result) {
        console.log(`${pkg}: ${(result.size / 1024).toFixed(2)} KB (gzip: ${(result.gzip / 1024).toFixed(2)} KB)`);
      } else {
        console.log(`${pkg}: 获取失败`);
      }
    });
  } catch (error) {
    console.error("获取多个包bundle size信息失败:", error);
  }
}

/**
 * 示例：获取React包的依赖树大小信息
 */
async function exampleGetReactDependencyTree() {
  try {
    console.log("获取React包的依赖树大小信息...");
    const treeSize = await fetchDependencyTreeSize("react");
    
    console.log(`主包大小: ${(treeSize.package.size / 1024).toFixed(2)} KB`);
    console.log(`总大小: ${(treeSize.totalSize / 1024).toFixed(2)} KB`);
    console.log(`总Gzip大小: ${(treeSize.totalGzip / 1024).toFixed(2)} KB`);
    console.log(`总Brotli大小: ${(treeSize.totalBrotli / 1024).toFixed(2)} KB`);
    console.log(`依赖包数量: ${Object.keys(treeSize.dependencies).length}`);
    
    // 显示前5个依赖包的大小
    const dependencyEntries = Object.entries(treeSize.dependencies);
    if (dependencyEntries.length > 0) {
      console.log("依赖包大小 (前5个):");
      dependencyEntries.slice(0, 5).forEach(([name, info]) => {
        console.log(`  - ${name}: ${(info.size / 1024).toFixed(2)} KB`);
      });
    }
  } catch (error) {
    console.error("获取依赖树大小信息失败:", error);
  }
}

/**
 * 运行所有示例
 */
export async function runExamples() {
  console.log("=== NPM API 使用示例 ===\n");
  
  await exampleGetReactDependencies();
  console.log("\n" + "=".repeat(50) + "\n");
  
  await exampleGetReactVersions();
  console.log("\n" + "=".repeat(50) + "\n");
  
  await exampleGetReactBundleSize();
  console.log("\n" + "=".repeat(50) + "\n");
  
  await exampleGetMultipleBundleSizes();
  console.log("\n" + "=".repeat(50) + "\n");
  
  await exampleGetReactDependencyTree();
  console.log("\n=== 示例完成 ===");
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  runExamples().catch(console.error);
} 