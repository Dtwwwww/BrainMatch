import { cn } from '@/lib/utils/cn';
import { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * 玻璃态卡片 — 暗黑高级感核心视觉元素
 *
 * 特性：
 * - 半透明深色底 + backdrop-blur
 * - 微弱白色边框 + inner shadow
 * - 顶部光晕装饰线
 * - 可选 hover 悬浮效果
 */
export default function GlassCard({
  children,
  className,
  hover = true,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/[0.08]',
        'bg-zinc-900/70 backdrop-blur-xl',
        'shadow-[0_1px_3px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)_inset]',
        hover && [
          'hover:border-white/[0.14]',
          'hover:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset]',
          'hover:translate-y-[-2px]',
        ],
        'transition-all duration-300 ease-out',
        className
      )}
    >
      {/* 顶部光晕装饰线 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
      {children}
    </div>
  );
}
