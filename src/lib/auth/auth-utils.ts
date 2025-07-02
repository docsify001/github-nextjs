import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

/**
 * 验证用户是否已登录
 * @param request - NextRequest 对象
 * @returns 包含用户信息和认证状态的对象
 */
export async function verifyAuth(request: NextRequest) {
  try {
    // 首先检查是否有验证消息头
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // 如果有 API key，进行验证
    if (apiKey) {
      // 检查 API key 是否有效
      if (apiKey === process.env.PROJECT_API_TOKEN) {
        return {
          isAuthenticated: true,
          user: { id: 'api-user', email: 'api@system.com' },
          error: null,
          authType: 'api-key'
        };
      }
    }
    
    // 如果有 Bearer token，可以在这里进行 JWT 验证
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // 这里可以添加 JWT token 验证逻辑
      // 暂时跳过，使用 session 验证
    }
    
    // 使用 Supabase session 验证用户
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return {
        isAuthenticated: false,
        user: null,
        error: error?.message || '用户未登录',
        authType: 'session'
      };
    }
    
    return {
      isAuthenticated: true,
      user,
      error: null,
      authType: 'session'
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      user: null,
      error: error instanceof Error ? error.message : '认证验证失败',
      authType: 'unknown'
    };
  }
}

/**
 * 验证 API 请求的认证状态
 * @param request - NextRequest 对象
 * @returns 认证验证结果
 */
export async function verifyApiAuth(request: NextRequest) {
  const authResult = await verifyAuth(request);
  
  if (!authResult.isAuthenticated) {
    return {
      success: false,
      error: authResult.error || '需要登录才能访问此接口',
      status: 401
    };
  }
  
  return {
    success: true,
    user: authResult.user,
    error: null
  };
} 