import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/layout/AuthProvider';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: '智析 BrainMatch — AI 求职教练',
  description:
    'AI 驱动的求职教练 —— 输入 JD 和简历，获得猎头级的 SABC 评级、改进建议、选岗指导和面试题库。',
  keywords: ['求职', 'AI', '简历分析', 'JD匹配', '面试题', '岗位管理'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-[#09090B] text-zinc-50 antialiased">
        {/* 全局背景光晕 — 品牌氛围感 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* 左上角品牌金色光晕 */}
          <div
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-60"
            style={{
              background:
                'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',
              filter: 'blur(120px)',
            }}
          />
          {/* 右下角靛蓝色光晕 */}
          <div
            className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
              filter: 'blur(100px)',
            }}
          />
        </div>

        <AuthProvider>
          {/* 登录感知导航栏 */}
          <Navbar />

          {/* 主内容区 — 偏移固定导航栏高度 */}
          <main className="pt-16">{children}</main>

          {/* Toast 弹窗 */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#18181b',
                color: '#e4e4e7',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: '14px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
