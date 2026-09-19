import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function ApiDocsPage() {
  const t = await getTranslations("ApiDocs");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionSubmitTitle")}</CardTitle>
          <CardDescription>{t("sectionSubmitDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="mb-1 text-sm font-semibold">{t("endpoint")}</h4>
            <code className="block rounded-md bg-muted px-3 py-2 text-sm">
              POST https://your-deployment.vercel.app/api/projects/create
            </code>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-semibold">{t("auth")}</h4>
            <p className="text-sm text-muted-foreground">{t("authDesc")}</p>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-semibold">{t("requestBody")}</h4>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
{`{
  "githubUrl": "https://github.com/owner/repo",
  "type": "application",
  "webhookUrl": "https://your-webhook-url.com/webhook"
}`}
            </pre>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-semibold">{t("responseBody")}</h4>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
{`{
  "success": true,
  "data": {
    "project": {
      "id": "project-id",
      "name": "project-name",
      "slug": "project-slug",
      "status": "created"
    }
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-semibold">{t("curlTitle")}</h4>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
{`curl -X POST https://your-deployment.vercel.app/api/projects/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "githubUrl": "https://github.com/owner/repo",
    "webhookUrl": "https://your-webhook-url.com/webhook"
  }'`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("callbackTitle")}</CardTitle>
          <CardDescription>{t("callbackDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>{t("callbackItems.0")}</li>
            <li>{t("callbackItems.1")}</li>
            <li>{t("callbackItems.2")}</li>
            <li>{t("callbackItems.3")}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("noteTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>{t("noteItems.0")}</li>
            <li>{t("noteItems.1")}</li>
            <li>{t("noteItems.2")}</li>
          </ul>
          <div className="mt-6 flex items-center justify-between gap-4 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">{t("managedTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("managedDesc")}</p>
            </div>
            <Link
              href="/protected/projects"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("managedTitle")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}