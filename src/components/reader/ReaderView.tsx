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
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useMemo, useRef, useState } from 'react';

import { SpeechButton } from '@/components/common/SpeechButton';
import { classifyWord } from '@/lib/actions/classify';
import { saveWord } from '@/lib/actions/save-word';
import type { ClassifiedWord } from '@/lib/ai/schemas';
import { WORD_TYPE_LABELS_JA } from '@/types/db';

import styles from './ReaderView.module.css';

/**
 * A rendered piece of the body:
 *   - `char`: a single non-whitespace character at position `ci` in the
 *     original text. It's a pointer-interactive span; its index is what we
 *     track during a drag.
 *   - `space`: one or more whitespace characters. Rendered plain — no span,
 *     no tracking, but visually bridged with `.bridge` when a selection
 *     wraps around it.
 */
type Piece =
  | { kind: 'char'; ci: number; ch: string }
  | { kind: 'space'; ci: number; text: string };

function tokenize(body: string): Piece[] {
  const out: Piece[] = [];
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (/\s/.test(c)) {
      let j = i;
      while (j < body.length && /\s/.test(body[j])) j++;
      out.push({ kind: 'space', ci: i, text: body.slice(i, j) });
      i = j;
    } else {
      out.push({ kind: 'char', ci: i, ch: c });
      i++;
    }
  }
  return out;
}

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
  /** Inclusive character index range into the body. */
  lo: number;
  hi: number;
  buttonTop: number;
  buttonLeft: number;
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

/** Return the character index under (x, y), or null if not over a char span. */
function charIndexAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return null;
  const span = el.closest<HTMLElement>('[data-ci]');
  if (!span) return null;
  const n = Number(span.dataset.ci);
  return Number.isFinite(n) ? n : null;
}

/**
 * Korean passage reader with **per-character** drag selection.
 *
 * Each non-whitespace character is its own span so the user can pick exactly
 * the characters they want — e.g. just 학교 out of 학교에서 — without being
 * constrained to whitespace-separated 어절 boundaries. Native text selection
 * is disabled so iOS's copy/translate callout never appears.
 *
 *   - Tap a single character → currently no-op (need at least 2 chars to
 *     classify since a single Hangul block is usually not a meaningful word
 *     on its own). To register a single Hangul character, drag over it to
 *     itself, which still counts as a 1-char selection.
 *   - Drag across 2+ characters → highlight + floating "register" FAB above
 *     the first selected char. Clicking it runs classifyWord and saves.
 *   - Whitespace inside a range is visually bridged and included in the
 *     selected text when submitted (so multi-어절 phrases keep their space).
 *   - Scroll gestures cancel via pointercancel.
 */
export function ReaderView({ text }: { text: string }) {
  const pieces = useMemo(() => tokenize(text), [text]);

  const [savedLemmas, setSavedLemmas] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingClassify>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [phraseSel, setPhraseSel] = useState<PhraseSel | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const paperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragEndRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);

  function computeFabAnchor(ci: number): { top: number; left: number } | null {
    const paper = paperRef.current;
    if (!paper) return null;
    const span = paper.querySelector<HTMLElement>(`[data-ci="${ci}"]`);
    if (!span) return null;
    const rect = span.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: (rect.left + rect.right) / 2 + window.scrollX,
    };
  }

  function setRange(startCi: number, endCi: number) {
    const lo = Math.min(startCi, endCi);
    const hi = Math.max(startCi, endCi);
    // Trim leading/trailing whitespace out of the range (doesn't affect text
    // slicing since we index back into `text`, but makes the FAB anchor and
    // the char-highlight set consistent with what the user "sees" as selected).
    let trimLo = lo;
    while (trimLo <= hi && /\s/.test(text[trimLo] ?? '')) trimLo++;
    let trimHi = hi;
    while (trimHi >= trimLo && /\s/.test(text[trimHi] ?? '')) trimHi--;
    if (trimLo > trimHi) {
      setPhraseSel(null);
      return;
    }
    const anchor = computeFabAnchor(trimLo);
    if (!anchor) {
      setPhraseSel(null);
      return;
    }
    setPhraseSel({
      lo: trimLo,
      hi: trimHi,
      buttonTop: anchor.top,
      buttonLeft: anchor.left,
    });
  }

  function resetDrag() {
    dragActiveRef.current = false;
    dragStartRef.current = null;
    dragEndRef.current = null;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== undefined && e.button !== 0) return;
    const ci = charIndexAt(e.clientX, e.clientY);
    if (ci === null) return;
    dragStartRef.current = ci;
    dragEndRef.current = ci;
    dragActiveRef.current = true;
    setPhraseSel(null);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragActiveRef.current) return;
    const ci = charIndexAt(e.clientX, e.clientY);
    if (ci === null || ci === dragEndRef.current) return;
    dragEndRef.current = ci;
    setRange(dragStartRef.current!, ci);
  }

  function handlePointerUp() {
    if (!dragActiveRef.current) return;
    const startCi = dragStartRef.current;
    const endCi = dragEndRef.current;
    resetDrag();
    if (startCi === null || endCi === null) return;
    setRange(startCi, endCi);
  }

  function handlePointerCancel() {
    resetDrag();
    setPhraseSel(null);
  }

  async function runClassify(lo: number, hi: number) {
    const selectedText = text.slice(lo, hi + 1).trim();
    if (!selectedText) return;
    const context = extractContext(text, lo, hi + 1);

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

  const savedSet = useMemo(() => new Set(savedLemmas), [savedLemmas]);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        読みたい文字を<strong>ドラッグで選択</strong>すると、上に「登録」ボタンが出ます。1 文字からでも OK（助詞・語尾ごと選んでも AI が lemma に戻します）。
      </Text>

      <Paper
        ref={paperRef}
        withBorder
        radius="md"
        p={{ base: 'md', md: 'xl' }}
        className={styles.paper}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {pieces.map((piece) => {
          if (piece.kind === 'space') {
            // Bridge the background across whitespace when both flanks are in range.
            const flanked =
              phraseSel !== null &&
              piece.ci > phraseSel.lo &&
              piece.ci + piece.text.length <= phraseSel.hi + 1;
            return (
              <span
                key={`s-${piece.ci}`}
                className={flanked ? styles.bridge : undefined}
              >
                {piece.text}
              </span>
            );
          }
          const inRange =
            phraseSel !== null &&
            piece.ci >= phraseSel.lo &&
            piece.ci <= phraseSel.hi;
          const isSaved = savedSet.has(piece.ch);
          const cls = [
            styles.char,
            inRange ? styles.selected : null,
            isSaved ? styles.saved : null,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <span key={`c-${piece.ci}`} data-ci={piece.ci} className={cls}>
              {piece.ch}
            </span>
          );
        })}
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

      {/* FAB anchored above the first selected character. */}
      {phraseSel ? (
        <Portal>
          <div
            className={styles.phraseFab}
            style={{ top: phraseSel.buttonTop, left: phraseSel.buttonLeft }}
          >
            <Button
              color="grape"
              size="xs"
              leftSection={<Sparkles size={12} />}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void runClassify(phraseSel.lo, phraseSel.hi);
              }}
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}
            >
              「{truncate(text.slice(phraseSel.lo, phraseSel.hi + 1), 10)}」を登録
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
