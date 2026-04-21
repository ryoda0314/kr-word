'use client';

import {
  Alert,
  Button,
  NumberInput,
  Paper,
  Select,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { AlertCircle, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { savePassage } from '@/lib/actions/passage';
import { PASSAGE_GENRES, type PassageGenre } from '@/lib/actions/passage-options';

export function PastePassageForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [genre, setGenre] = useState<PassageGenre | ''>('');
  const [topikLevel, setTopikLevel] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (body.trim().length < 10) {
      setError('本文は 10 文字以上で入力してください。');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await savePassage({
      title: title.trim() || undefined,
      body,
      genre: genre || undefined,
      topik_level:
        typeof topikLevel === 'number' && topikLevel >= 1 && topikLevel <= 6
          ? topikLevel
          : null,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setError(describe(res.error));
      return;
    }
    router.push(`/read/${res.passageId}`);
  }

  return (
    <Paper withBorder radius="md" p="lg">
      <Stack gap="md">
        <TextInput
          label="タイトル (任意)"
          description="空欄なら本文の冒頭から自動生成します。"
          placeholder="例: 서울시 교통정보 안내"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={120}
        />

        <Textarea
          label="本文"
          placeholder="韓国語のテキストを貼り付けてください。"
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          autosize
          minRows={8}
          maxRows={20}
          required
        />

        <Select
          label="ジャンル (任意)"
          placeholder="自動推定しない場合だけ指定"
          clearable
          data={PASSAGE_GENRES.map((g) => ({
            value: g.value,
            label: g.label,
          }))}
          value={genre || null}
          onChange={(v) => setGenre((v ?? '') as PassageGenre | '')}
        />

        <NumberInput
          label="TOPIK 級 (任意)"
          placeholder="1-6"
          value={topikLevel}
          onChange={(v) => setTopikLevel(typeof v === 'number' ? v : '')}
          min={1}
          max={6}
          clampBehavior="strict"
          allowDecimal={false}
        />

        <Textarea
          label="メモ (任意)"
          placeholder="どこから持ってきたか等"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          autosize
          minRows={1}
          maxRows={3}
        />

        {error ? (
          <Alert color="red" icon={<AlertCircle size={16} />} variant="light">
            {error}
          </Alert>
        ) : null}

        <Button
          onClick={handleSave}
          loading={saving}
          leftSection={<BookOpen size={14} />}
          disabled={body.trim().length < 10}
        >
          保存して読み始める
        </Button>
      </Stack>
    </Paper>
  );
}

function describe(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'サインインし直してください。';
    case 'INVALID':
      return '入力内容が正しくありません。';
    case 'DB':
      return '保存に失敗しました。';
    default:
      return 'エラーが発生しました。';
  }
}
