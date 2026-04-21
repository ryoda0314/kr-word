-- ============================================================================
-- User-owned Korean passages for the reader
-- ============================================================================
-- Personal library of passages the user reads from. Two sources:
--   - 'ai'     : generated via generatePassage()
--   - 'pasted' : user-pasted text stored for revisit
-- Unlike en-word-book's shared `passages` (seed + AI-appended, publicly
-- readable), ko passages are per-user and RLS-gated.
-- ============================================================================

create table if not exists public.user_passages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  body            text not null,
  topik_level     smallint check (topik_level between 1 and 6),
  genre           text,           -- news / essay / dialogue / k_drama / social / daily / formal / other
  source          text not null default 'pasted' check (source in ('ai', 'pasted')),
  word_count      integer,        -- 어절 count (whitespace-separated)
  notes           text,
  created_at      timestamptz not null default now(),
  last_opened_at  timestamptz not null default now()
);

create index if not exists user_passages_recent_idx
  on public.user_passages (user_id, last_opened_at desc);

create index if not exists user_passages_created_idx
  on public.user_passages (user_id, created_at desc);

alter table public.user_passages enable row level security;

drop policy if exists "own passages" on public.user_passages;
create policy "own passages" on public.user_passages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
