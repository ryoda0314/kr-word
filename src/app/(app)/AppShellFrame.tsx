'use client';

import type { ReactNode } from 'react';
import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Button,
  Group,
  Menu,
  NavLink,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  BookOpen,
  Brain,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PlusCircle,
  ScrollText,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import styles from './AppShellFrame.module.css';

type NavItem = { href: string; label: string; icon: ReactNode };

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

  // Full set — used by the tablet hamburger drawer and the PC sidebar.
  const allItems: NavItem[] = [
    { href: '/dashboard', label: 'ダッシュボード', icon: <LayoutDashboard size={16} /> },
    { href: '/review', label: 'レビュー', icon: <Brain size={16} /> },
    { href: '/drill', label: 'ドリル', icon: <Dumbbell size={16} /> },
    { href: '/read', label: '読む', icon: <ScrollText size={16} /> },
    { href: '/words', label: '単語帳', icon: <BookOpen size={16} /> },
    { href: '/words/new', label: '単語を追加', icon: <PlusCircle size={16} /> },
    { href: '/settings', label: '設定', icon: <Settings size={16} /> },
  ];

  // Trimmed set for the phone bottom bar (5 slots + an overflow "その他").
  const bottomPrimary: NavItem[] = [
    { href: '/dashboard', label: 'ダッシュ', icon: <LayoutDashboard size={20} /> },
    { href: '/review', label: 'レビュー', icon: <Brain size={20} /> },
    { href: '/read', label: '読む', icon: <ScrollText size={20} /> },
    { href: '/words', label: '単語帳', icon: <BookOpen size={20} /> },
  ];
  const bottomOverflow: NavItem[] = [
    { href: '/words/new', label: '単語を追加', icon: <PlusCircle size={16} /> },
    { href: '/drill', label: 'ドリル', icon: <Dumbbell size={16} /> },
    { href: '/settings', label: '設定', icon: <Settings size={16} /> },
  ];

  return (
    <>
      <AppShell
        header={{
          height: 'calc(56px + env(safe-area-inset-top, 0px))' as unknown as number,
        }}
        navbar={{
          width: 240,
          // Below lg: navbar is collapsed by default (revealed via the tablet
          // hamburger). Above lg: always-visible sidebar.
          breakpoint: 'lg',
          collapsed: { mobile: !opened, desktop: false },
        }}
        padding="md"
      >
        <AppShell.Header
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <Group h={56} px="md" justify="space-between">
            <Group gap="sm">
              {/* Hamburger is tablet-only (visible from sm, hidden from lg). */}
              <Burger
                opened={opened}
                onClick={toggle}
                visibleFrom="sm"
                hiddenFrom="lg"
                size="sm"
              />
              <Title order={4}>ko-word-book</Title>
            </Group>
            <Group gap="sm">
              <Text size="xs" c="dimmed" visibleFrom="sm">
                {email}
              </Text>
              {/* Sign out on sm+ is a direct button. On phone the avatar menu
                  holds settings + sign out (the bottom bar can't fit them). */}
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<LogOut size={14} />}
                onClick={signOut}
                visibleFrom="sm"
              >
                サインアウト
              </Button>
              <Box hiddenFrom="sm">
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" aria-label="メニュー">
                      <UserIcon size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>{email}</Menu.Label>
                    <Menu.Item
                      component={Link}
                      href="/settings"
                      leftSection={<Settings size={14} />}
                    >
                      設定
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<LogOut size={14} />}
                      onClick={signOut}
                    >
                      サインアウト
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Box>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="xs">
          {allItems.map((item) => (
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
          style={{
            // Safe-area bottom + extra padding so content doesn't hide behind
            // the phone bottom bar. The custom property resolves to 0 on sm+
            // where the bottom bar isn't rendered.
            paddingBottom:
              'calc(env(safe-area-inset-bottom, 0px) + var(--bottom-bar-h, 0px))',
          }}
        >
          {children}
        </AppShell.Main>
      </AppShell>

      {/* Phone-only bottom nav. hiddenFrom="sm" = visible only below sm. */}
      <Box hiddenFrom="sm" className={styles.bottomBarWrap}>
        <Paper
          className={styles.bottomBar}
          withBorder
          style={{
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: 'none',
          }}
        >
          <Group gap={0} wrap="nowrap" style={{ width: '100%' }}>
            {bottomPrimary.map((item) => (
              <BottomNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
              />
            ))}
            <Menu
              shadow="md"
              width={220}
              position="top-end"
              withinPortal
              offset={8}
            >
              <Menu.Target>
                <UnstyledButton
                  className={styles.bottomItem}
                  aria-label="その他のメニュー"
                >
                  <Stack gap={2} align="center">
                    <MoreHorizontal size={20} />
                    <Text size="10px" fw={500}>
                      その他
                    </Text>
                  </Stack>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {bottomOverflow.map((item) => (
                  <Menu.Item
                    key={item.href}
                    component={Link}
                    href={item.href}
                    leftSection={item.icon}
                  >
                    {item.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Paper>
      </Box>
    </>
  );
}

function BottomNavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <UnstyledButton
      component={Link}
      href={href}
      className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <Stack gap={2} align="center">
        {icon}
        <Text size="10px" fw={active ? 700 : 500}>
          {label}
        </Text>
      </Stack>
    </UnstyledButton>
  );
}
