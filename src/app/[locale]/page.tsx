import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Database,
  Webhook,
  LayoutDashboard,
  GitFork,
} from "lucide-react";

import Header from "@/components/header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations("Landing");

  const features = [
    { icon: Database, title: t("featureTitleA"), desc: t("featureDescA") },
    { icon: Webhook, title: t("featureTitleB"), desc: t("featureDescB") },
    { icon: LayoutDashboard, title: t("featureTitleC"), desc: t("featureDescC") },
  ];

  const steps = [
    { title: t("howStep1Title"), desc: t("howStep1Desc") },
    { title: t("howStep2Title"), desc: t("howStep2Desc") },
    { title: t("howStep3Title"), desc: t("howStep3Desc") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
            <GitFork className="h-3.5 w-3.5" />
            {t("badge")}
          </span>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="cursor-pointer">
              <Link href="/protected">{t("ctaPrimary")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="cursor-pointer">
              <Link href="/protected/api">{t("ctaSecondary")}</Link>
            </Button>
          </div>
        </section>

        {/* 特性 */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-xl border bg-card p-6"
              >
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 工作原理 */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              {t("howTitle")}
            </h2>
            <ol className="grid gap-4 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-2 rounded-xl border bg-card p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 底部 CTA */}
        <section className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-10 text-center">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {t("ctaBottomTitle")}
            </h2>
            <p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
              {t("ctaBottomDesc")}
            </p>
            <Link
              href="/protected"
              className={buttonVariants({ size: "lg" })}
            >
              {t("ctaPrimary")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="w-full border-t">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>{t("footer")}</p>
          <ThemeSwitcher />
        </div>
      </footer>
    </div>
  );
}