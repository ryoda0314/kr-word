import { Container, Stack, Text, Title } from '@mantine/core';

import { GeneratePassageForm } from './GeneratePassageForm';

export default function NewPassagePage() {
  return (
    <Container size="sm" py="lg">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>AI で長文を生成</Title>
          <Text c="dimmed" size="sm">
            トピック・ジャンル・TOPIK 級・長さを指定すると、ライブラリに保存してすぐ読み始められます。
          </Text>
        </Stack>
        <GeneratePassageForm />
      </Stack>
    </Container>
  );
}
