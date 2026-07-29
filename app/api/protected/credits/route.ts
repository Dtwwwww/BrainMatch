export const runtime = 'edge';

import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase/server';

import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/credits
 * 获取当前用户剩余次数
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('user_credits')
      .select('remaining_analyses, total_purchased')
      .eq('user_id', user.id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data || { remaining_analyses: 0, total_purchased: 0 });
  } catch (error) {
    return handleAppError(error);
  }
}
