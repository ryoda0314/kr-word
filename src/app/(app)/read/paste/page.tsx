import { Container, Stack, Text, Title } from '@mantine/core';

import { PastePassageForm } from './PastePassageForm';

export default function PastePassagePage() {
  return (
    <Container size="sm" py="lg">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>ペーストして追加</Title>
          <Text c="dimmed" size="sm">
            韓国語のテキスト（ニュース・台本・歌詞など）を貼り付けると、ライブラリに保存して読み始められます。
          </Text>
        </Stack>
        <PastePassageForm />
      </Stack>
    </Container>
  );
}
