/**
 * Skill 仓库发现任务（P2 接入）：用 github-queries.ts 的搜索对 GitHub 做增量发现，
 * 新建 type=skill 项目（repo + project），由后续 sync-skill-repos（05:00）负责同步。
 *
 * - 搜索走 GITHUB_ACCESS_TOKEN（REST search API，30 req/min），配 HTTP(S)_PROXY 时经代理。
 * - 每查询只取 stars 排序首页，够降噪；本任务重点是「同一批 TOP 结果中出现的新仓库」。
 * - 完整仓库数据（EXTRA_REPOS）单独 GET /repos/{full_name}（认证 5000 req/h）。
 */

import { nanoid } from "nanoid";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import slugify from "slugify";
import { ProxyAgent } from "undici";
import pThrottle from "p-throttle";

import { createTask } from "@/lib/tasks/task-runner";
import { schema } from "@/drizzle/database";
import { generateProjectDefaultSlug } from "@/drizzle/projects/project-helpers";
import {
  CORE_QUERIES,
  OPENCLAW_QUERIES,
  EXTRA_REPOS,
} from "@/lib/catalog/github-queries";

/** 每次运行执行的搜索集合（core + openclaw 共 12 条，约 12~24 个请求） */
const SEARCH_QUERY_SET = [...CORE_QUERIES, ...OPENCLAW_QUERIES];

const NEW_REPOS_PER_RUN_CAP = 60;

const searchItemSchema = z.object({
  full_name: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  homepage: z.string().nullable(),
  default_branch: z.string().nullable(),
  archived: z.boolean(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  created_at: z.string(),
  pushed_at: z.string(),
  topics: z.array(z.string()).default([]),
  license: z.object({ spdx_id: z.string().nullable() }).nullable().nullable(),
  owner: z.object({ login: z.string(), id: z.number() }),
});

type SearchItem = z.infer<typeof searchItemSchema>;

/** REST 仓库详情（与 create.ts apiResponseSchema 同源，新增 license/forks） */
const repoDetailSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  owner: z.object({ id: z.number(), login: z.string() }),
  homepage: z.string().nullable(),
  default_branch: z.string().nullable(),
  description: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  archived: z.boolean(),
  created_at: z.string(),
  pushed_at: z.string(),
  topics: z.array(z.string()).default([]),
  license: z
    .object({ spdx_id: z.string().nullable() })
    .nullable(),
});

type RepoDetail = z.infer<typeof repoDetailSchema>;

let proxyAgent: ProxyAgent | null = null;
function getProxyAgent(): ProxyAgent | null {
  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (proxy) {
    if (!proxyAgent) proxyAgent = new ProxyAgent(proxy);
    return proxyAgent;
  }
  return null;
}

async function ghFetchJson(url: string): Promise<unknown> {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  const init: RequestInit = {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "n8n-skill-crawler",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `token ${token}` } : {}),
    },
  };
  const dispatcher = getProxyAgent();
  if (dispatcher) Reflect.set(init, "dispatcher", dispatcher);

  const res = await fetch(url, init);
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    throw new Error(`GitHub rate limited (${res.status}); reset at ${reset}`);
  }
  if (!res.ok) {
    throw new Error(
      `GitHub request failed ${res.status} for ${url}: ${(await res.text()).slice(
        0,
        200
      )}`
    );
  }
  return res.json();
}

function searchUrl(query: string, perPage = 100): string {
  return `https://api.github.com/search/repositories?q=${encodeURIComponent(
    query
  )}&sort=stars&order=desc&per_page=${perPage}&page=1`;
}

