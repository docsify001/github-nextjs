"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav({ className }: { className?: string }) {
  const t = useTranslations("Navigation");
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/protected", label: t("dashboard") },
    { href: "/protected/projects", label: t("projects") },
    { href: "/protected/tasks/monitor", label: t("tasks") },
    { href: "/protected/api", label: t("apiDocs") },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-11 w-11", className)}
          aria-label={t("openMenu")}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
        <SheetHeader className="text-left">
          <SheetTitle>{t("brand")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col">
          {navLinks.map(({ href, label }) => (
            <SheetClose key={href} asChild>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="flex w-full items-center rounded-lg px-3 py-4 text-lg font-medium text-foreground/90 transition-colors hover:bg-accent hover:text-foreground active:bg-accent"
              >
                {label}
              </Link>
            </SheetClose>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}