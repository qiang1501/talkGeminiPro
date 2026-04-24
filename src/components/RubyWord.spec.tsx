import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RubyWord } from './RubyWord';
import type { KaraokeWord } from '../types';

function buildWord(surface: string, reading: string): KaraokeWord {
  return {
    id: 'w1',
    surface,
    reading,
    status: 'pending',
    lineIndex: 0,
    wordIndex: 0,
  };
}

describe('RubyWord', () => {
  it('shows ruby reading for alphabetic tokens even when lengths match', () => {
    render(<RubyWord word={buildWord('AWS', 'アウス')} />);

    const ruby = screen.getByText('AWS').closest('ruby');
    expect(ruby).not.toBeNull();
    expect(screen.getByText('あうす')).toBeInTheDocument();
  });
});
