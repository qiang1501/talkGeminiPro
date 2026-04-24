# 日本語カラオケ発音チェッカー (Japanese Karaoke Pronunciation Checker)

このアプリケーションは、React + Vite + TypeScript で作成された「カラオケ形式の日本語発声・採点システム」です。

## 概要
ユーザーが入力した日本語テキストを `kuromoji.js` で形態素解析して単語に分割し、ブラウザの `Web Speech API` を使用して音声を認識します。認識された音声も再度形態素解析され、システムによって「文字での完全一致」で単語ごとに厳密に採点されます。

## 特徴とこだわりのポイント！
- **勝手な推測を行わない**: Web Speech API の「確定結果 (`isFinal=true`)」のみを使い、その発声から得られた読みのカタカナ配列と、対象単語の読みの配列を厳密に比較します。文脈的な推測や類似音の部分一致はすべて不正解（赤）として扱います。
- **カラオケ進行**: 正解しても不正解でも次の単語へ判定枠が遷移していくカラオケ形式を採用しています。
- **ライブ表示**: 音声認識中の「暫定結果 (`interim`)」については、現在認識されている雰囲気を表現するために画面下部に表示しますが、採点ロジックとは完全に分離しています。
- **フロントエンド完結**: 形態素解析辞書のロードも含め、サーバーのバックエンド実装なしでブラウザ上で完結します。GitHub Pages等の静的ホスティングで動作します。

## デモ
本プロジェクトは GitHub Pages にデプロイされています。以下のリンクからすぐにお試しいただけます：
👉 **[デモページを開く](https://qiang1501.github.io/talkGeminiPro/)**

## セットアップ手順
ローカルで開発を行う場合は、Node.js (LTS 推奨) がインストールされている環境で実行してください。

1. **依存パッケージのインストール**
   ```bash
   npm install
   ```

2. **辞書データの配置**
   `kuromoji` をブラウザで利用するため、モジュール内の辞書データを `public/` フォルダにコピーする必要があります。プロジェクトのルートで以下のコマンドを実行してください。
   
   - Windows (PowerShell) の場合:
     ```powershell
     mkdir public/dict; Copy-Item -Path .\node_modules\kuromoji\dict\* -Destination .\public\dict\
     ```
   - Mac / Linux (Bash) の場合:
     ```bash
     mkdir -p public/dict && cp node_modules/kuromoji/dict/* public/dict/
     ```

3. **ローカルサーバーの起動**
   ```bash
   npm run dev
   ```
   ブラウザで表示されたURL（例: `http://localhost:5173/talkGeminiPro/`）にアクセスしてください。

## ブラウザ制限
- 音声認識には `Web Speech API` を利用しているため、対応しているブラウザ（主に Google Chrome や MS Edge 最新版）でご利用ください。
- マイクの許可を求められた場合は「許可」を選択してください。
- 各行の `REC` は任意の順で選択できます。録音中に別の行へ切り替えると、先に前の行を判定してから新しい行の録音を開始します。

## English Word Transliteration (GitHub Pages + Supabase)

This app supports English words inside Japanese text by converting them into Katakana readings.

1. Deploy Supabase Edge Function:
   - Path in this repo: `supabase/functions/transliterate/index.ts`
   - Deploy command example: `supabase functions deploy transliterate`
2. Set frontend environment variables (for Vite):
   - `VITE_SUPABASE_TRANSLITERATE_URL`
   - `VITE_SUPABASE_ANON_KEY` (optional but recommended)
3. Use `.env.example` as a template for local `.env`.

If the Supabase endpoint is not configured or temporarily unavailable, the app automatically falls back to local transliteration rules.

### Custom Word Reading Save

Users can register custom readings from the web page.

- Input: `Word` + `Reading`
- Save destination: Supabase Edge Function `save-reading`
- Persistence table: `public.custom_word_readings`
- Lookup priority in transliteration:
  1. `custom_word_readings` (user-registered)
  2. built-in dictionary
  3. heuristic fallback

For local dev, you can set `VITE_SUPABASE_SAVE_READING_URL` explicitly.
If omitted, the app derives it from `VITE_SUPABASE_TRANSLITERATE_URL`.
