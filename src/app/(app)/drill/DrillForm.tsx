'use client';

import {
  Badge,
  Button,
  Card,
  Chip,
  Group,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { Dumbbell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { WORD_TYPES } from '@/lib/ai/schemas';
import { WORD_TYPE_LABELS_JA, type WordType } from '@/types/db';

const STAGE_OPTIONS: Array<{ value: 'all' | 'memorize' | 'recognize'; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'memorize', label: '暗記のみ' },
  { value: 'recognize', label: '文中認識のみ' },
];

export function DrillForm() {
  const router = useRouter();
  const [types, setTypes] = useState<WordType[]>([]);
  const [strugglingOnly, setStrugglingOnly] = useState(false);
  const [stage, setStage] = useState<'all' | 'memorize' | 'recognize'>('all');

  function start() {
    const params = new URLSearchParams();
    if (types.length > 0) params.set('types', types.join(','));
    if (strugglingOnly) params.set('struggling', '1');
    if (stage !== 'all') params.set('stage', stage);
    const qs = params.toString();
    router.push(`/drill/session${qs ? `?${qs}` : ''}`);
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Stack gap={4}>
            <Text fw={600}>分類で絞り込む</Text>
            <Text c="dimmed" size="xs">
              選ばなければすべての分類が対象。
            </Text>
          </Stack>
          <Chip.Group multiple value={types} onChange={(v) => setTypes(v as WordType[])}>
            <Group gap="xs">
              {WORD_TYPES.map((t) => (
                <Chip key={t} value={t} color="grape" variant="light">
                  {WORD_TYPE_LABELS_JA[t]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Stack gap={4}>
            <Text fw={600}>ステージで絞り込む</Text>
            <Text c="dimmed" size="xs">
              特定のステージだけ反復したい時に。
            </Text>
          </Stack>
          <Chip.Group value={stage} onChange={(v) => setStage(v as typeof stage)}>
            <Group gap="xs">
              {STAGE_OPTIONS.map((o) => (
                <Chip key={o.value} value={o.value} variant="light">
                  {o.label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Stack gap={4}>
            <Text fw={600}>弱点のみ</Text>
            <Text c="dimmed" size="xs">
              一度以上 lapse したもの（忘れた語）に絞ります。
            </Text>
          </Stack>
          <Switch
            checked={strugglingOnly}
            onChange={(e) => setStrugglingOnly(e.currentTarget.checked)}
            size="md"
            color="grape"
          />
        </Group>
      </Card>

      <Group gap="xs" wrap="wrap">
        {types.length > 0 ? (
          <Badge variant="light" color="grape">
            分類 {types.length} 種
          </Badge>
        ) : null}
        {stage !== 'all' ? (
          <Badge variant="light">
            {STAGE_OPTIONS.find((o) => o.value === stage)?.label}
          </Badge>
        ) : null}
        {strugglingOnly ? (
          <Badge variant="light" color="red">
            弱点のみ
          </Badge>
        ) : null}
      </Group>

      <Button
        size="md"
        leftSection={<Dumbbell size={14} />}
        onClick={start}
        style={{ alignSelf: 'flex-start' }}
      >
        ドリル開始
      </Button>
    </Stack>
  );
}
