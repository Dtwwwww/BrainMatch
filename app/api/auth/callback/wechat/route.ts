export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/callback/wechat
 * 微信 OAuth 回调 — code 换 openid → 创建/查找用户 → 写 session → 判断绑定状态
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.BASE_URL || 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(new URL(`/auth?error=${error || 'no_code'}`, appUrl));
  }

  try {
    // 1. code 换 access_token + openid
    let openid: string;
    let unionid: string | undefined;

    // 开发模式：用 mock openid 跳过微信 API
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_WECHAT_APPID) {
      openid = `mock_wechat_${code.slice(0, 8)}`;
      console.log(`[DEV] Mock WeChat openid: ${openid}`);
    } else {
      const tokenRes = await fetch(
        'https://api.weixin.qq.com/sns/oauth2/access_token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appid: process.env.NEXT_PUBLIC_WECHAT_APPID,
            secret: process.env.WECHAT_APPSECRET,
            code,
            grant_type: 'authorization_code',
          }),
        }
      );
      const tokenData = await tokenRes.json();

      if (tokenData.errcode) {
        console.error('WeChat token error:', tokenData);
        return NextResponse.redirect(new URL('/auth?error=wechat_failed', appUrl));
      }

      openid = tokenData.openid;
      unionid = tokenData.unionid;
    }

    // 2. 服务端 client — 查找/创建用户
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const cookieStore = cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => cookieStore.get(key)?.value,
          set: (key: string, value: string, options: any) => {
            cookieStore.set(key, value, options);
          },
          remove: (key: string, options: any) => {
            cookieStore.set(key, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    // 3. 查找是否已有此微信用户
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, phone, phone_verified')
      .eq('wechat_openid', openid)
      .single();

    let userId: string;
    let isNewUser = false;
    let hasPhone = false;

    if (existingProfile) {
      userId = existingProfile.id;
      hasPhone = !!(existingProfile.phone && existingProfile.phone_verified);
    } else {
      isNewUser = true;
      const email = `wechat_${openid}_${Date.now()}@brainmatch.local`;
      const password = `wx_${openid}_${crypto.randomUUID().slice(0, 8)}`;

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { wechat_openid: openid },
        });

      if (createError || !newUser.user) {
        console.error('Create WeChat user error:', createError);
        return NextResponse.redirect(new URL('/auth?error=create_failed', appUrl));
      }

      userId = newUser.user.id;

      // 更新 profile 的微信信息
      await supabaseAdmin
        .from('profiles')
        .update({
          wechat_openid: openid,
          wechat_unionid: unionid || null,
          wechat_verified: true,
        })
        .eq('id', userId);
    }

    // 4. 用 anon 客户端登录获取 session
    const { data: profileAfter } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 查找该用户的 email（Supabase auth 中存储的）
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users.find((u: any) => u.id === userId);
    const email = authUser?.email;

    if (!email) {
      console.error('Cannot find email for user:', userId);
      return NextResponse.redirect(new URL('/auth?error=unknown', appUrl));
    }

    // 生成新密码用于 signIn
    const loginPassword = `wx_${userId}_${Date.now()}`;
    await supabaseAdmin.auth.admin.updateUserById(userId, { password: loginPassword });

    // 用新密码登录
    const { data: loginData, error: loginError } =
      await supabaseServer.auth.signInWithPassword({ email, password: loginPassword });

    if (loginError || !loginData.session) {
      console.error('WeChat login error:', loginError);
      return NextResponse.redirect(new URL('/auth?error=login_failed', appUrl));
    }

    // 5. 判断去向：已绑定手机 → dashboard，未绑定 → bind-phone
    if (hasPhone) {
      return NextResponse.redirect(new URL('/dashboard', appUrl));
    }

    // 携带 token 跳转绑定手机号页
    const bindUrl = new URL('/auth/bind-phone', appUrl);
    bindUrl.searchParams.set('token', loginData.session.access_token);
    bindUrl.searchParams.set('refresh', loginData.session.refresh_token);

    return NextResponse.redirect(bindUrl);
  } catch (err: any) {
    console.error('WeChat callback error:', err);
    return NextResponse.redirect(new URL('/auth?error=unknown', appUrl));
  }
}
