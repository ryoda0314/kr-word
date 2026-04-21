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
  Portal,
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

import styles from './ReaderView.module.css';

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

type PhraseSel = {
  text: string;
  buttonTop: number;
  buttonLeft: number;
  groupRects: Array<{ top: number; left: number; width: number; height: number }>;
  context: string;
};

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
 * Renders Korean text as a drag-selectable paragraph. Matches en-word-book's
 * reader UX: while dragging, a dashed outline wraps each line of the selection
 * and a floating button appears above it. Clicking the button opens a modal
 * with an AI classify preview and save-to-vocab action.
 *
 * Korean is agglutinative, so we don't tokenize — the learner picks the
 * character range directly and the AI normalizes it to the dictionary form.
 */
export function ReaderView({ text }: { text: string }) {
  const [savedLemmas, setSavedLemmas] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingClassify>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [phraseSel, setPhraseSel] = useState<PhraseSel | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const paperRef = useRef<HTMLDivElement>(null);

  const refreshSelection = useCallback(() => {
    const sel = window.getSelection();
    const paper = paperRef.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !paper) {
      setPhraseSel(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!paper.contains(range.commonAncestorContainer)) {
      setPhraseSel(null);
      return;
    }
    const raw = sel.toString();
    const trimmed = raw.trim();
    if (!trimmed) {
      setPhraseSel(null);
      return;
    }

    // Group per-span client rects by line (merge rects on the same baseline).
    const rawRects = Array.from(range.getClientRects()).filter(
      (r) => r.width > 0 && r.height > 0,
    );
    if (rawRects.length === 0) {
      setPhraseSel(null);
      return;
    }

    const LINE_EPSILON = 3;
    const sortedRects = rawRects
      .slice()
      .sort((a, b) => a.top - b.top || a.left - b.left);
    const lineGroups: DOMRect[][] = [];
    for (const r of sortedRects) {
      const last = lineGroups[lineGroups.length - 1];
      if (
        last &&
        Math.abs(last[0].top - r.top) <= LINE_EPSILON &&
        Math.abs(last[0].bottom - r.bottom) <= LINE_EPSILON
      ) {
        last.push(r);
      } else {
        lineGroups.push([r]);
      }
    }

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const groupRects = lineGroups.map((line) => {
      const top = Math.min(...line.map((r) => r.top));
      const bottom = Math.max(...line.map((r) => r.bottom));
      const left = Math.min(...line.map((r) => r.left));
      const right = Math.max(...line.map((r) => r.right));
      return {
        top: top + scrollY,
        left: left + scrollX,
        width: right - left,
        height: bottom - top,
      };
    });

    const firstRect = sortedRects[0];
    const buttonTop = firstRect.top + scrollY;
    const buttonLeft = (firstRect.left + firstRect.right) / 2 + scrollX;

    const idx = text.indexOf(trimmed);
    const context =
      idx >= 0
        ? extractContext(text, idx, idx + trimmed.length)
        : text.slice(0, 300);

    setPhraseSel({
      text: trimmed,
      buttonTop,
      buttonLeft,
      groupRects,
      context,
    });
  }, [text]);

  useEffect(() => {
    const handler = () => refreshSelection();
    document.addEventListener('selectionchange', handler);
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      document.removeEventListener('selectionchange', handler);
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [refreshSelection]);

  async function handleClassifySelection() {
    if (!phraseSel) return;
    const selectedText = phraseSel.text;
    const context = phraseSel.context;

    window.getSelection()?.removeAllRanges();
    setPhraseSel(null);

    openModal();
    setPending({ state: 'loading', selectedText });
    const res = await classifyWord({ term: selectedText, context });
    if (!res.ok) {
      setPending({ state: 'error', selectedText, code: res.error });
      return;
    }
    setPending({
      state: 'ready',
      selectedText,
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
  }

  function handleModalClose() {
    closeModal();
    setPending({ state: 'idle' });
  }

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        本文を<strong>ドラッグで選択</strong>すると、選択範囲の上にボタンが出ます。助詞・語尾ごと選んでも AI が lemma に戻します。
      </Text>

      <Paper
        ref={paperRef}
        withBorder
        radius="md"
        p={{ base: 'md', md: 'xl' }}
        className={styles.paper}
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

      {/* Dotted outlines + anchored FAB (en-parity UX) */}
      {phraseSel ? (
        <Portal>
          {phraseSel.groupRects.map((r, i) => (
            <div
              key={i}
              className={styles.phraseOutline}
              style={{
                top: r.top - 2,
                left: r.left - 2,
                width: r.width + 4,
                height: r.height + 4,
              }}
              aria-hidden
            />
          ))}
          <div
            className={styles.phraseFab}
            style={{ top: phraseSel.buttonTop, left: phraseSel.buttonLeft }}
          >
            <Button
              color="grape"
              size="xs"
              leftSection={<Sparkles size={12} />}
              onMouseDown={(e) => {
                e.preventDefault();
                handleClassifySelection();
              }}
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}
            >
              「{truncate(phraseSel.text, 10)}」を登録
            </Button>
          </div>
        </Portal>
      ) : null}

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
