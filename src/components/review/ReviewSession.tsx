'use client';

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  ArrowRight,
  Check,
  CircleCheckBig,
  Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';

import { SpeechButton } from '@/components/common/SpeechButton';
import { submitReview } from '@/lib/actions/review';
import { STAGE_LABELS_JA, WORD_TYPE_LABELS_JA, type VocabStage, type WordType } from '@/types/db';

export type ReviewCard = {
  id: string;
  lemma: string;
  hanja: string | null;
  phonetic: string | null;
  word_type: WordType;
  part_of_speech: string | null;
  meaning_ja: string;
  example_topik: string | null;
  example_topik_ja: string | null;
  example_daily: string | null;
  example_daily_ja: string | null;
  notes: string | null;
  stage: VocabStage;
};

type Result = {
  card: ReviewCard;
  quality: number;
  stageBefore: VocabStage;
  stageAfter: VocabStage;
  intervalDays: number;
};

const STAGE_COLOR: Record<VocabStage, string> = {
  memorize: 'gray',
  recognize: 'grape',
  produce: 'teal',
  mastered: 'green',
};

function StageBadge({ stage, size }: { stage: VocabStage; size?: 'xs' | 'sm' }) {
  return (
    <Badge color={STAGE_COLOR[stage]} variant="light" size={size ?? 'sm'}>
      {STAGE_LABELS_JA[stage]}
    </Badge>
  );
}

export function ReviewSession({
  cards,
  exitHref,
}: {
  cards: ReviewCard[];
  exitHref: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  // Synchronous guard so a double-tap can't pass the busy check twice before
  // React has flushed the busy=true state update. Without this, a single
  // rapid double-click skips the next card because setIndex(i+1) runs twice.
  const submittingRef = useRef(false);

  const handleAnswer = useCallback(
    (card: ReviewCard) => (quality: number) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setBusy(true);
      startTransition(async () => {
        const result = await submitReview({ userWordId: card.id, quality });
        if (result.ok) {
          setResults((prev) => [
            ...prev,
            {
              card,
              quality,
              stageBefore: result.stageBefore,
              stageAfter: result.stageAfter,
              intervalDays: result.intervalDays,
            },
          ]);
          setIndex((i) => i + 1);
          setCardKey((k) => k + 1);
        }
        submittingRef.current = false;
        setBusy(false);
      });
    },
    [],
  );

  if (cards.length === 0) {
    return (
      <Stack gap="md" align="flex-start">
        <Title order={2}>すべて復習済みです</Title>
        <Text c="dimmed">今日の復習はありません。新しい単語を追加しましょう。</Text>
        <Button component="a" href={exitHref} variant="light">
          戻る
        </Button>
      </Stack>
    );
  }

  if (index >= cards.length) {
    return (
      <SessionSummary
        results={results}
        exitHref={exitHref}
        onBack={() => router.push(exitHref)}
      />
    );
  }

  const card = cards[index];

  return (
    <Stack gap="md" maw={680}>
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed" fw={500}>
          {index + 1} / {cards.length}
        </Text>
        <StageBadge stage={card.stage} />
      </Group>
      <Progress
        value={((index + 1) / cards.length) * 100}
        size="sm"
        color="grape"
      />

      <Paper withBorder radius="md" p="lg">
        {card.stage === 'recognize' ? (
          <RecognizeCard
            key={cardKey}
            card={card}
            busy={busy}
            onRate={handleAnswer(card)}
          />
        ) : (
          // memorize stage (and fallback for produce/mastered which shouldn't appear in due queue)
          <MemorizeCard
            key={cardKey}
            card={card}
            busy={busy}
            onRate={handleAnswer(card)}
          />
        )}
      </Paper>
    </Stack>
  );
}

function MemorizeCard({
  card,
  busy,
  onRate,
}: {
  card: ReviewCard;
  busy: boolean;
  onRate: (quality: number) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Stack gap="md" align="center">
      <Group gap="xs" wrap="wrap" justify="center">
        <Badge size="xs" variant="light" color="grape">
          {WORD_TYPE_LABELS_JA[card.word_type]}
        </Badge>
        {card.part_of_speech ? (
          <Badge size="xs" variant="default">
            {card.part_of_speech}
          </Badge>
        ) : null}
      </Group>
      <Title order={1} ta="center" size={44} lh={1.2}>
        {card.lemma}
      </Title>
      <Group gap="xs">
        <SpeechButton text={card.lemma} size="md" />
        <SpeechButton text={card.lemma} slow size="md" label="ゆっくり" />
      </Group>

      {!revealed ? (
        <Button
          leftSection={<Eye size={16} />}
          onClick={() => setRevealed(true)}
          variant="light"
          size="md"
        >
          意味を表示
        </Button>
      ) : (
        <Stack gap="md" w="100%">
          <Divider />
          <Text ta="center" size="xl" fw={500}>
            {card.meaning_ja}
          </Text>
          {card.hanja ? (
            <Text ta="center" c="dimmed" size="sm" ff="monospace">
              {card.hanja}
            </Text>
          ) : null}
          {card.phonetic ? (
            <Text ta="center" size="sm" c="grape" ff="monospace">
              実際の発音：{card.phonetic}
            </Text>
          ) : null}
          <ExampleBlocks card={card} />
          {card.notes ? (
            <Text size="xs" c="dimmed" ta="center">
              💡 {card.notes}
            </Text>
          ) : null}
          <RateButtons onRate={onRate} disabled={busy} />
        </Stack>
      )}
    </Stack>
  );
}

function normalize(s: string): string {
  return s.replace(/\s+/g, '').trim();
}

