import { useAuth } from '@/contexts/auth-context';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ApiClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // 处理认证错误
      if (response.status === 401) {
        return {
          success: false,
          error: '认证失败，请重新登录',
        };
      }

      // 处理其他 HTTP 错误
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误',
      };
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// 创建默认的 API 客户端实例
export const apiClient = new ApiClient();

// React Hook 用于在组件中使用 API 客户端
export function useApiClient() {
  const { user } = useAuth();

  const authenticatedRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    // 如果用户未登录，直接返回认证错误
    if (!user) {
      return {
        success: false,
        error: '用户未登录',
      };
    }

    return apiClient.request<T>(endpoint, options);
  };

  return {
    get: <T>(endpoint: string, options?: RequestInit) =>
      authenticatedRequest<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
      authenticatedRequest<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
      authenticatedRequest<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    delete: <T>(endpoint: string, options?: RequestInit) =>
      authenticatedRequest<T>(endpoint, { ...options, method: 'DELETE' }),
  };
}

// 导出类型
export type { ApiResponse, ApiClientOptions }; 