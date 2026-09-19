"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { useTranslations } from "next-intl";
import { useNotification } from "@/components/notification";
import { ErrorHandler } from "@/lib/error/error-handler";
import { ReloadIcon } from "@radix-ui/react-icons";
import { ChevronDown, ChevronUp } from "lucide-react";



function triggerKey(value: string): string {
  if (value === "project_create") return "triggerProjectCreate";
  if (value === "manual") return "triggerManual";
  return "triggerRetry";
}


interface ReadmeSyncJobItem {
  id: string;
  repo_id: string;
  status: string;
  triggered_by: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string | null;
  repo_full_name: string;
}

interface ListResponse {
  items: ReadmeSyncJobItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function ReadmeSyncFailuresPage() {
  const t = useTranslations("SyncFailures");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/readme-sync-jobs?status=failed&page=${page}&pageSize=${PAGE_SIZE}`,
        { credentials: "include" }
      );
      if (res.status === 401) {
        const errInfo = ErrorHandler.handleAuthError({ message: t("authFailMsg") });
        addNotification({
          type: errInfo.type,
          title: errInfo.title,
          message: errInfo.message,
          action: errInfo.action,
        });
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || res.statusText);
        return;
      }
      const json: ListResponse = await res.json();
      setData(json);
    } catch (err) {
      const errInfo = ErrorHandler.handleApiError(err, t("loadFailTitle"));
      addNotification({
        type: errInfo.type,
        title: errInfo.title,
        message: errInfo.message,
        action: errInfo.action,
      });
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }, [page, router, addNotification]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      const res = await fetch(`/api/readme-sync-jobs/${jobId}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        addNotification({
          type: "error",
          title: t("authFailTitle"),
          message: t("authFailMsg"),
        });
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        addNotification({
          type: "error",
          title: t("retryFailTitle"),
          message: body.error || res.statusText,
        });
        return;
      }
      addNotification({
        type: "success",
        title: t("retrySubmittedTitle"),
        message: t("retrySubmittedMsg"),
      });
      await fetchList();
    } finally {
      setRetryingId(null);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("zh-CN");
    } catch {
      return iso;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <ReloadIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("readmeTitle")}</CardTitle>
          <CardDescription>
            <CardDescription>{t("readmeDesc")}</CardDescription>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="flex items-center justify-center py-12">
              <ReloadIcon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-destructive py-4">{error}</p>
          ) : !data || data.items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">{t("noFailures")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colRepo")}</TableHead>
                    <TableHead>{t("colTriggeredBy")}</TableHead>
                    <TableHead>{t("colFailedAt")}</TableHead>
                    <TableHead>{t("colError")}</TableHead>
                    <TableHead>{t("colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">
                        {job.repo_full_name}
                      </TableCell>
                      <TableCell>
                        {t(triggerKey(job.triggered_by))}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatTime(job.completed_at ?? job.updated_at)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {job.error_message ? (
                          <div>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setExpandedErrorId((id) =>
                                  id === job.id ? null : job.id
                                )
                              }
                            >
                              {expandedErrorId === job.id ? (
                                <ChevronUp className="size-4 shrink-0" />
                              ) : (
                                <ChevronDown className="size-4 shrink-0" />
                              )}
                              <span className="line-clamp-2">
                                {job.error_message}
                              </span>
                            </button>
                            {expandedErrorId === job.id && (
                              <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                                {job.error_message}
                              </pre>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryingId === job.id}
                          onClick={() => handleRetry(job.id)}
                        >
                          {retryingId === job.id ? (
                            <ReloadIcon className="size-4 animate-spin" />
                          ) : (
                            t("retry")
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.total > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("showing", { total: data.total, page })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      {t("prevPage")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * PAGE_SIZE >= data.total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t("nextPage")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
