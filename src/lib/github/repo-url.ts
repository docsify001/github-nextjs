/**
 * GitHub 仓库地址解析工具
 *
 * 支持以下常见输入格式（统一归一化为 owner/name）：
 * - 裸格式：owner/repo、owner/repo.git
 * - 完整链接：https://github.com/owner/repo、http://github.com/owner/repo.git
 * - 省略协议：github.com/owner/repo
 * - SSH 格式：git@github.com:owner/repo.git、ssh://git@github.com/owner/repo.git
 * - 携带额外路径/查询/锚点：https://github.com/owner/repo/tree/main
 *
 * 规则：自动去掉结尾的 .git、尾部斜杠、多余路径，只保留 owner/repo。
 */

export interface ParsedGitHubRepo {
  owner: string;
  name: string;
  fullName: string;
  url: string;
}

const SAFE_SEGMENT_RE = /^[a-zA-Z0-9_.-]+$/;

export function parseGithubRepoUrl(input: string): ParsedGitHubRepo | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  let match = raw.match(
    /(?:https?:\/\/|ssh:\/\/[^/]+@)?(?:www\.)?github\.com[/:]([^/\s?#]+)\/([^/\s?#]+)/i
  );

  if (!match) {
    match = raw.match(/^git@github\.com[/:]([^/\s?#]+)\/([^/\s?#]+)/i);
  }

  if (!match) {
    match = raw.match(/^([^/\s?#]+)\/([^/\s?#]+)$/);
  }

  if (!match) return null;

  const owner = match[1].replace(/\/+$/, "");
  const name = match[2].replace(/\.git$/i, "").replace(/\/+$/, "");

  if (!owner || !name) return null;
  if (!SAFE_SEGMENT_RE.test(owner) || !SAFE_SEGMENT_RE.test(name)) return null;

  const fullName = `${owner}/${name}`;
  return {
    owner,
    name,
    fullName,
    url: `https://github.com/${fullName}`,
  };
}

/** 归一化任意 GitHub 仓库输入为 owner/name，无法解析时返回 null */
export function normalizeGithubRepoInput(input: string): string | null {
  const parsed = parseGithubRepoUrl(input);
  return parsed ? parsed.fullName : null;
}