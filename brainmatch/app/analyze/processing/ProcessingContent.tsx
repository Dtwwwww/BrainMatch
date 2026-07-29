'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import type { SSEProgressType } from '@/lib/types';

const STEPS: { key: SSEProgressType; label: string; icon: string }[] = [
  { key: 'job_parser_done', label: '岗位解析', icon: '📋' },
  { key: 'resume_parser_done', label: '简历解析', icon: '📄' },
  { key: 'match_analyzer_done', label: '匹配分析', icon: '📊' },
  { key: 'completed', label: '面试题库', icon: '🎯' },
];

export default function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('analysisId');

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  const handleProgress = useCallback((type: SSEProgressType) => {
    setCompletedSteps((prev) => {
      const next = new Set<string>(prev);
      next.add(type);
      return next;
    });
    const stepIndex = STEPS.findIndex((s) => s.key === type);
    if (stepIndex >= 0) {
      setCurrentStep(stepIndex + 1);
    }
  }, []);

  const handleComplete = useCallback(() => {
    setCompletedSteps(new Set(STEPS.map((s) => s.key)));
    setCurrentStep(STEPS.length);
    setTimeout(() => {
      router.push(`/analysis/${analysisId}`);
    }, 800);
  }, [router, analysisId]);

  useEffect(() => {
    if (!analysisId) {
      setError('缺少分析 ID');
      return;
    }

    let eventSource: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      setIsPolling(true);
      let pollCount = 0;
      const MAX_POLLS = 90; // 90 × 2s = 180s（3 分钟上限）

      pollTimer = setInterval(async () => {
        pollCount++;
        try {
          const res = await fetch(`/api/protected/analyses/${analysisId}`);
          if (!res.ok) return;

          const data = await res.json();

          if (data.report_json?.interview_questions?.free?.length > 0) {
            handleComplete();
            cleanup();
          } else if (data.report_json) {
            if (!completedSteps.has('match_analyzer_done')) {
              handleProgress('match_analyzer_done');
            }
          } else if (data.resume_insight) {
            if (!completedSteps.has('resume_parser_done')) {
              handleProgress('resume_parser_done');
            }
          } else if (data.job_insight) {
            if (!completedSteps.has('job_parser_done')) {
              handleProgress('job_parser_done');
            }
          }

          // 超时保护：超过最大轮询次数，优雅降级
          if (pollCount >= MAX_POLLS) {
            clearInterval(pollTimer!);
            pollTimer = null;
            setIsPolling(false);
            // 如果有 report_json，至少匹配分析已完成，引导用户查看报告
            if (data.report_json) {
              setError('面试题库生成超时，您可先查看匹配分析结果');
            } else {
              setError('分析超时，请稍后重试或返回重新分析');
            }
          }
        } catch {
          // silent
        }
      }, 2000);
    };

    // SSE first
    eventSource = new EventSource(
      `/api/protected/analyze/status?analysisId=${analysisId}`
    );

    eventSource.addEventListener('progress', (e) => {
      try {
        const { type } = JSON.parse(e.data);
        if (type === 'completed') {
          handleComplete();
        } else {
          handleProgress(type as SSEProgressType);
        }
      } catch {}
    });

    eventSource.addEventListener('complete', () => {
      handleComplete();
    });

    eventSource.addEventListener('error', () => {
      cleanup();
      startPolling();
    });

    return cleanup;
  }, [analysisId, handleProgress, handleComplete, completedSteps]);

  if (error) {
    const hasReport = error.includes('匹配分析');
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-5xl mb-4">{hasReport ? '📊' : '😞'}</div>
          <h1 className="text-xl font-bold text-zinc-50 mb-2">
            {hasReport ? '部分完成' : '出错了'}
          </h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            {hasReport && (
              <a
                href={`/analysis/${analysisId}`}
                className="inline-flex px-6 py-2.5 rounded-xl bg-brand text-black font-medium hover:bg-brand-light transition-all text-sm"
              >
                查看匹配报告
              </a>
            )}
            <a
              href="/analyze"
              className="inline-flex px-6 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 transition-all text-sm"
            >
              返回重试
            </a>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4 animate-pulse-glow">⚡</div>
          <h1 className="text-xl font-bold text-zinc-50 mb-2">
            正在分析中...
          </h1>
          <p className="text-sm text-zinc-400">
            {isPolling && '（已切换至轮询模式）'}
          </p>
        </div>

        <GlassCard className="p-8">
          <div className="space-y-0">
            {STEPS.map((step, index) => {
              const isCompleted = completedSteps.has(step.key);
              const isCurrent = index === currentStep && !isCompleted;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-500 ${
                        isCompleted
                          ? 'bg-brand border-brand shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                          : isCurrent
                          ? 'border-brand bg-brand/10 animate-pulse'
                          : 'border-zinc-700 bg-zinc-800/50'
                      }`}
                    >
                      {isCompleted ? '✓' : step.icon}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-8 transition-colors duration-500 ${
                          isCompleted ? 'bg-brand' : 'bg-zinc-800'
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-2.5">
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isCompleted
                          ? 'text-brand'
                          : isCurrent
                          ? 'text-zinc-200'
                          : 'text-zinc-600'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-zinc-500 mt-0.5 animate-pulse">
                        AI 正在处理...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <p className="text-center text-xs text-zinc-600 mt-6">
          分析完成后将自动跳转至报告页，请耐心等待
        </p>
      </div>
    </div>
  );
}
