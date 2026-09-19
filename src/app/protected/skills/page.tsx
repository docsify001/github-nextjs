"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface SkillSyncItem {
  id: string;
  project_id: string;
  skill_dir: string;
  name: string;
  description: string;
  version: string | null;
  synced_to_web_at: string | null;
  last_sync_error: string | null;
  last_sync_attempt_at: string | null;
  created_at: string;
  updated_at: string | null;
  project_name: string;
  project_slug: string;
  repo_full_name: string;
}

interface ListResponse {
  items: SkillSyncItem[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
}

const PAGE_SIZE = 20;

export default function SkillsSyncPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  const [tab, setTab] = useState<string>("all");
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
        `/api/project-skills?status=${tab}&page=${page}&pageSize=${PAGE_SIZE}`,
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
      const errInfo = ErrorHandler.handleApiError(err, "获取 Skill 同步状态");
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
  }, [tab, page, router, addNotification]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRetry = async (skillId: string) => {
    setRetryingId(skillId);
    try {
      const res = await fetch(`/api/project-skills/${skillId}/retry`, {
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
        message: "任务已在后台重新同步，请稍后刷新列表查看结果",
      });
      setTimeout(() => fetchList(), 2000);
    } finally {
      setRetryingId(null);
    }
  };

  const statusBadge = (item: SkillSyncItem) => {
    if (item.last_sync_error) {
      return <Badge variant="destructive">失败</Badge>;
    }
    if (item.synced_to_web_at) {
      return <Badge variant="default">已同步</Badge>;
    }
    return <Badge variant="secondary">待处理</Badge>;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("zh-CN");
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Skills 同步状态</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看各 Skill 与 Web 端的同步情况，可手动重试失败项。
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="failed">失败</TabsTrigger>
          <TabsTrigger value="pending">待处理</TabsTrigger>
          <TabsTrigger value="synced">已同步</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Skill 同步记录</CardTitle>
          <CardDescription>
            同步成功意味着已推送到 Web 端可从 skills hub 获取。
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
            <p className="text-muted-foreground py-8 text-center">暂无记录</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目 / 仓库</TableHead>
                      <TableHead>Skill</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最后同步</TableHead>
                      <TableHead>错误信息</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="min-w-0">
                          <div className="font-medium">{item.project_name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {item.repo_full_name}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0">
                          <div className="font-medium">{item.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {item.skill_dir}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(item)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatTime(item.synced_to_web_at ?? item.last_sync_attempt_at)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {item.last_sync_error ? (
                            <div>
                              <button
                                type="button"
                                className="flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setExpandedErrorId((id) =>
                                    id === item.id ? null : item.id
                                  )
                                }
                              >
                                {expandedErrorId === item.id ? (
                                  <ChevronUp className="size-4 shrink-0" />
                                ) : (
                                  <ChevronDown className="size-4 shrink-0" />
                                )}
                                <span className="line-clamp-2">{item.last_sync_error}</span>
                              </button>
                              {expandedErrorId === item.id && (
                                <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                                  {item.last_sync_error}
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
                            disabled={retryingId === item.id}
                            onClick={() => handleRetry(item.id)}
                          >
                            {retryingId === item.id ? (
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
              </div>
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