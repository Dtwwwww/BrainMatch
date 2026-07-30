
import { Suspense } from 'react';
import type { Metadata } from 'next';
import SettingsContent from './SettingsContent';

export const metadata: Metadata = {
  title: '个人设置 — 智析 BrainMatch',
};

export default function SettingsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-50 mb-8">个人设置</h1>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-zinc-500 text-sm">
                加载中...
              </div>
            </div>
          }
        >
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  );
}
