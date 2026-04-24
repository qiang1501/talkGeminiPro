import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  extractEnglishWords,
  fallbackRomanToKatakana,
  transliterateEnglishWords,
} from './englishKatakana';

describe('extractEnglishWords', () => {
  it('extracts unique english words from mixed Japanese text', () => {
    const words = extractEnglishWords('JavaとWebを学ぶ。JAVA + TypeScript + web');
    expect(words).toEqual(['Java', 'Web', 'TypeScript']);
  });
});

describe('fallbackRomanToKatakana', () => {
  it('converts common English words to katakana-ish readings', () => {
    expect(fallbackRomanToKatakana('Java')).toBe('ジャバ');
    expect(fallbackRomanToKatakana('Web')).toBe('ウェブ');
  });
});

describe('transliterateEnglishWords', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses local fallback when Supabase endpoint is not configured', async () => {
    const result = await transliterateEnglishWords(['Java', 'Web']);

    expect(result.java).toBe('ジャバ');
    expect(result.web).toBe('ウェブ');
  });

  it('merges Supabase response and fallback result', async () => {
    vi.stubEnv('VITE_SUPABASE_TRANSLITERATE_URL', 'https://example.com/transliterate');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { word: 'Java', katakana: 'ジャヴァ' },
          ],
        }),
      }),
    );

    const result = await transliterateEnglishWords(['Java', 'Web']);
    expect(result.java).toBe('ジャヴァ');
    expect(result.web).toBe('ウェブ');
  });
});
