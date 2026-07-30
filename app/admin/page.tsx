'use client';

import { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';

interface UserItem {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  remaining_analyses: number;
  total_purchased: number;
  analysis_count: number;
  offer_count: number;
}

interface DashboardStats {
  totalUsers: number;
  todayNewUsers: number;
  totalAnalyses: number;
  totalRevenue: number;
}

interface UserDetail {
  profile: {
    id: string;
    email: string | null;
    phone: string | null;
    full_name: string | null;
    avatar_url: string | null;
    wechat_openid: string | null;
    wechat_unionid: string | null;
    phone_verified: boolean;
    wechat_verified: boolean;
    created_at: string;
  };
  credits: {
    remaining_analyses: number;
    total_purchased: number;
    updated_at: string;
  };
  config: {
    request_count: number;
    is_flagged: boolean;
    flag_reason: string | null;
    credits_frozen: number;
    credits_gifted: number;
    credits_refunded: number;
  } | null;
  analysis_count: number;
  offer_count: number;
  analyses: Array<{
    id: string;
    company_name: string | null;
    job_title: string | null;
    status: string;
    report_json: any;
    created_at: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balance_after: number;
    meta: any;
    created_at: string;
  }>;
  orders: Array<{
    id: string;
    package_id: string | null;
    credits: number | null;
    amount: number | null;
    status: string;
    created_at: string;
  }>;
}

const TABS = [
  { key: 'overview', label: '概览' },
  { key: 'credits', label: '次数管理' },
  { key: 'analyses', label: '分析记录' },
  { key: 'transactions', label: '消费流水' },
  { key: 'orders', label: '订单记录' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState('');

  // 列表状态
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // 统计
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 详情弹窗
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [detailData, setDetailData] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // 编辑次数
  const [editCredits, setEditCredits] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // 验证密钥
  const handleAuth = async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/users?page=1&limit=1`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.status === 404) {
        setMessage('密钥错误');
      } else if (res.ok) {
        setAuthenticated(true);
        setMessage('');
      } else {
        setMessage('验证失败，请重试');
      }
    } catch {
      setMessage('验证失败，请重试');
    }
  };

  // 加载用户列表
  const fetchUsers = async (p = page, l = limit, s = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(l));
      if (s) params.set('search', s);
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
      }
    } catch {
      setMessage('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // 通过用户列表第一页获取总用户数，通过 analyses 和 orders 获取其他统计
      const [usersRes, analysesRes, ordersRes] = await Promise.all([
        fetch(`/api/admin/users?page=1&limit=1`, {
          headers: { 'X-Admin-Key': adminKey },
        }),
        fetch(`/api/admin/users?page=1&limit=1`, {
          headers: { 'X-Admin-Key': adminKey },
        }).then(() =>
          // analyses 统计通过直接查询不方便，先用一个间接方式：从所有用户累加
          fetch(`/api/admin/users?page=1&limit=1000`, {
            headers: { 'X-Admin-Key': adminKey },
          })
        ),
        fetch(`/api/admin/users?page=1&limit=1`, {
          headers: { 'X-Admin-Key': adminKey },
        }).then(() =>
          fetch(`/api/admin/users?page=1&limit=1000`, {
            headers: { 'X-Admin-Key': adminKey },
          })
        ),
      ]);

      // 更简洁的方式：直接用users列表数据计算
      const allUsersRes = await fetch(`/api/admin/users?page=1&limit=1000`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      const allUsersData = allUsersRes.ok ? await allUsersRes.json() : { users: [] };
      const allUsers: UserItem[] = allUsersData.users || [];

      const totalUsers = allUsers.length;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayNewUsers = allUsers.filter(
        (u) => new Date(u.created_at).getTime() >= todayStart.getTime()
      ).length;
      const totalAnalyses = allUsers.reduce((sum, u) => sum + u.analysis_count, 0);

      // 总付费金额需要查询 orders 表，暂时用总购买次数估算，后面再优化
      const totalPurchased = allUsers.reduce((sum, u) => sum + u.total_purchased, 0);
      // 假设平均单价 5 元（后续可改为真实订单查询）
      const totalRevenue = totalPurchased * 5;

      setStats({
        totalUsers,
        todayNewUsers,
        totalAnalyses,
        totalRevenue,
      });
    } catch {
      // 静默失败
    } finally {
      setStatsLoading(false);
    }
  };

  // 加载用户详情
  const fetchDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
        setEditCredits(data.credits?.remaining_analyses || 0);
        setEditReason('');
      }
    } catch {
      setMessage('加载用户详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 修改次数
  const handleUpdateCredits = async () => {
    if (!selectedUser || editCredits < 0) return;
    setEditLoading(true);
    try {
      const res = await fetch('/api/admin/credits/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          remaining_analyses: editCredits,
          reason: editReason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        // 刷新详情和列表
        fetchDetail(selectedUser.id);
        fetchUsers(page, limit, search);
      } else {
        setMessage(`❌ ${data.error || '操作失败'}`);
      }
    } catch {
      setMessage('❌ 操作失败');
    } finally {
      setEditLoading(false);
    }
  };

  // 首次验证通过后加载数据
  useEffect(() => {
    if (authenticated) {
      fetchUsers(1, limit, '');
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  // 分页或搜索变化时加载
  useEffect(() => {
    if (authenticated) {
      fetchUsers(page, limit, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, limit, search);
  };

  const openDetail = (user: UserItem) => {
    setSelectedUser(user);
    setActiveTab('overview');
    fetchDetail(user.id);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  // ========== 验证入口 ==========
  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold text-zinc-50 mb-2 text-center">管理后台</h1>
          <p className="text-xs text-zinc-500 text-center mb-6">智析 BrainMatch 运营管理中心</p>
          {message && (
            <p className="mb-4 text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded-lg">{message}</p>
          )}
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="请输入管理密钥"
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm mb-4"
          />
          <button
            onClick={handleAuth}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm hover:translate-y-[-1px] transition-all"
          >
            进入后台
          </button>
        </GlassCard>
      </div>
    );
  }

  // ========== 管理后台主界面 ==========
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">管理后台</h1>
            <p className="text-sm text-zinc-500 mt-1">用户管理 · 数据分析 · 运营监控</p>
          </div>
          <button
            onClick={() => {
              setAuthenticated(false);
              setAdminKey('');
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 transition-all text-sm"
          >
            退出登录
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsLoading || !stats ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : (
            <>
              <GlassCard className="p-5" hover={false}>
                <p className="text-xs text-zinc-500 mb-1">总注册用户</p>
                <p className="text-2xl font-bold text-zinc-50">{stats.totalUsers}</p>
              </GlassCard>
              <GlassCard className="p-5" hover={false}>
                <p className="text-xs text-zinc-500 mb-1">今日新增</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.todayNewUsers}</p>
              </GlassCard>
              <GlassCard className="p-5" hover={false}>
                <p className="text-xs text-zinc-500 mb-1">总分析次数</p>
                <p className="text-2xl font-bold text-brand">{stats.totalAnalyses}</p>
              </GlassCard>
              <GlassCard className="p-5" hover={false}>
                <p className="text-xs text-zinc-500 mb-1">预估总营收</p>
                <p className="text-2xl font-bold text-zinc-50">¥{stats.totalRevenue}</p>
              </GlassCard>
            </>
          )}
        </div>

        {/* 搜索栏 */}
        <GlassCard className="p-4 mb-6" hover={false}>
          <div className="flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索邮箱 / 手机号 / 姓名..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
            />
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 transition-all text-sm"
            >
              搜索
            </button>
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
                fetchUsers(1, limit, '');
                fetchStats();
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 border border-white/[0.08] hover:bg-zinc-700 hover:text-zinc-300 transition-all text-sm"
            >
              刷新
            </button>
          </div>
        </GlassCard>

        {/* 消息提示 */}
        {message && (
          <div className="mb-4 text-sm text-zinc-400 bg-zinc-800/50 px-4 py-3 rounded-xl border border-white/[0.06]">
            {message}
          </div>
        )}

        {/* 用户表格 */}
        <GlassCard className="overflow-hidden" hover={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">用户</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">联系方式</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-500">注册时间</th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">剩余次数</th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">总购买</th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">分析数</th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-zinc-500">Offer</th>
                  <th className="text-right px-5 py-3.5 text-xs font-medium text-zinc-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      <td className="px-5 py-3" colSpan={8}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-zinc-500">
                      暂无用户数据
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                              {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-zinc-200 font-medium">
                              {user.full_name || '未命名用户'}
                            </p>
                            <p className="text-xs text-zinc-600 font-mono">
                              {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        <div className="space-y-0.5">
                          {user.email && <p>{user.email}</p>}
                          {user.phone && <p>{user.phone}</p>}
                          {!user.email && !user.phone && <span className="text-zinc-600">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        {formatShortDate(user.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`font-mono font-medium ${
                            user.remaining_analyses > 0 ? 'text-brand' : 'text-zinc-600'
                          }`}
                        >
                          {user.remaining_analyses}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-zinc-400 font-mono">
                        {user.total_purchased}
                      </td>
                      <td className="px-5 py-3.5 text-center text-zinc-400">
                        {user.analysis_count}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {user.offer_count > 0 ? (
                          <span className="text-emerald-400 font-medium">{user.offer_count}</span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openDetail(user)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/[0.06] hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
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

      {/* 用户详情弹窗 */}
      {selectedUser && (
        <Modal
          onClose={() => {
            setSelectedUser(null);
            setDetailData(null);
            setMessage('');
          }}
          className="max-w-3xl"
        >
          <div className="pr-8">
            {/* 弹窗头部 */}
            <div className="flex items-center gap-3 mb-6">
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg text-zinc-500">
                  {(selectedUser.full_name?.[0] || selectedUser.email?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-zinc-50">
                  {selectedUser.full_name || '未命名用户'}
                </h2>
                <p className="text-xs text-zinc-500 font-mono">{selectedUser.id}</p>
              </div>
            </div>

            {/* Tab 导航 */}
            <div className="flex gap-1 mb-6 p-1 bg-zinc-800/50 rounded-xl border border-white/[0.06]">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 加载中 */}
            {detailLoading && (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            )}

            {/* Tab 内容 */}
            {!detailLoading && detailData && (
              <>
                {/* ===== 概览 Tab ===== */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                        <p className="text-xs text-zinc-500 mb-1">邮箱</p>
                        <p className="text-sm text-zinc-200">{detailData.profile.email || '—'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                        <p className="text-xs text-zinc-500 mb-1">手机号</p>
                        <p className="text-sm text-zinc-200">{detailData.profile.phone || '—'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                        <p className="text-xs text-zinc-500 mb-1">微信 OpenID</p>
                        <p className="text-sm text-zinc-200 font-mono truncate">
                          {detailData.profile.wechat_openid || '—'}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                        <p className="text-xs text-zinc-500 mb-1">注册时间</p>
                        <p className="text-sm text-zinc-200">
                          {formatDate(detailData.profile.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06] text-center">
                        <p className="text-xs text-zinc-500 mb-1">剩余次数</p>
                        <p className="text-xl font-bold text-brand">
                          {detailData.credits.remaining_analyses}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06] text-center">
                        <p className="text-xs text-zinc-500 mb-1">总购买</p>
                        <p className="text-xl font-bold text-zinc-200">
                          {detailData.credits.total_purchased}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06] text-center">
                        <p className="text-xs text-zinc-500 mb-1">分析数</p>
                        <p className="text-xl font-bold text-zinc-200">
                          {detailData.analysis_count}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06] text-center">
                        <p className="text-xs text-zinc-500 mb-1">Offer</p>
                        <p className="text-xl font-bold text-emerald-400">
                          {detailData.offer_count}
                        </p>
                      </div>
                    </div>

                    {detailData.config && (
                      <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                        <p className="text-xs text-zinc-500 mb-2">风控信息</p>
                        <div className="flex flex-wrap gap-2">
                          {detailData.config.is_flagged && (
                            <span className="px-2 py-1 rounded-md bg-red-950/40 text-red-400 text-xs border border-red-900/30">
                              已标记: {detailData.config.flag_reason || '无原因'}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-white/[0.06]">
                            请求次数: {detailData.config.request_count}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-white/[0.06]">
                            冻结次数: {detailData.config.credits_frozen}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-white/[0.06]">
                            转赠次数: {detailData.config.credits_gifted}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-white/[0.06]">
                            退款次数: {detailData.config.credits_refunded}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== 次数管理 Tab ===== */}
                {activeTab === 'credits' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                      <p className="text-sm text-zinc-400 mb-4">
                        当前剩余次数：
                        <span className="text-brand font-bold text-lg ml-1">
                          {detailData.credits.remaining_analyses}
                        </span>
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">
                            设为次数
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editCredits}
                            onChange={(e) =>
                              setEditCredits(parseInt(e.target.value) || 0)
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 focus:outline-none focus:border-brand/50 transition-colors text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">
                            原因备注
                          </label>
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="如：补偿、活动赠送、错误修正"
                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleUpdateCredits}
                        disabled={editLoading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editLoading ? '处理中...' : '确认修改'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== 分析记录 Tab ===== */}
                {activeTab === 'analyses' && (
                  <div className="max-h-[50vh] overflow-y-auto">
                    {detailData.analyses.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-8">暂无分析记录</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-zinc-900/95 z-10">
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-2 text-xs text-zinc-500">公司</th>
                            <th className="text-left py-2 text-xs text-zinc-500">岗位</th>
                            <th className="text-center py-2 text-xs text-zinc-500">状态</th>
                            <th className="text-center py-2 text-xs text-zinc-500">评级</th>
                            <th className="text-right py-2 text-xs text-zinc-500">时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.analyses.map((a) => (
                            <tr
                              key={a.id}
                              className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                            >
                              <td className="py-2 text-zinc-300">{a.company_name || '—'}</td>
                              <td className="py-2 text-zinc-400">{a.job_title || '—'}</td>
                              <td className="py-2 text-center">
                                <StatusDot status={a.status} />
                              </td>
                              <td className="py-2 text-center">
                                {a.report_json?.sabc_rating?.grade ? (
                                  <span
                                    className={`font-bold ${
                                      gradeColors[a.report_json.sabc_rating.grade] || 'text-zinc-400'
                                    }`}
                                  >
                                    {a.report_json.sabc_rating.grade}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                              <td className="py-2 text-right text-zinc-500 text-xs">
                                {formatShortDate(a.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ===== 消费流水 Tab ===== */}
                {activeTab === 'transactions' && (
                  <div className="max-h-[50vh] overflow-y-auto">
                    {detailData.transactions.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-8">暂无流水记录</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-zinc-900/95 z-10">
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-2 text-xs text-zinc-500">类型</th>
                            <th className="text-center py-2 text-xs text-zinc-500">金额/次数</th>
                            <th className="text-center py-2 text-xs text-zinc-500">余额</th>
                            <th className="text-left py-2 text-xs text-zinc-500">备注</th>
                            <th className="text-right py-2 text-xs text-zinc-500">时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.transactions.map((t) => (
                            <tr
                              key={t.id}
                              className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                            >
                              <td className="py-2">
                                <TransactionBadge type={t.type} />
                              </td>
                              <td className="py-2 text-center font-mono">
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
                              <td className="py-2 text-center text-zinc-400 font-mono">
                                {t.balance_after}
                              </td>
                              <td className="py-2 text-zinc-400 text-xs max-w-[200px] truncate">
                                {t.meta?.reason || '—'}
                              </td>
                              <td className="py-2 text-right text-zinc-500 text-xs">
                                {formatShortDate(t.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ===== 订单记录 Tab ===== */}
                {activeTab === 'orders' && (
                  <div className="max-h-[50vh] overflow-y-auto">
                    {detailData.orders.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-8">暂无订单记录</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-zinc-900/95 z-10">
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-2 text-xs text-zinc-500">套餐</th>
                            <th className="text-center py-2 text-xs text-zinc-500">次数</th>
                            <th className="text-center py-2 text-xs text-zinc-500">金额</th>
                            <th className="text-center py-2 text-xs text-zinc-500">状态</th>
                            <th className="text-right py-2 text-xs text-zinc-500">时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.orders.map((o) => (
                            <tr
                              key={o.id}
                              className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                            >
                              <td className="py-2 text-zinc-300">{o.package_id || '—'}</td>
                              <td className="py-2 text-center text-zinc-400 font-mono">
                                {o.credits ?? '—'}
                              </td>
                              <td className="py-2 text-center text-zinc-400">
                                {o.amount !== null ? `¥${o.amount}` : '—'}
                              </td>
                              <td className="py-2 text-center">
                                <OrderStatusBadge status={o.status} />
                              </td>
                              <td className="py-2 text-right text-zinc-500 text-xs">
                                {formatShortDate(o.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ===== 辅助组件 ===== */

const gradeColors: Record<string, string> = {
  S: 'text-[#F8719D]',
  A: 'text-[#F5A623]',
  B: 'text-[#6EE7B7]',
  C: 'text-[#A1A1AA]',
};

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    分析完成: 'bg-zinc-500',
    待投递: 'bg-zinc-500',
    已投递: 'bg-blue-500',
    面试中: 'bg-amber-500',
    已拿Offer: 'bg-emerald-500',
    已结束: 'bg-zinc-600',
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <span className={`w-1.5 h-1.5 rounded-full ${colorMap[status] || 'bg-zinc-500'}`} />
      {status}
    </span>
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

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-950/40', text: 'text-amber-400', label: '待支付' },
    paid: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', label: '已支付' },
    failed: { bg: 'bg-red-950/40', text: 'text-red-400', label: '失败' },
    cancelled: { bg: 'bg-zinc-800', text: 'text-zinc-400', label: '已取消' },
  };
  const c = config[status] || { bg: 'bg-zinc-800', text: 'text-zinc-400', label: status };
  return (
    <span className={`px-2 py-1 rounded-md text-xs border border-white/[0.06] ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
