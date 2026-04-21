'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  AlertCircle,
  Check,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SpeechButton } from '@/components/common/SpeechButton';
import { classifyWord } from '@/lib/actions/classify';
import { saveWord } from '@/lib/actions/save-word';
import type { ClassifiedWord } from '@/lib/ai/schemas';
import { WORD_TYPE_LABELS_JA } from '@/types/db';

type PendingClassify =
  | { state: 'idle' }
  | { state: 'loading'; selectedText: string }
  | {
      state: 'ready';
      selectedText: string;
      contextSentence: string;
      word: ClassifiedWord;
    }
  | { state: 'error'; selectedText: string; code: string };

const CONTEXT_WINDOW = 120;

function extractContext(
  fullText: string,
  start: number,
  end: number,
): string {
  const lo = Math.max(0, start - CONTEXT_WINDOW);
  const hi = Math.min(fullText.length, end + CONTEXT_WINDOW);
  return fullText.slice(lo, hi).trim();
}

/**
 * Renders Korean text as a drag-selectable paragraph. Selection triggers a
 * floating "register" button; clicking it opens a modal with AI classify
 * preview and save-to-vocab action. Tokenization is intentionally skipped
 * — Korean is agglutinative and whitespace boundaries don't match
 * dictionary forms, so we let the learner pick the range directly.
 */
