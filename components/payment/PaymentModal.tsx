'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import PaymentQRCode from './PaymentQRCode';
import { isWeChatBrowser } from '@/lib/utils/wechat-detect';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  /** /api/payment/create 返回的数据 */
  paymentData: {
    paymentUrl: string;
    orderId: string;
    extra?: {
      qrcode?: string;
      code_url?: string;
      provider_order_id?: string;
    };
  } | null;
  /** 套餐名 */
  packageName: string;
  /** 金额 */
  amount: number;
  /** 支付成功后的回调 */
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  open,
  onClose,
  paymentData,
  packageName,
  amount,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [isWechat, setIsWechat] = useState(false);
  const [wechatRedirecting, setWechatRedirecting] = useState(false);

  useEffect(() => {
    setIsWechat(isWeChatBrowser());
  }, []);

  // 微信内尝试跳转支付链接
  useEffect(() => {
    if (!open || !paymentData || !isWechat) return;

    const codeUrl = paymentData.extra?.code_url || paymentData.paymentUrl;
    if (!codeUrl) return;

    setWechatRedirecting(true);

    const timer = setTimeout(() => {
      window.location.href = codeUrl;
    }, 500);

    return () => clearTimeout(timer);
  }, [open, paymentData, isWechat]);

  const handleSuccess = () => {
    onPaymentSuccess();
  };

  const handleTimeout = () => {
    // 超时不自动跳转，等待用户手动操作
  };

  const handleClose = () => {
    onClose();
  };

  // 判断是否有可用二维码
  const hasQRCode = !!(
    paymentData?.extra?.qrcode ||
    paymentData?.extra?.code_url ||
    paymentData?.paymentUrl
  );

  return (
    <Modal onClose={handleClose} className="max-w-sm">
      <div className="flex flex-col items-center">
        {isWechat ? (
          <div className="flex flex-col items-center gap-4 py-6">
            {wechatRedirecting ? (
              <>
                <div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-300 font-medium">正在跳转支付...</p>
                <p className="text-xs text-zinc-500 text-center">
                  如未自动跳转，请点击右上角 <br />
                  "在浏览器中打开" 重新操作
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-zinc-400">请在微信外扫码支付</p>
                <p className="text-xs text-zinc-500">
                  复制链接到浏览器打开
                </p>
              </div>
            )}
          </div>
        ) : hasQRCode ? (
          <PaymentQRCode
            qrcodeUrl={
              paymentData?.extra?.qrcode ||
              paymentData?.extra?.code_url ||
              paymentData?.paymentUrl ||
              ''
            }
            orderId={paymentData?.extra?.provider_order_id || paymentData?.orderId || ''}
            onSuccess={handleSuccess}
            onTimeout={handleTimeout}
            packageName={packageName}
            amount={amount}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-zinc-400">正在跳转支付...</p>
            <a
              href={paymentData?.paymentUrl || '#'}
              className="text-brand text-sm underline hover:text-brand-light"
            >
              点击手动跳转
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
