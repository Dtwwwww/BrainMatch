'use client';

import { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';

interface TransactionItem {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  meta: any;
  created_at: string;
  profiles: {
    email: string | null;
    phone: string | null;
    full_name: string | null;
  } | null;
}

interface TransactionStats {
  totalIn: number;
  totalOut: number;
  net: number;
  adminActions: number;
}

export default function TransactionsView({ adminKey }: { adminKey: string }) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stats, setStats] = useState<TransactionStats | null>(null);

  const fetchTransactions = async (p = page, l = limit, s = search, t = typeFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(l));
      if (s) params.set('search', s);
      if (t) params.set('type', t);
      const res = await fetch(`/api/admin/transactions?${params}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
        setStats(data.stats || null);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1, limit, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTransactions(page, limit, search, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleSearch = () => {
    setPage(1);
    fetchTransactions(1, limit, search, typeFilter);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserDisplay = (t: TransactionItem) => {
    const p = t.profiles;
    return p?.full_name || p?.email || p?.phone || t.user_id.slice(0, 8) + '...';
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">总流入</p>
            <p className="text-2xl font-bold text-emerald-400">+{stats.totalIn}</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">总流出</p>
            <p className="text-2xl font-bold text-red-400">-{stats.totalOut}</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">净额</p>
            <p className="text-2xl font-bold text-brand">{stats.net >= 0 ? '+' : ''}{stats.net}</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">Admin 操作</p>
            <p className="text-2xl font-bold text-zinc-50">{stats.adminActions}</p>
          </GlassCard>
        </div>
      )}

      {/* 搜索与筛选 */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索用户邮箱 / 手机 / 姓名..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
              fetchTransactions(1, limit, search, e.target.value);
            }}
            className="px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-300 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="">全部类型</option>
            <option value="purchase">购买</option>
            <option value="use">使用</option>
            <option value="refund">退款</option>
            <option value="admin_add">管理员增加</option>
            <option value="admin_deduct">管理员扣除</option>
            <option value="gift_out">转赠出</option>
            <option value="gift_in">转赠入</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 transition-all text-sm"
          >
            搜索
          </button>
        </div>
      </GlassCard>

      {/* 流水表格 */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">用户</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">类型</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">金额</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">余额</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">备注</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-zinc-500">时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="px-5 py-3" colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                    暂无流水数据
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-zinc-300">{getUserDisplay(t)}</td>
                    <td className="px-5 py-3.5">
                      <TransactionBadge type={t.type} />
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono">
                      <span
                        className={
                          t.amount > 0
                            ? 'text-emerald-400'
                            : t.amount < 0
                            ? 'text-red-400'
                            : 'text-zinc-400'
                        }
                      >
                        {t.amount > 0 ? '+' : ''}
                        {t.amount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-zinc-400 font-mono">
                      {t.balance_after}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs max-w-[200px] truncate">
                      {t.meta?.reason || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-500 text-xs">
                      {formatDate(t.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-white/[0.06]">
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
      </GlassCard>
    </div>
  );
}

function TransactionBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    purchase: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', label: '购买' },
    use: { bg: 'bg-zinc-800', text: 'text-zinc-400', label: '使用' },
    refund: { bg: 'bg-red-950/40', text: 'text-red-400', label: '退款' },
    admin_add: { bg: 'bg-brand/10', text: 'text-brand', label: '管理员增加' },
    admin_deduct: { bg: 'bg-red-950/40', text: 'text-red-400', label: '管理员扣除' },
    gift_out: { bg: 'bg-blue-950/40', text: 'text-blue-400', label: '转赠出' },
    gift_in: { bg: 'bg-blue-950/40', text: 'text-blue-400', label: '转赠入' },
  };
  const c = config[type] || { bg: 'bg-zinc-800', text: 'text-zinc-400', label: type };
  return (
    <span className={`px-2 py-1 rounded-md text-xs border border-white/[0.06] ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
