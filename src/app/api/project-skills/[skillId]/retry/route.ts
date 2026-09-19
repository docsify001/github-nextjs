import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/database";
import { projectSkills } from "@/drizzle/schema";
import { verifyApiAuth } from "@/lib/auth/auth-utils";
import { runSkillSyncForProject } from "@/lib/skill-sync/run-skill-sync-for-project";
import { createConsola } from "consola";

export const dynamic = "force-dynamic";

const logger = createConsola();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { skillId } = await params;
  if (!skillId) {
    return NextResponse.json({ error: "skillId required" }, { status: 400 });
  }

  const [skill] = await db
    .select()
    .from(projectSkills)
    .where(eq(projectSkills.id, skillId))
    .limit(1);

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // 异步重新同步所属项目的全部 skills
  void runSkillSyncForProject(db, skill.projectId, {
    logger: {
      info: (msg, ...args) => logger.info(msg, ...args),
      debug: (msg, ...args) => logger.debug(msg, ...args),
      warn: (msg, ...args) => logger.warn(msg, ...args),
      error: (msg, ...args) => logger.error(msg, ...args),
    },
  })
    .then((result) => {
      logger.info(`Skill retry finished for project ${skill.projectId}`, result);
    })
    .catch((err) => {
      logger.error(`Skill retry failed for project ${skill.projectId}`, err);
    });

  return NextResponse.json(
    {
      message: "Retry started",
      skill_id: skillId,
      project_id: skill.projectId,
    },
    { status: 202 }
  );
}