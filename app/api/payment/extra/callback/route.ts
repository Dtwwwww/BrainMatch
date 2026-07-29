import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/extra/callback
 * 面试题扩展包支付回调（Mock 实现）
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Mock 处理
    if (body.mock_order_id) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: order } = await supabase
        .from('extra_question_orders')
        .select('analysis_id, question_count, status')
        .eq('trade_order_id', body.mock_order_id)
        .single();

      if (order) {
        await supabase
          .from('extra_question_orders')
          .update({ status: 'paid' })
          .eq('trade_order_id', body.mock_order_id);

        if (order.status !== 'paid') {
          const { data: analysis } = await supabase
            .from('analyses')
            .select('extra_questions_count')
            .eq('id', order.analysis_id)
            .single();

          await supabase
            .from('analyses')
            .update({
              extra_questions_count: (analysis?.extra_questions_count || 0) + (order.question_count || 5),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.analysis_id);
        }
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: '缺少订单信息' }, { status: 400 });
  } catch (error) {
    return handleAppError(error);
  }
}
