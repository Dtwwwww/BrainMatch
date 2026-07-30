
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/transactions
 * 获取全部消费流水（分页 + 类型筛选 + 用户搜索）
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
    const type = searchParams.get('type') || '';
    const search = (searchParams.get('search') || '').trim();
    const offset = (page - 1) * limit;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 先获取用户ID过滤
    let userIds: string[] | null = null;
    if (search) {
      const { data: matchedUsers } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.ilike.%${search}%,phone.ilike.%${search}%,full_name.ilike.%${search}%`);
      userIds = matchedUsers?.map((u: any) => u.id) || [];
      if (userIds.length === 0) {
        return Response.json({ transactions: [], total: 0, page, limit, totalPages: 0 });
      }
    }

    let query = supabase
      .from('credit_transactions')
      .select(
        `id, user_id, type, amount, balance_after, meta, created_at,
         profiles ( email, phone, full_name )`,
        { count: 'exact' }
      );

    if (type) {
      query = query.eq('type', type);
    }

    if (userIds) {
      query = query.in('user_id', userIds);
    }

    query = query.order('created_at', { ascending: false });
    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // 统计
    const { data: statsData } = await supabase
      .from('credit_transactions')
      .select('type, amount');

    const stats = {
      totalIn: 0,
      totalOut: 0,
      net: 0,
      adminActions: 0,
    };

    for (const t of statsData || []) {
      if (t.type === 'admin_add' || t.type === 'admin_deduct') {
        stats.adminActions += 1;
      }
      if (t.amount > 0) stats.totalIn += t.amount;
      else if (t.amount < 0) stats.totalOut += Math.abs(t.amount);
    }

    stats.net = stats.totalIn - stats.totalOut;

    return Response.json({
      transactions: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (error) {
    return handleAppError(error);
  }
}
