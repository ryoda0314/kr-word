'use client';

import type { ReactNode } from 'react';
import {
  AppShell,
  Burger,
  Button,
  Group,
  NavLink,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  BookOpen,
  Brain,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  ScrollText,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function AppShellFrame({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const items: Array<{ href: string; label: string; icon: ReactNode }> = [
    { href: '/dashboard', label: 'ダッシュボード', icon: <LayoutDashboard size={16} /> },
    { href: '/review', label: 'レビュー', icon: <Brain size={16} /> },
    { href: '/drill', label: 'ドリル', icon: <Dumbbell size={16} /> },
    { href: '/read', label: '読む', icon: <ScrollText size={16} /> },
    { href: '/words', label: '単語帳', icon: <BookOpen size={16} /> },
    { href: '/words/new', label: '単語を追加', icon: <PlusCircle size={16} /> },
    { href: '/settings', label: '設定', icon: <Settings size={16} /> },
  ];

  return (
    <AppShell
      header={{
        // Extra top padding for the iOS status bar / notch in PWA standalone.
        // env(safe-area-inset-top) is 0 on non-iOS / non-standalone.
        height: 'calc(56px + env(safe-area-inset-top, 0px))' as unknown as number,
      }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Group h={56} px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>ko-word-book</Title>
          </Group>
          <Group gap="sm">
            <Text size="xs" c="dimmed" visibleFrom="sm">
              {email}
            </Text>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<LogOut size={14} />}
              onClick={signOut}
            >
              サインアウト
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {items.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            leftSection={item.icon}
            active={pathname === item.href}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
