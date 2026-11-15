// Klas · digibord: the teacher drives a lesson on the classroom board (SPEC §16.1).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { answerLabel, BOX, GROEPEN, type Bi, type Lang, type LevelNo, type Question, type Topic } from './curriculum';
import { BackIcon, CheckIcon, NextIcon, RetryIcon, SpeakerIcon, StarIcon } from './Icons';
import { SceneView, VisualView } from './pictures';
import { chime, speak, speakable, speakText, stopSpeaking } from './speech';
import { Beads } from './ui';
import './klas.css';

// ---------- setup ----------

type TeamCount = 1 | 2 | 3;
type Think = 0 | 10 | 20 | 30 | 60;

interface ClassSetup {
  groepId: string;
  topicId: string;
  level: LevelNo;
  count: 5 | 10 | 15;
  teams: TeamCount;
  think: Think;
  en: boolean;
  names: string;
}

const STORE_KEY = 'rekenpret-class';

const DEFAULT_SETUP: ClassSetup = {
  groepId: GROEPEN[Math.min(2, GROEPEN.length - 1)].id,
  topicId: '',
  level: 1,
  count: 10,
  teams: 2,
  think: 20,
  en: false,
  names: '',
};

function loadSetup(): ClassSetup {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...DEFAULT_SETUP, ...(JSON.parse(raw) as Partial<ClassSetup>) };
  } catch {
    // No storage: start from the defaults.
  }
  return DEFAULT_SETUP;
}

function saveSetup(s: ClassSetup): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the setup just isn't remembered.
  }
}

const TEAMS: Bi[] = [
  { nl: 'Team Oranje', en: 'Team Orange' },
  { nl: 'Team Geel', en: 'Team Yellow' },
  { nl: 'Team Nacht', en: 'Team Night' },
];

const LETTERS = 'ABCD';

function namesOf(s: string): string[] {
  return s
    .split(/\n|,/)
    .map((n) => n.trim())
    .filter(Boolean);
}

