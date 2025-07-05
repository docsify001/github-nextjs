"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Webhook, RefreshCw } from "lucide-react";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
}

export function ProjectActions({ projectId, projectName }: ProjectActionsProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [isWebhookLoading, setIsWebhookLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);


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

  return (
    <div className="flex gap-2">
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Webhook className="h-4 w-4 mr-1" />
            Webhook
          </Button>
        </DialogTrigger>
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

      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncLoading}
      >
        {isSyncLoading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-1" />
        )}
        同步
      </Button>
    </div>
  );
} 