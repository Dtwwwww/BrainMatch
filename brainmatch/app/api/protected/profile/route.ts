
import { getAuthenticatedUser, createSupabaseAdminClient } from '@/lib/supabase/server';
import { handleAppError, AppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/protected/profile
 * 获取当前用户的完整 profile + credits
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    return Response.json({
      profile: user.profile,
      credits: user.credits,
    });
  } catch (error) {
    return handleAppError(error);
  }
}

/**
 * PATCH /api/protected/profile
 * 更新当前用户的 profile 字段（目前仅支持 full_name）
 * Body: { full_name?: string }
 */
export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, '请求体格式错误');
    }

    // ──── 白名单校验 ────
    const ALLOWED_FIELDS = ['full_name'] as const;
    const updates: Record<string, string> = {};

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'string') {
          throw new AppError(400, `${field} 必须是字符串`);
        }
        if (field === 'full_name') {
          const trimmed = body[field].trim();
          if (!trimmed) {
            throw new AppError(400, '昵称不能为空');
          }
          if (trimmed.length > 50) {
            throw new AppError(400, '昵称不能超过50个字符');
          }
          updates[field] = trimmed;
        } else {
          updates[field] = body[field].trim();
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, '没有可更新的字段');
    }

    // 使用 admin client 执行 UPDATE（绕过 RLS）
    const supabaseAdmin = await createSupabaseAdminClient();
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      throw new AppError(500, '更新失败，请稍后重试');
    }

    return Response.json({ success: true, profile: updatedProfile });
  } catch (error) {
    return handleAppError(error);
  }
}
