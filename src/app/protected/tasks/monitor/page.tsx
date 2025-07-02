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
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
      
      // 获取调度器状态
      const schedulerResponse = await fetch('/api/croner-scheduler');
      if (schedulerResponse.ok) {
        const schedulerData = await schedulerResponse.json();
        if (schedulerData.success) {
          setSchedulerStatus(schedulerData.data.cronScheduler);
          setSchedulerRunning(schedulerData.data.cronScheduler.isRunning);
          setTasks(schedulerData.data.tasks);
          
          // 更新运行中的任务
          const running = new Set<string>();
          schedulerData.data.tasks.forEach((task: TaskDefinition) => {
            if (task.isCurrentlyRunning) {
              running.add(task.id);
            }
          });
          setRunningTasks(running);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorInfo = ErrorHandler.handleApiError(err, '获取监控数据');
      addNotification({
        type: errorInfo.type,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
      });
      setError('网络错误，请检查连接');
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
          title: '调度器启动成功',
          message: '定时任务调度器已启动',
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
        title: '启动失败',
        message: '无法启动调度器',
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
          title: '调度器停止成功',
          message: '定时任务调度器已停止',
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
        title: '停止失败',
        message: '无法停止调度器',
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
          title: '任务重载成功',
          message: '任务配置已重新加载',
        });
        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to reload tasks');
      }
    } catch (err) {
      console.error('Error reloading tasks:', err);
      addNotification({
        type: 'error',
        title: '重载失败',
        message: '无法重载任务配置',
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
        title: '任务执行成功',
        message: `任务已开始执行 (ID: ${data.data.executionId})`,
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
        title: '执行失败',
        message: '无法执行任务',
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
        title: '任务停止成功',
        message: '任务已停止执行',
      });
      
      await fetchData();
    } catch (err) {
      console.error('Error stopping task:', err);
      addNotification({
        type: 'error',
        title: '停止失败',
        message: '无法停止任务',
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
        title: '状态更新成功',
        message: `任务已${enabled ? '启用' : '禁用'}`,
      });
    } catch (err) {
      console.error('Error toggling task:', err);
      addNotification({
        type: 'error',
        title: '更新失败',
        message: '无法更新任务状态',
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
        return '每天凌晨2点';
      } else if (minute === '0' && hour === '3' && day === '1' && month === '*' && weekday === '*') {
        return '每月1号凌晨3点';
      } else if (minute === '0' && hour === '3' && day === '*' && month === '*' && weekday === '1') {
        return '每周一凌晨3点';
      } else if (minute === '0' && hour === '4' && day === '*' && month === '*' && weekday === '*') {
        return '每天凌晨4点';
      }
    }
    
    return cronExpression;
  };

  // 显示认证加载状态
  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-8 w-8 animate-spin" />
            <div className="text-lg">验证认证状态...</div>
          </div>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="text-lg text-red-600">{error}</div>
            <Button onClick={fetchData}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">任务监控中心</h1>
          <p className="text-muted-foreground">实时监控和管理定时任务</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh">自动刷新</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 调度器状态卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            调度器状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={schedulerRunning ? "default" : "secondary"}>
                {schedulerRunning ? "运行中" : "已停止"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                已调度任务: {schedulerStatus?.taskCount || 0} 个
              </span>
              <span className="text-sm text-muted-foreground">
                运行中任务: {schedulerStatus?.runningTasks.length || 0} 个
              </span>
            </div>
            <div className="flex gap-2">
              {schedulerRunning ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopScheduler}
                >
                  <Square className="h-4 w-4 mr-2" />
                  停止调度器
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startScheduler}
                >
                  <Play className="h-4 w-4 mr-2" />
                  启动调度器
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={reloadTasks}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重载任务
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部任务 ({tasks.length})</TabsTrigger>
          <TabsTrigger value="daily">每日任务 ({tasks.filter(t => t.isDaily).length})</TabsTrigger>
          <TabsTrigger value="weekly">每周任务 ({tasks.filter(t => t.isWeekly).length})</TabsTrigger>
          <TabsTrigger value="monthly">每月任务 ({tasks.filter(t => t.isMonthly).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TaskList 
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
function TaskList({ 
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
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">暂无任务</p>
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
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getTaskTypeIcon(task.taskType)}
                  <div>
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {task.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={task.isEnabled ? "default" : "secondary"}>
                    {task.isEnabled ? "已启用" : "已禁用"}
                  </Badge>
                  {isRunning && (
                    <Badge variant="destructive" className="animate-pulse">
                      运行中
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">定时表达式</p>
                  <p className="text-sm">{formatCronExpression(task.cronExpression)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">上次执行</p>
                  <p className="text-sm">{formatDate(task.status?.lastRunAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">下次执行</p>
                  <p className="text-sm">{formatDate(task.status?.nextRunAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">最新状态</p>
                  <div className="flex items-center gap-2">
                    {latestExecution && getStatusIcon(latestExecution.status)}
                    <span className="text-sm">
                      {latestExecution ? latestExecution.status : '未执行'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 最新执行记录 */}
              {latestExecution && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">最新执行记录</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">开始时间:</span>
                      <span className="ml-2">{formatDate(latestExecution.startedAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">执行时长:</span>
                      <span className="ml-2">{formatDuration(latestExecution.duration)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">触发方式:</span>
                      <span className="ml-2">{latestExecution.triggeredBy === 'system' ? '系统' : '手动'}</span>
                    </div>
                  </div>
                  {latestExecution.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <p className="font-medium">错误信息:</p>
                      <p>{latestExecution.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`task-${task.id}`}
                    checked={task.isEnabled}
                    onCheckedChange={(enabled) => onToggle(task.id, enabled)}
                  />
                  <Label htmlFor={`task-${task.id}`}>启用任务</Label>
                </div>
                <div className="flex gap-2">
                  {isRunning ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onStop(task.id)}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      停止
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onExecute(task.id)}
                      disabled={!task.isEnabled}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      执行
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
