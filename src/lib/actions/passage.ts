'use server';

import OpenAI from 'openai';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { checkAndBumpRate } from '@/lib/ai/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import {
  PASSAGE_GENRES,
  PASSAGE_LENGTH_OPTIONS,
  PASSAGE_WORD_TARGETS,
  type PassageGenre,
} from './passage-options';

const GENRE_VALUES = PASSAGE_GENRES.map((g) => g.value) as unknown as [
  PassageGenre,
  ...PassageGenre[],
];

/* ─── Validation ────────────────────────────────────────────────────────── */

const generateInputSchema = z.object({
  topic: z.string().min(3).max(300),
  genre: z.enum(GENRE_VALUES),
  topik_level: z.number().int().min(1).max(6),
  length: z.enum(PASSAGE_LENGTH_OPTIONS),
  notes: z.string().max(500).optional(),
});

const aiSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(30).max(6000),
});

export type GeneratePassageResult =
  | { ok: true; passageId: string }
  | {
      ok: false;
      error:
        | 'UNAUTHENTICATED'
        | 'RATE_LIMITED'
        | 'AI_FAILED'
        | 'INVALID'
        | 'NOT_CONFIGURED'
        | 'DB';
    };

/* ─── Prompt ─────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You write Korean reading passages for a Japanese learner studying for TOPIK and daily conversation.

Rules:
- Output Korean only in "title" and "body". Title is the Korean title; body is the Korean passage.
- The passage must sound natural and match the requested genre register. Avoid markdown, bullets, or tables — straight prose/dialogue only.
- Separate paragraphs with a blank line.
- Match the TOPIK level (1=초급, 2=초급, 3=중급, 4=중급, 5=고급, 6=고급):
    - Level 1–2: high-frequency vocabulary, simple 해요체 or 합니다체, short sentences.
    - Level 3–4: more varied vocab including 한자어, compound sentences, some idioms.
    - Level 5–6: abstract vocabulary, advanced grammar (-에 따르면, -음에도, -기 마련이다…), formal register when appropriate.
- Target approximately the requested 어절 count (±20%).
- Genre register guide:
    - news: neutral reportage, 한다체 / 했다체; current-affairs topic.
    - essay: op-ed or reflective essay, declarative, sometimes 1st-person.
    - dialogue: two or three speakers trading 해요체 lines (use "A:" and "B:" prefixes).
    - k_drama: casual 반말 dialogue between 2–3 characters with stage-direction-like cues only inside parentheses.
    - social: SNS/blog voice, casual 해요체 or 반말 + emoji sparingly (max 2).
    - daily: first-person 일상 에피소드, 해요체.
    - formal: official announcement / 공지 / 안내문, 합니다체.
    - other: follow the topic's natural register.
- Self-contained: no references that need outside context.`;

/* ─── Main action ────────────────────────────────────────────────────────── */

export async function generatePassage(
  input: z.input<typeof generateInputSchema>,
): Promise<GeneratePassageResult> {
  const parsed = generateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const { topic, genre, topik_level, length, notes } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const allowed = await checkAndBumpRate(user.id, 'ai.passage', 5);
  if (!allowed) return { ok: false, error: 'RATE_LIMITED' };

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'NOT_CONFIGURED' };
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const wordTarget = PASSAGE_WORD_TARGETS[length];
  const userPrompt = `Topic: ${topic}
Genre: ${genre}
TOPIK level: ${topik_level}
Target 어절 count: approximately ${wordTarget}
${notes ? `Additional notes: ${notes}` : ''}`;

  let ai: z.infer<typeof aiSchema>;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4',
      temperature: 0.7,
      max_completion_tokens: 1800,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'passage',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['title', 'body'],
          },
        },
      },
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    ai = aiSchema.parse(JSON.parse(raw));
  } catch (err) {
    console.error('generatePassage AI error:', err);
    return { ok: false, error: 'AI_FAILED' };
  }

  const wordCount = ai.body.trim().split(/\s+/).filter(Boolean).length;

  const { data: inserted, error } = await supabase
    .from('user_passages')
    .insert({
      user_id: user.id,
      title: ai.title.trim(),
      body: ai.body.trim(),
      topik_level,
      genre,
      source: 'ai',
      word_count: wordCount,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('generatePassage DB error:', error);
    return { ok: false, error: 'DB' };
  }

  revalidatePath('/read');
  return { ok: true, passageId: inserted.id };
}

/* ─── Paste save ─────────────────────────────────────────────────────────── */

const pasteInputSchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(12000),
  genre: z.enum(GENRE_VALUES).optional(),
  topik_level: z.number().int().min(1).max(6).nullable().optional(),
  notes: z.string().max(500).optional(),
});

export type SavePassageResult =
  | { ok: true; passageId: string }
  | { ok: false; error: 'UNAUTHENTICATED' | 'INVALID' | 'DB' };

export async function savePassage(
  input: z.input<typeof pasteInputSchema>,
): Promise<SavePassageResult> {
  const parsed = pasteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };
  const { title, body, genre, topik_level, notes } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const trimmed = body.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const autoTitle =
    title?.trim() ||
    (trimmed.split(/\n+/)[0] ?? trimmed).slice(0, 40) +
      (trimmed.length > 40 ? '…' : '');

  const { data: inserted, error } = await supabase
    .from('user_passages')
    .insert({
      user_id: user.id,
      title: autoTitle,
      body: trimmed,
      topik_level: topik_level ?? null,
      genre: genre ?? null,
      source: 'pasted',
      word_count: wordCount,
      notes: notes?.trim() || null,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('savePassage DB error:', error);
    return { ok: false, error: 'DB' };
  }

  revalidatePath('/read');
  return { ok: true, passageId: inserted.id };
}

/* ─── Delete ─────────────────────────────────────────────────────────────── */

const deleteInputSchema = z.object({ id: z.string().uuid() });

export type DeletePassageResult =
  | { ok: true }
  | { ok: false; error: 'UNAUTHENTICATED' | 'INVALID' | 'DB' };

export async function deletePassage(
  input: z.input<typeof deleteInputSchema>,
): Promise<DeletePassageResult> {
  const parsed = deleteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { error } = await supabase
    .from('user_passages')
    .delete()
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('deletePassage DB error:', error);
    return { ok: false, error: 'DB' };
  }

  revalidatePath('/read');
  return { ok: true };
}

/* ─── Touch last_opened_at (fire-and-forget) ────────────────────────────── */

export async function touchPassage(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('user_passages')
    .update({ last_opened_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
}
