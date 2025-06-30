import { aliyunOSSClient } from "@/lib/oss/aliyun-oss";
import { createConsola } from "consola";
const logger = createConsola({ level: 0 });

// 缓存已处理的图片URL，避免重复上传
const processedImageCache = new Map<string, string>();

/**
 * Process the Markdown content of a README file returned by GitHub API to:
 * 1. Upload images to Aliyun OSS and replace URLs
 * 2. Replace relative URLs by absolute URLs
 */
export async function processReadMeMd(md: string, repo: string, branch = "main") {
  const root = `https://github.com/${repo}`;
  let readme = md;

  logger.info(`Processing README for ${repo} (branch: ${branch})`);

  try {
    // STEP 1: Upload images to OSS and replace image URLs
    readme = await processImages(readme, repo, branch);

    // STEP 2: Replace relative anchor link URLs
    // [Quick Start](#quick-start) => [Quick Start](https://github.com/node-inspector/node-inspector#quick-start)
    readme = readme.replace(/<a href="#([^"]+)">/gi, function (_, p1) {
      logger.info("Replace link relative anchors", p1);
      return `<a href="${root}#${p1}">`;
    });

    // STEP 3: Replace links to repository files
    // Example 1: From react-router <a href="/docs">
    // [Guides and API Docs](/docs) => [Guides and API Docs](https://github.com/rackt/react-router/tree/master/docs)
    // Example 2: from acdlite/recompose: <a href="docs">
    readme = readme.replace(/href="\/?(.+?)"/gi, function (match, p1) {
      // If the URL starts with http => do nothing
      if (p1.indexOf("http") === 0) return match;
      logger.info("Replace link relative URL", p1);
      return `href="${root}/blob/${branch}/${p1}"`;
    });

    // STEP 4: Replace Markdown relative URLs to absolute URLs
    // Example: [Self-Hosting Guide](./docs/SELF-HOSTING.md) => [Self-Hosting Guide](https://github.com/user/repo/blob/main/docs/SELF-HOSTING.md)
    readme = readme.replace(/\[([^\]]*)\]\(\.?\/?([^)]+)\)/gi, function (match, p1, p2) {
      // If the URL starts with http => do nothing
      if (p2.indexOf("http") === 0) return match;
      // Skip anchor links (starting with #)
      if (p2.startsWith("#")) return match;
      logger.info("Replace markdown relative URL", p1, p2);
      return `[${p1}](${root}/blob/${branch}/${p2})`;
    });

    return readme;
  } catch (error) {
    logger.info("Error processing README:", error);
    // 如果处理失败，返回原始内容
    return md;
  }
}

/**
 * Process images in markdown content:
 * 1. Find all image URLs (both relative and absolute)
 * 2. Download and upload to Aliyun OSS
 * 3. Replace URLs with OSS URLs
 */
async function processImages(markdown: string, repo: string, branch: string): Promise<string> {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  
  let processedMarkdown = markdown;
  
  // Process markdown image links: ![alt](url)
  processedMarkdown = await processMarkdownImages(processedMarkdown, repo, branch, imageRegex);
  
  // Process HTML img tags: <img src="url" />
  processedMarkdown = await processHtmlImages(processedMarkdown, repo, branch, imgTagRegex);
  
  return processedMarkdown;
}

/**
 * Process markdown image links: ![alt](url)
 */
async function processMarkdownImages(
  markdown: string, 
  repo: string, 
  branch: string, 
  regex: RegExp
): Promise<string> {
  let processedMarkdown = markdown;
  const matches = [...markdown.matchAll(regex)];
  
  for (const match of matches) {
    const [fullMatch, altText, imageUrl] = match;
    
    try {
      const ossUrl = await uploadImageToOSS(imageUrl, repo, branch);
      if (ossUrl) {
        processedMarkdown = processedMarkdown.replace(fullMatch, `![${altText}](${ossUrl})`);
        logger.info(`Uploaded markdown image: ${imageUrl} -> ${ossUrl}`);
      }
    } catch (error) {
      logger.info(`Failed to upload markdown image ${imageUrl}:`, error);
    }
  }
  
  return processedMarkdown;
}

/**
 * Process HTML img tags: <img src="url" />
 */
async function processHtmlImages(
  markdown: string, 
  repo: string, 
  branch: string, 
  regex: RegExp
): Promise<string> {
  let processedMarkdown = markdown;
  const matches = [...markdown.matchAll(regex)];
  
  for (const match of matches) {
    const [fullMatch, imageUrl] = match;
    
    try {
      const ossUrl = await uploadImageToOSS(imageUrl, repo, branch);
      if (ossUrl) {
        processedMarkdown = processedMarkdown.replace(imageUrl, ossUrl);
        logger.info(`Uploaded HTML image: ${imageUrl} -> ${ossUrl}`);
      }
    } catch (error) {
      logger.info(`Failed to upload HTML image ${imageUrl}:`, error);
    }
  }
  
  return processedMarkdown;
}

