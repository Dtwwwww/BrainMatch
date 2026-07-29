export const runtime = 'edge';

import GlassCard from '@/components/ui/GlassCard';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Hero 背景渐变 */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px]"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,166,35,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-36 text-center">
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800/60 border border-white/[0.06] text-sm text-zinc-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse-glow" />
            AI 驱动的求职教练
          </div>

          {/* 主标题 — 品牌渐变文字 */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand via-brand-light to-accent-light">
              不止于评估
            </span>
            <br />
            <span className="text-zinc-50">更致力于陪伴求职者</span>
            <br />
            <span className="text-zinc-50">从分析到面试的每一步</span>
          </h1>

          {/* 副标题 */}
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            输入职位描述和个人简历，AI 自动完成猎头级匹配分析——
            SABC 评级、改进建议、选岗指导、面试题库，一站式覆盖求职全流程。
          </p>

          {/* CTA 按钮组 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="/auth"
              className="px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-brand to-brand-dark text-zinc-900 shadow-[0_0_30px_rgba(245,166,35,0.3)] hover:shadow-[0_0_50px_rgba(245,166,35,0.5)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200"
            >
              注册账号
            </a>
            <a
              href="/analyze"
              className="px-8 py-4 rounded-2xl font-semibold text-base bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 hover:border-white/[0.14] active:scale-[0.98] transition-all duration-200"
            >
              立即开始分析
            </a>
            <a
              href="/pricing"
              className="px-8 py-4 rounded-2xl font-semibold text-base bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 hover:border-white/[0.14] active:scale-[0.98] transition-all duration-200"
            >
              查看定价
            </a>
          </div>

          {/* 信任元素 */}
          <div className="flex items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="text-center">
              <div className="text-xl font-bold text-zinc-300 font-mono">
                多维度
              </div>
              <div className="text-xs">硬性/软性/加分三维评估</div>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center">
              <div className="text-xl font-bold text-zinc-300 font-mono">
                秒级
              </div>
              <div className="text-xs">极速产出分析报告</div>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center">
              <div className="text-xl font-bold text-zinc-300 font-mono">
                4 Agent
              </div>
              <div className="text-xs">AI 协作流水线</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-50 mb-4">
            三阶段分析，洞见每一个细节
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            从岗位解析到面试题库，AI 协作流水线为你提供猎头级的专业分析
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <GlassCard className="p-6">
            <div className="text-3xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              岗位解析
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              基于冰山模型，将 JD
              分解为显性技能要求和隐性能力素质，同时按优先级分类核心项与加分项。
            </p>
          </GlassCard>

          {/* Feature 2 */}
          <GlassCard className="p-6">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              匹配评估
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              三维评分（硬性/软性/加分）+ SABC
              定级，提供详细的达标项、差距项分析和逐项匹配证据链。
            </p>
          </GlassCard>

          {/* Feature 3 */}
          <GlassCard className="p-6">
            <div className="text-3xl mb-4">📌</div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              投递管理
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              可视化的岗位管理看板，追踪从"待投递"到"已拿
              Offer"的完整求职周期，支持搜索、筛选和状态流转。
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="relative overflow-hidden rounded-3xl p-12 md:p-16">
          {/* 背景光晕 */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-accent/5" />
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-50 mb-4">
              准备好升级你的求职方式了吗？
            </h2>
            <p className="text-zinc-400 mb-8">
              输入职位描述和简历，获取猎头级的 SABC 评级、改进建议、选岗指导和面试题库。
            </p>
            <a
              href="/analyze"
              className="inline-flex px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-brand to-brand-dark text-zinc-900 shadow-[0_0_30px_rgba(245,166,35,0.3)] hover:shadow-[0_0_50px_rgba(245,166,35,0.5)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200"
            >
              立即开始分析 ✨
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-500">
          <p>智析 BrainMatch © 2026 — AI 驱动的求职教练</p>
        </div>
      </footer>
    </div>
  );
}
