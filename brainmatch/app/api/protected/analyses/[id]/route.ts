import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase/server';

import { handleAppError, AppError } from '@/lib/api/error-handler';

export const dynamic = "force-dynamic";

/**
 * GET    /api/protected/analyses/[id] — 获取单个分析记录
 * PATCH  /api/protected/analyses/[id] — 更新岗位信息（状态、公司、备注等）
 * DELETE /api/protected/analyses/[id] — 归档分析记录
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return Response.json(
        { error: '分析记录不存在', code: 'not_found' },
        { status: 404 }
      );
    }

    return Response.json(data);
  } catch (error) {
    return handleAppError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();

    // 1. 校验归属
    const { data: existing } = await supabase
      .from('analyses')
      .select('user_id, status, status_history')
      .eq('id', params.id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return Response.json(
        { error: '无权操作此记录', code: 'forbidden' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    // 状态变更处理
    if (body.status && body.status !== existing.status) {
      const history = (existing.status_history || []) as any[];
      history.push({
        from: existing.status,
        to: body.status,
        changed_at: new Date().toISOString(),
        note: body.statusNote || '',
      });

      updates.status = body.status;
      updates.status_history = history;

      // 特殊处理：状态变为"已投递"时自动记录投递时间
      if (body.status === '已投递' && !body.applied_at) {
        updates.applied_at = new Date().toISOString();
      }
    }

    // 其他字段更新
    const updatableFields = [
      'note',
      'company_name',
      'job_title',
      'job_url',
      'applied_at',
      'interview_round',
      'interview_date',
      'is_archived',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    // 执行更新
    const { data, error } = await supabase
      .from('analyses')
      .update(updates)
      .eq('id', params.id)
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();

    // 归档（软删除）而非硬删除
    const { data, error } = await supabase
      .from('analyses')
      .update({ is_archived: true })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: '已归档',
      data,
    });
  } catch (error) {
    return handleAppError(error);
  }
}
