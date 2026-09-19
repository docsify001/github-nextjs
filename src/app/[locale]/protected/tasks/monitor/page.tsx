'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  AlertTriangle,
  RefreshCw,
  Settings,
  Activity,
  Calendar,
  Zap,
  Info,
  RotateCcw,
  FileText,
  GitPullRequest
} from 'lucide-react';
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
  isWeekly: boolean;
  taskType: string;
  status?: {
    isRunning: boolean;
    lastRunAt?: string;
    nextRunAt?: string;
    lastExecutionId?: string;
  };
  recentExecutions?: TaskExecution[];
  isCurrentlyRunning?: boolean;
}

interface TaskExecution {
  id: string;
  taskDefinitionId: string;
  taskName?: string;
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

interface SchedulerStatus {
  isRunning: boolean;
  scheduledTasks: string[];
  taskCount: number;
  runningTasks: string[];
}

export default function TaskMonitorPage() {
  const t = useTranslations('Tasks');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<TaskExecution[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [readmeFailCount, setReadmeFailCount] = useState(0);
  const [projectFailCount, setProjectFailCount] = useState(0);

  useEffect(() => {
    fetchData();
    
    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // 每5秒刷新一次
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      setError(null);
      
      // 获取任务列表与最近执行记录（DB 驱动，反映 Vercel Cron 与本地调度器的真实状态）
      const tasksResponse = await fetch('/api/tasks');
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        if (tasksData.success) {
          setTasks(tasksData.data.tasks);
          setRecentExecutions(tasksData.data.recentExecutions || []);

          // 更新运行中的任务
          const running = new Set<string>();
          tasksData.data.tasks.forEach((task: TaskDefinition) => {
            if (task.isCurrentlyRunning) {
              running.add(task.id);
            }
          });
          setRunningTasks(running);
        }
      }
      
      // 获取本地调度器状态（生产环境为 Vercel Cron，此处仅用于展示/手动控制）
      const schedulerResponse = await fetch('/api/croner-scheduler');
      if (schedulerResponse.ok) {
        const schedulerData = await schedulerResponse.json();
        if (schedulerData.success) {
          setSchedulerStatus(schedulerData.data.cronScheduler);
          setSchedulerRunning(schedulerData.data.cronScheduler.isRunning);
        }
      }

      // 获取同步失败任务计数（README / 项目同步均为耗时任务，失败需要人工处理）
      const [readmeRes, projectRes] = await Promise.all([
        fetch('/api/readme-sync-jobs?status=failed&page=1&pageSize=1'),
        fetch('/api/project-sync-jobs?status=failed&page=1&pageSize=1'),
      ]);
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        setReadmeFailCount(readmeData.total ?? 0);
      }
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProjectFailCount(projectData.total ?? 0);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorInfo = ErrorHandler.handleApiError(err, t('failedToFetch'));
      addNotification({
        type: errorInfo.type,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
      });
      setError(t('networkError'));
      setLoading(false);
    }
  };

