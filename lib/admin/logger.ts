import { createClient } from '@supabase/supabase-js';

interface LogAdminActionParams {
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  adminKey: string;
  ipAddress?: string;
}

/**
 * 记录管理员操作日志
 */
export async function logAdminAction(
  params: LogAdminActionParams
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('admin_logs').insert({
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId || null,
      details: params.details || {},
      admin_key_hint: params.adminKey.slice(0, 4) + '****',
      ip_address: params.ipAddress || null,
    });
  } catch (err) {
    console.warn('[AdminLog] Failed to log action:', err);
  }
}
