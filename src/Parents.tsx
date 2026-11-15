import { LEVELS } from './core';
import { useEffect, useReducer, useState } from 'react';
import type { Lang } from './core';
import { canListen } from './listen';
import { canSpeak, hasVoice, onVoicesChanged, speakText, voicesFor, type Speed } from './speech';
import { GROEPEN } from './curriculum';
import { isoDay } from './review';
import { STORY_GROEP } from './stories';
import { allLevelStars, clearProgress, deleteProfile, loadSkills, updateProfile, type EnglishMode, type Profile, type Settings } from './storage';
import { TopBar } from './ui';

interface Props {
  settings: Settings;
  profile: Profile;
  onChange: (s: Settings) => void;
  onProfileChange: (p: Profile) => void;
  onBack: () => void;
  /** Back to the mode chooser (Thuis / Klas / Boek). */
  onModes: () => void;
}

const ENGLISH: { value: EnglishMode; nl: string; en: string }[] = [
  { value: 'always', nl: 'Altijd', en: 'Always shown' },
  { value: 'tap', nl: 'Bij tikken', en: 'On tap' },
  { value: 'hidden', nl: 'Verbergen', en: 'Hidden' },
];

function OnOff({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      <button className={value ? 'is-on' : ''} aria-pressed={value} onClick={() => onChange(true)}>
        Aan · On
      </button>
      <button className={!value ? 'is-on' : ''} aria-pressed={!value} onClick={() => onChange(false)}>
        Uit · Off
      </button>
    </div>
  );
}

