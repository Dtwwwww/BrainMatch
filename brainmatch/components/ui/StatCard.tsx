import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: number;
  gradient?: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * 统计卡片 — 渐变数字 + 选中指示器
 *
 * 用于 Dashboard 统计概览区域
 */
export default function StatCard({
  label,
  value,
  gradient = 'bg-gradient-to-b from-zinc-400 to-zinc-600',
  active = false,
  onClick,
}: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center p-4 rounded-2xl',
        'border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm',
        'transition-all duration-300',
        active && 'border-brand/30 bg-brand/5',
        'hover:border-white/[0.12] hover:bg-zinc-900/80'
      )}
    >
      <span
        className={cn(
          'text-3xl font-bold font-mono tabular-nums',
          gradient,
          'bg-clip-text text-transparent'
        )}
      >
        {value}
      </span>
      <span className="text-xs text-zinc-500 mt-1">{label}</span>
      {/* 选中指示器 */}
      {active && (
        <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-brand" />
      )}
    </button>
  );
}
