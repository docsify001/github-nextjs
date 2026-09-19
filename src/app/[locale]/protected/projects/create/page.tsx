'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseGithubRepoUrl } from '@/lib/github/repo-url';
import { createConsola } from 'consola';

const logger = createConsola();

export default function CreateProjectPage() {
  const t = useTranslations('Projects');
  const [githubUrl, setGithubUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const repoPreview = parseGithubRepoUrl(githubUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!githubUrl) {
      setError(t('addUrlMin'));
      return;
    }

    const normalized = parseGithubRepoUrl(githubUrl);
    if (!normalized) {
      setError(t('addInvalidUrl'));
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
          githubUrl: normalized.url,
          webhookUrl: webhookUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        logger.success('Project created successfully:', data);
      } else {
        setError(data.error || t('createFailed'));
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
        <h1 className="text-3xl font-bold">{t('createTitle')}</h1>
        <p className="text-gray-600 mt-2">{t('createDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('createInfoTitle')}</CardTitle>
          <CardDescription>
            {t('createInfoDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="githubUrl">{t('createGithubUrlLabel')}</Label>
              <Input
                id="githubUrl"
                type="text"
                placeholder={t('addGithubUrlPlaceholder')}
                className="font-mono"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                required
              />
              <div className="text-sm mt-1.5 min-h-5">
                {repoPreview ? (
                  <p className="text-green-600">
                    {t('createRecognized', { fullName: repoPreview.fullName })}
                  </p>
                ) : (
                  <p className="text-gray-500">
                    {t('createSupportedFormats', {
                      short: 'owner/repo',
                      full: 'https://github.com/owner/repo',
                      git: '.git',
                    })}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="webhookUrl">{t('createWebhookLabel')}</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder={t('createWebhookPlaceholder')}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('createWebhookHint')}
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('createSubmitting') : t('createButton')}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">{t('createSuccessTitle')}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>ID:</strong> {result.data.project.id}</p>
                <p><strong>Name:</strong> {result.data.project.name}</p>
                <p><strong>Slug:</strong> {result.data.project.slug}</p>
                <p><strong>Status:</strong> {result.data.project.status}</p>
                <p><strong>{t('message')}:</strong> {result.data.message}</p>
                <p><strong>Webhook:</strong> {result.data.webhookUrl}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('createDocsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">{t('createEndpoint')}</h4>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                POST /api/projects/create
              </code>
            </div>

            <div>
              <h4 className="font-semibold">{t('createRequestBody')}</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
{`{
  "githubUrl": "https://github.com/owner/repo",
  "webhookUrl": "https://your-webhook-url.com/webhook" // 可选
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">{t('createResponseBody')}</h4>
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
              <h4 className="font-semibold">{t('createWebhookTitle')}</h4>
              <p className="text-sm text-gray-600">
                {t('createWebhookBody')}
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-2">
                <li>{t('createWebhookItems.0')}</li>
                <li>{t('createWebhookItems.1')}</li>
                <li>{t('createWebhookItems.2')}</li>
                <li>{t('createWebhookItems.3')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}