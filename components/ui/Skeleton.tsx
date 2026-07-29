import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

/**
 * Shimmer 骨架屏加载占位
 */
export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-zinc-800/50',
        className
      )}
    />
  );
}
