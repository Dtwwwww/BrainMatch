'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import GlassCard from '@/components/ui/GlassCard';

export default function BindPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (token && refresh) {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      supabase.auth
        .setSession({ access_token: token, refresh_token: refresh })
        .then(({ error }) => {
          if (error) {
            setError('登录态已失效，请重新微信登录');
          } else {
            setSessionReady(true);
          }
        });
    } else {
      setError('缺少登录凭证，请通过微信登录');
    }
  }, [searchParams]);

  const handleSendCode = async () => {
    if (!phone || !/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        if (data.devCode) setDevCode(data.devCode);
      } else {
        setError(data.error || '发送失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async () => {
    if (!code) {
      setError('请输入验证码');
      return;
    }
    if (password && password.length < 6) {
      setError('密码至少6位');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, password: password || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error || '绑定失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady && error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-zinc-50 mb-2">链接已失效</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a
            href="/auth"
            className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm"
          >
            重新登录 →
          </a>
        </GlassCard>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">📱</div>
          <h1 className="text-2xl font-bold text-zinc-50 mb-2">绑定手机号</h1>
          <p className="text-sm text-zinc-400">
            微信登录成功！请绑定手机号以完成注册
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        <GlassCard className="p-6 space-y-4">
          <input
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={11}
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
          />

          {codeSent && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <input
                type="text"
                placeholder="请输入验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
              />
              {devCode && (
                <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-1.5 text-center">
                  🔧 开发模式 — 验证码：<strong>{devCode}</strong>
                </p>
              )}
            </div>
          )}

          <input
            type="password"
            placeholder="设置登录密码（可选，6位以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm"
          />
          <p className="text-xs text-zinc-600 -mt-2 ml-1">
            设置后可用手机号+密码直接登录
          </p>

          {!codeSent ? (
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 hover:border-white/[0.14] font-semibold text-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送验证码'}
            </button>
          ) : (
            <button
              onClick={handleBind}
              disabled={loading || !code}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm shadow-glow-brand hover:shadow-[0_0_30px_rgba(245,166,35,0.45)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? '绑定中...' : '完成绑定'}
            </button>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
