'use client';

import { cn } from '@/lib/utils/cn';
import Button from './Button';

interface PaywallBannerProps {
  price: string;
  message: string;
  onPay: () => void;
}

/**
 * 付费墙横幅 — 温度感设计
 *
 * 设计原则：
 * 1. 不使用红色或锁图标
 * 2. 价格用品牌金色展示
 * 3. 背景使用微弱品牌光晕
 * 4. emoji 增加亲和力
 */
export default function PaywallBanner({
  price,
  message,
  onPay,
}: PaywallBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* 柔和的品牌光晕背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-accent/5" />

      <div className="relative p-8 text-center">
        {/* 插图区 */}
        <div className="text-5xl mb-4">🔍</div>

        <h3 className="text-xl font-semibold text-zinc-200 mb-2">
          解锁完整分析报告
        </h3>
        <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">{message}</p>

        {/* 价格 */}
        <div className="flex items-baseline justify-center gap-1 mb-6">
          <span className="text-3xl font-bold text-brand">{price}</span>
          <span className="text-sm text-zinc-500">/ 次</span>
        </div>

        {/* CTA */}
        <button
          onClick={onPay}
          className={cn(
            'inline-flex px-8 py-4 rounded-2xl font-bold text-base',
            'bg-gradient-to-r from-brand via-brand-light to-brand',
            'bg-[length:200%_100%] animate-shimmer',
            'text-zinc-900',
            'shadow-[0_0_30px_rgba(245,166,35,0.4)]',
            'hover:shadow-[0_0_50px_rgba(245,166,35,0.6)]',
            'hover:scale-[1.02]',
            'transition-all duration-300'
          )}
        >
          立即解锁 ✨
        </button>

        <p className="text-xs text-zinc-600 mt-4">
          已有账号？{' '}
          <a
            href="/auth"
            className="text-zinc-400 hover:text-brand transition-colors"
          >
            登录查看
          </a>
        </p>
      </div>

      {/* 底部装饰线 */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
    </div>
  );
}
