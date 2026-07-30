
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/credits/update
 * 修改用户剩余次数（支持增加或减少）
 * Body: { userId, remaining_analyses, reason }
 */
export async function PATCH(req: Request) {
  try {
    const adminKey = req.headers.get('X-Admin-Key');
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const { userId, remaining_analyses, reason } = await req.json();

    if (!userId || typeof remaining_analyses !== 'number' || remaining_analyses < 0) {
      return Response.json({ error: '参数错误' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 获取当前次数
    const { data: current } = await supabase
      .from('user_credits')
      .select('remaining_analyses')
      .eq('user_id', userId)
      .single();

    const oldRemaining = current?.remaining_analyses || 0;
    const diff = remaining_analyses - oldRemaining;

    // 更新次数
    await supabase
      .from('user_credits')
      .update({
        remaining_analyses: remaining_analyses,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // 记录流水（增加或扣除）
    if (diff !== 0) {
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        type: diff > 0 ? 'admin_add' : 'admin_deduct',
        amount: diff,
        balance_after: remaining_analyses,
        meta: {
          reason: reason || '管理员修改次数',
          admin_action: true,
          old_remaining: oldRemaining,
          new_remaining: remaining_analyses,
        },
      });
    }

    return Response.json({
      success: true,
      message: `已将用户次数从 ${oldRemaining} 调整为 ${remaining_analyses}`,
      oldRemaining,
      newRemaining: remaining_analyses,
    });
  } catch (error) {
    return handleAppError(error);
  }
}
