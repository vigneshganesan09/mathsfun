import { useCallback, useEffect, useRef, useState } from 'react';
import { answerLabel, BOX, fmtEn, fmtNl, type Bi, type Question, type Topic } from './core';
import { BulbIcon, CheckIcon, MicIcon, NextIcon, RetryIcon, StarIcon } from './Icons';
import { canListen, LISTEN_ERROR_TEXT, useListener, type ListenError } from './listen';
import { Character, SceneView, VisualView } from './pictures';
import { heardNumbers } from './readingScore';
import { pointsFor } from './scoring';
import { chime, speak, stopSpeaking } from './speech';
import type { Settings } from './storage';
import { teacherById } from './teachers';
import { Beads, BiText, NumberPad, TopBar } from './ui';
import { Land, landFor } from './Art';
import { GROEPEN } from './curriculum';

/** practice: retries, hints, points. write/say: a test, one answer per question, revealed straight after. */
export type PlayMode = 'practice' | 'write' | 'say';

export interface Mistake {
  /** The question with the right answer filled in, e.g. "7 × 8 = 56". */
  solved: string;
  given: number | null;
}

export interface RoundResult {
  /** Questions answered correctly (first time they came up). */
  correct: number;
  total: number;
  points: number;
  maxPoints: number;
  mistakes: Mistake[];
  /** Each question's first-time result, for spaced review. */
  attempts: { question: Question; firstTry: boolean }[];
}

interface Props {
  topic: Topic;
  questions: Question[];
  settings: Settings;
  mode?: PlayMode;
  onQuit: () => void;
  onFinish: (result: RoundResult) => void;
}

/** judge: a parent decides whether the spoken answer was right. */
type Status = 'answer' | 'retry' | 'listening' | 'judge' | 'correct' | 'reveal';

const PRAISE: Bi[] = [
  { nl: 'Goed zo!', en: 'Well done!' },
  { nl: 'Top!', en: 'Great!' },
  { nl: 'Knap gedaan!', en: 'Nicely done!' },
  { nl: 'Super!', en: 'Super!' },
  { nl: 'Helemaal goed!', en: 'Exactly right!' },
];
const LOOK_AT_HINT: Bi = { nl: 'Kijk eens naar de hint.', en: 'Have a look at the hint.' };
const MAX_DIGITS = 7;

/** A question shown again later in the round after its answer was revealed. */
type Queued = Question & { again?: boolean };

function solvedText(q: Question): string {
  if (q.kind === 'choice') return `${q.text.nl} ${answerLabel(q)}`;
  return q.expr === BOX ? answerLabel(q) : q.expr.replace(BOX, fmtNl(q.answer));
}

