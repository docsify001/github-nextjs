import type { LucideIcon } from "lucide-react";
import {
  FolderGit2,
  LayoutDashboard,
  ListChecks,
  Activity,
  AlertOctagon,
  FileWarning,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "总览",
    items: [
      { href: "/protected", label: "控制台总览", icon: LayoutDashboard },
    ],
  },
  {
    label: "数据抓取",
    items: [
      { href: "/protected/skills", label: "Skills 同步状态", icon: Sparkles },
      { href: "/protected/projects", label: "项目列表", icon: FolderGit2 },
    ],
  },
  {
    label: "定时任务",
    items: [
      { href: "/protected/tasks/monitor", label: "任务监控", icon: Activity },
      { href: "/protected/tasks", label: "任务管理", icon: ListChecks },
    ],
  },
  {
    label: "失败处理",
    items: [
      {
        href: "/protected/project-sync-failures",
        label: "项目同步失败",
        icon: AlertOctagon,
      },
      {
        href: "/protected/readme-sync-failures",
        label: "README 失败",
        icon: FileWarning,
      },
    ],
  },
  {
    label: "系统",
    items: [
      { href: "/protected/auth-status", label: "认证状态", icon: ShieldCheck },
    ],
  },
];