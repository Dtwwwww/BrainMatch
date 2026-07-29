'use client';

import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
} as const;

const AVATAR_COLORS = [
  'bg-brand text-zinc-900',
  'bg-indigo-500 text-white',
  'bg-emerald-500 text-white',
  'bg-rose-500 text-white',
  'bg-cyan-500 text-zinc-900',
  'bg-violet-500 text-white',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  if (!name) return '?';
  // 中文取第一个字，英文取首字母大写
  const first = name.trim().charAt(0);
  return /[一-鿿]/.test(first) ? first : first.toUpperCase();
}

export default function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_MAP[size];
  const displayName = name || '用户';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={displayName}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover border border-white/[0.08]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full border border-white/[0.08] flex items-center justify-center font-semibold ${getAvatarColor(
        displayName
      )}`}
      title={displayName}
    >
      {getInitial(displayName)}
    </div>
  );
}
