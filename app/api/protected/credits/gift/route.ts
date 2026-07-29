export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/protected/credits/gift
 * 转赠次数给朋友（通过手机号）
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { credits, friendPhone } = await req.json();

    if (!credits || credits < 1 || !friendPhone) {
      return Response.json({ error: '参数不完整' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 校验转出方次数
    const { data: source } = await supabase
      .from('user_credits')
      .select('remaining_analyses')
      .eq('user_id', user.id)
      .single();

    if (!source || source.remaining_analyses < credits) {
      return Response.json({ error: '剩余次数不足' }, { status: 400 });
    }

    // 查找目标用户
    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', friendPhone)
      .single();

    if (!target) {
      return Response.json({ error: '未找到该手机号对应的用户' }, { status: 404 });
    }

    // 获取目标用户次数
    const { data: targetCredits } = await supabase
      .from('user_credits')
      .select('remaining_analyses')
      .eq('user_id', target.id)
      .single();

    // 扣源用户
    await supabase
      .from('user_credits')
      .update({ remaining_analyses: source.remaining_analyses - credits, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // 加目标用户
    await supabase
      .from('user_credits')
      .update({ remaining_analyses: (targetCredits?.remaining_analyses || 0) + credits, updated_at: new Date().toISOString() })
      .eq('user_id', target.id);

    // 双方流水
    await supabase.from('credit_transactions').insert([
      { user_id: user.id, type: 'gift_out', amount: -credits, balance_after: source.remaining_analyses - credits, meta: { to_phone: friendPhone } },
      { user_id: target.id, type: 'gift_in', amount: credits, balance_after: (targetCredits?.remaining_analyses || 0) + credits, meta: { from_user: user.id } },
    ]);

    // 转赠记录
    await supabase.from('credit_gifts').insert({
      from_user_id: user.id,
      to_user_id: target.id,
      credits,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    });

    return Response.json({ success: true, message: `已转赠 ${credits} 次给 ${friendPhone}` });
  } catch (error) {
    return handleAppError(error);
  }
}
