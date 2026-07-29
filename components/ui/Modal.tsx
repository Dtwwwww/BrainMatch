'use client';

import { cn } from '@/lib/utils/cn';
import { useEffect, useCallback, type ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

/**
 * 玻璃态模态框 — 暗色背景 + backdrop-blur 遮罩 + 入场动画
 */
export default function Modal({ children, onClose, className }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[85vh] overflow-y-auto',
          'rounded-2xl border border-white/[0.08]',
          'bg-zinc-900/95 backdrop-blur-xl p-6',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_20px_60px_rgba(0,0,0,0.5)]',
          'animate-in zoom-in-95 fade-in duration-300',
          className
        )}
        style={{ animationFillMode: 'both' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}
