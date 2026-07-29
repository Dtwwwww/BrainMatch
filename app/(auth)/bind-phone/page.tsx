'use client';
export const runtime = 'edge';


import { Suspense } from 'react';
import BindPhoneContent from './BindPhoneContent';

export default function BindPhonePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="animate-pulse text-zinc-500">加载中...</div>
        </div>
      }
    >
      <BindPhoneContent />
    </Suspense>
  );
}
