export const runtime = 'edge';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { getUserId } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/analyze/status
 * SSE 端点 — 实时推送三阶段分析进度
 *
 * 事件类型：
 * - progress: { type: 'job_parser_done' | 'resume_parser_done' | 'match_analyzer_done' | 'completed' }
 * - complete: { analysisId }
 * - error: { message }
 *
 * 限制：90 秒超时，每 1.5 秒轮询数据库
 */
export async function GET(req: Request) {
  // 1. 鉴权
  let userId: string;
  try {
    userId = await getUserId();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const analysisId = searchParams.get('analysisId');

  if (!analysisId) {
    return new Response('Missing analysisId', { status: 400 });
  }

  // 2. 验证 analysisId 归属
  const supabase = await createSupabaseServerClient();
  const { data: ownerCheck } = await supabase
    .from('analyses')
    .select('user_id')
    .eq('id', analysisId)
    .single();

  if (!ownerCheck || ownerCheck.user_id !== userId) {
    return new Response('Forbidden', { status: 403 });
  }

  // 3. 创建 SSE Stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let lastSent = new Set<string>();
      let pollCount = 0;
      const MAX_POLLS = 60; // 90s / 1.5s = 60 polls

      const interval = setInterval(async () => {
        pollCount++;

        try {
          const { data } = await supabase
            .from('analyses')
            .select('job_insight, resume_insight, report_json')
            .eq('id', analysisId)
            .single();

          if (!data) {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ message: '分析记录不存在' })}\n\n`
              )
            );
            clearInterval(interval);
            controller.close();
            return;
          }

          // Phase 1: 岗位解析完成
          if (data.job_insight && !lastSent.has('job_parser_done')) {
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({ type: 'job_parser_done' })}\n\n`
              )
            );
            lastSent.add('job_parser_done');
          }

          // Phase 2: 简历解析完成
          if (data.resume_insight && !lastSent.has('resume_parser_done')) {
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({ type: 'resume_parser_done' })}\n\n`
              )
            );
            lastSent.add('resume_parser_done');
          }

          // Phase 3: 匹配分析完成（report_json 存在即可，不等 interview_questions）
          if (
            data.report_json &&
            !lastSent.has('match_analyzer_done')
          ) {
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({ type: 'match_analyzer_done' })}\n\n`
              )
            );
            lastSent.add('match_analyzer_done');
          }

          // Phase 4: 全部完成（interview_questions 已生成）
          if (
            data.report_json &&
            data.report_json.interview_questions &&
            data.report_json.interview_questions.free?.length > 0 &&
            !lastSent.has('completed')
          ) {
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({ type: 'completed', analysisId })}\n\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `event: complete\ndata: ${JSON.stringify({ analysisId })}\n\n`
              )
            );
            lastSent.add('completed');
            clearInterval(interval);
            controller.close();
            return;
          }

          // 超时处理
          if (pollCount >= MAX_POLLS) {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ message: '分析超时，请稍后刷新页面查看结果' })}\n\n`
              )
            );
            clearInterval(interval);
            controller.close();
          }
        } catch (err: any) {
          console.error('SSE poll error:', err.message);
        }
      }, 1500);

      // 客户端断开时清理
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
