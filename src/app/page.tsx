import {
  Badge,
  Box,
  Card,
  Container,
  Divider,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  BookOpen,
  Brain,
  Layers,
  MousePointerClick,
  PenLine,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { ButtonLink } from '@/app/_components/ButtonLink';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Box>
      {/* ────────────── Hero ────────────── */}
      <Box
        style={{
          borderBottom:
            '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
        }}
      >
        <Container size="lg" py={{ base: 56, md: 112 }}>
          <Flex gap={48} wrap="wrap" align="center">
            <Box style={{ flex: '1 1 420px', minWidth: 0 }}>
              <Stack gap="lg" align="flex-start">
                <Text c="dimmed" size="sm" tt="uppercase" fw={600} lts={1.5}>
                  ko-word-book — 韓国語を、拾って、仕分けて、使えるまで
                </Text>
                <Title order={1} fz={{ base: 36, md: 56 }} lh={1.15}>
                  TOPIK と日常会話の語彙を、<br />
                  分類して、例文で、定着させる。
                </Title>
                <Text size="lg" c="dimmed" maw={560} lh={1.75}>
                  ニュース・K-drama・教科書。どこで出会った韓国語でも、
                  <strong>ドラッグで選択するだけ</strong>
                  で AI が辞書形に戻して分類し、TOPIK 風と日常会話の例文を添えて単語帳に登録。SM-2 で暗記→文中認識→定着まで連れて行きます。
                </Text>
                <Group gap="sm" mt="md">
                  {user ? (
                    <>
                      <ButtonLink href="/dashboard" size="md">
                        ダッシュボードへ
                      </ButtonLink>
                      <ButtonLink href="/read" size="md" variant="subtle">
                        読み始める
                      </ButtonLink>
                    </>
                  ) : (
                    <>
                      <ButtonLink href="/login" size="md">
                        はじめる
                      </ButtonLink>
                      <ButtonLink href="/login" size="md" variant="subtle">
                        ログイン
                      </ButtonLink>
                    </>
                  )}
                </Group>
              </Stack>
            </Box>
            <Box style={{ flex: '1 1 360px', minWidth: 0 }}>
              <KoWordPreview />
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* ────────────── Features ────────────── */}
      <Container size="lg" py={{ base: 56, md: 96 }}>
        <Stack gap="xl">
          <Stack gap="xs" align="flex-start">
            <Text c="dimmed" size="sm" tt="uppercase" fw={600} lts={1.5}>
              できること
            </Text>
            <Title order={2} fz={{ base: 28, md: 40 }} lh={1.2}>
              韓国語の語彙を、1 本の流れで。
            </Title>
          </Stack>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <FeatureCard
              icon={<MousePointerClick size={22} />}
              title="ドラッグで単語を拾う"
              body="長文・字幕・歌詞をペースト。知らない語句や熟語を指でなぞって選ぶと、AI が辞書形に戻して登録してくれます。トークナイザ不要。"
            />
            <FeatureCard
              icon={<Sparkles size={22} />}
              title="AI が分類 + 例文を自動生成"
              body="漢字語 / 固有語 / 外来語 / 混種語 の分類、日常会話度のスコア、TOPIK 風と日常会話の例文（日本語訳つき）を AI が一括で付与します。"
            />
            <FeatureCard
              icon={<Brain size={22} />}
              title="SM-2 で定着まで"
              body="暗記 → 文中認識の 2 段階で間隔反復。毎日の復習はダッシュボードに集約、弱点（lapse した語）もひと目で分かります。"
            />
          </SimpleGrid>
        </Stack>
      </Container>

      {/* ────────────── Flow (3 stages) ────────────── */}
      <Box
        style={{
          background:
            'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
          borderTop:
            '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
          borderBottom:
            '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
        }}
      >
        <Container size="lg" py={{ base: 56, md: 96 }}>
          <Stack gap="xl">
            <Stack gap="xs" align="flex-start">
              <Text c="dimmed" size="sm" tt="uppercase" fw={600} lts={1.5}>
                学習フロー
              </Text>
              <Title order={2} fz={{ base: 28, md: 40 }} lh={1.2}>
                拾う → 仕分ける → 使えるまで
              </Title>
              <Text c="dimmed" size="lg" maw={680} lh={1.7}>
                韓国語の膠着語的な性質（語尾・助詞がくっつく）に合わせて、トークン化ではなく範囲選択を軸にしたフロー。韓国語学習に最適化されています。
              </Text>
            </Stack>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              <StageCard
                step="01"
                icon={<PenLine size={18} />}
                color="gray"
                label="CAPTURE"
                title="拾う"
                body="読む画面に韓国語テキストを貼り、気になった語句をドラッグ選択。手入力や文章ペーストからの一括抽出にも対応。"
              />
              <StageCard
                step="02"
                icon={<Target size={18} />}
                color="grape"
                label="CLASSIFY"
                title="仕分ける"
                body="AI が lemma に正規化し、漢字語 / 固有語 / 外来語 / 混種語のタグ、TOPIK 級の推定、日常会話度（0-100）、例文 2 種を一気に付与。"
              />
              <StageCard
                step="03"
                icon={<TrendingUp size={18} />}
                color="teal"
                label="RETAIN"
                title="使えるまで定着"
                body="SM-2 スケジュールで復習。暗記（韓 → 日）、文中認識（日 → 韓、例文ヒント付き）と段階を上げ、lapse した弱点を優先的に再出題。"
              />
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ────────────── CTA strip ────────────── */}
      <Container size="lg" py={{ base: 56, md: 96 }}>
        <Paper
          withBorder
          radius="lg"
          p={{ base: 'lg', md: 40 }}
          style={{ textAlign: 'center' }}
        >
          <Stack gap="md" align="center">
            <ThemeIcon size={48} radius="xl" variant="light" color="grape">
              <Layers size={22} />
            </ThemeIcon>
            <Title order={2} fz={{ base: 24, md: 32 }} lh={1.3}>
              単語を 1 つ、登録するところから。
            </Title>
            <Text c="dimmed" maw={520} lh={1.7}>
              サインインして好きな韓国語の一節を貼り付け、気になった語句をドラッグで選ぶだけ。最初の語が単語帳に入るまで 10 秒です。
            </Text>
            <Group gap="sm" mt="xs">
              {user ? (
                <>
                  <ButtonLink href="/read" size="md">
                    読み始める
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="md" variant="subtle">
                    ダッシュボード
                  </ButtonLink>
                </>
              ) : (
                <>
                  <ButtonLink href="/login" size="md">
                    はじめる
                  </ButtonLink>
                  <ButtonLink href="/login" size="md" variant="subtle">
                    ログイン
                  </ButtonLink>
                </>
              )}
            </Group>
          </Stack>
        </Paper>
      </Container>

      {/* ────────────── Footer ────────────── */}
      <Box
        style={{
          borderTop:
            '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
        }}
      >
        <Container size="lg" py="lg">
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text c="dimmed" size="xs">
              © 2026 ko-word-book
            </Text>
            <Text c="dimmed" size="xs">
              個人学習用 · TOPIK + 日常会話
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}

