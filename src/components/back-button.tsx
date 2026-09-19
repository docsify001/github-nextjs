import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

export async function BackButton({ href, label, className }: BackButtonProps) {
  const t = await getTranslations("Common");

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "-ml-2 w-fit shrink-0 gap-1.5 text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label ?? t("back")}</span>
    </Link>
  );
}