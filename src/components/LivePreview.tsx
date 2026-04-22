import React from 'react';

interface LivePreviewProps {
  transcript: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ transcript }) => {
  if (!transcript) return null;
  return (
    <div className="live-preview panel">
      <h3>🗣️ ライブ認識状況 (採点には不使用)</h3>
      <p className="interim-text">{transcript}</p>
    </div>
  );
};
