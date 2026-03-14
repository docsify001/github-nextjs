"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Webhook, RefreshCw, MoreVertical, Trash2 } from "lucide-react";
import { deleteProjectAction } from "@/app/protected/projects/actions";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
}

export function ProjectActions({ projectId, projectName }: ProjectActionsProps) {
  const router = useRouter();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [isWebhookLoading, setIsWebhookLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const handleWebhook = async () => {
    setIsWebhookLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Webhook发送成功");
        setIsWebhookDialogOpen(false);
        setWebhookUrl("");
      } else {
        toast.error(result.error || "Webhook发送失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试");
    } finally {
      setIsWebhookLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success("同步任务已启动，正在异步处理");
      } else {
        toast.error(result.error || "同步失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试");
    } finally {
      setIsSyncLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    try {
      const result = await deleteProjectAction(projectId);
      if (result.success) {
        toast.success("项目已删除");
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "删除失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="操作菜单">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsWebhookDialogOpen(true);
            }}
          >
            <Webhook className="h-4 w-4 mr-2" />
            Webhook
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleSync();
            }}
            disabled={isSyncLoading}
          >
            {isSyncLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            同步
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsDeleteDialogOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Webhook 弹窗 */}
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发送Webhook</DialogTitle>
            <DialogDescription>
              为项目 &quot;{projectName}&quot; 发送webhook数据到指定URL
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-webhook-url.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWebhookDialogOpen(false)}
              disabled={isWebhookLoading}
            >
              取消
            </Button>
            <Button onClick={handleWebhook} disabled={isWebhookLoading}>
              {isWebhookLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除项目</DialogTitle>
            <DialogDescription>
              确定要删除项目 &quot;{projectName}&quot; 吗？此操作将级联删除关联的标签、包等数据，且不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleteLoading}
            >
              {isDeleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确定删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
