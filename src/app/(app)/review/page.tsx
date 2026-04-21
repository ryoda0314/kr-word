import { Badge, Card, Container, Group, Stack, Text, Title } from '@mantine/core';

import { ButtonLink } from '@/app/_components/ButtonLink';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { STAGE_LABELS_JA, type VocabStage } from '@/types/db';

const STAGE_COLOR: Record<VocabStage, string> = {
  memorize: 'gray',
  recognize: 'grape',
  produce: 'teal',
  mastered: 'green',
};

export default async function ReviewEntryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dueRows } = await supabase
    .from('user_words')
    .select('stage')
    .eq('user_id', user.id)
    .neq('stage', 'mastered')
    .lte('next_review_at', new Date().toISOString());

  const total = dueRows?.length ?? 0;
  const countsByStage: Record<VocabStage, number> = {
    memorize: 0,
    recognize: 0,
    produce: 0,
    mastered: 0,
  };
  for (const r of dueRows ?? []) countsByStage[r.stage as VocabStage] += 1;

  return (
    <Container size="sm" py="lg">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>レビュー</Title>
          <Text c="dimmed" size="sm">
            SM-2 で自動スケジュールされた復習を行います。
          </Text>
        </Stack>

        {total === 0 ? (
          <Card withBorder radius="md" p="lg">
            <Stack gap="xs">
              <Title order={3} size="h4">
                今日の復習はありません 🎉
              </Title>
              <Text c="dimmed" size="sm">
                新しい単語を追加するか、今日はここまでにしましょう。
              </Text>
              <Group gap="xs" mt="sm">
                <ButtonLink href="/words/new" variant="light">
                  単語を追加
                </ButtonLink>
                <ButtonLink href="/words" variant="subtle">
                  単語帳へ
                </ButtonLink>
              </Group>
            </Stack>
          </Card>
        ) : (
          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Group gap="xs" align="flex-end">
                <Text fz={48} fw={700} lh={1}>
                  {total}
                </Text>
                <Text c="dimmed" pb={8}>
                  語が待機中
                </Text>
              </Group>
              <Group gap="xs">
                {(['memorize', 'recognize', 'produce'] as VocabStage[]).map((s) =>
                  countsByStage[s] > 0 ? (
                    <Badge key={s} color={STAGE_COLOR[s]} variant="light" size="lg">
                      {STAGE_LABELS_JA[s]} {countsByStage[s]}
                    </Badge>
                  ) : null,
                )}
              </Group>
              <ButtonLink href="/review/session" size="md" mt="xs">
                はじめる
              </ButtonLink>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
