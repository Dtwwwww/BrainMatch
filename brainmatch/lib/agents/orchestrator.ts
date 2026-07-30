import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCachedJobInsight, cacheJobInsight } from '@/lib/cache/jd-cache';
import { callLLMWithFallback } from '@/lib/ai/model-router';
import { safeJsonParse } from '@/lib/utils/json-safe-parse';
import {
  JOB_PARSER_SYSTEM_PROMPT,
} from '@/lib/ai/prompts/job-parser';
import { RESUME_PARSER_SYSTEM_PROMPT } from '@/lib/ai/prompts/resume-parser';
import { MATCH_ANALYZER_SYSTEM_PROMPT } from '@/lib/ai/prompts/match-analyzer';
import { INTERVIEW_GENERATOR_SYSTEM_PROMPT, INTERVIEW_EXTRA_GENERATOR_SYSTEM_PROMPT } from '@/lib/ai/prompts/interview-generator';
import { AGENT_CONFIG } from '@/lib/ai/config';
import type {
  JobInsight,
  ResumeInsight,
  ReportJSON,
} from '@/lib/types';

/**
 * 调用单个 Agent 并安全解析 JSON
 */
async function callAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  agentKey: string
): Promise<T> {
  const config = AGENT_CONFIG[agentKey] || { maxTokens: 1500, temperature: 0.2, timeout: 15000 };
  const response = await callLLMWithFallback(systemPrompt, userPrompt, {
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    timeout: config.timeout,
  });
  return safeJsonParse<T>(response);
}

/**
 * 执行完整分析流水线
 *
 * Phase 1: JD 缓存检查 → 命中跳过 Agent 1
 * Phase 2: 简历解析（与 Phase 1 并行设计，MVP 串行）
 * Phase 3: 匹配分析
 * Phase 4: 面试题生成
 *
 * 错误时返还次数
 */
export async function runAnalysisPipeline(
  analysisId: string,
  jdText: string,
  resumeText: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  try {
    // ==========================================
    // Phase 1: 岗位解析（含缓存检查）
    // ==========================================
    let jobInsight: JobInsight;
    let cacheHit = false;

    const cached = await getCachedJobInsight(jdText);
    if (cached) {
      jobInsight = cached;
      cacheHit = true;
      console.log(`[${analysisId}] Cache hit for JD`);
    } else {
      jobInsight = await callAgent<JobInsight>(
        JOB_PARSER_SYSTEM_PROMPT,
        jdText,
        'job_parser'
      );
      // 异步写缓存（不阻塞流水线）
      cacheJobInsight(jdText, jobInsight).catch((e) =>
        console.warn('Cache write failed:', e)
      );
    }

    // 更新数据库：job_insight
    await supabase
      .from('analyses')
      .update({
        job_insight: jobInsight,
        cache_hit: cacheHit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    console.log(`[${analysisId}] Phase 1 complete (cache: ${cacheHit})`);

    // ==========================================
    // Phase 2: 简历解析
    // ==========================================
    const resumeInsight = await callAgent<ResumeInsight>(
      RESUME_PARSER_SYSTEM_PROMPT,
      resumeText,
      'resume_parser'
    );

    await supabase
      .from('analyses')
      .update({
        resume_insight: resumeInsight,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    console.log(`[${analysisId}] Phase 2 complete`);

    // ==========================================
    // Phase 3: 匹配分析
    // ==========================================
    const matchPrompt = `job_insight:\n${JSON.stringify(jobInsight, null, 2)}\n\nresume_insight:\n${JSON.stringify(resumeInsight, null, 2)}`;

    const reportJSON = await callAgent<ReportJSON>(
      MATCH_ANALYZER_SYSTEM_PROMPT,
      matchPrompt,
      'match_analyzer'
    );

    await supabase
      .from('analyses')
      .update({
        report_json: reportJSON,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    console.log(`[${analysisId}] Phase 3 complete — Grade: ${reportJSON.sabc_rating.grade}`);

    // ==========================================
    // Phase 4: 面试题生成（免费题 + 预生成扩展题）
    // ==========================================
    const interviewPrompt = `job_insight:\n${JSON.stringify(jobInsight, null, 2)}\n\nresume_insight:\n${JSON.stringify(resumeInsight, null, 2)}\n\nmatch_report:\n${JSON.stringify(reportJSON, null, 2)}`;

    // 4a: 生成免费6道题
    const interviewQuestions = await callAgent<{
      free: ReportJSON['interview_questions']['free'];
    }>(
      INTERVIEW_GENERATOR_SYSTEM_PROMPT,
      interviewPrompt,
      'interview_generator'
    );

    // 4b: 预生成付费扩展题（4道：BEI×2 + 行业趋势×1 + 压力面试×1）
    // 第5道"自定义弱项题"由用户支付后选择弱项方向时按需生成
    let extraQuestions: ReportJSON['interview_questions']['extra'] = [];
    try {
      const extraResult = await callAgent<{
        extra: ReportJSON['interview_questions']['extra'];
      }>(
        INTERVIEW_EXTRA_GENERATOR_SYSTEM_PROMPT,
        interviewPrompt,
        'interview_extra_generator'
      );
      extraQuestions = extraResult.extra || [];
      console.log(`[${analysisId}] Phase 4b — Extra questions pre-generated: ${extraQuestions.length}`);
    } catch (extraError: any) {
      console.warn(`[${analysisId}] Extra question generation failed (non-blocking):`, extraError.message);
      // 非阻塞——免费题正常返回，扩展题为空
    }

    // 合并面试题到 report_json
    const updatedReport: ReportJSON = {
      ...reportJSON,
      interview_questions: {
        free: interviewQuestions.free || [],
        extra: extraQuestions,
      },
    };

    await supabase
      .from('analyses')
      .update({
        report_json: updatedReport,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    console.log(`[${analysisId}] Phase 4 complete — Pipeline finished`);

  } catch (error: any) {
    console.error(`[${analysisId}] Pipeline error:`, error.message);

    // 返还次数
    try {
      const { data: analysis } = await supabase
        .from('analyses')
        .select('user_id')
        .eq('id', analysisId)
        .single();

      if (analysis) {
        // 获取当前次数
        const { data: credits } = await supabase
          .from('user_credits')
          .select('remaining_analyses')
          .eq('user_id', analysis.user_id)
          .single();

        if (credits !== null) {
          await supabase
            .from('user_credits')
            .update({
              remaining_analyses: (credits?.remaining_analyses || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', analysis.user_id);

          // 记录退款流水
          await supabase.from('credit_transactions').insert({
            user_id: analysis.user_id,
            type: 'refund',
            amount: 1,
            balance_after: (credits?.remaining_analyses || 0) + 1,
            meta: { reason: 'pipeline_error', analysisId },
          });

          console.log(`[${analysisId}] Credit refunded to user ${analysis.user_id}`);
        }
      }
    } catch (refundError) {
      console.error(`[${analysisId}] Failed to refund credit:`, refundError);
    }

    // 更新分析记录错误状态
    await supabase
      .from('analyses')
      .update({
        updated_at: new Date().toISOString(),
        status: '分析失败',
        report_json: { error: error.message },
      })
      .eq('id', analysisId);
  }
}
