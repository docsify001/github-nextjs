/**
 * Webhook回调数据结构定义
 * 用于定义仓库数据更新后的webhook回调格式
 */

export interface RepoWebhookData {
  // 基本信息
  id: string;
  full_name: string;
  name: string;
  owner: string;
  owner_id: number;
  
  // 描述信息
  description?: string | null;
  description_zh?: string | null;
  homepage?: string | null;
  
  // 统计信息
  stars?: number | null;
  forks?: number | null;
  contributor_count?: number | null;
  mentionable_users_count?: number | null;
  watchers_count?: number | null;
  pull_requests_count?: number | null;
  releases_count?: number | null;
  commit_count?: number | null;
  
  // 技术信息
  topics?: string[] | null;
  languages?: any[] | null;
  license_spdx_id?: string | null;
  default_branch?: string | null;
  
  // 时间信息
  created_at: string;
  pushed_at: string;
  last_commit?: string | null;
  added_at: string;
  updated_at: string;
  
  // 状态信息
  archived?: boolean | null;
  
  // 资源信息
  icon_url?: string | null;
  open_graph_image_url?: string | null;
  open_graph_image_oss_url?: string | null;
  uses_custom_open_graph_image?: boolean | null;
  
  // README内容
  readme_content?: string | null;
  readme_content_zh?: string | null;
  
  // Release信息
  latest_release_name?: string | null;
  latest_release_tag_name?: string | null;
  latest_release_published_at?: string | null;
  latest_release_url?: string | null;
  latest_release_description?: string | null;
  latest_release_description_zh?: string | null;
  
  // 处理状态
  processing_status: {
    icon_processed: boolean;
    description_translated: boolean;
    readme_translated: boolean;
    og_image_processed: boolean;
    release_note_translated: boolean;
  };
  
  // 元数据
  meta: {
    task_name: string;
    processed_at: string;
    processing_time_ms: number;
    success: boolean;
    error_message?: string;
  };
}

/**
 * Webhook回调请求格式
 */
export interface RepoWebhookRequest {
  event_type: 'repo_updated';
  timestamp: string;
  data: RepoWebhookData;
}

/**
 * 创建webhook数据对象
 */
export function createRepoWebhookData(
  repo: any,
  processingStatus: RepoWebhookData['processing_status'],
  meta: RepoWebhookData['meta']
): RepoWebhookData {
  return {
    // 基本信息
    id: repo.id,
    full_name: `${repo.owner}/${repo.name}`,
    name: repo.name,
    owner: repo.owner,
    owner_id: repo.owner_id,
    
    // 描述信息
    description: repo.description,
    description_zh: repo.description_zh,
    homepage: repo.homepage,
    
    // 统计信息
    stars: repo.stars,
    forks: repo.forks,
    contributor_count: repo.contributor_count,
    mentionable_users_count: repo.mentionable_users_count,
    watchers_count: repo.watchers_count,
    pull_requests_count: repo.pull_requests_count,
    releases_count: repo.releases_count,
    commit_count: repo.commit_count,
    
    // 技术信息
    topics: repo.topics,
    languages: repo.languages,
    license_spdx_id: repo.license_spdx_id,
    default_branch: repo.default_branch,
    
    // 时间信息
    created_at: repo.created_at?.toISOString(),
    pushed_at: repo.pushed_at?.toISOString(),
    last_commit: repo.last_commit?.toISOString(),
    added_at: repo.added_at?.toISOString(),
    updated_at: repo.updated_at?.toISOString(),
    
    // 状态信息
    archived: repo.archived,
    
    // 资源信息
    icon_url: repo.icon_url,
    open_graph_image_url: repo.open_graph_image_url,
    open_graph_image_oss_url: repo.open_graph_image_oss_url,
    uses_custom_open_graph_image: repo.uses_custom_open_graph_image,
    
    // README内容
    readme_content: repo.readme_content,
    readme_content_zh: repo.readme_content_zh,
    
    // Release信息
    latest_release_name: repo.latest_release_name,
    latest_release_tag_name: repo.latest_release_tag_name,
    latest_release_published_at: repo.latest_release_published_at?.toISOString(),
    latest_release_url: repo.latest_release_url,
    latest_release_description: repo.latest_release_description,
    latest_release_description_zh: repo.latest_release_description_zh,
    
    // 处理状态
    processing_status: processingStatus,
    
    // 元数据
    meta: meta,
  };
}

/**
 * 创建webhook请求对象
 */
export function createRepoWebhookRequest(
  repo: any,
  processingStatus: RepoWebhookData['processing_status'],
  meta: RepoWebhookData['meta']
): RepoWebhookRequest {
  return {
    event_type: 'repo_updated',
    timestamp: new Date().toISOString(),
    data: createRepoWebhookData(repo, processingStatus, meta),
  };
} 