'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { PARTS_OF_SPEECH, WORD_TYPES } from '@/lib/ai/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  id: z.string().uuid(),
  lemma: z.string().min(1).max(100),
  hanja: z.string().max(100).nullable(),
  part_of_speech: z.enum(PARTS_OF_SPEECH),
  word_type: z.enum(WORD_TYPES),
  meaning_ja: z.string().min(1).max(200),
  daily_usage_score: z.number().int().min(0).max(100),
  topik_level: z.number().int().min(1).max(6).nullable(),
  example_topik: z.string().max(300).nullable(),
  example_topik_ja: z.string().max(300).nullable(),
  example_daily: z.string().max(300).nullable(),
  example_daily_ja: z.string().max(300).nullable(),
  notes: z.string().max(300).nullable(),
});

export type UpdateWordResult =
  | { ok: true }
  | { ok: false; error: 'UNAUTHENTICATED' | 'INVALID' | 'DUPLICATE' | 'DB_FAILED' };

export async function updateWord(
  input: z.input<typeof updateSchema>,
): Promise<UpdateWordResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const { id, ...patch } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { error } = await supabase
    .from('user_words')
    .update({
      ...patch,
      lemma: patch.lemma.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'DUPLICATE' };
    console.error('updateWord failed:', error);
    return { ok: false, error: 'DB_FAILED' };
  }

  revalidatePath('/words');
  revalidatePath(`/words/${id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export type DeleteWordResult =
  | { ok: true }
  | { ok: false; error: 'UNAUTHENTICATED' | 'INVALID' | 'DB_FAILED' };

export async function deleteWord(
  input: z.input<typeof deleteSchema>,
): Promise<DeleteWordResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { error } = await supabase
    .from('user_words')
    .delete()
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('deleteWord failed:', error);
    return { ok: false, error: 'DB_FAILED' };
  }

  revalidatePath('/words');
  revalidatePath('/dashboard');
  return { ok: true };
}
