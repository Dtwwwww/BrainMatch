
import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';
import { logAdminAction } from '@/lib/admin/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/:id/ban
 * 封禁用户
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const adminKey = req.headers.get('X-Admin-Key');
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const userId = params.id;
    const { reason } = await req.json();

    if (!userId) {
      return Response.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from('user_config')
      .update({
        is_flagged: true,
        flag_reason: reason || '管理员手动封禁',
      })
      .eq('user_id', userId);

    // 记录操作日志
    await logAdminAction({
      action: 'ban_user',
      targetType: 'user',
      targetId: userId,
      details: {
        reason: reason || '管理员手动封禁',
      },
      adminKey,
    });

    return Response.json({
      success: true,
      message: '用户已封禁',
    });
  } catch (error) {
    return handleAppError(error);
  }
}
