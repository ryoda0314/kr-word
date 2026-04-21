import { Alert, Button, Container, Stack, Text } from '@mantine/core';
import Link from 'next/link';

import {
  ReviewSession,
  type ReviewCard,
} from '@/components/review/ReviewSession';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WORD_TYPES } from '@/lib/ai/schemas';
import type { VocabStage, WordType } from '@/types/db';

const MAX_CARDS = 30;

function parseTypes(raw: string | undefined): WordType[] {
  if (!raw) return [];
  const set = new Set(WORD_TYPES);
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is WordType => (set as Set<string>).has(s));
}

export default async function DrillSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ types?: string; struggling?: string; stage?: string }>;
}) {
  const { types: typesRaw, struggling, stage } = await searchParams;
  const types = parseTypes(typesRaw);
  const strugglingOnly = struggling === '1';
  const stageFilter =
    stage === 'memorize' || stage === 'recognize' ? (stage as VocabStage) : null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let q = supabase
    .from('user_words')
    .select(
      'id, lemma, hanja, word_type, part_of_speech, meaning_ja, example_topik, example_topik_ja, example_daily, example_daily_ja, notes, stage',
    )
    .eq('user_id', user.id)
    .neq('stage', 'mastered');

  if (types.length > 0) q = q.in('word_type', types);
  if (stageFilter) q = q.eq('stage', stageFilter);
  if (strugglingOnly) q = q.gt('lapses', 0);

  const { data: rows } = await q
    .order('lapses', { ascending: false })
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

  if (cards.length === 0) {
    return (
      <Container size="md" py="lg">
        <Stack gap="md" align="flex-start">
          <Alert color="gray" variant="light">
            条件に合う単語がありません。絞り込みを緩めるか、単語を追加してください。
          </Alert>
          <Button component={Link} href="/drill" variant="light">
            条件を変える
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="md" py="lg">
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          ドリル · {cards.length} 語
        </Text>
        <ReviewSession cards={cards} exitHref="/drill" />
      </Stack>
    </Container>
  );
}
