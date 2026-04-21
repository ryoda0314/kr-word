import { Container, Stack, Text, Title } from '@mantine/core';

import { DrillForm } from './DrillForm';

export default function DrillPage() {
  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>ドリル</Title>
          <Text c="dimmed" size="sm">
            分類タグや弱点で絞り込んで、好きな切り口で復習します。復習結果は通常のレビューと同じく SRS に反映されます。
          </Text>
        </Stack>
        <DrillForm />
      </Stack>
    </Container>
  );
}
