import { useCallback, useEffect, useState } from 'react';
import { BOX } from './core';
import { BackIcon, CheckIcon, NextIcon, RetryIcon } from './Icons';
import { LESSONS, type Lesson, type Slide } from './lessonData';
import { Character, ItemPic, SceneView } from './pictures';
import { chime } from './speech';
import type { Settings } from './storage';
import { BiText, NumberPad, TopBar, useTypedKeys } from './ui';

export function LessonList({ settings, onBack, onOpen }: { settings: Settings; onBack: () => void; onOpen: (l: Lesson) => void }) {
  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Lessen</h1>
            {settings.english !== 'hidden' && <p className="en">Lessons · leer het stap voor stap / learn it step by step</p>}
          </>
        }
      />
      <div className="lesson-grid">
        {LESSONS.map((l) => (
          <button key={l.id} className="tile lesson-tile" onClick={() => onOpen(l)}>
            <span className="lesson-pic">
              <ItemPic item={l.icon} size={48} />
            </span>
            <span className="t-title">{l.name.nl}</span>
            {settings.english !== 'hidden' && <span className="en">{l.name.en}</span>}
            <span className="t-label muted">{l.slides.length} stapjes · steps</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** A sum with an answer box: the answer and explanation appear only after the child answers. */
function AskSum({ slide, settings, onAnswered }: { slide: Slide; settings: Settings; onAnswered: () => void }) {
  const [digits, setDigits] = useState('');
  const [wrong, setWrong] = useState(0);
  const [state, setState] = useState<'ask' | 'right' | 'shown'>('ask');
  const [before, after] = (slide.expr ?? '').split(BOX);
  const done = state !== 'ask';

  const press = useCallback(
    (k: string) => {
      if (done) return;
      if (k === 'back') setDigits((d) => d.slice(0, -1));
      else if (/^\d$/.test(k)) setDigits((d) => (d.length >= 4 ? d : (d === '0' ? '' : d) + k));
    },
    [done],
  );

  const check = useCallback(() => {
    if (done || digits === '') return;
    if (Number(digits) === slide.ask) {
      setState('right');
      if (settings.sounds) chime();
      onAnswered();
      return;
    }
    const w = wrong + 1;
    setWrong(w);
    setDigits('');
    if (w >= 2) {
      setState('shown');
      onAnswered();
    }
  }, [done, digits, slide.ask, wrong, settings.sounds, onAnswered]);

  useTypedKeys(press, check, !done);

  return (
    <>
      <p className="lesson-expr" aria-live="polite">
        {before}
        <span
          key={wrong}
          className={`answer-box ${state === 'right' ? 'is-correct' : ''} ${state === 'shown' ? 'is-reveal' : ''} ${state === 'ask' && wrong > 0 ? 'is-retry' : ''}`}
        >
          {done ? slide.ask : digits}
        </span>
        {after}
      </p>

      {state === 'ask' && wrong > 0 && (
        <div className="feedback feedback-soft">
          <span className="feedback-icon">
            <RetryIcon />
          </span>
          <BiText bi={{ nl: 'Bijna! Probeer nog eens.', en: 'Almost! Try again.' }} settings={settings} size="body" />
        </div>
      )}

      {done && slide.reveal && (
        <div className={`feedback ${state === 'right' ? 'feedback-good' : 'feedback-soft'}`}>
          <span className={`feedback-icon ${state === 'right' ? 'burst' : ''}`}>{state === 'right' ? <CheckIcon /> : <RetryIcon />}</span>
          <BiText bi={slide.reveal} settings={settings} size="body" />
        </div>
      )}

      {!done && (
        <>
          <NumberPad onKey={press} />
          <button className="btn btn-primary btn-wide" onClick={check} disabled={digits === ''}>
            Check! <CheckIcon size={28} />
          </button>
        </>
      )}
    </>
  );
}

interface PlayerProps {
  lesson: Lesson;
  settings: Settings;
  onBack: () => void;
  onQuiz: () => void;
  onTrainer: () => void;
}

export function LessonPlayer({ lesson, settings, onBack, onQuiz, onTrainer }: PlayerProps) {
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState<Set<number>>(() => new Set());
  const last = lesson.slides.length; // one extra "Nu jij!" step at the end
  const slide = lesson.slides[step];
  const waiting = step < last && slide.ask !== undefined && !answered.has(step);
  const markAnswered = useCallback(() => setAnswered((a) => new Set(a).add(step)), [step]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  return (
    <section className="screen">
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
        <div className="card lesson-card" key={step}>
          {slide.cast && (
            <div className="cast">
              {slide.cast.map((c) => (
                <Character key={c} who={c} size={92} />
              ))}
            </div>
          )}
          {slide.scene && <SceneView scene={slide.scene} big />}
          <BiText bi={slide.text} settings={settings} />
          {slide.expr &&
            (slide.ask !== undefined ? (
              <AskSum slide={slide} settings={settings} onAnswered={markAnswered} />
            ) : (
              <p className="lesson-expr">{slide.expr}</p>
            ))}
          {slide.trainer && (
            <button className="btn btn-accent btn-wide" onClick={onTrainer}>
              Naar de tafeltrainer <NextIcon size={28} />
            </button>
          )}
        </div>
      ) : (
        <div className="celebrate">
          <div className="cast">
            <Character who="noor" size={84} />
            <Character who="pip" size={84} />
          </div>
          <h2 className="t-display">Nu jij!</h2>
          {settings.english !== 'hidden' && <p className="en">Your turn!</p>}
          <div className="card">
            <BiText
              bi={{
                nl: 'Goed geleerd! Probeer nu 5 verhaaltjessommen met plaatjes.',
                en: 'Well learned! Now try 5 story sums with pictures.',
              }}
              settings={settings}
            />
          </div>
        </div>
      )}

      <div className="lesson-nav">
        <button className="btn btn-secondary" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>
          <BackIcon /> {step === 0 ? 'Lessen' : 'Vorige'}
        </button>
        {step < last ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={waiting}>
            Volgende <NextIcon size={28} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onQuiz}>
            Start! <NextIcon size={28} />
          </button>
        )}
      </div>
    </section>
  );
}
