-- ============================================================================
-- Add `phonetic` to user_words
-- ============================================================================
-- Captures the actual spoken form when Korean pronunciation rules change it
-- from the spelling: 경음화 (학교 → [학꾜]), 비음화 (국민 → [궁민]),
-- 유기음화 (좋다 → [조타]), 연음화 (학교에서 → [학꼬에서]), etc.
-- null when the word is pronounced as written.
-- ============================================================================

alter table public.user_words
  add column if not exists phonetic text;
