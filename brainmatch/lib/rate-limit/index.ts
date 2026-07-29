import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { AppError } from '@/lib/api/error-handler';

/**
 * Upstash Redis 限流器
 * 每用户每 60 秒最多 1 次请求
 *
 * 开发模式：如果未配置 Upstash，使用内存限流
 */

// 内存限流（开发回退方案）
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function getMemoryLimiter() {
  return {
    limit: async (key: string) => {
      const now = Date.now();
      const record = memoryStore.get(key);

      if (record && now < record.resetAt) {
        record.count++;
        const remaining = Math.max(0, 1 - record.count);
        return {
          success: remaining > 0,
          limit: 1,
          remaining,
          reset: record.resetAt,
        };
      }

      memoryStore.set(key, { count: 1, resetAt: now + 60_000 });

      // 清理过期记录
      const keysToDelete: string[] = [];
      memoryStore.forEach((v, k) => {
        if (now > v.resetAt) keysToDelete.push(k);
      });
      keysToDelete.forEach(k => memoryStore.delete(k));

      return { success: true, limit: 1, remaining: 0, reset: now + 60_000 };
    },
  };
}

/**
 * 检查用户是否在限流窗口内
 *
 * 抛出 AppError(429) 如果超限
 */
export async function rateLimitCheck(userId: string): Promise<void> {
  let result: {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  };

  // 尝试使用 Upstash Redis
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      const redis = Redis.fromEnv();
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(1, '60s'),
      });
      result = await ratelimit.limit(userId);
    } catch {
      // Upstash 不可用时回退到内存限流
      console.warn('Upstash unavailable, using in-memory rate limiting');
      result = await getMemoryLimiter().limit(userId);
    }
  } else {
    // 开发模式：内存限流
    result = await getMemoryLimiter().limit(userId);
  }

  if (!result.success) {
    const seconds = Math.ceil((result.reset - Date.now()) / 1000);
    throw new AppError(
      429,
      `请求过于频繁，请 ${seconds} 秒后重试`,
      'rate_limited'
    );
  }
}
