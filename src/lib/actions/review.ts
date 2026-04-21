'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { applySm2, nextStage, type Sm2State } from '@/lib/srs/sm2';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { VocabStage } from '@/types/db';

const schema = z.object({
  userWordId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
});

export type SubmitReviewResult =
  | {
      ok: true;
      stageBefore: VocabStage;
      stageAfter: VocabStage;
      nextReviewAt: string;
      intervalDays: number;
    }
  | { ok: false; error: string };

export async function submitReview(
  input: z.input<typeof schema>,
): Promise<SubmitReviewResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const { userWordId, quality } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { data: word, error: fetchError } = await supabase
    .from('user_words')
    .select('id, stage, ease, interval_days, repetition, lapses')
    .eq('id', userWordId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (fetchError || !word) return { ok: false, error: 'NOT_FOUND' };

  const state: Sm2State = {
    ease: Number(word.ease) || 2.5,
    intervalDays: Number(word.interval_days) || 0,
    repetition: Number(word.repetition) || 0,
    lapses: Number(word.lapses) || 0,
  };
  const sm2 = applySm2(state, quality);
  const stageAfter = nextStage(word.stage, quality);

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('user_words')
    .update({
      stage: stageAfter,
      ease: sm2.ease,
      interval_days: sm2.intervalDays,
      repetition: sm2.repetition,
      lapses: sm2.lapses,
      next_review_at: sm2.nextReviewAt.toISOString(),
      last_reviewed_at: now,
    })
    .eq('id', userWordId)
    .eq('user_id', user.id);
  if (updateError) return { ok: false, error: updateError.message };

  await supabase.from('review_events').insert({
    user_id: user.id,
    user_word_id: userWordId,
    stage_before: word.stage,
    stage_after: stageAfter,
    quality,
  });

  revalidatePath('/review');
  revalidatePath('/words');

  return {
    ok: true,
    stageBefore: word.stage,
    stageAfter,
    nextReviewAt: sm2.nextReviewAt.toISOString(),
    intervalDays: sm2.intervalDays,
  };
}
