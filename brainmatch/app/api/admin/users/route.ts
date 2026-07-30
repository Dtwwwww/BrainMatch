
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * 获取全部用户列表（分页 + 搜索），含统计信息
 */
export async function GET(req: Request) {
  try {
    const adminKey = req.headers.get('X-Admin-Key');
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = (searchParams.get('search') || '').trim();
    const offset = (page - 1) * limit;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 构建基础查询：profiles LEFT JOIN user_credits
    let query = supabase
      .from('profiles')
      .select(
        `id, email, phone, full_name, avatar_url, created_at,
         user_credits ( remaining_analyses, total_purchased ),
         user_config ( is_flagged )`,
        { count: 'exact' }
      );

    // 搜索过滤
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,phone.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    query = query.order('created_at', { ascending: false });
    const { data: profiles, count, error: profileError } = await query.range(offset, offset + limit - 1);

    if (profileError) {
      return Response.json({ error: profileError.message }, { status: 500 });
    }

    const userIds = (profiles || []).map((p: any) => p.id);

    // 批量统计 analyses 总数和 offer 数
    let analysisStats: Record<string, { analysis_count: number; offer_count: number }> = {};
    if (userIds.length > 0) {
      const { data: analyses, error: analysisError } = await supabase
        .from('analyses')
        .select('user_id, status')
        .in('user_id', userIds);

      if (!analysisError && analyses) {
        for (const a of analyses) {
          if (!analysisStats[a.user_id]) {
            analysisStats[a.user_id] = { analysis_count: 0, offer_count: 0 };
          }
          analysisStats[a.user_id].analysis_count += 1;
          if (a.status === '已拿Offer') {
            analysisStats[a.user_id].offer_count += 1;
          }
        }
      }
    }

    const users = (profiles || []).map((p: any) => {
      const stats = analysisStats[p.id] || { analysis_count: 0, offer_count: 0 };
      const credits = p.user_credits?.[0] || { remaining_analyses: 0, total_purchased: 0 };
      const config = p.user_config?.[0] || { is_flagged: false };
      return {
        id: p.id,
        email: p.email,
        phone: p.phone,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        remaining_analyses: credits.remaining_analyses ?? 0,
        total_purchased: credits.total_purchased ?? 0,
        analysis_count: stats.analysis_count,
        offer_count: stats.offer_count,
        is_flagged: config.is_flagged ?? false,
      };
    });

    return Response.json({
      users,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return handleAppError(error);
  }
}
