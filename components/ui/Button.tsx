import { cn } from '@/lib/utils/cn';
import { type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'paywall';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-gradient-to-r from-brand to-brand-dark',
    'text-zinc-900 font-semibold',
    'shadow-[0_0_20px_rgba(245,166,35,0.3)]',
    'hover:shadow-[0_0_30px_rgba(245,166,35,0.45)]',
    'hover:translate-y-[-1px]'
  ),
  secondary: cn(
    'bg-zinc-800 text-zinc-200',
    'border border-white/[0.08]',
    'hover:bg-zinc-700 hover:border-white/[0.14]'
  ),
  ghost: cn(
    'text-zinc-400',
    'hover:text-zinc-200 hover:bg-zinc-800/50'
  ),
  paywall: cn(
    'bg-gradient-to-r from-brand via-brand-light to-brand',
    'bg-[length:200%_100%] animate-shimmer',
    'text-zinc-900 font-bold',
    'shadow-[0_0_30px_rgba(245,166,35,0.4)]',
    'hover:shadow-[0_0_50px_rgba(245,166,35,0.6)]',
    'hover:scale-[1.02]'
  ),
};

/**
 * 按钮体系 — 4 种变体
 *
 * - primary: 品牌主按钮（Hero CTA / 核心操作）
 * - secondary: 次要按钮（非核心操作）
 * - ghost: 幽灵按钮（极轻操作）
 * - paywall: 付费 CTA（流光动画 + 强发光）
 */
export default function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'px-6 py-3 rounded-xl text-sm font-semibold',
        'active:scale-[0.98]',
        'transition-all duration-200',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
