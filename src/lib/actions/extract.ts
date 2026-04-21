'use server';

import OpenAI from 'openai';
import { z } from 'zod';

import {
  type ExtractedWord,
  classifiedWordJsonSchema,
} from '@/lib/ai/schemas';
import { checkAndBumpRate } from '@/lib/ai/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const inputSchema = z.object({
  text: z.string().min(1).max(3000),
  maxWords: z.number().int().min(1).max(40).default(20),
});

export type ExtractResult =
  | { ok: true; words: ExtractedWord[] }
  | {
      ok: false;
      error:
        | 'UNAUTHENTICATED'
        | 'RATE_LIMITED'
        | 'AI_FAILED'
        | 'INVALID'
        | 'NOT_CONFIGURED';
    };

const SYSTEM_PROMPT = `You extract learning-worthy Korean vocabulary from a passage and classify each item for a Japanese learner targeting TOPIK + daily conversation.

Selection rules:
- Pick content words worth adding to a TOPIK/daily vocab book.
  → nouns, verbs, adjectives, adverbs, and multi-word expressions (connectives, idioms, common phrases).
- Lemmatize: conjugated verbs/adjectives → -다 form (갔어요 → 가다).
- Deduplicate by lemma.
- Skip particles (은/는/이/가/을/를/에/에서/의/도/로/으로…), pronouns (나/너/우리/이/그/저), copulas (이다), numbers, dates, proper names (unless a culturally-loaded term), and ultra-common helper verbs (하다, 되다, 있다, 없다) unless they appear in a notable idiom.
- Aim for roughly the maxWords cap; prefer quality over quantity.

For each selected lemma, return the same classification shape as the single-word classifier, plus context_sentence:
  context_sentence = the sentence from the passage in which the lemma first appears (copy verbatim, trimmed).

Return as JSON { "words": [...] }.`;

const extractSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    words: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ...classifiedWordJsonSchema.properties,
          context_sentence: { type: 'string' },
        },
        required: [
          ...classifiedWordJsonSchema.required,
          'context_sentence',
        ],
      },
    },
  },
  required: ['words'],
} as const;

const responseSchema = z.object({
  words: z.array(
    z.object({
      lemma: z.string(),
      hanja: z.string().nullable(),
      part_of_speech: z.string(),
      word_type: z.string(),
      meaning_ja: z.string(),
      daily_usage_score: z.number(),
      topik_level: z.number().nullable(),
      example_topik: z.string(),
      example_topik_ja: z.string(),
      example_daily: z.string(),
      example_daily_ja: z.string(),
      notes: z.string().nullable(),
      context_sentence: z.string(),
    }),
  ),
});

export async function extractWords(
  input: z.input<typeof inputSchema>,
): Promise<ExtractResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const { text, maxWords } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  // Extraction is expensive — tighter budget than single classify.
  const allowed = await checkAndBumpRate(user.id, 'ai.extract', 6);
  if (!allowed) return { ok: false, error: 'RATE_LIMITED' };

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'NOT_CONFIGURED' };
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = `Passage:
"""
${text.trim()}
"""

maxWords = ${maxWords}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'extracted_words',
          strict: true,
          schema: extractSchema,
        },
      },
    });
    const raw = completion.choices[0]?.message?.content ?? '{"words":[]}';
    const json = responseSchema.parse(JSON.parse(raw));
    return { ok: true, words: json.words as ExtractedWord[] };
  } catch (err) {
    console.error('extractWords failed:', err);
    return { ok: false, error: 'AI_FAILED' };
  }
}