async function searchRepositories(query: string): Promise<SearchItem[]> {
  const body = (await ghFetchJson(searchUrl(query))) as {
    items?: unknown[];
    message?: string;
  };
  if (!Array.isArray(body.items)) {
    throw new Error(`search "${query}" returned no items: ${body.message ?? ""}`);
  }
  const items: SearchItem[] = [];
  for (const raw of body.items) {
    const parsed = searchItemSchema.safeParse(raw);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

async function fetchRepoDetail(fullName: string): Promise<RepoDetail> {
  const body = await ghFetchJson(`https://api.github.com/repos/${fullName}`);
  return repoDetailSchema.parse(body);
}

function toRepoRow(repo: RepoDetail | SearchItem) {
  const licenseSpdx =
    "license" in repo && repo.license ? repo.license.spdx_id : null;
  const topics = "topics" in repo && Array.isArray(repo.topics) ? repo.topics : [];
  return {
    id: nanoid(),
    owner_id: repo.owner.id,
    owner: repo.owner.login,
    name: repo.name,
    description: repo.description,
    homepage: repo.homepage,
    default_branch: repo.default_branch,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    archived: repo.archived,
    topics,
    license_spdx_id: licenseSpdx,
    created_at: new Date(repo.created_at),
    pushed_at: new Date(repo.pushed_at),
    updated_at: new Date(),
  };
}

export const discoverSkillReposTask = createTask({
  name: "discover-skill-repos",
  description:
    "Discover new skill/MCP/agent repos via GitHub search (github-queries.js) and curated EXTRA_REPOS; create type=skill projects for nightly sync.",
  run: async ({ db, logger }) => {
    if (!process.env.GITHUB_ACCESS_TOKEN?.trim()) {
      logger.warn("GITHUB_ACCESS_TOKEN not set; skipping discovery");
      return {
        data: { skipped: true, reason: "GITHUB_ACCESS_TOKEN not set" },
        meta: { processed: 0, success: 0, failed: 0 },
      };
    }

    // 1. 现有仓库去重表
    const existingRows = await db
      .select({ owner: schema.repos.owner, name: schema.repos.name })
      .from(schema.repos);
    const existing = new Set(
      existingRows.map((r) => `${r.owner}/${r.name}`)
    );
    logger.info(`已存在仓库 ${existing.size} 个`);

    // 2. 收集候选
    const candidates: Array<RepoDetail | SearchItem> = [];
    const throttled = pThrottle({ limit: 15, interval: 60_000, strict: true })(
      (query: string) => searchRepositories(query)
    );

    for (const query of SEARCH_QUERY_SET) {
      try {
        const hits = await throttled(query);
        for (const hit of hits) candidates.push(hit);
      } catch (err) {
        logger.error(`搜索失败: ${query}`, err);
      }
    }

    for (const fullName of EXTRA_REPOS) {
      try {
        const repo = await fetchRepoDetail(fullName);
        candidates.push(repo);
      } catch (err) {
        logger.error(`拉取 EXTRA_REPOS 失败: ${fullName}`, err);
      }
    }

    // 3. 去重 + 入库
    const discovered = new Set<string>();
    for (const repo of candidates) {
      if (discovered.size >= NEW_REPOS_PER_RUN_CAP) break;
      if (existing.has(repo.full_name) || discovered.has(repo.full_name)) continue;
      discovered.add(repo.full_name);
    }

    let inserted = 0;
    let failed = 0;
    for (const fullName of discovered) {
      const repo = candidates.find((c) => c.full_name === fullName);
      if (!repo) continue;
      try {
        const insertedRepo = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(schema.repos)
            .values(toRepoRow(repo))
            .onConflictDoNothing()
            .returning({ id: schema.repos.id });
          if (!created) return null;

          const existingProject = await tx
            .select({ id: schema.projects.id })
            .from(schema.projects)
            .where(
              and(
                eq(schema.projects.repoId, created.id),
                eq(schema.projects.type, "skill")
              )
            )
            .limit(1);
          if (existingProject[0]) return null;

          const slug = generateProjectDefaultSlug(repo.name);
          const purposeSlug = slugify(repo.name).toLowerCase();
          const projectSlug = [slug, purposeSlug].find((s) => s) ?? repo.name;
          await tx
            .insert(schema.projects)
            .values({
              id: nanoid(),
              repoId: created.id,
              owner: repo.owner.login,
              name: repo.name,
              slug: projectSlug,
              description: repo.description || "(No description)",
              url: repo.homepage,
              status: "active",
              type: "skill",
              skillMdPath: "skills",
            })
            .onConflictDoNothing();
          return created.id;
        });

        if (insertedRepo) {
          inserted += 1;
          logger.info(`新发现 skill 仓库: ${fullName}`);
        }
      } catch (err) {
        failed += 1;
        logger.error(`创建 skill 项目失败: ${fullName}`, err);
      }
    }

    return {
      data: {
        queries: SEARCH_QUERY_SET.length,
        candidates: candidates.length,
        existing: existing.size,
        discovered: discovered.size,
        inserted,
        failed,
      },
      meta: {
        processed: discovered.size,
        success: inserted,
        failed,
      },
    };
  },
});