import { useCallback, useEffect, useRef, useState } from 'react';
import './boek.css';
import { normAns, parseKey, recentResults, recordResult, starsFor, type BookResults } from './bookCheck';
import { BackIcon, BookIcon, CheckIcon, NextIcon, PencilIcon, RetryIcon, SpeakerIcon, StarIcon } from './Icons';
import { chime, speak, speakable, speakText, stopSpeaking } from './speech';

// "Werken in je boek" (SPEC §16.2): the app sends the child into their workbook.
// The app mostly talks; the screen stays calm.

const SETUP_KEY = 'rekenpret-book';
const RESULTS_KEY = 'rekenpret-book-results';

const ITEM_CHOICES = [4, 6, 8, 10, 12, 15, 20];
const MINUTE_CHOICES = [5, 10, 15, 20, 0];

interface Setup {
  book: string;
  page: string;
  ex: string;
  items: number;
  /** 0 = no clock (the default: no timers unless a grown-up picks one). */
  minutes: number;
  caller: boolean;
  key: string;
}

const DEFAULT_SETUP: Setup = { book: '', page: '', ex: '', items: 10, minutes: 0, caller: true, key: '' };

function loadSetup(): Setup {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) return { ...DEFAULT_SETUP };
    const p = JSON.parse(raw) as Partial<Setup>;
    return {
      book: typeof p.book === 'string' ? p.book : '',
      page: typeof p.page === 'string' ? p.page : '',
      ex: typeof p.ex === 'string' ? p.ex : '',
      items: ITEM_CHOICES.includes(p.items as number) ? (p.items as number) : DEFAULT_SETUP.items,
      minutes: MINUTE_CHOICES.includes(p.minutes as number) ? (p.minutes as number) : DEFAULT_SETUP.minutes,
      caller: typeof p.caller === 'boolean' ? p.caller : DEFAULT_SETUP.caller,
      key: typeof p.key === 'string' ? p.key : '',
    };
  } catch {
    return { ...DEFAULT_SETUP };
  }
}

function saveSetup(s: Setup): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: the setup just isn't remembered.
  }
}

function loadResults(): BookResults {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    const p = raw ? (JSON.parse(raw) as unknown) : {};
    return p && typeof p === 'object' ? (p as BookResults) : {};
  } catch {
    return {};
  }
}

function saveResults(r: BookResults): void {
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(r));
  } catch {
    // ignore
  }
}

type Phase = 'setup' | 'get' | 'work' | 'check' | 'self' | 'result';

interface Mark {
  ok: boolean;
  given: string;
  want: string;
}

interface Run {
  key: string[];
  n: number;
  start: number;
}

