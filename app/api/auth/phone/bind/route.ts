import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';
import { getAuthenticatedUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/phone/bind
 * 已登录用户绑定手机号 + 可选设置密码
 *
 * Body: { phone, code, password? }
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { phone, code, password } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: '手机号和验证码不能为空' }, { status: 400 });
    }

    // 生产环境禁止验证码绑定
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: '绑定功能暂不可用' },
        { status: 400 }
      );
    }

    // 开发模式验证码校验
    if (process.env.NODE_ENV === 'development') {
      if (code !== '000000' && !/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: '验证码错误' }, { status: 400 });
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 检查手机号是否已被绑定
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .neq('id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: '该手机号已被其他用户绑定' }, { status: 400 });
    }

    // 更新手机号
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone, phone_verified: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Bind phone error:', updateError);
      return NextResponse.json({ error: '绑定失败，请稍后重试' }, { status: 500 });
    }

    // 可选：设置密码
    if (password && password.length >= 6) {
      await supabase.auth.admin.updateUserById(user.id, { password });
    }

    return NextResponse.json({ success: true, message: '手机号绑定成功' });
  } catch (error) {
    return handleAppError(error);
  }
}
