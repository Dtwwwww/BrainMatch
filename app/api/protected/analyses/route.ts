import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/protected/analyses
 * 获取岗位列表（支持状态筛选、搜索、分页）
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const isArchived = searchParams.get('is_archived') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('analyses')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_archived', isArchived)
      .order('updated_at', { ascending: false });

    // 状态筛选
    if (status && status !== '全部') {
      query = query.eq('status', status);
    }

    // 搜索（公司名称或岗位名称）
    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,job_title.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return handleAppError(error);
  }
}
