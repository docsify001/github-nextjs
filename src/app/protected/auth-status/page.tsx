'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useApiClient } from "@/lib/api/api-client";
import { useNotification } from "@/components/notification";
import { ErrorHandler } from "@/lib/error/error-handler";
import { useState } from "react";

export default function AuthStatusPage() {
  const { user, loading, error: authError } = useAuth();
  const apiClient = useApiClient();
  const { addNotification } = useNotification();
  const [testResults, setTestResults] = useState<{
    tasks?: { success: boolean; message: string };
    scheduler?: { success: boolean; message: string };
    error?: { success: boolean; message: string };
  }>({});

  const testTasksApi = async () => {
    const result = await apiClient.get('/api/tasks');
    setTestResults(prev => ({
      ...prev,
      tasks: {
        success: result.success,
        message: result.success ? 'API 调用成功！认证正常工作。' : result.error || 'API 调用失败'
      }
    }));
  };

  const testSchedulerApi = async () => {
    const result = await apiClient.get('/api/scheduler/status');
    setTestResults(prev => ({
      ...prev,
      scheduler: {
        success: result.success,
        message: result.success ? '调度器状态 API 调用成功！认证正常工作。' : result.error || '调度器状态 API 调用失败'
      }
    }));
  };

  const testErrorHandling = async () => {
    try {
      // 故意触发一个错误
      throw new Error('这是一个测试错误，用于验证错误处理系统');
    } catch (error) {
      const errorInfo = ErrorHandler.handleGenericError(error, '测试操作');
      addNotification({
        type: errorInfo.type,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
      });
      
      setTestResults(prev => ({
        ...prev,
        error: {
          success: false,
          message: '错误处理测试完成，请查看右上角的通知'
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-lg">验证认证状态...</p>
          </div>
        </div>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">认证失败</CardTitle>
            <CardDescription>
              {authError || '用户未登录'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/auth/login'}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">认证状态</h1>
        <Badge variant="outline" className="text-green-600 border-green-600">
          已认证
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户信息</CardTitle>
          <CardDescription>当前登录用户的详细信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">用户ID</label>
                <p className="text-sm">{user.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">邮箱</label>
                <p className="text-sm">{user.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">创建时间</label>
              <p className="text-sm">{new Date(user.created_at).toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">最后登录</label>
              <p className="text-sm">{new Date(user.last_sign_in_at || user.created_at).toLocaleString('zh-CN')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API 测试</CardTitle>
          <CardDescription>测试 API 接口的认证功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">测试任务列表 API</h4>
              <p className="text-sm text-gray-600 mb-2">
                点击下面的按钮测试任务列表 API 的认证功能
              </p>
              <Button 
                onClick={testTasksApi}
                className="mb-2"
              >
                测试任务列表 API
              </Button>
              {testResults.tasks && (
                <div className={`p-2 rounded text-sm ${testResults.tasks.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResults.tasks.message}
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">测试调度器状态 API</h4>
              <p className="text-sm text-gray-600 mb-2">
                点击下面的按钮测试调度器状态 API 的认证功能
              </p>
              <Button 
                onClick={testSchedulerApi}
                className="mb-2"
              >
                测试调度器状态 API
              </Button>
              {testResults.scheduler && (
                <div className={`p-2 rounded text-sm ${testResults.scheduler.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResults.scheduler.message}
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">测试错误处理</h4>
              <p className="text-sm text-gray-600 mb-2">
                点击下面的按钮测试错误处理系统
              </p>
              <Button 
                onClick={testErrorHandling}
                className="mb-2"
              >
                测试错误处理
              </Button>
              {testResults.error && (
                <div className={`p-2 rounded text-sm ${testResults.error.success ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {testResults.error.message}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>认证说明</CardTitle>
          <CardDescription>当前系统的认证机制</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">页面级认证</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>/protected 目录下的所有页面都需要登录才能访问</li>
                <li>未登录用户会被自动重定向到登录页面</li>
                <li>使用 Supabase session 进行用户验证</li>
                <li>认证状态实时更新，支持自动刷新</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">API 级认证</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>所有 API 接口都需要认证才能访问</li>
                <li>支持两种认证方式：</li>
                <li className="ml-4">1. Session 认证（通过 Supabase session）</li>
                <li className="ml-4">2. API Key 认证（通过 x-api-key 头部）</li>
                <li>未认证的请求会返回 401 错误</li>
                <li>统一的错误处理和状态管理</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">状态管理</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>全局认证状态管理</li>
                <li>自动处理认证状态变化</li>
                <li>优雅的错误处理和用户提示</li>
                <li>支持认证状态实时同步</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">Webhook 接口</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>/api/webhook/* 接口不需要用户认证</li>
                <li>这些接口由外部系统调用，通常用于定时任务</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}