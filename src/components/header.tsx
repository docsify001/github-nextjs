import { AuthButton } from "@/components/auth-button";
import { MobileNav } from "@/components/mobile-nav";
import Link from "next/link";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/protected/tasks/monitor", label: "任务管理" },
  { href: "/protected/projects", label: "项目管理" },
  { href: "/protected/readme-sync-failures", label: "README失败" },
  { href: "/protected/project-sync-failures", label: "项目同步失败" },
  { href: "/protected/auth-status", label: "认证状态" },
] as const;

export default function Header() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* 移动端：汉堡菜单 */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
          <MobileNav />
        </div>

        {/* 桌面端：导航链接 */}
        <div className="hidden flex-shrink-0 items-center gap-1 md:flex md:gap-2">
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

        {/* 右侧：认证按钮，小屏时避免挤压 */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
