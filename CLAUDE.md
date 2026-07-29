# 智析 BrainMatch — 项目概述

> 最后更新：2026-07-30 | TS 编译：✅ 零错误 | 构建：✅ 通过

## 1. 是什么

**智析 BrainMatch** — AI 求职教练。输入 JD + 简历，4 个 AI Agent 协作产出：SABC 评级、匹配报告、改进建议、面试题库、岗位管理看板。

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS + tailwindcss-animate，dark 主题 |
| 数据库 | Supabase (PostgreSQL + Auth + RLS) |
| 缓存 | Upstash Redis（限流用） |
| AI | OpenAI API，4 Agent 协作流水线 |
| 通知 | Sonner (toast) |
| 支付 | 自定义工厂（Mock 模式） |

## 3. 目录结构

```
brainmatch/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局 ← 重要
│   ├── page.tsx                  # 首页（Hero + Features + CTA）
│   ├── globals.css               # Tailwind + CSS 变量 + 自定义类
│   ├── (auth)/auth/page.tsx      # 登录/注册页面
│   ├── (auth)/bind-phone/        # 微信登录后绑定手机号
│   ├── dashboard/page.tsx        # 岗位管理看板 ← 重要
│   ├── settings/                 # 个人设置（新增）
│   │   ├── page.tsx              # Server Component wrapper
│   │   └── SettingsContent.tsx   # Client Component 表单
│   ├── analyze/                  # 新建分析 + 处理中页面
│   ├── analysis/[id]/            # 分析报告详情页
│   ├── admin/page.tsx            # 管理员后台（X-Admin-Key 验证）
│   ├── pricing/page.tsx          # 定价页
│   ├── share/[token]/            # 分享页
│   └── api/                      # 后端 API
│       ├── auth/phone/           # 手机号认证（发送验证码、验证、绑定）
│       ├── auth/wechat/          # 微信 OAuth
│       └── protected/            # 需登录的 API
│           ├── profile/route.ts  # GET + PATCH 用户资料 ← 新增
│           ├── credits/          # 用户次数 CRUD
│           ├── analyses/         # 岗位/分析 CRUD ← 重要
│           └── analyze/          # 发起分析 + SSE 进度
├── components/
│   ├── ui/                       # UI 基础组件
│   │   ├── Button.tsx, Modal.tsx, GlassCard.tsx
│   │   ├── Avatar.tsx            # ← 新增
│   │   ├── DropdownMenu.tsx      # ← 新增
│   │   ├── Skeleton.tsx, StatusBadge.tsx, GradeBadge.tsx
│   │   ├── StatCard.tsx, PaywallBanner.tsx
│   │   └── SocialShare.tsx
│   ├── layout/                   # 布局组件 ← 新增目录
│   │   ├── AuthProvider.tsx      # 全局认证 Context (useAuth)
│   │   ├── Navbar.tsx            # 登录感知导航栏
│   │   └── ProtectedRoute.tsx    # 客户端路由保护兜底
│   ├── admin/, analyze/, auth/, credits/, dashboard/
│   ├── pricing/, processing/, report/, share/
│   └── AddPositionModal.tsx      # 手动添加岗位弹窗
├── lib/
│   ├── types/index.ts            # 全局类型定义 ← 重要
│   ├── supabase/
│   │   ├── server.ts             # 服务端 Supabase 客户端 + getAuthenticatedUser()
│   │   └── client.ts             # 浏览器端 Supabase 客户端
│   ├── api/error-handler.ts      # 统一错误处理 (AppError + handleAppError)
│   ├── agents/                   # AI Orchestrator (4 Agent 流水线)
│   ├── ai/                       # AI 配置、模型路由、提示词
│   ├── auth/wechat.ts            # 微信 OAuth 配置
│   ├── ocr/                      # JD OCR + 简历解析
│   ├── payment/                  # 支付接口 + 工厂
│   └── utils/                    # cn(), json-safe-parse
├── middleware.ts                  # 全局中间件 ← 重要（CORS + 路由保护）
├── supabase-schema.sql           # 完整建表脚本 ← 重要
└── tailwind.config.ts            # Tailwind 配置（品牌色、动画）
```

## 4. 数据库（Supabase）

### 核心表

| 表 | 说明 |
|---|---|
| `public.profiles` | 用户扩展资料（full_name, phone, avatar_url, wechat_openid） |
| `public.user_credits` | 用户分析次数（remaining_analyses, total_purchased） |
| `public.analyses` | 分析记录 + 岗位管理（jd_text, resume_text, report_json, status, company_name, job_title, job_url, note, interview_round...） |
| `public.user_config` | 用户配置（限流 + 风控） |
| `public.credit_transactions` | 消费流水 |
| `public.orders` | 订单 |
| `public.jd_cache` | JD 语义缓存 |

### RLS 策略
- profiles: 用户可读写自己的
- user_credits: 用户只读
- analyses: 用户 CRUD 自己的，share_token 可公开读
- 触发器 `on_auth_user_created` 自动创建 profiles + user_credits(1次) + user_config

## 5. 关键类型（lib/types/index.ts）