export default function Play({ topic, questions, settings, mode = 'practice', onQuit, onFinish }: Props) {
  const test = mode !== 'practice';
  const teacher = teacherById(settings.teacher);
  const sayAuto = mode === 'say' && settings.listen === 'auto' && canListen;
  const [queue, setQueue] = useState<Queued[]>(questions);
  const [index, setIndex] = useState(0);
  const [digits, setDigits] = useState('');
  const [negative, setNegative] = useState(false);
  const [wrongTries, setWrongTries] = useState(0);
  const [wrongChoices, setWrongChoices] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>('answer');
  const [hintOpen, setHintOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [attempts, setAttempts] = useState<RoundResult['attempts']>([]);
  const [given, setGiven] = useState<number | null>(null);
  const [praise, setPraise] = useState(PRAISE[0]);
  const [shake, setShake] = useState(0);
  const [started, setStarted] = useState(!topic.intro);
  const [listenError, setListenError] = useState<ListenError | null>(null);
  const listener = useListener(false);

  const q = queue[index];
  const isChoice = q.kind === 'choice';
  const done = status === 'correct' || status === 'reveal';
  const last = index + 1 >= queue.length;

  /** Record the first try at each original question (not repeats). */
  const record = useCallback(
    (firstTry: boolean) => {
      if (!q.again) setAttempts((a) => [...a, { question: q, firstTry }]);
    },
    [q],
  );

  const markCorrect = useCallback(() => {
    setStatus('correct');
    if (!q.again) {
      setPoints((p) => p + (test ? (wrongTries === 0 ? 1 : 0) : pointsFor(wrongTries, false)));
      if (!test || wrongTries === 0) setCorrect((c) => c + 1);
    }
    if (wrongTries === 0) record(true);
    const p = teacher.praise[Math.floor(Math.random() * teacher.praise.length)];
    setPraise(p);
    if (settings.sounds) chime();
    if (settings.autoRead && settings.voice && !test) speak(p.nl, 'nl');
  }, [q, test, wrongTries, record, settings.sounds, settings.autoRead, settings.voice, teacher]);

  const reveal = useCallback(
    (value: number | null) => {
      setStatus('reveal');
      setShake((n) => n + 1);
      if (!q.again) setMistakes((m) => [...m, { solved: solvedText(q), given: value }]);
      // In practice, a revealed question comes back once at the end of the round.
      if (!test && !q.again) setQueue((list) => [...list, { ...q, again: true }]);
      if (settings.autoRead && settings.voice && q.solution) speak(q.solution.nl, 'nl');
    },
    [q, test, settings.autoRead, settings.voice],
  );

  const wrong = useCallback(
    (value: number | null) => {
      if (wrongTries === 0) record(false);
      if (test) {
        setGiven(value);
        reveal(value);
        return;
      }
      const tries = wrongTries + 1;
      setWrongTries(tries);
      setDigits('');
      setNegative(false);
      setShake((n) => n + 1);
      if (tries >= 3) reveal(value);
      else {
        setStatus('retry');
        if (tries === 2) setHintOpen(true);
        if (settings.autoRead && settings.voice) speak(tries === 2 ? q.hint.nl : teacher.tryAgain.nl, 'nl');
      }
    },
    [wrongTries, record, test, reveal, settings.autoRead, settings.voice, q, teacher],
  );

  const check = useCallback(() => {
    if (done || digits === '' || mode === 'say' || isChoice) return;
    const value = (negative ? -1 : 1) * Number(digits.replace(',', '.'));
    if (Number.isNaN(value)) return;
    if (Math.abs(value - q.answer) < 1e-9) markCorrect();
    else wrong(value);
  }, [done, digits, mode, isChoice, negative, q, markCorrect, wrong]);

  const choose = useCallback(
    (i: number) => {
      if (done || !isChoice || wrongChoices.includes(i)) return;
      if (i === q.answer) markCorrect();
      else {
        setWrongChoices((w) => [...w, i]);
        wrong(null);
      }
    },
    [done, isChoice, wrongChoices, q, markCorrect, wrong],
  );

  const next = useCallback(() => {
    if (!done) return;
    stopSpeaking();
    if (last) {
      const total = questions.length;
      onFinish({ correct, total, points, maxPoints: test ? total : total * 3, mistakes, attempts });
      return;
    }
    setIndex((i) => i + 1);
    setDigits('');
    setNegative(false);
    setWrongTries(0);
    setWrongChoices([]);
    setGiven(null);
    setStatus('answer');
    setHintOpen(false);
    setListenError(null);
  }, [done, last, questions.length, onFinish, correct, points, test, mistakes, attempts]);

  const press = useCallback(
    (key: string) => {
      if (done || mode === 'say' || isChoice) return;
      if (key === 'back') setDigits((d) => d.slice(0, -1));
      else if (key === 'neg') setNegative((n) => !n);
      else if (key === ',') setDigits((d) => (q.decimals && d && !d.includes(',') ? `${d},` : d));
      else setDigits((d) => (d.replace(',', '').length >= MAX_DIGITS ? d : (d === '0' ? '' : d) + key));
    },
    [done, mode, isChoice, q.decimals],
  );

  // Read each question aloud as it appears (spoken test always; practice when auto-read is on).
  useEffect(() => {
    if (!started || !settings.voice) return;
    if (mode === 'say' || (mode === 'practice' && settings.autoRead)) speak(q.speak.nl, 'nl');
  }, [mode, started, settings.voice, settings.autoRead, q]);

  useEffect(() => () => stopSpeaking(), []);

  // Spoken test: when the child stops talking, check the number they said.
  const seenEnd = useRef(listener.endedCount);
  useEffect(() => {
    if (listener.endedCount === seenEnd.current) return;
    seenEnd.current = listener.endedCount;
    if (status !== 'listening') return;
    const nums = heardNumbers(listener.heard);
    if (nums.length === 0) {
      setListenError(listener.error ?? 'no-speech');
      setStatus('answer');
    } else if (nums.includes(q.answer)) markCorrect();
    else wrong(nums[0]);
  }, [listener.endedCount, listener.heard, listener.error, status, q.answer, markCorrect, wrong]);

  const listenForAnswer = () => {
    stopSpeaking();
    setListenError(null);
    listener.start();
    setStatus('listening');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement && e.key === 'Enter') return; // let the button handle it
      if (!started) {
        if (e.key === 'Enter') setStarted(true);
        return;
      }
      if (isChoice && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
      else if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === '-' && topic.allowNegative) press('neg');
      else if (e.key === ',' || e.key === '.') press(',');
      else if (e.key === 'Enter') (done ? next : check)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, check, choose, next, done, isChoice, topic.allowNegative, started]);

  const shown = digits === '' ? '' : `${negative ? '−' : ''}${digits.includes(',') ? digits : fmtNl(Number(digits))}`;
  const boxText = status === 'reveal' || status === 'judge' || (mode === 'say' && done) ? fmtNl(q.answer) : shown || (negative ? '−' : '');
  const [before, after] = q.expr.split(BOX);
  const unitBefore = q.unit === '€' ? '€' : '';
  const unitAfter = q.unit && q.unit !== '€' ? q.unit : '';

  const revealText: Bi = test
    ? given === null
      ? { nl: `Het goede antwoord is ${fmtNl(q.answer)}.`, en: `The right answer is ${fmtEn(q.answer)}.` }
      : {
          nl: `Jij zei ${fmtNl(given)}. Het goede antwoord is ${fmtNl(q.answer)}.`,
          en: `You said ${fmtEn(given)}. The right answer is ${fmtEn(q.answer)}.`,
        }
    : q.solution
      ? { nl: `Zo zit het: ${q.solution.nl} Deze komt straks nog een keer!`, en: `This is how: ${q.solution.en} This one comes back later!` }
      : { nl: `Het antwoord is ${answerLabel(q)}. Deze komt straks nog een keer!`, en: `The answer is ${answerLabel(q)}. This one comes back later!` };

  const feedback: { tone: 'good' | 'soft'; bi: Bi; icon: JSX.Element } | null =
    status === 'correct'
      ? { tone: 'good', bi: praise, icon: <CheckIcon /> }
      : status === 'reveal'
        ? { tone: 'soft', bi: q.again && !test ? { nl: revealText.nl.replace(' Deze komt straks nog een keer!', ''), en: revealText.en.replace(' This one comes back later!', '') } : revealText, icon: <BulbIcon /> }
        : status === 'retry'
          ? { tone: 'soft', bi: wrongTries >= 2 ? LOOK_AT_HINT : teacher.tryAgain, icon: <RetryIcon /> }
          : null;

  if (!started && topic.intro) {
    return (
      <section className="screen">
        <TopBar onBack={onQuit} title={<h1 className="t-title">{topic.name.nl}</h1>} />
        <div className="card story-intro">
          <div className="cast">
            {topic.cast?.map((c) => <Character key={c} who={c} size={110} />)}
          </div>
          {settings.english !== 'hidden' && <p className="en">{topic.name.en}</p>}
          <BiText bi={topic.intro} settings={settings} />
        </div>
        <button className="btn btn-primary btn-wide" onClick={() => setStarted(true)}>
          Start! <NextIcon size={28} />
        </button>
      </section>
    );
  }

  const progressNow = Math.min(index + (done ? 1 : 0), questions.length);

  return (
    <section className="screen play has-ambient">
      <div className="ambient-land">
        <Land theme={landFor(GROEPEN.find((g) => g.topics.some((t) => t.id === topic.id))?.id ?? '4')} />
      </div>
      <TopBar
        onBack={onQuit}
        title={
          <div className="progress-wrap">
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={progressNow} aria-label="Voortgang">
              <div className="progress-fill" style={{ width: `${(progressNow / questions.length) * 100}%` }} />
            </div>
            <span className="t-label">
              {Math.min(index + 1, questions.length)} / {questions.length}
              {index >= questions.length && ' +'}
            </span>
          </div>
        }
        right={
          <span className="star-count" aria-label={test ? `${correct} goed` : `${points} punten`}>
            <span className="star-sun">
              <StarIcon filled />
            </span>
            {test ? correct : points}
          </span>
        }
      />

      <div className="card question-card" key={index}>
        {test && <p className="test-badge t-label">{mode === 'write' ? 'Schrijftoets · written test' : 'Spreektoets · spoken test'}</p>}
        {q.again && <p className="test-badge t-label">Nog een keer! · One more time!</p>}
        <BiText bi={q.text} speakAs={q.speak} settings={settings} />

        {q.beads !== undefined && <Beads count={q.beads} />}
        {q.scene && <SceneView scene={q.scene} />}
        {q.visual && <VisualView v={q.visual} />}

        {!isChoice && (
          <div className="sum" aria-live="polite">
            {before && <span>{before}</span>}
            {unitBefore && <span>{unitBefore}</span>}
            <span
              key={shake}
              className={`answer-box ${status === 'correct' ? 'is-correct' : ''} ${(status === 'retry' && wrongTries > 0) || (status === 'reveal' && test) ? 'is-retry' : ''} ${status === 'reveal' || status === 'judge' ? 'is-reveal' : ''}`}
              aria-label={`Jouw antwoord: ${boxText || 'leeg'}`}
            >
              {boxText}
            </span>
            {unitAfter && <span>{unitAfter}</span>}
            {after && <span>{after}</span>}
          </div>
        )}

        {!test &&
          (hintOpen ? (
            <div className="hint">
              <span className="hint-icon">
                <BulbIcon />
              </span>
              <BiText bi={q.hint} settings={settings} size="body" />
            </div>
          ) : (
            !done && (
              <button className="btn btn-secondary btn-small" onClick={() => setHintOpen(true)}>
                <BulbIcon /> Hint
              </button>
            )
          ))}
      </div>

      {isChoice && (
        <div className="choice-tiles">
          {q.options!.map((o, i) => {
            const right = done && i === q.answer;
            const no = wrongChoices.includes(i);
            return (
              <button
                key={o.nl}
                className={`tile choice-tile ${right ? 'is-right' : ''} ${no ? 'is-wrong' : ''}`}
                onClick={() => choose(i)}
                disabled={done || no}
              >
                <span className="choice-label">
                  {right && <CheckIcon />}
                  {no && <RetryIcon />}
                  {o.nl}
                </span>
                {o.en && settings.english !== 'hidden' && <span className="choice-en">{o.en}</span>}
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div className={`feedback feedback-${feedback.tone}`} key={`${index}-${status}-${wrongTries}`}>
          <span className="feedback-teacher" aria-label={teacher.name.nl}>
            <Character who={teacher.who} size={52} />
          </span>
          <span className={`feedback-icon ${feedback.tone === 'good' ? 'burst' : ''}`}>{feedback.icon}</span>
          <BiText bi={feedback.bi} settings={settings} size="body" />
        </div>
      )}

      {listenError && !done && (
        <div className="feedback feedback-soft">
          <span className="feedback-icon">
            <MicIcon />
          </span>
          <BiText bi={LISTEN_ERROR_TEXT[listenError]} settings={settings} size="body" />
        </div>
      )}

      {mode === 'say' ? (
        done ? null : status === 'listening' ? (
          <div className="listening">
            <span className="mic-pulse">
              <MicIcon size={32} />
            </span>
            <BiText bi={{ nl: 'Zeg het antwoord…', en: 'Say the answer…' }} settings={settings} size="body" />
          </div>
        ) : status === 'judge' ? (
          <div className="btn-pair">
            <button className="btn btn-primary" onClick={markCorrect}>
              <CheckIcon /> Goed gezegd
            </button>
            <button className="btn btn-secondary" onClick={() => wrong(null)}>
              Niet goed
            </button>
          </div>
        ) : sayAuto && !listenError ? (
          <button className="btn btn-primary btn-wide" onClick={listenForAnswer}>
            <MicIcon size={28} /> Zeg het antwoord
          </button>
        ) : (
          <div className="listening">
            <BiText
              bi={{ nl: 'Zeg het antwoord hardop. Ouder: tik dan op "Antwoord zien".', en: 'Say the answer out loud. Parent: then tap "Show answer".' }}
              settings={settings}
              size="body"
            />
            <button className="btn btn-primary" onClick={() => setStatus('judge')}>
              Antwoord zien
            </button>
          </div>
        )
      ) : (
        !isChoice && <NumberPad onKey={press} disabled={done} allowNegative={topic.allowNegative} negative={negative} decimals={q.decimals} />
      )}

      {done ? (
        <button className="btn btn-primary btn-wide" onClick={next}>
          {last ? 'Klaar!' : 'Volgende'} <NextIcon size={28} />
        </button>
      ) : (
        mode !== 'say' &&
        !isChoice && (
          <button className="btn btn-primary btn-wide" onClick={check} disabled={digits === ''}>
            Check! <CheckIcon size={28} />
          </button>
        )
      )}
    </section>
  );
}
