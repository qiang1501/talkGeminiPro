import React from 'react';
import { KaraokeLineData, LineCompareResult } from '../types';
import { RubyWord } from './RubyWord';

interface LineCompareProps {
  line: KaraokeLineData;
  isActive: boolean;
  result?: LineCompareResult;
}

export const LineCompare: React.FC<LineCompareProps> = ({ line, isActive, result }) => {
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
    </div>
  );
};
