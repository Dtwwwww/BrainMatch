
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/protected/credits/keep
 * 保留剩余次数（标记不再提示）
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from('user_config')
      .upsert({ user_id: user.id, request_count: 0 }, { onConflict: 'user_id' })
      .select();

    return Response.json({ success: true, message: '次数已保留，随时可用' });
  } catch (error) {
    return handleAppError(error);
  }
}
