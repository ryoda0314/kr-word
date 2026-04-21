import {
  Badge,
  Container,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';

import { ReaderView } from '@/components/reader/ReaderView';
import { touchPassage } from '@/lib/actions/passage';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { DeletePassageButton } from './DeletePassageButton';

const GENRE_LABEL: Record<string, string> = {
  news: 'ニュース',
  essay: 'エッセイ',
  dialogue: '会話',
  k_drama: 'K-drama',
  social: 'SNS',
  daily: '日常',
  formal: '公式',
  other: 'その他',
};

export default async function ReadPassagePage({
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

  const { data: passage } = await supabase
    .from('user_passages')
    .select(
      'id, title, body, topik_level, genre, source, word_count, notes, created_at',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!passage) notFound();

  // Update last_opened_at in the background — no need to await for render.
  void touchPassage(id);

  return (
    <Container size="md" py="lg">
      <Stack gap="md">
        <Flex justify="space-between" wrap="wrap" gap="sm" align="flex-start">
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} wrap="wrap">
              {passage.genre ? (
                <Badge variant="light" color="grape" size="sm">
                  {GENRE_LABEL[passage.genre] ?? passage.genre}
                </Badge>
              ) : null}
              {passage.topik_level ? (
                <Badge variant="default" size="sm">
                  TOPIK {passage.topik_level}
                </Badge>
              ) : null}
              {passage.source === 'ai' ? (
                <Badge
                  variant="outline"
                  color="grape"
                  size="sm"
                  leftSection={<Sparkles size={10} />}
                >
                  AI 生成
                </Badge>
              ) : null}
              <Badge variant="outline" color="gray" size="sm">
                {passage.word_count ?? 0} 어절
              </Badge>
            </Group>
            <Title order={2} lh={1.25}>
              {passage.title}
            </Title>
            {passage.notes ? (
              <Text size="xs" c="dimmed">
                📝 {passage.notes}
              </Text>
            ) : null}
          </Stack>
          <DeletePassageButton id={passage.id} title={passage.title} />
        </Flex>

        <ReaderView text={passage.body} />
      </Stack>
    </Container>
  );
}
