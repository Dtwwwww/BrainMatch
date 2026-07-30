
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { getPaymentProvider } from '@/lib/payment/factory';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/query
 * 前端轮询订单支付状态（需要认证）
 *
 * Body: { orderId: string } — 支付渠道内部订单号
 * Returns: { status: 'pending' | 'paid' | 'failed' }
 *
 * 注意：此端点只读，不修改数据库，回调是唯一的次数增加入口。
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json(
        { error: '缺少参数', code: 'missing_params' },
        { status: 400 }
      );
    }

    const provider = getPaymentProvider();
    const result = await provider.queryOrder(orderId);

    console.log(
      `[Payment] Query order ${orderId.slice(0, 20)}... → ${result.status}`
    );

    return Response.json({
      status: result.status,
      paidAt: result.paidAt || null,
      amount: result.amount,
    });
  } catch (error) {
    return handleAppError(error);
  }
}
