// Klok · Tijd leren: a hub with lessons, the set-the-clock game, and practice
// tiles for reading the clock, digital & 24-hour time and calculating with time.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BolleSays } from './Art';
import { LEVEL_NAME, LEVELS, type Bi, type LevelNo, type Topic } from './core';
import { BookIcon, BulbIcon, CheckIcon, LockIcon, NextIcon, RetryIcon, StarIcon } from './Icons';
import { starsFor, UNLOCK_STARS, type StarCount } from './scoring';
import { chime, speak } from './speech';
import { getCompleted, getLevelStars, saveLevelStars, type Settings } from './storage';
import {
  addMinutes,
  angleToMinutes,
  checkClock,
  dragTo,
  fromTotal,
  hourHandAngle,
  lessonActivity,
  LEES_TOPICS,
  makeZetTargets,
  minuteHandAngle,
  pointToAngle,
  TIJD_LESSONS,
  tijdDigitaal,
  tijdRekenen,
  toTotal,
  ZET_ID,
  ZET_LEVEL_NAME,
  zetActivity,
  zetPoints,
  zetStart,
  zetStep,
  type ClockTime,
  type ClockTotal,
  type TijdAsk,
  type TijdLesson,
  type ZetCheck,
} from './tijdData';
import { sayTime } from './topicsMore';
import { BiText, TopBar } from './ui';
import './tijd.css';

type FinishedFn = (r: { activity: string; correct: number; total: number }) => void;

interface Props {
  settings: Settings;
  onBack: () => void;
  onPractice: (topic: Topic, level: LevelNo) => void;
  onFinished?: FinishedFn;
}

type View =
  | { name: 'hub' }
  | { name: 'learn' }
  | { name: 'lesson'; lesson: TijdLesson }
  | { name: 'zet-levels' }
  | { name: 'zet'; level: LevelNo; round: number }
  | { name: 'topics'; which: 'lees' | 'digitaal' | 'rekenen' };

const bi = (nl: string, en: string): Bi => ({ nl, en });

// ---------- the clock picture (static or interactive) ----------

const C = 100; // centre of the 200×200 face

function at(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: C + Math.sin(a) * r, y: C - Math.cos(a) * r };
}

interface ClockProps {
  time: ClockTime;
  size?: 'big' | 'small';
  /** Makes the long hand draggable and the face a keyboard slider. */
  onSet?: (total: ClockTotal) => void;
  step?: number;
  disabled?: boolean;
  label?: string;
}

function TijdClock({ time, size = 'big', onSet, step = 5, disabled = false, label }: ClockProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const totalRef = useRef(toTotal(time));
  totalRef.current = toTotal(time);
  const [dragging, setDragging] = useState(false);
  const live = !!onSet && !disabled;

  const moveTo = (e: PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !onSet) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (dx * dx + dy * dy < 16) return; // too close to the middle to tell a direction
    const next = dragTo(totalRef.current, angleToMinutes(pointToAngle(dx, dy), step));
    if (next !== totalRef.current) {
      totalRef.current = next;
      onSet(next);
    }
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!live) return;
    const d = { ArrowRight: step, ArrowLeft: -step, ArrowUp: 60, ArrowDown: -60 }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    onSet!(addMinutes(totalRef.current, d));
  };

  const hour = at(hourHandAngle(time.h, time.m), 46);
  const minute = at(minuteHandAngle(time.m), 72);
  const digital = `${time.h}:${String(time.m).padStart(2, '0')}`;

  return (
    <svg
      ref={svgRef}
      className={`tijd-clock tijd-clock-${size} ${live ? 'is-live' : ''} ${dragging ? 'is-dragging' : ''}`}
      viewBox="0 0 200 200"
      role={onSet ? 'slider' : 'img'}
      aria-label={label || 'klok'}
      aria-hidden={label === '' ? true : undefined}
      aria-valuemin={onSet ? 0 : undefined}
      aria-valuemax={onSet ? 719 : undefined}
      aria-valuenow={onSet ? toTotal(time) : undefined}
      aria-valuetext={onSet ? digital : undefined}
      aria-disabled={onSet ? disabled : undefined}
      tabIndex={live ? 0 : undefined}
      onKeyDown={onKey}
      onPointerDown={
        live
          ? (e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              moveTo(e);
            }
          : undefined
      }
      onPointerMove={live ? (e) => dragging && moveTo(e) : undefined}
      onPointerUp={live ? () => setDragging(false) : undefined}
      onPointerCancel={live ? () => setDragging(false) : undefined}
    >
      <circle cx={C} cy={C} r="94" className="tijd-face" />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0;
        const o = at(i * 6, 86);
        const n = at(i * 6, big ? 76 : 81);
        return <line key={i} x1={n.x} y1={n.y} x2={o.x} y2={o.y} className={big ? 'tijd-tick-big' : 'tijd-tick'} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const p = at((i + 1) * 30, 62);
        return (
          <text key={i} x={p.x} y={p.y + 7} textAnchor="middle" className="tijd-num">
            {i + 1}
          </text>
        );
      })}
      {/* short (hour) hand */}
      <line x1={C} y1={C} x2={hour.x} y2={hour.y} className="tijd-hand-hour" />
      {/* long (minute) hand: ink outline with an orange core, and a knob to grab */}
      <line x1={C} y1={C} x2={minute.x} y2={minute.y} className="tijd-hand-min-edge" />
      <line x1={C} y1={C} x2={minute.x} y2={minute.y} className="tijd-hand-min" />
      {onSet && <circle cx={minute.x} cy={minute.y} r="11" className="tijd-knob" />}
      <circle cx={C} cy={C} r="7" className="tijd-pin" />
    </svg>
  );
}

