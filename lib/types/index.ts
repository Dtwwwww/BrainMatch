// =============================================
// 状态类型定义
// =============================================
export type AnalysisStatus =
  | '分析完成'
  | '待投递'
  | '已投递'
  | '面试中'
  | '已拿Offer'
  | '已结束';

// =============================================
// 阶段一：岗位解析结果
// =============================================
export interface JobInsight {
  job_title: string;
  industry: string;
  iceberg_above: {
    knowledge: string[];
    skills: string[];
    experience: string[];
  };
  iceberg_below: {
    traits: IcebergItem[];
    competencies: IcebergItem[];
    motivations: IcebergItem[];
  };
  priorities: {
    core: string[];
    important: string[];
    bonus: string[];
  };
  summary: string;
}

/** 冰山下一个条目：包含值和推断依据 */
export interface IcebergItem {
  trait?: string;
  competency?: string;
  motivation?: string;
  clue: string;
}

// =============================================
// 阶段二：简历解析结果
// =============================================
export interface ResumeInsight {
  candidate_name: string;
  current_title: string;
  experience_years: number;
  education: {
    degree: string;
    school: string;
    major: string;
  };
  skill_tags: string[];
  career_trajectory: string[];
  achievements: AchievementItem[];
  gaps: SignalItem[];
  red_flags: SignalItem[];
  green_flags: SignalItem[];
  summary: string;
}

/** 结构化成就 */
export interface AchievementItem {
  context: string;
  action: string;
  impact: string;
}

/** 信号识别条目 */
export interface SignalItem {
  gap?: string;
  flag?: string;
  clue?: string;
  severity?: '低' | '中' | '高';
}

// =============================================
// 阶段三：完整匹配报告
// =============================================
export interface ReportJSON {
  overall_score: number;
  hard_score: number;
  soft_score: number;
  bonus_score: number;

  sabc_rating: {
    grade: 'S' | 'A' | 'B' | 'C';
    justification: {
      strengths_summary: string;
      weaknesses_summary: string;
      final_verdict: string;
    };
    resume_improvement_suggestions: string[];
    job_selection_advice: {
      recommended_roles: string[];
      avoid_roles: string[];
      reason: string;
    };
  };

  matching_details: Array<{
    requirement: string;
    level: '高度匹配' | '部分匹配' | '缺失';
    evidence: string;
    suggestion: string;
  }>;

  interview_questions: {
    free: InterviewQuestion[];
    extra: InterviewQuestion[];
  };

  /** v3 新增：评分逻辑说明（50-80字，解释三维分数如何综合得出最终评级） */
  scoring_rationale?: string;

  /** v2 新增：候选人适配画像（150-200字深度解读） */
  job_fit_portrait?: string;

  /** v2 新增：核心竞争力拆解 */
  core_advantages?: Array<{
    title: string;
    detail: string;
    signal: 'strong' | 'moderate' | 'edge';
  }>;

  /** v2 新增：差距分析与补救路径 */
  gap_analysis?: Array<{
    gap: string;
    severity: '关键' | '重要' | '次要';
    current_state: string;
    jd_expectation: string;
    remediation: {
      quick_win: string;
      '1_month': string;
      '3_month': string;
      signal_in_interview: string;
    };
  }>;

  /** v2 新增：面试竞争力预测 */
  interview_readiness?: {
    overall_assessment: string;
    strong_points_in_interview: string[];
    weak_points_in_interview: string[];
    recommended_prep_focus: string;
  };
}

export interface InterviewQuestion {
  question: string;
  type: 'common' | 'gap' | 'deep_dive' | 'gap_analysis' | 'culture_fit' | 'scenario' | 'bei_behavioral' | 'industry_insight' | 'stress_interview' | 'weakness_targeted';
  difficulty?: '简单' | '中等' | '较难' | '高难度';
  time_suggested?: number;
  intent?: string; // v1 兼容
  examiner_perspective?: {
    what_they_really_want: string;
    scoring_criteria: string[];
    red_flags_in_answer: string;
  };
  star_framework: {
    situation: string | { prompt: string; example: string };
    task: string | { prompt: string; example: string };
    action: string | { prompt: string; example: string };
    result: string | { prompt: string; example: string };
  };
  follow_up_chain?: string[];
  preparation_tip?: string;
}

/** 自定义弱项题的用户选择方向 */
export type WeaknessArea =
  | '管理经验不足'
  | '频繁跳槽'
  | '技术栈不匹配'
  | '学历偏低'
  | '年龄偏大/偏小'
  | '空窗期过长'
  | '跨行业转行'
  | '英语能力不足';

/** 自定义弱项题的生成请求 */
export interface WeaknessQuestionRequest {
  analysisId: string;
  weaknessAreas: WeaknessArea[];
}

// =============================================
// 分析记录（完整）
// =============================================
export interface AnalysisRecord {
  id: string;
  user_id: string;
  jd_text: string;
  resume_text: string;

  job_insight: JobInsight | null;
  resume_insight: ResumeInsight | null;
  report_json: ReportJSON | null;

  // 岗位管理字段
  status: AnalysisStatus;
  company_name: string | null;
  job_title: string | null;
  job_url: string | null;
  applied_at: string | null;
  interview_round: string | null;
  interview_date: string | null;
  note: string | null;
  status_history: StatusHistoryEntry[];
  is_archived: boolean;

  // 代理分享
  is_proxy: boolean;
  proxy_recipient_name: string | null;
  proxy_recipient_phone: string | null;
  share_token: string | null;

  // 缓存与扩展
  cache_hit: boolean;
  extra_questions_count: number;
  extra_questions_used: number;

  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  from: AnalysisStatus | null;
  to: AnalysisStatus;
  changed_at: string;
  note?: string;
}

// =============================================
// 统计概览
// =============================================
export interface StatsOverview {
  total: number;
  '分析完成': number;
  '待投递': number;
  '已投递': number;
  '面试中': number;
  '已拿Offer': number;
  '已结束': number;
}

// =============================================
// 用户信息（认证后获取）
// =============================================
export interface AuthenticatedUser {
  id: string;
  email?: string;
  profile: UserProfile | null;
  credits: UserCredits;
}

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  wechat_openid: string | null;
  wechat_unionid: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone_verified: boolean;
  wechat_verified: boolean;
  created_at: string;
}

export interface UserCredits {
  remaining_analyses: number;
  total_purchased: number;
}

// =============================================
// API 响应类型
// =============================================
export interface APIError {
  error: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================
// 支付相关
// =============================================
export interface CreateOrderParams {
  userId: string;
  packageId: string;
  credits: number;
  amount: number;
  description: string;
}

/** 创建订单的 API 响应 */
export interface CreateOrderResponse {
  paymentUrl: string;
  orderId: string;
  extra?: {
    qrcode?: string;         // 二维码图片 URL（PC 端展示）
    code_url?: string;       // 跳转链接（手机端用）
    provider_order_id?: string; // 支付渠道内部订单号
  };
}

export interface CallbackResult {
  orderId: string;
  tradeOrderId: string;
  status: 'paid' | 'pending' | 'failed';
  amount: number;
  rawData: any;
}

// =============================================
// SSE 进度事件
// =============================================
export type SSEProgressType =
  | 'job_parser_done'
  | 'resume_parser_done'
  | 'match_analyzer_done'
  | 'interview_generator_done'
  | 'completed'
  | 'error';

export interface SSEProgressEvent {
  type: SSEProgressType;
  analysisId?: string;
  message?: string;
}
