
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/protected/credits/refund
 * 申请退款剩余次数（按均价退款）
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { credits } = await req.json();
    if (!credits || credits < 1) {
      return Response.json({ error: '请选择退款次数' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('remaining_analyses')
      .eq('user_id', user.id)
      .single();

    if (!userCredits || userCredits.remaining_analyses < credits) {
      return Response.json({ error: '剩余次数不足' }, { status: 400 });
    }

    // 计算均价（从 credit_transactions 中 purchase 记录算）
    const { data: purchases } = await supabase
      .from('credit_transactions')
      .select('amount, meta')
      .eq('user_id', user.id)
      .eq('type', 'purchase');

    const totalPurchased = purchases?.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) || 0;
    const refundAmount = totalPurchased > 0
      ? Math.round((totalPurchased / (userCredits.remaining_analyses + credits)) * credits * 100) / 100
      : 0;

    // 扣减并记录
    await supabase
      .from('user_credits')
      .update({
        remaining_analyses: userCredits.remaining_analyses - credits,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      type: 'refund',
      amount: -credits,
      balance_after: userCredits.remaining_analyses - credits,
      meta: { refund_amount: refundAmount, reason: '用户申请退款' },
    });

    return Response.json({
      success: true,
      message: `已申请退款 ${credits} 次，预计退还 ¥${refundAmount}`,
    });
  } catch (error) {
    return handleAppError(error);
  }
}