/**
 * Upload image to Aliyun OSS
 */
async function uploadImageToOSS(imageUrl: string, repo: string, branch: string): Promise<string | null> {
  try {
    // Skip if already an OSS URL
    if (imageUrl.includes('aliyuncs.com') || imageUrl.includes('oss-')) {
      return null;
    }
    
    // Convert relative URL to absolute URL
    const absoluteUrl = getImageAbsoluteUrl(imageUrl, repo, branch);
    
    // Check cache first
    if (processedImageCache.has(absoluteUrl)) {
      logger.info(`Using cached OSS URL for ${absoluteUrl}`);
      return processedImageCache.get(absoluteUrl)!;
    }
    
    // Get file extension from HTTP headers
    const fileExtension = await getFileExtensionFromUrl(absoluteUrl);
    
    // Generate OSS path with correct extension
    const fileName = getFileNameFromUrl(absoluteUrl, fileExtension);
    const ossPath = aliyunOSSClient.generateOSSPath('readme-images', repo, fileName);
    
    // Upload to OSS
    const ossUrl = await aliyunOSSClient.uploadFromUrl(absoluteUrl, ossPath);
    
    // Cache the result
    if (ossUrl) {
      processedImageCache.set(absoluteUrl, ossUrl);
    }
    
    return ossUrl;
  } catch (error) {
    logger.info(`Failed to upload image ${imageUrl} to OSS:`, error);
    return null;
  }
}

/**
 * Get file extension from HTTP headers
 */
async function getFileExtensionFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GitHub-README-Processor/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType) {
      // Map content-type to file extension
      const extensionMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'image/webp': '.webp',
        'image/x-icon': '.ico',
        'image/bmp': '.bmp',
        'image/tiff': '.tiff',
        'image/tiff-fx': '.tiff'
      };
      
      const extension = extensionMap[contentType.toLowerCase().split(';')[0]];
      if (extension) {
        logger.info(`Detected file type from headers: ${contentType} -> ${extension}`);
        return extension;
      }
    }
    
    // Fallback: try to get extension from URL
    const urlExtension = getExtensionFromUrl(url);
    if (urlExtension) {
      logger.info(`Using extension from URL: ${urlExtension}`);
      return urlExtension;
    }
    
    // Default fallback
    logger.info(`No extension detected, using default .png`);
    return '.png';
  } catch (error) {
    logger.info(`Failed to get file extension from headers for ${url}:`, error);
    
    // Fallback: try to get extension from URL
    const urlExtension = getExtensionFromUrl(url);
    if (urlExtension) {
      logger.info(`Using extension from URL as fallback: ${urlExtension}`);
      return urlExtension;
    }
    
    // Default fallback
    logger.info(`Using default .png as fallback`);
    return '.png';
  }
}

/**
 * Extract file extension from URL
 */
function getExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop() || '';
    
    // Check for common image extensions
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff'];
    for (const ext of imageExtensions) {
      if (fileName.toLowerCase().endsWith(ext)) {
        return ext;
      }
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Convert relative image URL to absolute URL
 */
function getImageAbsoluteUrl(url: string, repo: string, branch: string): string {
  // If already absolute, return as is
  if (url.startsWith('http')) {
    return url;
  }
  
  const root = `https://raw.githubusercontent.com/${repo}`;
  
  // Remove leading './' if present
  const cleanPath = url.startsWith('./') ? url.substring(2) : url;
  
  // Add query string for SVG files
  const isSvg = /\.svg$/i.test(url);
  const queryString = isSvg ? "?sanitize=true" : "";
  
  return `${root}/${branch}/${cleanPath}${queryString}`;
}

/**
 * Extract filename from URL with proper extension
 */
function getFileNameFromUrl(url: string, fileExtension: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let fileName = pathname.split('/').pop() || 'image';
    
    // Remove existing extension if present
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff'];
    for (const ext of imageExtensions) {
      if (fileName.toLowerCase().endsWith(ext)) {
        fileName = fileName.substring(0, fileName.length - ext.length);
        break;
      }
    }
    
    // Add the correct extension
    return `${fileName}${fileExtension}`;
  } catch (error) {
    // Fallback for malformed URLs
    let fileName = url.split('/').pop() || 'image';
    
    // Remove existing extension if present
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff'];
    for (const ext of imageExtensions) {
      if (fileName.toLowerCase().endsWith(ext)) {
        fileName = fileName.substring(0, fileName.length - ext.length);
        break;
      }
    }
    
    return `${fileName}${fileExtension}`;
  }
}