export function ReaderView({ text }: { text: string }) {
  const [savedLemmas, setSavedLemmas] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingClassify>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string>('');
  const [modalOpen, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const readerRef = useRef<HTMLDivElement>(null);

  const refreshSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setCurrentSelection('');
      return;
    }
    if (!readerRef.current) return;
    const anchor = sel.anchorNode;
    if (!anchor || !readerRef.current.contains(anchor)) {
      setCurrentSelection('');
      return;
    }
    const s = sel.toString().trim();
    setCurrentSelection(s);
  }, []);

  useEffect(() => {
    const handler = () => refreshSelection();
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [refreshSelection]);

  async function handleClassifySelection() {
    if (!currentSelection) return;
    const idx = text.indexOf(currentSelection);
    const context =
      idx >= 0
        ? extractContext(text, idx, idx + currentSelection.length)
        : text.slice(0, 300);

    openModal();
    setPending({ state: 'loading', selectedText: currentSelection });
    const res = await classifyWord({
      term: currentSelection,
      context,
    });
    if (!res.ok) {
      setPending({
        state: 'error',
        selectedText: currentSelection,
        code: res.error,
      });
      return;
    }
    setPending({
      state: 'ready',
      selectedText: currentSelection,
      contextSentence: context,
      word: res.word,
    });
  }

  async function handleSave() {
    if (pending.state !== 'ready') return;
    setSaving(true);
    const res = await saveWord({
      ...pending.word,
      source_text: text,
      context_sentence: pending.contextSentence,
    });
    setSaving(false);
    if (!res.ok) {
      if (res.error === 'DUPLICATE') {
        setToast(`「${pending.word.lemma}」はすでに登録されています。`);
      } else {
        setPending({
          state: 'error',
          selectedText: pending.selectedText,
          code: res.error,
        });
        return;
      }
    } else {
      setSavedLemmas((prev) =>
        prev.includes(pending.word.lemma) ? prev : [...prev, pending.word.lemma],
      );
      setToast(`「${pending.word.lemma}」を追加しました。`);
    }
    closeModal();
    setPending({ state: 'idle' });
    window.getSelection()?.removeAllRanges();
    setCurrentSelection('');
  }

  function handleModalClose() {
    closeModal();
    setPending({ state: 'idle' });
  }

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        本文を<strong>ドラッグで選択</strong>し、右下のボタンで単語帳に追加できます。助詞・語尾ごと選んでも AI が lemma に戻します。
      </Text>

      <Paper
        ref={readerRef}
        withBorder
        radius="md"
        p={{ base: 'md', md: 'xl' }}
        style={{
          fontSize: 17,
          lineHeight: 2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
        }}
      >
        {text}
      </Paper>

      {savedLemmas.length > 0 ? (
        <Card withBorder radius="sm" p="sm">
          <Stack gap={4}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
              このセッションで追加
            </Text>
            <Group gap={6} wrap="wrap">
              {savedLemmas.map((l) => (
                <Badge
                  key={l}
                  variant="light"
                  color="teal"
                  leftSection={<Check size={10} />}
                >
                  {l}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Card>
      ) : null}

      {toast ? (
        <Alert
          color="teal"
          icon={<Check size={16} />}
          variant="light"
          withCloseButton
          onClose={() => setToast(null)}
        >
          {toast}
        </Alert>
      ) : null}

      {/* Floating selection action */}
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 50,
          pointerEvents: currentSelection ? 'auto' : 'none',
          opacity: currentSelection ? 1 : 0,
          transform: currentSelection ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        <Button
          color="grape"
          size="md"
          leftSection={<Sparkles size={14} />}
          onClick={handleClassifySelection}
          style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}
        >
          「{truncate(currentSelection, 10)}」を登録
        </Button>
      </div>

      <Modal
        opened={modalOpen}
        onClose={handleModalClose}
        title="選択範囲から単語を登録"
        centered
        size="lg"
      >
        {pending.state === 'loading' ? (
          <Stack gap="sm" py="lg" align="center">
            <Sparkles size={24} />
            <Text size="sm" c="dimmed">
              「{pending.selectedText}」を分類中…
            </Text>
          </Stack>
        ) : pending.state === 'error' ? (
          <Stack gap="sm">
            <Alert color="red" icon={<AlertCircle size={16} />} variant="light">
              {describeError(pending.code)}
            </Alert>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleModalClose}>
                閉じる
              </Button>
            </Group>
          </Stack>
        ) : pending.state === 'ready' ? (
          <Stack gap="md">
            <Card withBorder radius="md" p="md">
              <Stack gap="sm">
                <Group justify="space-between" wrap="wrap">
                  <Group gap="sm" wrap="wrap" align="center">
                    <Text size="xl" fw={700}>
                      {pending.word.lemma}
                    </Text>
                    {pending.word.hanja ? (
                      <Text size="sm" c="dimmed" ff="monospace">
                        {pending.word.hanja}
                      </Text>
                    ) : null}
                    {pending.word.phonetic ? (
                      <Text size="sm" c="grape" ff="monospace">
                        {pending.word.phonetic}
                      </Text>
                    ) : null}
                    <SpeechButton text={pending.word.lemma} size="sm" />
                  </Group>
                  <Group gap={4}>
                    <Badge variant="light" color="grape">
                      {WORD_TYPE_LABELS_JA[pending.word.word_type]}
                    </Badge>
                    <Badge variant="default">{pending.word.part_of_speech}</Badge>
                    {pending.word.topik_level ? (
                      <Badge variant="outline">
                        TOPIK {pending.word.topik_level}
                      </Badge>
                    ) : null}
                    <Badge variant="outline" color="gray">
                      日常度 {pending.word.daily_usage_score}
                    </Badge>
                  </Group>
                </Group>
                <Text size="md" fw={500}>
                  {pending.word.meaning_ja}
                </Text>

                <Divider />

                {pending.word.example_topik ? (
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
                      TOPIK 風
                    </Text>
                    <Text size="sm">{pending.word.example_topik}</Text>
                    <Text size="xs" c="dimmed">
                      {pending.word.example_topik_ja}
                    </Text>
                  </Stack>
                ) : null}
                {pending.word.example_daily ? (
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
                      日常会話
                    </Text>
                    <Text size="sm">{pending.word.example_daily}</Text>
                    <Text size="xs" c="dimmed">
                      {pending.word.example_daily_ja}
                    </Text>
                  </Stack>
                ) : null}

                {pending.word.notes ? (
                  <>
                    <Divider />
                    <Text size="xs" c="dimmed">
                      💡 {pending.word.notes}
                    </Text>
                  </>
                ) : null}
              </Stack>
            </Card>

            <Stack gap={2}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
                選択した箇所
              </Text>
              <Text size="xs" c="dimmed" fs="italic">
                …{pending.contextSentence}…
              </Text>
            </Stack>

            <Group justify="flex-end">
              <Button
                variant="subtle"
                leftSection={<X size={14} />}
                onClick={handleModalClose}
              >
                キャンセル
              </Button>
              <Button
                color="teal"
                leftSection={<Plus size={14} />}
                onClick={handleSave}
                loading={saving}
              >
                単語帳に追加
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
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
      return '選択範囲が無効です。';
    case 'DB_FAILED':
      return '保存に失敗しました。';
    default:
      return 'エラーが発生しました。';
  }
}
