import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * 全局中间件
 * - CORS 头部设置
 * - 受保护页面路由守卫（未登录 → 302 跳转登录页）
 * - 受保护 API 路由匹配（具体鉴权在各路由中处理）
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CORS 头部
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Origin',
    process.env.NEXT_PUBLIC_APP_URL || '*'
  );
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Admin-Key'
  );

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // ──── 路由保护：需登录才能访问的页面路径 ────
  const path = request.nextUrl.pathname;
  const PROTECTED_PATHS = ['/dashboard', '/analyze', '/settings'];

  const isProtected = PROTECTED_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  );

  if (isProtected) {
    // 创建 Supabase 服务端客户端读取 cookie
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => request.cookies.get(key)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // 未登录 → 重定向到登录页，带上原始路径作为 redirect 参数
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

/**
 * 匹配 API 路由 + 受保护页面路由
 */
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/analyze/:path*',
    '/settings/:path*',
  ],
};