const where = (s: { page: string; ex: string }) => ({
  nl: `Bladzijde ${s.page}${s.ex ? ` · Opdracht ${s.ex}` : ''}`,
  en: `Page ${s.page}${s.ex ? ` · Exercise ${s.ex}` : ''}`,
});

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Stars({ n, size = 24 }: { n: number; size?: number }) {
  return (
    <span className="boek-stars" aria-label={`${n} van 3 sterren · ${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'star-sun' : 'boek-star-off'}>
          <StarIcon size={size} filled={i < n} />
        </span>
      ))}
    </span>
  );
}

export default function Boek({ onExit }: { onExit: () => void }) {
  const [setup, setSetup] = useState<Setup>(loadSetup);
  const [results, setResults] = useState<BookResults>(loadResults);
  const [phase, setPhase] = useState<Phase>('setup');
  const [pageMissing, setPageMissing] = useState(false);
  const [run, setRun] = useState<Run>({ key: [], n: 0, start: 0 });

  // work
  const [cur, setCur] = useState(1);
  const [left, setLeft] = useState(0);
  const [timeUp, setTimeUp] = useState(false);

  // check
  const [checkI, setCheckI] = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [input, setInput] = useState('');

  // self-check + result
  const [self, setSelf] = useState(0);
  const [good, setGood] = useState(0);
  const [endedAt, setEndedAt] = useState(0);

  // Speech chain: bumping the generation stops a running "read all".
  const speechGen = useRef(0);
  const say = useCallback((text: string) => {
    speechGen.current++;
    speak(text, 'nl');
  }, []);
  const sayAll = useCallback((lines: string[]) => {
    const gen = ++speechGen.current;
    const next = (i: number) => {
      if (i >= lines.length || gen !== speechGen.current) return;
      speakText(speakable(lines[i], 'nl'), 'nl', { onEnd: () => window.setTimeout(() => next(i + 1), 250) });
    };
    next(0);
  }, []);
  const hush = useCallback(() => {
    speechGen.current++;
    stopSpeaking();
  }, []);

  // Stop speech when the screen goes away.
  useEffect(() => hush, [hush]);

  const keyList = parseKey(setup.key);
  const loc = where(setup);
  const update = (p: Partial<Setup>) => setSetup((s) => ({ ...s, ...p }));

  // ---------- flow ----------

  const sayGet = () =>
    say(
      `Pak je rekenboek${setup.book ? ' ' + setup.book : ''}. Sla bladzijde ${setup.page} open${
        setup.ex ? ` en zoek opdracht ${setup.ex}` : ''
      }.`,
    );

  const start = () => {
    const s = { ...setup, book: setup.book.trim(), page: setup.page.trim(), ex: setup.ex.trim() };
    if (!s.page) {
      setPageMissing(true);
      document.getElementById('boek-page')?.focus();
      return;
    }
    setPageMissing(false);
    setSetup(s);
    saveSetup(s);
    const key = parseKey(s.key);
    setRun({ key, n: key.length || s.items, start: Date.now() });
    setPhase('get');
    speechGen.current++;
    speak(
      `Pak je rekenboek${s.book ? ' ' + s.book : ''}. Sla bladzijde ${s.page} open${s.ex ? ` en zoek opdracht ${s.ex}` : ''}.`,
      'nl',
    );
  };

  const startWork = () => {
    setCur(1);
    setTimeUp(false);
    setLeft(setup.minutes * 60000);
    setPhase('work');
    sayAll([`Aan de slag! Je maakt ${run.n} sommen in je boek.`, ...(setup.caller ? ['Som 1.'] : [])]);
  };

  const toCheck = useCallback(() => {
    setCheckI(0);
    setMarks([]);
    setInput('');
    setSelf(0);
    if (run.key.length) {
      setPhase('check');
      say('Klaar! We gaan nakijken. Typ het antwoord van som 1.');
    } else {
      setPhase('self');
      say('Klaar! Kijk je sommen na. Hoeveel had je goed?');
    }
  }, [run.key.length, say]);

  const nextSum = useCallback(() => {
    if (cur < run.n) {
      setCur(cur + 1);
      say(`Som ${cur + 1}.`);
    } else toCheck();
  }, [cur, run.n, say, toCheck]);

  const finish = useCallback(
    (g: number) => {
      const now = Date.now();
      const stars = starsFor(g, run.n);
      setGood(g);
      setEndedAt(now);
      setPhase('result');
      setResults((prev) => {
        const r = recordResult(prev, { book: setup.book, page: setup.page, ex: setup.ex, good: g, total: run.n, when: now });
        saveResults(r);
        return r;
      });
      chime();
      say(`Je had er ${g} van de ${run.n} goed. ${stars >= 2 ? 'Fantastisch!' : 'Goed geoefend!'}`);
    },
    [run.n, setup.book, setup.page, setup.ex, say],
  );

  const submit = useCallback(() => {
    if (!input.trim()) return;
    const want = run.key[checkI];
    const ok = normAns(input) === normAns(want);
    setMarks((m) => {
      const c = m.slice();
      c[checkI] = { ok, given: input.trim(), want };
      return c;
    });
    setInput('');
    if (ok) {
      chime();
      say('Goed zo!');
    } else say(`Het goede antwoord is ${want}. Verbeter het in je boek.`);
  }, [input, run.key, checkI, say]);

  const checkNext = useCallback(() => {
    if (checkI < run.key.length - 1) {
      setCheckI(checkI + 1);
      say(`Som ${checkI + 2}.`);
    } else finish(marks.filter((m) => m?.ok).length);
  }, [checkI, run.key.length, marks, finish, say]);

  const readAll = () => sayAll(run.key.map((a, i) => `Som ${i + 1}: ${a}.`));

  const quit = () => {
    hush();
    setPhase('setup');
  };

  // ---------- focus timer ----------

  useEffect(() => {
    if (phase !== 'work' || !setup.minutes) return;
    const total = setup.minutes * 60000;
    const end = Date.now() + total;
    let half = false;
    let last = false;
    const id = window.setInterval(() => {
      const l = end - Date.now();
      setLeft(Math.max(0, l));
      if (!half && l <= total / 2) {
        half = true;
        say('Je bent op de helft. Goed bezig!');
      }
      if (!last && l <= 60000 && total > 120000) {
        last = true;
        say('Nog één minuut.');
      }
      if (l <= 0) {
        window.clearInterval(id);
        setTimeUp(true);
        say('De tijd is om. Pennen neer!');
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, setup.minutes, say]);

  // ---------- keys ----------

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'BUTTON') return; // the button's own click handles Space/Enter
    if (phase === 'work' && setup.caller && (e.key === ' ' || e.key === 'ArrowRight')) {
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      nextSum();
    } else if (phase === 'check' && e.key === 'Enter') {
      e.preventDefault();
      if (marks[checkI]) checkNext();
      else submit();
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ---------- views ----------

  const top = (
    <header className="topbar">
      <button className="round-btn" onClick={quit} aria-label="Stoppen · Stop">
        <BackIcon />
      </button>
      <div className="topbar-title">
        <p className="t-label">
          {setup.book ? `${setup.book} · ` : ''}
          {loc.nl}
        </p>
        <p className="en">{loc.en}</p>
      </div>
      <span className="round-spacer" />
    </header>
  );

  if (phase === 'setup') {
    const recent = recentResults(results, 5);
    return (
      <section className="screen boek">
        <header className="topbar">
          <button className="round-btn" onClick={onExit} aria-label="Terug · Back">
            <BackIcon />
          </button>
          <div className="topbar-title">
            <h1 className="t-title">Werken in je boek</h1>
            <p className="en">Book work · voor ouder of juf/meester / for a parent or teacher</p>
          </div>
          <span className="round-spacer" />
        </header>

        <div className="card">
          <label className="boek-field">
            <span className="t-label">
              Boek of methode (optioneel) <span className="en">· Book or method (optional)</span>
            </span>
            <input
              className="boek-input"
              type="text"
              value={setup.book}
              placeholder="bv. Pluspunt, Wereld in Getallen"
              onChange={(e) => update({ book: e.target.value })}
            />
          </label>
          <div className="boek-row">
            <label className="boek-field">
              <span className="t-label">
                Bladzijde <span className="en">· Page</span>
              </span>
              <input
                id="boek-page"
                className={`boek-input boek-short ${pageMissing ? 'is-missing' : ''}`}
                type="text"
                inputMode="numeric"
                value={setup.page}
                placeholder="34"
                aria-invalid={pageMissing}
                onChange={(e) => {
                  update({ page: e.target.value });
                  if (e.target.value.trim()) setPageMissing(false);
                }}
              />
            </label>
            <label className="boek-field">
              <span className="t-label">
                Opdracht <span className="en">· Exercise</span>
              </span>
              <input
                className="boek-input boek-short"
                type="text"
                value={setup.ex}
                placeholder="3"
                onChange={(e) => update({ ex: e.target.value })}
              />
            </label>
          </div>
          {pageMissing && (
            <p className="boek-note">
              Vul eerst de bladzijde in. <span className="en">· Fill in the page first.</span>
            </p>
          )}

          <div className="boek-field">
            <span className="t-label">
              Aantal sommen <span className="en">· Number of sums</span>
            </span>
            <div className="chips" role="group">
              {ITEM_CHOICES.map((n) => (
                <button key={n} className={`chip ${setup.items === n ? 'is-on' : ''}`} aria-pressed={setup.items === n} onClick={() => update({ items: n })}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="boek-field">
            <span className="t-label">
              Werktijd <span className="en">· Work time</span>
            </span>
            <div className="chips" role="group">
              {MINUTE_CHOICES.map((m) => (
                <button key={m} className={`chip ${setup.minutes === m ? 'is-on' : ''}`} aria-pressed={setup.minutes === m} onClick={() => update({ minutes: m })}>
                  {m ? `${m} min` : 'Geen klok'}
                  {!m && <small>No clock</small>}
                </button>
              ))}
            </div>
          </div>

          <div className="boek-field">
            <span className="t-label">
              Som voor som voorlezen <span className="en">· Call out each sum</span>
            </span>
            <div className="chips" role="group">
              {[true, false].map((v) => (
                <button key={String(v)} className={`chip ${setup.caller === v ? 'is-on' : ''}`} aria-pressed={setup.caller === v} onClick={() => update({ caller: v })}>
                  {v ? 'Ja · Yes' : 'Nee · No'}
                </button>
              ))}
            </div>
            <p className="boek-note">
              De app zegt "Som 3" en het kind kijkt in het boek.
              <span className="en"> · The app says "Sum 3" and the child looks in the book.</span>
            </p>
          </div>

          <label className="boek-field">
            <span className="t-label">
              Antwoorden (optioneel) <span className="en">· Answer key (optional)</span>
            </span>
            <textarea
              className="boek-input boek-key"
              value={setup.key}
              placeholder="35; 42; 7; 2,5; half drie"
              onChange={(e) => update({ key: e.target.value })}
            />
            <span className="boek-note">
              Scheid met ; of een nieuwe regel. Met antwoorden kijkt de app na, zonder kijkt het kind zelf na.
              <span className="en">
                {' '}
                · Separate with ; or new lines. With a key the app checks; without one the child checks.
              </span>
            </span>
            {keyList.length > 0 && (
              <span className="boek-found">
                <CheckIcon size={20} /> {keyList.length} {keyList.length === 1 ? 'antwoord' : 'antwoorden'} gevonden
                <span className="en"> · {keyList.length} {keyList.length === 1 ? 'answer' : 'answers'} found</span>
              </span>
            )}
          </label>
        </div>

        <button className="btn btn-primary btn-wide" onClick={start}>
          Start <NextIcon />
        </button>

        {recent.length > 0 && (
          <div className="card">
            <p className="t-label">
              Laatst gedaan <span className="en">· Recently done</span>
            </p>
            <ul className="boek-recent">
              {recent.map((r) => (
                <li key={`${r.book}/${r.page}/${r.ex}`}>
                  <BookIcon size={20} />
                  <span className="boek-recent-text">
                    {r.book ? `${r.book} · ` : ''}Bladzijde {r.page}
                    {r.ex ? ` · opdracht ${r.ex}` : ''} · {r.stars} {r.stars === 1 ? 'ster' : 'sterren'}
                    <span className="en">
                      {' '}
                      · Page {r.page}
                      {r.ex ? ` · exercise ${r.ex}` : ''} · {r.stars} {r.stars === 1 ? 'star' : 'stars'}
                    </span>
                  </span>
                  <Stars n={r.stars} size={18} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  if (phase === 'get') {
    return (
      <section className="screen boek">
        {top}
        <div className="boek-stage">
          <span className="boek-art">
            <BookIcon size={120} />
          </span>
          <h1 className="t-display">Pak je rekenboek!</h1>
          <p className="en boek-sub">Get your maths book!</p>
          <p className="boek-big">
            {loc.nl}
            <small>{loc.en}</small>
          </p>
          <button className="btn btn-accent" onClick={sayGet} aria-label="Nog eens voorlezen · Read again">
            <SpeakerIcon /> Nog eens · Again
          </button>
          <button className="btn btn-primary btn-wide" onClick={startWork}>
            Mijn boek is open · My book is open <NextIcon />
          </button>
        </div>
      </section>
    );
  }

  if (phase === 'work') {
    const total = setup.minutes * 60000;
    return (
      <section className="screen boek">
        {top}
        <div className="boek-stage">
          <span className="boek-art boek-art-soft">
            <PencilIcon size={72} />
          </span>
          <h1 className="t-title">Ogen in je boek</h1>
          <p className="en boek-sub">Eyes on your book · work there, not on the screen</p>

          {setup.caller ? (
            <>
              <p className="boek-big">
                Som {cur} van {run.n}
                <small>
                  Sum {cur} of {run.n}
                </small>
              </p>
              <div className="boek-marks" aria-hidden="true">
                {Array.from({ length: run.n }, (_, i) => (
                  <span key={i} className={`boek-mark ${i < cur - 1 ? 'is-done' : ''} ${i === cur - 1 ? 'is-now' : ''}`}>
                    {i < cur - 1 ? <CheckIcon size={16} /> : i + 1}
                  </span>
                ))}
              </div>
              <button className="btn btn-primary btn-wide" onClick={nextSum}>
                {cur < run.n ? 'Volgende som · Next sum' : 'Klaar! · Done!'} <NextIcon />
              </button>
              <p className="boek-note">
                Tik als je de som in je boek hebt gemaakt.
                <span className="en"> · Tap when this sum is done in your book (Space / →).</span>
              </p>
            </>
          ) : (
            <p className="boek-big">
              {run.n} sommen
              <small>{run.n} sums</small>
            </p>
          )}

          {total > 0 && (
            <div className="boek-timer" role="timer" aria-label={`Nog ${clock(left)} · ${clock(left)} left`}>
              <span className="boek-clock">{clock(left)}</span>
              <div className="boek-bar">
                <span style={{ width: `${Math.min(100, 100 * (1 - left / total))}%` }} />
              </div>
            </div>
          )}
          {timeUp && (
            <p className="boek-note">
              De tijd is om. Pennen neer! <span className="en">· Time is up. Pens down!</span>
            </p>
          )}

          <button className={`btn ${setup.caller && !timeUp ? 'btn-secondary' : 'btn-primary btn-wide'}`} onClick={toCheck}>
            {setup.caller ? 'Alles af · All done' : 'Ik ben klaar · I am done'} <CheckIcon />
          </button>
        </div>
      </section>
    );
  }

  if (phase === 'check') {
    const m = marks[checkI];
    const last = checkI >= run.key.length - 1;
    return (
      <section className="screen boek">
        {top}
        <div className="boek-stage">
          <h1 className="t-title">Nakijken</h1>
          <p className="en boek-sub">Checking time</p>
          <div className="boek-marks" aria-hidden="true">
            {run.key.map((_, i) => (
              <span
                key={i}
                className={`boek-mark ${marks[i] ? (marks[i].ok ? 'is-done' : 'is-retry') : ''} ${i === checkI ? 'is-now' : ''}`}
              >
                {marks[i] ? marks[i].ok ? <CheckIcon size={16} /> : <RetryIcon size={16} /> : i + 1}
              </span>
            ))}
          </div>
          <p className="boek-big">
            Som {checkI + 1}
            <small>Wat heb je in je boek geschreven? · What did you write in your book?</small>
          </p>

          {m ? (
            <>
              <div className={`feedback ${m.ok ? 'feedback-good' : 'feedback-soft'} boek-feedback`} role="status">
                <span className="feedback-icon">{m.ok ? <CheckIcon /> : <RetryIcon />}</span>
                <div>
                  <p className="t-title">{m.ok ? 'Goed zo!' : `Het goede antwoord is ${m.want}. Verbeter het in je boek.`}</p>
                  <p className="en">{m.ok ? 'Well done!' : `The right answer is ${m.want}. Fix it in your book.`}</p>
                </div>
              </div>
              <button className="btn btn-primary btn-wide" onClick={checkNext} autoFocus>
                {last ? 'Klaar! · Done!' : 'Volgende · Next'} <NextIcon />
              </button>
            </>
          ) : (
            <div className="boek-check-row">
              <input
                key={checkI}
                className="boek-input boek-answer"
                type="text"
                autoComplete="off"
                autoFocus
                aria-label={`Antwoord som ${checkI + 1} · Answer sum ${checkI + 1}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="btn btn-primary" onClick={submit} disabled={!input.trim()}>
                Check <CheckIcon />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (phase === 'self') {
    return (
      <section className="screen boek">
        {top}
        <div className="boek-stage">
          <h1 className="t-title">Kijk je sommen na</h1>
          <p className="en boek-sub">Check your sums with the answer page or your teacher</p>
          <p className="boek-big">
            Hoeveel had je goed?
            <small>How many did you get right?</small>
          </p>
          <div className="boek-counter">
            <button className="btn btn-secondary boek-count-btn" onClick={() => setSelf((s) => Math.max(0, s - 1))} aria-label="Eén minder · One less">
              −
            </button>
            <span className="boek-count" aria-live="polite">
              {self}
            </span>
            <button className="btn btn-secondary boek-count-btn" onClick={() => setSelf((s) => Math.min(run.n, s + 1))} aria-label="Eén meer · One more">
              +
            </button>
          </div>
          <p className="t-label">
            van de {run.n} <span className="en">· out of {run.n}</span>
          </p>
          <button className="btn btn-primary btn-wide" onClick={() => finish(self)}>
            Klaar · Done <NextIcon />
          </button>
        </div>
      </section>
    );
  }

  // result
  const stars = starsFor(good, run.n);
  const mins = Math.max(1, Math.round((endedAt - run.start) / 60000));
  const cheer =
    stars >= 2
      ? { nl: 'Fantastisch!', en: 'Fantastic!' }
      : stars === 1
        ? { nl: 'Goed gedaan!', en: 'Well done!' }
        : { nl: 'Goed geoefend!', en: 'Good practice!' };
  return (
    <section className="screen boek">
      <div className="boek-stage">
        <Stars n={stars} size={72} />
        <h1 className="t-display">{cheer.nl}</h1>
        <p className="en boek-sub">{cheer.en}</p>
        <p className="t-title">
          {good} van de {run.n} goed
        </p>
        <p className="en">
          {good} of {run.n} right
        </p>
        <p className="boek-note">
          {loc.nl} · {mins} min <span className="en">· {loc.en} · {mins} min</span>
        </p>
        {run.key.length > 0 && (
          <button className="btn btn-accent btn-wide" onClick={readAll}>
            <SpeakerIcon /> Lees alle antwoorden voor · Read all answers
          </button>
        )}
        <button
          className="btn btn-primary btn-wide"
          onClick={() => {
            hush();
            setPhase('setup');
          }}
        >
          Nieuwe bladzijde · New page <NextIcon />
        </button>
        <button
          className="btn btn-secondary btn-wide"
          onClick={() => {
            hush();
            onExit();
          }}
        >
          Menu
        </button>
      </div>
    </section>
  );
}
