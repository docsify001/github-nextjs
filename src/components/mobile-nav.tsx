"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/protected/tasks/monitor", label: "任务管理" },
  { href: "/protected/projects", label: "项目管理" },
  { href: "/protected/readme-sync-failures", label: "README失败" },
  { href: "/protected/project-sync-failures", label: "项目同步失败" },
  { href: "/protected/auth-status", label: "认证状态" },
] as const;

export function MobileNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", className)}
          aria-label="打开菜单"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
