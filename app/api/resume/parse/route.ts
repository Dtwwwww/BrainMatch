export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { handleAppError } from '@/lib/api/error-handler';
import { parseResumeFile } from '@/lib/ocr/resume-parse';

export const dynamic = 'force-dynamic';

/**
 * POST /api/resume/parse
 * 简历解析：支持 PDF/TXT 文件上传和纯文本
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return Response.json({ error: '请上传文件' }, { status: 400 });
      }

      const text = await parseResumeFile(file);

      return Response.json({
        success: true,
        text,
        fileName: file.name,
      });
    }

    // 纯文本 JSON
    const { text } = await req.json();
    if (!text || text.length < 20) {
      return Response.json({ error: '简历内容过短' }, { status: 400 });
    }
    return Response.json({ success: true, text });
  } catch (error: any) {
    if (error instanceof Error && error.message) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return handleAppError(error);
  }
}
