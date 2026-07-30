'use client';

import { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';

interface LogItem {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  admin_key_hint: string;
  ip_address: string | null;
  created_at: string;
}

export default function LogsView({ adminKey }: { adminKey: string }) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async (p = page, l = limit, a = actionFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(l));
      if (a) params.set('action', a);
      const res = await fetch(`/api/admin/logs?${params}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, limit, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchLogs(page, limit, actionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      update_credits_add: '修改次数（增加）',
      update_credits_deduct: '修改次数（扣除）',
      add_credits: '添加次数',
      ban_user: '封禁用户',
      unban_user: '解封用户',
    };
    return map[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('ban')) return 'text-red-400 bg-red-950/40 border-red-900/30';
    if (action.includes('unban')) return 'text-amber-400 bg-amber-950/40 border-amber-900/30';
    if (action.includes('credits')) return 'text-brand bg-brand/10 border-brand/20';
    return 'text-zinc-400 bg-zinc-800 border-white/[0.06]';
  };

  return (
    <div className="space-y-6">
      {/* 筛选 */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex gap-3">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
              fetchLogs(1, limit, e.target.value);
            }}
            className="px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-300 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="">全部操作</option>
            <option value="update_credits_add">修改次数（增加）</option>
            <option value="update_credits_deduct">修改次数（扣除）</option>
            <option value="add_credits">添加次数</option>
            <option value="ban_user">封禁用户</option>
            <option value="unban_user">解封用户</option>
          </select>
          <button
            onClick={() => {
              setActionFilter('');
              setPage(1);
              fetchLogs(1, limit, '');
            }}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 border border-white/[0.08] hover:bg-zinc-700 hover:text-zinc-300 transition-all text-sm"
          >
            重置
          </button>
        </div>
      </GlassCard>

      {/* 日志表格 */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">时间</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">操作类型</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">对象</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">详情</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-zinc-500">管理员</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="px-5 py-3" colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                    暂无操作日志
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-1 rounded-md text-xs border ${getActionColor(log.action)}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">
                      <div>
                        <span className="text-zinc-500">{log.target_type}</span>
                        {log.target_id && (
                          <span className="ml-1 font-mono">{log.target_id.slice(0, 8)}...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs max-w-[300px]">
                      <DetailsPreview details={log.details} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-500 text-xs font-mono">
                      {log.admin_key_hint}
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

function DetailsPreview({ details }: { details: any }) {
  if (!details || typeof details !== 'object') return <span>—</span>;

  const pairs: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null) continue;
    const shortValue = String(value).slice(0, 30);
    pairs.push(`${key}: ${shortValue}`);
  }

  if (pairs.length === 0) return <span>—</span>;

  return (
    <div className="space-y-0.5">
      {pairs.map((p, i) => (
        <div key={i} className="truncate">{p}</div>
      ))}
    </div>
  );
}
