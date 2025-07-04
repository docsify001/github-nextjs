
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Header from "@/components/header";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Header />
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <Hero />
          <main className="flex-1 flex flex-col gap-6 px-4">
            <h2 className="font-medium text-xl mb-4">Next steps</h2>
            {/* <SignUpUserSteps /> */}
          </main>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            Supabase
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
