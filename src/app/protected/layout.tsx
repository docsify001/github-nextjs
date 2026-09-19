import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthButton } from "@/components/auth-button";
import { MobileNav } from "@/components/mobile-nav";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { ErrorBoundary } from "@/components/error-boundary";
import { NotificationProvider } from "@/components/notification";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <AuthGuard>
            <div className="flex min-h-screen">
              {/* 桌面端侧边栏 */}
              <AdminSidebar />

              {/* 主内容区 */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* 移动端顶部导航；桌面端仅显示右侧工具栏 */}
                <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
                      <MobileNav />
                      <span className="text-sm font-semibold">管理后台</span>
                    </div>
                    <div className="flex flex-shrink-0 items-center justify-end gap-2 lg:hidden">
                      <AuthButton />
                    </div>
                    <div className="hidden lg:flex flex-shrink-0 items-center justify-end gap-3">
                      <p className="text-sm font-semibold">管理后台</p>
                      <ThemeSwitcher />
                      <AuthButton />
                    </div>
                  </div>
                </header>

                <main className="flex-1 p-4 sm:p-6">
                  <div className="mx-auto w-full max-w-7xl">{children}</div>
                </main>

                <footer className="flex w-full items-center justify-center border-t gap-8 py-6 text-center text-xs">
                  <p>
                    Powered by Best of JS &amp;{" "}
                    <a
                      href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
                      target="_blank"
                      className="font-bold hover:underline"
                      rel="noreferrer"
                    >
                      Supabase
                    </a>
                  </p>
                  <span className="lg:hidden">
                    <ThemeSwitcher />
                  </span>
                </footer>
              </div>
            </div>
          </AuthGuard>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}