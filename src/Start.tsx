import { GROEPEN, type Groep } from './curriculum';
import { ParentIcon } from './Icons';
import { Character } from './pictures';
import type { Profile, Settings } from './storage';
import { BiText } from './ui';
import { teacherById } from './teachers';
import { Avatar } from './Welcome';
import { LandBanner } from './WorldMap';

interface Props {
  current: string | null;
  settings: Settings;
  onPick: (g: Groep) => void;
  onLessons: () => void;
  onStories: () => void;
  onTables: () => void;
  onReading: () => void;
  onParents: () => void;
  profile: Profile;
  streakDays: number;
  dueCount: number;
  onDailyMix: () => void;
  onStickers: () => void;
  onSwitch: () => void;
  onTeacher: () => void;
  onToets: () => void;
}

export default function Start({ current, settings, onPick, onLessons, onStories, onTables, onReading, onParents, profile, streakDays, dueCount, onDailyMix, onStickers, onSwitch, onTeacher, onToets }: Props) {
  const teacher = teacherById(settings.teacher);
  const en = settings.english !== 'hidden';
  return (
    <section className="screen">
      <header className="start-head">
        <button className="profile-switch" onClick={onSwitch} aria-label="Ander kind kiezen · Switch child">
          <Avatar p={profile} size={56} />
        </button>
        <div className="start-hello">
          <h1 className="t-title">Hoi {profile.name}!</h1>
          {en && <p className="en">Hi {profile.name}! · Duddu Learn</p>}
        </div>
        <button className="round-btn" onClick={onParents} aria-label="Voor ouders / For parents">
          <ParentIcon />
        </button>
      </header>

      {(() => {
        const g = GROEPEN.find((x) => x.id === (current ?? profile.groep)) ?? GROEPEN[3];
        return (
          <button className="land-button" onClick={() => onPick(g)} aria-label={`${g.name.nl}: verder oefenen · keep practising`}>
            <LandBanner groep={g} settings={settings} guide={{ nl: `Hoi ${profile.name}! Zullen we rekenen?`, en: `Hi ${profile.name}! Shall we do some maths?` }} />
          </button>
        );
      })()}

      <button className="tile teacher-tile" onClick={onTeacher}>
        <Character who={teacher.who} size={64} />
        <span className="teacher-tile-text">
          <span className="t-title">{teacher.name.nl}</span>
          <span className="t-label">Jouw juf of meester · tik om te wisselen</span>
          {en && <span className="en">Your teacher · tap to change</span>}
        </span>
      </button>

      <div className="home-row">
        <button className="tile streak-tile" onClick={onStickers}>
          <span className="flame" aria-hidden="true" />
          <span className="t-title">{streakDays}</span>
          <span className="t-label">
            {streakDays === 1 ? 'dag' : 'dagen'} op rij · stickers
          </span>
        </button>
        <button className="tile mix-tile" onClick={onDailyMix} disabled={dueCount === 0}>
          <span className="t-title">Dagmix</span>
          <span className="t-label">
            {dueCount > 0 ? `${Math.min(dueCount, 10)} sommen om te herhalen · review` : 'Niets te herhalen · nothing to review'}
          </span>
        </button>
      </div>

      <div className="feature-grid">
        <button className="tile feature-tile feature-learn" onClick={onLessons}>
          <span className="feature-cast">
            <Character who="noor" size={64} />
          </span>
          <span className="t-title">Lessen</span>
          {en && <span className="en">Lessons</span>}
          <span className="t-label">Erbij, eraf, keer en de tafels</span>
        </button>
        <button className="tile feature-tile feature-story" onClick={onStories}>
          <span className="feature-cast">
            <Character who="pip" size={64} />
          </span>
          <span className="t-title">Verhaaltjes</span>
          {en && <span className="en">Story mode</span>}
          <span className="t-label">Rekenen met plaatjes</span>
        </button>
        <button className="tile feature-tile feature-tables" onClick={onTables}>
          <span className="feature-cast">
            <Character who="jan" size={64} />
          </span>
          <span className="t-title">Tafeltrainer</span>
          {en && <span className="en">Times tables</span>}
          <span className="t-label">Leren, schrijftoets en spreektoets</span>
        </button>
        <button className="tile feature-tile feature-toets" onClick={onToets}>
          <span className="feature-cast">
            <Character who="uil" size={64} />
          </span>
          <span className="t-title">Toets</span>
          {en && <span className="en">Test</span>}
          <span className="t-label">Beginner, Gemiddeld, Gevorderd, Pro</span>
        </button>
        <button className="tile feature-tile feature-read" onClick={onReading}>
          <span className="feature-cast">
            <Character who="sam" size={64} />
            <Character who="noor" size={64} />
          </span>
          <span className="t-title">Lezen</span>
          {en && <span className="en">Reading</span>}
          <span className="t-label">Boekjes van groep 3 tot B2</span>
        </button>
      </div>

      <div className="card">
        <BiText bi={{ nl: 'Oefenen: in welke groep zit je?', en: 'Practice: which group are you in?' }} settings={settings} />
        <div className="groep-grid">
          {GROEPEN.map((g) => (
            <button
              key={g.id}
              className={`tile groep-tile ${current === g.id ? 'is-current' : ''}`}
              onClick={() => onPick(g)}
            >
              <span className="t-title">{g.name.nl}</span>
              <span className="t-label">{g.age} jaar</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
