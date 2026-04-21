'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { PARTS_OF_SPEECH, WORD_TYPES } from '@/lib/ai/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const saveInputSchema = z.object({
  lemma: z.string().min(1).max(100),
  hanja: z.string().max(100).nullable(),
  part_of_speech: z.enum(PARTS_OF_SPEECH),
  word_type: z.enum(WORD_TYPES),
  meaning_ja: z.string().min(1).max(200),
  daily_usage_score: z.number().int().min(0).max(100),
  topik_level: z.number().int().min(1).max(6).nullable(),
  example_topik: z.string().max(300),
  example_topik_ja: z.string().max(300),
  example_daily: z.string().max(300),
  example_daily_ja: z.string().max(300),
  notes: z.string().max(300).nullable(),
  source_text: z.string().max(3000).nullable().optional(),
  context_sentence: z.string().max(400).nullable().optional(),
});

export type SaveWordResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | 'UNAUTHENTICATED'
        | 'INVALID'
        | 'DB_FAILED'
        | 'DUPLICATE';
    };

export async function saveWord(
  input: z.input<typeof saveInputSchema>,
): Promise<SaveWordResult> {
  const parsed = saveInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const data = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { data: row, error } = await supabase
    .from('user_words')
    .insert({
      user_id: user.id,
      lemma: data.lemma.trim(),
      hanja: data.hanja,
      part_of_speech: data.part_of_speech,
      word_type: data.word_type,
      meaning_ja: data.meaning_ja,
      daily_usage_score: data.daily_usage_score,
      topik_level: data.topik_level,
      example_topik: data.example_topik,
      example_topik_ja: data.example_topik_ja,
      example_daily: data.example_daily,
      example_daily_ja: data.example_daily_ja,
      notes: data.notes,
      source_text: data.source_text ?? null,
      context_sentence: data.context_sentence ?? null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'DUPLICATE' };
    console.error('saveWord failed:', error);
    return { ok: false, error: 'DB_FAILED' };
  }

  revalidatePath('/words');
  return { ok: true, id: row.id };
}

const batchInputSchema = z.object({
  items: z.array(saveInputSchema).min(1).max(40),
});

export type SaveWordsBatchResult =
  | { ok: true; inserted: number; duplicates: number }
  | {
      ok: false;
      error: 'UNAUTHENTICATED' | 'INVALID' | 'DB_FAILED';
    };

export async function saveWordsBatch(
  input: z.input<typeof batchInputSchema>,
): Promise<SaveWordsBatchResult> {
  const parsed = batchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  // Insert one-by-one so a duplicate doesn't abort the batch.
  let inserted = 0;
  let duplicates = 0;
  for (const item of parsed.data.items) {
    const { error } = await supabase.from('user_words').insert({
      user_id: user.id,
      lemma: item.lemma.trim(),
      hanja: item.hanja,
      part_of_speech: item.part_of_speech,
      word_type: item.word_type,
      meaning_ja: item.meaning_ja,
      daily_usage_score: item.daily_usage_score,
      topik_level: item.topik_level,
      example_topik: item.example_topik,
      example_topik_ja: item.example_topik_ja,
      example_daily: item.example_daily,
      example_daily_ja: item.example_daily_ja,
      notes: item.notes,
      source_text: item.source_text ?? null,
      context_sentence: item.context_sentence ?? null,
    });
    if (error) {
      if (error.code === '23505') duplicates += 1;
      else {
        console.error('saveWordsBatch item failed:', error);
        return { ok: false, error: 'DB_FAILED' };
      }
    } else {
      inserted += 1;
    }
  }

  revalidatePath('/words');
  return { ok: true, inserted, duplicates };
}
