// deno-lint-ignore-file no-explicit-any
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DICTIONARY: Record<string, string> = {
  java: 'ジャバ',
  web: 'ウェブ',
  javascript: 'ジャバスクリプト',
  typescript: 'タイプスクリプト',
  github: 'ギットハブ',
  supabase: 'スーパーベース',
  react: 'リアクト',
};

const ROMAN_TO_KATAKANA: Array<[RegExp, string]> = [
  [/tch/g, 'ッチ'],
  [/sch/g, 'シュ'],
  [/ja/g, 'ジャ'],
  [/je/g, 'ジェ'],
  [/ji/g, 'ジ'],
  [/jo/g, 'ジョ'],
  [/ju/g, 'ジュ'],
  [/we/g, 'ウェ'],
  [/wi/g, 'ウィ'],
  [/wo/g, 'ウォ'],
  [/wh/g, 'ウ'],
  [/va/g, 'バ'],
  [/vi/g, 'ビ'],
  [/vu/g, 'ブ'],
  [/ve/g, 'ベ'],
  [/vo/g, 'ボ'],
  [/fa/g, 'ファ'],
  [/fi/g, 'フィ'],
  [/fe/g, 'フェ'],
  [/fo/g, 'フォ'],
  [/sh/g, 'シ'],
  [/ch/g, 'チ'],
  [/th/g, 'ス'],
  [/ph/g, 'フ'],
  [/qu/g, 'ク'],
  [/ck/g, 'ック'],
  [/ng/g, 'ング'],
  [/a/g, 'ア'],
  [/i/g, 'イ'],
  [/u/g, 'ウ'],
  [/e/g, 'エ'],
  [/o/g, 'オ'],
  [/b/g, 'ブ'],
  [/c/g, 'ク'],
  [/d/g, 'ド'],
  [/f/g, 'フ'],
  [/g/g, 'グ'],
  [/h/g, 'フ'],
  [/j/g, 'ジ'],
  [/k/g, 'ク'],
  [/l/g, 'ル'],
  [/m/g, 'ム'],
  [/n/g, 'ン'],
  [/p/g, 'プ'],
  [/r/g, 'ル'],
  [/s/g, 'ス'],
  [/t/g, 'ト'],
  [/v/g, 'ブ'],
  [/w/g, 'ウ'],
  [/x/g, 'クス'],
  [/y/g, 'イ'],
  [/z/g, 'ズ'],
];

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, '');
}

function heuristicKatakana(word: string): string {
  let result = normalizeWord(word);
  if (!result) return '';
  for (const [pattern, replacement] of ROMAN_TO_KATAKANA) {
    result = result.replace(pattern, replacement);
  }
  return result || word.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as { words?: unknown };
    const rawWords = Array.isArray(body.words) ? body.words : [];
    const words = rawWords.filter((w): w is string => typeof w === 'string').slice(0, 128);

    const results = words.map((word) => {
      const normalized = normalizeWord(word);
      if (!normalized) return { word, katakana: '', source: 'ignored' as const };

      const dictionaryHit = DICTIONARY[normalized];
      if (dictionaryHit) {
        return { word, katakana: dictionaryHit, source: 'dictionary' as const };
      }

      return { word, katakana: heuristicKatakana(word), source: 'heuristic' as const };
    });

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Unknown error' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
