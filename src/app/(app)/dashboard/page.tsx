import {
  Badge,
  Card,
  Container,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  CalendarDays,
  Dumbbell,
  Flame,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { ButtonLink } from '@/app/_components/ButtonLink';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  STAGE_LABELS_JA,
  WORD_TYPE_LABELS_JA,
  type VocabStage,
  type WordType,
} from '@/types/db';

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const [statsRes, eventsRes, profileRes, recentRes, strugglingRes] =
    await Promise.all([
      supabase.rpc('vocab_stats'),
      supabase
        .from('review_events')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyAgo.toISOString()),
      supabase
        .from('profiles')
        .select('display_name, daily_goal')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_words')
        .select('id, lemma, meaning_ja, word_type, stage, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('user_words')
        .select('id')
        .eq('user_id', user.id)
        .neq('stage', 'mastered')
        .gt('lapses', 0),
    ]);

  const raw = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
  const stats = {
    total: Number(raw?.total_count ?? 0),
    due: Number(raw?.due_today_count ?? 0),
    mastered: Number(raw?.mastered_count ?? 0),
    memorize: Number(raw?.memorize_count ?? 0),
    recognize: Number(raw?.recognize_count ?? 0),
    produce: Number(raw?.produce_count ?? 0),
    sino: Number(raw?.sino_count ?? 0),
    native: Number(raw?.native_count ?? 0),
    loanword: Number(raw?.loanword_count ?? 0),
    mixed: Number(raw?.mixed_count ?? 0),
  };

  const dailyGoal = profileRes.data?.daily_goal ?? 10;
  const displayName = profileRes.data?.display_name ?? null;

  const daySet = new Set<string>();
  const dayCount: Record<string, number> = {};
  let doneToday = 0;
  for (const e of eventsRes.data ?? []) {
    const d = new Date(e.created_at);
    const day = isoDay(d);
    daySet.add(day);
    dayCount[day] = (dayCount[day] ?? 0) + 1;
    if (d >= todayStart) doneToday++;
  }
  let streak = 0;
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);
  while (daySet.has(isoDay(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const activityDays: Array<{ iso: string; date: Date; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = isoDay(d);
    activityDays.push({ iso, date: d, count: dayCount[iso] ?? 0 });
  }

  const strugglingCount = strugglingRes.data?.length ?? 0;
  const masteredPct =
    stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  const goalProgress =
    dailyGoal > 0 ? Math.min(100, (doneToday / dailyGoal) * 100) : 0;

  const recent = (recentRes.data ?? []) as Array<{
    id: string;
    lemma: string;
    meaning_ja: string;
    word_type: WordType;
    stage: VocabStage;
    created_at: string;
  }>;

  const dateLabel = new Intl.DateTimeFormat('ja-JP', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  return (
    <Container size="lg" py="lg">
      <Stack gap="xl">
        {/* Greeting */}
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Stack gap={4}>
            <Group gap={6}>
              <CalendarDays size={14} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="xs">
                {dateLabel}
              </Text>
            </Group>
            <Text fz={{ base: 28, md: 32 }} fw={700} lh={1.2}>
              {displayName ? `${displayName} さん、` : ''}안녕하세요
            </Text>
          </Stack>
          {streak > 0 ? (
            <Badge
              color="orange"
              variant="light"
              size="lg"
              leftSection={<Flame size={14} />}
            >
              {streak} 日連続
            </Badge>
          ) : null}
        </Group>

        {/* Today's work */}
        <Card
          withBorder
          radius="md"
          p={{ base: 'lg', md: 'xl' }}
          style={{
            background:
              stats.due > 0
                ? 'light-dark(color-mix(in srgb, var(--mantine-color-grape-1) 40%, var(--mantine-color-white)), color-mix(in srgb, var(--mantine-color-grape-9) 20%, var(--mantine-color-dark-7)))'
                : undefined,
          }}
        >
          <Group justify="space-between" wrap="wrap" gap="lg" align="center">
            <Stack gap="xs" style={{ minWidth: 0, flex: '1 1 280px' }}>
              <Group gap="xs">
                <ThemeIcon
                  size={32}
                  radius="md"
                  color="grape"
                  variant={stats.due > 0 ? 'filled' : 'light'}
                >
                  <Target size={16} />
                </ThemeIcon>
                <Text c="dimmed" size="xs" tt="uppercase" fw={600} lts={1}>
                  今日のやること
                </Text>
              </Group>
              <Text fz={{ base: 28, md: 36 }} fw={700} lh={1.15}>
                {stats.due > 0
                  ? `${stats.due} 語を復習`
                  : '今日の復習は完了 🎉'}
              </Text>
              <Text c="dimmed" size="sm">
                本日の目標 {doneToday} / {dailyGoal} 語
              </Text>
              <Progress
                value={goalProgress}
                color={goalProgress >= 100 ? 'teal' : 'grape'}
                size="sm"
                mt={4}
                maw={360}
              />
            </Stack>
            <Group gap="xs">
              {stats.due > 0 ? (
                <ButtonLink href="/review" size="md">
                  レビューを始める
                </ButtonLink>
              ) : (
                <ButtonLink href="/words/new" size="md" variant="light">
                  新しい単語を追加
                </ButtonLink>
              )}
              {strugglingCount > 0 ? (
                <ButtonLink
                  href="/words"
                  size="md"
                  variant="subtle"
                  color="grape"
                  leftSection={<Dumbbell size={14} />}
                >
                  弱点 {strugglingCount} 語
                </ButtonLink>
              ) : null}
            </Group>
          </Group>
        </Card>

        {/* Key stats */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <StatTile
            icon={<Layers size={16} />}
            color="gray"
            label="総語数"
            value={stats.total}
          />
          <StatTile
            icon={<TrendingUp size={16} />}
            color="yellow"
            label="定着"
            value={stats.mastered}
            sub={`${masteredPct}%`}
          />
          <StatTile
            icon={<Sparkles size={16} />}
            color="teal"
            label="本日の復習"
            value={doneToday}
            sub={`/ ${dailyGoal}`}
          />
          <StatTile
            icon={<Flame size={16} />}
            color="orange"
            label="連続日数"
            value={streak}
            sub={streak > 0 ? '日' : undefined}
          />
        </SimpleGrid>

        {/* Distributions */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>ステージ内訳</Text>
                <Text c="dimmed" size="xs">
                  全 {stats.total} 語
                </Text>
              </Group>
              {stats.total === 0 ? (
                <Text c="dimmed" size="sm">
                  単語を追加すると表示されます。
                </Text>
              ) : (
                <>
                  <SegmentBar
                    segments={[
                      { count: stats.memorize, color: 'gray' },
                      { count: stats.recognize, color: 'grape' },
                      { count: stats.produce, color: 'teal' },
                      { count: stats.mastered, color: 'yellow' },
                    ]}
                  />
                  <SimpleGrid cols={2} spacing="xs">
                    <LegendRow
                      color="gray"
                      label={STAGE_LABELS_JA.memorize}
                      count={stats.memorize}
                    />
                    <LegendRow
                      color="grape"
                      label={STAGE_LABELS_JA.recognize}
                      count={stats.recognize}
                    />
                    <LegendRow
                      color="teal"
                      label={STAGE_LABELS_JA.produce}
                      count={stats.produce}
                    />
                    <LegendRow
                      color="yellow"
                      label={STAGE_LABELS_JA.mastered}
                      count={stats.mastered}
                    />
                  </SimpleGrid>
                </>
              )}
            </Stack>
          </Card>

          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>分類内訳</Text>
                <Text c="dimmed" size="xs">
                  漢字語 / 固有語 / 外来語 / 混種語
                </Text>
              </Group>
              {stats.total === 0 ? (
                <Text c="dimmed" size="sm">
                  単語を追加すると表示されます。
                </Text>
              ) : (
                <>
                  <SegmentBar
                    segments={[
                      { count: stats.sino, color: 'indigo' },
                      { count: stats.native, color: 'green' },
                      { count: stats.loanword, color: 'pink' },
                      { count: stats.mixed, color: 'gray' },
                    ]}
                  />
                  <SimpleGrid cols={2} spacing="xs">
                    <LegendRow
                      color="indigo"
                      label={WORD_TYPE_LABELS_JA.sino_korean}
                      count={stats.sino}
                    />
                    <LegendRow
                      color="green"
                      label={WORD_TYPE_LABELS_JA.native_korean}
                      count={stats.native}
                    />
                    <LegendRow
                      color="pink"
                      label={WORD_TYPE_LABELS_JA.loanword}
                      count={stats.loanword}
                    />
                    <LegendRow
                      color="gray"
                      label={WORD_TYPE_LABELS_JA.mixed}
                      count={stats.mixed}
                    />
                  </SimpleGrid>
                </>
              )}
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Activity heatmap */}
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>14 日間の学習ログ</Text>
              <Text c="dimmed" size="xs">
                レビュー完了回数
              </Text>
            </Group>
            <Heatmap days={activityDays} />
          </Stack>
        </Card>

        {/* Recent */}
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={600}>最近追加した単語</Text>
                <Text c="dimmed" size="xs">
                  直近 5 件
                </Text>
              </Stack>
              <ButtonLink href="/words" size="xs" variant="subtle">
                単語帳へ
              </ButtonLink>
            </Group>
            {recent.length === 0 ? (
              <Text c="dimmed" size="sm">
                まだ単語がありません。
              </Text>
            ) : (
              <Stack gap="xs">
                {recent.map((r) => (
                  <Card key={r.id} withBorder radius="sm" p="sm">
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                        <Text fw={500} size="sm" truncate>
                          {r.lemma}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {r.meaning_ja}
                        </Text>
                      </Stack>
                      <Group gap={4}>
                        <Badge size="xs" variant="light" color="grape">
                          {WORD_TYPE_LABELS_JA[r.word_type]}
                        </Badge>
                        <Badge size="xs" variant="default">
                          {STAGE_LABELS_JA[r.stage]}
                        </Badge>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

/* ────────── Components ────────── */

function StatTile({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  color: 'gray' | 'teal' | 'yellow' | 'orange' | 'grape';
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="xs">
        <Group gap="xs" align="center">
          <ThemeIcon size={24} radius="sm" variant="light" color={color}>
            {icon}
          </ThemeIcon>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
            {label}
          </Text>
        </Group>
        <Group gap={6} align="baseline">
          <Text fz={{ base: 24, md: 30 }} fw={700} lh={1}>
            {value}
          </Text>
          {sub ? (
            <Text size="xs" c="dimmed">
              {sub}
            </Text>
          ) : null}
        </Group>
      </Stack>
    </Card>
  );
}

function SegmentBar({
  segments,
}: {
  segments: Array<{ count: number; color: string }>;
}) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        gap: 2,
        background:
          'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))',
      }}
    >
      {segments.map((s, i) =>
        s.count > 0 ? (
          <Tooltip key={i} label={`${s.count}`} withArrow>
            <div
              style={{
                flex: `${s.count} 0 0`,
                background: `var(--mantine-color-${s.color}-${s.color === 'gray' ? 4 : 5})`,
                minWidth: 6,
              }}
            />
          </Tooltip>
        ) : null,
      )}
    </div>
  );
}

function LegendRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: `var(--mantine-color-${color}-${color === 'gray' ? 4 : 5})`,
          flexShrink: 0,
        }}
      />
      <Text size="xs">{label}</Text>
      <Text size="xs" c="dimmed" ml="auto">
        {count}
      </Text>
    </Group>
  );
}

function Heatmap({
  days,
}: {
  days: Array<{ iso: string; date: Date; count: number }>;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const fmt = new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(14, 1fr)',
        gap: 4,
      }}
    >
      {days.map((d) => {
        const intensity = d.count === 0 ? 0 : 0.22 + (d.count / max) * 0.78;
        const bg =
          d.count === 0
            ? 'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))'
            : `color-mix(in srgb, var(--mantine-color-grape-6) ${intensity * 100}%, transparent)`;
        return (
          <Tooltip
            key={d.iso}
            label={`${fmt.format(d.date)} · ${d.count}`}
            withArrow
          >
            <div
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 3,
                background: bg,
              }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}
