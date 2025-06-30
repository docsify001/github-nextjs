'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Square, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
      const response = await fetch('/api/tasks');
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
        setError(data.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      setError('Failed to fetch tasks');
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">错误: {error}</div>
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