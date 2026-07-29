'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface PaymentQRCodeProps {
  /** 支付渠道生成的二维码图片 URL */
  qrcodeUrl: string;
  /** 支付渠道内部订单号，用于轮询 */
  orderId: string;
  /** 支付成功回调 */
  onSuccess: () => void;
  /** 超时回调（5 分钟后触发） */
  onTimeout: () => void;
  /** 包名（用于展示） */
  packageName: string;
  /** 金额（用于展示） */
  amount: number;
}

type PaymentStatus = 'waiting' | 'paid' | 'timeout' | 'error';

const POLL_INTERVAL = 3000; // 每 3 秒轮询
const PAYMENT_TIMEOUT = 300; // 5 分钟超时

/**
 * 支付二维码组件
 *
 * 展示渠道下发的二维码图片，每 3 秒轮询支付状态，
 * 5 分钟倒计时超时。通用组件，不绑定具体支付渠道。
 */
export default function PaymentQRCode({
  qrcodeUrl,
  orderId,
  onSuccess,
  onTimeout,
  packageName,
  amount,
}: PaymentQRCodeProps) {
  const [status, setStatus] = useState<PaymentStatus>('waiting');
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_TIMEOUT);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSucceededRef = useRef(false);

  // 轮询支付状态
  const pollPaymentStatus = useCallback(async () => {
    if (hasSucceededRef.current) return;

    try {
      const res = await fetch('/api/payment/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (data.status === 'paid') {
        hasSucceededRef.current = true;
        setStatus('paid');
        toast.success('支付成功！次数已到账');
        setTimeout(() => onSuccess(), 1200);
      }
    } catch {
      // 静默重试，不中断用户体验
    }
  }, [orderId, onSuccess]);

  // 启动轮询 + 倒计时
  useEffect(() => {
    if (status === 'paid' || status === 'timeout') return;

    pollTimerRef.current = setInterval(pollPaymentStatus, POLL_INTERVAL);

    countdownTimerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setStatus('timeout');
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [status, pollPaymentStatus, onTimeout]);

  // 立即查询一次
  useEffect(() => {
    pollPaymentStatus();
  }, [pollPaymentStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 标题 */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-100 mb-1">
          {packageName}
        </h3>
        <p className="text-sm text-zinc-400">
          使用微信/支付宝扫描二维码支付
        </p>
      </div>

      {/* 二维码 */}
      {status === 'waiting' && (
        <div className="relative">
          <div className="w-56 h-56 rounded-2xl border border-white/[0.08] bg-white p-3 overflow-hidden">
            {qrcodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrcodeUrl}
                alt="支付二维码"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <span className="text-xs text-zinc-500">
              二维码有效期 {formatTime(secondsLeft)}
            </span>
          </div>
        </div>
      )}

      {/* 成功 */}
      {status === 'paid' && (
        <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm text-green-400 font-medium">支付成功</p>
          <p className="text-xs text-zinc-500">正在跳转...</p>
        </div>
      )}

      {/* 超时 */}
      {status === 'timeout' && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">支付超时</p>
          <p className="text-xs text-zinc-500">二维码已过期，请重新创建订单</p>
        </div>
      )}

      {/* 金额 + 提示 */}
      <div className="w-full pt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">应付金额</span>
          <span className="text-brand font-bold text-lg">¥{amount.toFixed(2)}</span>
        </div>
        <p className="text-xs text-zinc-600 mt-2 text-center">
          支付问题请联系客服：微信 DTW1216665430
        </p>
      </div>
    </div>
  );
}
