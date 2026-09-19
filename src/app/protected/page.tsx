import Link from "next/link";
import { redirect } from "next/navigation";
import { count, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/drizzle/database";
import { schema } from "@/drizzle/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Boxes,
  FolderGit2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  AlertOctagon,
  FileWarning,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const TASK_LABELS: Record<string, string> = {
  "daily-update": "每日更新",
  "monthly-rankings": "每月排行",
  "weekly-rankings": "每周排行",
  "process-repo-assets": "仓库资源处理",
  "discover-skill-repos": "Skill 仓库发现",
  "sync-skill-repos": "Skill 仓库同步",
};

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const [reposCount] = await db
    .select({ value: count() })
    .from(schema.repos);
  const [projectsCount] = await db
    .select({ value: count() })
    .from(schema.projects);
  const [skillProjectsCount] = await db
    .select({ value: count() })
    .from(schema.projects)
    .where(eq(schema.projects.type, "skill"));
  const [skillsTotal] = await db
    .select({ value: count() })
    .from(schema.projectSkills);
  const [skillsSynced] = await db
    .select({ value: count() })
    .from(schema.projectSkills)
    .where(isNotNull(schema.projectSkills.syncedToWebAt));
  const [skillsErrors] = await db
    .select({ value: count() })
    .from(schema.projectSkills)
    .where(isNotNull(schema.projectSkills.lastSyncError));
  const [projectSyncFailed] = await db
    .select({ value: count() })
    .from(schema.projectSyncJobs)
    .where(eq(schema.projectSyncJobs.status, "failed"));
  const [readmeSyncFailed] = await db
    .select({ value: count() })
    .from(schema.readmeSyncJobs)
    .where(eq(schema.readmeSyncJobs.status, "failed"));

  const taskRows = await db
    .select({
      id: schema.taskDefinitions.id,
      name: schema.taskDefinitions.name,
      description: schema.taskDefinitions.description,
      cronExpression: schema.taskDefinitions.cronExpression,
      isEnabled: schema.taskDefinitions.isEnabled,
      taskType: schema.taskDefinitions.taskType,
      status: schema.taskStatus,
    })
    .from(schema.taskDefinitions)
    .leftJoin(
      schema.taskStatus,
      eq(schema.taskStatus.taskDefinitionId, schema.taskDefinitions.id)
    );

  const recentExecutions = await db
    .select()
    .from(schema.taskExecutions)
    .where(eq(schema.taskExecutions.status, "failed"))
    .orderBy(desc(schema.taskExecutions.createdAt))
    .limit(5);

  const recentSkillFailures = await db
    .select({
      id: schema.projectSkills.id,
      name: schema.projectSkills.name,
      skillDir: schema.projectSkills.skillDir,
      lastSyncError: schema.projectSkills.lastSyncError,
      lastSyncAttemptAt: schema.projectSkills.lastSyncAttemptAt,
      projectName: schema.projects.name,
      repoOwner: schema.repos.owner,
      repoName: schema.repos.name,
    })
    .from(schema.projectSkills)
    .innerJoin(
      schema.projects,
      eq(schema.projectSkills.projectId, schema.projects.id)
    )
    .innerJoin(schema.repos, eq(schema.projects.repoId, schema.repos.id))
    .where(isNotNull(schema.projectSkills.lastSyncError))
    .orderBy(desc(schema.projectSkills.lastSyncAttemptAt), desc(schema.projectSkills.updatedAt))
    .limit(8);

  const stats = [
    {
      label: "仓库总数",
      value: reposCount.value,
      href: "/protected/projects",
      icon: Boxes,
    },
    {
      label: "项目总数",
      value: projectsCount.value,
      href: "/protected/projects",
      icon: FolderGit2,
    },
    {
      label: "Skill 项目",
      value: skillProjectsCount.value,
      href: "/protected/skills",
      icon: Sparkles,
    },
    {
      label: "Skills 已同步",
      value: skillsSynced.value,
      href: "/protected/skills",
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Skills 待处理 / 失败",
      value: skillsErrors.value,
      href: "/protected/skills",
      icon: XCircle,
      tone: skillsErrors.value > 0 ? "danger" : "muted",
    },
    {
      label: "Skills 总数",
      value: skillsTotal.value,
      href: "/protected/skills",
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">管理后台总览</h1>
          <p className="mt-1 text-sm text-muted-foreground">抓取 / 同步状态与常见问题处理</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/protected/skills" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Skills 同步状态
          </Link>
          <Link href="/protected/tasks/monitor" className={buttonVariants({ variant: "outline", size: "sm" })}>
            任务监控
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon
                  className={`size-8 ${
                    stat.tone === "success"
                      ? "text-emerald-500"
                      : stat.tone === "danger"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 失败任务告警 */}
      {(projectSyncFailed.value > 0 || readmeSyncFailed.value > 0) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="size-5" />
              需要关注：同步失败任务
            </CardTitle>
            <CardDescription>
              以下任务执行失败需要处理，可到对应页面查看错误并手动重试。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/protected/project-sync-failures"
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/60"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FileWarning className="size-4 text-destructive" />
                  项目同步失败
                </span>
                <span className="text-lg font-bold text-destructive">{projectSyncFailed.value}</span>
              </Link>
              <Link
                href="/protected/readme-sync-failures"
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/60"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FileWarning className="size-4 text-muted-foreground" />
                  README 同步失败
                </span>
                <span className="text-lg font-bold text-muted-foreground">{readmeSyncFailed.value}</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 任务运行状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              定时任务状态
            </CardTitle>
            <CardDescription>数据抓取相关定时任务的最新运行情况</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务</TableHead>
                  <TableHead>最新执行</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskRows.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      {TASK_LABELS[task.name] ?? task.name}
                      <div className="text-xs text-muted-foreground">{task.cronExpression ?? "手动"}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.status?.lastRunAt
                        ? task.status.lastRunAt.toLocaleString("zh-CN")
                        : "从未运行"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.isEnabled ? "default" : "secondary"}>
                          {task.isEnabled ? "已启用" : "已禁用"}
                        </Badge>
                        {task.status?.isRunning && (
                          <Badge variant="outline">运行中</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Link
              href="/protected/tasks/monitor"
              className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              前往任务监控
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        {/* 最近失败 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="size-5" />
              最近失败记录
            </CardTitle>
            <CardDescription>最近的 Skill 同步失败与任务执行失败</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Skill 同步失败（{recentSkillFailures.length}）</p>
                {recentSkillFailures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无失败，全部同步正常</p>
                ) : (
                  <ul className="space-y-2">
                    {recentSkillFailures.map((fail) => (
                      <li
                        key={fail.id}
                        className="rounded-md border p-2 text-sm"
                      >
                        <span className="font-medium">{fail.projectName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {fail.repoOwner}/{fail.repoName} · {fail.skillDir}
                        </span>
                        <div className="mt-1 truncate text-xs text-destructive" title={fail.lastSyncError ?? ""}>
                          {fail.lastSyncError}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t pt-3">
                <p className="mb-2 text-sm font-medium">任务执行失败（{recentExecutions.length}）</p>
                {recentExecutions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无失败任务执行</p>
                ) : (
                  <ul className="space-y-2">
                    {recentExecutions.map((ex) => (
                      <li key={ex.id} className="text-sm">
                        <span className="text-muted-foreground">
                          {ex.createdAt.toLocaleString("zh-CN")}
                        </span>
                        <div className="truncate text-xs text-destructive" title={ex.error ?? ""}>
                          {ex.error}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <Link
              href="/protected/skills"
              className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              前往 Skills 同步状态
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}