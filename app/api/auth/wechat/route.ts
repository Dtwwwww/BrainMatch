export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { buildWechatOAuthUrl } from '@/lib/auth/wechat';

/**
 * GET /api/auth/wechat
 * 重定向到微信 OAuth 授权页
 */
export async function GET() {
  const authUrl = buildWechatOAuthUrl();
  return NextResponse.redirect(authUrl);
}
