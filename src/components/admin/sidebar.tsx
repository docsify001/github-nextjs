"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminNavGroups } from "./nav-config";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 lg:block print:hidden">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/protected" className="text-sm font-semibold tracking-tight">
            管理后台
          </Link>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-xs font-medium uppercase text-muted-foreground">
                {group.label}
              </p>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          Best of JS Admin
        </div>
      </div>
    </aside>
  );
}