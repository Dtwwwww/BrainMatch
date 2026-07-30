
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { runAnalysisPipeline } from '@/lib/agents/orchestrator';
import { handleAppError } from '@/lib/api/error-handler';
import { ocrJdImage } from '@/lib/ocr/jd-ocr';
import { parseResumeFile } from '@/lib/ocr/resume-parse';

/**
 * POST /api/protected/analyze
 * 分析入口：鉴权 → 校验 → OCR（按需） → 扣次 → 创建记录 → 启动流水线
 *
 * 支持两种 Content-Type：
 * - application/json：纯文本提交（原有流程）
 * - multipart/form-data：含文件上传，后端按需 OCR 后再扣次
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    // 检查用户是否被封禁
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userConfig } = await supabase
      .from('user_config')
      .select('is_flagged, flag_reason')
      .eq('user_id', user.id)
      .single();

    if (userConfig?.is_flagged) {
      return Response.json(
        { error: '账号已被限制，请联系管理员', code: 'account_banned' },
        { status: 403 }
      );
    }

    const contentType = req.headers.get('content-type') || '';

    let jdText: string;
    let resumeText: string;
    let companyName: string | null = null;
    let jobTitle: string | null = null;

    // ==========================================
    // 分支 1：文件上传（multipart/form-data）
    // ==========================================
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const jdFile = formData.get('jdFile') as File | null;
      const resumeFile = formData.get('resumeFile') as File | null;
      const jdTextRaw = formData.get('jdText');
      const resumeTextRaw = formData.get('resumeText');
      const companyRaw = formData.get('companyName');
      const titleRaw = formData.get('jobTitle');

      // 按需 OCR：有文件就识别，没有就用文本
      if (jdFile) {
        try {
          jdText = await ocrJdImage(jdFile);
        } catch (ocrErr: any) {
          return Response.json(
            { error: ocrErr.message || 'JD 截图识别失败，请重试或手动粘贴文本', code: 'ocr_failed' },
            { status: 400 }
          );
        }
      } else if (jdTextRaw && typeof jdTextRaw === 'string' && jdTextRaw.trim().length >= 20) {
        jdText = jdTextRaw.trim();
      } else {
        return Response.json(
          { error: '请上传 JD 截图或填写 JD 文本（至少20字符）', code: 'missing_params' },
          { status: 400 }
        );
      }

      if (resumeFile) {
        try {
          resumeText = await parseResumeFile(resumeFile);
        } catch (parseErr: any) {
          return Response.json(
            { error: parseErr.message || '简历解析失败，请重试或手动粘贴文本', code: 'parse_failed' },
            { status: 400 }
          );
        }
      } else if (resumeTextRaw && typeof resumeTextRaw === 'string' && resumeTextRaw.trim().length >= 20) {
        resumeText = resumeTextRaw.trim();
      } else {
        return Response.json(
          { error: '请上传简历文件或填写简历文本（至少20字符）', code: 'missing_params' },
          { status: 400 }
        );
      }

      if (companyRaw && typeof companyRaw === 'string') companyName = companyRaw.trim() || null;
      if (titleRaw && typeof titleRaw === 'string') jobTitle = titleRaw.trim() || null;
    }
    // ==========================================
    // 分支 2：纯文本（application/json）— 原有流程
    // ==========================================
    else {
      const body = await req.json();
      jdText = body.jdText;
      resumeText = body.resumeText;
      companyName = body.companyName || null;
      jobTitle = body.jobTitle || null;

      if (!jdText || !resumeText) {
        return Response.json(
          { error: 'JD 和简历不能为空', code: 'missing_params' },
          { status: 400 }
        );
      }

      if (jdText.length < 20) {
        return Response.json(
          { error: 'JD 文本过短（至少20字符）', code: 'invalid_params' },
          { status: 400 }
        );
      }

      if (resumeText.length < 20) {
        return Response.json(
          { error: '简历文本过短（至少20字符）', code: 'invalid_params' },
          { status: 400 }
        );
      }
    }

    // ==========================================
    // 共同流程：扣次 → 创建记录 → 启动流水线
    // ==========================================

    // 检查剩余次数
    const { data: credits } = await supabase
      .from('user_credits')
      .select('remaining_analyses')
      .eq('user_id', user.id)
      .single();

    if (!credits || credits.remaining_analyses < 1) {
      return Response.json(
        { error: '次数不足，请购买分析次数', code: 'insufficient_credits' },
        { status: 402 }
      );
    }

    // 原子扣减次数
    const { error: deductError } = await supabase
      .from('user_credits')
      .update({
        remaining_analyses: credits.remaining_analyses - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .gt('remaining_analyses', 0);

    if (deductError) {
      return Response.json(
        { error: '次数扣减失败', code: 'deduct_failed' },
        { status: 500 }
      );
    }

    // 记录消费流水
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'use',
        amount: -1,
        balance_after: credits.remaining_analyses - 1,
        meta: { action: 'analyze' },
      })
      .then(({ error }) => {
        if (error) console.warn('Transaction log:', error.message);
      });

    // 创建分析记录
    const { data: analysis, error: createError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        jd_text: jdText,
        resume_text: resumeText,
        company_name: companyName || null,
        job_title: jobTitle || null,
        status: '分析完成',
        status_history: [
          {
            from: null,
            to: '分析完成',
            changed_at: new Date().toISOString(),
            note: '首次分析完成',
          },
        ],
      })
      .select()
      .single();

    if (createError || !analysis) {
      // 返还次数
      await supabase
        .from('user_credits')
        .update({
          remaining_analyses: credits.remaining_analyses,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return Response.json(
        { error: '创建分析记录失败', code: 'create_failed' },
        { status: 500 }
      );
    }

    // 异步启动流水线
    runAnalysisPipeline(analysis.id, jdText, resumeText).catch((err) => {
      console.error(`[${analysis.id}] Pipeline failed:`, err.message);
    });

    return Response.json({
      analysisId: analysis.id,
      status: 'processing',
      message: '分析已开始',
    });
  } catch (error) {
    return handleAppError(error);
  }
}
