import { createHash } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { JobInsight } from '@/lib/types';

/**
 * 获取缓存的岗位解析结果
 * 使用 SHA256 精确匹配 JD 文本
 */
export async function getCachedJobInsight(
  jdText: string
): Promise<JobInsight | null> {
  const hash = createHash('sha256').update(jdText).digest('hex');
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('jd_cache')
    .select('job_insight, id, hit_count')
    .eq('jd_hash', hash)
    .single();

  if (error || !data) {
    return null;
  }

  // 异步更新命中计数（非阻塞）
  supabase
    .from('jd_cache')
    .update({ hit_count: (data.hit_count || 0) + 1 })
    .eq('id', data.id)
    .then(({ error }) => {
      if (error) console.warn('Failed to update cache hit count:', error.message);
    });

  return data.job_insight as JobInsight;
}

/**
 * 缓存岗位解析结果
 * 使用 onConflict 处理并发写入的竞态条件
 */
export async function cacheJobInsight(
  jdText: string,
  jobInsight: JobInsight
): Promise<void> {
  const hash = createHash('sha256').update(jdText).digest('hex');
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('jd_cache')
    .upsert(
      {
        jd_hash: hash,
        job_insight: jobInsight,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'jd_hash', ignoreDuplicates: false }
    );

  if (error) {
    console.warn('Failed to cache job insight:', error.message);
  }
}
