-- =============================================
-- 智析 BrainMatch — Supabase 数据库建表脚本
-- 版本：V4.3 MVP
-- 执行方式：在 Supabase SQL Editor 中完整运行
-- =============================================

-- =============================================
-- 1. 用户扩展资料表
-- =============================================
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text,
  phone text UNIQUE,
  wechat_openid text UNIQUE,
  wechat_unionid text,
  full_name text,
  avatar_url text,
  phone_verified boolean DEFAULT false,
  wechat_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. 用户分析次数表
-- =============================================
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  remaining_analyses int DEFAULT 1,
  total_purchased int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. JD 语义缓存表（必须在 analyses 之前创建，因外键引用）
-- =============================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.jd_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  jd_hash text UNIQUE NOT NULL,
  jd_embedding vector(1536),
  job_insight jsonb NOT NULL,
  hit_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_jd_cache_hash ON public.jd_cache(jd_hash);

-- =============================================
-- 4. 分析记录表（含岗位管理字段）
-- =============================================
CREATE TABLE public.analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  jd_text text NOT NULL,
  resume_text text NOT NULL,

  -- 三阶段中间产物
  job_insight jsonb,
  resume_insight jsonb,
  report_json jsonb,

  -- 岗位管理字段
  status text DEFAULT '分析完成',
  company_name text,
  job_title text,
  job_url text,
  applied_at timestamptz,
  interview_round text,
  interview_date timestamptz,
  note text,
  status_history jsonb DEFAULT '[]'::jsonb,
  is_archived boolean DEFAULT false,

  -- 代理分享字段
  is_proxy boolean DEFAULT false,
  proxy_recipient_name text,
  proxy_recipient_phone text,
  share_token text UNIQUE,

  -- 缓存标记
  cache_hit boolean DEFAULT false,
  cache_jd_id uuid REFERENCES public.jd_cache(id),

  -- 面试题扩展包
  extra_questions_count int DEFAULT 0,
  extra_questions_used int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX idx_analyses_status ON public.analyses(status);
CREATE INDEX idx_analyses_company ON public.analyses(company_name);
CREATE INDEX idx_analyses_applied_at ON public.analyses(applied_at);
CREATE INDEX idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX idx_analyses_share_token ON public.analyses(share_token);

-- =============================================
-- 5. 消费流水表
-- =============================================
CREATE TABLE public.credit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  type text CHECK (type IN ('purchase', 'use', 'refund', 'admin_add', 'gift_out', 'gift_in')),
  amount int NOT NULL,
  balance_after int,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 6. 主订单表（分析次数购买）
-- =============================================
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  package_id text,
  credits int,
  amount decimal(10,2),
  trade_order_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 7. 面试题扩展包订单表
-- =============================================
CREATE TABLE public.extra_question_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  analysis_id uuid REFERENCES public.analyses(id) NOT NULL,
  question_count int DEFAULT 5,
  amount decimal(10,2),
  trade_order_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 8. 转赠记录表
-- =============================================
CREATE TABLE public.credit_gifts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id uuid REFERENCES public.profiles(id) NOT NULL,
  to_user_id uuid REFERENCES public.profiles(id) NOT NULL,
  credits int NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

-- =============================================
-- 9. 用户配置表（限流 + 风控）
-- =============================================
CREATE TABLE public.user_config (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  rate_limit_reset timestamptz DEFAULT now(),
  request_count int DEFAULT 0,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  credits_frozen int DEFAULT 0,
  credits_gifted int DEFAULT 0,
  credits_refunded int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 10. 触发器：新用户自动创建 profiles 和初始次数
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, wechat_openid)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'wechat_openid'
  );

  INSERT INTO public.user_credits (user_id, remaining_analyses)
  VALUES (new.id, 1);

  INSERT INTO public.user_config (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 11. 自动更新 updated_at 触发器
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jd_cache_updated_at
  BEFORE UPDATE ON public.jd_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 12. RLS 策略
-- =============================================

-- 启用所有表的 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_question_orders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 支付系统扩展字段（通用，不绑定具体渠道）
-- =============================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS callback_raw jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id ON public.orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON public.orders(payment_provider);
ALTER TABLE public.credit_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;

-- profiles: 用户可读写自己的资料
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- user_credits: 用户只读自己的次数
CREATE POLICY "Users can read own credits"
ON public.user_credits FOR SELECT
USING (user_id = auth.uid());

-- analyses: 允许通过 share_token 公开读取（分享页）
CREATE POLICY "Allow public access via share_token"
ON public.analyses FOR SELECT
USING (is_proxy = true);

-- analyses: 用户读写自己的分析记录
CREATE POLICY "Users can read own analyses"
ON public.analyses FOR SELECT
USING (user_id = auth.uid() OR is_proxy = true);

CREATE POLICY "Users can insert own analyses"
ON public.analyses FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own analyses"
ON public.analyses FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own analyses"
ON public.analyses FOR DELETE
USING (user_id = auth.uid());

-- credit_transactions: 用户只读自己的流水
CREATE POLICY "Users can read own transactions"
ON public.credit_transactions FOR SELECT
USING (user_id = auth.uid());

-- orders: 用户只读自己的订单
CREATE POLICY "Users can read own orders"
ON public.orders FOR SELECT
USING (user_id = auth.uid());

-- extra_question_orders: 用户只读自己的扩展包订单
CREATE POLICY "Users can read own extra orders"
ON public.extra_question_orders FOR SELECT
USING (user_id = auth.uid());

-- credit_gifts: 用户可读与自己相关的转赠记录
CREATE POLICY "Users can read own gifts"
ON public.credit_gifts FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- user_config: 用户只读自己的配置
CREATE POLICY "Users can read own config"
ON public.user_config FOR SELECT
USING (user_id = auth.uid());
