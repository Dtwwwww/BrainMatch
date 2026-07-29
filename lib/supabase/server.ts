import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import type { AuthenticatedUser } from '@/lib/types';

/**
 * 创建服务端 Supabase 客户端（用于 Route Handlers 和 Server Components）
 */
export async function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key: string) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

/**
 * 获取已认证用户信息（含 profile 和 credits）
 * 未认证时抛出 Error('Unauthorized')
 *
 * 优先从 Cookie 读取，其次从 Authorization: Bearer header 读取
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  let userId: string | null = data?.user?.id || null;

  // 如果 cookie 中没有 session，尝试从 Authorization header 获取
  if (!userId) {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: tokenData, error: tokenError } =
        await supabase.auth.getUser(token);
      if (!tokenError && tokenData?.user) {
        userId = tokenData.user.id;
      }
    }
  }

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // 用 service_role 客户端查询（不依赖 cookie）
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: credits } = await supabaseAdmin
    .from('user_credits')
    .select('remaining_analyses, total_purchased')
    .eq('user_id', userId)
    .single();

  return {
    id: userId,
    email: undefined,
    profile: profile || null,
    credits: credits || { remaining_analyses: 0, total_purchased: 0 },
  };
}

/**
 * 获取用户 ID（轻量，仅用于鉴权校验）
 * 未认证时抛出 Error('Unauthorized')
 */
export async function getUserId(): Promise<string> {
  const user = await getAuthenticatedUser();
  return user.id;
}

/**
 * 创建 Supabase 服务端客户端（使用 service_role key，用于绕过 RLS 的管理操作）
 */
export async function createSupabaseAdminClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: (key: string) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}
