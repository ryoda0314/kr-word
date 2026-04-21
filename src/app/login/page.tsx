import { Center, Container, Paper, Stack, Text, Title } from '@mantine/core';

import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <Center mih="100svh" px="md">
      <Container size={420} w="100%">
        <Stack gap="xl">
          <Stack gap={4} align="center">
            <Title order={2}>ko-word-book</Title>
            <Text c="dimmed" size="sm">
              サインインして学習を始める
            </Text>
          </Stack>
          <Paper withBorder radius="md" p="xl">
            <LoginForm next={next} showError={error === 'auth'} />
          </Paper>
        </Stack>
      </Container>
    </Center>
  );
}
