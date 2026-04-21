# ko-word-book

日本語話者向けの韓国語単語帳アプリ。TOPIK 対策と日常会話を軸に、単語の分類（漢字語 / 固有語 / 外来語）と SRS で定着させる。

## スタック

- Next.js 16 (App Router)
- Mantine v9
- Supabase (Auth / Postgres / Storage)
- OpenAI / Google Gemini

## セットアップ

1. Supabase プロジェクトを新規作成
2. `.env.example` を `.env` にコピーして各値を埋める
3. `npm install`
4. `npm run dev`

## 対象機能（設計時点）

- 単語登録（手入力 + 文章ペーストからの抽出）
- AI による分類タグ付与（漢字語 / 固有語 / 外来語、日常会話度）
- 例文生成（TOPIK 風 / 日常会話）
- SRS 復習
- TTS（Phase 2：パッチム・連音化の注意ポイント表示）
