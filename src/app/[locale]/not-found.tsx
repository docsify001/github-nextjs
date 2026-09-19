import { useTranslations } from "next-intl";
import { LocaleLink } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Note that `app/[locale]/[...rest]/page.tsx`
 * is necessary for this page to render.
 *
 * https://next-intl.dev/docs/environments/error-files#not-foundjs
 */
export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-6xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="text-balance text-center text-lg text-muted-foreground">
        {t("message")}
      </p>
      <Button asChild size="lg" className="cursor-pointer">
        <LocaleLink href="/">{t("backToHome")}</LocaleLink>
      </Button>
    </div>
  );
}