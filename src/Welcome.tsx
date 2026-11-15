import { useEffect, useRef, useState } from 'react';
import { GROEPEN } from './curriculum';
import { BackIcon, BookIcon, CheckIcon, NextIcon } from './Icons';
import { Character, ItemPic } from './pictures';
import { isoDay, STICKERS, streak } from './review';
import { canSpeak, hasVoice } from './speech';
import { createProfile, loadProfiles, loadStats, type Profile, type ProfileColour, type Settings } from './storage';
import { TopBar } from './ui';
import { TeacherGrid } from './TeacherPicker';
import { DEFAULT_TEACHER, type TeacherId } from './teachers';
import { Beast, Bolle, Land, landFor, landName } from './Art';
import { BEAST_NAMES } from './drawings';
import { beastIndex, worldFound } from './WorldMap';

// ---------- splash ----------

export function Splash({ onStart }: { onStart: () => void }) {
  const start = () => {
    // iOS only allows speech after a tap: speak a silent word now so later read-aloud works.
    if (canSpeak) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    onStart();
  };
  return (
    <section className="screen splash">
      <div className="hero">
        <div className="hero-copy">
          <h1 className="splash-logo">
            <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Duddu Learn" width={360} height={360} />
          </h1>
          <p className="tagline">
            Speels rekenen en lezen voor groep 1–8
            <span className="en">Playful maths and reading in Dutch and English</span>
          </p>
          <button className="btn btn-primary btn-wide" onClick={start}>
            Start <NextIcon size={28} />
          </button>
          <p className="t-label muted">Tik op Start om geluid aan te zetten. · Tap Start to turn on sound.</p>
        </div>
        <div className="hero-land">
          <Land theme="polder" />
          <div className="hero-bolle">
            <p className="bubble">
              Hoi! Ik ben Bolle. Duddu en ik helpen je!
              <span className="sub">Hi! I'm Bolle. Duddu and I will help you!</span>
            </p>
            <Bolle mood="wave" size={110} />
          </div>
          <div className="hero-beasts">
            <Beast index={9} size={70} />
            <Beast index={6} size={58} />
            <Beast index={13} size={64} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- mode chooser ----------

export type Mode = 'home' | 'class' | 'book' | 'read';

export function ModeChooser({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <section className="screen">
      <header className="modes-head">
        <img className="modes-logo" src={`${import.meta.env.BASE_URL}logo.webp`} alt="Duddu Learn" width={96} height={96} />
        <div>
          <h1 className="t-title">Wat gaan we doen?</h1>
          <p className="en">What shall we do today?</p>
        </div>
      </header>
      <div className="mode-grid">
        <button className="tile mode-card mode-home" onClick={() => onPick('home')}>
          <span className="mode-art mode-art-land">
            <Land theme="polder" />
            <Bolle mood="wave" size={84} />
          </span>
          <span className="t-title">Thuis oefenen</span>
          <span className="en">Practise at home</span>
          <span className="t-label">Eén kind, eigen tempo, sterren verdienen. · One child, own pace, earn stars.</span>
        </button>
        <button className="tile mode-card mode-class" onClick={() => onPick('class')}>
          <span className="mode-art board-art">7 × 8</span>
          <span className="t-title">Klas · digibord</span>
          <span className="en">Classroom board</span>
          <span className="t-label">Grote vragen op het bord, denktijd, teams en "Wie mag?". · Big questions, think time, teams.</span>
        </button>
        <button className="tile mode-card mode-book" onClick={() => onPick('book')}>
          <span className="mode-art">
            <BookIcon size={72} />
          </span>
          <span className="t-title">Werken in je boek</span>
          <span className="en">Book work</span>
          <span className="t-label">De app zegt welke bladzijde, jij rekent in je boek. · The app sets the page, you work in your book.</span>
        </button>
        <button className="tile mode-card mode-read" onClick={() => onPick('read')}>
          <span className="mode-art">
            {['0087', '0002', '0095'].map((id) => (
              <img key={id} className="mode-cover" src={`books/${id}/cover.jpg`} alt="" />
            ))}
          </span>
          <span className="t-title">Lezen</span>
          <span className="en">Reading</span>
          <span className="t-label">Kies een prentenboek, lees voor en zie welke woorden goed gingen. · Read a picture book aloud and see which words went well.</span>
        </button>
      </div>
    </section>
  );
}

// ---------- profiles ----------

const COLOURS: { value: ProfileColour; nl: string; en: string }[] = [
  { value: 'brand', nl: 'Oranje', en: 'Orange' },
  { value: 'sun', nl: 'Geel', en: 'Yellow' },
  { value: 'accent', nl: 'Blauw', en: 'Blue' },
  { value: 'correct', nl: 'Groen', en: 'Green' },
];

function Avatar({ p, size = 64 }: { p: Pick<Profile, 'name' | 'colour'>; size?: number }) {
  return (
    <span className={`avatar av-${p.colour}`} style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {p.name.slice(0, 1).toUpperCase() || '?'}
    </span>
  );
}

export function ProfilePicker({ onPick, onBack }: { onPick: (p: Profile) => void; onBack: () => void }) {
  const [profiles] = useState(loadProfiles);
  const [adding, setAdding] = useState(profiles.length === 0);

  if (adding) return <Onboarding onDone={onPick} onBack={profiles.length ? () => setAdding(false) : onBack} />;

  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Wie gaat er oefenen?</h1>
            <p className="en">Who is practising?</p>
          </>
        }
      />
      <div className="profile-grid">
        {profiles.map((p) => (
          <button key={p.id} className="tile profile-tile" onClick={() => onPick(p)}>
            <Avatar p={p} />
            <span className="t-title">{p.name}</span>
            <span className="t-label muted">Groep {p.groep}</span>
          </button>
        ))}
        <button className="tile profile-tile profile-add" onClick={() => setAdding(true)}>
          <span className="avatar av-add" aria-hidden="true">
            +
          </span>
          <span className="t-title">Nieuw kind</span>
          <span className="t-label muted">Add a child</span>
        </button>
      </div>
    </section>
  );
}

