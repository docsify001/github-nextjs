import { getTranslations } from "next-intl/server";
import { AuthButton } from "@/components/auth-button";
import LocaleSelector from "@/components/locale-selector";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default async function Header() {
  const t = await getTranslations("Navigation");

  const navLinks = [
    { href: "/protected", label: t("dashboard") },
    { href: "/protected/projects", label: t("projects") },
    { href: "/protected/tasks/monitor", label: t("tasks") },
    { href: "/protected/api", label: t("apiDocs") },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* 移动端：汉堡菜单 */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
          <MobileNav />
        </div>

        {/* 桌面端：导航链接 */}
        <div className="hidden shrink-0 items-center gap-1 md:flex md:gap-2">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-accent hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* 右侧：语言/主题/认证按钮，小屏时避免挤压 */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          <ThemeSwitcher />
          <LocaleSelector />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}