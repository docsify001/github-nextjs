import Link from "next/link";
import { z } from "zod";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { db } from "@/drizzle/database";
import {
  countProjects,
  findProjects,
  ProjectListOrderByKey,
} from "@/drizzle/projects";
import { createClient } from "@/lib/supabase/server";
import { AddProjectButton } from "@/components/projects/add-project-button";
import { ProjectTable } from "@/components/projects/project-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ProjectTablePagination } from "./project-table-pagination";
import { SearchBox } from "./search-box";
import { searchSchema } from "./search-schema";
import { ProjectListSortOptionPicker } from "./sort-option-picker";
import { TypeFilterPicker } from "./type-filter-picker";

type PageProps = {
  searchParams: Promise<{
    limit?: string;
    page?: string;
    sort?: string;
    type?: string;
  }>;
};

export default async function ProjectsPage(props: PageProps) {
  // 验证用户认证
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const t = await getTranslations("Projects");

  const searchParams = await props.searchParams;
  const searchOptions = searchSchema.parse(searchParams);
  const { limit, offset, sort, tag, text, type } = searchOptions;

  // 并行获取总数和项目列表，提高性能
  const [total, projects] = await Promise.all([
    countProjects({ db, tag, text, type }),
    findProjects({
      db,
      limit,
      offset,
      sort: sort as ProjectListOrderByKey,
      tag,
      text,
      type,
    }),
  ]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-[100vw] px-2 sm:px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="flex scroll-m-20 items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
          {t("title")}
          <Badge className="text-sm">{total}</Badge>
        </h1>
        <AddProjectButton />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <SearchBox text={text} />
        <TypeFilterPicker type={type} />
      </div>

      <Suspense fallback={<div className="flex h-40 items-center justify-center">加载中...</div>}>
        {projects.length > 0 ? (
          <PaginatedProjectTable
            projects={projects}
            searchOptions={searchOptions}
            total={total}
          />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-6 border">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">{t("noneFound")}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {text ? t("noneFoundWithText", { text }) : t("noneAtAll")}
              </p>
            </div>
            <Link
              href="/protected/projects"
              className={buttonVariants({ variant: "secondary" })}
            >
              {t("resetSearch")}
            </Link>
          </div>
        )}
      </Suspense>
    </div>
  );
}

async function PaginatedProjectTable({
  projects,
  searchOptions,
  total,
}: {
  projects: Awaited<ReturnType<typeof findProjects>>;
  searchOptions: z.infer<typeof searchSchema>;
  total: number;
}) {
  const t = await getTranslations("Projects");
  const { limit, offset, sort } = searchOptions;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* 顶部工具栏：小屏纵向排列 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <ProjectListSortOptionPicker sort={sort as ProjectListOrderByKey} />
        <div className="text-sm text-muted-foreground shrink-0">
          {t("showingRange", {
            from: offset + 1,
            to: Math.min(offset + limit, total),
            total,
          })}
        </div>
      </div>

      {/* 项目表格：小屏横向滚动 */}
      <div className="border rounded-lg overflow-x-auto">
        <ProjectTable projects={projects} />
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          <ProjectTablePagination
            offset={offset}
            limit={limit}
            sort={sort}
            total={total}
          />
        </div>
      )}
    </div>
  );
}
