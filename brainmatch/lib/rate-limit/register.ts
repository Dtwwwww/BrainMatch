/**
 * 注册 IP 限流
 * 单 IP 24h 内只允许 1 次新注册
 * 内存存储（服务重启清空，V1 够用）
 */
const registrations = new Map<string, number>();

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 小时

// 定期清理过期记录（每10分钟）
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  registrations.forEach((ts, ip) => {
    if (ts < cutoff) registrations.delete(ip);
  });
}, 10 * 60 * 1000);

/**
 * 检查此 IP 是否已注册过
 * @returns true 如果允许注册（未注册过）
 */
export function canRegister(ip: string): boolean {
  const ts = registrations.get(ip);
  if (!ts) return true;
  if (Date.now() - ts > WINDOW_MS) {
    registrations.delete(ip);
    return true;
  }
  return false;
}

/**
 * 标记此 IP 已注册
 */
export function markRegistered(ip: string): void {
  registrations.set(ip, Date.now());
}
