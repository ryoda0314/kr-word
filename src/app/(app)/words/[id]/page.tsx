import { Container, Stack, Text, Title } from '@mantine/core';
import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { VocabStage, WordType } from '@/types/db';

import { EditWordForm } from './EditWordForm';

export default async function WordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: word } = await supabase
    .from('user_words')
    .select(
      'id, lemma, hanja, word_type, part_of_speech, meaning_ja, phonetic, daily_usage_score, topik_level, example_topik, example_topik_ja, example_daily, example_daily_ja, notes, stage, ease, interval_days, repetition, lapses, next_review_at, last_reviewed_at, created_at',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!word) notFound();

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Stack gap={2}>
          <Text c="dimmed" size="xs" tt="uppercase" fw={600} lts={1}>
            単語詳細
          </Text>
          <Title order={2}>{word.lemma}</Title>
        </Stack>

        <EditWordForm
          word={{
            id: word.id,
            lemma: word.lemma,
            hanja: word.hanja,
            word_type: word.word_type as WordType,
            part_of_speech: word.part_of_speech,
            meaning_ja: word.meaning_ja,
            phonetic: word.phonetic,
            daily_usage_score: word.daily_usage_score,
            topik_level: word.topik_level,
            example_topik: word.example_topik,
            example_topik_ja: word.example_topik_ja,
            example_daily: word.example_daily,
            example_daily_ja: word.example_daily_ja,
            notes: word.notes,
            stage: word.stage as VocabStage,
            lapses: word.lapses,
          }}
        />
      </Stack>
    </Container>
  );
}
