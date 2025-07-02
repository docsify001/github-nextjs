'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
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

      const isAuthError = this.state.error?.message?.includes('认证') || 
                         this.state.error?.message?.includes('auth') ||
                         this.state.error?.message?.includes('unauthorized');

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {isAuthError ? '认证错误' : '应用错误'}
              </CardTitle>
              <CardDescription>
                {isAuthError 
                  ? '认证过程中发生了错误，请重新登录'
                  : '应用程序遇到了一个错误'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {this.state.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 font-mono">
                      {this.state.error.message}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {isAuthError ? (
                    <Button 
                      onClick={this.handleGoToLogin}
                      className="flex-1"
                    >
                      重新登录
                    </Button>
                  ) : (
                    <Button 
                      onClick={this.handleRetry}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重试
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    刷新页面
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
} 