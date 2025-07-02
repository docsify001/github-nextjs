import emojiRegex from "emoji-regex";

export const queryRepoInfo = `query getRepoInfo($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    homepageUrl,
    createdAt
    pushedAt
    updatedAt
    isArchived
    diskUsage
    forkCount
    isArchived
    owner {
      login
      avatarUrl
    }
		stargazers{
      totalCount
    }
    mentionableUsers {
      totalCount
    }
    watchers {
      totalCount
    }
    licenseInfo {
      spdxId
    }
    pullRequests {
      totalCount
    }
    releases {
      totalCount
    }
    languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
      nodes {
        name
      }
    }
    openGraphImageUrl
    usesCustomOpenGraphImage
    latestRelease {
      name
      tagName
      publishedAt
      url
      description
    }       
    repositoryTopics(last: 20) {
      totalCount
      edges {
        node {
          topic {
            name
          }
        }
      }
    }
    ... on Repository {
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 1) {
              totalCount,
              edges {
                node {
                  ... on Commit {
                    committedDate
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

// 安全获取嵌套对象属性的辅助函数
function safeGet<T>(obj: any, path: string[], defaultValue: T): T {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  return current !== null && current !== undefined ? current : defaultValue;
}

// 安全获取数组的辅助函数
function safeGetArray<T>(obj: any, path: string[], defaultValue: T[] = []): T[] {
  const result = safeGet(obj, path, null);
  return Array.isArray(result) ? result : defaultValue;
}

// 安全获取日期的辅助函数
function safeGetDate(obj: any, path: string[], defaultValue: Date = new Date()): Date {
  const dateStr = safeGet(obj, path, null);
  if (!dateStr) return defaultValue;
  try {
    return new Date(dateStr);
  } catch {
    return defaultValue;
  }
}

export function extractRepoInfo(response: any) {
  const repository = response?.repository;
  if (!repository) {
    throw new Error('Repository data not found in response');
  }

  // 安全获取所有属性，提供默认值
  const owner = safeGet(repository, ['owner'], { login: '', avatarUrl: '' });
  const name = safeGet(repository, ['name'], '');
  const description = safeGet(repository, ['description'], '');
  const homepage = safeGet(repository, ['homepageUrl'], '');
  const created_at = safeGetDate(repository, ['createdAt']);
  const pushed_at = safeGetDate(repository, ['pushedAt']);
  
  const stargazers_count = safeGet(repository, ['stargazers', 'totalCount'], 0);
  const topicEdges = safeGetArray(repository, ['repositoryTopics', 'edges']);
  const mentionableUsers_count = safeGet(repository, ['mentionableUsers', 'totalCount'], 0);
  const watchers_count = safeGet(repository, ['watchers', 'totalCount'], 0);
  
  // 安全处理 licenseInfo，可能为 null
  const licenseInfo = safeGet(repository, ['licenseInfo'], null) as any;
  const license_spdxId = licenseInfo?.spdxId || '';
  
  const pullRequests_count = safeGet(repository, ['pullRequests', 'totalCount'], 0);
  const releases_count = safeGet(repository, ['releases', 'totalCount'], 0);
  const languages_nodes = safeGetArray(repository, ['languages', 'nodes']);
  const forkCount = safeGet(repository, ['forkCount'], 0);
  const openGraphImageUrl = safeGet(repository, ['openGraphImageUrl'], '');
  const usesCustomOpenGraphImage = safeGet(repository, ['usesCustomOpenGraphImage'], false);
  
  // 安全处理 latestRelease，可能为 null
  const latestRelease = safeGet(repository, ['latestRelease'], null) as any;
  const latestRelease_name = latestRelease?.name || '';
  const latestRelease_tagName = latestRelease?.tagName || '';
  const latestRelease_publishedAt = latestRelease?.publishedAt || '';
  const latestRelease_url = latestRelease?.url || '';
  const latestRelease_description = latestRelease?.description || '';
  
  const isArchived = safeGet(repository, ['isArchived'], false);
  
  // 安全处理 defaultBranchRef，可能为 null
  const defaultBranchRef = safeGet(repository, ['defaultBranchRef'], null) as any;
  const default_branch = defaultBranchRef?.name || 'main';
  
  // 安全处理 commit 历史，可能为 null
  const commitHistory = safeGet(defaultBranchRef, ['target', 'history'], { totalCount: 0, edges: [] });
  const commit_count = safeGet(commitHistory, ['totalCount'], 0);
  const commitEdges = safeGetArray(commitHistory, ['edges']);

  const topics = topicEdges.map(getTopic);
  const last_commit = commitEdges.length > 0 
    ? safeGetDate(commitEdges[0], ['node', 'committedDate'])
    : new Date();
  const owner_id = extractOwnerIdFromAvatarURL(owner.avatarUrl);
  const full_name = `${owner.login}/${name}`;

  return {
    name,
    full_name,
    owner: owner.login,
    owner_id,
    description: cleanGitHubDescription(description),
    homepage,
    created_at,
    pushed_at,
    default_branch,
    stargazers_count,
    topics,
    archived: isArchived,
    commit_count,
    last_commit,
    mentionableUsers_count,
    watchers_count,
    license_spdxId,
    pullRequests_count,
    releases_count,
    languages_nodes,
    forks: forkCount,
    openGraphImageUrl,
    usesCustomOpenGraphImage,
    latestRelease_name,
    latestRelease_tagName,
    latestRelease_publishedAt,
    latestRelease_url,
    latestRelease_description,
  };
}

const getTopic = (edge: any) => {
  try {
    return edge?.node?.topic?.name || '';
  } catch {
    return '';
  }
};

// TODO: extract the user "short id" from the GraphQL query?
function extractOwnerIdFromAvatarURL(url: string) {
  if (!url) return 0;
  try {
    const re = /\/u\/(.+)\?/;
    const parts = re.exec(url);
    return parseInt(parts?.[1] || "0");
  } catch {
    return 0;
  }
}

function cleanGitHubDescription(description: string) {
  if (!description) description = ""; // some projects return `null` (SocketIO, Handlebars...)
  description = removeGitHubEmojis(description);
  description = removeGenericEmojis(description);
  return description;
}

function removeGitHubEmojis(input: string) {
  if (!input) return "";
  return input.replace(/(:([a-z_\d]+):)/g, "").trim();
}

function removeGenericEmojis(input: string) {
  if (!input) return "";
  return input
    .replace(emojiRegex(), "")
    .replace(new RegExp(String.fromCharCode(65039), "g"), "") // clean weird white chars around emojis (E.g. ChakraUI)
    .trim();
}

function toDate(input: string) {
  if (!input) return new Date();
  try {
    return new Date(input);
  } catch {
    return new Date();
  }
}
