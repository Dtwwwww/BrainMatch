'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import GradeBadge from '@/components/ui/GradeBadge';
import StatusBadge from '@/components/ui/StatusBadge';
import PaywallBanner from '@/components/ui/PaywallBanner';
import Skeleton from '@/components/ui/Skeleton';
import type { AnalysisRecord, ReportJSON } from '@/lib/types';

const TABS = [
  { key: 'match', label: '匹配总览', icon: '📊' },
  { key: 'job', label: '岗位解析', icon: '📋' },
  { key: 'resume', label: '简历解析', icon: '📄' },
  { key: 'interview', label: '面试题库', icon: '🎯' },
];

export default function AnalysisDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;
  const activeTab = searchParams.get('tab') || 'match';

  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showWeaknessModal, setShowWeaknessModal] = useState(false);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<Set<string>>(new Set());
  const [unlockingExtra, setUnlockingExtra] = useState(false);
  const [extraQuestions, setExtraQuestions] = useState<ReportJSON['interview_questions']['extra']>([]);
  const [extraUnlocked, setExtraUnlocked] = useState(false);

  const fetchRecord = useCallback(async () => {
    try {
      const res = await fetch(`/api/protected/analyses/${analysisId}`);
      if (res.ok) {
        setRecord(await res.json());
      } else if (res.status === 404) {
        setError('分析记录不存在或无权访问');
      } else {
        setError('加载失败，请稍后重试');
      }
    } catch {
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const switchTab = (tab: string) => {
    router.push(`/analysis/${analysisId}?tab=${tab}`, { scroll: false });
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!record) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/protected/analyses/${analysisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecord(updated);
      }
    } catch {
      // 静默
    } finally {
      setUpdating(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  // 弱项选项
  const WEAKNESS_OPTIONS = [
    { value: '管理经验不足', label: '管理经验不足', icon: '👥' },
    { value: '频繁跳槽', label: '频繁跳槽', icon: '🔄' },
    { value: '技术栈不匹配', label: '技术栈不匹配', icon: '🔧' },
    { value: '学历偏低', label: '学历偏低', icon: '🎓' },
    { value: '年龄偏大/偏小', label: '年龄偏大/偏小', icon: '⏰' },
    { value: '空窗期过长', label: '空窗期过长', icon: '📅' },
    { value: '跨行业转行', label: '跨行业转行', icon: '🚀' },
    { value: '英语能力不足', label: '英语能力不足', icon: '🌐' },
  ];

  const handleUnlockExtra = async () => {
    if (!record) return;
    setUnlockingExtra(true);
    try {
      const weaknessAreas = Array.from(selectedWeaknesses);
      const res = await fetch('/api/protected/interview/extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: record.id,
          weaknessAreas: weaknessAreas.length > 0 ? weaknessAreas : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExtraQuestions(data.extra || []);
        setExtraUnlocked(true);
        setShowWeaknessModal(false);

        // 更新本地 record 状态
        if (record.report_json) {
          setRecord({
            ...record,
            report_json: {
              ...record.report_json,
              interview_questions: {
                free: record.report_json.interview_questions?.free || [],
                extra: data.extra || [],
              },
            },
          });
        }
      } else {
        const err = await res.json();
        alert(err.error || '解锁失败');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setUnlockingExtra(false);
    }
  };

  const report = record?.report_json;

  // 初始化：检查是否已有扩展题数据
  const hasExtraData =
    extraUnlocked ||
    (report?.interview_questions?.extra &&
      report.interview_questions.extra.length > 0);

  // 判断是否已购买（通过extra_questions_count字段）
  const hasPurchased = record?.extra_questions_count && record.extra_questions_count > 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // ======== Loading ========
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mb-10" />
          <Skeleton className="h-48 w-full mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ======== Error ========
  if (error || !record) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-5xl mb-4">😞</div>
          <h1 className="text-xl font-bold text-zinc-50 mb-2">加载失败</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError('');
              fetchRecord();
            }}
            className="px-6 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 transition-all text-sm"
          >
            重新加载
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ======== Header ======== */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-50 mb-1.5">
                {record.company_name || '未填写公司'}
              </h1>
              <p className="text-zinc-400 text-sm">
                {record.job_title || '未填写岗位'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={record.status} />
              <select
                value={record.status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                disabled={updating}
                className="px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-white/[0.08] text-zinc-400 focus:outline-none focus:border-brand/50 transition-colors disabled:opacity-50"
              >
                <option value="分析完成">分析完成</option>
                <option value="待投递">待投递</option>
                <option value="已投递">已投递</option>
                <option value="面试中">面试中</option>
                <option value="已拿Offer">已拿Offer</option>
                <option value="已结束">已结束</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-zinc-500">
            <span>创建于 {formatDate(record.created_at)}</span>
            {record.applied_at && (
              <>
                <span className="text-zinc-700">·</span>
                <span>投递 {formatDate(record.applied_at)}</span>
              </>
            )}
            {record.interview_round && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-amber-400">{record.interview_round}</span>
                {record.interview_date && (
                  <span className="text-amber-500">
                    （{formatDate(record.interview_date)}）
                  </span>
                )}
              </>
            )}
            {record.cache_hit && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-600">⚡ 缓存命中</span>
              </>
            )}
          </div>
        </div>

        {/* ======== 报告未生成 ======== */}
        {!report && (
          <GlassCard className="p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-lg font-semibold text-zinc-50 mb-2">
              报告生成中
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              AI 正在分析中，请稍后刷新页面查看完整报告
            </p>
            <button
              onClick={fetchRecord}
              className="px-6 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 transition-all text-sm"
            >
              刷新页面
            </button>
          </GlassCard>
        )}

        {/* ======== 报告已生成 ======== */}
        {report && (
          <>
            {/* 评级核心区 */}
            <GlassCard className="p-8 md:p-10 mb-8 text-center">
              <div className="flex justify-center mb-6">
                <GradeBadge
                  grade={report.sabc_rating.grade}
                  size="lg"
                  showLabel
                />
              </div>

              <div className="text-6xl font-bold font-mono mb-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand via-brand-light to-brand-dark">
                  {report.overall_score}
                </span>
              </div>
              <p className="text-sm text-zinc-500 mb-8">综合匹配得分</p>

              {/* 三维评分条 */}
              <div className="max-w-md mx-auto space-y-4">
                {[
                  { label: '硬性匹配', score: report.hard_score, pct: '55%', barColor: 'bg-blue-500', desc: '技能、经验、学历等可量化要求的匹配程度' },
                  { label: '软性匹配', score: report.soft_score, pct: '30%', barColor: 'bg-amber-500', desc: '沟通协作、学习能力、文化适配等素质要求的匹配程度' },
                  { label: '加分项', score: report.bonus_score, pct: '15%', barColor: 'bg-emerald-500', desc: '超出JD预期的亮点，如稀缺技能、行业认可、专利成果' },
                ].map((dim) => (
                  <div key={dim.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-zinc-400">{dim.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600">权重 {dim.pct}</span>
                        <span className="font-mono font-bold text-zinc-200">
                          {dim.score}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dim.barColor} transition-all duration-700`}
                        style={{ width: `${Math.min(100, Math.max(0, dim.score))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1 leading-tight">{dim.desc}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Tab 导航 */}
            <div className="flex border-b border-white/[0.06] mb-6 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'text-brand border-brand'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ======== Tab 1: 匹配总览 ======== */}
            {activeTab === 'match' && (
              <div className="space-y-6">
                {/* ═══════════════ 阶段一：评估结论 ═══════════════ */}

                {/* ======== 新增：评分逻辑说明 ======== */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    📐 评分逻辑说明
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* 三维评估模型 */}
                    <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/[0.06]">
                      <p className="text-xs text-zinc-400 font-medium mb-3">三维评估模型（加权综合）</p>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-sm text-zinc-300">硬性匹配 <span className="text-zinc-500">（55%）</span></span>
                        </div>
                        <p className="text-xs text-zinc-500 ml-4">技能、经验、学历等可量化要求的匹配程度</p>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-sm text-zinc-300">软性匹配 <span className="text-zinc-500">（30%）</span></span>
                        </div>
                        <p className="text-xs text-zinc-500 ml-4">沟通协作、学习能力、文化适配等素质要求的匹配程度</p>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-sm text-zinc-300">加分项 <span className="text-zinc-500">（15%）</span></span>
                        </div>
                        <p className="text-xs text-zinc-500 ml-4">超出JD预期的亮点，如稀缺技能、行业认可、专利成果</p>
                      </div>
                    </div>
                    {/* SABC 等级参考 */}
                    <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/[0.06]">
                      <p className="text-xs text-zinc-400 font-medium mb-3">SABC 等级参考</p>
                      <div className="space-y-2">
                        {[
                          { grade: 'S', range: '90-100', label: '顶尖匹配', desc: '能力全面覆盖，强烈推荐推进面试', color: 'text-[#F8719D]', bg: 'bg-[#F8719D]/10' },
                          { grade: 'A', range: '75-89', label: '优秀匹配', desc: '高度匹配岗位，重点准备弱项后可面试', color: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10' },
                          { grade: 'B', range: '60-74', label: '合格匹配', desc: '具备基本条件，需针对性补强后再投递', color: 'text-[#6EE7B7]', bg: 'bg-[#6EE7B7]/10' },
                          { grade: 'C', range: '&lt;60', label: '存在差距', desc: '建议评估投入产出比，或考虑要求更低的岗位', color: 'text-[#A1A1AA]', bg: 'bg-zinc-800' },
                        ].map((g) => (
                          <div key={g.grade} className={`flex items-center gap-2 p-2 rounded-lg ${g.bg}`}>
                            <span className={`text-sm font-bold ${g.color} w-6 text-center shrink-0`}>{g.grade}</span>
                            <span className="text-xs text-zinc-500 w-12 shrink-0">{g.range}</span>
                            <span className="text-xs text-zinc-400">{g.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* LLM 动态评分解释 */}
                  {report.scoring_rationale && (
                    <div className="p-4 rounded-xl bg-brand/5 border border-brand/20">
                      <p className="text-xs text-brand font-medium mb-1">📌 本次评估</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{report.scoring_rationale}</p>
                    </div>
                  )}
                </GlassCard>

                {/* ======== 评级依据（前移） ======== */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    📝 评级依据
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                      <p className="text-xs text-emerald-400 font-medium mb-1.5">
                        ✨ 优势总结
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {report.sabc_rating.justification.strengths_summary}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30">
                      <p className="text-xs text-amber-400 font-medium mb-1.5">
                        📌 不足之处
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {report.sabc_rating.justification.weaknesses_summary}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/[0.08]">
                      <p className="text-xs text-zinc-400 font-medium mb-1.5">
                        📋 综合判断
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {report.sabc_rating.justification.final_verdict}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* 阶段分隔：评估结论 → 深度验证 */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                  <span className="text-xs text-zinc-600 shrink-0">深度验证</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                </div>

                {/* ═══════════════ 阶段二：深度验证 ═══════════════ */}

                {/* ======== 候选人适配画像 ======== */}
                {report.job_fit_portrait && (
                  <GlassCard className="p-6 border-l-4 border-l-brand/60">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">🎯</span>
                      <h3 className="text-base font-semibold text-zinc-100">候选人适配画像</h3>
                      <span className="text-xs text-zinc-500 ml-2">猎头视角深度解读</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                      {report.job_fit_portrait}
                    </p>
                  </GlassCard>
                )}

                {/* ======== 核心竞争力拆解 ======== */}
                {report.core_advantages && report.core_advantages.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      💎 核心竞争力拆解
                    </h3>
                    <div className="space-y-4">
                      {report.core_advantages.map((adv, i) => {
                        const signalColors = {
                          strong: 'border-emerald-800/30 bg-emerald-950/20',
                          moderate: 'border-amber-800/30 bg-amber-950/20',
                          edge: 'border-zinc-700/30 bg-zinc-900/50',
                        }[adv.signal] || 'border-zinc-700/30 bg-zinc-900/50';
                        const signalLabels = {
                          strong: '显著优势',
                          moderate: '中等优势',
                          edge: '微弱优势',
                        }[adv.signal] || '';
                        return (
                          <div key={i} className={`p-5 rounded-xl border ${signalColors}`}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-zinc-100">
                                {adv.title}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                adv.signal === 'strong' ? 'bg-emerald-900/40 text-emerald-400' :
                                adv.signal === 'moderate' ? 'bg-amber-900/40 text-amber-400' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {signalLabels}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              {adv.detail}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

                {/* ======== 差距分析与补救路径 ======== */}
                {report.gap_analysis && report.gap_analysis.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      🛠️ 差距分析与补救路径
                    </h3>
                    <div className="space-y-6">
                      {report.gap_analysis.map((gap, i) => {
                        const severityColors = {
                          '关键': 'text-red-400 bg-red-900/30',
                          '重要': 'text-amber-400 bg-amber-900/30',
                          '次要': 'text-zinc-400 bg-zinc-800',
                        }[gap.severity] || 'text-zinc-400 bg-zinc-800';
                        return (
                          <div key={i} className="p-4 rounded-xl bg-zinc-900/70 border border-white/[0.06]">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColors}`}>
                                {gap.severity}
                              </span>
                              <h4 className="text-sm font-semibold text-zinc-100">{gap.gap}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/[0.04]">
                                <p className="text-xs text-zinc-500 mb-1">当前状况</p>
                                <p className="text-xs text-zinc-300">{gap.current_state}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/[0.04]">
                                <p className="text-xs text-zinc-500 mb-1">JD 期望</p>
                                <p className="text-xs text-zinc-300">{gap.jd_expectation}</p>
                              </div>
                            </div>
                            {gap.remediation && (
                              <div className="space-y-2 pl-2 border-l-2 border-brand/30">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-brand shrink-0 mt-0.5">⚡</span>
                                  <div>
                                    <span className="text-xs text-brand font-medium">立即可做</span>
                                    <p className="text-xs text-zinc-400 mt-0.5">{gap.remediation.quick_win}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-brand shrink-0 mt-0.5">📅</span>
                                  <div>
                                    <span className="text-xs text-brand font-medium">1个月内</span>
                                    <p className="text-xs text-zinc-400 mt-0.5">{gap.remediation['1_month']}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-brand shrink-0 mt-0.5">🎯</span>
                                  <div>
                                    <span className="text-xs text-brand font-medium">3个月内</span>
                                    <p className="text-xs text-zinc-400 mt-0.5">{gap.remediation['3_month']}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-brand shrink-0 mt-0.5">💬</span>
                                  <div>
                                    <span className="text-xs text-brand font-medium">面试话术方向</span>
                                    <p className="text-xs text-zinc-400 mt-0.5">{gap.remediation.signal_in_interview}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

                {/* ======== 面试竞争力预测 ======== */}
                {report.interview_readiness && (
                  <GlassCard className="p-6">
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      🎤 面试竞争力预测
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                      {report.interview_readiness.overall_assessment}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                        <p className="text-xs text-emerald-400 font-medium mb-2">💪 面试中的核心竞争力</p>
                        <ul className="space-y-1.5">
                          {report.interview_readiness.strong_points_in_interview.map((pt, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex items-center gap-2">
                              <span className="text-emerald-500 text-xs">▸</span>{pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30">
                        <p className="text-xs text-amber-400 font-medium mb-2">⚠️ 可能被挑战的点</p>
                        <ul className="space-y-1.5">
                          {report.interview_readiness.weak_points_in_interview.map((pt, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex items-center gap-2">
                              <span className="text-amber-500 text-xs">▸</span>{pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-brand/5 border border-brand/20">
                      <p className="text-xs text-brand font-medium mb-1">📋 备考策略建议</p>
                      <p className="text-sm text-zinc-300">{report.interview_readiness.recommended_prep_focus}</p>
                    </div>
                  </GlassCard>
                )}

                {/* ======== 逐项匹配详情 ======== */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    🔍 逐项匹配详情
                  </h3>
                  <div className="space-y-3">
                    {report.matching_details?.map((item, i) => {
                      const config = {
                        '高度匹配': { border: 'border-emerald-800/30', bg: 'bg-emerald-950/20', text: 'text-emerald-400', dot: 'bg-emerald-500' },
                        '部分匹配': { border: 'border-amber-800/30', bg: 'bg-amber-950/20', text: 'text-amber-400', dot: 'bg-amber-500' },
                        '缺失': { border: 'border-red-800/30', bg: 'bg-red-950/20', text: 'text-red-400', dot: 'bg-red-500' },
                      }[item.level] || { border: 'border-amber-800/30', bg: 'bg-amber-950/20', text: 'text-amber-400', dot: 'bg-amber-500' };

                      return (
                        <div key={i} className={`p-4 rounded-xl border ${config.border} ${config.bg}`}>
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium text-zinc-200">
                              {item.requirement}
                            </span>
                            <span className={`text-xs font-medium ${config.text} flex items-center gap-1.5 shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                              {item.level}
                            </span>
                          </div>
                          {item.evidence && (
                            <p className="text-xs text-zinc-400 mb-1.5">
                              <span className="text-zinc-500">证据：</span>
                              {item.evidence}
                            </p>
                          )}
                          {item.suggestion && (
                            <p className="text-xs text-zinc-500">
                              <span className="text-zinc-500">建议：</span>
                              {item.suggestion}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* 阶段分隔：深度验证 → 行动指南 */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                  <span className="text-xs text-zinc-600 shrink-0">行动指南</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                </div>

                {/* ═══════════════ 阶段三：行动指南 ═══════════════ */}

                {/* ======== 简历改进建议 ======== */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    💡 简历改进建议
                  </h3>
                  {report.sabc_rating.resume_improvement_suggestions?.length > 0 ? (
                    <div className="space-y-3">
                      {report.sabc_rating.resume_improvement_suggestions.map(
                        (suggestion, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06]">
                            <span className="text-brand font-bold text-sm shrink-0 mt-0.5">
                              {i + 1}.
                            </span>
                            <p className="text-sm text-zinc-300">{suggestion}</p>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">暂无改进建议</p>
                  )}
                </GlassCard>

                {/* ======== 选岗建议 ======== */}
                {report.sabc_rating.job_selection_advice && (
                  <GlassCard className="p-6">
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      🧭 选岗建议
                    </h3>
                    <p className="text-sm text-zinc-400 mb-4">
                      {report.sabc_rating.job_selection_advice.reason}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                        <p className="text-xs text-emerald-400 font-medium mb-2">
                          ✅ 推荐岗位方向
                        </p>
                        <ul className="space-y-1.5">
                          {report.sabc_rating.job_selection_advice.recommended_roles.map(
                            (role, i) => (
                              <li key={i} className="text-sm text-zinc-300 flex items-center gap-2">
                                <span className="text-emerald-500 text-xs">▶</span>
                                {role}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/30">
                        <p className="text-xs text-red-400 font-medium mb-2">
                          ⚠️ 建议避开
                        </p>
                        <ul className="space-y-1.5">
                          {report.sabc_rating.job_selection_advice.avoid_roles.map(
                            (role, i) => (
                              <li key={i} className="text-sm text-zinc-300 flex items-center gap-2">
                                <span className="text-red-500 text-xs">▶</span>
                                {role}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {/* ======== Tab 2: 岗位解析 ======== */}
            {activeTab === 'job' && record.job_insight && (
              <div className="space-y-6">
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-100">
                        {record.job_insight.job_title}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {record.job_insight.industry}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {record.job_insight.summary}
                  </p>
                </GlassCard>

                {/* 冰山模型：显性层 */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    🧊 冰山上（显性要求）
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: '知识要求', icon: '📚', items: record.job_insight.iceberg_above.knowledge, border: 'border-blue-800/40', bg: 'bg-blue-950/20', tag: 'bg-blue-900/30 text-blue-300 border-blue-800/40' },
                      { label: '技能要求', icon: '🔧', items: record.job_insight.iceberg_above.skills, border: 'border-amber-800/40', bg: 'bg-amber-950/20', tag: 'bg-amber-900/30 text-amber-300 border-amber-800/40' },
                      { label: '经验要求', icon: '⏱️', items: record.job_insight.iceberg_above.experience, border: 'border-emerald-800/40', bg: 'bg-emerald-950/20', tag: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/40' },
                    ].map((sec) => (
                      <div key={sec.label} className={`p-4 rounded-xl border ${sec.border} ${sec.bg}`}>
                        <p className="text-sm font-medium text-zinc-200 mb-3">
                          <span className="mr-1.5">{sec.icon}</span>
                          {sec.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sec.items.map((item, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded-lg text-xs border ${sec.tag}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* 冰山模型：隐性层 */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    🌊 冰山下（隐性素质）
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: '性格特质', icon: '🎭', items: record.job_insight.iceberg_below.traits, border: 'border-purple-800/40', bg: 'bg-purple-950/20', tag: 'bg-purple-900/30 text-purple-300 border-purple-800/40' },
                      { label: '核心能力', icon: '💪', items: record.job_insight.iceberg_below.competencies, border: 'border-indigo-800/40', bg: 'bg-indigo-950/20', tag: 'bg-indigo-900/30 text-indigo-300 border-indigo-800/40' },
                      { label: '动机特质', icon: '🎯', items: record.job_insight.iceberg_below.motivations, border: 'border-pink-800/40', bg: 'bg-pink-950/20', tag: 'bg-pink-900/30 text-pink-300 border-pink-800/40' },
                    ].map((sec) => (
                      <div key={sec.label} className={`p-4 rounded-xl border ${sec.border} ${sec.bg}`}>
                        <p className="text-sm font-medium text-zinc-200 mb-3">
                          <span className="mr-1.5">{sec.icon}</span>
                          {sec.label}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(sec.items as any[]).map((item, i) => {
                            const text = typeof item === 'string' ? item : (item.trait || item.competency || item.motivation || '');
                            const clue = typeof item === 'string' ? null : item.clue;
                            return (
                              <div key={i} className={`px-3 py-2 rounded-lg text-xs border ${sec.tag}`}>
                                <span className="block font-medium">{text}</span>
                                {clue && (
                                  <span className="block mt-0.5 opacity-70">依据：{clue}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* 优先级分类 */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    ⭐ 优先级分类
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: '核心需求', items: record.job_insight.priorities.core, border: 'border-red-800/40', bg: 'bg-red-950/20', tag: '🔴' },
                      { label: '重要条件', items: record.job_insight.priorities.important, border: 'border-amber-800/40', bg: 'bg-amber-950/20', tag: '🟡' },
                      { label: '加分项', items: record.job_insight.priorities.bonus, border: 'border-emerald-800/40', bg: 'bg-emerald-950/20', tag: '🟢' },
                    ].map((sec) => (
                      <div key={sec.label} className={`p-4 rounded-xl border ${sec.border} ${sec.bg}`}>
                        <p className="text-sm font-medium text-zinc-200 mb-2">
                          {sec.tag} {sec.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sec.items.map((item, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-zinc-900/50 text-zinc-300 border border-white/[0.06]">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            )}

            {/* ======== Tab 3: 简历解析 ======== */}
            {activeTab === 'resume' && record.resume_insight && (
              <div className="space-y-6">
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">👤</span>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-100">
                        {record.resume_insight.candidate_name}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {record.resume_insight.current_title || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <span className="text-zinc-400">
                      工作年限：
                      <span className="text-zinc-200 font-medium">
                        {record.resume_insight.experience_years} 年
                      </span>
                    </span>
                    {record.resume_insight.education && (
                      <span className="text-zinc-400">
                        学历：
                        <span className="text-zinc-200 font-medium">
                          {[
                            record.resume_insight.education.degree,
                            record.resume_insight.education.major,
                            record.resume_insight.education.school,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {record.resume_insight.summary}
                  </p>
                </GlassCard>

                {/* 技能标签 */}
                {record.resume_insight.skill_tags?.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      🏷️ 技能标签
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {record.resume_insight.skill_tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-xl text-sm bg-brand/10 text-brand border border-brand/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* 职业轨迹 */}
                {record.resume_insight.career_trajectory?.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      📈 职业轨迹
                    </h3>
                    <div className="space-y-3 pl-4 border-l-2 border-white/[0.06]">
                      {record.resume_insight.career_trajectory.map((item, i) => (
                        <div key={i} className="relative pl-4">
                          <div className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-brand" />
                          <p className="text-sm text-zinc-300">{item}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* 成就 */}
                {record.resume_insight.achievements?.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      🏆 核心成就
                    </h3>
                    <div className="space-y-4">
                      {record.resume_insight.achievements.map((item, i) => {
                        // 兼容旧格式（字符串）和新格式（对象）
                        if (typeof item === 'string') {
                          return (
                            <div key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                              <span className="text-brand mt-0.5 shrink-0">✦</span>
                              {item}
                            </div>
                          );
                        }
                        return (
                          <div key={i} className="p-4 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                            <div className="space-y-2 text-sm">
                              {item.context && (
                                <div className="flex items-start gap-2">
                                  <span className="text-zinc-500 shrink-0 mt-0.5">📋</span>
                                  <span className="text-zinc-300">{item.context}</span>
                                </div>
                              )}
                              {item.action && (
                                <div className="flex items-start gap-2">
                                  <span className="text-brand shrink-0 mt-0.5">⚡</span>
                                  <span className="text-zinc-200">{item.action}</span>
                                </div>
                              )}
                              {item.impact && (
                                <div className="flex items-start gap-2">
                                  <span className="text-emerald-400 shrink-0 mt-0.5">📊</span>
                                  <span className="text-emerald-300 font-medium">{item.impact}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

                {/* 信号识别 */}
                <GlassCard className="p-6">
                  <h3 className="text-base font-semibold text-zinc-100 mb-4">
                    🚦 简历信号识别
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                      <p className="text-sm font-medium text-emerald-400 mb-2">🟢 亮点优势</p>
                      <ul className="space-y-2">
                        {record.resume_insight.green_flags?.length > 0
                          ? record.resume_insight.green_flags.map((f, i) => {
                              const text = typeof f === 'string' ? f : f.flag;
                              const clue = typeof f === 'string' ? null : f.clue;
                              return (
                                <li key={i} className="text-xs text-zinc-400">
                                  <span className="text-emerald-500 mr-1">✓</span>
                                  <span className="font-medium">{text}</span>
                                  {clue && <span className="block ml-4 mt-0.5 text-zinc-500">↳ {clue}</span>}
                                </li>
                              );
                            })
                          : <li className="text-xs text-zinc-500">暂无信号</li>}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30">
                      <p className="text-sm font-medium text-amber-400 mb-2">🟡 待提升</p>
                      <ul className="space-y-2">
                        {record.resume_insight.gaps?.length > 0
                          ? record.resume_insight.gaps.map((f, i) => {
                              const text = typeof f === 'string' ? f : f.gap || f.flag;
                              const severity = typeof f === 'string' ? null : f.severity;
                              return (
                                <li key={i} className="text-xs text-zinc-400">
                                  <span className="text-amber-500 mr-1">△</span>
                                  <span className="font-medium">{text}</span>
                                  {severity && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                                      severity === '高' ? 'bg-red-900/30 text-red-400' :
                                      severity === '中' ? 'bg-amber-900/30 text-amber-400' :
                                      'bg-zinc-800 text-zinc-400'
                                    }`}>{severity}</span>
                                  )}
                                </li>
                              );
                            })
                          : <li className="text-xs text-zinc-500">暂无信号</li>}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/30">
                      <p className="text-sm font-medium text-red-400 mb-2">🔴 风险警示</p>
                      <ul className="space-y-2">
                        {record.resume_insight.red_flags?.length > 0
                          ? record.resume_insight.red_flags.map((f, i) => {
                              const text = typeof f === 'string' ? f : f.flag;
                              const clue = typeof f === 'string' ? null : f.clue;
                              const severity = typeof f === 'string' ? null : f.severity;
                              return (
                                <li key={i} className="text-xs text-zinc-400">
                                  <span className="text-red-500 mr-1">!</span>
                                  <span className="font-medium">{text}</span>
                                  {severity && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                                      severity === '高' ? 'bg-red-900/30 text-red-400' :
                                      severity === '中' ? 'bg-amber-900/30 text-amber-400' :
                                      'bg-zinc-800 text-zinc-400'
                                    }`}>{severity}</span>
                                  )}
                                  {clue && <span className="block ml-4 mt-0.5 text-zinc-500">↳ {clue}</span>}
                                </li>
                              );
                            })
                          : <li className="text-xs text-zinc-500">暂无警示</li>}
                      </ul>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* ======== Tab 4: 面试题库 ======== */}
            {activeTab === 'interview' && (
              <div className="space-y-6">
                {/* 面试题 */}
                <h3 className="text-base font-semibold text-zinc-100 mb-4">
                  🎁 面试准备手册（{report.interview_questions?.free?.length || 0} 道）
                </h3>
                <div className="space-y-6">
                  {report.interview_questions?.free?.map((q, i) => {
                    const typeLabels: Record<string, string> = {
                      common: '高频必问',
                      gap: '信息缺口',
                      deep_dive: '项目深挖',
                      gap_analysis: '空窗期追问',
                      culture_fit: '文化适配',
                      scenario: '情景模拟',
                    };
                    const typeColors: Record<string, string> = {
                      common: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
                      gap: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
                      deep_dive: 'bg-purple-950/40 text-purple-300 border-purple-800/40',
                      gap_analysis: 'bg-red-950/40 text-red-300 border-red-800/40',
                      culture_fit: 'bg-green-950/40 text-green-300 border-green-800/40',
                      scenario: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40',
                    };
                    const difficultyColors: Record<string, string> = {
                      '简单': 'bg-zinc-800 text-zinc-400',
                      '中等': 'bg-amber-900/30 text-amber-400',
                      '较难': 'bg-red-900/30 text-red-400',
                      '高难度': 'bg-red-900/50 text-red-300',
                    };
                    return (
                      <GlassCard key={i} className="p-5">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className="text-brand font-bold text-sm">Q{i + 1}</span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${typeColors[q.type] || typeColors.common}`}>
                            {typeLabels[q.type] || '面试题'}
                          </span>
                          {q.difficulty && (
                            <span className={`px-2 py-0.5 rounded-md text-xs ${difficultyColors[q.difficulty] || ''}`}>
                              {q.difficulty}
                            </span>
                          )}
                          {q.time_suggested && (
                            <span className="text-xs text-zinc-500">建议答题 {q.time_suggested} 分钟</span>
                          )}
                        </div>

                        {/* Question */}
                        <p className="text-sm text-zinc-200 font-medium leading-relaxed mb-3">
                          {q.question}
                        </p>

                        {/* ====== 考官视角 ====== */}
                        {q.examiner_perspective && (
                          <div className="mb-3 p-3 rounded-lg bg-brand/5 border border-brand/10">
                            <p className="text-xs text-brand font-medium mb-2">🎯 考官视角</p>
                            <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                              {q.examiner_perspective.what_they_really_want}
                            </p>
                            {q.examiner_perspective.scoring_criteria?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {q.examiner_perspective.scoring_criteria.map((sc, si) => (
                                  <span key={si} className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                                    {sc}
                                  </span>
                                ))}
                              </div>
                            )}
                            {q.examiner_perspective.red_flags_in_answer && (
                              <p className="text-xs text-red-400/80">
                                <span className="font-medium">⚠ 扣分项：</span>
                                {q.examiner_perspective.red_flags_in_answer}
                              </p>
                            )}
                          </div>
                        )}

                        {/* v1兼容：旧版intent */}
                        {q.intent && !q.examiner_perspective && (
                          <p className="text-xs text-zinc-500 mb-2">
                            <span className="text-zinc-600">考察意图：</span>
                            {q.intent}
                          </p>
                        )}

                        {/* ====== 追问链 ====== */}
                        {q.follow_up_chain && q.follow_up_chain.length > 0 && (
                          <div className="mb-3 p-3 rounded-lg bg-zinc-900/70 border border-white/[0.06]">
                            <p className="text-xs text-zinc-500 font-medium mb-1.5">🔄 面试官可能追问</p>
                            {q.follow_up_chain.map((fu, fi) => (
                              <p key={fi} className="text-xs text-zinc-400 flex items-start gap-1.5 mb-1 last:mb-0">
                                <span className="text-zinc-600 shrink-0 mt-0.5">▸</span>
                                {fu}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* ====== 准备建议 ====== */}
                        {q.preparation_tip && (
                          <div className="mb-3 p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
                            <p className="text-xs text-emerald-400">
                              <span className="font-medium">💡 准备建议：</span>
                              {q.preparation_tip}
                            </p>
                          </div>
                        )}

                        {/* ====== STAR 框架 ====== */}
                        {q.star_framework && (
                          <div>
                            <button
                              onClick={() => toggleQuestion(i)}
                              className="flex items-center gap-2 text-xs text-brand hover:text-brand-light transition-colors"
                            >
                              <span>{expandedQuestions.has(i) ? '▾' : '▸'}</span>
                              STAR 答题框架
                            </button>
                            {expandedQuestions.has(i) && (
                              <div className="mt-3 p-4 rounded-xl bg-zinc-900/70 border border-white/[0.06] space-y-3">
                                {[
                                  { letter: 'S', label: '情境', field: q.star_framework.situation },
                                  { letter: 'T', label: '任务', field: q.star_framework.task },
                                  { letter: 'A', label: '行动', field: q.star_framework.action },
                                  { letter: 'R', label: '结果', field: q.star_framework.result },
                                ].map(({ letter, label, field }) => {
                                  if (!field) return null;
                                  const isV2 = typeof field === 'object';
                                  return (
                                    <div key={letter}>
                                      <p className="text-xs font-medium text-zinc-400 mb-1">
                                        {letter} — {label}
                                      </p>
                                      {isV2 ? (
                                        <>
                                          <p className="text-xs text-zinc-500 mb-0.5">
                                            {(field as any).prompt}
                                          </p>
                                          <p className="text-xs text-zinc-300 bg-zinc-800/50 rounded-lg p-2 border border-white/[0.04]">
                                            <span className="text-zinc-500">示例：</span>
                                            {(field as any).example}
                                          </p>
                                        </>
                                      ) : (
                                        <p className="text-xs text-zinc-300">{field as string}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </GlassCard>
                    );
                  })}
                </div>

                {/* 扩展面试题 */}
                {hasExtraData ? (
                  <>
                    <h3 className="text-base font-semibold text-zinc-100 mb-4 mt-8">
                      ⭐ 深度扩展题库（{hasExtraData ? (record?.report_json?.interview_questions?.extra?.length || 0) : 0} 道）
                    </h3>
                    <div className="space-y-6">
                      {record?.report_json?.interview_questions?.extra?.map((q, i) => {
                        const qi = (record?.report_json?.interview_questions?.free?.length || 0) + i;
                        const typeLabels: Record<string, string> = {
                          bei_behavioral: 'BEI行为面试',
                          industry_insight: '行业洞察',
                          stress_interview: '压力面试',
                          weakness_targeted: '自定义弱项',
                        };
                        const typeColors: Record<string, string> = {
                          bei_behavioral: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40',
                          industry_insight: 'bg-teal-950/40 text-teal-300 border-teal-800/40',
                          stress_interview: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
                          weakness_targeted: 'bg-orange-950/40 text-orange-300 border-orange-800/40',
                        };
                        const difficultyColors: Record<string, string> = {
                          '简单': 'bg-zinc-800 text-zinc-400',
                          '中等': 'bg-amber-900/30 text-amber-400',
                          '较难': 'bg-red-900/30 text-red-400',
                          '高难度': 'bg-red-900/50 text-red-300',
                        };
                        return (
                          <GlassCard key={i} className="p-5 border-l-4 border-l-brand/60">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className="text-brand font-bold text-sm">Q{qi + 1}</span>
                              <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${typeColors[q.type] || typeColors.bei_behavioral}`}>
                                {typeLabels[q.type] || '扩展题'}
                              </span>
                              {q.difficulty && (
                                <span className={`px-2 py-0.5 rounded-md text-xs ${difficultyColors[q.difficulty] || ''}`}>
                                  {q.difficulty}
                                </span>
                              )}
                              {q.time_suggested && (
                                <span className="text-xs text-zinc-500">建议答题 {q.time_suggested} 分钟</span>
                              )}
                              <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] bg-yellow-950/30 text-yellow-400 border border-yellow-800/40">
                                ⭐ 深度题
                              </span>
                            </div>

                            {/* Question */}
                            <p className="text-sm text-zinc-200 font-medium leading-relaxed mb-3">
                              {q.question}
                            </p>

                            {/* ====== 考官视角 ====== */}
                            {q.examiner_perspective && (
                              <div className="mb-3 p-3 rounded-lg bg-brand/5 border border-brand/10">
                                <p className="text-xs text-brand font-medium mb-2">🎯 考官视角</p>
                                <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                                  {q.examiner_perspective.what_they_really_want}
                                </p>
                                {q.examiner_perspective.scoring_criteria?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {q.examiner_perspective.scoring_criteria.map((sc, si) => (
                                      <span key={si} className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                                        {sc}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {q.examiner_perspective.red_flags_in_answer && (
                                  <p className="text-xs text-red-400/80">
                                    <span className="font-medium">⚠ 扣分项：</span>
                                    {q.examiner_perspective.red_flags_in_answer}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* v1兼容 */}
                            {q.intent && !q.examiner_perspective && (
                              <p className="text-xs text-zinc-500 mb-2">
                                <span className="text-zinc-600">考察意图：</span>
                                {q.intent}
                              </p>
                            )}

                            {/* ====== 追问链 ====== */}
                            {q.follow_up_chain && q.follow_up_chain.length > 0 && (
                              <div className="mb-3 p-3 rounded-lg bg-zinc-900/70 border border-white/[0.06]">
                                <p className="text-xs text-zinc-500 font-medium mb-1.5">🔄 面试官可能追问</p>
                                {q.follow_up_chain.map((fu, fi) => (
                                  <p key={fi} className="text-xs text-zinc-400 flex items-start gap-1.5 mb-1 last:mb-0">
                                    <span className="text-zinc-600 shrink-0 mt-0.5">▸</span>
                                    {fu}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* ====== 准备建议 ====== */}
                            {q.preparation_tip && (
                              <div className="mb-3 p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
                                <p className="text-xs text-emerald-400">
                                  <span className="font-medium">💡 准备建议：</span>
                                  {q.preparation_tip}
                                </p>
                              </div>
                            )}

                            {/* ====== STAR 框架 ====== */}
                            {q.star_framework && (
                              <div>
                                <button
                                  onClick={() => toggleQuestion(qi)}
                                  className="flex items-center gap-2 text-xs text-brand hover:text-brand-light transition-colors"
                                >
                                  <span>{expandedQuestions.has(qi) ? '▾' : '▸'}</span>
                                  STAR 答题框架
                                </button>
                                {expandedQuestions.has(qi) && (
                                  <div className="mt-3 p-4 rounded-xl bg-zinc-900/70 border border-white/[0.06] space-y-3">
                                    {[
                                      { letter: 'S', label: '情境', field: q.star_framework.situation },
                                      { letter: 'T', label: '任务', field: q.star_framework.task },
                                      { letter: 'A', label: '行动', field: q.star_framework.action },
                                      { letter: 'R', label: '结果', field: q.star_framework.result },
                                    ].map(({ letter, label, field }) => {
                                      if (!field) return null;
                                      const isV2 = typeof field === 'object';
                                      return (
                                        <div key={letter}>
                                          <p className="text-xs font-medium text-zinc-400 mb-1">
                                            {letter} — {label}
                                          </p>
                                          {isV2 ? (
                                            <>
                                              <p className="text-xs text-zinc-500 mb-0.5">
                                                {(field as any).prompt}
                                              </p>
                                              <p className="text-xs text-zinc-300 bg-zinc-800/50 rounded-lg p-2 border border-white/[0.04]">
                                                <span className="text-zinc-500">示例：</span>
                                                {(field as any).example}
                                              </p>
                                            </>
                                          ) : (
                                            <p className="text-xs text-zinc-300">{field as string}</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </GlassCard>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <PaywallBanner
                      price="¥1.99"
                      message="解锁额外 5 道深度定制面试题，含 BEI 行为面试、行业洞察、压力面试、自定义弱项"
                      onPay={() => setShowWeaknessModal(true)}
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ======== 弱项选择 Modal ======== */}
        {showWeaknessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWeaknessModal(false)} />
            <div className="relative bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-lg font-bold text-zinc-100 mb-1">选择你最担心的弱项</h3>
                <p className="text-xs text-zinc-500">
                  选择 1-3 个最让你在面试中感到不安的方向，AI 将为你生成针对性题目
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {WEAKNESS_OPTIONS.map((opt) => {
                  const isSelected = selectedWeaknesses.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedWeaknesses((prev) => {
                          const next = new Set(prev);
                          if (isSelected) {
                            next.delete(opt.value);
                          } else if (next.size < 3) {
                            next.add(opt.value);
                          }
                          return next;
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-brand/10 text-brand border-brand/40'
                          : 'bg-zinc-800 text-zinc-400 border-white/[0.06] hover:border-white/[0.12] hover:text-zinc-300'
                      }`}
                    >
                      <span className="text-sm">{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {selectedWeaknesses.size > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-brand/5 border border-brand/10">
                  <p className="text-xs text-zinc-400">
                    已选：<span className="text-brand font-medium">{Array.from(selectedWeaknesses).join('、')}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWeaknessModal(false);
                    setSelectedWeaknesses(new Set());
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-zinc-800 text-zinc-400 border border-white/[0.06] hover:bg-zinc-700 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleUnlockExtra}
                  disabled={unlockingExtra}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold hover:shadow-[0_0_20px_rgba(245,166,35,0.3)] transition-all disabled:opacity-50"
                >
                  {unlockingExtra ? '解锁中...' : `¥1.99 解锁（5题）`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
