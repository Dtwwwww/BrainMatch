'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * 创建浏览器端 Supabase 客户端（用于 Client Components）
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
