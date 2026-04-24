export type EnglishKatakanaMap = Record<string, string>;

const INLINE_DICTIONARY: EnglishKatakanaMap = {
  java: 'ジャバ',
  web: 'ウェブ',
  javascript: 'ジャバスクリプト',
  typescript: 'タイプスクリプト',
  github: 'ギットハブ',
  supabase: 'スーパーベース',
  react: 'リアクト',
};

const ENGLISH_WORD_REGEX = /[A-Za-z][A-Za-z'-]*/g;

const THREE_CHAR_MAP: Record<string, string> = {
  tch: 'ッチ',
  sch: 'シュ',
};

const TWO_CHAR_MAP: Record<string, string> = {
  ja: 'ジャ',
  je: 'ジェ',
  ji: 'ジ',
  jo: 'ジョ',
  ju: 'ジュ',
  wa: 'ワ',
  we: 'ウェ',
  wi: 'ウィ',
  wo: 'ウォ',
  wh: 'ウ',
  va: 'バ',
  vi: 'ビ',
  vu: 'ブ',
  ve: 'ベ',
  vo: 'ボ',
  fa: 'ファ',
  fi: 'フィ',
  fe: 'フェ',
  fo: 'フォ',
  fu: 'フ',
  ch: 'チ',
  sh: 'シ',
  th: 'ス',
  ph: 'フ',
  qu: 'ク',
  ts: 'ツ',
  ng: 'ング',
  ck: 'ック',
  ee: 'イー',
  oo: 'ウー',
  ea: 'イー',
  ou: 'オウ',
  ai: 'アイ',
  ay: 'エイ',
  oy: 'オイ',
  oi: 'オイ',
  ew: 'ユー',
  aw: 'オー',
  ow: 'オウ',
  er: 'アー',
  or: 'オー',
  ar: 'アー',
};

const CV_MAP: Record<string, string> = {
  ba: 'バ',
  bi: 'ビ',
  bu: 'ブ',
  be: 'ベ',
  bo: 'ボ',
  ca: 'カ',
  ci: 'シ',
  cu: 'ク',
  ce: 'セ',
  co: 'コ',
  da: 'ダ',
  di: 'ディ',
  du: 'ドゥ',
  de: 'デ',
  do: 'ド',
  fa: 'ファ',
  fi: 'フィ',
  fu: 'フ',
  fe: 'フェ',
  fo: 'フォ',
  ga: 'ガ',
  gi: 'ギ',
  gu: 'グ',
  ge: 'ゲ',
  go: 'ゴ',
  ha: 'ハ',
  hi: 'ヒ',
  hu: 'フ',
  he: 'ヘ',
  ho: 'ホ',
  ja: 'ジャ',
  ji: 'ジ',
  ju: 'ジュ',
  je: 'ジェ',
  jo: 'ジョ',
  ka: 'カ',
  ki: 'キ',
  ku: 'ク',
  ke: 'ケ',
  ko: 'コ',
  la: 'ラ',
  li: 'リ',
  lu: 'ル',
  le: 'レ',
  lo: 'ロ',
  ma: 'マ',
  mi: 'ミ',
  mu: 'ム',
  me: 'メ',
  mo: 'モ',
  na: 'ナ',
  ni: 'ニ',
  nu: 'ヌ',
  ne: 'ネ',
  no: 'ノ',
  pa: 'パ',
  pi: 'ピ',
  pu: 'プ',
  pe: 'ペ',
  po: 'ポ',
  qa: 'クァ',
  qi: 'クィ',
  qu: 'ク',
  qe: 'クェ',
  qo: 'クォ',
  ra: 'ラ',
  ri: 'リ',
  ru: 'ル',
  re: 'レ',
  ro: 'ロ',
  sa: 'サ',
  si: 'シ',
  su: 'ス',
  se: 'セ',
  so: 'ソ',
  ta: 'タ',
  ti: 'ティ',
  tu: 'トゥ',
  te: 'テ',
  to: 'ト',
  va: 'バ',
  vi: 'ビ',
  vu: 'ブ',
  ve: 'ベ',
  vo: 'ボ',
  wa: 'ワ',
  wi: 'ウィ',
  wu: 'ウ',
  we: 'ウェ',
  wo: 'ウォ',
  xa: 'ザ',
  xi: 'ズィ',
  xu: 'ズ',
  xe: 'ゼ',
  xo: 'ゾ',
  ya: 'ヤ',
  yi: 'イ',
  yu: 'ユ',
  ye: 'イェ',
  yo: 'ヨ',
  za: 'ザ',
  zi: 'ジ',
  zu: 'ズ',
  ze: 'ゼ',
  zo: 'ゾ',
};

const VOWEL_MAP: Record<string, string> = {
  a: 'ア',
  i: 'イ',
  u: 'ウ',
  e: 'エ',
  o: 'オ',
  y: 'イ',
};

const FINAL_CONSONANT_MAP: Record<string, string> = {
  b: 'ブ',
  c: 'ク',
  d: 'ド',
  f: 'フ',
  g: 'グ',
  h: 'フ',
  j: 'ジ',
  k: 'ク',
  l: 'ル',
  m: 'ム',
  n: 'ン',
  p: 'プ',
  q: 'ク',
  r: 'ル',
  s: 'ス',
  t: 'ト',
  v: 'ブ',
  w: 'ウ',
  x: 'クス',
  y: 'イ',
  z: 'ズ',
};

function keyOfWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, '');
}

