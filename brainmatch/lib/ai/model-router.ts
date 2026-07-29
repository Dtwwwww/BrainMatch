import OpenAI from 'openai';
import {
  FORBIDDEN_MODELS,
  PRIMARY_MODEL,
  FALLBACK_MODEL,
} from '@/lib/ai/config';

interface CallModelOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

/**
 * 调用单个模型（支持 OpenAI 和 DeepSeek）
 */
async function callModel(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: CallModelOptions & { signal?: AbortSignal }
): Promise<string> {
  const { maxTokens = 1500, temperature = 0.2, signal } = options;

  // DeepSeek 模型使用其兼容端点
  if (model === 'deepseek-chat') {
    const deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    });

    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }, {
      signal,
    });

    return response.choices[0].message.content || '';
  }

  // OpenAI 模型
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openaiClient.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
  }, {
    signal,
  });

  return response.choices[0].message.content || '';
}

/**
 * 带降级的 LLM 调用
 *
 * 策略：
 * 1. 检查主模型是否在禁止列表中
 * 2. 尝试主模型 → 失败则使用降级模型
 */
export async function callLLMWithFallback(
  systemPrompt: string,
  userPrompt: string,
  options: CallModelOptions = {}
): Promise<string> {
  const { timeout = 15000 } = options;

  // 检查是否使用了禁止的模型
  if (FORBIDDEN_MODELS.some((m) => PRIMARY_MODEL.includes(m))) {
    console.warn(
      `FORBIDDEN_MODELS includes ${PRIMARY_MODEL}, switching to deepseek-chat`
    );
    return callModel('deepseek-chat', systemPrompt, userPrompt, options);
  }

  // 尝试主模型
  try {
    const controller = new AbortController();
    const result = await withTimeout(
      callModel(PRIMARY_MODEL, systemPrompt, userPrompt, { ...options, signal: controller.signal }),
      timeout,
      controller
    );
    return result;
  } catch (error: any) {
    console.warn(
      `Primary model (${PRIMARY_MODEL}) failed: ${error.message}`
    );
    // 有降级模型时尝试降级
    if (FALLBACK_MODEL) {
      try {
        const fallbackController = new AbortController();
        return await withTimeout(
          callModel(FALLBACK_MODEL, systemPrompt, userPrompt, { ...options, signal: fallbackController.signal }),
          timeout,
          fallbackController
        );
      } catch (fallbackError: any) {
        throw new Error(
          `All models failed. Primary: ${error.message}, Fallback: ${fallbackError.message}`
        );
      }
    }
    throw error;
  }
}

/**
 * 给 Promise 加超时限制，超时后自动 abort 底层 HTTP 连接
 */
function withTimeout<T>(promise: Promise<T>, ms: number, controller?: AbortController): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        controller?.abort();
        reject(new Error(`Request timeout after ${ms}ms`));
      }, ms)
    ),
  ]);
}
