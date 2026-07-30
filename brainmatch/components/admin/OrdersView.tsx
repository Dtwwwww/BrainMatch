'use client';

import { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';

interface OrderItem {
  id: string;
  user_id: string;
  package_id: string | null;
  credits: number | null;
  amount: number | null;
  status: string;
  payment_provider: string | null;
  created_at: string;
  profiles: {
    email: string | null;
    phone: string | null;
    full_name: string | null;
  } | null;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingAmount: number;
  refundAmount: number;
}

export default function OrdersView({ adminKey }: { adminKey: string }) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState<OrderStats | null>(null);

  const fetchOrders = async (p = page, l = limit, s = search, st = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(l));
      if (s) params.set('search', s);
      if (st) params.set('status', st);
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
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
    fetchOrders(1, limit, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOrders(page, limit, search, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders(1, limit, search, statusFilter);
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

  const getUserDisplay = (order: OrderItem) => {
    const p = order.profiles;
    return p?.full_name || p?.email || p?.phone || order.user_id.slice(0, 8) + '...';
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">总订单数</p>
            <p className="text-2xl font-bold text-zinc-50">{stats.totalOrders}</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">总营收</p>
            <p className="text-2xl font-bold text-brand">¥{stats.totalRevenue}</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">待支付</p>
            <p className="text-2xl font-bold text-amber-400">¥{stats.pendingAmount}</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-zinc-500 mb-1">退款金额</p>
            <p className="text-2xl font-bold text-red-400">¥{stats.refundAmount}</p>
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
              fetchOrders(1, limit, search, e.target.value);
            }}
            className="px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-300 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="paid">已支付</option>
            <option value="failed">失败</option>
            <option value="refunded">已退款</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 transition-all text-sm"
          >
            搜索
          </button>
        </div>
      </GlassCard>

      {/* 订单表格 */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">用户</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">套餐</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">次数</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">金额</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">状态</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">渠道</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-zinc-500">时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="px-5 py-3" colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                    暂无订单数据
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-zinc-300">{getUserDisplay(order)}</td>
                    <td className="px-5 py-3.5 text-zinc-400">{order.package_id || '—'}</td>
                    <td className="px-5 py-3.5 text-center text-zinc-400 font-mono">
                      {order.credits ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center text-zinc-300 font-mono">
                      {order.amount !== null ? `¥${order.amount}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">
                      {order.payment_provider || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-500 text-xs">
                      {formatDate(order.created_at)}
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

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-950/40', text: 'text-amber-400', label: '待支付' },
    paid: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', label: '已支付' },
    failed: { bg: 'bg-red-950/40', text: 'text-red-400', label: '失败' },
    cancelled: { bg: 'bg-zinc-800', text: 'text-zinc-400', label: '已取消' },
    refunded: { bg: 'bg-blue-950/40', text: 'text-blue-400', label: '已退款' },
  };
  const c = config[status] || { bg: 'bg-zinc-800', text: 'text-zinc-400', label: status };
  return (
    <span className={`px-2 py-1 rounded-md text-xs border border-white/[0.06] ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
