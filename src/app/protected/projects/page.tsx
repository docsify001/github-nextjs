import Link from "next/link";
import { z } from "zod";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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

type PageProps = {
  searchParams: Promise<{
    limit?: string;
    page?: string;
    sort?: string;
  }>;
};

export default async function ProjectsPage(props: PageProps) {
  // 验证用户认证
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const searchParams = await props.searchParams;
  const searchOptions = searchSchema.parse(searchParams);
  const { limit, offset, sort, tag, text } = searchOptions;

  // 并行获取总数和项目列表，提高性能
  const [total, projects] = await Promise.all([
    countProjects({ db, tag, text }),
    findProjects({
      db,
      limit,
      offset,
      sort: sort as ProjectListOrderByKey,
      tag,
      text,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between">
        <h1 className="flex scroll-m-20 items-center gap-2 text-3xl font-extrabold tracking-tight lg:text-4xl">
          项目列表
          <Badge className="text-sm">{total}</Badge>
        </h1>
        <AddProjectButton />
      </div>

      <SearchBox text={text} />

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
              <p className="text-lg font-medium mb-2">没有找到项目</p>
              <p className="text-sm text-muted-foreground mb-4">
                {text ? `搜索 "${text}" 没有结果` : "当前没有项目"}
              </p>
            </div>
            <Link
              href="/protected/projects"
              className={buttonVariants({ variant: "secondary" })}
            >
              重置搜索
            </Link>
          </div>
        )}
      </Suspense>
    </div>
  );
}

function PaginatedProjectTable({
  projects,
  searchOptions,
  total,
}: {
  projects: Awaited<ReturnType<typeof findProjects>>;
  searchOptions: z.infer<typeof searchSchema>;
  total: number;
}) {
  const { limit, offset, sort } = searchOptions;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex w-full justify-between items-center">
        <ProjectListSortOptionPicker sort={sort as ProjectListOrderByKey} />
        <div className="text-sm text-muted-foreground">
          显示第 {offset + 1}-{Math.min(offset + limit, total)} 条，共 {total} 条记录
        </div>
      </div>

      {/* 项目表格 */}
      <div className="border rounded-lg">
        <ProjectTable projects={projects} />
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex justify-center">
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