function Onboarding({ onDone, onBack }: { onDone: (p: Profile) => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [colour, setColour] = useState<ProfileColour>('brand');
  const [groep, setGroep] = useState('4');
  const [teacher, setTeacher] = useState<TeacherId>(DEFAULT_TEACHER);
  const [missing, setMissing] = useState(false);
  const nlVoice = canSpeak && hasVoice('nl');

  const done = () => {
    const n = name.trim();
    if (!n) {
      setMissing(true);
      return;
    }
    onDone(createProfile(n, colour, groep, teacher));
  };

  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Hoi! Hoe heet je?</h1>
            <p className="en">Hi! What's your name?</p>
          </>
        }
      />
      <div className="card">
        <label className="t-label" htmlFor="child-name">
          Naam · Name
        </label>
        <input
          id="child-name"
          className={`text-input ${missing ? 'is-missing' : ''}`}
          value={name}
          maxLength={20}
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            setMissing(false);
          }}
          placeholder="Naam · Name"
        />

        <h2 className="t-label">Kies je kleur · Pick your colour</h2>
        <div className="chips">
          {COLOURS.map((c) => (
            <button key={c.value} className={`chip colour-chip ${colour === c.value ? 'is-on' : ''}`} aria-pressed={colour === c.value} onClick={() => setColour(c.value)}>
              <Avatar p={{ name: name || '?', colour: c.value }} size={32} />
              {c.nl}
              <small>{c.en}</small>
            </button>
          ))}
        </div>

        <h2 className="t-label">In welke groep zit je? · Which group are you in?</h2>
        <div className="chips">
          {GROEPEN.map((g) => (
            <button key={g.id} className={`chip ${groep === g.id ? 'is-on' : ''}`} aria-pressed={groep === g.id} onClick={() => setGroep(g.id)}>
              {g.name.nl}
              <small>{g.age} jaar</small>
            </button>
          ))}
        </div>

        <h2 className="t-label">Kies je juf of meester · Choose your teacher</h2>
        <TeacherGrid value={teacher} english onPick={setTeacher} compact />
        {!nlVoice && (
          <p className="warn">
            Geen Nederlandse stem gevonden. Voeg er een toe: iPad › Instellingen › Toegankelijkheid › Gesproken materiaal › Stemmen › Nederlands; Windows › Instellingen › Tijd en taal ›
            Spraak; Android › Google-spraakservices › Nederlands. · No Dutch voice found; add one in the device settings.
          </p>
        )}
      </div>
      <button className="btn btn-primary btn-wide" onClick={done}>
        Klaar! <CheckIcon size={28} />
      </button>
    </section>
  );
}

