import { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

type MockWord = {
  id: string;
  surface: string;
  reading: string;
  status: 'pending' | 'correct' | 'incorrect';
  lineIndex: number;
  wordIndex: number;
  rubyStatuses?: { char: string; status: 'correct' | 'incorrect' | 'missing' | 'ignored' }[];
};

type MockLine = {
  lineIndex: number;
  originalText: string;
  originalKana: string;
  words: MockWord[];
};

const mockState = vi.hoisted(() => {
  let isRecording = false;
  let interimTranscript = '';
  let error: string | null = null;
  let finalHandler: ((text: string) => void) | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const buildLines = (text: string): MockLine[] =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, lineIndex) => ({
        lineIndex,
        originalText: line,
        originalKana: line,
        words: [
          {
            id: `${lineIndex}-0`,
            surface: line,
            reading: line,
            status: 'pending' as const,
            lineIndex,
            wordIndex: 0,
          },
        ],
      }));

  return {
    buildTokenizerMock: vi.fn(() => Promise.resolve()),
    parseTextToLinesMock: vi.fn((text: string) => buildLines(text)),
    compareKanaStringsMock: vi.fn((targetKana: string, spokenKana: string) =>
      targetKana.split('').map((char, index) => ({
        char,
        status: spokenKana[index] === char ? ('correct' as const) : ('missing' as const),
      })),
    ),
    getSpokenKanaStatusesMock: vi.fn((_: string, spokenKana: string) =>
      spokenKana.split('').map(() => 'correct' as const),
    ),
    katakanaToHiraganaMock: vi.fn((text: string) => text),
    startMock: vi.fn(() => {
      isRecording = true;
      notify();
    }),
    stopMock: vi.fn(() => {
      isRecording = false;
      interimTranscript = '';
      notify();
    }),
    reset() {
      isRecording = false;
      interimTranscript = '';
      error = null;
      finalHandler = null;
      listeners.clear();
      this.buildTokenizerMock.mockClear();
      this.parseTextToLinesMock.mockClear();
      this.compareKanaStringsMock.mockClear();
      this.getSpokenKanaStatusesMock.mockClear();
      this.katakanaToHiraganaMock.mockClear();
      this.startMock.mockClear();
      this.stopMock.mockClear();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot() {
      return {
        isRecording,
        interimTranscript,
        error,
      };
    },
    attachFinalHandler(handler: (text: string) => void) {
      finalHandler = handler;
    },
    emitFinal(text: string) {
      finalHandler?.(text);
    },
    setInterim(text: string) {
      interimTranscript = text;
      notify();
    },
  };
});

vi.mock('./utils/textParser', () => ({
  buildTokenizer: mockState.buildTokenizerMock,
  parseTextToLines: mockState.parseTextToLinesMock,
}));

vi.mock('./utils/diffMatcher', () => ({
  compareKanaStrings: mockState.compareKanaStringsMock,
  getSpokenKanaStatuses: mockState.getSpokenKanaStatusesMock,
  katakanaToHiragana: mockState.katakanaToHiraganaMock,
}));

vi.mock('./hooks/useSpeechRecognition', async () => {
  const React = await import('react');

  return {
    useSpeechRecognition: ({ onFinalResult }: { onFinalResult: (text: string) => void }) => {
      const [, forceRender] = React.useState(0);

      React.useEffect(() => {
        mockState.attachFinalHandler(onFinalResult);
        return mockState.subscribe(() => {
          forceRender((value) => value + 1);
        });
      }, [onFinalResult]);

      return {
        ...mockState.snapshot(),
        start: mockState.startMock,
        stop: mockState.stopMock,
      };
    },
  };
});

const renderAnalyzedApp = async (text: string) => {
  const user = userEvent.setup();
  render(<App />);

  const analyzeButton = await screen.findByRole('button');
  await user.type(screen.getByRole('textbox'), text);
  await waitFor(() => expect(analyzeButton).toBeEnabled());
  await user.click(analyzeButton);

  return user;
};

const getLineContainer = (lineText: string) => {
  const lineContainer = screen.getByText(lineText).closest('.line-compare-container');
  expect(lineContainer).not.toBeNull();
  return lineContainer as HTMLElement;
};

const getLineRecordButton = (lineText: string) => within(getLineContainer(lineText)).getByRole('button');

const getLineSpokenResult = (lineText: string) => {
  const spokenResult = getLineContainer(lineText).querySelector('.spoken-result');
  expect(spokenResult).not.toBeNull();
  return spokenResult as HTMLElement;
};

describe('App free line recording selection', () => {
  beforeEach(() => {
    mockState.reset();
  });

  it('starts recording on the clicked line even when it is not the first line', async () => {
    const user = await renderAnalyzedApp('first line\nsecond line\nthird line');

    await user.click(getLineRecordButton('third line'));

    expect(mockState.startMock).toHaveBeenCalledTimes(1);
    expect(getLineRecordButton('first line')).toHaveTextContent(/rec/i);
    expect(getLineRecordButton('third line')).toHaveTextContent(/stop/i);
  });

  it('stops and judges the previous line before starting a newly clicked line', async () => {
    const user = await renderAnalyzedApp('alpha line\nbeta line');

    await user.click(getLineRecordButton('alpha line'));

    await act(async () => {
      mockState.emitFinal('alpha final');
    });
    await act(async () => {
      mockState.setInterim(' alpha tail');
    });

    await user.click(getLineRecordButton('beta line'));

    await waitFor(() => {
      expect(mockState.stopMock).toHaveBeenCalledTimes(1);
      expect(mockState.startMock).toHaveBeenCalledTimes(2);
      expect(getLineRecordButton('alpha line')).toHaveTextContent(/rec/i);
      expect(getLineRecordButton('beta line')).toHaveTextContent(/stop/i);
      expect(getLineSpokenResult('alpha line')).toHaveTextContent('alpha final alpha tail');
    });

    expect(mockState.stopMock.mock.invocationCallOrder[0]).toBeLessThan(
      mockState.startMock.mock.invocationCallOrder[1],
    );
    expect(mockState.compareKanaStringsMock).toHaveBeenCalledWith('alpha line', 'alpha final alpha tail');
  });

  it('re-recording one line overwrites only that line result', async () => {
    const user = await renderAnalyzedApp('left line\nright line');

    await user.click(getLineRecordButton('left line'));
    await act(async () => {
      mockState.emitFinal('left first');
    });
    await user.click(getLineRecordButton('left line'));

    await waitFor(() => {
      expect(getLineSpokenResult('left line')).toHaveTextContent('left first');
    });

    await user.click(getLineRecordButton('right line'));
    await act(async () => {
      mockState.emitFinal('right only');
    });
    await user.click(getLineRecordButton('right line'));

    await waitFor(() => {
      expect(getLineSpokenResult('right line')).toHaveTextContent('right only');
    });

    await user.click(getLineRecordButton('left line'));
    expect(getLineContainer('left line')).not.toHaveTextContent('left first');

    await act(async () => {
      mockState.emitFinal('left second');
    });
    await user.click(getLineRecordButton('left line'));

    await waitFor(() => {
      expect(mockState.stopMock).toHaveBeenCalledTimes(3);
      expect(mockState.startMock).toHaveBeenCalledTimes(3);
      expect(getLineSpokenResult('left line')).toHaveTextContent('left second');
      expect(getLineContainer('left line')).not.toHaveTextContent('left first');
      expect(getLineSpokenResult('right line')).toHaveTextContent('right only');
    });
  });
});
