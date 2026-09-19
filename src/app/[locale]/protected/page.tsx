import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { count, eq } from "drizzle-orm";
import {
  ActivitySquare,
  FolderKanban,
  GitPullRequestArrow,
  PackageOpen,
  ArrowRight,
  TriangleAlert,
} from "lucide-react";

import { db, schema } from "@/drizzle/database";
import { countProjects, findProjects } from "@/drizzle/projects";
import { createClient } from "@/lib/supabase/server";
import { ProjectLogo } from "@/components/projects/project-logo";
import { formatStars } from "@/lib/format-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/login");
  }

  const [totalProjects, snapshotRows, runningRows, failedSyncs, recentProjects] =
    await Promise.all([
      countProjects({ db }),
      db.select({ n: count() }).from(schema.snapshots),
      db.select({ n: count() }).from(schema.taskStatus).where(eq(schema.taskStatus.isRunning, true)),
      Promise.all([
        db.select({ n: count() }).from(schema.projectSyncJobs).where(eq(schema.projectSyncJobs.status, "failed")),
        db.select({ n: count() }).from(schema.readmeSyncJobs).where(eq(schema.readmeSyncJobs.status, "failed")),
      ]),
      findProjects({ db, sort: "-createdAt", limit: 6, offset: 0 }),
    ]);

  const snapshots = Number(snapshotRows[0]?.n ?? 0);
  const runningTasks = Number(runningRows[0]?.n ?? 0);
  const failedJobs =
    Number(failedSyncs[0][0]?.n ?? 0) + Number(failedSyncs[1][0]?.n ?? 0);

  const stats = [
    {
      label: t("totalProjects"),
      value: totalProjects.toLocaleString(),
      desc: t("totalProjectsDesc"),
      icon: FolderKanban,
    },
    {
      label: t("snapshotsCollected"),
      value: snapshots.toLocaleString(),
      desc: t("snapshotsCollectedDesc"),
      icon: PackageOpen,
    },
    {
      label: t("runningTasks"),
      value: runningTasks.toLocaleString(),
      desc: t("runningTasksDesc"),
      icon: ActivitySquare,
    },
    {
      label: t("failedJobs"),
      value: failedJobs.toLocaleString(),
      desc: t("failedJobsDesc"),
      icon: TriangleAlert,
      danger: true,
    },
  ];

  const quickActions = [
    {
      href: "/protected/projects",
      title: t("qaAddProject"),
      desc: t("qaAddProjectDesc"),
      icon: GitPullRequestArrow,
    },
    {
      href: "/protected/tasks/monitor",
      title: t("qaTaskMonitor"),
      desc: t("qaTaskMonitorDesc"),
      icon: ActivitySquare,
    },
    {
      href: "/protected/api",
      title: t("qaApiDocs"),
      desc: t("qaApiDocsDesc"),
      icon: PackageOpen,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, desc, icon: Icon, danger }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {value}
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickActions.map(({ href, title, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最近项目 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("recentProjects")}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </div>
          <Link
            href="/protected/projects"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {t("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/protected/projects/${project.slug}`}
                  className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <ProjectLogo project={project} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium group-hover:underline">
                        {project.name}
                      </p>
                      <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                        {formatStars(project.stars)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">{t("noProjects")}</p>
              <Link href="/protected/projects" className="text-sm text-primary hover:underline">
                {t("qaAddProject")}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}