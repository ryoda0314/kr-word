import {
  Badge,
  Container,
  Flex,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { ChevronRight, PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { ActionIconLink } from '@/app/_components/ActionIconLink';
import { ButtonLink } from '@/app/_components/ButtonLink';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { STAGE_LABELS_JA, WORD_TYPE_LABELS_JA } from '@/types/db';

export default async function WordsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: words, error } = await supabase
    .from('user_words')
    .select(
      'id, lemma, hanja, phonetic, word_type, meaning_ja, daily_usage_score, topik_level, stage, next_review_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <Container size="lg" py="lg">
        <Text c="red">読み込みに失敗しました: {error.message}</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
          <Stack gap={2}>
            <Title order={2}>単語帳</Title>
            <Text c="dimmed" size="sm">
              {words?.length ?? 0} 語を登録中
            </Text>
          </Stack>
          <ButtonLink
            href="/words/new"
            leftSection={<PlusCircle size={16} />}
          >
            単語を追加
          </ButtonLink>
        </Flex>

        {!words || words.length === 0 ? (
          <Text c="dimmed">
            まだ単語がありません。右上の「単語を追加」から始めましょう。
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>語</Table.Th>
                  <Table.Th>意味</Table.Th>
                  <Table.Th>分類</Table.Th>
                  <Table.Th>TOPIK</Table.Th>
                  <Table.Th>日常会話度</Table.Th>
                  <Table.Th>ステージ</Table.Th>
                  <Table.Th aria-label="詳細" />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {words.map((w) => (
                  <Table.Tr key={w.id}>
                    <Table.Td>
                      <Link
                        href={`/words/${w.id}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        <Stack gap={2}>
                          <Text fw={600}>{w.lemma}</Text>
                          <Group gap={4}>
                            {w.hanja ? (
                              <Text size="xs" c="dimmed" ff="monospace">
                                {w.hanja}
                              </Text>
                            ) : null}
                            {w.phonetic ? (
                              <Text size="xs" c="grape" ff="monospace">
                                {w.phonetic}
                              </Text>
                            ) : null}
                          </Group>
                        </Stack>
                      </Link>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{w.meaning_ja}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="grape">
                        {WORD_TYPE_LABELS_JA[w.word_type]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {w.topik_level ? (
                        <Badge variant="default">TOPIK {w.topik_level}</Badge>
                      ) : (
                        <Text size="xs" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <div
                          style={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            background:
                              'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: `${w.daily_usage_score}%`,
                              background: 'var(--mantine-color-grape-5)',
                            }}
                          />
                        </div>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {w.daily_usage_score}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{STAGE_LABELS_JA[w.stage]}</Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIconLink
                        href={`/words/${w.id}`}
                        variant="subtle"
                        color="gray"
                        aria-label="詳細"
                      >
                        <ChevronRight size={16} />
                      </ActionIconLink>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Container>
  );
}
