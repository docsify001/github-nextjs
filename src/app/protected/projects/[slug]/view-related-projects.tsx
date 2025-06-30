import { ProjectDetails } from "@/drizzle/projects";
import { AddProjectToRepoButton } from "@/components/projects/add-project-to-repo-button";
import { ProjectTable } from "@/components/projects/project-table";

type Props = {
  project: ProjectDetails;
  relatedProjectsData?: {
    sameRepoProjects: any[];
    sameOwnerProjects: any[];
  };
};

export function ViewRelatedProjects({ project, relatedProjectsData }: Props) {
  return (
    <>
      <SameRepoOtherProjectsSection project={project} sameRepoProjects={relatedProjectsData?.sameRepoProjects || []} />
      <SameOwnerOtherProjectsSection project={project} sameOwnerProjects={relatedProjectsData?.sameOwnerProjects || []} />
    </>
  );
}

function SameRepoOtherProjectsSection({ project, sameRepoProjects }: Props & { sameRepoProjects: any[] }) {
  const relatedProjects = sameRepoProjects.filter(
    (foundProject) => foundProject.slug !== project.slug
  );
  return (
    <section>
      <div className="flex justify-between">
        <h3 className="text-lg font-bold">同一仓库的其他项目</h3>
        <div>
          <AddProjectToRepoButton repoId={project.repoId} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {relatedProjects.length === 0 ? (
          <i>暂无相关项目</i>
        ) : (
          <ProjectTable projects={relatedProjects} />
        )}
      </div>
    </section>
  );
}

function SameOwnerOtherProjectsSection({ project, sameOwnerProjects }: Props & { sameOwnerProjects: any[] }) {
  const owner = project.repo.owner;
  const otherProjects = sameOwnerProjects.filter(
    (foundProject) => foundProject.repo?.name !== project.repo.name
  );
  return (
    <section>
      <h3 className="text-lg font-bold">
        <i>{owner}</i> 的其他项目
      </h3>
      <div>
        {otherProjects.length === 0 ? (
          <i>{owner} 暂无其他项目</i>
        ) : (
          <ProjectTable projects={otherProjects} />
        )}
      </div>
    </section>
  );
}
