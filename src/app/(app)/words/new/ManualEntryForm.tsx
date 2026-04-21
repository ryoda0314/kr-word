'use client';

import {
  Alert,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { AlertCircle, Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { classifyWord } from '@/lib/actions/classify';
import { saveWord } from '@/lib/actions/save-word';
import type { ClassifiedWord } from '@/lib/ai/schemas';

import { WordPreview } from './WordPreview';

export function ManualEntryForm() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ClassifiedWord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleClassify() {
    setLoading(true);
    setError(null);
    setNotice(null);
    const res = await classifyWord({
      term,
      context: context.trim() || undefined,
    });
    setLoading(false);
    if (!res.ok) {
      setError(describeError(res.error));
      return;
    }
    setPreview(res.word);
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setError(null);
    const res = await saveWord({
      ...preview,
      context_sentence: context.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      if (res.error === 'DUPLICATE') {
        setError('この単語はすでに登録されています。');
      } else {
        setError(describeError(res.error));
      }
      return;
    }
    setNotice(`「${preview.lemma}」を追加しました。`);
    setTerm('');
    setContext('');
    setPreview(null);
    router.refresh();
  }

  return (
    <Stack gap="md">
      <TextInput
        label="単語（ハングル）"
        placeholder="例: 학교 / 반갑다 / 알바"
        value={term}
        onChange={(e) => setTerm(e.currentTarget.value)}
        autoFocus
      />
      <Textarea
        label="出会った文脈（任意）"
        placeholder="この語が出てきた文。AI の例文選びの参考になります。"
        value={context}
        onChange={(e) => setContext(e.currentTarget.value)}
        autosize
        minRows={2}
        maxRows={4}
      />

      <Group>
        <Button
          onClick={handleClassify}
          loading={loading}
          disabled={!term.trim()}
          leftSection={<Sparkles size={14} />}
        >
          AI で意味と例文を生成
        </Button>
        {preview ? (
          <Button
            variant="filled"
            color="teal"
            onClick={handleSave}
            loading={saving}
            leftSection={<Check size={14} />}
          >
            単語帳に追加
          </Button>
        ) : null}
      </Group>

      {error ? (
        <Alert color="red" icon={<AlertCircle size={16} />} variant="light">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert color="teal" variant="light">
          {notice}
        </Alert>
      ) : null}

      {preview ? (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
            プレビュー
          </Text>
          <WordPreview word={preview} />
        </Stack>
      ) : null}
    </Stack>
  );
}

function describeError(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'サインインし直してください。';
    case 'RATE_LIMITED':
      return 'リクエストが多すぎます。少し待ってからもう一度お試しください。';
    case 'NOT_CONFIGURED':
      return 'AI キーが設定されていません（.env の OPENAI_API_KEY）。';
    case 'AI_FAILED':
      return 'AI 呼び出しに失敗しました。';
    case 'INVALID':
      return '入力が正しくありません。';
    case 'DB_FAILED':
      return '保存に失敗しました。';
    default:
      return 'エラーが発生しました。';
  }
}
