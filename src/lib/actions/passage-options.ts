/**
 * Plain constants and types for passage generation.
 * Lives outside the 'use server' module so non-async values can be re-exported
 * (Next.js forbids non-async exports from server-action files).
 */

export const PASSAGE_GENRES = [
  { value: 'news', label: 'ニュース記事' },
  { value: 'essay', label: 'エッセイ / 論説' },
  { value: 'dialogue', label: '会話（日常）' },
  { value: 'k_drama', label: 'K-drama 台詞' },
  { value: 'social', label: 'SNS / ブログ' },
  { value: 'daily', label: '日常の一場面' },
  { value: 'formal', label: '公式文書 / お知らせ' },
  { value: 'other', label: 'その他' },
] as const;

export type PassageGenre = (typeof PASSAGE_GENRES)[number]['value'];

export const PASSAGE_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export const PASSAGE_LENGTH_OPTIONS = ['short', 'medium', 'long'] as const;
export type PassageLength = (typeof PASSAGE_LENGTH_OPTIONS)[number];

export const PASSAGE_WORD_TARGETS: Record<PassageLength, number> = {
  short: 80,
  medium: 160,
  long: 260,
};