// ---------- parent gate ----------

/** A grown-up check: hold the button for 2 seconds (spec §4). */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<number>();
  const start = useRef(0);

  const stop = () => {
    cancelAnimationFrame(timer.current!);
    setProgress(0);
  };
  const tick = () => {
    const p = Math.min(1, (Date.now() - start.current) / 2000);
    setProgress(p);
    if (p >= 1) onPass();
    else timer.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(timer.current!), []);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Voor ouders">
      <div className="dialog card">
        <h2 className="t-title">Voor ouders</h2>
        <p className="en">For parents</p>
        <p>
          Houd de knop 2 seconden ingedrukt. <span className="muted">Hold the button for 2 seconds.</span>
        </p>
        <button
          className="btn btn-secondary btn-wide hold"
          onPointerDown={(e) => {
            e.preventDefault();
            start.current = Date.now();
            timer.current = requestAnimationFrame(tick);
          }}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.repeat) {
              start.current = Date.now();
              timer.current = requestAnimationFrame(tick);
            }
          }}
          onKeyUp={stop}
        >
          <span className="hold-fill" style={{ width: `${progress * 100}%` }} />
          <span className="hold-label">Ingedrukt houden · Hold</span>
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          <BackIcon /> Annuleren · Cancel
        </button>
      </div>
    </div>
  );
}

// ---------- sticker book ----------

export function StickerBook({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const stats = loadStats();
  const today = isoDay(new Date());
  const days = streak(stats.days, today);
  const en = settings.english !== 'hidden';
  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Stickerboek</h1>
            {en && <p className="en">Sticker book</p>}
          </>
        }
      />
      <div className="card streak-card">
        <span className="flame" aria-hidden="true" />
        <p className="t-title">
          {days} {days === 1 ? 'dag' : 'dagen'} op rij
        </p>
        {en && (
          <p className="en">
            {days} {days === 1 ? 'day' : 'days'} in a row · {stats.correctTotal} goede antwoorden / right answers
          </p>
        )}
      </div>
      <h2 className="t-title">Mijn Telbeestjes</h2>
      {en && <p className="en">My counting creatures · win de eerste ster in een wereld / earn the first star in a world</p>}
      {GROEPEN.map((g) => (
        <div key={g.id} className="beast-shelf">
          <div className="beast-shelf-head">
            <Land theme={landFor(g.id)} />
            <span className="t-label">
              {g.name.nl} · {landName(landFor(g.id)).nl}
            </span>
          </div>
          <div className="beast-grid">
            {g.topics.map((t) => {
              const found = worldFound(t);
              const i = beastIndex(t.id);
              return (
                <div key={t.id} className={`beast-cell ${found ? '' : 'is-locked'}`}>
                  <Beast index={i} size={72} locked={!found} />
                  <span className="t-label">{found ? BEAST_NAMES[i % BEAST_NAMES.length] : '?'}</span>
                  <span className="sticker-en">{t.name.nl}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <h2 className="t-title">Stickers</h2>
      <div className="sticker-grid">
        {STICKERS.map((s) => {
          const got = s.earned(stats, today);
          return (
            <div key={s.id} className={`sticker ${got ? 'is-earned' : 'is-locked'}`}>
              <span className="sticker-art">{s.art.cast ? <Character who={s.art.cast} size={56} /> : s.art.item ? <ItemPic item={s.art.item} size={52} /> : null}</span>
              <span className="t-label">{s.name.nl}</span>
              {en && <span className="sticker-en">{s.name.en}</span>}
              {!got && <span className="sticker-how">{s.how.nl}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { Avatar };