/* ──────────────────────────────── */

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="sm">
        <ThemeIcon variant="light" color="grape" size={40} radius="md">
          {icon}
        </ThemeIcon>
        <Title order={3} size="h5" lh={1.3}>
          {title}
        </Title>
        <Text c="dimmed" size="sm" lh={1.7}>
          {body}
        </Text>
      </Stack>
    </Card>
  );
}

function StageCard({
  step,
  icon,
  color,
  label,
  title,
  body,
}: {
  step: string;
  icon: React.ReactNode;
  color: 'gray' | 'grape' | 'teal';
  label: string;
  title: string;
  body: string;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="sm">
        <Group gap="xs" align="center">
          <Text c="dimmed" fw={700} size="xs" ff="monospace">
            {step}
          </Text>
          <ThemeIcon size={28} radius="sm" variant="light" color={color}>
            {icon}
          </ThemeIcon>
          <Badge variant="light" color={color} size="xs">
            {label}
          </Badge>
        </Group>
        <Title order={3} size="h5" lh={1.3}>
          {title}
        </Title>
        <Text c="dimmed" size="sm" lh={1.7}>
          {body}
        </Text>
      </Stack>
    </Card>
  );
}

/** Static mock of a vocab card — Korean word with classification + examples. */
function KoWordPreview() {
  const hlStyle: React.CSSProperties = {
    backgroundColor:
      'light-dark(color-mix(in srgb, var(--mantine-color-grape-1) 65%, transparent), color-mix(in srgb, var(--mantine-color-grape-9) 45%, transparent))',
    borderRadius: 3,
    padding: '0 2px',
  };

  return (
    <Paper
      withBorder
      radius="lg"
      p={{ base: 'md', md: 'xl' }}
      shadow="sm"
      style={{ overflow: 'hidden' }}
    >
      <Stack gap="md">
        <Group gap={6} wrap="wrap">
          <Badge size="xs" color="grape" variant="light">
            漢字語
          </Badge>
          <Badge size="xs" variant="default">
            noun
          </Badge>
          <Badge size="xs" variant="outline">
            TOPIK 2
          </Badge>
          <Badge size="xs" variant="outline" color="gray">
            日常度 82
          </Badge>
        </Group>

        <Group gap="sm" align="baseline">
          <Title order={2} size={32} lh={1.1}>
            약속
          </Title>
          <Text c="dimmed" size="sm" ff="monospace">
            約束
          </Text>
        </Group>
        <Text size="md" fw={500}>
          約束、アポイントメント
        </Text>

        <Divider />

        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
            TOPIK 風
          </Text>
          <Text size="sm" lh={1.8}>
            <span style={hlStyle}>약속</span> 시간에 늦지 않도록 조심해야 합니다.
          </Text>
          <Text size="xs" c="dimmed">
            約束の時間に遅れないよう気をつけなければなりません。
          </Text>
        </Stack>

        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
            日常会話
          </Text>
          <Text size="sm" lh={1.8}>
            오늘 <span style={hlStyle}>약속</span> 있어서 좀 바빠.
          </Text>
          <Text size="xs" c="dimmed">
            今日、約束があってちょっと忙しいんだ。
          </Text>
        </Stack>

        <Card withBorder radius="sm" p="xs">
          <Group gap={6}>
            <BookOpen size={12} />
            <Text size="xs" c="dimmed">
              💡 約 (약) は「約束・予約」の意味で広く使う。연락 (連絡) とよくセットで出る。
            </Text>
          </Group>
        </Card>
      </Stack>
    </Paper>
  );
}
