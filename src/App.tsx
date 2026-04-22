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
  const [currentLineTranscript, setCurrentLineTranscript] = useState('');
  const [isUserRecording, setIsUserRecording] = useState(false);

  // We use a ref to hold the latest state because onFinalResult is a callback from the speech API listener
  const stateRef = useRef({ parsedLines, currentLineIndex, isFinished, lineResults, currentLineTranscript });
  
  useEffect(() => {
    stateRef.current = { parsedLines, currentLineIndex, isFinished, lineResults, currentLineTranscript };
  }, [parsedLines, currentLineIndex, isFinished, lineResults, currentLineTranscript]);

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
    const { parsedLines: currentLines, lineResults: results } = stateRef.current;
    if (!currentLines || lineIdx >= currentLines.length) return;

    if (!textToJudge.trim()) {
      // Nothing spoken, maybe set empty result or just return
      const filteredResults = results.filter(r => r.lineIndex !== lineIdx);
      setLineResults(filteredResults);
      return;
    }

    const spokenLines = parseTextToLines(textToJudge);
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

  const handleFinalResult = useCallback((transcript: string) => {
    const { isFinished: finished } = stateRef.current;
    if (finished) return;
    
    // Accumulate the transcript for the current line
    setCurrentLineTranscript(prev => prev + transcript);
  }, []);

  const { isRecording, interimTranscript, error: speechError, start, stop } = useSpeechRecognition({
    onFinalResult: handleFinalResult
  });

  // Watch for unexpected stops (e.g., timeout) and auto-restart if user still wants to record
  useEffect(() => {
    if (isUserRecording && !isRecording) {
      start();
    }
  }, [isRecording, isUserRecording, start]);

  const toggleRecording = (idx: number) => {
    if (isUserRecording) {
      if (currentLineIndex === idx) {
        // User clicked STOP on the active line
        setIsUserRecording(false);
        stop();
        
        // Use the current accumulated final text PLUS whatever is currently in the interim transcript
        const finalFullText = stateRef.current.currentLineTranscript + interimTranscript;
        judgeLine(idx, finalFullText);
      } else {
        // Switch to new line and start
        setIsUserRecording(false);
        stop();
        const finalFullText = stateRef.current.currentLineTranscript + interimTranscript;
        judgeLine(currentLineIndex, finalFullText);

        setTimeout(() => {
          setIsUserRecording(true);
          setCurrentLineIndex(idx);
          setCurrentLineTranscript('');
          setLineResults(prev => prev.filter(r => r.lineIndex !== idx));
          start();
        }, 200);
      }
    } else {
      setIsUserRecording(true);
      setCurrentLineIndex(idx);
      setCurrentLineTranscript('');
      setLineResults(prev => prev.filter(r => r.lineIndex !== idx));
      start();
    }
  };

  const error = initError || speechError;

  const handleAnalyze = (text: string) => {
    try {
      const lines = parseTextToLines(text);
      if (lines.length > 0) {
        setParsedLines(lines);
        setLineResults([]);
        setCurrentLineIndex(0);
        setCurrentLineTranscript('');
        setIsUserRecording(false);
        setIsFinished(false);
      }
    } catch (e) {
      console.error(e);
      alert('解析に失敗しました。');
    }
  };

  const handleReset = () => {
    setIsUserRecording(false);
    stop();
    setParsedLines(null);
    setLineResults([]);
    setCurrentLineIndex(0);
    setCurrentLineTranscript('');
    setIsFinished(false);
  };

  const handleRetry = () => {
    setIsUserRecording(false);
    stop();
    setLineResults([]);
    setCurrentLineIndex(0);
    setCurrentLineTranscript('');
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
            <div className="lines-display">
              {parsedLines.map((line, idx) => (
                <LineCompare 
                  key={idx} 
                  line={line} 
                  isActive={!isFinished && idx === currentLineIndex}
                  isRecording={isUserRecording && idx === currentLineIndex}
                  result={lineResults.find(r => r.lineIndex === idx)} 
                  onToggleRecord={toggleRecording}
                />
              ))}
            </div>

            <div className="finish-action" style={{ textAlign: 'center', marginTop: '30px', paddingBottom: '10px' }}>
              <button className="btn-primary" onClick={() => setIsFinished(true)} style={{ fontSize: '24px', padding: '15px 50px' }}>
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
