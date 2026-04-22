import kuromoji from 'kuromoji';
import type { KaraokeWord, KaraokeLineData } from '../types';
import { normalizeToKatakana } from './katakana';

let tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;

export const buildTokenizer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (tokenizer) return resolve();
    kuromoji.builder({ dicPath: '/dict' }).build((err, t) => {
      if (err) return reject(err);
      tokenizer = t;
      resolve();
    });
  });
};

export const parseTextToLines = (text: string): KaraokeLineData[] => {
  if (!tokenizer) throw new Error('Tokenizer not initialized');
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const result: KaraokeLineData[] = [];

  let globalWordId = 0;
  lines.forEach((lineText, lineIndex) => {
    const tokens = tokenizer!.tokenize(lineText);
    let originalKana = '';
    const words: KaraokeWord[] = tokens.map((token, wordIndex) => {
      // kuromoji は辞書にない未知語の場合 reading が undefined になることがあります
      const reading = token.reading 
        ? normalizeToKatakana(token.reading) 
        : normalizeToKatakana(token.surface_form);
        
      originalKana += reading;

      return {
        id: `word_${globalWordId++}`,
        surface: token.surface_form,
        reading,
        status: 'pending',
        lineIndex,
        wordIndex
      };
    });
    result.push({ lineIndex, originalText: lineText, originalKana, words });
  });
  return result;
};

// 確定音声結果もパースして読み順の配列を返す
export const parseSpeechResultToReadings = (speechText: string): string[] => {
  if (!tokenizer) return [];
  const tokens = tokenizer.tokenize(speechText);
  return tokens.map(t => 
    t.reading ? normalizeToKatakana(t.reading) : normalizeToKatakana(t.surface_form)
  );
};