function RecognizeCard({
  card,
  busy,
  onRate,
}: {
  card: ReviewCard;
  busy: boolean;
  onRate: (quality: number) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const userCorrect =
    answer.trim().length > 0 && normalize(answer) === normalize(card.lemma);
  const hintJa = card.example_daily_ja || card.example_topik_ja;

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text c="dimmed" size="xs" tt="uppercase" fw={600} lts={1}>
          この意味の韓国語は？
        </Text>
        <Text size="xl" fw={500} lh={1.4}>
          {card.meaning_ja}
        </Text>
        {hintJa ? (
          <Text size="sm" c="dimmed" fs="italic" mt="xs">
            ヒント（この例文の空所に入る語）：
            <br />
            {hintJa.replace(new RegExp(card.lemma, 'g'), '＿＿＿')}
          </Text>
        ) : null}
      </Stack>

      <TextInput
        placeholder="韓国語で入力"
        value={answer}
        onChange={(e) => setAnswer(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !revealed && answer.trim()) setRevealed(true);
        }}
        disabled={revealed}
        size="md"
        autoFocus
      />

      {!revealed ? (
        <Button
          leftSection={<Eye size={16} />}
          onClick={() => setRevealed(true)}
          variant="light"
        >
          答え合わせ
        </Button>
      ) : (
        <Stack gap="sm">
          <Group justify="space-between" wrap="wrap">
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                あなたの回答:
              </Text>
              <Text size="sm" fw={500}>
                {answer.trim() || '（未入力）'}
              </Text>
              {userCorrect ? (
                <Badge color="teal" leftSection={<Check size={12} />} size="xs">
                  正解
                </Badge>
              ) : null}
            </Group>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                正解:
              </Text>
              <Text size="sm" fw={700}>
                {card.lemma}
              </Text>
              {card.hanja ? (
                <Text size="xs" c="dimmed" ff="monospace">
                  {card.hanja}
                </Text>
              ) : null}
              {card.phonetic ? (
                <Text size="xs" c="grape" ff="monospace">
                  {card.phonetic}
                </Text>
              ) : null}
              <SpeechButton text={card.lemma} size="sm" />
            </Group>
          </Group>
          <Divider />
          <ExampleBlocks card={card} />
          {card.notes ? (
            <Text size="xs" c="dimmed">
              💡 {card.notes}
            </Text>
          ) : null}
          <Divider />
          <RateButtons onRate={onRate} disabled={busy} />
        </Stack>
      )}
    </Stack>
  );
}

function ExampleBlocks({ card }: { card: ReviewCard }) {
  return (
    <Stack gap="sm">
      {card.example_topik ? (
        <Stack gap={2}>
          <Group gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
              TOPIK 風
            </Text>
            <SpeechButton text={card.example_topik} size="sm" />
          </Group>
          <Text size="sm">{card.example_topik}</Text>
          {card.example_topik_ja ? (
            <Text size="xs" c="dimmed">
              {card.example_topik_ja}
            </Text>
          ) : null}
        </Stack>
      ) : null}
      {card.example_daily ? (
        <Stack gap={2}>
          <Group gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
              日常会話
            </Text>
            <SpeechButton text={card.example_daily} size="sm" />
          </Group>
          <Text size="sm">{card.example_daily}</Text>
          {card.example_daily_ja ? (
            <Text size="xs" c="dimmed">
              {card.example_daily_ja}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}

function RateButtons({
  onRate,
  disabled,
}: {
  onRate: (quality: number) => void;
  disabled: boolean;
}) {
  return (
    <Group grow gap="xs">
      <Button color="red" variant="light" onClick={() => onRate(1)} disabled={disabled}>
        もう一度
      </Button>
      <Button color="yellow" variant="light" onClick={() => onRate(3)} disabled={disabled}>
        難しい
      </Button>
      <Button color="grape" variant="light" onClick={() => onRate(4)} disabled={disabled}>
        できた
      </Button>
      <Button color="teal" variant="light" onClick={() => onRate(5)} disabled={disabled}>
        かんたん
      </Button>
    </Group>
  );
}

function SessionSummary({
  results,
  exitHref,
  onBack,
}: {
  results: Result[];
  exitHref: string;
  onBack: () => void;
}) {
  const advanced = results.filter((r) => r.stageAfter !== r.stageBefore).length;
  const mastered = results.filter((r) => r.stageAfter === 'mastered').length;
  const lapsed = results.filter((r) => r.quality < 3).length;

  return (
    <Stack gap="lg" maw={680}>
      <Group gap="xs">
        <CircleCheckBig size={20} />
        <Title order={2}>セッション完了</Title>
      </Group>
      <Text c="dimmed" size="sm">
        {results.length} 語を復習しました。
      </Text>

      <Group gap="md">
        <SummaryStat label="昇格" value={advanced} />
        <SummaryStat label="定着" value={mastered} />
        <SummaryStat label="要復習" value={lapsed} />
      </Group>

      <Stack gap="xs">
        {results.map((r, i) => (
          <Paper key={i} withBorder radius="sm" p="sm">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" fw={500} style={{ flex: 1, minWidth: 0 }} truncate>
                {r.card.lemma}
              </Text>
              <Group gap="xs">
                <StageBadge stage={r.stageAfter} size="xs" />
                <Text size="xs" c="dimmed">
                  {r.intervalDays < 1
                    ? `${Math.round(r.intervalDays * 24 * 60)} 分後`
                    : `${Math.round(r.intervalDays)} 日後`}
                </Text>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>

      <Button
        component="a"
        href={exitHref}
        variant="light"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        rightSection={<ArrowRight size={14} />}
      >
        戻る
      </Button>
    </Stack>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <Card withBorder radius="md" p="md">
      <Stack gap={2}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
          {label}
        </Text>
        <Text size="xl" fw={700}>
          {value}
        </Text>
      </Stack>
    </Card>
  );
}
