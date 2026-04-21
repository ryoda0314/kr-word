'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const schema = z.object({
  display_name: z.string().min(1).max(50).nullable(),
  daily_goal: z.number().int().min(1).max(500),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: 'UNAUTHENTICATED' | 'INVALID' | 'DB_FAILED' };

export async function updateProfile(
  input: z.input<typeof schema>,
): Promise<UpdateProfileResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const { display_name, daily_goal } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name,
      daily_goal,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('updateProfile failed:', error);
    return { ok: false, error: 'DB_FAILED' };
  }

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}
