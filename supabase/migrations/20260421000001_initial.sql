-- ============================================================================
-- ko-word-book initial schema
-- ============================================================================
-- Single-user (個人仕様) Korean vocabulary app targeting TOPIK + daily conversation.
-- No shared seed/dictionary tables — each user_words row carries its own AI-filled
-- data (meaning, examples, classification).
--
-- Sections:
--   1. Extensions & enums
--   2. User tables (own-row access via RLS)
--   3. Indexes
--   4. RLS policies
--   5. Auth trigger (auto-create profile)
--   6. Helper functions
-- ============================================================================

-- 1. Extensions & enums --------------------------------------------------------

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vocab_stage') then
    create type vocab_stage as enum ('memorize', 'recognize', 'produce', 'mastered');
  end if;
  if not exists (select 1 from pg_type where typname = 'word_type') then
    create type word_type as enum ('sino_korean', 'native_korean', 'loanword', 'mixed');
  end if;
end$$;

-- 2. User tables --------------------------------------------------------------

create table if not exists public.profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  daily_goal      integer not null default 10 check (daily_goal > 0),
  timezone        text not null default 'Asia/Tokyo',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Each row = one Korean word the user is learning.
create table if not exists public.user_words (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,

  -- Core
  lemma                text not null,               -- dictionary form (Hangul)
  hanja                text,                        -- 漢字 (only for sino_korean / mixed)
  part_of_speech       text,                        -- noun / verb / adjective / adverb / other
  word_type            word_type not null,
  meaning_ja           text not null,

  -- Usage signals
  daily_usage_score    smallint not null default 50 check (daily_usage_score between 0 and 100),
  topik_level          smallint check (topik_level between 1 and 6),

  -- Example sentences (two flavors)
  example_topik        text,
  example_topik_ja     text,
  example_daily        text,
  example_daily_ja     text,

  -- Context (optional, where the word was found)
  source_text          text,
  context_sentence     text,
  notes                text,

  -- SRS (SM-2)
  stage                vocab_stage not null default 'memorize',
  ease                 real not null default 2.5,
  interval_days        real not null default 0,
  repetition           integer not null default 0,
  lapses               integer not null default 0,
  next_review_at       timestamptz not null default now(),
  last_reviewed_at     timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Composition answers for the 'produce' stage (future use; schema ready now).
create table if not exists public.user_sentences (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  user_word_id       uuid not null references public.user_words(id) on delete cascade,
  sentence           text not null,
  grade_grammar      smallint check (grade_grammar between 0 and 5),
  grade_meaning      smallint check (grade_meaning between 0 and 5),
  grade_naturalness  smallint check (grade_naturalness between 0 and 5),
  grade_total        smallint check (grade_total between 0 and 5),
  ai_feedback        text,
  created_at         timestamptz not null default now()
);

create table if not exists public.review_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  user_word_id   uuid not null references public.user_words(id) on delete cascade,
  stage_before   vocab_stage not null,
  stage_after    vocab_stage not null,
  quality        smallint check (quality between 0 and 5),
  created_at     timestamptz not null default now()
);

create table if not exists public.rate_limits (
  user_id       uuid not null references auth.users(id) on delete cascade,
  action        text not null,
  window_start  timestamptz not null default date_trunc('minute', now()),
  count         integer not null default 1,
  primary key (user_id, action, window_start)
);

-- 3. Indexes -------------------------------------------------------------------

create unique index if not exists user_words_user_lemma_uniq
  on public.user_words (user_id, lemma);

create index if not exists user_words_due_idx
  on public.user_words (user_id, next_review_at)
  where stage <> 'mastered';

create index if not exists user_words_stage_idx
  on public.user_words (user_id, stage);

create index if not exists user_words_type_idx
  on public.user_words (user_id, word_type);

create index if not exists user_sentences_word_idx
  on public.user_sentences (user_id, user_word_id, created_at desc);

create index if not exists review_events_user_time_idx
  on public.review_events (user_id, created_at desc);

-- 4. RLS policies --------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.user_words      enable row level security;
alter table public.user_sentences  enable row level security;
alter table public.review_events   enable row level security;
alter table public.rate_limits     enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own words" on public.user_words;
create policy "own words" on public.user_words
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own sentences" on public.user_sentences;
create policy "own sentences" on public.user_sentences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own review events" on public.review_events;
create policy "own review events" on public.review_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "read own rate limits" on public.rate_limits;
create policy "read own rate limits" on public.rate_limits
  for select using (user_id = auth.uid());
-- rate_limits writes: service role only.

-- 5. Auth trigger: auto-create profile on new user ----------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any pre-existing users.
insert into public.profiles (user_id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1))
from auth.users u
on conflict (user_id) do nothing;

-- 6. Helper functions ----------------------------------------------------------

-- Due reviews for the current user.
create or replace function public.due_reviews(limit_count int default 20)
returns setof public.user_words
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.user_words
  where user_id = auth.uid()
    and stage <> 'mastered'
    and next_review_at <= now()
  order by next_review_at asc
  limit limit_count;
$$;

-- Summary stats for the current user.
create or replace function public.vocab_stats()
returns table (
  total_count       bigint,
  due_today_count   bigint,
  mastered_count    bigint,
  memorize_count    bigint,
  recognize_count   bigint,
  produce_count     bigint,
  sino_count        bigint,
  native_count      bigint,
  loanword_count    bigint,
  mixed_count       bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)                                                               as total_count,
    count(*) filter (where stage <> 'mastered' and next_review_at <= now()) as due_today_count,
    count(*) filter (where stage = 'mastered')                             as mastered_count,
    count(*) filter (where stage = 'memorize')                             as memorize_count,
    count(*) filter (where stage = 'recognize')                            as recognize_count,
    count(*) filter (where stage = 'produce')                              as produce_count,
    count(*) filter (where word_type = 'sino_korean')                      as sino_count,
    count(*) filter (where word_type = 'native_korean')                    as native_count,
    count(*) filter (where word_type = 'loanword')                         as loanword_count,
    count(*) filter (where word_type = 'mixed')                            as mixed_count
  from public.user_words
  where user_id = auth.uid();
$$;
