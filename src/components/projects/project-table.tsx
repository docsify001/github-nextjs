import Link from "next/link";

import { findProjects } from "@/drizzle/projects";
import { ProjectLogo } from "@/components/projects/project-logo";
import { ProjectActions } from "@/components/projects/project-actions";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatStars } from "@/lib/format-helpers";

type Props = {
  projects: Awaited<ReturnType<typeof findProjects>>;
};

export function ProjectTable({ projects }: Props) {
  return (
    <Table className="min-w-[640px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px] sm:w-[100px] shrink-0">Logo</TableHead>
          <TableHead className="min-w-[180px]">项目名称</TableHead>
          <TableHead className="whitespace-nowrap w-[100px] hidden md:table-cell">添加时间</TableHead>
          <TableHead className="min-w-[120px] hidden sm:table-cell">GitHub</TableHead>
          <TableHead className="min-w-[80px] hidden lg:table-cell">Packages</TableHead>
          <TableHead className="text-right w-[70px] shrink-0">Stars</TableHead>
          <TableHead className="text-center w-[56px] shrink-0">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.slug}>
            <TableCell className="shrink-0">
              <ProjectLogo project={project} size={50} />
            </TableCell>
            <TableCell className="min-w-0">
              <div className="flex flex-col gap-1 sm:gap-2">
                <Link
                  href={`/protected/projects/${project.slug}`}
                  className="hover:underline font-medium break-words"
                >
                  {project.name}
                </Link>
                <span className="text-muted-foreground text-sm line-clamp-2">
                  {project.description}
                </span>
                {project.comments && <div className="text-sm">{project.comments}</div>}
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <a
                      href={`/protected/projects?tag=${tag}`}
                      className={badgeVariants({ variant: "secondary" })}
                      key={tag}
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap hidden md:table-cell">
              {project.createdAt.toISOString().slice(0, 10)}
            </TableCell>
            <TableCell className="hidden sm:table-cell min-w-0">
              <div className="flex flex-col gap-1">
                <span className="truncate max-w-[180px]" title={project.repo?.full_name ?? undefined}>
                  {project.repo?.full_name || "No repo"}
                </span>
                {project.repo?.archived && (
                  <Badge variant="destructive" className="w-fit">Archived</Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell min-w-0">
              {project.packages.filter(Boolean).length > 0 ? (
                <div className="flex flex-col gap-1">
                  {project.packages.slice(0, 3).map((pkg) => (
                    <div key={pkg} className="truncate max-w-[120px]">{pkg}</div>
                  ))}
                  {project.packages.length > 3 && (
                    <span className="text-muted-foreground text-xs">+{project.packages.length - 3}</span>
                  )}
                </div>
              ) : (
                <span className="italic text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell className="text-right shrink-0">
              {formatStars(project.stars)}
            </TableCell>
            <TableCell className="text-center shrink-0">
              <ProjectActions
                projectId={project.id}
                projectName={project.name}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
