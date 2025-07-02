import { redirect } from "next/navigation";
import { getAllTags } from "@/drizzle/projects";
import { ProjectLogo } from "@/components/projects/project-logo";
import { ViewTags } from "../view-tags";
import { ProjectForm } from "./project-form";
import { projectService } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditProjectPage(props: PageProps) {
  // 验证用户认证
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const params = await props.params;

  const {
    slug
  } = params;

  const project = await projectService.getProjectBySlug(slug);
  const allTags = await getAllTags();

  if (!project) {
    return <div>Project not found {slug}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ProjectLogo project={project} size={100} />
        <div className="flex flex-col gap-4">
          <h1 className="flex scroll-m-20 items-center gap-2 text-3xl font-extrabold tracking-tight lg:text-4xl">
            {project.name}
          </h1>
          <div>{project.description}</div>
        </div>
      </div>
      <ProjectForm project={project} />
      <ViewTags project={project} allTags={allTags} />
    </div>
  );
}
