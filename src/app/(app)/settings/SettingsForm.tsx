'use client';

import {
  Alert,
  Button,
  Card,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { AlertCircle, Check, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { updateProfile } from '@/lib/actions/update-profile';

export function SettingsForm({
  email,
  timezone,
  initial,
}: {
  email: string;
  timezone: string;
  initial: {
    display_name: string | null;
    daily_goal: number;
  };
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name ?? '');
  const [dailyGoal, setDailyGoal] = useState(initial.daily_goal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await updateProfile({
      display_name: displayName.trim() || null,
      daily_goal: dailyGoal,
    });
    setSaving(false);
    if (!res.ok) {
      setError(describeError(res.error));
      return;
    }
    setNotice('保存しました。');
    router.refresh();
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="md">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
            アカウント
          </Text>
          <Text size="sm">
            <Text component="span" c="dimmed">
              メール：
            </Text>
            {email}
          </Text>
          <Text size="sm">
            <Text component="span" c="dimmed">
              タイムゾーン：
            </Text>
            {timezone}
          </Text>
        </Stack>
      </Card>

      <Stack gap="md">
        <TextInput
          label="表示名"
          placeholder="例: えだまめ"
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
          description="ダッシュボードの挨拶に表示されます。"
          maxLength={50}
        />

        <NumberInput
          label="1 日の目標語数"
          description="ダッシュボードの進捗バーの基準になります。"
          value={dailyGoal}
          onChange={(v) => setDailyGoal(typeof v === 'number' ? v : 10)}
          min={1}
          max={500}
          clampBehavior="strict"
          allowDecimal={false}
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

        <Button
          onClick={handleSave}
          loading={saving}
          leftSection={<Save size={14} />}
          style={{ alignSelf: 'flex-start' }}
        >
          保存
        </Button>
      </Stack>
    </Stack>
  );
}

function describeError(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'サインインし直してください。';
    case 'DB_FAILED':
      return 'データベースの更新に失敗しました。';
    case 'INVALID':
      return '入力が正しくありません。';
    default:
      return 'エラーが発生しました。';
  }
}
