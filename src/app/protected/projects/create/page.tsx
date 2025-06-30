'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createConsola } from 'consola';

const logger = createConsola();

export default function CreateProjectPage() {
  const [githubUrl, setGithubUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!githubUrl) {
      setError('GitHub URL is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubUrl,
          webhookUrl: webhookUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        logger.success('Project created successfully:', data);
      } else {
        setError(data.error || 'Failed to create project');
        logger.error('Failed to create project:', data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Error creating project:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">创建新项目</h1>
        <p className="text-gray-600 mt-2">根据GitHub URL创建新项目并异步获取数据</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
          <CardDescription>
            输入GitHub仓库URL来创建新项目。系统会自动获取项目数据并通过webhook回传。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="githubUrl">GitHub URL *</Label>
              <Input
                id="githubUrl"
                type="url"
                placeholder="https://github.com/owner/repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="webhookUrl">Webhook URL (可选)</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://your-webhook-url.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                如果提供，项目数据将通过此URL异步发送
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? '创建中...' : '创建项目'}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">项目创建成功</h3>
              <div className="space-y-2 text-sm">
                <p><strong>项目ID:</strong> {result.data.project.id}</p>
                <p><strong>项目名称:</strong> {result.data.project.name}</p>
                <p><strong>项目Slug:</strong> {result.data.project.slug}</p>
                <p><strong>状态:</strong> {result.data.project.status}</p>
                <p><strong>消息:</strong> {result.data.message}</p>
                <p><strong>Webhook:</strong> {result.data.webhookUrl}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">API端点</h4>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                POST /api/projects/create
              </code>
            </div>

            <div>
              <h4 className="font-semibold">请求体</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
{`{
  "githubUrl": "https://github.com/owner/repo",
  "webhookUrl": "https://your-webhook-url.com/webhook" // 可选
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">响应格式</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "project": {
      "id": "project-id",
      "name": "project-name",
      "slug": "project-slug",
      "status": "created"
    },
    "message": "Project created successfully...",
    "webhookUrl": "Will be sent asynchronously"
  }
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">Webhook数据格式</h4>
              <p className="text-sm text-gray-600">
                如果提供了webhook URL，系统会异步发送包含完整项目数据的POST请求，包括：
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-2">
                <li>项目基本信息（ID、名称、描述等）</li>
                <li>GitHub数据（星标数、贡献者数、主题等）</li>
                <li>NPM包数据（版本、下载量、依赖等）</li>
                <li>Bundle size数据（如果可用）</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 