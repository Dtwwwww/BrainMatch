export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/credits/add
 * 给用户加次数（service_role 绕过 RLS）
 */
export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('X-Admin-Key');
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const { userId, credits, reason } = await req.json();
    if (!userId || !credits || credits < 1) {
      return Response.json({ error: '参数错误' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: currentCredits } = await supabase
      .from('user_credits')
      .select('remaining_analyses')
      .eq('user_id', userId)
      .single();

    const newRemaining = (currentCredits?.remaining_analyses || 0) + credits;

    await supabase
      .from('user_credits')
      .update({
        remaining_analyses: newRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'admin_add',
      amount: credits,
      balance_after: newRemaining,
      meta: { reason: reason || '管理员手动添加', admin_action: true },
    });

    return Response.json({
      success: true,
      message: `已为用户添加 ${credits} 次分析`,
      newRemaining,
    });
  } catch (error) {
    return handleAppError(error);
  }
}
