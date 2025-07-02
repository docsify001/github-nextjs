import { NextRequest, NextResponse } from 'next/server';

/**
 * 全局异常处理中间件
 * 用于捕获和处理未处理的异常
 */
export function withErrorHandling(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('Unhandled error in API route:', error);
      
      // 处理数据库约束错误
      if (error instanceof Error && error.message.includes('duplicate key')) {
        return NextResponse.json(
          { 
            success: false, 
            error: '数据已存在，请检查输入信息',
            details: 'duplicate_key_error'
          },
          { status: 400 }
        );
      }
      
      // 处理数据库连接错误
      if (error instanceof Error && error.message.includes('connection')) {
        return NextResponse.json(
          { 
            success: false, 
            error: '数据库连接失败，请稍后重试',
            details: 'database_connection_error'
          },
          { status: 503 }
        );
      }
      
      // 处理验证错误
      if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json(
          { 
            success: false, 
            error: '输入数据验证失败',
            details: 'validation_error'
          },
          { status: 400 }
        );
      }
      
      // 处理权限错误
      if (error instanceof Error && error.message.includes('permission')) {
        return NextResponse.json(
          { 
            success: false, 
            error: '权限不足，无法执行此操作',
            details: 'permission_error'
          },
          { status: 403 }
        );
      }
      
      // 处理通用错误
      return NextResponse.json(
        { 
          success: false, 
          error: '服务器内部错误，请稍后重试',
          details: 'internal_server_error'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * 包装 API 路由处理函数
 */
export function createApiHandler(handler: (request: NextRequest) => Promise<NextResponse>) {
  return withErrorHandling(handler);
} 