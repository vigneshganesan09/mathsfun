// Shared building blocks: bilingual text with read-aloud, the top bar, beads.
import { useEffect, useState, type ReactNode } from 'react';
import type { Bi, Lang } from './curriculum';
import { BackIcon, EraseIcon, SpeakerIcon } from './Icons';
import { canSpeak, speak } from './speech';
import type { Settings } from './storage';

export function SpeakButton({ text, lang }: { text: string; lang: Lang }) {
  return (
    <button
      className="speak"
      onClick={() => speak(text, lang)}
      aria-label={lang === 'nl' ? 'Lees voor in het Nederlands' : 'Read aloud in English'}
    >
      <SpeakerIcon size={22} />
      <span>{lang.toUpperCase()}</span>
    </button>
  );
}

interface BiTextProps {
  bi: Bi;
  settings: Settings;
  /** What the speaker buttons read, when it differs from the text. */
  speakAs?: Bi;
  size?: 'question' | 'body';
}

/** Dutch line first, English under it (always, on tap or hidden), with NL/EN speaker buttons. */
export function BiText({ bi, settings, speakAs, size = 'question' }: BiTextProps) {
  const [revealed, setRevealed] = useState(false);
  const showEn = settings.english === 'always' || (settings.english === 'tap' && revealed);
  const voice = settings.voice && canSpeak;
  const spoken = speakAs ?? bi;

  return (
    <div className={`bi bi-${size}`}>
      <div className="bi-lines">
        <p className="nl" lang="nl">
          {bi.nl}
        </p>
        {showEn && (
          <p className="en" lang="en">
            {bi.en}
          </p>
        )}
        {settings.english === 'tap' && !revealed && (
          <button className="en-toggle" onClick={() => setRevealed(true)}>
            EN
          </button>
        )}
      </div>
      {voice && (
        <div className="speakers">
          <SpeakButton text={spoken.nl} lang="nl" />
          {settings.english !== 'hidden' && <SpeakButton text={spoken.en} lang="en" />}
        </div>
      )}
    </div>
  );
}

export function TopBar({ onBack, title, right }: { onBack?: () => void; title?: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="round-btn" onClick={onBack} aria-label="Terug">
          <BackIcon />
        </button>
      ) : (
        <span className="round-spacer" />
      )}
      <div className="topbar-title">{title}</div>
      {right ?? <span className="round-spacer" />}
    </header>
  );
}

/** Rekenrek beads: rows of ten, five orange then five white. */
export function Beads({ count }: { count: number }) {
  const pitch = 30;
  const r = 12;
  const gap = 10;
  const rows = Math.ceil(count / 10);
  const cols = Math.min(count, 10);
  const width = cols * pitch + (cols > 5 ? gap : 0);
  const height = rows * pitch + 4;
  return (
    <svg
      className="beads"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: `${width}px` }}
      role="img"
      aria-label={`${count} bolletjes`}
    >
      {Array.from({ length: count }, (_, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        return (
          <circle
            key={i}
            cx={r + 3 + col * pitch + (col >= 5 ? gap : 0)}
            cy={r + 2 + row * pitch}
            r={r}
            className={col < 5 ? 'bead-a' : 'bead-b'}
          />
        );
      })}
    </svg>
  );
}

/** Small version of the cover art: blocks and rekenrek beads. */
export function CoverArt() {
  return (
    <svg className="cover-art" viewBox="0 0 480 288" aria-hidden="true">
      <rect className="fill-ink" x="24" y="0" width="216" height="288" rx="24" />
      <rect className="fill-brand" x="256" y="0" width="200" height="160" rx="24" />
      <rect className="fill-sun" x="256" y="176" width="92" height="112" rx="24" />
      <rect className="fill-accent" x="364" y="176" width="92" height="112" rx="24" />
      {[96, 144, 192].map((cy, row) =>
        Array.from({ length: 10 }, (_, i) => {
          const gap = row === 1 && i >= 7 ? 10 : 0;
          return (
            <circle
              key={`${row}-${i}`}
              cx={42 + i * 18 + gap - (row === 1 ? 5 : 0)}
              cy={cy}
              r={8}
              className={i < 5 ? 'fill-brand' : 'fill-card'}
            />
          );
        }),
      )}
    </svg>
  );
}

/** The on-screen number pad (1–9, erase, 0, and an optional minus key). */
export function NumberPad({
  onKey,
  disabled = false,
  allowNegative = false,
  negative = false,
  decimals = false,
}: {
  onKey: (key: string) => void;
  disabled?: boolean;
  allowNegative?: boolean;
  negative?: boolean;
  /** Shows a decimal-comma key. */
  decimals?: boolean;
}) {
  return (
    <div className="keypad" aria-label="Cijfers">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
        <button key={k} className="key" onClick={() => onKey(k)} disabled={disabled}>
          {k}
        </button>
      ))}
      <button className="key key-erase" onClick={() => onKey('back')} disabled={disabled} aria-label="Wissen">
        <EraseIcon size={30} />
      </button>
      <button className="key" onClick={() => onKey('0')} disabled={disabled}>
        0
      </button>
      {allowNegative ? (
        <button className={`key ${negative ? 'is-on' : ''}`} onClick={() => onKey('neg')} disabled={disabled} aria-label="Min-teken" aria-pressed={negative}>
          −
        </button>
      ) : decimals ? (
        <button className="key" onClick={() => onKey(',')} disabled={disabled} aria-label="Komma">
          ,
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

/** Digits, Backspace and Enter from a physical keyboard. */
export function useTypedKeys(onKey: (key: string) => void, onEnter: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement && e.key === 'Enter') return;
      if (/^[0-9]$/.test(e.key)) onKey(e.key);
      else if (e.key === 'Backspace') onKey('back');
      else if (e.key === 'Enter') onEnter();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey, onEnter, enabled]);
}
