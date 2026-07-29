import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";


/**
 * GET /api/public/share/[token]
 * 公开分享页数据 — 无需登录，RLS 策略允许 is_proxy=true 的记录公开读取
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('analyses')
      .select('report_json, is_proxy, proxy_recipient_name, created_at, company_name, job_title')
      .eq('share_token', params.token)
      .eq('is_proxy', true)
      .single();

    if (error || !data) {
      return Response.json(
        { error: '报告不存在或链接已失效' },
        { status: 404 }
      );
    }

    // 只返回摘要信息（不暴露完整分析细节）
    const report = data.report_json;
    const summary = report
      ? {
          overall_score: report.overall_score,
          sabc_rating: report.sabc_rating,
          strengths: report.sabc_rating?.justification?.strengths_summary,
          weaknesses: report.sabc_rating?.justification?.weaknesses_summary,
        }
      : null;

    return Response.json({
      summary,
      recipientName: data.proxy_recipient_name,
      companyName: data.company_name,
      jobTitle: data.job_title,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Share error:', error);
    return Response.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
