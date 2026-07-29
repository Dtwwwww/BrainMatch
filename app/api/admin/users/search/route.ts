export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { handleAppError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/search
 * 按邮箱/手机号搜索用户（service_role 绕过 RLS）
 */
export async function GET(req: Request) {
  try {
    const adminKey = req.headers.get('X-Admin-Key');
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    if (!query) {
      return Response.json({ error: '请输入搜索关键词' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name, created_at')
      .or(`email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ users: data || [] });
  } catch (error) {
    return handleAppError(error);
  }
}
