import { NotificationType } from '@/components/notification';

export interface ErrorInfo {
  type: NotificationType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export class ErrorHandler {
  /**
   * 处理 API 错误
   */
  static handleApiError(error: any, context?: string): ErrorInfo {
    console.error('API Error:', error);

    // 处理网络错误
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        type: 'error',
        title: '网络连接错误',
        message: '无法连接到服务器，请检查网络连接后重试。',
        action: {
          label: '重试',
          onClick: () => window.location.reload(),
        },
      };
    }

    // 处理认证错误
    if (error.status === 401 || error.message?.includes('认证') || error.message?.includes('unauthorized')) {
      return {
        type: 'error',
        title: '认证失败',
        message: '您的登录已过期，请重新登录。',
        action: {
          label: '重新登录',
          onClick: () => window.location.href = '/auth/login',
        },
      };
    }

    // 处理权限错误
    if (error.status === 403 || error.message?.includes('权限') || error.message?.includes('forbidden')) {
      return {
        type: 'warning',
        title: '权限不足',
        message: '您没有权限执行此操作。',
      };
    }

    // 处理服务器错误
    if (error.status >= 500) {
      return {
        type: 'error',
        title: '服务器错误',
        message: '服务器暂时不可用，请稍后重试。',
        action: {
          label: '重试',
          onClick: () => window.location.reload(),
        },
      };
    }

    // 处理数据库错误
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return {
        type: 'warning',
        title: '数据已存在',
        message: '您要创建的数据已存在，请检查后重试。',
      };
    }

    // 处理验证错误
    if (error.status === 400 || error.message?.includes('validation')) {
      return {
        type: 'warning',
        title: '输入错误',
        message: error.message || '请检查输入信息是否正确。',
      };
    }

    // 处理通用错误
    return {
      type: 'error',
      title: context ? `${context}失败` : '操作失败',
      message: error.message || '发生未知错误，请稍后重试。',
      action: {
        label: '重试',
        onClick: () => window.location.reload(),
      },
    };
  }

  /**
   * 处理认证错误
   */
  static handleAuthError(error: any): ErrorInfo {
    console.error('Auth Error:', error);

    if (error.message?.includes('Invalid login credentials')) {
      return {
        type: 'error',
        title: '登录失败',
        message: '邮箱或密码错误，请检查后重试。',
      };
    }

    if (error.message?.includes('Email not confirmed')) {
      return {
        type: 'warning',
        title: '邮箱未验证',
        message: '请先验证您的邮箱地址。',
        action: {
          label: '重新发送验证邮件',
          onClick: () => window.location.href = '/auth/forgot-password',
        },
      };
    }

    if (error.message?.includes('Too many requests')) {
      return {
        type: 'warning',
        title: '请求过于频繁',
        message: '请稍后再试。',
      };
    }

    return {
      type: 'error',
      title: '认证错误',
      message: error.message || '认证过程中发生错误。',
    };
  }

  /**
   * 处理表单错误
   */
  static handleFormError(error: any, fieldName?: string): ErrorInfo {
    console.error('Form Error:', error);

    if (fieldName) {
      return {
        type: 'warning',
        title: '表单验证失败',
        message: `${fieldName}: ${error.message}`,
      };
    }

    return {
      type: 'warning',
      title: '表单验证失败',
      message: error.message || '请检查表单输入。',
    };
  }

  /**
   * 处理文件上传错误
   */
  static handleFileError(error: any): ErrorInfo {
    console.error('File Error:', error);

    if (error.message?.includes('file size')) {
      return {
        type: 'warning',
        title: '文件过大',
        message: '文件大小超过限制，请选择较小的文件。',
      };
    }

    if (error.message?.includes('file type')) {
      return {
        type: 'warning',
        title: '文件类型不支持',
        message: '请选择支持的文件类型。',
      };
    }

    return {
      type: 'error',
      title: '文件上传失败',
      message: error.message || '文件上传过程中发生错误。',
    };
  }

  /**
   * 处理数据库错误
   */
  static handleDatabaseError(error: any): ErrorInfo {
    console.error('Database Error:', error);

    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return {
        type: 'warning',
        title: '数据已存在',
        message: '您要创建的数据已存在，请检查后重试。',
      };
    }

    if (error.message?.includes('foreign key constraint')) {
      return {
        type: 'warning',
        title: '关联数据错误',
        message: '无法删除此数据，因为它与其他数据有关联。',
      };
    }

    if (error.message?.includes('not found')) {
      return {
        type: 'warning',
        title: '数据不存在',
        message: '您要操作的数据不存在。',
      };
    }

    return {
      type: 'error',
      title: '数据库错误',
      message: '数据操作失败，请稍后重试。',
    };
  }

  /**
   * 处理通用异常
   */
  static handleGenericError(error: any, context?: string): ErrorInfo {
    console.error('Generic Error:', error);

    // 尝试识别错误类型
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return this.handleApiError(error, context);
    }

    if (error.message?.includes('auth') || error.message?.includes('login')) {
      return this.handleAuthError(error);
    }

    if (error.message?.includes('validation') || error.message?.includes('form')) {
      return this.handleFormError(error);
    }

    if (error.message?.includes('file') || error.message?.includes('upload')) {
      return this.handleFileError(error);
    }

    if (error.message?.includes('database') || error.message?.includes('constraint')) {
      return this.handleDatabaseError(error);
    }

    // 默认错误处理
    return {
      type: 'error',
      title: context ? `${context}失败` : '操作失败',
      message: error.message || '发生未知错误，请稍后重试。',
      action: {
        label: '重试',
        onClick: () => window.location.reload(),
      },
    };
  }
} 