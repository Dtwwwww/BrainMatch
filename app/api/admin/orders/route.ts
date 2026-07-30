
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders
 * 获取全部订单列表（分页 + 状态筛选 + 用户搜索）
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
    const status = searchParams.get('status') || '';
    const search = (searchParams.get('search') || '').trim();
    const offset = (page - 1) * limit;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 先获取用户ID过滤（如果有搜索条件）
    let userIds: string[] | null = null;
    if (search) {
      const { data: matchedUsers } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.ilike.%${search}%,phone.ilike.%${search}%,full_name.ilike.%${search}%`);
      userIds = matchedUsers?.map((u: any) => u.id) || [];
      if (userIds.length === 0) {
        return Response.json({ orders: [], total: 0, page, limit, totalPages: 0 });
      }
    }

    let query = supabase
      .from('orders')
      .select(
        `id, user_id, package_id, credits, amount, status, payment_provider, created_at,
         profiles ( email, phone, full_name )`,
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
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
      .from('orders')
      .select('status, amount');

    const stats = {
      totalOrders: statsData?.length || 0,
      totalRevenue: 0,
      pendingAmount: 0,
      refundAmount: 0,
    };

    for (const o of statsData || []) {
      const amt = parseFloat(o.amount) || 0;
      if (o.status === 'paid') stats.totalRevenue += amt;
      else if (o.status === 'pending') stats.pendingAmount += amt;
      else if (o.status === 'refunded') stats.refundAmount += amt;
    }

    stats.totalRevenue = Math.round(stats.totalRevenue * 100) / 100;
    stats.pendingAmount = Math.round(stats.pendingAmount * 100) / 100;
    stats.refundAmount = Math.round(stats.refundAmount * 100) / 100;

    return Response.json({
      orders: data || [],
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
