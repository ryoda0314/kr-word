import { z } from 'zod';

import type { WordType } from '@/types/db';

export const WORD_TYPES: readonly WordType[] = [
  'sino_korean',
  'native_korean',
  'loanword',
  'mixed',
] as const;

export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'other',
] as const;

/** Shape returned by AI for a single classified word. */
export const classifiedWordSchema = z.object({
  lemma: z.string().min(1).max(100),
  hanja: z.string().nullable(),
  part_of_speech: z.enum(PARTS_OF_SPEECH),
  word_type: z.enum(WORD_TYPES),
  meaning_ja: z.string().min(1).max(200),
  phonetic: z.string().max(100).nullable(),
  daily_usage_score: z.number().int().min(0).max(100),
  topik_level: z.number().int().min(1).max(6).nullable(),
  example_topik: z.string().min(1).max(300),
  example_topik_ja: z.string().min(1).max(300),
  example_daily: z.string().min(1).max(300),
  example_daily_ja: z.string().min(1).max(300),
  notes: z.string().max(300).nullable(),
});

export type ClassifiedWord = z.infer<typeof classifiedWordSchema>;

/** Extraction adds the source sentence each word came from. */
export const extractedWordSchema = classifiedWordSchema.extend({
  context_sentence: z.string().max(400),
});

export type ExtractedWord = z.infer<typeof extractedWordSchema>;

/**
 * JSON Schema form of `classifiedWordSchema` for OpenAI structured output.
 * Kept manual to avoid a zod-to-jsonschema dep; must be kept in sync.
 */
export const classifiedWordJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    lemma: { type: 'string' },
    hanja: { type: ['string', 'null'] },
    part_of_speech: { type: 'string', enum: PARTS_OF_SPEECH as unknown as string[] },
    word_type: { type: 'string', enum: WORD_TYPES as unknown as string[] },
    meaning_ja: { type: 'string' },
    phonetic: { type: ['string', 'null'] },
    daily_usage_score: { type: 'integer', minimum: 0, maximum: 100 },
    topik_level: { type: ['integer', 'null'], minimum: 1, maximum: 6 },
    example_topik: { type: 'string' },
    example_topik_ja: { type: 'string' },
    example_daily: { type: 'string' },
    example_daily_ja: { type: 'string' },
    notes: { type: ['string', 'null'] },
  },
  required: [
    'lemma',
    'hanja',
    'part_of_speech',
    'word_type',
    'meaning_ja',
    'phonetic',
    'daily_usage_score',
    'topik_level',
    'example_topik',
    'example_topik_ja',
    'example_daily',
    'example_daily_ja',
    'notes',
  ],
} as const;
