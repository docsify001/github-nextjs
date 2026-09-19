"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { deleteProjectAction } from "@/app/[locale]/protected/projects/actions";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
}

export function ProjectActions({ projectId, projectName }: ProjectActionsProps) {
  const t = useTranslations("ProjectsActions");
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
        toast.success(t("webhookSent"));
        setIsWebhookDialogOpen(false);
        setWebhookUrl("");
      } else {
        toast.error(result.error || t("webhookFailed"));
      }
    } catch (error) {
      toast.error(t("networkError"));
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
        toast.success(t("syncStarted"));
      } else {
        toast.error(result.error || t("syncFailed"));
      }
    } catch (error) {
      toast.error(t("networkError"));
    } finally {
      setIsSyncLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    try {
      const result = await deleteProjectAction(projectId);
      if (result.success) {
        toast.success(t("deleted"));
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? t("deleteFailed"));
      }
    } catch (error) {
      toast.error(t("networkError"));
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("actionsMenu")}>
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
            {t("webhook")}
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
            {t("sync")}
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
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Webhook 弹窗 */}
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sendWebhook")}</DialogTitle>
            <DialogDescription>
              {t("sendWebhookDesc", { projectName })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">{t("webhookUrlLabel")}</Label>
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
              {t("cancel")}
            </Button>
            <Button onClick={handleWebhook} disabled={isWebhookLoading}>
              {isWebhookLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("confirmDeleteDesc", { projectName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleteLoading}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleteLoading}
            >
              {isDeleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("confirmDeleteButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}