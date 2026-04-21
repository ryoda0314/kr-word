'use client';

import {
  Badge,
  Card,
  Divider,
  Group,
  Stack,
  Text,
} from '@mantine/core';

import { SpeechButton } from '@/components/common/SpeechButton';
import type { ClassifiedWord } from '@/lib/ai/schemas';
import { WORD_TYPE_LABELS_JA } from '@/types/db';

export function WordPreview({ word }: { word: ClassifiedWord }) {
  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="sm" wrap="wrap" align="center">
            <Text size="xl" fw={700}>
              {word.lemma}
            </Text>
            {word.hanja ? (
              <Text size="sm" c="dimmed" ff="monospace">
                {word.hanja}
              </Text>
            ) : null}
            {word.phonetic ? (
              <Text size="sm" c="grape" ff="monospace">
                {word.phonetic}
              </Text>
            ) : null}
            <SpeechButton text={word.lemma} size="sm" />
          </Group>
          <Group gap={4}>
            <Badge variant="light" color="grape">
              {WORD_TYPE_LABELS_JA[word.word_type]}
            </Badge>
            <Badge variant="default">{word.part_of_speech}</Badge>
            {word.topik_level ? (
              <Badge variant="outline">TOPIK {word.topik_level}</Badge>
            ) : null}
            <Badge variant="outline" color="gray">
              日常度 {word.daily_usage_score}
            </Badge>
          </Group>
        </Group>

        <Text size="md" fw={500}>
          {word.meaning_ja}
        </Text>

        <Divider />

        <Stack gap={4}>
          <Group gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
              TOPIK 風
            </Text>
            <SpeechButton text={word.example_topik} size="sm" />
          </Group>
          <Text size="sm">{word.example_topik}</Text>
          <Text size="xs" c="dimmed">
            {word.example_topik_ja}
          </Text>
        </Stack>

        <Stack gap={4}>
          <Group gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
              日常会話
            </Text>
            <SpeechButton text={word.example_daily} size="sm" />
          </Group>
          <Text size="sm">{word.example_daily}</Text>
          <Text size="xs" c="dimmed">
            {word.example_daily_ja}
          </Text>
        </Stack>

        {word.notes ? (
          <>
            <Divider />
            <Text size="xs" c="dimmed">
              💡 {word.notes}
            </Text>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}
