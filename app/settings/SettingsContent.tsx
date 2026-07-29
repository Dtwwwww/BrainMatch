'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/layout/AuthProvider';
import Avatar from '@/components/ui/Avatar';
import GlassCard from '@/components/ui/GlassCard';

/**
 * 脱敏手机号：138****1234
 */
function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function SettingsContent() {
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();
  const router = useRouter();

  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  // 从 Context 同步昵称到本地状态
  useEffect(() => {
    if (user?.profile?.full_name) {
      setNickname(user.profile.full_name);
    }
  }, [user?.profile?.full_name]);

  // 未登录 → 跳转
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth?redirect=/settings');
    }
  }, [isLoading, isAuthenticated, router]);

  // 保存昵称
  const handleSaveNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      toast.error('昵称不能为空');
      return;
    }
    if (trimmed.length > 50) {
      toast.error('昵称不能超过50个字符');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ full_name: trimmed });
      toast.success('昵称已更新');
    } catch (err: any) {
      toast.error(err.message || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-zinc-500 text-sm">加载中...</div>
      </div>
    );
  }

  if (!user) return null;

  const { profile, credits } = user;
  const displayName = profile?.full_name || maskPhone(profile?.phone || '') || '用户';

  return (
    <div className="space-y-6">
      {/* 基本信息卡片 */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-zinc-50 mb-6">基本信息</h2>

        {/* 头像区域（只读） */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.06]">
          <Avatar
            src={profile?.avatar_url}
            name={displayName}
            size="lg"
          />
          <div>
            <p className="text-sm font-medium text-zinc-200">{displayName}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              注册时间：{formatDate(profile?.created_at || null)}
            </p>
          </div>
        </div>

        {/* 昵称编辑 */}
        <div className="mb-5">
          <label className="block text-sm text-zinc-400 mb-2">昵称</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNickname();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 text-sm"
            />
            <button
              onClick={handleSaveNickname}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:shadow-[0_0_20px_rgba(245,166,35,0.35)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* 手机号（只读） */}
        <div className="mb-5">
          <label className="block text-sm text-zinc-400 mb-2">手机号</label>
          <input
            type="text"
            value={profile?.phone ? maskPhone(profile.phone) : '未绑定'}
            disabled
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/[0.04] text-zinc-400 text-sm cursor-not-allowed"
          />
          {profile?.phone_verified && (
            <p className="text-xs text-emerald-500 mt-1">✓ 已验证</p>
          )}
        </div>
      </GlassCard>

      {/* 服务信息卡片 */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">服务信息</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-zinc-400">剩余分析次数</p>
            <p className="text-2xl font-bold text-brand mt-1 font-mono">
              {credits?.remaining_analyses ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">累计购买</p>
            <p className="text-2xl font-bold text-zinc-300 mt-1 font-mono">
              {credits?.total_purchased ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <a
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-light transition-colors"
          >
            购买更多分析次数 →
          </a>
        </div>
      </GlassCard>
    </div>
  );
}
