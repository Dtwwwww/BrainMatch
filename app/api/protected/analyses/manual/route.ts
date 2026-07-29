
import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase/server';

import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = "force-dynamic";

/**
 * POST /api/protected/analyses/manual
 * 手动创建岗位（无需 AI 分析）
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();
    const { companyName, jobTitle, jobUrl, status, note, appliedAt } =
      await req.json();

    if (!companyName || !jobTitle) {
      return Response.json(
        { error: '公司名称和岗位名称不能为空' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        jd_text: '手动添加的岗位（未分析）',
        resume_text: '手动添加的岗位（未分析）',
        company_name: companyName,
        job_title: jobTitle,
        job_url: jobUrl || null,
        status: status || '已投递',
        applied_at: appliedAt || new Date().toISOString(),
        note: note || null,
        status_history: [
          {
            from: null,
            to: status || '已投递',
            changed_at: new Date().toISOString(),
            note: '手动创建岗位',
          },
        ],
      } as any)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return handleAppError(error);
  }
}
