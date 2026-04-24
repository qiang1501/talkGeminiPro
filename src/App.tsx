import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import { KaraokeLineData, LineCompareResult } from './types';
import { buildTokenizer, parseTextToLines } from './utils/textParser';
import { compareKanaStrings, getSpokenKanaStatuses } from './utils/diffMatcher';
import { extractEnglishWords, transliterateEnglishWords, type EnglishKatakanaMap } from './utils/englishKatakana';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { TextInputPanel } from './components/TextInputPanel';
import { LivePreview } from './components/LivePreview';
import { ScorePanel } from './components/ScorePanel';
import { LineCompare } from './components/LineCompare';

const AUTO_JUDGE_IDLE_MS = 5000;

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [parsedLines, setParsedLines] = useState<KaraokeLineData[] | null>(null);
  const [lineResults, setLineResults] = useState<LineCompareResult[]>([]);

  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [recordingLineIndex, setRecordingLineIndex] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [currentLineTranscript, setCurrentLineTranscript] = useState('');
  const [isUserRecording, setIsUserRecording] = useState(false);
  const [isSparkling, setIsSparkling] = useState(false);
  const [sparkleColor, setSparkleColor] = useState('var(--neon-blue)');
  const [recordingSessionToken, setRecordingSessionToken] = useState(0);
  const [lastLiveTextUpdateAt, setLastLiveTextUpdateAt] = useState<number | null>(null);
  const [englishReadings, setEnglishReadings] = useState<EnglishKatakanaMap>({});
  const lastTranscriptRef = useRef('');
  const colorIndexRef = useRef(0);
  const recordingSessionIdRef = useRef(0);
  const pendingStartSessionIdRef = useRef<number | null>(null);
  const colors = ['var(--neon-blue)', 'var(--neon-pink)', 'var(--neon-green)', 'var(--neon-red)'];

  // We use a ref to hold the latest state because onFinalResult is a callback from the speech API listener
  const stateRef = useRef({
    parsedLines,
    selectedLineIndex,
    recordingLineIndex,
    isFinished,
    lineResults,
    currentLineTranscript,
    isUserRecording,
    englishReadings,
    isRecording: false
  });

  useEffect(() => {
    buildTokenizer()
      .then(() => setIsInitializing(false))
      .catch(e => {
        console.error('Failed to init kuromoji', e);
        setInitError(`辞書の読み込みに失敗しました: ${e.message || String(e)}`);
        setIsInitializing(false);
      });
  }, []);

  const judgeLine = useCallback((lineIdx: number, textToJudge: string) => {
    const { parsedLines: currentLines, lineResults: results, englishReadings: currentEnglishReadings } = stateRef.current;
    if (!currentLines || lineIdx >= currentLines.length) return;

    if (!textToJudge.trim()) {
      const filteredResults = results.filter(r => r.lineIndex !== lineIdx);
      setLineResults(filteredResults);
      return;
    }

    const spokenLines = parseTextToLines(textToJudge, currentEnglishReadings);
    if (spokenLines.length === 0) return;

    const spokenLine = spokenLines[0];
    const spokenKana = spokenLine.originalKana;
    const spokenWords = spokenLine.words;
    const targetLine = currentLines[lineIdx];

    const diffResult = compareKanaStrings(targetLine.originalKana, spokenKana);
    const spokenStatuses = getSpokenKanaStatuses(targetLine.originalKana, spokenKana);

    let correctChars = 0;
    let totalChars = 0;
    diffResult.forEach(r => {
      if (r.status !== 'ignored') {
        totalChars++;
        if (r.status === 'correct') correctChars++;
      }
    });

    let charIndex = 0;
    spokenWords.forEach(word => {
      const wordStatuses = [];
      for (let i = 0; i < word.reading.length; i++) {
        wordStatuses.push({
          char: word.reading[i],
          status: spokenStatuses[charIndex] || 'missing'
        });
        charIndex++;
      }
      word.rubyStatuses = wordStatuses;
    });

    const newResult: LineCompareResult = {
      lineIndex: lineIdx,
      spokenText: textToJudge,
      spokenKana,
      spokenWords,
      diffResult,
      correctChars,
      totalChars
    };

    const filteredResults = results.filter(r => r.lineIndex !== lineIdx);
    setLineResults([...filteredResults, newResult]);
  }, []);

  const advanceRecordingSession = useCallback(() => {
    const nextSessionId = recordingSessionIdRef.current + 1;
    recordingSessionIdRef.current = nextSessionId;
    pendingStartSessionIdRef.current = null;
    setRecordingSessionToken(nextSessionId);
    return nextSessionId;
  }, []);

  const handleFinalResult = useCallback((transcript: string) => {
    const sessionIdAtRegistration = recordingSessionToken;
    const {
      isFinished: finished,
      recordingLineIndex: activeRecordingLine,
      isUserRecording: userRecording,
      isRecording: activelyRecording
    } = stateRef.current;

    if (finished || !userRecording || !activelyRecording || activeRecordingLine === null) return;
    if (recordingSessionIdRef.current !== sessionIdAtRegistration) return;
    setCurrentLineTranscript(prev => {
      if (recordingSessionIdRef.current !== sessionIdAtRegistration) {
        return prev;
      }

      return prev + transcript;
    });
  }, [recordingSessionToken]);

  const { isRecording, interimTranscript, error: speechError, canStart, start, stop } = useSpeechRecognition({
    onFinalResult: handleFinalResult
  });

  useEffect(() => {
    stateRef.current = {
      parsedLines,
      selectedLineIndex,
      recordingLineIndex,
      isFinished,
      lineResults,
      currentLineTranscript,
      isUserRecording,
      englishReadings,
      isRecording
    };
  }, [
    parsedLines,
    selectedLineIndex,
    recordingLineIndex,
    isFinished,
    lineResults,
    currentLineTranscript,
    isUserRecording,
    englishReadings,
    isRecording
  ]);

  // interimTranscriptの更新を監視してキラキラエフェクトを発火させる
  useEffect(() => {
    if (interimTranscript !== lastTranscriptRef.current && interimTranscript !== '') {
      const nextIndex = (colorIndexRef.current + 1) % colors.length;
      colorIndexRef.current = nextIndex;
      setSparkleColor(colors[nextIndex]);
      if (isUserRecording && recordingLineIndex !== null) {
        setLastLiveTextUpdateAt(Date.now());
      }

      setIsSparkling(true);
      const timer = setTimeout(() => setIsSparkling(false), 200);
      lastTranscriptRef.current = interimTranscript;
      return () => clearTimeout(timer);
    }

    lastTranscriptRef.current = interimTranscript;
  }, [interimTranscript, isUserRecording, recordingLineIndex]);

  useEffect(() => {
    const pendingSessionId = pendingStartSessionIdRef.current;
    if (isFinished || !isUserRecording || recordingLineIndex === null || pendingSessionId === null) return;

    if (pendingSessionId !== recordingSessionIdRef.current) {
      pendingStartSessionIdRef.current = null;
      return;
    }

    if (isRecording) {
      pendingStartSessionIdRef.current = null;
      return;
    }

    if (!canStart) return;

    start();
  }, [canStart, isFinished, isRecording, isUserRecording, recordingLineIndex, recordingSessionToken, start]);

  // Watch for unexpected stops (e.g., timeout) and auto-restart if user still wants to record
  useEffect(() => {
    if (pendingStartSessionIdRef.current !== null) return;

    if (!isFinished && isUserRecording && recordingLineIndex !== null && !isRecording && canStart) {
      start();
    }
  }, [canStart, isFinished, isRecording, isUserRecording, recordingLineIndex, start]);

  const startRecordingForLine = useCallback((lineIdx: number) => {
    const nextSessionId = advanceRecordingSession();
    pendingStartSessionIdRef.current = nextSessionId;
    setSelectedLineIndex(lineIdx);
    setRecordingLineIndex(lineIdx);
    setCurrentLineTranscript('');
    setLastLiveTextUpdateAt(Date.now());
    setLineResults(prev => prev.filter(r => r.lineIndex !== lineIdx));
    setIsUserRecording(true);
  }, [advanceRecordingSession]);

  const stopRecordingForLine = useCallback((lineIdx: number) => {
    advanceRecordingSession();
    setIsUserRecording(false);
    setRecordingLineIndex(null);
    setLastLiveTextUpdateAt(null);
    stop();

    const finalFullText = stateRef.current.currentLineTranscript + interimTranscript;
    judgeLine(lineIdx, finalFullText);
  }, [advanceRecordingSession, interimTranscript, judgeLine, stop]);

  const stopRecognitionIfActive = useCallback(() => {
    const { recordingLineIndex: activeRecordingLine, isUserRecording: userRecording, isRecording: activelyRecording } = stateRef.current;
    if (activeRecordingLine !== null || userRecording || activelyRecording) {
      stop();
    }
  }, [stop]);

  const toggleRecording = (nextLineIndex: number) => {
    const { recordingLineIndex: activeRecordingLine } = stateRef.current;

    if (activeRecordingLine === null) {
      startRecordingForLine(nextLineIndex);
      return;
    }

    if (activeRecordingLine === nextLineIndex) {
      setSelectedLineIndex(nextLineIndex);
      stopRecordingForLine(nextLineIndex);
      return;
    }

    stopRecordingForLine(activeRecordingLine);
    startRecordingForLine(nextLineIndex);
  };

  useEffect(() => {
    if (isFinished || !isUserRecording || recordingLineIndex === null) return;
    if (lastLiveTextUpdateAt === null) return;

    const elapsedMs = Date.now() - lastLiveTextUpdateAt;
    const remainingMs = Math.max(0, AUTO_JUDGE_IDLE_MS - elapsedMs);

    const timer = setTimeout(() => {
      const { recordingLineIndex: activeRecordingLine, isUserRecording: userRecording } = stateRef.current;
      if (isFinished || !userRecording || activeRecordingLine === null) return;

      setSelectedLineIndex(activeRecordingLine);
      stopRecordingForLine(activeRecordingLine);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [isFinished, isUserRecording, lastLiveTextUpdateAt, recordingLineIndex, stopRecordingForLine]);

  const handleHoverLine = useCallback((lineIdx: number) => {
    setSelectedLineIndex(lineIdx);
  }, []);

  const handleLeaveLines = useCallback(() => {
    setSelectedLineIndex(null);
  }, []);

  const error = initError || speechError;

  const handleAnalyze = async (text: string) => {
    try {
      const englishWords = extractEnglishWords(text);
      const convertedReadings = await transliterateEnglishWords(englishWords);
      const lines = parseTextToLines(text, convertedReadings);
      if (lines.length > 0) {
        advanceRecordingSession();
        stopRecognitionIfActive();
        setEnglishReadings(convertedReadings);
        setParsedLines(lines);
        setLineResults([]);
        setSelectedLineIndex(null);
        setRecordingLineIndex(null);
        setCurrentLineTranscript('');
        setLastLiveTextUpdateAt(null);
        setIsUserRecording(false);
        setIsFinished(false);
      }
    } catch (e) {
      console.error(e);
      alert('解析に失敗しました。');
    }
  };

  const handleReset = () => {
    advanceRecordingSession();
    stopRecognitionIfActive();
    setParsedLines(null);
    setEnglishReadings({});
    setLineResults([]);
    setEnglishReadings({});
    setSelectedLineIndex(null);
    setRecordingLineIndex(null);
    setCurrentLineTranscript('');
    setLastLiveTextUpdateAt(null);
    setIsUserRecording(false);
    setIsFinished(false);
  };

  const handleRetry = () => {
    advanceRecordingSession();
    stopRecognitionIfActive();
    setLineResults([]);
    setSelectedLineIndex(null);
    setRecordingLineIndex(null);
    setCurrentLineTranscript('');
    setLastLiveTextUpdateAt(null);
    setIsUserRecording(false);
    setIsFinished(false);
  };

  const handleFinish = useCallback(() => {
    const {
      recordingLineIndex: activeRecordingLine,
      currentLineTranscript: accumulatedTranscript,
      isUserRecording: userRecording,
      isRecording: activelyRecording
    } = stateRef.current;

    if (activeRecordingLine !== null || userRecording || activelyRecording) {
      const finalFullText = accumulatedTranscript + interimTranscript;

      advanceRecordingSession();
      setIsUserRecording(false);
      setRecordingLineIndex(null);
      setCurrentLineTranscript('');
      setLastLiveTextUpdateAt(null);
      stop();

      if (activeRecordingLine !== null) {
        judgeLine(activeRecordingLine, finalFullText);
      }
    }

    setIsFinished(true);
  }, [advanceRecordingSession, interimTranscript, judgeLine, stop]);

  // スコアの計算
  let totalScoreChars = 0;
  let correctScoreChars = 0;
  lineResults.forEach(r => {
    totalScoreChars += r.totalChars;
    correctScoreChars += r.correctChars;
  });

  return (
    <div className="App">
      <header className="header" onClick={handleReset} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <h1>🗣️ 日本語発音チェッカー</h1>
      </header>

      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {!parsedLines && (
          <TextInputPanel onAnalyze={handleAnalyze} isLoading={isInitializing} />
        )}

        {parsedLines && !isFinished && (
          <div className="karaoke-container panel">
            <div className="lines-display" onMouseLeave={handleLeaveLines}>
              {parsedLines.map((line, idx) => (
                <LineCompare
                  key={idx}
                  line={line}
                  isActive={!isFinished && idx === selectedLineIndex}
                  isRecording={isUserRecording && idx === recordingLineIndex}
                  isSparkling={idx === recordingLineIndex && isSparkling}
                  sparkleColor={sparkleColor}
                  result={lineResults.find(r => r.lineIndex === idx)}
                  onToggleRecord={toggleRecording}
                  onHoverLine={handleHoverLine}
                />
              ))}
            </div>

            <div className="finish-action" style={{ textAlign: 'center', marginTop: '30px', paddingBottom: '10px' }}>
              <button className="btn-primary" onClick={handleFinish} style={{ fontSize: '24px', padding: '15px 50px' }}>
                💯 採点する
              </button>
            </div>

            <LivePreview transcript={interimTranscript} />
          </div>
        )}

        {isFinished && (
          <ScorePanel
            totalChars={totalScoreChars}
            correctChars={correctScoreChars}
            onReset={handleReset}
            onRetry={handleRetry}
          />
        )}
      </main>
    </div>
  );
}

export default App;
