import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { Sparkles } from 'lucide-react';

export function PassageCard({
  title,
  topikLevel,
  genreLabel,
  source,
  wordCount,
}: {
  title: string;
  topikLevel: number | null;
  genreLabel: string | null;
  source: 'ai' | 'pasted';
  wordCount: number | null;
}) {
  return (
    <Card withBorder radius="md" p="lg" h="100%">
      <Stack gap="xs" h="100%">
        <Group gap={6} wrap="wrap">
          {genreLabel ? (
            <Badge variant="light" color="grape" size="sm">
              {genreLabel}
            </Badge>
          ) : null}
          {topikLevel ? (
            <Badge variant="default" size="sm">
              TOPIK {topikLevel}
            </Badge>
          ) : null}
          {source === 'ai' ? (
            <Badge
              variant="outline"
              color="grape"
              size="sm"
              leftSection={<Sparkles size={10} />}
            >
              AI 生成
            </Badge>
          ) : null}
        </Group>
        <Text fw={600} fz="lg" lh={1.3} lineClamp={2}>
          {title}
        </Text>
        <Text c="dimmed" size="xs" mt="auto">
          {wordCount ?? 0} 어절
        </Text>
      </Stack>
    </Card>
  );
}
