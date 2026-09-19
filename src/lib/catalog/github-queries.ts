/**
 * GitHub 采集查询集 —— 移植自 agent-skills-hub scheduler/jobs.py。
 *
 * 供后续「发现任务」使用（octokit 搜索 + 主仓库/精选仓库拉取）。
 * - CORE_QUERIES：每次同步都跑（10 条）
 * - OPENCLAW_QUERIES：OpenClaw / NanoClaw 生态（6 条）
 * - EXTENDED_QUERIES：周更或全量同步（21 条）
 * - MASTERS_USERS / EXTRA_REPOS：人工维护的关注对象
 */

export const CORE_QUERIES = [
  "mcp-server in:name,topics",
  "claude-mcp in:name,description,topics",
  "model-context-protocol in:name,description,topics",
  "mcp in:topics language:python",
  "mcp in:topics language:typescript",
  "mcp-tool in:name,topics",
  "claude-skill in:name,description,topics",
  "claude-code in:topics",
  "agent-skill in:name,topics",
  "ai-agent-tool in:name,description,topics",
] as const;

export const OPENCLAW_QUERIES = [
  "openclaw in:topics stars:>50",
  "openclaw-skills in:topics",
  "nanoclaw in:topics,name stars:>50",
  "clawdbot in:topics stars:>50",
  "clawhub in:topics",
  "openclaw-plugin in:topics stars:>50",
] as const;

export const EXTENDED_QUERIES = [
  "mcp-plugin in:name,description,topics",
  "claude-code-skill in:name,description,topics",
  "anthropic in:topics language:python",
  "anthropic in:topics language:typescript",
  "agent-tools in:name,description,topics",
  "llm-tool in:name,description,topics",
  "llm-agent in:name,topics stars:>10",
  "ai-tools in:topics stars:>20",
  "codex-skills in:name,description,topics",
  "codex-cli in:name,topics",
  "codex in:topics stars:>100",
  "agent-skills in:topics stars:>50",
  "openai-agent in:name,topics",
  "openai-tool in:name,topics",
  "gemini-agent in:name,topics",
  "gemini-tool in:name,description,topics",
  "youmind in:name,description,topics",
  "youmind-plugin in:name,topics",
  "function-calling in:topics language:python stars:>50",
  "tool-use in:topics language:typescript stars:>50",
  "ai-automation in:topics stars:>20",
] as const;

/** 全量查询集（兼容旧用法） */
export const SEARCH_QUERIES = [
  ...CORE_QUERIES,
  ...OPENCLAW_QUERIES,
  ...EXTENDED_QUERIES,
] as const;

/** 主理人 / 影响者，其仓库始终采集 */
export const MASTERS_USERS = [
  "op7418",
  "zarazhangrui",
  "joeseesun",
  "JimLiu",
  "Panniantong",
  "abczsl520",
] as const;

/** 人工精选仓库，始终收录 */
export const EXTRA_REPOS = [
  "runningZ1/union-search-skill",
  "Panniantong/Agent-Reach",
  "JimLiu/baoyu-skills",
  "joeseesun/yt-search-download",
  "joeseesun/anything-to-notebooklm",
  "joeseesun/skill-publisher",
  "joeseesun/defuddle-skill",
  "joeseesun/qiaomu-x-article-publisher",
  "joeseesun/knowledge-site-creator",
  "joeseesun/qiaomu-music-player-spotify",
  "joeseesun/qiaomu-design-advisor",
  "abczsl520/nodejs-project-arch",
  "abczsl520/openclaw-memory-cn",
  "abczsl520/debug-methodology",
  "abczsl520/bug-audit-skill",
  "abczsl520/codex-review",
  "abczsl520/browser-use-skill",
  "abczsl520/game-quality-gates",
  "NanmiCoder/MediaCrawler",
  "ythx-101/x-tweet-fetcher",
  "cloudflare/skills",
  "teng-lin/agent-fetch",
  "sukilll/great-product-skills",
  "SaladDay/cc-switch-cli",
  "laolin5564/openclaw-wx-echo",
  "JeffLi1993/seo-audit-skill",
] as const;