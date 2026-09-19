"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", className)}
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {navLinks.map(({ href, label }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href} onClick={() => setOpen(false)} className="block">
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}