'use client';

import { useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import Avatar from '@/components/ui/Avatar';
import DropdownMenu, { type DropdownItem } from '@/components/ui/DropdownMenu';

/**
 * 脱敏手机号：138****1234
 */
function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 用户显示名：
 *   full_name → 脱敏手机号 → '用户'
 */
function getDisplayName(
  profile: { full_name?: string | null; phone?: string | null } | null
): string {
  if (profile?.full_name) return profile.full_name;
  if (profile?.phone) return maskPhone(profile.phone);
  return '用户';
}

export default function Navbar() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contactContainerRef = useRef<HTMLDivElement>(null);

  const handleContactEnter = () => {
    if (contactTimerRef.current) clearTimeout(contactTimerRef.current);
    contactTimerRef.current = setTimeout(() => setContactOpen(true), 300);
  };

  const handleContactLeave = () => {
    if (contactTimerRef.current) clearTimeout(contactTimerRef.current);
    contactTimerRef.current = setTimeout(() => setContactOpen(false), 150);
  };

  const handleContactClick = () => {
    // 移动端点击切换
    if (contactTimerRef.current) clearTimeout(contactTimerRef.current);
    setContactOpen((prev) => !prev);
  };

  const profile = user?.profile || null;
  const displayName = getDisplayName(profile);

  const dropdownItems: DropdownItem[] = [
    {
      type: 'link',
      label: '个人设置',
      href: '/settings',
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      ),
    },
    {
      type: 'link',
      label: '岗位管理',
      href: '/dashboard',
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    { type: 'divider' },
    {
      type: 'button',
      label: '退出登录',
      danger: true,
      onClick: signOut,
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-zinc-950/70 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
        {/* Logo — 从现有 layout.tsx 完全复用 */}
        <a
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-zinc-50 hover:text-brand transition-colors"
        >
          <span className="text-brand text-xl">⚡</span>
          <span>智析</span>
          <span className="text-xs text-zinc-500 font-normal">BrainMatch</span>
        </a>

        {/* CTA 快捷入口 — 紧邻 Logo，位于导航链接之前 */}
        <a
          href="/analyze"
          className="hidden md:inline-flex px-4 py-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm shadow-glow-brand hover:shadow-[0_0_30px_rgba(245,166,35,0.45)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200"
        >
          ⚡ 开始分析
        </a>

        {/* Nav Links — 从现有 layout.tsx 完全复用 */}
        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <a
            href="/#features"
            className="hover:text-zinc-200 transition-colors"
          >
            功能介绍
          </a>
          <a
            href="/pricing"
            className="hover:text-zinc-200 transition-colors"
          >
            定价
          </a>
          <a
            href="/dashboard"
            className="hover:text-zinc-200 transition-colors"
          >
            岗位管理
          </a>
        </div>

        {/* 联系我们 — 悬停弹出联系人卡片 */}
        <div
          ref={contactContainerRef}
          className="hidden md:block relative"
          onMouseEnter={handleContactEnter}
          onMouseLeave={handleContactLeave}
        >
          <button
            onClick={handleContactClick}
            aria-expanded={contactOpen}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            ✉️ 联系我们
          </button>

          {contactOpen && (
            <div
              role="tooltip"
              aria-label="联系方式"
              className="absolute right-0 top-full mt-2 w-64 p-4 bg-zinc-900/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">📬</span>
                <span className="text-sm font-semibold text-zinc-200">
                  联系我们
                </span>
              </div>
              <div className="border-t border-white/[0.06] mb-2.5" />

              {/* 微信 */}
              <div className="flex items-center gap-2.5 py-1.5 text-xs text-zinc-400">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="shrink-0 text-emerald-400"
                >
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.742 2.042 2.794 3.17 5.117 3.123.33-.006.66-.044.987-.127a.69.69 0 0 1 .572.078l1.773 1.047a.255.255 0 0 0 .13.042c.124 0 .224-.102.224-.228 0-.056-.015-.112-.038-.167l-.318-1.193a.47.47 0 0 1 .17-.532C20.07 17.648 21 16.126 21 14.451c0-2.882-2.836-5.374-6.062-5.593zm-2.428 2.97c.514 0 .93.423.93.944a.937.937 0 0 1-.93.943.937.937 0 0 1-.93-.943c0-.521.416-.943.93-.943zm4.82 0c.513 0 .93.423.93.944a.937.937 0 0 1-.93.943.937.937 0 0 1-.93-.943c0-.521.416-.943.93-.943z" />
                </svg>
                <span className="text-zinc-500 w-8">微信</span>
                <span className="text-zinc-300 font-mono select-all">
                  DTW1216665430
                </span>
              </div>

              {/* QQ */}
              <div className="flex items-center gap-2.5 py-1.5 text-xs text-zinc-400">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="shrink-0 text-blue-400"
                >
                  <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.527 1.31.565.45 1.772.712 3.526.79.087.49.266 1.258.525 2.123.096.322.413.478.712.327.63-.318 1.244-.96 1.694-1.899.268.008.546.01.83.01h.276c.284 0 .562-.002.83-.01.45.94 1.065 1.581 1.694 1.9.299.15.616-.006.712-.328.26-.865.438-1.633.525-2.123 1.754-.078 2.96-.34 3.526-.79.357-.285.527-.645.527-1.31 0-2.513-2.463-6.954-2.463-6.954V9.325C18.593 3.364 14.268 2 12.003 2z" />
                </svg>
                <span className="text-zinc-500 w-8">QQ</span>
                <span className="text-zinc-300 font-mono select-all">
                  1216665430
                </span>
              </div>

              {/* 邮箱 */}
              <div className="flex items-center gap-2.5 py-1.5 text-xs text-zinc-400">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-amber-400"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span className="text-zinc-500 w-8">邮箱</span>
                <span className="text-zinc-300 font-mono select-all text-[11px]">
                  1216665430@qq.com
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Auth Area — 条件渲染 */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            /* 骨架占位 */
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : isAuthenticated ? (
            /* 已登录 → 头像 + 用户名 + 下拉箭头 */
            <>
              <div
                ref={triggerRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="relative flex items-center gap-2.5 cursor-pointer select-none group"
              >
                <Avatar
                  src={profile?.avatar_url}
                  name={displayName}
                  size="sm"
                />
                <span className="hidden sm:block text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors max-w-[120px] truncate">
                  {displayName}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-zinc-500 transition-transform duration-200 ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              <DropdownMenu
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                items={dropdownItems}
                triggerRef={triggerRef}
                align="right"
              />
            </>
          ) : (
            /* 未登录 → 登录/注册按钮（保持现有样式） */
            <a
              href="/auth"
              className="px-4 py-2 text-sm rounded-xl bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:bg-zinc-700 hover:border-white/[0.14] active:scale-[0.98] transition-all duration-200"
            >
              登录 / 注册
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
