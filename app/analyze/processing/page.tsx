'use client';


import { Suspense } from 'react';
import ProcessingContent from './ProcessingContent';

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="animate-pulse text-zinc-500">加载中...</div>
        </div>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
