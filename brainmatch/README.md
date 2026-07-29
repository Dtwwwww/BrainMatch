# 智析 BrainMatch — 项目摘要

## 状态：MVP 就绪，待部署

## 技术栈
Next.js 14 (App Router) + TypeScript + Tailwind CSS (暗色) + Supabase (Auth + DB + RLS) + DeepSeek AI

## 核心功能
- **认证**：手机号+验证码注册（IP 限流 24h/次）、手机号+密码登录、微信 OAuth（待 AppID）
- **AI 分析**：输入 JD+简历 → 4 Agent 编排（DeepSeek-v3）→ SABC 评级 + 面试题
- **报告页**：4 Tab（匹配总览/岗位解析/简历解析/面试题库）+ STAR 框架
- **Dashboard**：岗位管理看板 + 统计 + 状态流转
- **支付**：Mock 支付（待接入真实渠道）
- **分享**：帮朋友分析，公开分享页

## 环境变量（最小必要）
```
NEXT_PUBLIC_SUPABASE_URL=https://bpwrjouiqqxmrhtluqqv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
DEEPSEEK_API_KEY=sk-xxx
```

## 运行
```bash
cd brainmatch
npm run dev    # 开发
npm run build  # 构建
```

## 部署
Windows 上两个 Cloudflare 适配器均不兼容 → 建议在 WSL/Linux 环境部署，或改用 Vercel。
