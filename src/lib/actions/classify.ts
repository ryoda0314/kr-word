'use server';

import OpenAI from 'openai';
import { z } from 'zod';

import {
  type ClassifiedWord,
  classifiedWordJsonSchema,
  classifiedWordSchema,
} from '@/lib/ai/schemas';
import { checkAndBumpRate } from '@/lib/ai/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const inputSchema = z.object({
  term: z.string().min(1).max(80),
  context: z.string().max(500).optional(),
});

export type ClassifyResult =
  | { ok: true; word: ClassifiedWord }
  | {
      ok: false;
      error:
        | 'UNAUTHENTICATED'
        | 'RATE_LIMITED'
        | 'AI_FAILED'
        | 'INVALID'
        | 'NOT_CONFIGURED';
    };

const SYSTEM_PROMPT = `You are a Korean→Japanese lexicographer for a TOPIK/daily-conversation study app.
The learner is a Japanese native; they already read Hangul fluently.
You receive one Korean word (or multi-word expression) and return its full classification as JSON.

Rules:
- lemma: dictionary form in Hangul (verbs/adjectives → -다 form, e.g. 갔어요 → 가다).
- hanja: the underlying 漢字 if word_type is sino_korean or mixed (e.g. 학교 → 學校). null otherwise.
- part_of_speech: one of noun | verb | adjective | adverb | phrase | other.
- word_type: sino_korean (漢字語) | native_korean (固有語) | loanword (외래어) | mixed (혼종어).
- meaning_ja: concise Japanese meaning (≤ 40 chars).
- phonetic: the actual spoken form in Hangul brackets when Korean pronunciation rules change it from the spelling
  — 경음화 (학교 → [학꾜]), 비음화 (국민 → [궁민]), 유기음화 (좋다 → [조타]),
  연음화 at word boundaries (not relevant for single lemmas), ㅎ 탈락 (좋아요 → [조아요]), etc.
  Use null when the spelling is pronounced as-written (e.g. 사랑, 가다). Keep it concise, one form only.
- daily_usage_score: 0–100 integer estimating how often this shows up in everyday speech.
  (0 = only formal/written/TOPIK-rare; 100 = daily conversation staple.)
- topik_level: your best guess of its TOPIK level (1–6). null if unsure.
- example_topik: one TOPIK-style sentence using the word (slightly formal register, realistic exam context).
- example_topik_ja: faithful Japanese translation.
- example_daily: one casual daily-conversation sentence using the word.
- example_daily_ja: faithful Japanese translation.
- notes: short Japanese note on nuance, pronunciation quirk (patchim, liaison), or common collocation. null if nothing to add.`;

export async function classifyWord(
  input: z.input<typeof inputSchema>,
): Promise<ClassifyResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const { term, context } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const allowed = await checkAndBumpRate(user.id, 'ai.classify', 30);
  if (!allowed) return { ok: false, error: 'RATE_LIMITED' };

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'NOT_CONFIGURED' };
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = `Korean term: "${term.trim()}"
Context sentence: ${context?.trim() || '(none)'}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4',
      temperature: 0.2,
      max_completion_tokens: 600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'classified_word',
          strict: true,
          schema: classifiedWordJsonSchema,
        },
      },
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const word = classifiedWordSchema.parse(JSON.parse(raw));
    return { ok: true, word };
  } catch (err) {
    console.error('classifyWord failed:', err);
    return { ok: false, error: 'AI_FAILED' };
  }
}
