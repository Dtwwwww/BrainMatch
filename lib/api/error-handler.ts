export interface APIError {
  error: string;
  code?: string;
  details?: any;
}

/**
 * 统一的 API 业务异常
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 将 AppError 转为标准 Response
 */
export function handleAppError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return Response.json(
        { error: '请先登录', code: 'unauthorized' },
        { status: 401 }
      );
    }

    console.error('Unhandled error:', error.message);
    return Response.json(
      { error: '服务器内部错误', code: 'internal_error' },
      { status: 500 }
    );
  }

  return Response.json(
    { error: '未知错误', code: 'unknown' },
    { status: 500 }
  );
}