```ts
AnalysisStatus = '分析完成' | '待投递' | '已投递' | '面试中' | '已拿Offer' | '已结束'

// 分析记录（也是岗位记录）
AnalysisRecord {
  id, user_id, jd_text, resume_text,
  job_insight, resume_insight, report_json: ReportJSON | null,
  status, company_name, job_title, job_url, note,
  applied_at, interview_round, interview_date,
  status_history, is_archived, created_at, updated_at

// 用户
AuthenticatedUser { id, profile: UserProfile | null, credits: UserCredits }
UserProfile { id, email, phone, full_name, avatar_url, phone_verified, ... }
UserCredits { remaining_analyses, total_purchased }
```

## 6. 认证体系

### 登录方式
- **手机号 + 密码**（生产模式）
- **手机号 + 验证码注册**（开发模式验证码直接返回）
- **微信 OAuth**（代码完成，UI 按钮标注"即将支持"）

### 认证流程
1. `/api/auth/phone/verify` (mode=password) → 返回 access_token + refresh_token
2. 前端 `setSessionAndGo()` 写入 Supabase session cookie → 跳转
3. 服务端 `getAuthenticatedUser()` 读取 cookie 鉴权 → 返回 `AuthenticatedUser`
4. **新增**：middleware 层路由保护，未登录 → 302 `/auth?redirect=原路径`
5. **新增**：React Context (`useAuth()`) 全局管理用户状态

### 鉴权层级
```
middleware.ts (302 重定向) → layout.tsx (Server Component) → AuthProvider (Context)
  → ProtectedRoute (客户端兜底) → useAuth() hook → API 层 getAuthenticatedUser()
```

## 7. 新增组件速查（登录功能改进）

| 组件 | 路径 | Props |
|------|------|-------|
| `Avatar` | `components/ui/Avatar.tsx` | `src?`, `name?`, `size?` ('sm'\|'md'\|'lg') |
| `DropdownMenu` | `components/ui/DropdownMenu.tsx` | `isOpen`, `onClose`, `items`, `triggerRef`, `align?` |
| `AuthProvider` | `components/layout/AuthProvider.tsx` | `initialUser?`, 导出 `useAuth()` |
| `Navbar` | `components/layout/Navbar.tsx` | 无 Props，自包含 |
| `ProtectedRoute` | `components/layout/ProtectedRoute.tsx` | `children` |

### useAuth() 返回值
```ts
{ user, isLoading, isAuthenticated, signOut, refreshUser, updateProfile }
```

### 导航栏行为
- `isLoading` → 骨架圆角矩形
- 未登录 → "登录 / 注册" 按钮
- 已登录 → Avatar + 用户名 + 下拉箭头 → DropdownMenu（个人设置/控制台/退出登录）

## 8. 设计系统

- **主题**: dark only，背景 `#09090B`
- **品牌色**: `#F5A623` (金色)，`text-brand` / `bg-brand` / `from-brand to-brand-dark`
- **强调色**: `#6366F1` (靛蓝)，`text-accent` / `bg-accent`
- **常用背景**: `bg-zinc-950/70`, `bg-zinc-900/70`, `bg-zinc-800`
- **常用文字**: `text-zinc-50`(主), `text-zinc-400`(次), `text-zinc-500`(弱)
- **玻璃效果**: `GlassCard` 组件 或 `bg-zinc-900/70 backdrop-blur-xl border border-white/[0.08] rounded-2xl`
- **品牌按钮**: `bg-gradient-to-r from-brand to-brand-dark text-zinc-900 shadow-glow-brand`
- **输入框**: `bg-zinc-800 border border-white/[0.08] rounded-xl text-zinc-200 placeholder-zinc-500 focus:border-brand/50`
- **动画**: `tailwindcss-animate` 插件，`animate-in fade-in` 等

## 9. 常用 API 模式

### 受保护 API 模板
```ts
export async function GET() {
  try {
    const user = await getAuthenticatedUser(); // 未认证抛 'Unauthorized'
    // ... 业务逻辑 ...
    return Response.json({ data });
  } catch (error) {
    return handleAppError(error); // 统一错误处理
  }
}
```

### 错误处理
```ts
throw new AppError(400, '参数错误');  // → { error: '参数错误' }, 400
// Unauthorized → { error: '请先登录' }, 401
// 其他 → { error: '服务器内部错误' }, 500
```

## 10. 路由保护

middleware.ts 已配置 PROTECTED_PATHS = `['/dashboard', '/analyze', '/settings']`，未登录自动 302。

登录页 `setSessionAndGo` 已支持 `?redirect=` 参数回跳。

## 11. 注意事项

- **无 git 仓库**：项目目前没有 git 初始化
- **无全局状态管理库**：使用 React Context (AuthProvider) 代替 Redux/Zustand
- **验证码开发模式**：后端直接返回验证码明文，前端显示黄色提示框
- **支付为 Mock**：当前未接入真实支付
- **微信登录按钮禁用**：标注"即将支持"
- **Navbar 中下拉菜单**：使用 `createPortal` 渲染到 `document.body`，通过 `triggerRef.getBoundingClientRect()` 计算定位
- **退出登录用 `window.location.href`**：不用 `router.push`，确保清除所有客户端状态
- **`app/layout.tsx` 保持同步函数**：之前尝试改为 async 引入 `getAuthenticatedUser()` 会导致构建成功但前端白屏
