import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-6xl font-extrabold tracking-tight">404</h1>
      <p className="text-muted-foreground">
        This page could not be found.{" "}
        <Link href="/" className="text-primary underline underline-offset-4 hover:text-primary/80">
          Go back home
        </Link>
      </p>
    </main>
  );
}