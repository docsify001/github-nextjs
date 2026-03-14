import { eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { redirect } from "next/navigation";

import { getAllTags, findProjects } from "@/drizzle/projects";
import { AddProjectButton } from "@/components/projects/add-project-button";
import { ProjectLogo } from "@/components/projects/project-logo";
import { ReadmeViewer } from "@/components/projects/readme-viewer";
import { projectService } from "@/lib/db";
import { db, schema } from "@/drizzle/database";
import { createClient } from "@/lib/supabase/server";
import { ViewProjectPackages } from "./view-packages";
import { ViewProject } from "./view-project";
import { ViewProjectSkills } from "./view-project-skills";
import { ViewRepo } from "./view-repo";
import { ViewSnapshots } from "./view-snapshots";
import { ViewTags } from "./view-tags";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 0;

export default async function ViewProjectPage(props: PageProps) {
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

  const { repo } = project;
  invariant(repo, "Project must have a repository");
  invariant(project.repoId, "Project must have a repository");

  // 获取相关项目数据
  const [sameRepoProjects, sameOwnerProjects] = await Promise.all([
    findProjects({
      db,
      full_name: repo.full_name,
      sort: "-stars",
      limit: 0,
      offset: 0,
    }),
    findProjects({
      db,
      owner: repo.owner,
      sort: "-stars",
      limit: 0,
      offset: 0,
    }),
  ]);

  const relatedProjectsData = {
    sameRepoProjects,
    sameOwnerProjects,
  };

  const projectSkills =
    project.type === "skill"
      ? await db.query.projectSkills.findMany({
          where: eq(schema.projectSkills.projectId, project.id),
          columns: {
            id: true,
            skillDir: true,
            name: true,
            syncedToWebAt: true,
            lastSyncError: true,
            lastSyncAttemptAt: true,
          },
        })
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div className="flex min-w-0 items-center gap-4">
          <ProjectLogo project={project} size={100} />
          <div className="flex min-w-0 flex-col gap-4">
            <h1 className="flex scroll-m-20 items-center gap-2 text-3xl font-extrabold tracking-tight lg:text-4xl">
              {project.name}
            </h1>
            <div>{project.description}</div>
          </div>
        </div>
        <div className="shrink-0">
          <AddProjectButton />
        </div>
      </div>
      <ViewProject project={project} />
      <ViewTags project={project} allTags={allTags} />
      {project.type === "skill" && (
        <ViewProjectSkills
          projectId={project.id}
          projectSlug={project.slug}
          skills={projectSkills}
        />
      )}
      {project.repo ? <ViewRepo project={project} relatedProjectsData={relatedProjectsData} /> : <>No repository!</>}
      <ViewProjectPackages project={project} />
      {project.repo && (
        <ViewSnapshots
          snapshots={repo.snapshots}
          repoId={project.repoId}
          repoFullName={repo.owner + "/" + repo.name}
          slug={project.slug}
        />
      )}
      {project.repo && (
        <ReadmeViewer
          readmeContent={repo.readme_content}
          readmeContentZh={repo.readme_content_zh}
          description={repo.description}
          descriptionZh={repo.description_zh}
          iconUrl={repo.icon_url}
          openGraphImageOssUrl={repo.open_graph_image_oss_url}
        />
      )}
    </div>
  );
}
