'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';
import AddPositionModal from '@/components/AddPositionModal';
import EditPositionModal from '@/components/EditPositionModal';

interface PositionItem {
  id: string;
  company_name: string | null;
  job_title: string | null;
  job_url: string | null;
  note: string | null;
  status: string;
  applied_at: string | null;
  interview_round: string | null;
  interview_date: string | null;
  report_json: any;
  created_at: string;
}

interface StatsOverview {
  total: number;
  '分析完成': number;
  '待投递': number;
  '已投递': number;
  '面试中': number;
  '已拿Offer': number;
  '已结束': number;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(
    searchParams.get('status') || '全部'
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasOffer, setHasOffer] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPosition, setSelectedPosition] =
    useState<PositionItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const statusFilters = [
    '全部',
    '待投递',
    '已投递',
    '面试中',
    '已拿Offer',
    '已结束',
  ];

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/protected/analyses/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setHasOffer(data['已拿Offer'] > 0);
      }
    } catch {
      // 静默失败
    }
  };

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== '全部') params.set('status', activeFilter);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/protected/analyses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/protected/credits');
      if (res.ok) {
        const data = await res.json();
        setRemainingCredits(data.remaining_analyses || 0);
      }
    } catch {}
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchCredits(); }, []);
  useEffect(() => { fetchPositions(); }, [activeFilter, search, page, limit]);

  const showBanner = remainingCredits > 0 && hasOffer;

  const handleArchive = async (id: string) => {
    try {
      await fetch(`/api/protected/analyses/${id}`, { method: 'DELETE' });
      fetchPositions();
      fetchStats();
    } catch {}
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/protected/analyses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchPositions();
        fetchStats();
      }
    } catch {}
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-50">岗位管理</h1>
          <div className="flex items-center gap-4">
            <GlassCard className="px-4 py-2 flex items-center gap-3 text-sm">
              <span className="text-zinc-400">剩余次数</span>
              <span className="text-brand font-bold font-mono text-lg">
                {remainingCredits}
              </span>
            </GlassCard>
            <a
              href="/analyze"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm shadow-glow-brand hover:shadow-[0_0_30px_rgba(245,166,35,0.45)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200"
            >
              + 新建分析
            </a>
          </div>
        </div>

        {/* 统计概览 */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {statusFilters.map((status) => {
              const value =
                status === '全部'
                  ? stats.total
                  : stats[status as keyof StatsOverview] || 0;
              const gradients: Record<string, string> = {
                '全部': 'bg-gradient-to-b from-zinc-300 to-zinc-500',
                '待投递': 'bg-gradient-to-b from-zinc-300 to-zinc-500',
                '已投递': 'bg-gradient-to-b from-blue-300 to-blue-500',
                '面试中': 'bg-gradient-to-b from-amber-300 to-amber-500',
                '已拿Offer': 'bg-gradient-to-b from-emerald-300 to-emerald-500',
                '已结束': 'bg-gradient-to-b from-zinc-400 to-zinc-600',
              };
              return (
                <StatCard
                  key={status}
                  label={status}
                  value={Number(value) || 0}
                  gradient={gradients[status]}
                  active={activeFilter === status}
                  onClick={() => {
                    setActiveFilter(status);
                    setPage(1);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* 剩余次数横幅 */}
        {showBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="text-sm font-medium text-emerald-300">
                    恭喜拿到 Offer！
                  </p>
                  <p className="text-xs text-emerald-400/80">
                    你还剩 {remainingCredits} 次分析未使用
                  </p>
                </div>
              </div>
              <a
                href="/pricing"
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                处理剩余次数 →
              </a>
            </div>
          </div>
        )}

        {/* 搜索和筛选 */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="🔍 搜索公司名称或岗位名称..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/70 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:bg-zinc-700 hover:border-white/[0.14] transition-all text-sm"
          >
            + 手动添加岗位
          </button>
        </div>

        {/* 岗位列表 */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-zinc-400 mb-4">暂无岗位记录</p>
            <a
              href="/analyze"
              className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm hover:translate-y-[-1px] transition-all"
            >
              开始第一次分析 →
            </a>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => {
              const grade = pos.report_json?.sabc_rating?.grade;
              const gradeColors: Record<string, string> = {
                S: 'text-[#F8719D]',
                A: 'text-[#F5A623]',
                B: 'text-[#6EE7B7]',
                C: 'text-[#A1A1AA]',
              };

              return (
                <GlassCard key={pos.id} className="p-4 md:p-5">
                  <div className="flex flex-col gap-3">
                    {/* Row 1: 公司名 + SABC | 操作按钮 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">🏢</span>
                        <h3 className="text-base font-semibold text-zinc-100 truncate">
                          {pos.company_name || '未填写公司'}
                        </h3>
                        {grade && (
                          <span
                            className={`text-lg font-bold shrink-0 ${
                              gradeColors[grade] || 'text-zinc-400'
                            }`}
                          >
                            {grade}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <StatusBadge status={pos.status} />
                        {/* 查看/编辑按钮 */}
                        <button
                          onClick={() => {
                            setSelectedPosition(pos);
                            setShowEditModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 border border-white/[0.06] hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                          title="查看/编辑"
                        >
                          详情
                        </button>
                        {pos.report_json && (
                          <a
                            href={`/analysis/${pos.id}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/[0.06] hover:bg-zinc-700 transition-colors"
                          >
                            查看报告
                          </a>
                        )}
                        <select
                          value={pos.status}
                          onChange={(e) =>
                            handleStatusUpdate(pos.id, e.target.value)
                          }
                          className="px-2 py-1.5 rounded-lg text-xs bg-zinc-800 border border-white/[0.08] text-zinc-400 focus:outline-none focus:border-brand/50 transition-colors"
                        >
                          <option value="分析完成">分析完成</option>
                          <option value="待投递">待投递</option>
                          <option value="已投递">已投递</option>
                          <option value="面试中">面试中</option>
                          <option value="已拿Offer">已拿Offer</option>
                          <option value="已结束">已结束</option>
                        </select>
                        <button
                          onClick={() => handleArchive(pos.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-500 border border-white/[0.06] hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                          title="归档"
                        >
                          归档
                        </button>
                      </div>
                    </div>

                    {/* Row 2: 岗位名 + URL 链接 | 日期信息 */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 ml-8">
                      <div className="flex items-center gap-3 min-w-0">
                        <p className="text-sm text-zinc-400 truncate">
                          {pos.job_title || '未填写岗位'}
                        </p>
                        {pos.job_url && (
                          <a
                            href={pos.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-zinc-500 hover:text-brand transition-colors"
                            title={pos.job_url}
                          >
                            🔗
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 shrink-0">
                        {pos.applied_at && (
                          <span>投递 {formatDate(pos.applied_at)}</span>
                        )}
                        {pos.interview_round && (
                          <span className="text-amber-400">
                            {pos.interview_round}
                            {pos.interview_date &&
                              `（${formatDate(pos.interview_date)}）`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 3: 备注预览 */}
                    {pos.note && (
                      <div className="flex items-start gap-1.5 ml-8 text-xs text-zinc-500">
                        <span className="shrink-0 mt-0.5">📝</span>
                        <p className="line-clamp-2 text-zinc-500 leading-relaxed">
                          {pos.note}
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}

            {/* 分页器 */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* 手动添加岗位模态框 */}
      <AddPositionModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          fetchPositions();
          fetchStats();
        }}
      />

      {/* 编辑岗位模态框 */}
      {selectedPosition && (
        <EditPositionModal
          key={selectedPosition.id}
          open={showEditModal}
          position={selectedPosition}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPosition(null);
          }}
          onUpdated={() => {
            fetchPositions();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="animate-pulse text-zinc-500">加载中...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
