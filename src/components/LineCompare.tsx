import React from 'react';
import { KaraokeLineData, LineCompareResult } from '../types';
import { RubyWord } from './RubyWord';

interface LineCompareProps {
  line: KaraokeLineData;
  isActive: boolean;
  isRecording: boolean;
  result?: LineCompareResult;
  onToggleRecord: (lineIndex: number) => void;
}

export const LineCompare: React.FC<LineCompareProps> = ({ line, isActive, isRecording, result, onToggleRecord }) => {
  const isLineRecording = isActive && isRecording;

  return (
    <div className={`line-compare-container ${isActive ? 'active-line' : ''}`}>
      <div className="original-text">
        {line.words.map((w) => (
          <React.Fragment key={w.id}>
            <RubyWord word={w} isSpoken={false} />
            {/* 句読点など、kuromojiでうまく分かれない場合のスペースなどがあれば補完（今回は不要） */}
          </React.Fragment>
        ))}
      </div>
      
      {result && (
        <div className="spoken-result">
          <span className="result-label">あなたの声: </span>
          {result.spokenWords.map((w) => (
            <React.Fragment key={w.id}>
              <RubyWord word={w} isSpoken={true} />
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button 
          className={isLineRecording ? "btn-record stop-btn" : "btn-record start-btn"} 
          onClick={() => onToggleRecord(line.lineIndex)}
          style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
        >
          {isLineRecording ? '🛑 STOP' : '🎤 REC'}
        </button>
      </div>
    </div>
  );
};
