'use client';

import {
  Alert,
  Button,
  LoadingOverlay,
  Paper,
  Select,
  Stack,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { z } from 'zod';

import { generatePassage } from '@/lib/actions/passage';
import {
  PASSAGE_GENRES,
  PASSAGE_LENGTH_OPTIONS,
  PASSAGE_LEVEL_OPTIONS,
  type PassageGenre,
  type PassageLength,
} from '@/lib/actions/passage-options';

const GENRE_VALUES = PASSAGE_GENRES.map((g) => g.value) as unknown as [
  PassageGenre,
  ...PassageGenre[],
];

const schema = z.object({
  topic: z.string().min(3, '3 文字以上で入力').max(300),
  genre: z.enum(GENRE_VALUES),
  topik_level: z.number().int().min(1).max(6),
  length: z.enum(PASSAGE_LENGTH_OPTIONS),
  notes: z.string().max(500).optional(),
});

const LENGTH_LABELS: Record<PassageLength, string> = {
  short: '短め (〜80 어절)',
  medium: '標準 (〜160 어절)',
  long: '長め (〜260 어절)',
};

export function GeneratePassageForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      topic: '',
      genre: 'essay' as PassageGenre,
      topik_level: 3 as (typeof PASSAGE_LEVEL_OPTIONS)[number],
      length: 'medium' as PassageLength,
      notes: '',
    },
    validate: zodResolver(schema),
  });

  function handleSubmit(values: z.input<typeof schema>) {
    setError(null);
    startTransition(async () => {
      const result = await generatePassage(values);
      if (result.ok) {
        router.push(`/read/${result.passageId}`);
      } else {
        setError(describe(result.error));
      }
    });
  }

  return (
    <Paper withBorder radius="md" p="lg" pos="relative">
      <LoadingOverlay
        visible={pending}
        overlayProps={{ blur: 2 }}
        loaderProps={{ children: 'AI が生成中…' }}
      />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Textarea
            label="トピック"
            description="何について書いてほしいか。具体的なほど良い文章になります。"
            placeholder="例: 서울의 교통 체증 문제 / K-pop 아이돌의 일상 / 한국의 명절 풍습"
            autosize
            minRows={2}
            maxRows={5}
            key={form.key('topic')}
            {...form.getInputProps('topic')}
          />

          <Select
            label="ジャンル"
            description="文体のレジスターが切り替わります。"
            allowDeselect={false}
            data={PASSAGE_GENRES.map((g) => ({
              value: g.value,
              label: g.label,
            }))}
            key={form.key('genre')}
            {...form.getInputProps('genre')}
          />

          <Select
            label="TOPIK 級"
            description="語彙・文法の難易度の目安。1-2 は初級、3-4 は中級、5-6 は高級。"
            allowDeselect={false}
            data={PASSAGE_LEVEL_OPTIONS.map((n) => ({
              value: String(n),
              label: `TOPIK ${n}`,
            }))}
            value={String(form.getValues().topik_level)}
            onChange={(v) =>
              form.setFieldValue('topik_level', Number(v ?? '3') as 1 | 2 | 3 | 4 | 5 | 6)
            }
          />

          <Select
            label="長さ"
            allowDeselect={false}
            data={PASSAGE_LENGTH_OPTIONS.map((v) => ({
              value: v,
              label: LENGTH_LABELS[v],
            }))}
            key={form.key('length')}
            {...form.getInputProps('length')}
          />

          <Textarea
            label="追加メモ (任意)"
            description="話題の切り口・含めたい語彙など、細かい要望があれば。"
            placeholder="例: 40대 직장인 관점で / 반말の会話で / 기후 변화との関係に触れて"
            autosize
            minRows={2}
            maxRows={4}
            key={form.key('notes')}
            {...form.getInputProps('notes')}
          />

          {error ? (
            <Alert color="red" icon={<AlertCircle size={16} />} variant="light">
              {error}
            </Alert>
          ) : null}

          <Button
            type="submit"
            leftSection={<Sparkles size={16} />}
            loading={pending}
            size="md"
          >
            生成して読む
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

function describe(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'サインインし直してください。';
    case 'RATE_LIMITED':
      return 'リクエストが多すぎます。数分置いてもう一度お試しください（5回/分）。';
    case 'NOT_CONFIGURED':
      return 'AI キーが設定されていません（.env の OPENAI_API_KEY）。';
    case 'AI_FAILED':
      return 'AI 呼び出しに失敗しました。';
    case 'INVALID':
      return '入力内容が正しくありません。';
    case 'DB':
      return '保存に失敗しました。';
    default:
      return 'エラーが発生しました。';
  }
}