function Stars({ count, size = 20 }: { count: number; size?: number }) {
  return (
    <span className="level-stars" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? 'star-sun' : 'star-dim'}>
          <StarIcon filled={i < count} size={size} />
        </span>
      ))}
    </span>
  );
}

function Title({ title, settings }: { title: Bi; settings: Settings }) {
  return (
    <>
      <h1 className="t-title">{title.nl}</h1>
      {settings.english !== 'hidden' && <p className="en">{title.en}</p>}
    </>
  );
}

/** Five level tiles; level n+1 opens with 1 star on level n. */
function LevelTiles({ id, onPick, names }: { id: string; onPick: (level: LevelNo) => void; names?: Record<LevelNo, Bi> }) {
  return (
    <div className="levels">
      {LEVELS.map((level) => {
        const stars = getLevelStars(id, level);
        const prev = level > 1 ? getLevelStars(id, (level - 1) as LevelNo) : UNLOCK_STARS;
        const locked = (prev ?? 0) < UNLOCK_STARS;
        return (
          <button
            key={level}
            className={`tile level-tile ${locked ? 'is-locked' : ''}`}
            disabled={locked}
            onClick={() => onPick(level)}
            aria-label={locked ? `Level ${level}, op slot: haal eerst 1 ster` : `Level ${level}, ${stars ?? 0} van 3 sterren`}
          >
            <span className="t-label">Level {level}</span>
            <span className="level-name">{(names ?? LEVEL_NAME)[level].nl}</span>
            {locked ? (
              <>
                <LockIcon />
                <span className="lock-note">1 ster nodig</span>
              </>
            ) : (
              <Stars count={stars ?? 0} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- hub ----------

const ACTIVITIES: { id: 'learn' | 'zet' | 'lees' | 'digitaal' | 'rekenen'; name: Bi; sub: Bi; clock: ClockTime }[] = [
  { id: 'learn', name: bi('Leren', 'Learn'), sub: bi('Stap voor stap: wijzers, half, kwart, digitaal', 'Step by step: hands, half past, quarters, digital'), clock: { h: 10, m: 10 } },
  { id: 'zet', name: bi('Zet de klok', 'Set the clock'), sub: bi('Draai zelf de grote wijzer', 'Turn the long hand yourself'), clock: { h: 2, m: 30 } },
  { id: 'lees', name: bi('Lees de klok', 'Read the clock'), sub: bi('Hoe laat is het?', 'What time is it?'), clock: { h: 4, m: 45 } },
  { id: 'digitaal', name: bi('Digitaal & 24 uur', 'Digital & 24 hours'), sub: bi('14:30 en \'s middags', '14:30 and the afternoon'), clock: { h: 2, m: 0 } },
  { id: 'rekenen', name: bi('Rekenen met tijd', 'Calculating with time'), sub: bi('Hoe lang duurt het?', 'How long does it take?'), clock: { h: 7, m: 15 } },
];

function Hub({ settings, onBack, go }: { settings: Settings; onBack: () => void; go: (v: View) => void }) {
  const en = settings.english !== 'hidden';
  return (
    <section className="screen tijd">
      <TopBar onBack={onBack} title={<Title title={bi('Klok · Tijd leren', 'Clock · Learning the time')} settings={settings} />} />
      <BolleSays mood="wave" text={bi('Hoe laat is het? Kies wat je wilt doen!', 'What time is it? Pick what you want to do!')} />
      <div className="tijd-hub">
        {ACTIVITIES.map((a) => (
          <button
            key={a.id}
            className="tile tijd-hub-tile"
            onClick={() =>
              go(a.id === 'learn' ? { name: 'learn' } : a.id === 'zet' ? { name: 'zet-levels' } : { name: 'topics', which: a.id })
            }
          >
            <TijdClock time={a.clock} size="small" label="" />
            <span className="tijd-hub-text">
              <span className="t-title">{a.name.nl}</span>
              {en && <span className="en">{a.name.en}</span>}
              <span className="t-label muted">{en ? `${a.sub.nl} · ${a.sub.en}` : a.sub.nl}</span>
            </span>
            <NextIcon />
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- Leren ----------

function LessonList({ settings, onBack, onOpen }: { settings: Settings; onBack: () => void; onOpen: (l: TijdLesson) => void }) {
  return (
    <section className="screen tijd">
      <TopBar onBack={onBack} title={<Title title={bi('Leren', 'Learn · stap voor stap / step by step')} settings={settings} />} />
      <div className="lesson-grid">
        {TIJD_LESSONS.map((l) => {
          const done = getCompleted(lessonActivity(l.id));
          return (
            <button key={l.id} className={`tile lesson-tile ${done ? 'is-closed' : ''}`} onClick={() => onOpen(l)}>
              {done && (
                <span className="closed-badge t-label">
                  <CheckIcon size={18} /> Afgerond · Done
                </span>
              )}
              <TijdClock time={l.icon} size="small" label="" />
              <span className="t-title">{l.name.nl}</span>
              {settings.english !== 'hidden' && <span className="en">{l.name.en}</span>}
              <span className="t-label muted">
                {done ? <RetryIcon size={18} /> : <BookIcon size={18} />} {l.slides.length} stapjes · steps
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** A lesson question: the right answer shows only after the child has tapped. */
function AskChoice({ ask, settings, onAnswered }: { ask: TijdAsk; settings: Settings; onAnswered: (right: boolean) => void }) {
  const [wrong, setWrong] = useState<number[]>([]);
  const [state, setState] = useState<'ask' | 'right' | 'shown'>('ask');
  const done = state !== 'ask';

  const choose = (i: number) => {
    if (done || wrong.includes(i)) return;
    if (i === ask.answer) {
      setState('right');
      if (settings.sounds) chime();
      onAnswered(true);
      return;
    }
    const w = [...wrong, i];
    setWrong(w);
    if (w.length >= 2) {
      setState('shown');
      onAnswered(false);
    }
  };

  return (
    <>
      <BiText bi={ask.text} settings={settings} />
      {ask.clock && <TijdClock time={ask.clock} label="klok" />}
      <div className="choice-tiles tijd-choices">
        {ask.options.map((o, i) => {
          const right = done && i === ask.answer;
          const no = wrong.includes(i) && !right;
          return (
            <button key={o.nl} className={`tile choice-tile ${right ? 'is-right' : ''} ${no ? 'is-wrong' : ''}`} onClick={() => choose(i)} disabled={done || no}>
              <span className="choice-label">
                {right && <CheckIcon />}
                {no && <RetryIcon />}
                {o.nl}
              </span>
              {settings.english !== 'hidden' && o.en !== o.nl && <span className="choice-en">{o.en}</span>}
            </button>
          );
        })}
      </div>
      {state === 'ask' && wrong.length > 0 && (
        <div className="feedback feedback-soft" role="status">
          <span className="feedback-icon">
            <RetryIcon />
          </span>
          <BiText bi={bi('Bijna! Probeer nog eens.', 'Almost! Try again.')} settings={settings} size="body" />
        </div>
      )}
      {done && (
        <div className={`feedback ${state === 'right' ? 'feedback-good' : 'feedback-soft'}`} role="status">
          <span className={`feedback-icon ${state === 'right' ? 'burst' : ''}`}>{state === 'right' ? <CheckIcon /> : <BulbIcon />}</span>
          <BiText bi={ask.reveal} settings={settings} size="body" />
        </div>
      )}
    </>
  );
}

function LessonPlayer({
  lesson,
  settings,
  onBack,
  onPractice,
  onFinished,
}: {
  lesson: TijdLesson;
  settings: Settings;
  onBack: () => void;
  onPractice: () => void;
  onFinished?: FinishedFn;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const reported = useRef(false);
  const last = lesson.slides.length; // one extra "Goed gedaan" step at the end
  const slide = lesson.slides[step];
  const waiting = step < last && !!slide.ask && answers[step] === undefined;
  const total = lesson.slides.filter((s) => s.ask).length;
  const correct = Object.values(answers).filter(Boolean).length;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (step < last && settings.autoRead && settings.voice) speak(lesson.slides[step].text.nl, 'nl');
  }, [step, last, lesson, settings.autoRead, settings.voice]);

  useEffect(() => {
    if (step === last && !reported.current) {
      reported.current = true;
      onFinished?.({ activity: lessonActivity(lesson.id), correct, total });
    }
  }, [step, last, lesson.id, correct, total, onFinished]);

  const markAnswered = useCallback((right: boolean) => setAnswers((a) => ({ ...a, [step]: right })), [step]);

  return (
    <section className="screen tijd">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">{lesson.name.nl}</h1>
            <div className="dots" aria-label={`Stap ${step + 1} van ${last + 1}`}>
              {Array.from({ length: last + 1 }, (_, i) => (
                <span key={i} className={`dot ${i === step ? 'is-now' : i < step ? 'is-done' : ''}`} />
              ))}
            </div>
          </>
        }
      />

      {step < last ? (
        <div className="card lesson-card tijd-slide" key={step}>
          <BiText bi={slide.text} settings={settings} />
          {!slide.ask && slide.clock && <TijdClock time={slide.clock} label="klok" />}
          {slide.digital && (
            <p className="tijd-digital" aria-label={`digitale klok ${slide.digital}`}>
              {slide.digital}
            </p>
          )}
          {slide.list && (
            <ul className="tijd-words">
              {slide.list.map((w) => (
                <li key={w.nl} className="tijd-word">
                  {w.nl}
                  {settings.english !== 'hidden' && <small>{w.en}</small>}
                </li>
              ))}
            </ul>
          )}
          {slide.ask && <AskChoice ask={slide.ask} settings={settings} onAnswered={markAnswered} />}
        </div>
      ) : (
        <div className="celebrate">
          <BolleSays mood="cheer" text={bi('Goed gedaan! Je hebt de les af.', 'Well done! You finished the lesson.')} />
          <p className="t-title">
            {correct} van {total} goed
          </p>
          {settings.english !== 'hidden' && (
            <p className="en">
              {correct} of {total} right
            </p>
          )}
        </div>
      )}

      <div className="lesson-nav">
        <button className="btn btn-secondary" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>
          {step === 0 ? 'Lessen · Lessons' : 'Vorige · Back'}
        </button>
        {step < last ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={waiting}>
            Volgende <NextIcon size={28} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onPractice}>
            Oefenen! <NextIcon size={28} />
          </button>
        )}
      </div>
    </section>
  );
}

// ---------- Zet de klok ----------

const PRAISE: Bi[] = [
  bi('Goed zo! De klok staat goed.', 'Well done! The clock is right.'),
  bi('Super! Precies goed.', 'Super! Exactly right.'),
  bi('Knap gedaan!', 'Nicely done!'),
  bi('Ja! Dat is de goede tijd.', 'Yes! That is the right time.'),
];

const TRY_AGAIN: Record<Exclude<ZetCheck, 'right'>, Bi> = {
  minutes: bi('Bijna! Kijk nog eens naar de grote wijzer.', 'Almost! Look at the long hand again.'),
  hour: bi('Bijna! De grote wijzer staat goed. Kijk nog eens naar de kleine wijzer.', 'Almost! The long hand is right. Look at the short hand again.'),
};

function ZetLevels({ settings, onBack, onPlay }: { settings: Settings; onBack: () => void; onPlay: (l: LevelNo) => void }) {
  return (
    <section className="screen tijd">
      <TopBar onBack={onBack} title={<Title title={bi('Zet de klok', 'Set the clock')} settings={settings} />} />
      <div className="card">
        <BiText
          bi={bi(
            'Lees de tijd en draai de grote wijzer naar de goede plek. De kleine wijzer loopt vanzelf mee. Je kunt ook de knoppen + en − gebruiken.',
            'Read the time and turn the long hand to the right place. The short hand moves along by itself. You can also use the + and − buttons.',
          )}
          settings={settings}
          size="body"
        />
        <LevelTiles id={ZET_ID} names={ZET_LEVEL_NAME} onPick={onPlay} />
      </div>
    </section>
  );
}

function ZetGame({
  level,
  settings,
  onBack,
  onAgain,
  onNextLevel,
  onFinished,
}: {
  level: LevelNo;
  settings: Settings;
  onBack: () => void;
  onAgain: () => void;
  onNextLevel: () => void;
  onFinished?: FinishedFn;
}) {
  const targets = useMemo(() => makeZetTargets(level, Math.random), [level]);
  const step = zetStep(level);
  const [index, setIndex] = useState(0);
  const target = targets[Math.min(index, targets.length - 1)];
  const [total, setTotal] = useState<ClockTotal>(() => zetStart(targets[0]));
  const [wrongTries, setWrongTries] = useState(0);
  const [status, setStatus] = useState<'set' | 'retry' | 'right' | 'shown'>('set');
  const [miss, setMiss] = useState<ZetCheck>('minutes');
  const [points, setPoints] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<{ stars: StarCount; best: boolean } | null>(null);
  const done = status === 'right' || status === 'shown';
  const words = sayTime(target.h, target.m);
  const praise = PRAISE[index % PRAISE.length];

  useEffect(() => {
    if (index < targets.length && settings.autoRead && settings.voice) speak(`Zet de klok op ${words.nl}.`, 'nl');
    // Only when a new target appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const check = () => {
    if (done) return;
    const c = checkClock(target, total);
    if (c === 'right') {
      setStatus('right');
      setPoints((p) => p + zetPoints(wrongTries, false));
      setCorrect((n) => n + 1);
      if (settings.sounds) chime();
      return;
    }
    if (wrongTries === 0) {
      setWrongTries(1);
      setMiss(c);
      setStatus('retry');
      return;
    }
    setStatus('shown');
    setTotal(toTotal(target));
  };

  const next = () => {
    const n = index + 1;
    if (n >= targets.length) {
      const stars = starsFor(points, targets.length * 3);
      const best = saveLevelStars(ZET_ID, level, stars);
      onFinished?.({ activity: zetActivity(level), correct, total: targets.length });
      setResult({ stars, best });
      setIndex(n);
      return;
    }
    setIndex(n);
    setTotal(zetStart(targets[n]));
    setWrongTries(0);
    setStatus('set');
  };

  const nudge = (d: number) => !done && setTotal((t) => addMinutes(t, d));

  if (result) {
    return (
      <section className="screen tijd">
        <TopBar onBack={onBack} title={<Title title={bi('Zet de klok', 'Set the clock')} settings={settings} />} />
        <div className="celebrate">
          <BolleSays mood={result.stars > 0 ? 'cheer' : 'happy'} text={result.stars > 0 ? bi('Wat goed! Je kunt de klok zetten.', 'Great! You can set the clock.') : bi('Goed geoefend! Probeer het nog een keer.', 'Good practice! Try once more.')} />
          <div className="star-row big-stars" aria-label={`${result.stars} van 3 sterren`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < result.stars ? 'star-on' : 'star-off'}>
                <StarIcon filled={i < result.stars} size={64} />
              </span>
            ))}
          </div>
          <p className="t-title">
            {correct} van {targets.length} goed · {points} {points === 1 ? 'punt' : 'punten'}
          </p>
          {settings.english !== 'hidden' && (
            <p className="en">
              {correct} of {targets.length} right · {points} {points === 1 ? 'point' : 'points'}
            </p>
          )}
          {result.best && result.stars > 0 && <p className="chip chip-sun t-label">Nieuw record! · New best!</p>}
        </div>
        <div className="tijd-actions">
          {result.stars >= UNLOCK_STARS && level < 5 && (
            <button className="btn btn-primary btn-wide" onClick={onNextLevel}>
              Volgend level · Next <NextIcon size={28} />
            </button>
          )}
          <button className="btn btn-secondary btn-wide" onClick={onAgain}>
            <RetryIcon /> Nog een keer · Again
          </button>
          <button className="btn btn-secondary btn-wide" onClick={onBack}>
            Klaar · Done
          </button>
        </div>
      </section>
    );
  }

  const shown = fromTotal(total);
  const feedback: { tone: 'good' | 'soft'; bi: Bi; icon: JSX.Element } | null =
    status === 'right'
      ? { tone: 'good', bi: praise, icon: <CheckIcon /> }
      : status === 'retry'
        ? { tone: 'soft', bi: TRY_AGAIN[miss === 'hour' ? 'hour' : 'minutes'], icon: <RetryIcon /> }
        : status === 'shown'
          ? { tone: 'soft', bi: bi(`Kijk, zo staat de klok op ${words.nl}.`, `Look, this is ${words.en} on the clock.`), icon: <BulbIcon /> }
          : null;

  return (
    <section className="screen tijd">
      <TopBar
        onBack={onBack}
        title={
          <div className="progress-wrap">
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={targets.length} aria-valuenow={index + (done ? 1 : 0)} aria-label="Voortgang">
              <div className="progress-fill" style={{ width: `${((index + (done ? 1 : 0)) / targets.length) * 100}%` }} />
            </div>
            <span className="t-label">
              {index + 1} / {targets.length}
            </span>
          </div>
        }
        right={
          <span className="star-count" aria-label={`${points} punten`}>
            <span className="star-sun">
              <StarIcon filled />
            </span>
            {points}
          </span>
        }
      />

      <div className="card tijd-zet" key={index}>
        <p className="t-label muted">
          Level {level} · {ZET_LEVEL_NAME[level].nl}
        </p>
        <BiText bi={bi(`Zet de klok op ${words.nl}.`, `Set the clock to ${words.en}.`)} settings={settings} />
        <TijdClock
          time={shown}
          onSet={setTotal}
          step={step}
          disabled={done}
          label="Klok: sleep de grote wijzer, of gebruik de pijltjestoetsen · Clock: drag the long hand, or use the arrow keys"
        />
        <div className="tijd-steppers" aria-label="Knoppen voor de klok · Clock buttons">
          <div className="tijd-stepper">
            <button className="btn btn-secondary tijd-step-btn" onClick={() => nudge(-60)} disabled={done} aria-label="Een uur terug · One hour back">
              −
            </button>
            <span className="t-label">
              Uur
              <small className="en">Hour</small>
            </span>
            <button className="btn btn-secondary tijd-step-btn" onClick={() => nudge(60)} disabled={done} aria-label="Een uur verder · One hour on">
              +
            </button>
          </div>
          <div className="tijd-stepper">
            <button className="btn btn-secondary tijd-step-btn" onClick={() => nudge(-step)} disabled={done} aria-label={`${step} ${step === 1 ? 'minuut' : 'minuten'} terug · back`}>
              −
            </button>
            <span className="t-label">
              {step === 1 ? 'Minuut' : '5 minuten'}
              <small className="en">{step === 1 ? 'Minute' : '5 minutes'}</small>
            </span>
            <button className="btn btn-secondary tijd-step-btn" onClick={() => nudge(step)} disabled={done} aria-label={`${step} ${step === 1 ? 'minuut' : 'minuten'} verder · on`}>
              +
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`feedback ${feedback.tone === 'good' ? 'feedback-good' : 'feedback-soft'}`} role="status" key={`${status}-${wrongTries}`}>
            <span className={`feedback-icon ${feedback.tone === 'good' ? 'burst' : ''}`}>{feedback.icon}</span>
            <BiText bi={feedback.bi} settings={settings} size="body" />
          </div>
        )}
      </div>

      {done ? (
        <button className="btn btn-primary btn-wide" onClick={next}>
          {index + 1 >= targets.length ? 'Klaar · Finish' : 'Volgende · Next'} <NextIcon size={28} />
        </button>
      ) : (
        <button className="btn btn-primary btn-wide" onClick={check}>
          Klaar · Check <CheckIcon size={28} />
        </button>
      )}
    </section>
  );
}

// ---------- practice topics ----------

const TOPIC_PAGES: Record<'lees' | 'digitaal' | 'rekenen', { title: Bi; intro: Bi; topics: Topic[] }> = {
  lees: {
    title: bi('Lees de klok', 'Read the clock'),
    intro: bi('Kijk naar de wijzers en kies de goede tijd.', 'Look at the hands and pick the right time.'),
    topics: LEES_TOPICS,
  },
  digitaal: {
    title: bi('Digitaal & 24 uur', 'Digital & 24 hours'),
    intro: bi('Van wijzerklok naar digitale klok, en van 15:00 naar drie uur \'s middags.', 'From clock face to digital clock, and from 15:00 to three in the afternoon.'),
    topics: [tijdDigitaal],
  },
  rekenen: {
    title: bi('Rekenen met tijd', 'Calculating with time'),
    intro: bi('Hoe lang duurt het? Hoe laat is het straks? Minuten, uren, dagen en maanden.', 'How long does it take? What time will it be? Minutes, hours, days and months.'),
    topics: [tijdRekenen],
  },
};

function TopicLevels({ which, settings, onBack, onPractice }: { which: keyof typeof TOPIC_PAGES; settings: Settings; onBack: () => void; onPractice: Props['onPractice'] }) {
  const page = TOPIC_PAGES[which];
  return (
    <section className="screen tijd">
      <TopBar onBack={onBack} title={<Title title={page.title} settings={settings} />} />
      <BiText bi={page.intro} settings={settings} size="body" />
      {page.topics.map((t) => (
        <article key={t.id} className="card">
          <h2 className="t-title">{t.name.nl}</h2>
          {settings.english !== 'hidden' && <p className="en">{t.name.en}</p>}
          <LevelTiles id={t.id} onPick={(level) => onPractice(t, level)} />
        </article>
      ))}
    </section>
  );
}

// ---------- the section ----------

export default function Tijd({ settings, onBack, onPractice, onFinished }: Props) {
  const [view, setView] = useState<View>({ name: 'hub' });
  const hub = () => setView({ name: 'hub' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view.name]);

  switch (view.name) {
    case 'hub':
      return <Hub settings={settings} onBack={onBack} go={setView} />;
    case 'learn':
      return <LessonList settings={settings} onBack={hub} onOpen={(lesson) => setView({ name: 'lesson', lesson })} />;
    case 'lesson': {
      const id = view.lesson.id;
      return (
        <LessonPlayer
          key={id}
          lesson={view.lesson}
          settings={settings}
          onBack={() => setView({ name: 'learn' })}
          onFinished={onFinished}
          onPractice={() =>
            id === 'digitaal' ? onPractice(tijdDigitaal, 1) : id === 'kalender' ? onPractice(tijdRekenen, 1) : setView({ name: 'zet-levels' })
          }
        />
      );
    }
    case 'zet-levels':
      return <ZetLevels settings={settings} onBack={hub} onPlay={(level) => setView({ name: 'zet', level, round: 0 })} />;
    case 'zet':
      return (
        <ZetGame
          key={`${view.level}-${view.round}`}
          level={view.level}
          settings={settings}
          onBack={() => setView({ name: 'zet-levels' })}
          onAgain={() => setView({ name: 'zet', level: view.level, round: view.round + 1 })}
          onNextLevel={() => setView({ name: 'zet', level: Math.min(5, view.level + 1) as LevelNo, round: 0 })}
          onFinished={onFinished}
        />
      );
    case 'topics':
      return <TopicLevels which={view.which} settings={settings} onBack={hub} onPractice={onPractice} />;
  }
}
