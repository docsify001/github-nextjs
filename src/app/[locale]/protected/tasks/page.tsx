'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Square, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/components/notification';
import { ErrorHandler } from '@/lib/error/error-handler';

interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  cronExpression?: string;
  isEnabled: boolean;
  isDaily: boolean;
  isMonthly: boolean;
  taskType: string;
  status?: {
    isRunning: boolean;
    lastRunAt?: string;
    nextRunAt?: string;
    lastExecutionId?: string;
  };
  recentExecutions?: TaskExecution[];
}

interface TaskExecution {
  id: string;
  taskDefinitionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  result?: any;
  error?: string;
  logs?: string;
  triggeredBy: 'system' | 'manual';
  createdAt: string;
}

export default function TasksPage() {
  const t = useTranslations('Tasks');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/tasks');

      if (response.status === 401) {
        const errorInfo = ErrorHandler.handleAuthError({ message: t('authFailed') });
        addNotification({
          type: errorInfo.type,
          title: errorInfo.title,
          message: errorInfo.message,
          action: errorInfo.action,
        });
        setError(t('authFailed'));
        router.push('/auth/login');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setTasks(data.data);
        // 更新运行中的任务
        const running = new Set<string>();
        data.data.forEach((task: TaskDefinition) => {
          if (task.status?.isRunning) {
            running.add(task.id);
          }
        });
        setRunningTasks(running);
      } else {
        const errorInfo = ErrorHandler.handleApiError({ message: data.error }, t('failedToFetch'));
        addNotification({
          type: errorInfo.type,
          title: errorInfo.title,
          message: errorInfo.message,
          action: errorInfo.action,
        });
        setError(data.error || t('failedToFetch'));
      }
    } catch (err) {
      const errorInfo = ErrorHandler.handleApiError(err, t('failedToFetch'));
      addNotification({
        type: errorInfo.type,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
      });
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const executeTask = async (taskId: string) => {
    try {
      setRunningTasks(prev => new Set(prev).add(taskId));

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDefinitionId: taskId, triggeredBy: 'manual' }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to execute task');
      }

      // 刷新任务列表
      await fetchTasks();
    } catch (err) {
      console.error('Error executing task:', err);
      setRunningTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const stopTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/stop`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to stop task');
      }

      setRunningTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      // 刷新任务列表
      await fetchTasks();
    } catch (err) {
      console.error('Error stopping task:', err);
    }
  };

  const toggleTask = async (taskId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to toggle task');
      }

      // 更新本地状态
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, isEnabled: enabled } : task
      ));
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 显示认证加载状态
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex min-h-[16rem] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="text-sm sm:text-base">{t('authLoading')}</div>
          </div>
        </div>
      </div>
    );
  }

  // 显示认证错误
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex min-h-[16rem] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {t('needLogin')}
              </CardTitle>
              <CardDescription>
                {t('needLoginDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                {t('goLogin')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex min-h-[16rem] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="text-sm sm:text-base">{t('loadingList')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex min-h-[16rem] items-center justify-center px-2">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {t('loadFailed')}
              </CardTitle>
              <CardDescription>
                {t('loadFailed')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-red-600">{error}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={fetchTasks}
                    className="flex-1 sm:flex-initial"
                  >
                    {t('retry')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/auth/login')}
                    className="flex-1 sm:flex-initial"
                  >
                    {t('relogin')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                    <span className="break-words">{task.name}</span>
                    <Badge variant={task.isDaily ? 'default' : 'secondary'} className="shrink-0">
                      {task.isDaily ? t('daily') : task.isMonthly ? t('monthly') : t('custom')}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2 sm:line-clamp-none">
                    {task.description}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`toggle-${task.id}`}
                      checked={task.isEnabled}
                      onCheckedChange={(enabled) => toggleTask(task.id, enabled)}
                    />
                    <Label htmlFor={`toggle-${task.id}`} className="text-sm">
                      {task.isEnabled ? t('enabled') : t('disabled')}
                    </Label>
                  </div>
                  {runningTasks.has(task.id) ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => stopTask(task.id)}
                      className="shrink-0"
                    >
                      <Square className="h-4 w-4 shrink-0 sm:mr-2" />
                      {t('stop')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => executeTask(task.id)}
                      disabled={!task.isEnabled}
                      className="shrink-0"
                    >
                      <Play className="h-4 w-4 shrink-0 sm:mr-2" />
                      {t('execute')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">{t('taskInfo')}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>{t('type')}: {task.taskType}</div>
                    <div className="break-all">{t('schedule')}: {task.cronExpression || t('manualTrigger')}</div>
                    <div>{t('status')}: {task.status?.isRunning ? t('statusRunning') : t('statusIdle')}</div>
                    <div className="truncate sm:whitespace-normal">{t('lastRun')}: {formatDate(task.status?.lastRunAt)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">{t('execHistory')}</h4>
                  <div className="space-y-2">
                    {task.recentExecutions && task.recentExecutions.length > 0 ? (
                      task.recentExecutions.map((execution) => (
                        <div
                          key={execution.id}
                          className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            <span className="capitalize">{execution.status}</span>
                          </div>
                          <span className="text-muted-foreground">{formatDuration(execution.duration)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">{t('noExecutions')}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}