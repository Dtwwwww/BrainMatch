import { cn } from '@/lib/utils/cn';

const statusStyles: Record<string, string> = {
  '分析完成':
    'bg-zinc-800 text-zinc-300 border-zinc-700',
  '待投递':
    'bg-zinc-800 text-zinc-300 border-zinc-700',
  '已投递':
    'bg-blue-950/40 text-blue-300 border-blue-800/50',
  '面试中':
    'bg-amber-950/40 text-amber-300 border-amber-800/50',
  '已拿Offer':
    'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
  '已结束':
    'bg-zinc-900 text-zinc-500 border-zinc-800',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * 投递状态标签 — 圆点 + 文字 + 暗色主题配色
 *
 * 色彩叙事：从冷灰（待投递）→ 蓝（已投递）→ 金（面试中）→ 绿光（Offer）
 */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-3 py-1 rounded-full text-xs font-medium border',
        statusStyles[status] || statusStyles['分析完成'],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
