import { cn } from '@/lib/utils/cn';

const gradeStyles: Record<string, string> = {
  S: 'bg-[#3B1A24] text-[#F8719D] border-[#F8719D]/30 shadow-[0_0_12px_rgba(248,113,157,0.15)]',
  A: 'bg-[#2D2410] text-[#F5A623] border-[#F5A623]/30 shadow-[0_0_12px_rgba(245,166,35,0.15)]',
  B: 'bg-[#1A2A24] text-[#6EE7B7] border-[#6EE7B7]/30 shadow-[0_0_12px_rgba(110,231,183,0.10)]',
  C: 'bg-[#1F1F23] text-[#A1A1AA] border-[#A1A1AA]/30',
};

const gradeLabels: Record<string, string> = {
  S: '顶尖匹配',
  A: '优秀匹配',
  B: '合格匹配',
  C: '存在差距',
};

interface GradeBadgeProps {
  grade: 'S' | 'A' | 'B' | 'C';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * SABC 评级徽章 — 暗色主题专用配色 + 发光效果
 *
 * - S: 粉红色发光（稀有顶尖）
 * - A: 金色发光（优秀）
 * - B: 绿色微光（合格）
 * - C: 灰色无光（存在差距）
 */
export default function GradeBadge({
  grade,
  size = 'md',
  showLabel = false,
}: GradeBadgeProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-full border-2 font-bold',
          sizeClasses[size],
          gradeStyles[grade],
          'animate-in zoom-in-95 duration-500'
        )}
        style={{ animationFillMode: 'both' }}
      >
        {grade}
      </span>
      {showLabel && (
        <span className="text-xs text-zinc-500">{gradeLabels[grade]}</span>
      )}
    </div>
  );
}
