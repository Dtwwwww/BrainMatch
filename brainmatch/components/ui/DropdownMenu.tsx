'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export interface DropdownItem {
  type: 'link' | 'button' | 'divider';
  label?: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: DropdownItem[];
  /** 触发元素的 ref，用于定位菜单 */
  triggerRef: React.RefObject<HTMLElement | null>;
  align?: 'left' | 'right';
}

export default function DropdownMenu({
  isOpen,
  onClose,
  items,
  triggerRef,
  align = 'right',
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; [key: string]: number }>({ top: 0, right: 0 });

  // 计算菜单位置
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const menuWidth = 192; // w-48 = 12rem
      const gap = 8;
      const pos: { top: number; [key: string]: number } = {
        top: rect.bottom + gap,
      };
      if (align === 'right') {
        pos.right = window.innerWidth - rect.right;
      } else {
        pos.left = rect.left;
      }
      setPosition(pos);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, triggerRef, align]);

  // SSR 安全
  useEffect(() => {
    setMounted(true);
  }, []);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        // 点击菜单外部 且 不是触发器元素 → 关闭
        if (
          menuRef.current && !menuRef.current.contains(target) &&
          triggerRef.current && !triggerRef.current.contains(target)
        ) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      (menuRef as any)._outsideHandler = handleClickOutside;
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    (menuRef as any)._keyHandler = handleKeyDown;

    return () => {
      clearTimeout(timer);
      if ((menuRef as any)._outsideHandler) {
        document.removeEventListener('mousedown', (menuRef as any)._outsideHandler);
      }
      if ((menuRef as any)._keyHandler) {
        document.removeEventListener('keydown', (menuRef as any)._keyHandler);
      }
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !mounted) return null;

  const menu = (
    <div
      ref={menuRef}
      className="fixed w-48 py-1.5 bg-zinc-900/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-lg shadow-black/40 z-[100]"
      style={{
        top: position.top,
        right: position.right,
        left: position.left,
        animationName: 'enter',
        animationDuration: '150ms',
        animationFillMode: 'both',
        '--tw-enter-opacity': '0',
        '--tw-enter-scale': '0.95',
      } as React.CSSProperties}
    >
      {items.map((item, i) => {
        if (item.type === 'divider') {
          return (
            <div
              key={i}
              className="my-1.5 border-t border-white/[0.06]"
            />
          );
        }

        const baseClasses =
          'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors';

        if (item.type === 'link' && item.href) {
          return (
            <Link
              key={i}
              href={item.href}
              onClick={onClose}
              className={`${baseClasses} text-zinc-300 hover:text-zinc-50 hover:bg-white/[0.06] ${
                item.danger ? 'text-red-400 hover:text-red-300' : ''
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        }

        if (item.type === 'button') {
          return (
            <button
              key={i}
              onClick={() => {
                item.onClick?.();
              }}
              className={`${baseClasses} text-zinc-300 hover:text-zinc-50 hover:bg-white/[0.06] ${
                item.danger
                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                  : ''
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        }

        return null;
      })}
    </div>
  );

  return createPortal(menu, document.body);
}
