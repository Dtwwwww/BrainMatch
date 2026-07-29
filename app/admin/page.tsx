'use client';

import { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';

interface UserResult {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [credits, setCredits] = useState(5);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  // 密钥验证
  const handleAuth = async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/users/search?q=test`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.status === 404) {
        setMessage('密钥错误');
      } else {
        setAuthenticated(true);
        setMessage('');
      }
    } catch {
      setMessage('验证失败，请重试');
    }
  };

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { 'X-Admin-Key': adminKey } }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch {
      setMessage('搜索失败');
    }
  };

  // 加次数
  const handleAddCredits = async () => {
    if (!selectedUser || credits < 1) return;
    try {
      const res = await fetch('/api/admin/credits/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          credits,
          reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage('操作失败');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold text-zinc-50 mb-4 text-center">
            管理后台
          </h1>
          {message && (
            <p className="mt-3 text-sm text-zinc-400">{message}</p>
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

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-zinc-50 mb-8">管理后台</h1>

        {/* 搜索用户 */}
        <GlassCard className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            搜索用户
          </h2>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入邮箱或手机号搜索..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 transition-all text-sm"
            >
              搜索
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-brand/10 border border-brand/30'
                      : 'bg-zinc-800/50 border border-white/[0.04] hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-200">
                        {user.phone || user.email || user.full_name || '未命名'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {user.id.slice(0, 8)}... ·{' '}
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('zh-CN')
                          : '—'}
                      </p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <span className="text-xs text-brand">已选中</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* 加次数 */}
        {selectedUser && (
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              给用户加次数
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              用户：{selectedUser.phone || selectedUser.email || selectedUser.id}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">
                  添加次数
                </label>
                <input
                  type="number"
                  value={credits}
                  onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                  min={1}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 focus:outline-none focus:border-brand/50 transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">
                  原因（可选）
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="如：活动赠送"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleAddCredits}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm hover:translate-y-[-1px] transition-all"
            >
              确认添加
            </button>

            {message && (
              <p className="mt-3 text-sm text-zinc-400">{message}</p>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
