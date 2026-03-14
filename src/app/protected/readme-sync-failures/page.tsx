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
import { useNotification } from "@/components/notification";
import { ErrorHandler } from "@/lib/error/error-handler";
import { ReloadIcon } from "@radix-ui/react-icons";
import { ChevronDown, ChevronUp } from "lucide-react";

const TRIGGERED_BY_LABELS: Record<string, string> = {
  project_create: "项目创建",
  manual: "手动触发",
  retry: "重试",
};

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
        const errInfo = ErrorHandler.handleAuthError({ message: "认证失败" });
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
      const errInfo = ErrorHandler.handleApiError(err, "获取失败任务列表");
      addNotification({
        type: errInfo.type,
        title: errInfo.title,
        message: errInfo.message,
        action: errInfo.action,
      });
      setError("网络错误");
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
          title: "认证失败",
          message: "请重新登录",
        });
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        addNotification({
          type: "error",
          title: "重试请求失败",
          message: body.error || res.statusText,
        });
        return;
      }
      addNotification({
        type: "success",
        title: "已提交重试",
        message: "任务已在后台重试，请稍后刷新列表查看结果",
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
          <CardTitle>README 同步失败任务</CardTitle>
          <CardDescription>
            创建项目后自动拉取 README 并翻译失败的任务，可在此重试。
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
            <p className="text-muted-foreground py-8 text-center">暂无失败任务</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>仓库</TableHead>
                    <TableHead>触发方式</TableHead>
                    <TableHead>失败时间</TableHead>
                    <TableHead>错误信息</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">
                        {job.repo_full_name}
                      </TableCell>
                      <TableCell>
                        {TRIGGERED_BY_LABELS[job.triggered_by] ?? job.triggered_by}
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
                            "重试"
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
                    共 {data.total} 条，第 {page} 页
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * PAGE_SIZE >= data.total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
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
