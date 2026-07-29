
import { NextResponse } from 'next/server';
import { handleAppError } from '@/lib/api/error-handler';
import { ocrJdImage } from '@/lib/ocr/jd-ocr';

export const dynamic = 'force-dynamic';

/**
 * POST /api/jd/ocr
 * JD 截图识别：上传图片 → 百炼 qwen-vl-ocr → 返回文本
 * 支持 PNG、JPG、WEBP 格式，最大 5MB
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: '请上传图片文件' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: '请选择文件' }, { status: 400 });
    }

    const extractedText = await ocrJdImage(file);

    return Response.json({
      success: true,
      text: extractedText,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error('Qwen OCR error:', error?.message, error?.status, error?.response?.status);
    // 如果 Key 未配置，给出明确提示
    if (error?.status === 401 || error?.response?.status === 401) {
      return Response.json(
        { error: 'OCR 服务密钥未配置，请联系管理员' },
        { status: 500 }
      );
    }
    // lib 函数抛出的友好错误直接返回
    if (error instanceof Error && error.message) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return handleAppError(error);
  }
}
