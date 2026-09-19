/**
 * Skill 同步成果导出接口（pull 通道）。
 * openmcp cron（/api/cron/daily/skills）定时拉取，与实时 push webhook 互为兜底。
 *
 * 鉴权：Authorization: Bearer ${SKILLS_WEBHOOK_TOKEN}（与推送共用同一密钥）。
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/database";
import { exportSyncedSkills } from "@/lib/skill-sync/export-synced-skills";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest): { ok: boolean; reason?: string } {
  const token = process.env.SKILLS_WEBHOOK_TOKEN;
  const auth = request.headers.get("authorization") ?? "";
  if (token?.trim()) {
    if (auth !== `Bearer ${token}`) {
      return { ok: false, reason: "Unauthorized" };
    }
    return { ok: true };
  }
  // 开发环境允许直接访问
  console.warn("[skills-sync/export] SKILLS_WEBHOOK_TOKEN not set; dev access only");
  return { ok: true };
}

export async function GET(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await exportSyncedSkills(db, {
      since: searchParams.get("since") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      includeStats: searchParams.get("includeStats") === "0" ? false : true,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[skills-sync/export]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}