export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { handleAppError } from '@/lib/api/error-handler';
import { callLLMWithFallback } from '@/lib/ai/model-router';
import { safeJsonParse } from '@/lib/utils/json-safe-parse';
import { INTERVIEW_WEAKNESS_GENERATOR_SYSTEM_PROMPT } from '@/lib/ai/prompts/interview-generator';
import type { ReportJSON, WeaknessArea } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/protected/interview/extra?analysisId=xxx
 * 获取扩展面试题（已购买后）
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const analysisId = searchParams.get('analysisId');

    if (!analysisId) {
      return Response.json({ error: '缺少 analysisId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: analysis } = await supabase
      .from('analyses')
      .select('id, user_id, report_json, extra_questions_count, extra_questions_used')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (!analysis) {
      return Response.json({ error: '分析记录不存在' }, { status: 404 });
    }

    const hasPurchased = analysis.extra_questions_count > (analysis.extra_questions_used || 0);
    if (!hasPurchased) {
      return Response.json({ error: '未购买扩展包' }, { status: 402 });
    }

    const report = analysis.report_json as ReportJSON | null;
    const extra = report?.interview_questions?.extra || [];

    return Response.json({ extra, totalExtra: extra.length });
  } catch (error) {
    return handleAppError(error);
  }
}

/**
 * POST /api/protected/interview/extra
 * 购买面试题扩展包 + 生成第5道自定义弱项题
 *
 * Body: { analysisId, weaknessAreas: WeaknessArea[] }
 * - weaknessAreas: 用户选择的弱项方向（1-3个），用于生成弱项题
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { analysisId, weaknessAreas } = await req.json();

    if (!analysisId) {
      return Response.json({ error: '缺少 analysisId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 检查归属
    const { data: analysis } = await supabase
      .from('analyses')
      .select('id, user_id, report_json, jd_text, resume_text, extra_questions_count, extra_questions_used')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (!analysis) {
      return Response.json({ error: '分析记录不存在' }, { status: 404 });
    }

    if (analysis.extra_questions_count > (analysis.extra_questions_used || 0)) {
      // 已购买，直接返回已有扩展题（可能含弱项题）
      const report = analysis.report_json as ReportJSON | null;
      const existingExtra = report?.interview_questions?.extra || [];
      return Response.json({
        success: true,
        message: '已购买过扩展包',
        extra: existingExtra,
        totalExtra: existingExtra.length,
      });
    }

    const report = analysis.report_json as ReportJSON | null;

    // 已有的4道预生成扩展题
    const existingExtra: ReportJSON['interview_questions']['extra'] =
      report?.interview_questions?.extra || [];

    // 生成第5道自定义弱项题
    let weaknessQuestion = null;
    if (weaknessAreas && weaknessAreas.length > 0) {
      try {
        const weaknessPrompt = buildWeaknessPrompt(
          report as any,
          weaknessAreas as WeaknessArea[]
        );

        weaknessQuestion = await callLLMWithFallback(
          INTERVIEW_WEAKNESS_GENERATOR_SYSTEM_PROMPT,
          weaknessPrompt,
          {
            maxTokens: 2000,
            temperature: 0.5,
            timeout: 45000,
          }
        ).then((raw) => safeJsonParse<any>(raw));

        console.log(`[${analysisId}] Weakness question generated for areas: ${weaknessAreas.join(', ')}`);
      } catch (weaknessError: any) {
        console.warn(`[${analysisId}] Weakness question generation failed:`, weaknessError.message);
        // 非阻塞，5道变4道也可以接受
      }
    } else {
      console.log(`[${analysisId}] No weakness areas selected, generating default weakness question`);
      // 用户未选择弱项方向时，自动生成一道基于最大差距的弱项题
      try {
        const defaultWeakness = extractDefaultWeakness(report as any);
        const weaknessPrompt = buildWeaknessPrompt(
          report as any,
          [defaultWeakness]
        );

        weaknessQuestion = await callLLMWithFallback(
          INTERVIEW_WEAKNESS_GENERATOR_SYSTEM_PROMPT,
          weaknessPrompt,
          {
            maxTokens: 2000,
            temperature: 0.5,
            timeout: 45000,
          }
        ).then((raw) => safeJsonParse<any>(raw));
      } catch (weaknessError: any) {
        console.warn(`[${analysisId}] Default weakness question generation failed:`, weaknessError.message);
      }
    }

    // 合并扩展题：已有的4道 + 新生成的弱项题
    const fullExtra = [...existingExtra];
    if (weaknessQuestion) {
      fullExtra.push(weaknessQuestion);
    }

    // 更新 report_json 中的 extra 字段
    const updatedReport: ReportJSON = {
      ...(report as ReportJSON),
      interview_questions: {
        free: report?.interview_questions?.free || [],
        extra: fullExtra,
      },
    };

    // 更新数据库
    await supabase
      .from('analyses')
      .update({
        report_json: updatedReport,
        extra_questions_count: (analysis.extra_questions_count || 0) + 5,
        extra_questions_used: fullExtra.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    return Response.json({
      success: true,
      message: `面试题扩展包已解锁（${fullExtra.length} 道）`,
      extra: fullExtra,
      totalExtra: fullExtra.length,
    });
  } catch (error) {
    return handleAppError(error);
  }
}

/**
 * 构建弱项题生成的 user prompt
 */
function buildWeaknessPrompt(
  report: ReportJSON | null,
  weaknesses: WeaknessArea[]
): string {
  const parts: string[] = [];

  if (report) {
    // 提取关键上下文
    const jobTitle = (report as any)?.job_insight?.job_title || '';
    const candidateName = (report as any)?.resume_insight?.candidate_name || '';
    const gaps = report.gap_analysis?.map(g => g.gap).join('、') || '';
    const jobFit = report.job_fit_portrait || '';

    parts.push(`候选人的岗位匹配概况：${jobFit}`);
    if (gaps) parts.push(`已识别的差距：${gaps}`);
  }

  parts.push(`候选人自选的弱项方向：${weaknesses.join('、')}`);
  parts.push('请基于以上弱项方向生成一道面试官可能问到的针对性题目。');

  return parts.join('\n\n');
}

/**
 * 从报告的 gap_analysis 中自动提取最大的差距作为默认弱项
 */
function extractDefaultWeakness(report: ReportJSON | null): WeaknessArea {
  if (report?.gap_analysis && report.gap_analysis.length > 0) {
    const firstGap = report.gap_analysis[0].gap;
    // 尝试映射到 WeaknessArea
    const mapping: Record<string, WeaknessArea> = {
      '管理': '管理经验不足',
      '跳槽': '频繁跳槽',
      '技术': '技术栈不匹配',
      '学历': '学历偏低',
      '年龄': '年龄偏大/偏小',
      '空窗': '空窗期过长',
      '转行': '跨行业转行',
      '英语': '英语能力不足',
    };
    for (const [key, value] of Object.entries(mapping)) {
      if (firstGap.includes(key)) return value;
    }
  }
  return '技术栈不匹配'; // fallback
}
