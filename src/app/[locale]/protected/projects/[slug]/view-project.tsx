import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { ProjectData } from "@/drizzle/projects/get";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  project: ProjectData;
};
export async function ViewProject({ project }: Props) {
  const t = await getTranslations("ProjectDetail");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dataTitle")}</CardTitle>
        <CardDescription>
          <code>{project.id}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[200px_1fr] gap-4">
          <p>{t("fieldSlug")}</p>
          <p>{project.slug}</p>
          <p>{t("fieldDescription")}</p>
          <div>
            {project.description}
            {project.overrideDescription && (
              <div className="mt-2 flex items-center gap-2">
                <Checkbox checked={true} />
                <span>{t("overrideDescription")}</span>
              </div>
            )}
          </div>
          <p>{t("fieldUrl")}</p>
          <div>
            {project.url ? (
              <a href={project.url} target="_blank" rel="noreferrer">
                {project.url}
              </a>
            ) : (
              "-"
            )}
            {project.overrideURL && (
              <div className="mt-2 flex items-center gap-2">
                <Checkbox checked={true} />
                <span>{t("overrideUrl")}</span>
              </div>
            )}
          </div>
          <p>{t("fieldLogo")}</p>
          <p>{project.logo}</p>
          <p>{t("fieldComments")}</p>
          <p>{project.comments}</p>
          <p>{t("fieldStatus")}</p>
          <p>{project.status}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link
          href={`/protected/projects/${project.slug}/edit`}
          className={buttonVariants({ variant: "default" })}
        >
          {t("editButton")}
        </Link>
      </CardFooter>
    </Card>
  );
}