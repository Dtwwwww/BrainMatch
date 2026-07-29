export const runtime = 'edge';

import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/protected/analyses/stats
 * 按状态聚合统计
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('analyses')
      .select('status')
      .eq('user_id', user.id)
      .eq('is_archived', false);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      total: data.length,
      '分析完成': data.filter((a: any) => a.status === '分析完成').length,
      '待投递': data.filter((a: any) => a.status === '待投递').length,
      '已投递': data.filter((a: any) => a.status === '已投递').length,
      '面试中': data.filter((a: any) => a.status === '面试中').length,
      '已拿Offer': data.filter((a: any) => a.status === '已拿Offer').length,
      '已结束': data.filter((a: any) => a.status === '已结束').length,
    };

    return Response.json(stats);
  } catch (error) {
    return handleAppError(error);
  }
}
