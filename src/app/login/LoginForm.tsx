'use client';

import {
  Alert,
  Button,
  PasswordInput,
  SegmentedControl,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const schema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(8, 'パスワードは 8 文字以上で入力してください'),
});

type Mode = 'signin' | 'signup';

export function LoginForm({
  next,
  showError,
}: {
  next?: string;
  showError?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    showError ? 'サインインに失敗しました。もう一度お試しください。' : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { email: '', password: '' },
    validate: zodResolver(schema),
  });

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(values: { email: string; password: string }) {
    setLoading(true);
    setFormError(null);
    setNotice(null);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        setFormError(error.message);
        setLoading(false);
        return;
      }
      window.location.assign(next ?? '/words');
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setFormError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        window.location.assign(next ?? '/words');
      } else {
        setNotice('確認メールを送りました。メール内のリンクからサインインを完了してください。');
        setLoading(false);
      }
    }
  }

  return (
    <Stack gap="md">
      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(v) => setMode(v as Mode)}
        data={[
          { label: 'サインイン', value: 'signin' },
          { label: '新規登録', value: 'signup' },
        ]}
      />

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          <TextInput
            label="メールアドレス"
            placeholder="you@example.com"
            autoComplete="email"
            key={form.key('email')}
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="パスワード"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            key={form.key('password')}
            {...form.getInputProps('password')}
          />
          <Button type="submit" loading={loading} fullWidth>
            {mode === 'signin' ? 'サインイン' : '新規登録'}
          </Button>
        </Stack>
      </form>

      {formError ? (
        <Alert color="red" icon={<AlertCircle size={16} />} variant="light">
          {formError}
        </Alert>
      ) : null}
      {notice ? (
        <Alert color="grape" variant="light">
          {notice}
        </Alert>
      ) : null}
    </Stack>
  );
}
