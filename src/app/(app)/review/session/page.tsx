import { Container } from '@mantine/core';

import {
  ReviewSession,
  type ReviewCard,
} from '@/components/review/ReviewSession';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { VocabStage, WordType } from '@/types/db';

const MAX_CARDS = 20;

export default async function ReviewSessionPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from('user_words')
    .select(
      'id, lemma, hanja, word_type, part_of_speech, meaning_ja, example_topik, example_topik_ja, example_daily, example_daily_ja, notes, stage',
    )
    .eq('user_id', user.id)
    .neq('stage', 'mastered')
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(MAX_CARDS);

  const cards: ReviewCard[] = (rows ?? []).map((r) => ({
    id: r.id,
    lemma: r.lemma,
    hanja: r.hanja,
    word_type: r.word_type as WordType,
    part_of_speech: r.part_of_speech,
    meaning_ja: r.meaning_ja,
    example_topik: r.example_topik,
    example_topik_ja: r.example_topik_ja,
    example_daily: r.example_daily,
    example_daily_ja: r.example_daily_ja,
    notes: r.notes,
    stage: r.stage as VocabStage,
  }));

  return (
    <Container size="md" py="lg">
      <ReviewSession cards={cards} exitHref="/review" />
    </Container>
  );
}
