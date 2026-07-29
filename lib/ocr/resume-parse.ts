import pdfParse from 'pdf-parse';
import { pdf } from 'pdf-to-img';
import OpenAI from 'openai';

/**
 * 简历文件解析
 *
 * 支持 PDF 和 TXT 格式。
 * PDF 解析策略（三级回退）：
 *   1. pdf-parse 直接提取文本（适用于文字型 PDF）
 *   2. 若提取为空 → pdf-to-img 渲染为图片 → 百炼 qwen-vl-ocr 识别
 *   3. 若仍失败 → 抛出错误
 *
 * @param file - 浏览器 File 对象
 * @returns 解析后的文本内容
 */
export async function parseResumeFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  // PDF 解析
  if (fileName.endsWith('.pdf')) {
    // ---- 策略1：pdf-parse 直接提取 ----
    try {
      const data = await pdfParse(buffer);
      const text = data.text?.trim() || '';

      if (text && text.length >= 20) {
        return text;
      }
    } catch {
      // pdf-parse 失败，继续尝试 OCR
      console.warn('pdf-parse failed, falling back to OCR');
    }

    // ---- 策略2：pdf-to-img + OCR ----
    try {
      const ocrText = await ocrPdfWithQwen(buffer);
      if (ocrText && ocrText.length >= 20) {
        return ocrText;
      }
    } catch (ocrErr: any) {
      console.error('PDF OCR fallback error:', ocrErr?.message);
    }

    // ---- 策略3：失败提示 ----
    throw new Error(
      '该 PDF 可能是扫描件或图片型简历，自动识别未能提取有效文字。请尝试将简历内容粘贴到文本框中。'
    );
  }

  // 纯文本文件
  if (fileName.endsWith('.txt')) {
    const text = buffer.toString('utf-8').trim();
    if (!text || text.length < 20) {
      throw new Error('文件内容过短，请确认文件包含完整的简历内容');
    }
    return text;
  }

  throw new Error('仅支持 PDF 和 TXT 格式');
}

/**
 * 用 pdf-to-img 渲染 PDF 页面 → 百炼 qwen-vl-ocr 识别
 * 最多处理前 5 页（简历通常 1-3 页）
 */
async function ocrPdfWithQwen(buffer: Buffer): Promise<string> {
  const MAX_PAGES = 5;

  const baseURL =
    process.env.DASHSCOPE_BASE_URL ||
    'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL,
  });

  const allText: string[] = [];

  const doc = await pdf(buffer, { scale: 2 });
  let pageIndex = 0;
  for await (const page of doc) {
    pageIndex++;
    if (pageIndex > MAX_PAGES) break;

    const base64 = page.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

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
              text: `请提取这张简历第${pageIndex}页中的所有文字内容，保持原有的层级结构和格式。只输出提取的文字，不要添加任何解释。`,
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const pageText = response.choices[0]?.message?.content?.trim() || '';
    if (pageText) {
      allText.push(pageText);
    }
  }

  return allText.join(`\n\n--- 第 ${pageIndex} 页 ---\n\n`);
}
