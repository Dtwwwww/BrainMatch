
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/logs
 * 获取操作日志列表（分页 + action 筛选 + target_id 搜索）
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
    const action = searchParams.get('action') || '';
    const targetId = searchParams.get('targetId') || '';
    const offset = (page - 1) * limit;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('admin_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action) {
      query = query.eq('action', action);
    }

    if (targetId) {
      query = query.ilike('target_id', `%${targetId}%`);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      logs: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return handleAppError(error);
  }
}