function makeQuestions(topic: Topic, level: LevelNo, count: number): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < count && tries < 300; tries++) {
    const q = topic.make(level, Math.random);
    const key = `${q.expr}|${q.text.nl}`;
    if (seen.has(key) && tries < 250) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

// ---------- speech in sequence ----------

// Every new utterance (or stop) bumps this, so callbacks from an older chain do nothing.
let speechSeq = 0;

function speakSeq(parts: [string, Lang][], done?: () => void): void {
  const my = ++speechSeq;
  let i = 0;
  const step = () => {
    if (my !== speechSeq) return;
    if (i >= parts.length) {
      done?.();
      return;
    }
    const [text, lang] = parts[i++];
    const words = speakable(text, lang);
    let fired = false;
    const next = () => {
      if (fired) return;
      fired = true;
      window.clearTimeout(safety);
      step();
    };
    // Some browsers never fire onend; carry on after a generous pause.
    const safety = window.setTimeout(next, 4000 + words.length * 120);
    speakText(words, lang, { onEnd: next });
  };
  step();
}

function say(text: string, lang: Lang = 'nl'): void {
  speechSeq++;
  speak(text, lang);
}

function hush(): void {
  speechSeq++;
  stopSpeaking();
}

function toggleFullscreen(): void {
  try {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    p?.catch(() => {});
  } catch {
    // Fullscreen not allowed here.
  }
}

// ---------- small icons (plain SVG, same stroke style as Icons.tsx) ----------

function Svg({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const CloseIcon = () => (
  <Svg>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
const FullIcon = () => (
  <Svg>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </Svg>
);
const DiceIcon = () => (
  <Svg>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="15" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <circle cx="9" cy="15" r="1" fill="currentColor" />
  </Svg>
);
const EmptyIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8" />
  </Svg>
);

// ---------- component ----------

type Phase = 'ask' | 'think' | 'show' | 'reveal';

interface Round {
  topic: Topic;
  setup: ClassSetup;
  qs: Question[];
  i: number;
  phase: Phase;
  endAt: number;
  scores: number[];
  got: number[];
}

type View = 'setup' | 'board' | 'end';

export default function Klas({ onExit }: { onExit: () => void }) {
  const [setup, setSetup] = useState<ClassSetup>(loadSetup);
  const [view, setView] = useState<View>('setup');
  const [round, setRoundState] = useState<Round | null>(null);
  const roundRef = useRef<Round | null>(null);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<number | undefined>(undefined);
  const delayRef = useRef<number | undefined>(undefined);
  const lastLeft = useRef(-1);

  const [picker, setPicker] = useState<{ name: string; done: boolean } | null>(null);
  const pickTimer = useRef<number | undefined>(undefined);
  const usedNames = useRef<string[]>([]);

  const groep = GROEPEN.find((g) => g.id === setup.groepId) ?? GROEPEN[0];
  const topic = groep.topics.find((t) => t.id === setup.topicId) ?? groep.topics[0];

  useEffect(() => saveSetup(setup), [setup]);

  const setRound = (r: Round | null) => {
    roundRef.current = r;
    setRoundState(r);
  };

  const stopTimer = () => {
    window.clearInterval(timerRef.current);
    timerRef.current = undefined;
  };

  const closePicker = useCallback(() => {
    window.clearInterval(pickTimer.current);
    setPicker(null);
  }, []);

  // Stop everything when the screen goes away.
  useEffect(
    () => () => {
      window.clearInterval(timerRef.current);
      window.clearTimeout(delayRef.current);
      window.clearInterval(pickTimer.current);
      hush();
    },
    [],
  );

  // ---- phases ----

  const toShow = (r: Round) => {
    stopTimer();
    setRound({ ...r, phase: 'show' });
    say('Laat maar zien!');
  };

  const toThink = (r: Round) => {
    hush();
    stopTimer();
    if (!r.setup.think) {
      toShow(r);
      return;
    }
    const endAt = Date.now() + r.setup.think * 1000;
    lastLeft.current = r.setup.think;
    setNow(Date.now());
    setRound({ ...r, phase: 'think', endAt });
    timerRef.current = window.setInterval(() => {
      const cur = roundRef.current;
      if (!cur || cur.phase !== 'think') return stopTimer();
      const t = Date.now();
      setNow(t);
      const left = Math.max(0, Math.ceil((endAt - t) / 1000));
      if (left !== lastLeft.current) {
        lastLeft.current = left;
        if (left > 0 && left <= 3) say(['', 'één', 'twee', 'drie'][left]);
      }
      if (left <= 0) toShow(cur);
    }, 100);
  };

  const askParts = (q: Question, en: boolean): [string, Lang][] => {
    const parts: [string, Lang][] = [[q.speak.nl, 'nl']];
    if (en) parts.push([q.speak.en, 'en']);
    if (q.kind === 'choice' && q.options) parts.push([q.options.map((o, j) => `${LETTERS[j]}: ${o.nl}`).join('. '), 'nl']);
    return parts;
  };

  const ask = (r: Round) => {
    stopTimer();
    hush();
    const fresh: Round = { ...r, phase: 'ask', got: [] };
    setRound(fresh);
    const q = fresh.qs[fresh.i];
    const at = fresh.i;
    window.clearTimeout(delayRef.current);
    delayRef.current = window.setTimeout(() => {
      speakSeq(askParts(q, fresh.setup.en), () => {
        const cur = roundRef.current;
        if (cur && cur.i === at && cur.phase === 'ask') toThink(cur);
      });
    }, 300);
  };

  const reveal = (r: Round) => {
    stopTimer();
    setRound({ ...r, phase: 'reveal' });
    chime();
    const q = r.qs[r.i];
    const a = q.kind === 'choice' ? `${LETTERS[q.answer]}: ${answerLabel(q)}` : answerLabel(q);
    say(`Het antwoord is ${a}.`);
  };

  const finish = (r: Round) => {
    stopTimer();
    setRound(r);
    setView('end');
    const best = Math.max(...r.scores);
    const winners = r.scores.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
    if (r.setup.teams > 1) {
      say(winners.length > 1 ? 'Gelijkspel! Jullie zijn allemaal kampioen! Goed gedaan, klas!' : `${TEAMS[winners[0]].nl} wint! Goed gedaan, klas!`);
    } else {
      say(`Jullie hadden er ${r.scores[0]} van de ${r.qs.length} goed. Goed gedaan, klas!`);
    }
  };

  const next = (r: Round) => {
    const scores = r.scores.map((s, i) => s + (r.got.includes(i) ? 1 : 0));
    const done = { ...r, scores, got: [] };
    if (r.i < r.qs.length - 1) ask({ ...done, i: r.i + 1 });
    else finish(done);
  };

  const advance = () => {
    const r = roundRef.current;
    if (!r) return;
    if (r.phase === 'ask') toThink(r);
    else if (r.phase === 'think' || r.phase === 'show') reveal(r);
    else next(r);
  };

  const readAgain = () => {
    const r = roundRef.current;
    if (!r) return;
    const q = r.qs[r.i];
    // Reading again never moves the board on to the next phase.
    window.clearTimeout(delayRef.current);
    speakSeq(askParts(q, r.setup.en));
  };

  const toggleGot = (t: number) => {
    const r = roundRef.current;
    if (!r || r.phase !== 'reveal') return;
    setRound({ ...r, got: r.got.includes(t) ? r.got.filter((x) => x !== t) : [...r.got, t] });
  };

  const start = () => {
    const s = { ...setup, topicId: topic.id };
    setSetup(s);
    const r: Round = {
      topic,
      setup: s,
      qs: makeQuestions(topic, s.level, s.count),
      i: 0,
      phase: 'ask',
      endAt: 0,
      scores: Array(s.teams).fill(0),
      got: [],
    };
    setView('board');
    ask(r);
  };

  const quitBoard = () => {
    stopTimer();
    window.clearTimeout(delayRef.current);
    hush();
    closePicker();
    setRound(null);
    setView('setup');
  };

  const pickName = () => {
    const names = namesOf(setup.names);
    if (!names.length) return;
    let pool = names.filter((n) => !usedNames.current.includes(n));
    if (!pool.length) {
      usedNames.current = [];
      pool = names;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    usedNames.current.push(chosen);
    window.clearInterval(pickTimer.current);
    let n = 0;
    setPicker({ name: names[Math.floor(Math.random() * names.length)], done: false });
    pickTimer.current = window.setInterval(() => {
      n++;
      if (n > 14) {
        window.clearInterval(pickTimer.current);
        setPicker({ name: chosen, done: true });
        say(`${chosen}, jij mag!`);
      } else {
        setPicker({ name: names[Math.floor(Math.random() * names.length)], done: false });
      }
    }, 80);
  };

  // ---- teacher keys ----
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if (view !== 'board') return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (picker) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        closePicker();
      }
      return;
    }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      advance();
    } else if (e.key === 'r' || e.key === 'R') readAgain();
    else if (e.key === 'n' || e.key === 'N') pickName();
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ---------- views ----------

  if (view === 'setup' || !round) {
    return (
      <SetupView
        setup={setup}
        setSetup={setSetup}
        topic={topic}
        onBack={() => {
          hush();
          onExit();
        }}
        onStart={start}
      />
    );
  }

  if (view === 'end') {
    return (
      <EndView
        round={round}
        onAgain={() => {
          hush();
          start();
        }}
        onSetup={quitBoard}
      />
    );
  }

  const hasNames = namesOf(setup.names).length > 0;

  return (
    <div className="kl kl-board">
      <header className="kl-top">
        <button className="round-btn" onClick={quitBoard} aria-label="Stoppen · Stop">
          <CloseIcon />
        </button>
        <span className="t-label kl-top-label">
          Vraag {round.i + 1}/{round.qs.length} · {round.topic.name.nl}
        </span>
        <button className="speak" onClick={readAgain} aria-label="Nog eens voorlezen · Read again">
          <SpeakerIcon />
          <span>R</span>
        </button>
        <div className="kl-spacer" />
        <TeamChips round={round} />
        {hasNames && (
          <button className="btn btn-secondary" onClick={pickName}>
            <DiceIcon /> Wie mag? · Who?
          </button>
        )}
        <button className="round-btn" onClick={toggleFullscreen} aria-label="Volledig scherm · Fullscreen">
          <FullIcon />
        </button>
      </header>

      <Board key={round.i} round={round} onRight={() => round.phase !== 'reveal' && reveal(round)} />

      <PhaseBar round={round} now={now} onAdvance={advance} onToggle={toggleGot} />

      <p className="kl-keys muted">
        Spatie / Enter / → = volgende stap · R = nog eens voorlezen · N = Wie mag? · F = volledig scherm
      </p>

      {picker && (
        <div className="kl-overlay" onClick={closePicker} role="dialog" aria-label="Wie mag? · Whose turn?">
          <div className="kl-picker card" onClick={(e) => e.stopPropagation()}>
            <p className="t-label">Wie mag? · Whose turn?</p>
            <p className={`kl-pick-name ${picker.done ? 'is-chosen' : ''}`}>{picker.name}</p>
            {picker.done && <p className="t-title">jij mag! · your turn!</p>}
            <button className="btn btn-secondary" onClick={closePicker}>
              Sluiten · Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- setup view ----------

function Chip<T>({ value, current, onPick, children, sub }: { value: T; current: T; onPick: (v: T) => void; children: ReactNode; sub?: string }) {
  const on = value === current;
  return (
    <button className={`chip kl-chip ${on ? 'is-sel' : ''}`} aria-pressed={on} onClick={() => onPick(value)}>
      <span>{children}</span>
      {sub && <small>{sub}</small>}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kl-field">
      <span className="t-label">{label}</span>
      <div className="chips">{children}</div>
    </div>
  );
}

function SetupView({
  setup,
  setSetup,
  topic,
  onBack,
  onStart,
}: {
  setup: ClassSetup;
  setSetup: (s: ClassSetup) => void;
  topic: Topic;
  onBack: () => void;
  onStart: () => void;
}) {
  const groep = GROEPEN.find((g) => g.id === setup.groepId) ?? GROEPEN[0];
  const set = <K extends keyof ClassSetup>(k: K) => (v: ClassSetup[K]) => setSetup({ ...setup, [k]: v });
  return (
    <div className="kl kl-setup">
      <header className="kl-top">
        <button className="round-btn" onClick={onBack} aria-label="Terug · Back">
          <BackIcon />
        </button>
        <div>
          <h1 className="t-title">Klas · digibord</h1>
          <p className="en">Classroom board · set up the lesson</p>
        </div>
      </header>

      <div className="kl-setup-grid">
        <div className="card">
          <Field label="Groep · Group">
            {GROEPEN.map((g) => (
              <Chip key={g.id} value={g.id} current={setup.groepId} onPick={(id) => setSetup({ ...setup, groepId: id, topicId: '' })}>
                {g.name.nl}
              </Chip>
            ))}
          </Field>
          <Field label="Onderwerp · Topic">
            {groep.topics.map((t) => (
              <Chip key={t.id} value={t.id} current={topic.id} onPick={set('topicId')} sub={t.name.en}>
                {t.name.nl}
              </Chip>
            ))}
          </Field>
          <Field label="Niveau · Level">
            <Chip value={1 as LevelNo} current={setup.level} onPick={set('level')} sub="easy">
              1 · makkelijk
            </Chip>
            <Chip value={2 as LevelNo} current={setup.level} onPick={set('level')}>
              2
            </Chip>
            <Chip value={3 as LevelNo} current={setup.level} onPick={set('level')} sub="hard">
              3 · lastig
            </Chip>
          </Field>
          <Field label="Aantal vragen · Questions">
            {([5, 10, 15] as const).map((n) => (
              <Chip key={n} value={n} current={setup.count} onPick={set('count')}>
                {n}
              </Chip>
            ))}
          </Field>
        </div>

        <div className="card">
          <Field label="Teams">
            <Chip value={1 as TeamCount} current={setup.teams} onPick={set('teams')} sub="Whole class">
              Hele klas
            </Chip>
            <Chip value={2 as TeamCount} current={setup.teams} onPick={set('teams')} sub="Oranje · Geel">
              2 teams
            </Chip>
            <Chip value={3 as TeamCount} current={setup.teams} onPick={set('teams')} sub="Oranje · Geel · Nacht">
              3 teams
            </Chip>
          </Field>
          <Field label="Denktijd · Think time">
            {([10, 20, 30] as const).map((n) => (
              <Chip key={n} value={n as Think} current={setup.think} onPick={set('think')}>
                {n} s
              </Chip>
            ))}
            <Chip value={60 as Think} current={setup.think} onPick={set('think')}>
              1 min
            </Chip>
            <Chip value={0 as Think} current={setup.think} onPick={set('think')} sub="None">
              Geen
            </Chip>
          </Field>
          <Field label="Ook in het Engels voorlezen · Also read in English">
            <Chip value={true} current={setup.en} onPick={set('en')}>
              Ja · Yes
            </Chip>
            <Chip value={false} current={setup.en} onPick={set('en')}>
              Nee · No
            </Chip>
          </Field>
          <label className="kl-field">
            <span className="t-label">Namen voor "Wie mag?" (optioneel) · Names for the picker (optional)</span>
            <textarea
              className="kl-names"
              value={setup.names}
              onChange={(e) => setSetup({ ...setup, names: e.target.value })}
              placeholder="Eén naam per regel · One name per line"
              rows={5}
            />
            <span className="en">Alleen voornamen, blijft op dit apparaat. · First names only, kept on this device.</span>
          </label>
        </div>
      </div>

      <button className="btn btn-primary kl-start" onClick={onStart}>
        Start de les · Start <NextIcon size={28} />
      </button>
      <p className="kl-keys muted">
        Tip: zet het bord op volledig scherm. Spatie = volgende stap, R = nog eens voorlezen, N = Wie mag?, F = volledig scherm. · Space = next step, R = read
        again, N = pick a name, F = fullscreen.
      </p>
    </div>
  );
}

// ---------- board pieces ----------

function TeamChips({ round }: { round: Round }) {
  if (round.setup.teams === 1) {
    return (
      <span className="kl-team kl-team-all">
        Hele klas · Whole class <b>{round.scores[0]}</b>
      </span>
    );
  }
  return (
    <>
      {round.scores.map((s, i) => (
        <span key={i} className={`kl-team kl-team-${i}`}>
          {TEAMS[i].nl} <b>{s}</b>
        </span>
      ))}
    </>
  );
}

function Pictures({ q }: { q: Question }) {
  if (!q.scene && !q.visual && !q.beads) return null;
  return (
    <div className="kl-pic">
      {q.scene && <SceneView scene={q.scene} big />}
      {q.visual && <VisualView v={q.visual} />}
      {q.beads ? <Beads count={q.beads} /> : null}
    </div>
  );
}

/** Read a typed answer: comma or point decimals, "€ 12", "1.000" (Dutch thousands). */
export function typedNumber(raw: string): number | null {
  let t = raw.trim().replace(/^€\s*/, '').replace(/\s+/g, '').replace(/−/g, '-');
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  t = t.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

const isRight = (q: Question, raw: string) => {
  const n = typedNumber(raw);
  return n !== null && Math.abs(n - q.answer) < 1e-9;
};

/** The answer box on the board: type the answer, Enter or Check checks it. */
function AnswerInput({ q, onRight }: { q: Question; onRight: () => void }) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const check = () => {
    if (!value.trim()) return;
    if (isRight(q, value)) onRight();
    else setWrong(true);
  };
  return (
    <span className="kl-input-wrap">
      <input
        className={`answer-box kl-box kl-input ${wrong ? 'is-retry' : ''}`}
        value={value}
        inputMode={q.decimals ? 'decimal' : 'numeric'}
        autoComplete="off"
        aria-label="Typ het antwoord · Type the answer"
        onChange={(e) => {
          setValue(e.target.value.replace(/[^0-9,.\-−€ ]/g, '').slice(0, 9));
          setWrong(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            check();
          }
          e.stopPropagation();
        }}
      />
      <button className="btn btn-primary kl-check" onClick={check} disabled={!value.trim()} aria-label="Nakijken · Check">
        <CheckIcon size={36} />
      </button>
      {wrong && (
        <span className="kl-retry" role="status">
          <RetryIcon size={28} /> Bijna! Probeer nog eens. · Almost! Try again.
        </span>
      )}
    </span>
  );
}

function AnswerSlot({ q, shown, onRight }: { q: Question; shown: boolean; onRight: () => void }) {
  const pre = q.unit === '€' ? '€ ' : '';
  const post = q.unit && q.unit !== '€' ? ` ${q.unit}` : '';
  if (!shown) return <AnswerInput q={q} onRight={onRight} />;
  return (
    <span className="answer-box is-correct kl-box kl-ans">
      <CheckIcon size={48} />
      {pre}
      {answerLabel({ ...q, unit: undefined })}
      {post}
    </span>
  );
}

function Board({ round, onRight }: { round: Round; onRight: () => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const q = round.qs[round.i];
  const en = round.setup.en;
  const rev = round.phase === 'reveal';
  const isChoice = q.kind === 'choice' && !!q.options;
  const isSum = !isChoice && q.expr !== '' && q.expr !== BOX && q.expr.includes(BOX);
  const hasPic = !!(q.scene || q.visual || q.beads);

  const text = (
    <div className="kl-text">
      <p className={`kl-q ${isSum ? 'is-small' : ''}`}>{q.text.nl}</p>
      {en && <p className="en kl-q-en">{q.text.en}</p>}
    </div>
  );

  let sum: ReactNode = null;
  if (isSum) {
    const [before, after] = q.expr.split(BOX);
    const long = q.expr.length > 14;
    sum = (
      <div className={`kl-sum ${long ? 'is-long' : ''}`} aria-live="polite">
        {before && <span>{before.trim()}</span>}
        <AnswerSlot q={q} shown={rev} onRight={onRight} />
        {after && <span>{after.trim()}</span>}
      </div>
    );
  } else if (!isChoice) {
    sum = (
      <div className="kl-sum" aria-live="polite">
        <AnswerSlot q={q} shown={rev} onRight={onRight} />
      </div>
    );
  }

  const options = isChoice ? (
    <div className={`kl-opts ${hasPic ? 'is-one' : ''}`}>
      {q.options!.map((o, j) => {
        const right = rev && j === q.answer;
        const tried = !rev && picked.includes(j);
        return (
          <button
            key={j}
            className={`kl-opt ${right ? 'is-right' : ''} ${rev && !right ? 'is-dim' : ''} ${tried ? 'is-tried' : ''}`}
            disabled={rev || tried}
            onClick={() => (j === q.answer ? onRight() : setPicked((p) => [...p, j]))}
          >
            <span className="kl-letter">{right ? <CheckIcon size={44} /> : tried ? <RetryIcon size={40} /> : LETTERS[j]}</span>
            <span className="kl-opt-text">
              {o.nl}
              {en && o.en && <small className="en">{o.en}</small>}
            </span>
          </button>
        );
      })}
    </div>
  ) : null;

  const solution = rev && q.solution && (
    <div className="feedback feedback-good kl-solution">
      <span className="feedback-icon">
        <CheckIcon />
      </span>
      <div className="bi-lines">
        <p className="nl">{q.solution.nl}</p>
        {en && <p className="en">{q.solution.en}</p>}
      </div>
    </div>
  );

  return (
    <main className="card kl-card">
      {rev && <Burst key={round.i} />}
      {isChoice && hasPic ? (
        <div className="kl-split">
          <div className="kl-col">
            {text}
            <Pictures q={q} />
          </div>
          {options}
        </div>
      ) : (
        <>
          {text}
          <Pictures q={q} />
          {sum}
          {options}
        </>
      )}
      {solution}
    </main>
  );
}

function Burst() {
  return (
    <div className="kl-burst" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`kl-star kl-star-${i}`}>
          <StarIcon filled size={56} />
        </span>
      ))}
    </div>
  );
}

function Ring({ left, frac }: { left: number; frac: number }) {
  const C = 2 * Math.PI * 54;
  return (
    <div className={`kl-ring ${left <= 3 ? 'is-last' : ''}`} role="timer" aria-label={`${left} seconden · seconds`}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" className="kl-ring-track" />
        <circle cx="60" cy="60" r="54" className="kl-ring-fill" strokeDasharray={C} strokeDashoffset={C * Math.min(1, Math.max(0, frac))} />
      </svg>
      <span className="kl-ring-num">{left}</span>
    </div>
  );
}

function PhaseBar({ round, now, onAdvance, onToggle }: { round: Round; now: number; onAdvance: () => void; onToggle: (t: number) => void }) {
  const last = round.i >= round.qs.length - 1;
  let body: ReactNode = null;
  switch (round.phase) {
    case 'ask':
      body = (
        <>
          <Phase nl="Luister goed…" en="Listen carefully…" />
          <button className="btn btn-secondary kl-go" onClick={onAdvance}>
            {round.setup.think ? 'Denktijd · Think time' : 'Laat zien · Show'} <NextIcon />
          </button>
        </>
      );
      break;
    case 'think': {
      const total = round.setup.think * 1000;
      const msLeft = Math.max(0, round.endAt - now);
      body = (
        <>
          <Ring left={Math.ceil(msLeft / 1000)} frac={1 - msLeft / total} />
          <Phase nl="Denk na…" en="Think… write your answer down!" />
          <button className="btn btn-secondary kl-go" onClick={onAdvance}>
            Antwoord · Answer <NextIcon />
          </button>
        </>
      );
      break;
    }
    case 'show':
      body = (
        <>
          <Phase nl="Laat maar zien!" en="Show me your answer!" big />
          <button className="btn btn-primary kl-go" onClick={onAdvance}>
            Antwoord · Answer <NextIcon />
          </button>
        </>
      );
      break;
    case 'reveal':
      body = (
        <>
          <Phase nl="Wie had het goed?" en="Who got it right?" />
          <div className="kl-ticks">
            {round.setup.teams === 1 ? (
              <TeamTick cls="kl-team-all" on={round.got.includes(0)} onClick={() => onToggle(0)} label="Goed! · Correct" />
            ) : (
              round.scores.map((_, i) => (
                <TeamTick key={i} cls={`kl-team-${i}`} on={round.got.includes(i)} onClick={() => onToggle(i)} label={TEAMS[i].nl} />
              ))
            )}
          </div>
          <button className="btn btn-primary kl-go" onClick={onAdvance}>
            {last ? 'Uitslag · Results' : 'Volgende · Next'} <NextIcon />
          </button>
        </>
      );
      break;
  }
  return <div className="kl-bar">{body}</div>;
}

function Phase({ nl, en, big }: { nl: string; en: string; big?: boolean }) {
  return (
    <div className={`kl-phase ${big ? 'is-big' : ''}`}>
      <span className="kl-phase-nl">{nl}</span>
      <span className="en">{en}</span>
    </div>
  );
}

function TeamTick({ cls, on, onClick, label }: { cls: string; on: boolean; onClick: () => void; label: string }) {
  return (
    <button className={`btn kl-tick ${cls} ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      {on ? <CheckIcon size={28} /> : <EmptyIcon />} {label}
    </button>
  );
}

// ---------- end view ----------

function EndView({ round, onAgain, onSetup }: { round: Round; onAgain: () => void; onSetup: () => void }) {
  const teams = round.setup.teams > 1;
  const order = round.scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
  const max = Math.max(1, ...round.scores);
  return (
    <div className="kl kl-end">
      <div className="kl-end-stars" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ animationDelay: `${i * 0.2}s` }}>
            <StarIcon filled size={88} />
          </span>
        ))}
      </div>
      <h1 className="kl-end-title">Goed gedaan, klas!</h1>
      <p className="en kl-end-en">Well done, everyone!</p>
      {teams ? (
        <div className="kl-podium">
          {order.map((o, rank) => (
            <div key={o.i} className={`kl-pod kl-team-${o.i}`} style={{ height: `${120 + (180 * o.s) / max}px` }}>
              <span className="kl-pod-rank">{rank + 1}</span>
              <b className="kl-pod-score">{o.s}</b>
              <span>{TEAMS[o.i].nl}</span>
              <span className="kl-pod-en">{TEAMS[o.i].en}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="kl-total">
          <b>
            {round.scores[0]} / {round.qs.length}
          </b>
          <span>goed · correct</span>
        </div>
      )}
      <div className="kl-end-btns">
        <button className="btn btn-secondary kl-go" onClick={onAgain}>
          <RetryIcon /> Nog een ronde · Again
        </button>
        <button className="btn btn-primary kl-go" onClick={onSetup}>
          Andere les · New lesson <NextIcon />
        </button>
      </div>
    </div>
  );
}
