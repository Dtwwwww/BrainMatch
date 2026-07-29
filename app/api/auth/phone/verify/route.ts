import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canRegister, markRegistered } from '@/lib/rate-limit/register';

/**
 * POST /api/auth/phone/verify
 *
 * mode: 'code'     — 验证码注册（邀请码模式，开发环境任意6位数，IP限流）
 * mode: 'password' — 手机号+密码登录
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { phone, code, password, mode = 'code' } = body;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  // ===== 密码登录 =====
  if (mode === 'password') {
    if (!phone || !password) {
      return Response.json({ error: '手机号和密码不能为空' }, { status: 400 });
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = `${phone}@phone.brainmatch.local`;
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message?.includes('Invalid login credentials')
        ? '手机号或密码错误'
        : `登录失败: ${error.message}`;
      return Response.json({ error: msg }, { status: 401 });
    }

    if (!data.session) {
      return Response.json({ error: '登录失败' }, { status: 500 });
    }

    return Response.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      userId: data.user.id,
    });
  }

  // ===== 验证码注册 =====
  if (!phone || !code) {
    return Response.json({ error: '手机号和验证码不能为空' }, { status: 400 });
  }

  // 生产环境禁止验证码注册
  if (process.env.NODE_ENV !== 'development') {
    return Response.json(
      { error: '验证码注册暂不可用，请使用手机号+密码登录' },
      { status: 400 }
    );
  }

  // 开发模式验证码
  if (process.env.NODE_ENV === 'development') {
    if (code !== '000000' && !/^\d{6}$/.test(code)) {
      return Response.json({ error: '验证码错误' }, { status: 400 });
    }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const email = `${phone}@phone.brainmatch.local`;
    const defaultPassword = `phone_${phone}_brainmatch`;

    // 先检查是否已有用户
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existing) {
      return Response.json({ error: '该手机号已注册，请使用密码登录' }, { status: 409 });
    }

    // IP 限流 — 单 IP 24h 仅1次注册
    if (!canRegister(ip)) {
      return Response.json(
        { error: '注册受限：当前网络已达到注册上限，请明天再试' },
        { status: 429 }
      );
    }

    // 创建新用户
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { phone },
      });

    if (createError) {
      console.error('Create user error:', createError);
      return Response.json({ error: '注册失败' }, { status: 500 });
    }

    const userId = newUser.user.id;

    // 更新 profile
    await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, phone, phone_verified: true });

    // 标记 IP 已注册
    markRegistered(ip);

    console.log(`[REGISTER] 新用户: ${phone} | IP: ${ip} | id: ${userId}`);

    return Response.json({
      success: true,
      userId,
      message: '注册成功，请设置登录密码',
      needPassword: true,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return Response.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
