import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { ButtonLink } from '@/app/_components/ButtonLink';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container size="sm" py={96}>
      <Stack gap="md">
        <Text c="dimmed" size="sm" tt="uppercase" fw={600} lts={1.5}>
          ko-word-book
        </Text>
        <Title order={1} fz={{ base: 32, md: 44 }} lh={1.2}>
          TOPIK と日常会話の語彙を、<br />分類して、例文で、定着させる。
        </Title>
        <Text c="dimmed" size="md" lh={1.8}>
          単語を登録すると AI が漢字語・固有語・外来語に分類し、TOPIK 風と日常会話の例文を添える。SRS で復習し、使える語彙として育てる。
        </Text>
        <Group gap="sm" mt="md">
          {user ? (
            <ButtonLink href="/dashboard" size="md">
              ダッシュボードへ
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" size="md">
                サインイン
              </ButtonLink>
              <ButtonLink href="/login" size="md" variant="subtle">
                新規登録
              </ButtonLink>
            </>
          )}
        </Group>
      </Stack>
    </Container>
  );
}
