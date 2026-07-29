'use client';
export const runtime = 'edge';


import { Suspense } from 'react';
import AnalysisDetailContent from './AnalysisDetailContent';

export default function AnalysisDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="animate-pulse text-zinc-500">加载中...</div>
        </div>
      }
    >
      <AnalysisDetailContent />
    </Suspense>
  );
}