export default function Parents({ settings, profile, onChange, onProfileChange, onBack, onModes }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const missingNl = canSpeak && !hasVoice('nl');
  const [name, setName] = useState(profile.name);
  const [deleting, setDeleting] = useState(false);
  const saveProfile = (patch: Partial<Profile>) => {
    const p = { ...profile, ...patch };
    updateProfile(p);
    onProfileChange(p);
  };
  const levelStars = allLevelStars();
  const groep = GROEPEN.find((g) => g.id === profile.groep);
  const weak = loadSkills()
    .filter((s) => s.box === 1)
    .slice(0, 12);
  const today = isoDay(new Date());
  // Re-render when the browser finishes loading its voices.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onVoicesChanged(refresh), []);

  const voicePicker = (lang: Lang) => {
    const list = voicesFor(lang);
    const key = lang === 'nl' ? 'voiceNl' : 'voiceEn';
    const sample = lang === 'nl' ? 'Hallo! Ik lees je voor. Hoeveel is 7 plus 8?' : "Hello! I'll read to you. What is 7 plus 8?";
    const current = settings[key] ?? '';
    return (
      <div className="voice-row">
        <label className="t-label" htmlFor={`voice-${lang}`}>
          {lang === 'nl' ? 'Nederlandse stem · Dutch voice' : 'Engelse stem · English voice'}
        </label>
        <div className="voice-pick">
          <select
            id={`voice-${lang}`}
            className="select"
            value={current}
            disabled={list.length === 0}
            onChange={(e) => set({ [key]: e.target.value || null } as Partial<Settings>)}
          >
            {list.length === 0 ? <option value="">Geen stem gevonden · none found</option> : <option value="">Automatisch: past bij de juf of meester · Automatic (matches the teacher)</option>}
            {list.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang}){v.localService ? '' : ' · online'}
              </option>
            ))}
          </select>
          <button
            className="btn btn-accent"
            disabled={list.length === 0}
            onClick={() => speakText(sample, lang, { voiceURI: current || undefined })}
          >
            Test
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Voor ouders</h1>
            <p className="en">For parents</p>
          </>
        }
      />

      <div className="card setting">
        <h2 className="t-label">Kind · Child</h2>
        <label className="t-label muted" htmlFor="p-name">
          Naam · Name
        </label>
        <input id="p-name" className="text-input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && saveProfile({ name: name.trim() })} />
        <h3 className="t-label muted">Groep · Group</h3>
        <div className="chips">
          {GROEPEN.map((g) => (
            <button key={g.id} className={`chip ${profile.groep === g.id ? 'is-on' : ''}`} aria-pressed={profile.groep === g.id} onClick={() => saveProfile({ groep: g.id })}>
              {g.name.nl}
            </button>
          ))}
        </div>
        <div className="btn-pair">
          <button className="btn btn-secondary" onClick={onModes}>
            Andere modus · Other mode
          </button>
          {deleting ? (
            <button
              className="btn btn-secondary"
              onClick={() => {
                deleteProfile(profile.id);
                onModes();
              }}
            >
              Ja, {profile.name} verwijderen
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setDeleting(true)}>
              Kind verwijderen · Remove child
            </button>
          )}
        </div>
      </div>

      <div className="card setting">
        <h2 className="t-label">Voortgang · Progress {groep ? `(${groep.name.nl})` : ''}</h2>
        <ul className="report">
          {[...(groep?.topics ?? []), ...STORY_GROEP.topics].map((t) => (
            <li key={t.id}>
              <span>{t.name.nl}</span>
              <span className="report-stars" aria-label="sterren per level">
                {LEVELS.map((l) => (
                  <span key={l} className="report-level">
                    L{l}: {levelStars[`${t.id}:${l}`] ?? '–'}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <h3 className="t-label">Lastige sommen · Weak skills</h3>
        <p className="en">
          {weak.length === 0
            ? 'Nog niets om te herhalen. Nothing to review yet.'
            : `Deze komen terug in de Dagmix en in de levels (${today}). These come back in the daily mix and in levels.`}
        </p>
        {weak.length > 0 && (
          <div className="word-chips">
            {weak.map((w) => (
              <span key={w.key} className="word-chip">
                {w.question.expr ? w.question.expr.replace('□', '?') : w.question.text.nl}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card setting">
        <h2 className="t-label">Engelse vertaling · English translation</h2>
        <p className="en">Onder elke vraag, hint en melding. Under every question, hint and message.</p>
        <div className="segmented" role="group" aria-label="Engelse vertaling">
          {ENGLISH.map((o) => (
            <button
              key={o.value}
              className={settings.english === o.value ? 'is-on' : ''}
              aria-pressed={settings.english === o.value}
              onClick={() => set({ english: o.value })}
            >
              {o.nl}
              <small>{o.en}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="card setting">
        <h2 className="t-label">Voorlezen · Read aloud</h2>
        <p className="en">
          {!canSpeak
            ? 'Deze browser kan niet voorlezen. This browser can’t read aloud.'
            : missingNl
              ? 'Geen Nederlandse stem gevonden op dit apparaat. No Dutch voice found on this device; add one in the system settings.'
              : 'Kies de stem die je kind het best verstaat. Pick the voice your child understands best.'}
        </p>
        <OnOff value={settings.voice} onChange={(voice) => set({ voice })} label="Voorlezen" />
        <h3 className="t-label">Elke vraag automatisch voorlezen · Read every question aloud automatically</h3>
        <OnOff value={settings.autoRead} onChange={(autoRead) => set({ autoRead })} label="Automatisch voorlezen" />
        {canSpeak && settings.voice && (
          <>
            {voicePicker('nl')}
            {voicePicker('en')}
            <h3 className="t-label">Snelheid · Speed</h3>
            <div className="segmented" role="group" aria-label="Snelheid">
              {(
                [
                  ['slow', 'Langzaam', 'Slow'],
                  ['normal', 'Normaal', 'Normal'],
                  ['fast', 'Vlot', 'Quick'],
                ] as [Speed, string, string][]
              ).map(([value, nl, en]) => (
                <button key={value} className={settings.speed === value ? 'is-on' : ''} aria-pressed={settings.speed === value} onClick={() => set({ speed: value })}>
                  {nl}
                  <small>{en}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card setting">
        <h2 className="t-label">Meeluisteren · Listening</h2>
        <p className="en">
          {canListen
            ? 'Bij lezen en de spreektoets luistert het apparaat mee. In Chrome en Edge gaat de stem daarvoor naar een online dienst (Google of Microsoft); Safari kan het op het apparaat. Liever niet? Kies "Ouder luistert mee". For reading and the spoken test the device listens. In Chrome and Edge the voice is sent to an online service to recognise it; Safari can do it on the device.'
            : 'Deze browser kan niet meeluisteren, dus een ouder luistert mee en tikt aan wat fout ging. This browser can’t listen, so a parent listens along and marks mistakes.'}
        </p>
        <div className="segmented" role="group" aria-label="Meeluisteren">
          <button className={settings.listen === 'auto' ? 'is-on' : ''} aria-pressed={settings.listen === 'auto'} disabled={!canListen} onClick={() => set({ listen: 'auto' })}>
            Apparaat luistert
            <small>Device listens</small>
          </button>
          <button className={settings.listen === 'parent' || !canListen ? 'is-on' : ''} aria-pressed={settings.listen === 'parent'} onClick={() => set({ listen: 'parent' })}>
            Ouder luistert mee
            <small>Parent listens</small>
          </button>
        </div>
      </div>

      <div className="card setting">
        <h2 className="t-label">Geluidjes · Sounds</h2>
        <p className="en">Een belletje bij een goed antwoord. A chime for a correct answer.</p>
        <OnOff value={settings.sounds} onChange={(sounds) => set({ sounds })} label="Geluidjes" />
      </div>

      <div className="card setting">
        <h2 className="t-label">Voortgang · Progress</h2>
        <p className="en">Sterren, leesscores en oefenwoorden worden alleen op dit apparaat bewaard. Stars, reading scores and practice words are saved on this device only.</p>
        {cleared ? (
          <p className="t-label">Gewist · Cleared</p>
        ) : confirming ? (
          <div className="btn-pair">
            <button
              className="btn btn-secondary"
              onClick={() => {
                clearProgress();
                setConfirming(false);
                setCleared(true);
              }}
            >
              Ja, wissen
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirming(false)}>
              Nee
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={() => setConfirming(true)}>
            Alle sterren wissen · Clear all stars
          </button>
        )}
      </div>
    </section>
  );
}
