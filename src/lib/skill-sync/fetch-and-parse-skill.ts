/**
 * 从 GitHub 获取 SKILL.md 并解析 frontmatter + content。
 * 设计见 docs/SKILL_REPO_SYNC_DESIGN.md 第 3 节。
 */

import matter from "gray-matter";

const GITHUB_API_BASE = "https://api.github.com";

export interface ParsedSkill {
  name: string;
  description: string;
  version: string | null;
  readme: string;
}

/**
 * 从 GitHub API 获取文件内容（Contents API 返回 base64）。
 */
export async function fetchSkillMd(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string> {
  const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`);
  if (ref) url.searchParams.set("ref", ref);

  const token = process.env.GITHUB_ACCESS_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { content?: string; encoding?: string };
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  if (typeof data.content === "string") {
    return data.content;
  }
  throw new Error("Unexpected GitHub contents response");
}

/**
 * 使用 gray-matter 解析 SKILL.md：frontmatter (name, description, metadata.version) + content 作为 readme。
 */
export function parseSkillMd(raw: string): ParsedSkill {
  const { data: front, content } = matter(raw);

  const name =
    typeof front?.name === "string" ? front.name.trim() : "";
  const description =
    typeof front?.description === "string" ? front.description.trim() : "";
  const version =
    typeof front?.metadata?.version === "string"
      ? front.metadata.version.trim()
      : typeof front?.version === "string"
        ? front.version.trim()
        : null;

  return {
    name: name || "Skill",
    description: description || "",
    version: version || null,
    readme: content?.trim() ?? "",
  };
}
