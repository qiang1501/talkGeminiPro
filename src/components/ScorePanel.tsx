import React from 'react';

interface ScoreProps {
  totalChars: number;
  correctChars: number;
  onReset: () => void;
}

export const ScorePanel: React.FC<ScoreProps> = ({ totalChars, correctChars, onReset }) => {
  const rate = totalChars === 0 ? 0 : (correctChars / totalChars) * 100;
  
  return (
    <div className="score-panel panel">
      <h2>🎉 結果発表 🎉</h2>
      <div className="score-details">
        <p>総判定文字数: <strong>{totalChars}</strong></p>
        <p>正しく発声できた文字数: <span className="correct-text"><strong>{correctChars}</strong></span></p>
        <p>正答率: <strong>{rate.toFixed(1)}%</strong></p>
      </div>
      <div className="final-score">
        <h3>スコア: <span>{Math.round(rate)}</span> 点</h3>
      </div>
      <button className="btn-secondary" onClick={onReset}>もう一度最初から</button>
    </div>
  );
};
