import { useState } from 'react';

interface CustomReadingPanelProps {
  onSave: (word: string, reading: string) => Promise<void>;
}

export function CustomReadingPanel({ onSave }: CustomReadingPanelProps) {
  const [word, setWord] = useState('');
  const [reading, setReading] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedWord = word.trim();
    const trimmedReading = reading.trim();
    if (!trimmedWord || !trimmedReading) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await onSave(trimmedWord, trimmedReading);
      setMessage(`Saved: ${trimmedWord} -> ${trimmedReading}`);
      setWord('');
      setReading('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save custom reading.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel custom-reading-panel">
      <h2>Custom English Reading</h2>
      <p className="custom-reading-help">
        Register your preferred reading (e.g. AWS - エーダブリューエス).
      </p>
      <div className="custom-reading-grid">
        <input
          className="custom-reading-input"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Word (AWS)"
        />
        <input
          className="custom-reading-input"
          type="text"
          value={reading}
          onChange={(e) => setReading(e.target.value)}
          placeholder="Reading (エーダブリューエス)"
        />
        <button
          className="btn-primary custom-reading-save"
          onClick={handleSubmit}
          disabled={isSaving || !word.trim() || !reading.trim()}
        >
          {isSaving ? 'Saving...' : 'Save Reading'}
        </button>
      </div>
      {message && <p className="custom-reading-message">{message}</p>}
      {error && <p className="custom-reading-error">{error}</p>}
    </section>
  );
}
