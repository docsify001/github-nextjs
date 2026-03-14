"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReloadIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";

import { retrySkillSyncAction } from "@/actions/projects-actions";
import { Button } from "@/components/ui/button";

type ProjectSkillRow = {
  id: string;
  skillDir: string;
  name: string;
  syncedToWebAt: Date | string | null;
  lastSyncError: string | null;
  lastSyncAttemptAt: Date | string | null;
};

function formatDate(d: Date | string | null): string {
  if (d == null) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

type ViewProjectSkillsProps = {
  projectId: string;
  projectSlug: string;
  skills: ProjectSkillRow[];
};

export function ViewProjectSkills({ projectId, projectSlug, skills }: ViewProjectSkillsProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  async function handleRetrySync() {
    setRetrying(true);
    try {
      const result = await retrySkillSyncAction(projectId);
      if (result.success) {
        toast.success(`同步完成：成功 ${result.synced} 条`);
        router.refresh();
      } else {
        toast.error(result.error ?? "同步失败");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重试失败");
      setRetrying(false);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Skills 同步状态</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetrySync}
          disabled={retrying}
        >
          {retrying && <ReloadIcon className="mr-2 size-4 animate-spin" />}
          重试同步
        </Button>
      </div>
      {skills.length === 0 ? (
        <p className="text-muted-foreground text-sm">暂无已保存的 skill，请等待同步或执行重试。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left font-medium">skill_dir</th>
                <th className="p-2 text-left font-medium">name</th>
                <th className="p-2 text-left font-medium">同步状态</th>
                <th className="p-2 text-left font-medium">最近错误</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-2">{s.skillDir}</td>
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">
                    {s.syncedToWebAt ? (
                      <span className="text-green-600">
                        已同步 {formatDate(s.syncedToWebAt)}
                      </span>
                    ) : s.lastSyncAttemptAt ? (
                      <span className="text-amber-600">未同步（已尝试）</span>
                    ) : (
                      <span className="text-muted-foreground">未同步</span>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate p-2" title={s.lastSyncError ?? undefined}>
                    {s.lastSyncError ? (
                      <span className="text-destructive text-xs">{s.lastSyncError}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