  const startScheduler = async () => {
    try {
      const response = await fetch('/api/croner-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addNotification({
          type: 'success',
          title: t('toasts.schedulerStartedTitle'),
          message: t('toasts.schedulerStartedMsg'),
        });
        setSchedulerRunning(true);
        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to start scheduler');
      }
    } catch (err) {
      console.error('Error starting scheduler:', err);
      addNotification({
        type: 'error',
        title: t('toasts.failTitle'),
        message: t('toasts.failMsg'),
      });
    }
  };

  const stopScheduler = async () => {
    try {
      const response = await fetch('/api/croner-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addNotification({
          type: 'success',
          title: t('toasts.schedulerStopTitle'),
          message: t('toasts.schedulerStopMsg'),
        });
        setSchedulerRunning(false);
        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to stop scheduler');
      }
    } catch (err) {
      console.error('Error stopping scheduler:', err);
      addNotification({
        type: 'error',
        title: t('toasts.stopFailTitle'),
        message: t('toasts.stopFailMsg'),
      });
    }
  };

  const reloadTasks = async () => {
    try {
      const response = await fetch('/api/croner-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reload' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addNotification({
          type: 'success',
          title: t('toasts.reloadTitle'),
          message: t('toasts.reloadMsg'),
        });
        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to reload tasks');
      }
    } catch (err) {
      console.error('Error reloading tasks:', err);
      addNotification({
        type: 'error',
        title: t('toasts.reloadFailTitle'),
        message: t('toasts.reloadFailMsg'),
      });
    }
  };

  const executeTask = async (taskId: string) => {
    try {
      setRunningTasks(prev => new Set(prev).add(taskId));
      
      const response = await fetch('/api/croner-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', taskId }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to execute task');
      }
      
      addNotification({
        type: 'success',
        title: t('toasts.execTitle'),
        message: t('toasts.execMsg', { id: data.data.executionId }),
      });
      
      // 刷新数据
      await fetchData();
    } catch (err) {
      console.error('Error executing task:', err);
      setRunningTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      addNotification({
        type: 'error',
        title: t('toasts.execFailTitle'),
        message: t('toasts.execFailMsg'),
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
      
      addNotification({
        type: 'success',
        title: t('toasts.stopTitle'),
        message: t('toasts.stopMsg'),
      });
      
      await fetchData();
    } catch (err) {
      console.error('Error stopping task:', err);
      addNotification({
        type: 'error',
        title: t('toasts.stopExecFailTitle'),
        message: t('toasts.stopExecFailMsg'),
      });
    }
  };

  const toggleTask = async (taskId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/croner-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', taskId, enabled }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to toggle task');
      }
      
      // 更新本地状态
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, isEnabled: enabled } : task
      ));
      
      addNotification({
        type: 'success',
        title: t('toasts.toggleTitle'),
        message: t('toasts.toggleMsg', { state: enabled ? t('enabled') : t('disabled') }),
      });
    } catch (err) {
      console.error('Error toggling task:', err);
      addNotification({
        type: 'error',
        title: t('toasts.toggleFailTitle'),
        message: t('toasts.toggleFailMsg'),
      });
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

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'daily':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'weekly':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'monthly':
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
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

  const formatCronExpression = (cronExpression?: string) => {
    if (!cronExpression) return '-';
    
    const parts = cronExpression.split(' ');
    if (parts.length === 5) {
      const [minute, hour, day, month, weekday] = parts;
      
      if (minute === '0' && hour === '2' && day === '*' && month === '*' && weekday === '*') {
        return t('cronDaily2');
      } else if (minute === '0' && hour === '3' && day === '1' && month === '*' && weekday === '*') {
        return t('cronMonthly3');
      } else if (minute === '0' && hour === '3' && day === '*' && month === '*' && weekday === '1') {
        return t('cronWeekly3');
      } else if (minute === '0' && hour === '4' && day === '*' && month === '*' && weekday === '*') {
        return t('cronDaily4');
      }
    }
    
    return cronExpression;
  };

  const failedExecutionsCount = recentExecutions.filter(
    (exec) => exec.status === 'failed'
  ).length;

  // 显示认证加载状态
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex min-h-[16rem] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="text-sm sm:text-base">{t("authLoading")}</div>
          </div>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex min-h-[16rem] items-center justify-center">
          <div className="flex flex-col items-center gap-4 px-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="text-center text-sm text-red-600 sm:text-base">{error}</div>
            <Button onClick={fetchData}>{t("retry")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("monitorTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("monitorSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm">{t("autoRefresh")}</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* 调度器状态卡片 */}
      <Card className="mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Activity className="h-5 w-5 shrink-0" />
            {t("schedulerTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 gap-y-1 sm:gap-4">
              <Badge variant={schedulerRunning ? "default" : "secondary"} className="shrink-0">
                {schedulerRunning ? t("schedulerRunning") : t("schedulerStopped")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("scheduledTasks", { count: schedulerStatus?.taskCount || 0 })}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("runningTasks", { count: runningTasks.size })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {schedulerRunning ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopScheduler}
                  className="shrink-0"
                >
                  <Square className="h-4 w-4 sm:mr-2" />
                  {t("stopScheduler")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startScheduler}
                  className="shrink-0"
                >
                  <Play className="h-4 w-4 sm:mr-2" />
                  {t("startScheduler")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={reloadTasks}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                {t("reloadTasks")}
              </Button>
            </div>
          </div>
          {!schedulerRunning && (
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {t("vercelCronNote")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 最近执行记录 / 失败任务 */}
      <Card className="mb-6" id="recent-executions">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {t("recentExecutionsTitle")}
          </CardTitle>
          <CardDescription>
            {t("recentExecutionsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentExecutions.length === 0 ? (
            <div className="flex min-h-[6rem] items-center justify-center">
              <p className="text-sm text-muted-foreground sm:text-base">{t("noExecutions")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentExecutions.slice(0, 15).map((execution) => {
                const isFailed = execution.status === 'failed';
                const isRunningExec = execution.status === 'running' || execution.status === 'pending';
                return (
                  <div
                    key={execution.id}
                    className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                      isFailed
                        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                        : isRunningExec
                          ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                          : ''
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 shrink-0">{getStatusIcon(execution.status)}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{execution.taskName || execution.taskDefinitionId}</p>
                          <span className="text-xs text-muted-foreground">
                            {execution.triggeredBy === 'system' ? t("triggeredBySystem") : t("triggeredByManual")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(execution.startedAt || execution.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{execution.status}</span>
                          <span>·</span>
                          <span>{t("duration")}: {formatDuration(execution.duration)}</span>
                        </div>
                        {execution.error && (
                          <p className="mt-1 line-clamp-2 w-full break-words text-xs text-red-600 dark:text-red-400">
                            {execution.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isFailed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => executeTask(execution.taskDefinitionId)}
                          className="shrink-0"
                        >
                          <RotateCcw className="h-4 w-4 sm:mr-2" />
                          {t("retry")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* 失败任务处理指引 / 快捷入口 */}
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {t("howToHandleTitle")}
                {failedExecutionsCount > 0 && (
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                    （{t("failedExecutions", { count: failedExecutionsCount })}）
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
                {t("howToHandleDesc")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/protected/readme-sync-failures')}
                className="shrink-0 border-red-300 bg-white/70 hover:bg-white dark:border-red-800 dark:bg-red-950/40 dark:hover:bg-red-950/60"
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                {t("viewReadmeFailures")}
                {readmeFailCount > 0 && <Badge variant="destructive" className="ml-2">{readmeFailCount}</Badge>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/protected/project-sync-failures')}
                className="shrink-0 border-red-300 bg-white/70 hover:bg-white dark:border-red-800 dark:bg-red-950/40 dark:hover:bg-red-950/60"
              >
                <GitPullRequest className="h-4 w-4 sm:mr-2" />
                {t("viewProjectFailures")}
                {projectFailCount > 0 && <Badge variant="destructive" className="ml-2">{projectFailCount}</Badge>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto rounded-lg p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="all" className="shrink-0">{t("allTasks", { count: tasks.length })}</TabsTrigger>
          <TabsTrigger value="daily" className="shrink-0">{t("dailyTasks", { count: tasks.filter(tt => tt.isDaily).length })}</TabsTrigger>
          <TabsTrigger value="weekly" className="shrink-0">{t("weeklyTasks", { count: tasks.filter(tt => tt.isWeekly).length })}</TabsTrigger>
          <TabsTrigger value="monthly" className="shrink-0">{t("monthlyTasks", { count: tasks.filter(tt => tt.isMonthly).length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TaskList 
            t={t}
            tasks={tasks}
            runningTasks={runningTasks}
            onExecute={executeTask}
            onStop={stopTask}
            onToggle={toggleTask}
            getStatusIcon={getStatusIcon}
            getTaskTypeIcon={getTaskTypeIcon}
            formatDuration={formatDuration}
            formatDate={formatDate}
            formatCronExpression={formatCronExpression}
          />
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <TaskList 
            t={t}
            tasks={tasks.filter(t => t.isDaily)}
            runningTasks={runningTasks}
            onExecute={executeTask}
            onStop={stopTask}
            onToggle={toggleTask}
            getStatusIcon={getStatusIcon}
            getTaskTypeIcon={getTaskTypeIcon}
            formatDuration={formatDuration}
            formatDate={formatDate}
            formatCronExpression={formatCronExpression}
          />
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <TaskList 
            t={t}
            tasks={tasks.filter(t => t.isWeekly)}
            runningTasks={runningTasks}
            onExecute={executeTask}
            onStop={stopTask}
            onToggle={toggleTask}
            getStatusIcon={getStatusIcon}
            getTaskTypeIcon={getTaskTypeIcon}
            formatDuration={formatDuration}
            formatDate={formatDate}
            formatCronExpression={formatCronExpression}
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <TaskList 
            t={t}
            tasks={tasks.filter(t => t.isMonthly)}
            runningTasks={runningTasks}
            onExecute={executeTask}
            onStop={stopTask}
            onToggle={toggleTask}
            getStatusIcon={getStatusIcon}
            getTaskTypeIcon={getTaskTypeIcon}
            formatDuration={formatDuration}
            formatDate={formatDate}
            formatCronExpression={formatCronExpression}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 任务列表组件
function TaskList({ t, 
  tasks, 
  runningTasks, 
  onExecute, 
  onStop, 
  onToggle,
  getStatusIcon,
  getTaskTypeIcon,
  formatDuration,
  formatDate,
  formatCronExpression
}: {
  t: ReturnType<typeof useTranslations<'Tasks'>>;
  tasks: TaskDefinition[];
  runningTasks: Set<string>;
  onExecute: (taskId: string) => void;
  onStop: (taskId: string) => void;
  onToggle: (taskId: string, enabled: boolean) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getTaskTypeIcon: (taskType: string) => React.ReactNode;
  formatDuration: (duration?: number) => string;
  formatDate: (dateString?: string) => string;
  formatCronExpression: (cronExpression?: string) => string;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[8rem] items-center justify-center py-8">
          <p className="text-sm text-muted-foreground sm:text-base">{t("noTasks")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {tasks.map((task) => {
        const isRunning = runningTasks.has(task.id);
        const latestExecution = task.recentExecutions?.[0];

        return (
          <Card key={task.id} className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="space-y-3 pb-3 sm:pb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="shrink-0">{getTaskTypeIcon(task.taskType)}</span>
                  <div className="min-w-0">
                    <CardTitle className="break-words text-base sm:text-lg">{task.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2 sm:line-clamp-none">
                      {task.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <Badge variant={task.isEnabled ? "default" : "secondary"}>
                    {task.isEnabled ? t("enabled") : t("disabled")}
                  </Badge>
                  {isRunning && (
                    <Badge variant="destructive" className="animate-pulse">
                      {t("statusRunning")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t("schedule")}</p>
                  <p className="break-words text-sm">{formatCronExpression(task.cronExpression)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t("lastRun")}</p>
                  <p className="truncate text-sm sm:whitespace-normal">{formatDate(task.status?.lastRunAt)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t("nextRun")}</p>
                  <p className="truncate text-sm sm:whitespace-normal">{formatDate(task.status?.nextRunAt)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t("latestStatus")}</p>
                  <div className="flex items-center gap-2">
                    {latestExecution && getStatusIcon(latestExecution.status)}
                    <span className="text-sm">
                      {latestExecution ? latestExecution.status : t("notExecuted")}
                    </span>
                  </div>
                </div>
              </div>

              {/* 最新执行记录 */}
              {latestExecution && (
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{t("execHistory")}</p>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t("startedAt")}:</span>
                      <span className="ml-2 break-words">{formatDate(latestExecution.startedAt)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t("duration")}:</span>
                      <span className="ml-2">{formatDuration(latestExecution.duration)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t("triggeredBy")}:</span>
                      <span className="ml-2">{latestExecution.triggeredBy === "system" ? t("triggeredBySystem") : t("triggeredByManual")}</span>
                    </div>
                  </div>
                  {latestExecution.error && (
                    <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                      <p className="font-medium">{t("errorMessage")}:</p>
                      <p className="break-words">{latestExecution.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`task-${task.id}`}
                    checked={task.isEnabled}
                    onCheckedChange={(enabled) => onToggle(task.id, enabled)}
                  />
                  <Label htmlFor={`task-${task.id}`} className="text-sm">{t("toggleEnable")}</Label>
                </div>
                <div className="flex gap-2">
                  {isRunning ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onStop(task.id)}
                      className="shrink-0"
                    >
                      <Square className="h-4 w-4 sm:mr-2" />
                      {t("stop")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onExecute(task.id)}
                      disabled={!task.isEnabled}
                      className="shrink-0"
                    >
                      <Play className="h-4 w-4 sm:mr-2" />
                      {t("execute")}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
