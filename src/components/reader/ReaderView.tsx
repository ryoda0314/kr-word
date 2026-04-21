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

type Part =
  | { kind: 'space'; text: string }
  | { kind: 'token'; id: number; text: string };

/** Split the body into whitespace + non-whitespace (어절) runs. */
function tokenize(body: string): Part[] {
  const parts: Part[] = [];
  let id = 0;
  const re = /(\s+)|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m[1]) parts.push({ kind: 'space', text: m[1] });
    else if (m[2]) parts.push({ kind: 'token', id: id++, text: m[2] });
  }
  return parts;
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
  tokenIds: Set<number>;
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

function tokenIdAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return null;
  const span = el.closest<HTMLElement>('[data-token-id]');
  if (!span) return null;
  const n = Number(span.dataset.tokenId);
  return Number.isFinite(n) ? n : null;
}

/**
 * Korean passage reader. The body is whitespace-tokenized into 어절 and each
 * chunk is rendered as a pointer-interactive span. Native text selection is
 * disabled (via user-select: none) so iOS's copy/translate callout never
 * appears; drag-to-extend uses pointer events instead.
 *
 *   - Tap → classify that one 어절 immediately
 *   - Drag across multiple 어절 → highlight + floating "register" FAB
 *   - Scroll gesture cancels the drag via pointercancel
 */
export function ReaderView({ text }: { text: string }) {
  const parts = useMemo(() => tokenize(text), [text]);
  const tokenTexts = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of parts) if (p.kind === 'token') m.set(p.id, p.text);
    return m;
  }, [parts]);

  const [savedLemmas, setSavedLemmas] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingClassify>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [phraseSel, setPhraseSel] = useState<PhraseSel | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const paperRef = useRef<HTMLDivElement>(null);
  const dragStartIdRef = useRef<number | null>(null);
  const dragEndIdRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);

  function computeFabAnchor(firstId: number): { top: number; left: number } | null {
    const paper = paperRef.current;
    if (!paper) return null;
    const firstSpan = paper.querySelector<HTMLElement>(
      `[data-token-id="${firstId}"]`,
    );
    if (!firstSpan) return null;
    const rect = firstSpan.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: (rect.left + rect.right) / 2 + window.scrollX,
    };
  }

  function setSelectionRange(startId: number, endId: number) {
    const lo = Math.min(startId, endId);
    const hi = Math.max(startId, endId);
    const ids = new Set<number>();
    for (let i = lo; i <= hi; i++) ids.add(i);
    const anchor = computeFabAnchor(lo);
    if (!anchor) {
      setPhraseSel(null);
      return;
    }
    setPhraseSel({
      tokenIds: ids,
      buttonTop: anchor.top,
      buttonLeft: anchor.left,
    });
  }

  function resetDrag() {
    dragActiveRef.current = false;
    dragStartIdRef.current = null;
    dragEndIdRef.current = null;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== undefined && e.button !== 0) return; // left mouse / touch only
    const id = tokenIdAt(e.clientX, e.clientY);
    if (id === null) return;
    dragStartIdRef.current = id;
    dragEndIdRef.current = id;
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
    const id = tokenIdAt(e.clientX, e.clientY);
    if (id === null) return;
    if (id === dragEndIdRef.current) return;
    dragEndIdRef.current = id;
    setSelectionRange(dragStartIdRef.current!, id);
  }

  function handlePointerUp() {
    if (!dragActiveRef.current) return;
    const startId = dragStartIdRef.current;
    const endId = dragEndIdRef.current;
    resetDrag();
    if (startId === null || endId === null) return;
    const lo = Math.min(startId, endId);
    const hi = Math.max(startId, endId);
    if (lo === hi) {
      // Single tap — classify right away.
      setPhraseSel(null);
      void runClassify(new Set([lo]));
    } else {
      // Multi-token selection — keep highlight + FAB shown until the user
      // either clicks the FAB or taps elsewhere.
      setSelectionRange(lo, hi);
    }
  }

  function handlePointerCancel() {
    // Scroll / gesture hijack — just drop the drag state.
    resetDrag();
    setPhraseSel(null);
  }

  async function runClassify(ids: Set<number>) {
    const sortedIds = Array.from(ids).sort((a, b) => a - b);
    const tokens = sortedIds
      .map((i) => tokenTexts.get(i))
      .filter((t): t is string => Boolean(t));
    const selectedText = tokens.join(' ');
    const idx = text.indexOf(selectedText);
    const context =
      idx >= 0
        ? extractContext(text, idx, idx + selectedText.length)
        : text.slice(0, 300);

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
        語を<strong>タップ</strong>で単語帳に追加。複数語は<strong>ドラッグ</strong>でつなげて選択できます。助詞・語尾ごと選んでも AI が lemma に戻します。
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
        {parts.map((p, i) => {
          if (p.kind === 'space') {
            return <span key={`s-${i}`}>{p.text}</span>;
          }
          const isSelected = phraseSel?.tokenIds.has(p.id) ?? false;
          const isSaved = savedSet.has(p.text);
          const cls = [
            styles.token,
            isSelected ? styles.selected : null,
            isSaved ? styles.saved : null,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <span key={`t-${p.id}`} data-token-id={p.id} className={cls}>
              {p.text}
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

      {/* FAB anchored above first selected token (multi-token selections). */}
      {phraseSel && phraseSel.tokenIds.size > 1 ? (
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
                void runClassify(phraseSel.tokenIds);
              }}
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}
            >
              {phraseSel.tokenIds.size} 語を登録
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
