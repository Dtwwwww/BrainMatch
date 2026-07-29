'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import GlassCard from '@/components/ui/GlassCard';

export default function AuthPage() {
  // 密码登录
  const [lgPhone, setLgPhone] = useState('');
  const [lgPassword, setLgPassword] = useState('');

  // 通用
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ====== 密码登录 ======
  const handleLogin = async () => {
    if (!lgPhone || !/^1\d{10}$/.test(lgPhone)) {
      setError('请输入正确的手机号');
      return;
    }
    if (!lgPassword) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lgPhone, password: lgPassword, mode: 'password' }),
      });
      const data = await res.json();
      if (data.success) {
        await setSessionAndGo(data.access_token, data.refresh_token);
      } else {
        setError(data.error);
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const setSessionAndGo = async (access_token: string, refresh_token: string) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    try {
      await supabase.auth.setSession({ access_token, refresh_token });
    } catch {}
    // 读取 URL 上的 redirect 参数，有则回跳，无则默认 /dashboard
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || '/dashboard';
    window.location.href = redirect;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">⚡</div>
          <h1 className="text-2xl font-bold text-zinc-50 mb-2">登录 智析 BrainMatch</h1>
          <p className="text-sm text-zinc-400">AI 驱动的求职教练</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        <GlassCard className="p-6 space-y-5">
          {/* 微信按钮 — 禁用 */}
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-800/50 text-zinc-600 text-sm font-medium border border-white/[0.04] cursor-not-allowed"
          >
            微信授权登录
            <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded-md">即将支持</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-zinc-600">手机号</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* 密码登录 */}
          <div className="space-y-3">
            <input
              type="tel"
              placeholder="手机号"
              value={lgPhone}
              onChange={(e) => setLgPhone(e.target.value)}
              maxLength={11}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 text-sm"
            />
            <input
              type="password"
              placeholder="密码"
              value={lgPassword}
              onChange={(e) => setLgPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 text-sm"
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm shadow-glow-brand hover:shadow-[0_0_30px_rgba(245,166,35,0.45)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>
        </GlassCard>

        <p className="text-center text-xs text-zinc-600 mt-6">
          登录即表示同意{' '}<a href="#" className="text-zinc-400 hover:text-brand">服务条款</a>{' '}和{' '}<a href="#" className="text-zinc-400 hover:text-brand">隐私政策</a>
        </p>
      </div>
    </div>
  );
}
