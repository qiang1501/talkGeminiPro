import kuromoji from 'kuromoji';
import type { KaraokeWord, KaraokeLineData } from '../types';
import { normalizeToKatakana } from './katakana';
import { getEnglishKatakanaReading, type EnglishKatakanaMap } from './englishKatakana';

let tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;

export const buildTokenizer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (tokenizer) return resolve();
    // GitHub Pagesなどのサブディレクトリデプロイに対応するため、BASE_URLを付与
    const dicPath = import.meta.env.BASE_URL + 'dict';
    kuromoji.builder({ dicPath }).build((err, t) => {
      if (err) return reject(err);
      tokenizer = t;
      resolve();
    });
  });
};

export const parseTextToLines = (text: string, englishReadings: EnglishKatakanaMap = {}): KaraokeLineData[] => {
  if (!tokenizer) throw new Error('Tokenizer not initialized');
  const lines = text
    .split(/\r?\n/g)
    .flatMap(line => line.match(/[^。]+。?|。/g) ?? [])
    .map(l => l.trim())
    .filter(l => l !== '');
  const result: KaraokeLineData[] = [];

  const specialDates: Record<string, string> = {
    "1日": "ツイタチ", "１日": "ツイタチ",
    "2日": "フツカ", "２日": "フツカ",
    "3日": "ミッカ", "３日": "ミッカ",
    "4日": "ヨッカ", "４日": "ヨッカ",
    "5日": "イツカ", "５日": "イツカ",
    "6日": "ムイカ", "６日": "ムイカ",
    "7日": "ナノカ", "７日": "ナノカ",
    "8日": "ヨウカ", "８日": "ヨウカ",
    "9日": "ココノカ", "９日": "ココノカ",
    "10日": "トオカ", "１０日": "トオカ",
    "14日": "ジュウヨッカ", "１４日": "ジュウヨッカ",
    "20日": "ハツカ", "２０日": "ハツカ",
    "24日": "ニジュウヨッカ", "２４日": "ニジュウヨッカ"
  };

  let globalWordId = 0;
  lines.forEach((lineText, lineIndex) => {
    const tokens = tokenizer!.tokenize(lineText);
    let originalKana = '';
    const words: KaraokeWord[] = [];
    
    let i = 0;
    while (i < tokens.length) {
      // 2つのトークンを結合して特殊な日付かチェック (例: "20" + "日")
      if (i < tokens.length - 1) {
        const combinedSurface = tokens[i].surface_form + tokens[i+1].surface_form;
        if (specialDates[combinedSurface]) {
          const reading = specialDates[combinedSurface];
          originalKana += reading;
          words.push({
            id: `word_${globalWordId++}`,
            surface: combinedSurface,
            reading,
            status: 'pending',
            lineIndex,
            wordIndex: words.length
          });
          i += 2;
          continue;
        }
      }

      // 通常のトークン処理
      const token = tokens[i];
      const englishReading = getEnglishKatakanaReading(token.surface_form, englishReadings);
      const reading = englishReading
        ?? (token.reading
          ? normalizeToKatakana(token.reading)
          : normalizeToKatakana(token.surface_form));
        
      originalKana += reading;

      words.push({
        id: `word_${globalWordId++}`,
        surface: token.surface_form,
        reading,
        status: 'pending',
        lineIndex,
        wordIndex: words.length
      });
      i++;
    }

    result.push({ lineIndex, originalText: lineText, originalKana, words });
  });
  return result;
};

// 確定音声結果もパースして読み順の配列を返す
export const parseSpeechResultToReadings = (speechText: string, englishReadings: EnglishKatakanaMap = {}): string[] => {
  if (!tokenizer) return [];
  const tokens = tokenizer.tokenize(speechText);
  return tokens.map(t => 
    getEnglishKatakanaReading(t.surface_form, englishReadings)
      ?? (t.reading ? normalizeToKatakana(t.reading) : normalizeToKatakana(t.surface_form))
  );
};
