'use client';
export const runtime = 'edge';


import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import GradeBadge from '@/components/ui/GradeBadge';

interface ShareData {
  summary: {
    overall_score: number;
    sabc_rating: { grade: 'S' | 'A' | 'B' | 'C' };
    strengths: string;
    weaknesses: string;
  } | null;
  recipientName: string | null;
  companyName: string | null;
  jobTitle: string | null;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/share/${token}`);
        if (res.ok) {
          setData(await res.json());
        } else {
          setError('报告不存在或链接已失效');
        }
      } catch {
        setError('网络错误');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-zinc-50 mb-2">
            链接已失效
          </h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a
            href="/auth"
            className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm hover:translate-y-[-1px] transition-all"
          >
            立即注册，分析你的匹配度 →
          </a>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-2xl mb-4">🤝</div>
          <h1 className="text-2xl font-bold text-zinc-50 mb-2">
            {data.recipientName || '朋友'} 的匹配分析
          </h1>
          <p className="text-sm text-zinc-500">
            {data.companyName && data.jobTitle
              ? `${data.companyName} · ${data.jobTitle}`
              : 'AI 求职教练帮朋友分析的匹配结果'}
          </p>
        </div>

        {/* 评级展示 */}
        {data.summary && (
          <GlassCard className="p-8 text-center mb-8">
            <div className="flex justify-center mb-6">
              <GradeBadge
                grade={data.summary.sabc_rating.grade}
                size="lg"
                showLabel
              />
            </div>

            <div className="text-5xl font-bold font-mono mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand via-brand-light to-brand-dark">
                {data.summary.overall_score}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mb-8">综合匹配得分</p>

            {/* 优势 */}
            {data.summary.strengths && (
              <div className="text-left mb-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                <p className="text-xs text-emerald-400 font-medium mb-1">
                  ✨ 匹配优势
                </p>
                <p className="text-sm text-zinc-300">{data.summary.strengths}</p>
              </div>
            )}

            {/* 差距 */}
            {data.summary.weaknesses && (
              <div className="text-left p-4 rounded-xl bg-amber-950/20 border border-amber-800/30">
                <p className="text-xs text-amber-400 font-medium mb-1">
                  📌 需要关注
                </p>
                <p className="text-sm text-zinc-300">{data.summary.weaknesses}</p>
              </div>
            )}
          </GlassCard>
        )}

        {/* 底部 CTA */}
        <div className="text-center">
          <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-brand/5 via-transparent to-accent/5">
            <h2 className="text-xl font-bold text-zinc-50 mb-2">
              也想看看你的匹配度？
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              立即注册即送 1 次完整分析，获取你的专属 SABC 评级报告
            </p>
            <a
              href="/auth"
              className="inline-flex px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-bold text-sm shadow-glow-brand hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] hover:translate-y-[-1px] transition-all"
            >
              立即开始分析 ✨
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
