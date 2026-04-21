'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AlertCircle, Check, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { SpeechButton } from '@/components/common/SpeechButton';
import { WORD_TYPES } from '@/lib/ai/schemas';
import { deleteWord, updateWord } from '@/lib/actions/update-word';
import {
  STAGE_LABELS_JA,
  WORD_TYPE_LABELS_JA,
  type VocabStage,
  type WordType,
} from '@/types/db';

type Word = {
  id: string;
  lemma: string;
  hanja: string | null;
  word_type: WordType;
  part_of_speech: string | null;
  meaning_ja: string;
  phonetic: string | null;
  daily_usage_score: number;
  topik_level: number | null;
  example_topik: string | null;
  example_topik_ja: string | null;
  example_daily: string | null;
  example_daily_ja: string | null;
  notes: string | null;
  stage: VocabStage;
  lapses: number;
};

const PART_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'noun', label: '名詞' },
  { value: 'verb', label: '動詞' },
  { value: 'adjective', label: '形容詞' },
  { value: 'adverb', label: '副詞' },
  { value: 'phrase', label: '句' },
  { value: 'other', label: 'その他' },
];

const WORD_TYPE_OPTIONS = WORD_TYPES.map((t) => ({
  value: t,
  label: WORD_TYPE_LABELS_JA[t],
}));

