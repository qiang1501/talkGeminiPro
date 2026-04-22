import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import { KaraokeLineData, LineCompareResult } from './types';
import { buildTokenizer, parseTextToLines } from './utils/textParser';
import { compareKanaStrings, getSpokenKanaStatuses } from './utils/diffMatcher';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { TextInputPanel } from './components/TextInputPanel';
import { LivePreview } from './components/LivePreview';
import { ScorePanel } from './components/ScorePanel';
import { LineCompare } from './components/LineCompare';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [parsedLines, setParsedLines] = useState<KaraokeLineData[] | null>(null);
  const [lineResults, setLineResults] = useState<LineCompareResult[]>([]);
  
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // We use a ref to hold the latest state because onFinalResult is a callback from the speech API listener
  const stateRef = useRef({ parsedLines, currentLineIndex, isFinished, lineResults });
  
  useEffect(() => {
    stateRef.current = { parsedLines, currentLineIndex, isFinished, lineResults };
  }, [parsedLines, currentLineIndex, isFinished, lineResults]);

  useEffect(() => {
    buildTokenizer()
      .then(() => setIsInitializing(false))
      .catch(e => {
        console.error('Failed to init kuromoji', e);
        setInitError(`辞書の読み込みに失敗しました: ${e.message || String(e)}`);
        setIsInitializing(false);
      });
  }, []);

  const handleFinalResult = useCallback((transcript: string) => {
    const { parsedLines: currentLines, currentLineIndex: lineIdx, isFinished: finished, lineResults: results } = stateRef.current;
    if (finished || !currentLines) return;
    
    // 発声結果を形態素解析して単語リストとカタカナを取得
    const spokenLines = parseTextToLines(transcript);
    if (spokenLines.length === 0) return;

    const spokenLine = spokenLines[0]; // 音声認識結果は通常1行
    const spokenKana = spokenLine.originalKana;
    const spokenWords = spokenLine.words;
    const targetLine = currentLines[lineIdx];
    
    // 行単位でのカタカナdiff取得
    const diffResult = compareKanaStrings(targetLine.originalKana, spokenKana);
    // SpokenKanaの文字に対応するステータス配列を取得
    const spokenStatuses = getSpokenKanaStatuses(targetLine.originalKana, spokenKana);
    
    let correctChars = 0;
    let totalChars = 0;
    diffResult.forEach(r => {
      // 句読点はスコアに影響させない
      if (r.status !== 'ignored') {
        totalChars++;
        if (r.status === 'correct') {
          correctChars++;
        }
      }
    });

    // 各spokenWordにrubyStatusesを割り当てる
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
      spokenText: transcript,
      spokenKana,
      spokenWords,
      diffResult,
      correctChars,
      totalChars
    };

    setLineResults([...results, newResult]);
    
    const nextLineIdx = lineIdx + 1;
    setCurrentLineIndex(nextLineIdx);

    if (nextLineIdx >= currentLines.length) {
      setIsFinished(true);
    }
  }, []);

  const { isRecording, interimTranscript, error: speechError, start, stop } = useSpeechRecognition({
    onFinalResult: handleFinalResult
  });

  const error = initError || speechError;

  const handleAnalyze = (text: string) => {
    try {
      const lines = parseTextToLines(text);
      if (lines.length > 0) {
        setParsedLines(lines);
        setLineResults([]);
        setCurrentLineIndex(0);
        setIsFinished(false);
      }
    } catch (e) {
      console.error(e);
      alert('解析に失敗しました。');
    }
  };

  const handleReset = () => {
    stop();
    setParsedLines(null);
    setLineResults([]);
    setCurrentLineIndex(0);
    setIsFinished(false);
  };

  // スコアの計算
  let totalScoreChars = 0;
  let correctScoreChars = 0;
  lineResults.forEach(r => {
    totalScoreChars += r.totalChars;
    correctScoreChars += r.correctChars;
  });

  return (
    <div className="App">
      <header className="header">
        <h1>🗣️ 日本語発音チェッカー</h1>
      </header>
      
      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {!parsedLines && (
          <TextInputPanel onAnalyze={handleAnalyze} isLoading={isInitializing} />
        )}

        {parsedLines && !isFinished && (
          <div className="karaoke-container panel">
            <h2>2. マイクボタンを押して1行ずつ読み上げてください</h2>
            <div className="controls">
              {!isRecording ? (
                <button className="btn-record start-btn" onClick={start}>🎤 録音開始</button>
              ) : (
                <button className="btn-record stop-btn" onClick={stop}>🛑 録音停止</button>
              )}
              <button className="btn-secondary" onClick={handleReset}>キャンセル</button>
            </div>
            
            <div className="lines-display">
              {parsedLines.map((line, idx) => (
                <LineCompare 
                  key={idx} 
                  line={line} 
                  isActive={!isFinished && idx === currentLineIndex}
                  result={lineResults.find(r => r.lineIndex === idx)} 
                />
              ))}
            </div>

            <LivePreview transcript={interimTranscript} />
          </div>
        )}

        {isFinished && (
          <ScorePanel 
            totalChars={totalScoreChars} 
            correctChars={correctScoreChars} 
            onReset={handleReset} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
