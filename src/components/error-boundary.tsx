'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorBoundaryView({
  state,
  onRetry,
  onLogin,
}: {
  state: State;
  onRetry: () => void;
  onLogin: () => void;
}) {
  const t = useTranslations('AuthShell');

  const isAuthError =
    state.error?.message?.includes('认证') ||
    state.error?.message?.includes('auth') ||
    state.error?.message?.includes('unauthorized');

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {isAuthError ? t('authErrorTitle') : t('appErrorTitle')}
          </CardTitle>
          <CardDescription>
            {isAuthError ? t('authErrorDesc') : t('appErrorDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 font-mono">
                  {state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {isAuthError ? (
                <Button onClick={onLogin} className="flex-1">
                  {t('retryLogin')}
                </Button>
              ) : (
                <Button onClick={onRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('retry')}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                {t('reloadPage')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleGoToLogin = () => {
    window.location.href = '/auth/login';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryView
          state={this.state}
          onRetry={this.handleRetry}
          onLogin={this.handleGoToLogin}
        />
      );
    }

    return this.props.children;
  }
}