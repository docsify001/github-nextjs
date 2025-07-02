'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Square, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tasks');
      
      if (response.status === 401) {
        const errorInfo = ErrorHandler.handleAuthError({ message: '认证失败' });
        addNotification({
          type: errorInfo.type,
          title: errorInfo.title,
          message: errorInfo.message,
          action: errorInfo.action,
        });
        setError('认证失败，请重新登录');
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
        const errorInfo = ErrorHandler.handleApiError({ message: data.error }, '获取任务列表');
        addNotification({
          type: errorInfo.type,
          title: errorInfo.title,
          message: errorInfo.message,
          action: errorInfo.action,
        });
        setError(data.error || '获取任务列表失败');
      }
    } catch (err) {
      const errorInfo = ErrorHandler.handleApiError(err, '获取任务列表');
      addNotification({
        type: errorInfo.type,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
      });
      setError('网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
  };

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

  // 显示认证错误
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                需要登录
              </CardTitle>
              <CardDescription>
                您需要登录才能访问任务管理页面
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                前往登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-8 w-8 animate-spin" />
            <div className="text-lg">加载任务列表...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                加载失败
              </CardTitle>
              <CardDescription>
                无法加载任务列表
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-red-600">{error}</p>
                <div className="flex gap-2">
                  <Button 
                    onClick={fetchTasks}
                    className="flex-1"
                  >
                    重试
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/auth/login')}
                    className="flex-1"
                  >
                    重新登录
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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">任务管理</h1>
        <p className="text-gray-600 mt-2">管理定时任务的执行和状态</p>
      </div>

      <div className="grid gap-6">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {task.name}
                    <Badge variant={task.isDaily ? 'default' : 'secondary'}>
                      {task.isDaily ? '每日' : task.isMonthly ? '每月' : '自定义'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{task.description}</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`toggle-${task.id}`}
                      checked={task.isEnabled}
                      onCheckedChange={(enabled) => toggleTask(task.id, enabled)}
                    />
                    <Label htmlFor={`toggle-${task.id}`}>
                      {task.isEnabled ? '启用' : '禁用'}
                    </Label>
                  </div>
                  
                  {runningTasks.has(task.id) ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => stopTask(task.id)}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      停止
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => executeTask(task.id)}
                      disabled={!task.isEnabled}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      执行
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">任务信息</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>类型: {task.taskType}</div>
                    <div>定时: {task.cronExpression || '手动触发'}</div>
                    <div>状态: {task.status?.isRunning ? '运行中' : '空闲'}</div>
                    <div>上次执行: {formatDate(task.status?.lastRunAt)}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">最近执行记录</h4>
                  <div className="space-y-2">
                    {task.recentExecutions && task.recentExecutions.length > 0 ? (
                      task.recentExecutions.map((execution) => (
                        <div key={execution.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            <span className="capitalize">{execution.status}</span>
                          </div>
                          <div className="text-gray-500">
                            {formatDuration(execution.duration)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">暂无执行记录</div>
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