export function extractEnglishWords(text: string): string[] {
  const matches = text.match(ENGLISH_WORD_REGEX) ?? [];
  const uniqueByLower = new Map<string, string>();
  for (const token of matches) {
    const normalized = token.replace(/[-']/g, '');
    const key = keyOfWord(normalized);
    if (!key) continue;
    if (!uniqueByLower.has(key)) {
      uniqueByLower.set(key, normalized);
    }
  }
  return [...uniqueByLower.values()];
}

export function fallbackRomanToKatakana(word: string): string {
  const key = keyOfWord(word);
  if (!key) return '';
  if (INLINE_DICTIONARY[key]) return INLINE_DICTIONARY[key];

  let source = key;
  let out = '';
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1] ?? '';
    const three = source.slice(index, index + 3);
    const two = source.slice(index, index + 2);

    if (
      current &&
      current === next &&
      !'aeioun'.includes(current)
    ) {
      out += 'ッ';
      index += 1;
      continue;
    }

    if (THREE_CHAR_MAP[three]) {
      out += THREE_CHAR_MAP[three];
      index += 3;
      continue;
    }

    if (TWO_CHAR_MAP[two]) {
      out += TWO_CHAR_MAP[two];
      index += 2;
      continue;
    }

    const cv = source.slice(index, index + 2);
    if (CV_MAP[cv]) {
      out += CV_MAP[cv];
      index += 2;
      continue;
    }

    if (VOWEL_MAP[current]) {
      out += VOWEL_MAP[current];
      index += 1;
      continue;
    }

    if (index === source.length - 1 && FINAL_CONSONANT_MAP[current]) {
      out += FINAL_CONSONANT_MAP[current];
      index += 1;
      continue;
    }

    if (FINAL_CONSONANT_MAP[current]) {
      out += FINAL_CONSONANT_MAP[current];
      index += 1;
      continue;
    }

    index += 1;
  }

  return out || word.toUpperCase();
}

function normalizeMapEntry(word: string, katakana: string): [string, string] | null {
  const key = keyOfWord(word);
  if (!key) return null;
  if (!katakana) return null;
  return [key, katakana];
}

export async function transliterateEnglishWords(words: string[]): Promise<EnglishKatakanaMap> {
  const unique = extractEnglishWords(words.join(' '));
  const fallback: EnglishKatakanaMap = {};
  for (const word of unique) {
    const key = keyOfWord(word);
    fallback[key] = fallbackRomanToKatakana(word);
  }

  const endpoint = import.meta.env.VITE_SUPABASE_TRANSLITERATE_URL as string | undefined;
  if (!endpoint || unique.length === 0) return fallback;

  try {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (anonKey) {
      headers.apikey = anonKey;
      headers.Authorization = `Bearer ${anonKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ words: unique }),
    });

    if (!response.ok) return fallback;

    const payload = await response.json() as
      | { results?: Array<{ word?: string; katakana?: string }> }
      | Array<{ word?: string; katakana?: string }>;

    const results = Array.isArray(payload) ? payload : (payload.results ?? []);
    const merged: EnglishKatakanaMap = { ...fallback };
    for (const item of results) {
      if (!item.word || !item.katakana) continue;
      const pair = normalizeMapEntry(item.word, item.katakana);
      if (!pair) continue;
      merged[pair[0]] = pair[1];
    }
    return merged;
  } catch {
    return fallback;
  }
}

export function getEnglishKatakanaReading(surface: string, englishMap: EnglishKatakanaMap): string | null {
  const key = keyOfWord(surface);
  if (!key) return null;
  return englishMap[key] ?? null;
}
