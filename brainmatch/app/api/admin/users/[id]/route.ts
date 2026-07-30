
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/:id
 * 获取单个用户的完整信息（含 analyses、transactions、orders）
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const adminKey = req.headers.get('X-Admin-Key');
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const userId = params.id;
    if (!userId) {
      return Response.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 并行查询用户基础信息、配置、分析记录、流水、订单
    const [
      profileRes,
      creditsRes,
      configRes,
      analysesRes,
      transactionsRes,
      ordersRes,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, phone, full_name, avatar_url, wechat_openid, wechat_unionid, phone_verified, wechat_verified, created_at')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_credits')
        .select('remaining_analyses, total_purchased, updated_at')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('user_config')
        .select('request_count, is_flagged, flag_reason, credits_frozen, credits_gifted, credits_refunded')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('analyses')
        .select('id, company_name, job_title, status, report_json, created_at')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('credit_transactions')
        .select('id, type, amount, balance_after, meta, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('orders')
        .select('id, package_id, credits, amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (profileRes.error) {
      return Response.json({ error: profileRes.error.message }, { status: 500 });
    }

    // 统计 analyses 总数和 offer 数（不受 limit 20 限制）
    const { data: allAnalyses, error: countError } = await supabase
      .from('analyses')
      .select('status')
      .eq('user_id', userId)
      .eq('is_archived', false);

    const analysisCount = allAnalyses?.length || 0;
    const offerCount = allAnalyses?.filter((a: any) => a.status === '已拿Offer').length || 0;

    return Response.json({
      profile: profileRes.data,
      credits: creditsRes.data || { remaining_analyses: 0, total_purchased: 0 },
      config: configRes.data || null,
      analysis_count: analysisCount,
      offer_count: offerCount,
      analyses: analysesRes.data || [],
      transactions: transactionsRes.data || [],
      orders: ordersRes.data || [],
    });
  } catch (error) {
    return handleAppError(error);
  }
}
