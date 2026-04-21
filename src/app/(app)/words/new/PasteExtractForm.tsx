'use client';

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { AlertCircle, Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { extractWords } from '@/lib/actions/extract';
import { saveWordsBatch } from '@/lib/actions/save-word';
import type { ExtractedWord } from '@/lib/ai/schemas';
import { WORD_TYPE_LABELS_JA } from '@/types/db';

export function PasteExtractForm() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedWord[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedCount = selected.size;
  const total = extracted?.length ?? 0;
  const allSelected = total > 0 && selectedCount === total;

  async function handleExtract() {
    setLoading(true);
    setError(null);
    setNotice(null);
    const res = await extractWords({ text, maxWords: 20 });
    setLoading(false);
    if (!res.ok) {
      setError(describeError(res.error));
      return;
    }
    setExtracted(res.words);
    setSelected(new Set(res.words.map((w) => w.lemma)));
  }

  function toggle(lemma: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lemma)) next.delete(lemma);
      else next.add(lemma);
      return next;
    });
  }

  function toggleAll() {
    if (!extracted) return;
    setSelected(allSelected ? new Set() : new Set(extracted.map((w) => w.lemma)));
  }

  async function handleSaveSelected() {
    if (!extracted) return;
    const items = extracted
      .filter((w) => selected.has(w.lemma))
      .map((w) => ({
        lemma: w.lemma,
        hanja: w.hanja,
        part_of_speech: w.part_of_speech as
          | 'noun'
          | 'verb'
          | 'adjective'
          | 'adverb'
          | 'phrase'
          | 'other',
        word_type: w.word_type as
          | 'sino_korean'
          | 'native_korean'
          | 'loanword'
          | 'mixed',
        meaning_ja: w.meaning_ja,
        phonetic: w.phonetic,
        daily_usage_score: w.daily_usage_score,
        topik_level: w.topik_level,
        example_topik: w.example_topik,
        example_topik_ja: w.example_topik_ja,
        example_daily: w.example_daily,
        example_daily_ja: w.example_daily_ja,
        notes: w.notes,
        source_text: text,
        context_sentence: w.context_sentence,
      }));
    if (items.length === 0) {
      setError('1 語以上選択してください。');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await saveWordsBatch({ items });
    setSaving(false);
    if (!res.ok) {
      setError(describeError(res.error));
      return;
    }
    const parts = [`${res.inserted} 語を追加しました`];
    if (res.duplicates > 0) parts.push(`（重複 ${res.duplicates} 件はスキップ）`);
    setNotice(parts.join('') + '.');
    setExtracted(null);
    setSelected(new Set());
    setText('');
    router.refresh();
  }

  return (
    <Stack gap="md">
      <Textarea
        label="韓国語の文章"
        placeholder={
          'ニュース・K-drama の台本・教科書など、韓国語のテキストを貼り付けてください（最大 3000 文字）。\n\n例）오늘 학교 끝나고 친구랑 영화 보러 갔어요.'
        }
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        autosize
        minRows={5}
        maxRows={14}
      />

      <Group justify="space-between">
        <Button
          onClick={handleExtract}
          loading={loading}
          disabled={!text.trim() || text.trim().length < 10}
          leftSection={<Sparkles size={14} />}
        >
          AI で学習語句を抽出
        </Button>
        {extracted ? (
          <Button
            color="teal"
            onClick={handleSaveSelected}
            loading={saving}
            leftSection={<Check size={14} />}
            disabled={selectedCount === 0}
          >
            選択した {selectedCount} 語を追加
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

      {extracted ? (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
              抽出結果（{total} 語）
            </Text>
            <Checkbox
              label="すべて選択"
              checked={allSelected}
              indeterminate={selectedCount > 0 && !allSelected}
              onChange={toggleAll}
              size="xs"
            />
          </Group>
          <Divider />
          {extracted.map((w) => (
            <Group
              key={w.lemma}
              align="flex-start"
              gap="sm"
              wrap="nowrap"
              style={{
                padding: '8px 4px',
                borderBottom:
                  '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
              }}
            >
              <Checkbox
                checked={selected.has(w.lemma)}
                onChange={() => toggle(w.lemma)}
              />
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Group gap="xs" wrap="wrap">
                  <Text fw={600}>{w.lemma}</Text>
                  {w.hanja ? (
                    <Text size="xs" c="dimmed" ff="monospace">
                      {w.hanja}
                    </Text>
                  ) : null}
                  <Badge variant="light" color="grape" size="xs">
                    {WORD_TYPE_LABELS_JA[w.word_type as keyof typeof WORD_TYPE_LABELS_JA] ?? w.word_type}
                  </Badge>
                  <Badge variant="default" size="xs">
                    {w.part_of_speech}
                  </Badge>
                  {w.topik_level ? (
                    <Badge variant="outline" size="xs">
                      TOPIK {w.topik_level}
                    </Badge>
                  ) : null}
                </Group>
                <Text size="sm">{w.meaning_ja}</Text>
                <Text size="xs" c="dimmed" fs="italic">
                  {w.context_sentence}
                </Text>
              </Stack>
            </Group>
          ))}
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
