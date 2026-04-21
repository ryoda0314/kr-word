import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppShellFrame } from './AppShellFrame';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <AppShellFrame email={user.email ?? ''}>{children}</AppShellFrame>;
}
