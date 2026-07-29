/**
 * Agent 配置 — Token 上限、温度、超时
 */
export const AGENT_CONFIG: Record<
  string,
  { maxTokens: number; temperature: number; timeout: number }
> = {
  job_parser: {
    maxTokens: 2000,
    temperature: 0.1,
    timeout: 30000,
  },
  resume_parser: {
    maxTokens: 2000,
    temperature: 0.1,
    timeout: 30000,
  },
  match_analyzer: {
    maxTokens: 8000,
    temperature: 0.2,
    timeout: 120000,
  },
  interview_generator: {
    maxTokens: 6000,
    temperature: 0.3,
    timeout: 120000,
  },
  interview_extra_generator: {
    maxTokens: 5000,
    temperature: 0.4,
    timeout: 120000,
  },
  interview_weakness_generator: {
    maxTokens: 2000,
    temperature: 0.5,
    timeout: 45000,
  },
};

/**
 * 禁止使用的旗舰模型 — 控制成本
 * 2026.07 更新：包含最新旗舰模型
 */
export const FORBIDDEN_MODELS = [
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-5',
  'claude-sonnet-5',
  'claude-opus-5',
  'claude-fable-5',
  'claude-3-5-sonnet',
  'claude-3-opus',
];

/**
 * 主模型和降级模型
 */
export const PRIMARY_MODEL = process.env.AI_PRIMARY_MODEL || 'deepseek-chat';
export const FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || '';
