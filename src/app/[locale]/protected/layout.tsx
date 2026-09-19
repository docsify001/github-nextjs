import { getTranslations } from "next-intl/server";
import Header from "@/components/header";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { ErrorBoundary } from "@/components/error-boundary";
import { NotificationProvider } from "@/components/notification";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("Navigation");

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <AuthGuard>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="container mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-8">
                {children}
              </main>
              <footer className="w-full border-t">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
                  <p>{t("brand")}</p>
                  <p>GitHub 项目数据抓取与同步平台</p>
                </div>
              </footer>
            </div>
          </AuthGuard>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}