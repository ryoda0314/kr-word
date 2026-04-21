import { Container, Stack, Text, Title } from '@mantine/core';

import { ReaderShell } from './ReaderShell';

export default function ReadPage() {
  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>読む</Title>
          <Text c="dimmed" size="sm">
            韓国語の文章を貼り付けて読みながら、知らない語句を**ドラッグで選択**して単語帳に追加します。
          </Text>
        </Stack>
        <ReaderShell />
      </Stack>
    </Container>
  );
}
