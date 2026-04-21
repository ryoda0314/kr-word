import { Container, Stack, Text, Title } from '@mantine/core';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { SettingsForm } from './SettingsForm';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_goal, timezone')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <Container size="sm" py="lg">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>設定</Title>
          <Text c="dimmed" size="sm">
            表示名と 1 日の目標復習語数を変更できます。
          </Text>
        </Stack>

        <SettingsForm
          email={user.email ?? ''}
          timezone={profile?.timezone ?? 'Asia/Tokyo'}
          initial={{
            display_name: profile?.display_name ?? null,
            daily_goal: profile?.daily_goal ?? 10,
          }}
        />
      </Stack>
    </Container>
  );
}
