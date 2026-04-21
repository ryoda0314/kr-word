import { createSupabaseServiceClient } from '@/lib/supabase/service';

/** Per-minute rate limit counter, stored in public.rate_limits. */
export async function checkAndBumpRate(
  userId: string,
  action: string,
  maxPerMinute: number,
): Promise<boolean> {
  const service = createSupabaseServiceClient();
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);
  const iso = windowStart.toISOString();

  const { data: existing } = await service
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action', action)
    .eq('window_start', iso)
    .maybeSingle();

  if (existing && existing.count >= maxPerMinute) return false;

  if (existing) {
    await service
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('user_id', userId)
      .eq('action', action)
      .eq('window_start', iso);
  } else {
    await service.from('rate_limits').insert({
      user_id: userId,
      action,
      window_start: iso,
      count: 1,
    });
  }
  return true;
}
