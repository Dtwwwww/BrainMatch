export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { handleAppError } from '@/lib/api/error-handler';
import { runAnalysisPipeline } from '@/lib/agents/orchestrator';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/protected/analyze/proxy
 * 帮朋友分析 — 扣次数 + 生成 share_token + 启动流水线
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { jdText, resumeText, friendName, friendPhone } = await req.json();

    if (!jdText || !resumeText) {
      return Response.json({ error: 'JD 和简历不能为空' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 检查次数
    const { data: credits } = await supabase
      .from('user_credits')
      .select('remaining_analyses')
      .eq('user_id', user.id)
      .single();

    if (!credits || credits.remaining_analyses < 1) {
      return Response.json({ error: '次数不足' }, { status: 402 });
    }

    // 扣次数
    await supabase
      .from('user_credits')
      .update({ remaining_analyses: credits.remaining_analyses - 1, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .gt('remaining_analyses', 0);

    // 生成 share_token
    const token = crypto.randomBytes(16).toString('hex');

    // 创建分析记录（is_proxy=true）
    const { data: analysis, error: createError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        jd_text: jdText,
        resume_text: resumeText,
        is_proxy: true,
        proxy_recipient_name: friendName || null,
        proxy_recipient_phone: friendPhone || null,
        share_token: token,
        status: '分析完成',
      })
      .select()
      .single();

    if (createError || !analysis) {
      // 返还次数
      await supabase
        .from('user_credits')
        .update({ remaining_analyses: credits.remaining_analyses, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      return Response.json({ error: '创建失败' }, { status: 500 });
    }

    // 记录流水
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      type: 'use',
      amount: -1,
      balance_after: credits.remaining_analyses - 1,
      meta: { action: 'proxy_analyze', friend: friendName || friendPhone },
    });

    // 异步启动流水线
    runAnalysisPipeline(analysis.id, jdText, resumeText).catch((e) =>
      console.error(`[${analysis.id}] Proxy pipeline error:`, e)
    );

    const shareUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/share/${token}`;

    return Response.json({
      success: true,
      analysisId: analysis.id,
      shareToken: token,
      shareUrl,
    });
  } catch (error) {
    return handleAppError(error);
  }
}
