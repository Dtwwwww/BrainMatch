'use client';

import { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';

const packages = [
  {
    id: 'free_trial',
    name: '新手包',
    price: '¥0',
    credits: 1,
    description: '新用户注册即送，体验完整分析流程',
    features: ['1 次完整分析', 'SABC 评级 + 改进建议', '6 道面试题', '岗位管理看板'],
    highlighted: false,
    cta: '注册试用',
    ctaLink: '/auth',
  },
  {
    id: 'single',
    name: '单次分析',
    price: '¥3.9',
    credits: 1,
    description: '极低决策门槛，按需使用',
    features: ['1 次完整分析', 'SABC 评级 + 改进建议', '6 道面试题', '岗位管理看板'],
    highlighted: false,
    cta: '立即购买',
    ctaAction: 'single',
  },
  {
    id: 'bundle',
    name: '三次套餐',
    price: '¥9.9',
    originalPrice: '¥11.7',
    credits: 3,
    description: '核心盈利品，锁定求职周期',
    features: ['3 次完整分析', 'SABC 评级 + 改进建议', '3×6 道面试题', '节省 ¥1.8'],
    highlighted: true,
    cta: '超值入手',
    ctaAction: 'bundle',
  },
];

export default function PricingPage() {
  const [showWechatModal, setShowWechatModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleBuy = (pkg: any) => {
    setSelectedPackage(pkg);
    setShowWechatModal(true);
    setCopied(false);
  };

  const handleCopyWechat = async () => {
    try {
      await navigator.clipboard.writeText('DTW1216665430');
      setCopied(true);
      toast.success('微信号已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动搜索添加');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800/60 border border-white/[0.06] text-sm text-zinc-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            简单透明的定价
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 mb-4">
            选择适合你的方案
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            新用户注册即送 1 次分析，后续 ¥3.9/次
          </p>
        </div>

        {/* 主套餐 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {packages.map((pkg) => {
            return (
              <GlassCard
                key={pkg.id}
                className={`p-6 relative ${pkg.highlighted ? 'ring-1 ring-brand/50 shadow-[0_0_20px_rgba(245,166,35,0.1)]' : ''}`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-brand to-brand-dark text-zinc-900 text-xs font-bold">
                    推荐
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                    {pkg.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mb-4">{pkg.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-zinc-50">
                      {pkg.price}
                    </span>
                    {pkg.originalPrice && (
                      <span className="text-sm text-zinc-600 line-through">
                        {pkg.originalPrice}
                      </span>
                    )}
                    <span className="text-sm text-zinc-500">
                      {pkg.price !== '¥0' && `/ ${pkg.credits}次`}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-zinc-400"
                    >
                      <span className="text-brand text-xs">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {pkg.ctaLink ? (
                  <a
                    href={pkg.ctaLink}
                    className="block w-full text-center px-6 py-3 rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 hover:border-white/[0.14] font-semibold text-sm transition-all"
                  >
                    {pkg.cta}
                  </a>
                ) : (
                  <button
                    onClick={() => handleBuy(pkg)}
                    className={`w-full px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      pkg.highlighted
                        ? 'bg-gradient-to-r from-brand to-brand-dark text-zinc-900 shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] hover:translate-y-[-1px]'
                        : 'bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 hover:border-white/[0.14]'
                    }`}
                  >
                    {pkg.cta}
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* 微信联系付款引导 Modal */}
      {showWechatModal && (
      <Modal
        onClose={() => setShowWechatModal(false)}
      >
        <div className="text-center space-y-5">
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">添加微信付款</h3>
          <div className="text-5xl">💬</div>

          <div>
            <p className="text-zinc-300 text-sm mb-2">
              你选择的方案：
            </p>
            <p className="text-xl font-bold text-zinc-50">
              {selectedPackage?.name}
              <span className="text-brand ml-2">{selectedPackage?.price}</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-800/70 border border-white/[0.06] space-y-3">
            <p className="text-sm text-zinc-400">
              添加微信备注「<span className="text-brand font-medium">智析购买</span>」，付款后联系管理员手动添加分析次数
            </p>

            <div className="flex items-center justify-center gap-3">
              <span className="text-lg font-mono font-bold text-zinc-100">
                DTW1216665430
              </span>
              <button
                onClick={handleCopyWechat}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-brand/10 text-brand border border-brand/30 hover:bg-brand/20"
              >
                {copied ? '✓ 已复制' : '复制微信号'}
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            付款完成后，请发送手机号给管理员，我们将在 5 分钟内完成次数充值
          </p>

          <a
            href="weixin://"
            className="block w-full text-center px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm hover:shadow-[0_0_30px_rgba(245,166,35,0.45)] transition-all duration-200"
          >
            打开微信
          </a>
        </div>
      </Modal>
      )}
    </div>
  );
}
