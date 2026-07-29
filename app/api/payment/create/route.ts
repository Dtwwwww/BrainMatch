export const runtime = 'edge';

import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase/server';

import { getPaymentProvider } from '@/lib/payment/factory';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/create
 * 创建支付订单
 *
 * Body: { packageId, credits, amount, description }
 * Returns: { paymentUrl, orderId }
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { packageId, credits, amount, description } = await req.json();

    if (!packageId || credits === undefined || !amount) {
      return Response.json(
        { error: '缺少支付参数', code: 'missing_params' },
        { status: 400 }
      );
    }

    // 创建订单
    const provider = getPaymentProvider();
    const { paymentUrl, orderId, extra } = await provider.createOrder({
      userId: user.id,
      packageId,
      credits,
      amount,
      description: description || '分析次数购买',
    });

    // 保存订单到数据库
    const supabase = await createSupabaseServerClient();
    const insertData: Record<string, any> = {
      user_id: user.id,
      package_id: packageId,
      credits,
      amount,
      trade_order_id: orderId,
      status: 'pending',
      payment_provider: process.env.PAYMENT_PROVIDER || 'mock',
    };

    // 保存渠道内部订单号（通用字段名）
    if (extra?.provider_order_id) {
      insertData.provider_order_id = extra.provider_order_id;
    }

    const { error } = await supabase.from('orders').insert(insertData);

    if (error) {
      console.error('Failed to save order:', error.message);
      return Response.json(
        { error: '订单创建失败', code: 'order_create_failed' },
        { status: 500 }
      );
    }

    return Response.json({ paymentUrl, orderId, extra });
  } catch (error) {
    return handleAppError(error);
  }
}
