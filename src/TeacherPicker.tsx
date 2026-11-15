import { CheckIcon, SpeakerIcon } from './Icons';
import { Character } from './pictures';
import { canSpeak, speakText } from './speech';
import type { Settings } from './storage';
import { TEACHERS, type TeacherId } from './teachers';
import { TopBar } from './ui';

interface GridProps {
  value: TeacherId;
  english: boolean;
  onPick: (id: TeacherId) => void;
  compact?: boolean;
}

/** The teacher cards: tap Luister to hear them, tap the card to choose. */
export function TeacherGrid({ value, english, onPick, compact = false }: GridProps) {
  return (
    <div className={`teacher-grid ${compact ? 'is-compact' : ''}`}>
      {TEACHERS.map((t) => {
        const on = t.id === value;
        return (
          <div key={t.id} className={`teacher-card ${on ? 'is-on' : ''}`}>
            <button
              className="teacher-pick"
              aria-pressed={on}
              onClick={() => {
                onPick(t.id);
                speakText(t.greeting.nl, 'nl', { teacher: t.id });
              }}
            >
              <span className="teacher-art">
                <Character who={t.who} size={compact ? 64 : 88} />
              </span>
              <span className="t-title">{t.name.nl}</span>
              {english && <span className="en">{t.name.en}</span>}
              <span className="t-label muted">{t.style.nl}</span>
              {on && (
                <span className="teacher-chosen t-label">
                  <CheckIcon size={18} /> Gekozen · Chosen
                </span>
              )}
            </button>
            {canSpeak && (
              <div className="teacher-listen">
                <button className="speak" aria-label={`Luister naar ${t.name.nl} in het Nederlands`} onClick={() => speakText(t.greeting.nl, 'nl', { teacher: t.id })}>
                  <SpeakerIcon size={22} />
                  <span>NL</span>
                </button>
                {english && (
                  <button className="speak" aria-label={`Listen to ${t.name.en} in English`} onClick={() => speakText(t.greeting.en, 'en', { teacher: t.id })}>
                    <SpeakerIcon size={22} />
                    <span>EN</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TeacherPicker({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const en = settings.english !== 'hidden';
  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Kies je juf of meester</h1>
            {en && <p className="en">Choose your teacher · tik op Luister om ze te horen / tap Listen to hear them</p>}
          </>
        }
      />
      <TeacherGrid value={settings.teacher} english={en} onPick={(teacher) => onChange({ ...settings, teacher })} />
    </section>
  );
}