export function EditWordForm({ word }: { word: Word }) {
  const router = useRouter();
  const [form, setForm] = useState(word);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);

  function patch<K extends keyof Word>(key: K, value: Word[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    const partOfSpeech = (form.part_of_speech ?? 'other') as
      | 'noun'
      | 'verb'
      | 'adjective'
      | 'adverb'
      | 'phrase'
      | 'other';
    const res = await updateWord({
      id: form.id,
      lemma: form.lemma,
      hanja: form.hanja?.trim() || null,
      part_of_speech: partOfSpeech,
      word_type: form.word_type,
      meaning_ja: form.meaning_ja,
      phonetic: form.phonetic?.trim() || null,
      daily_usage_score: form.daily_usage_score,
      topik_level: form.topik_level,
      example_topik: form.example_topik,
      example_topik_ja: form.example_topik_ja,
      example_daily: form.example_daily,
      example_daily_ja: form.example_daily_ja,
      notes: form.notes?.trim() ? form.notes : null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(describeError(res.error));
      return;
    }
    setNotice('保存しました。');
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await deleteWord({ id: form.id });
    setDeleting(false);
    closeConfirm();
    if (!res.ok) {
      setError(describeError(res.error));
      return;
    }
    router.push('/words');
    router.refresh();
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs" wrap="wrap">
            <Badge variant="light" color="grape">
              {WORD_TYPE_LABELS_JA[form.word_type]}
            </Badge>
            <Badge variant="default">{STAGE_LABELS_JA[form.stage]}</Badge>
            {form.lapses > 0 ? (
              <Badge variant="outline" color="red">
                lapses {form.lapses}
              </Badge>
            ) : null}
            {form.phonetic ? (
              <Badge variant="outline" color="grape" ff="monospace">
                {form.phonetic}
              </Badge>
            ) : null}
          </Group>
          <Group gap={4}>
            <SpeechButton text={form.lemma} size="sm" />
            <SpeechButton text={form.lemma} slow size="sm" label="ゆっくり" />
          </Group>
        </Group>
      </Card>

      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput
            label="韓国語 (lemma)"
            value={form.lemma}
            onChange={(e) => patch('lemma', e.currentTarget.value)}
            required
          />
          <TextInput
            label="漢字 (あれば)"
            value={form.hanja ?? ''}
            onChange={(e) => patch('hanja', e.currentTarget.value || null)}
            placeholder="학교 → 學校"
          />
        </Group>

        <Group grow align="flex-start">
          <Select
            label="分類"
            data={WORD_TYPE_OPTIONS}
            value={form.word_type}
            onChange={(v) => v && patch('word_type', v as WordType)}
            allowDeselect={false}
          />
          <Select
            label="品詞"
            data={PART_OPTIONS}
            value={form.part_of_speech ?? 'other'}
            onChange={(v) => v && patch('part_of_speech', v)}
            allowDeselect={false}
          />
        </Group>

        <TextInput
          label="日本語の意味"
          value={form.meaning_ja}
          onChange={(e) => patch('meaning_ja', e.currentTarget.value)}
          required
        />

        <TextInput
          label="実際の発音 (パッチム注意ポイント)"
          description="空欄なら綴りどおり。例: 학교 → [학꾜] (경음화), 국민 → [궁민] (비음화)"
          value={form.phonetic ?? ''}
          onChange={(e) => patch('phonetic', e.currentTarget.value || null)}
          placeholder="[학꾜]"
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            日常会話度: {form.daily_usage_score}
          </Text>
          <Slider
            value={form.daily_usage_score}
            onChange={(v) => patch('daily_usage_score', v)}
            min={0}
            max={100}
            step={5}
            color="grape"
            marks={[
              { value: 0, label: '書き言葉' },
              { value: 50, label: '中間' },
              { value: 100, label: '日常' },
            ]}
          />
        </Stack>

        <NumberInput
          label="TOPIK 級 (1-6, 空欄可)"
          value={form.topik_level ?? ''}
          onChange={(v) => {
            const n = typeof v === 'number' ? v : null;
            patch('topik_level', n && n >= 1 && n <= 6 ? n : null);
          }}
          min={1}
          max={6}
          clampBehavior="strict"
          allowDecimal={false}
          placeholder="未設定"
        />

        <Stack gap="sm">
          <Text size="sm" fw={600}>
            TOPIK 風例文
          </Text>
          <Textarea
            label="韓国語"
            value={form.example_topik ?? ''}
            onChange={(e) =>
              patch('example_topik', e.currentTarget.value || null)
            }
            autosize
            minRows={1}
            maxRows={3}
          />
          <Textarea
            label="日本語訳"
            value={form.example_topik_ja ?? ''}
            onChange={(e) =>
              patch('example_topik_ja', e.currentTarget.value || null)
            }
            autosize
            minRows={1}
            maxRows={3}
          />
        </Stack>

        <Stack gap="sm">
          <Text size="sm" fw={600}>
            日常会話例文
          </Text>
          <Textarea
            label="韓国語"
            value={form.example_daily ?? ''}
            onChange={(e) =>
              patch('example_daily', e.currentTarget.value || null)
            }
            autosize
            minRows={1}
            maxRows={3}
          />
          <Textarea
            label="日本語訳"
            value={form.example_daily_ja ?? ''}
            onChange={(e) =>
              patch('example_daily_ja', e.currentTarget.value || null)
            }
            autosize
            minRows={1}
            maxRows={3}
          />
        </Stack>

        <Textarea
          label="メモ（発音・コロケーション等）"
          value={form.notes ?? ''}
          onChange={(e) => patch('notes', e.currentTarget.value || null)}
          autosize
          minRows={1}
          maxRows={4}
        />

        {error ? (
          <Alert color="red" icon={<AlertCircle size={16} />} variant="light">
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert color="teal" icon={<Check size={16} />} variant="light">
            {notice}
          </Alert>
        ) : null}

        <Group justify="space-between" mt="sm">
          <Button
            color="red"
            variant="subtle"
            leftSection={<Trash2 size={14} />}
            onClick={openConfirm}
          >
            削除
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            leftSection={<Save size={14} />}
          >
            保存
          </Button>
        </Group>
      </Stack>

      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="この単語を削除しますか？"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            <Text component="span" fw={700}>
              {form.lemma}
            </Text>{' '}
            を削除します。復習履歴も一緒に消えます。元に戻せません。
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeConfirm}>
              キャンセル
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              削除する
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function describeError(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'サインインし直してください。';
    case 'DUPLICATE':
      return '同じ lemma がすでに存在します。';
    case 'DB_FAILED':
      return 'データベースの更新に失敗しました。';
    case 'INVALID':
      return '入力が正しくありません。';
    default:
      return 'エラーが発生しました。';
  }
}
