import invariant from "tiny-invariant";

import { getAllTags, findProjects } from "@/drizzle/projects";
import { ProjectLogo } from "@/components/projects/project-logo";
import { ReadmeViewer } from "@/components/projects/readme-viewer";
import { projectService } from "@/lib/db";
import { db } from "@/drizzle/database";
import { ViewProjectPackages } from "./view-packages";
import { ViewProject } from "./view-project";
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
      <ViewProject project={project} />
      <ViewTags project={project} allTags={allTags} />
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
