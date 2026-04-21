import {
  Container,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { ClipboardPaste, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { ButtonLink } from '@/app/_components/ButtonLink';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { PassageCard } from './PassageCard';

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

export default async function ReadLibraryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: passages } = await supabase
    .from('user_passages')
    .select('id, title, topik_level, genre, source, word_count, last_opened_at, created_at')
    .eq('user_id', user.id)
    .order('last_opened_at', { ascending: false })
    .limit(60);

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        <Flex justify="space-between" wrap="wrap" gap="sm" align="flex-end">
          <Stack gap={2}>
            <Title order={2}>読む</Title>
            <Text c="dimmed" size="sm">
              長文を用意して、ドラッグで知らない語句を単語帳に拾う。AI で新しい長文を生成するか、自分で用意した韓国語テキストを貼り付けられます。
            </Text>
          </Stack>
          <Group gap="xs">
            <ButtonLink
              href="/read/new"
              leftSection={<Sparkles size={14} />}
              color="grape"
            >
              AI で生成
            </ButtonLink>
            <ButtonLink
              href="/read/paste"
              variant="light"
              leftSection={<ClipboardPaste size={14} />}
            >
              ペースト
            </ButtonLink>
          </Group>
        </Flex>

        {!passages || passages.length === 0 ? (
          <Stack gap="xs" py="xl" align="center">
            <Text c="dimmed" size="sm" ta="center">
              まだ長文がありません。「AI で生成」または「ペースト」から最初の一本を用意してください。
            </Text>
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {passages.map((p) => (
              <Link
                key={p.id}
                href={`/read/${p.id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <PassageCard
                  title={p.title}
                  topikLevel={p.topik_level}
                  genreLabel={p.genre ? (GENRE_LABEL[p.genre] ?? p.genre) : null}
                  source={p.source}
                  wordCount={p.word_count}
                />
              </Link>
            ))}
          </SimpleGrid>
        )}

        {passages && passages.length > 0 ? (
          <Text c="dimmed" size="xs" ta="right">
            {passages.length} 本（最新アクセス順）
          </Text>
        ) : null}
      </Stack>
    </Container>
  );
}

