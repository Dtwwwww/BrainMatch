export const runtime = 'edge';

import { NextResponse } from 'next/server';

/**
 * POST /api/auth/phone/send-code
 * 发送短信验证码（生产环境暂不可用，请使用手机号+密码登录）
 *
 * TODO: 接入真实短信服务商（阿里云短信/腾讯云短信）后恢复完整功能
 */
export async function POST(req: Request) {
  const { phone } = await req.json();

  if (!phone) {
    return NextResponse.json({ error: '手机号不能为空' }, { status: 400 });
  }

  // 生成 6 位数字验证码
  const code = String(Math.floor(100000 + Math.random() * 900000));

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] 验证码（手机号 ${phone}）: ${code}`);
    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      devCode: code,
    });
  }

  // 生产环境：短信验证码暂不可用
  return NextResponse.json(
    { error: '验证码注册暂不可用，请使用手机号+密码登录', success: false },
    { status: 400 }
  );
}
