import OpenAI from 'openai';

/**
 * JD 截图 OCR 识别
 *
 * 将图片文件转为 base64 → 调用百炼 qwen-vl-ocr → 返回提取文本
 * 支持 PNG、JPG、WEBP 格式，最大 5MB
 */
export async function ocrJdImage(file: File): Promise<string> {
  // 校验格式
  const fileName = file.name.toLowerCase();
  const allowedTypes = ['.png', '.jpg', '.jpeg', '.webp'];
  const isAllowed = allowedTypes.some((ext) => fileName.endsWith(ext));
  if (!isAllowed) {
    throw new Error('仅支持 PNG、JPG、WEBP 格式');
  }

  // 校验大小
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error('图片大小不能超过 5MB');
  }

  // 读取文件为 base64
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // 调用百炼 Qwen-VL-OCR
  const baseURL =
    process.env.DASHSCOPE_BASE_URL ||
    'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL,
  });

  const response = await client.chat.completions.create({
    model: 'qwen-vl-ocr',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
          {
            type: 'text',
            text: '请提取这张截图中的所有文字内容，保持原有的层级结构和格式。只输出提取的文字，不要添加任何解释。',
          },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0.1,
  });

  const extractedText = response.choices[0]?.message?.content?.trim() || '';

  if (!extractedText || extractedText.length < 10) {
    throw new Error(
      '未能从图片中识别到有效文字，请确认图片包含清晰的文字内容'
    );
  }

  return extractedText;
}
