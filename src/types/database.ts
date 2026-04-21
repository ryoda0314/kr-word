// Hand-written schema mirror of supabase/migrations/20260421000001_initial.sql.
// Replace with the output of `npm run db:types` once the Supabase project is linked.

import type { VocabStage, WordType } from './db';

type Timestamptz = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          daily_goal: number;
          timezone: string;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          daily_goal?: number;
          timezone?: string;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      user_words: {
        Row: {
          id: string;
          user_id: string;
          lemma: string;
          hanja: string | null;
          part_of_speech: string | null;
          word_type: WordType;
          meaning_ja: string;
          daily_usage_score: number;
          topik_level: number | null;
          example_topik: string | null;
          example_topik_ja: string | null;
          example_daily: string | null;
          example_daily_ja: string | null;
          source_text: string | null;
          context_sentence: string | null;
          notes: string | null;
          stage: VocabStage;
          ease: number;
          interval_days: number;
          repetition: number;
          lapses: number;
          next_review_at: Timestamptz;
          last_reviewed_at: Timestamptz | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: string;
          user_id: string;
          lemma: string;
          hanja?: string | null;
          part_of_speech?: string | null;
          word_type: WordType;
          meaning_ja: string;
          daily_usage_score?: number;
          topik_level?: number | null;
          example_topik?: string | null;
          example_topik_ja?: string | null;
          example_daily?: string | null;
          example_daily_ja?: string | null;
          source_text?: string | null;
          context_sentence?: string | null;
          notes?: string | null;
          stage?: VocabStage;
          ease?: number;
          interval_days?: number;
          repetition?: number;
          lapses?: number;
          next_review_at?: Timestamptz;
          last_reviewed_at?: Timestamptz | null;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['user_words']['Insert']>;
        Relationships: [];
      };
      user_sentences: {
        Row: {
          id: string;
          user_id: string;
          user_word_id: string;
          sentence: string;
          grade_grammar: number | null;
          grade_meaning: number | null;
          grade_naturalness: number | null;
          grade_total: number | null;
          ai_feedback: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_word_id: string;
          sentence: string;
          grade_grammar?: number | null;
          grade_meaning?: number | null;
          grade_naturalness?: number | null;
          grade_total?: number | null;
          ai_feedback?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['user_sentences']['Insert']>;
        Relationships: [];
      };
      review_events: {
        Row: {
          id: string;
          user_id: string;
          user_word_id: string;
          stage_before: VocabStage;
          stage_after: VocabStage;
          quality: number | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_word_id: string;
          stage_before: VocabStage;
          stage_after: VocabStage;
          quality?: number | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['review_events']['Insert']>;
        Relationships: [];
      };
      rate_limits: {
        Row: {
          user_id: string;
          action: string;
          window_start: Timestamptz;
          count: number;
        };
        Insert: {
          user_id: string;
          action: string;
          window_start?: Timestamptz;
          count?: number;
        };
        Update: Partial<Database['public']['Tables']['rate_limits']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      due_reviews: {
        Args: { limit_count?: number };
        Returns: Database['public']['Tables']['user_words']['Row'][];
      };
      vocab_stats: {
        Args: Record<string, never>;
        Returns: {
          total_count: number;
          due_today_count: number;
          mastered_count: number;
          memorize_count: number;
          recognize_count: number;
          produce_count: number;
          sino_count: number;
          native_count: number;
          loanword_count: number;
          mixed_count: number;
        }[];
      };
    };
    Enums: {
      vocab_stage: VocabStage;
      word_type: WordType;
    };
    CompositeTypes: Record<string, never>;
  };
};
