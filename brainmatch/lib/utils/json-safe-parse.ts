/**
 * 安全的 JSON 解析：处理 LLM 可能返回的 markdown 包裹或多余文本
 *
 * 策略（按顺序尝试）：
 * 1. 直接 JSON.parse
 * 2. 剥离 markdown ```json ... ``` 代码块
 * 3. 找到第一个 { 到最后一个 } 的内容
 */
export function safeJsonParse<T>(response: string): T {
  // 策略 1：直接解析
  try {
    return JSON.parse(response) as T;
  } catch {
    // 继续尝试
  }

  // 策略 2：提取 markdown JSON 代码块
  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]) as T;
    } catch {
      // 继续尝试
    }
  }

  // 策略 3：找到第一个 { 到最后一个 } 的内容
  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(response.slice(firstBrace, lastBrace + 1)) as T;
    } catch {
      // 继续尝试
    }
  }

  // 策略 4：尝试匹配数组
  const firstBracket = response.indexOf('[');
  const lastBracket = response.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    try {
      return JSON.parse(response.slice(firstBracket, lastBracket + 1)) as T;
    } catch {
      // 全部失败
    }
  }

  throw new Error(
    `Failed to parse JSON from response: ${response.slice(0, 200)}...`
  );
}
