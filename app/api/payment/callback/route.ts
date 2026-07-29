
import { createClient } from '@supabase/supabase-js';
import { getPaymentProvider } from '@/lib/payment/factory';

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/callback
 * 支付回调处理（无需认证，由支付渠道直接调用）
 *
 * 支持 form-urlencoded（虎皮椒）和 application/json 两种 Content-Type
 * 流程：解析 body → 验证签名 → 更新订单 → 增加次数 → 记录流水
 * 响应：纯文本 success（虎皮椒要求，最多重试 6 次）
 */
export async function POST(req: Request) {
  try {
    let rawData: any;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      rawData = await req.json();
    } else {
      // x-www-form-urlencoded — 虎皮椒默认回调格式
      const text = await req.text();
      const params = new URLSearchParams(text);
      rawData = {};
      params.forEach((value, key) => {
        rawData[key] = value;
      });
    }

    console.log('[Payment] Callback received:', JSON.stringify(rawData).slice(0, 500));

    const payment = getPaymentProvider();

    // 验证回调
    const result = await payment.handleCallback(rawData);

    if (result.status !== 'paid') {
      // 虎皮椒要求返回 success 才停止重试，失败也返回 success 避免死循环
      // 但签名验证失败不应返回 success（可能是恶意请求）
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 使用 service_role key 创建 admin 客户端（回调无用户 session）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. 查询订单（幂等性检查）
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, credits, status, amount, package_id')
      .eq('trade_order_id', result.orderId)
      .single();

    if (!existingOrder) {
      console.error(`[Payment] Order not found: ${result.orderId}`);
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 幂等性：已处理过则直接返回成功
    if (existingOrder.status === 'paid') {
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 2. 更新订单状态
    const provider = process.env.PAYMENT_PROVIDER || 'mock';
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        trade_order_id: result.tradeOrderId,
        provider_order_id: result.rawData?.open_order_id || result.rawData?.payjs_order_id || null,
        callback_raw: result.rawData,
        payment_provider: provider,
      })
      .eq('id', existingOrder.id);

    // 3. 获取当前次数
    const { data: credits } = await supabaseAdmin
      .from('user_credits')
      .select('remaining_analyses, total_purchased')
      .eq('user_id', existingOrder.user_id)
      .single();

    const newRemaining = (credits?.remaining_analyses || 0) + (existingOrder.credits || 0);
    const newTotal = (credits?.total_purchased || 0) + (existingOrder.credits || 0);

    // 4. 更新用户次数
    await supabaseAdmin
      .from('user_credits')
      .update({
        remaining_analyses: newRemaining,
        total_purchased: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', existingOrder.user_id);

    // 5. 记录消费流水
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: existingOrder.user_id,
      type: 'purchase',
      amount: existingOrder.credits,
      balance_after: newRemaining,
      meta: {
        orderId: existingOrder.id,
        packageId: existingOrder.package_id,
        amount: existingOrder.amount,
      },
    });

    console.log(
      `[Payment] Order ${result.orderId} processed: +${existingOrder.credits} credits for user ${existingOrder.user_id}`
    );

    // 返回 success 纯文本（虎皮椒要求）
    return new Response('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    return new Response('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
