import type { Bi, LevelNo, Topic } from './core';
import { NextIcon, RetryIcon, StarIcon } from './Icons';
import { Character, ItemPic } from './pictures';
import type { RoundResult } from './Play';
import type { Sticker } from './review';
import type { StarCount } from './scoring';
import type { Settings } from './storage';
import { BiText } from './ui';
import { Beast, Bolle } from './Art';
import { BEAST_NAMES } from './drawings';

interface Props {
  topic: Topic;
  result: RoundResult;
  /** A level on a map: 0–3 stars from points. Otherwise (tests, quizzes) a row of right answers. */
  level?: LevelNo;
  levelStars?: StarCount;
  newBest: boolean;
  stickers: Sticker[];
  beast?: number;
  settings: Settings;
  /** Next level is unlocked (at least 1 star). */
  canNext: boolean;
  onNext: () => void;
  onAgain: () => void;
  onBack: () => void;
  backLabel: string;
  /** Shown under the label, e.g. "Schrijftoets". */
  subtitle?: string;
}

const HEAD: Record<StarCount, Bi> = {
  3: { nl: 'Fantastisch!', en: 'Fantastic!' },
  2: { nl: 'Goed gedaan!', en: 'Well done!' },
  1: { nl: 'Je hebt het gehaald!', en: 'You passed!' },
  0: { nl: 'Goed geoefend!', en: 'Good practice!' },
};

export default function Finish({ topic, result, level, levelStars, newBest, stickers, beast, settings, canNext, onNext, onAgain, onBack, backLabel, subtitle }: Props) {
  const isLevel = level !== undefined && levelStars !== undefined;
  const ratio = result.correct / Math.max(1, result.total);
  const head = isLevel ? HEAD[levelStars] : HEAD[ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.5 ? 1 : 0];
  const hasNext = isLevel && level < 3 && canNext;
  const en = settings.english !== 'hidden';

  return (
    <section className="screen">
      <div className="celebrate">
        <p className="t-label">
          {topic.name.nl}
          {level !== undefined && ` · Level ${level}`}
          {subtitle && ` · ${subtitle}`}
        </p>

        {isLevel ? (
          <div className="res-top">
          <Bolle mood={levelStars > 0 ? 'cheer' : 'happy'} size={110} />
          <div className="big-stars" aria-label={`${levelStars} van 3 sterren`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < levelStars ? 'star-on' : 'star-off'} style={{ animationDelay: `${i * 200}ms` }}>
                <StarIcon filled={i < levelStars} size={72} />
              </span>
            ))}
          </div>
          </div>
        ) : (
          <div className="star-row" aria-hidden="true">
            {Array.from({ length: result.total }, (_, i) => (
              <span key={i} className={i < result.correct ? 'star-on' : 'star-off'} style={{ animationDelay: `${i * 60}ms` }}>
                <StarIcon filled={i < result.correct} size={30} />
              </span>
            ))}
          </div>
        )}

        <h1 className="t-display">{head.nl}</h1>
        {en && <p className="en">{head.en}</p>}

        {beast !== undefined && (
          <div className="unlock-card">
            <Beast index={beast} size={90} />
            <div>
              <p className="t-title">Je vond {BEAST_NAMES[beast % BEAST_NAMES.length]}!</p>
              {en && <p className="en">You found a counting creature! Tel zijn stippen · count its spots.</p>}
            </div>
          </div>
        )}

        <div className="card">
          <BiText
            bi={
              isLevel
                ? {
                    nl: `${result.points} van de ${result.maxPoints} punten. ${levelStars === 0 ? 'Probeer het nog een keer, je wordt steeds beter!' : `Je hebt ${levelStars} ${levelStars === 1 ? 'ster' : 'sterren'} verdiend!`}`,
                    en: `${result.points} of ${result.maxPoints} points. ${levelStars === 0 ? 'Try again, you are getting better every time!' : `You earned ${levelStars} ${levelStars === 1 ? 'star' : 'stars'}!`}`,
                  }
                : {
                    nl: `Je had er ${result.correct} van de ${result.total} goed!`,
                    en: `You got ${result.correct} of ${result.total} right!`,
                  }
            }
            settings={settings}
          />
          {newBest && <p className="chip-sun">Nieuw record! · New best!</p>}

          {stickers.length > 0 && (
            <div className="new-stickers">
              <h2 className="t-label">Nieuwe sticker! · New sticker!</h2>
              <div className="sticker-row">
                {stickers.map((s) => (
                  <div key={s.id} className="sticker is-earned">
                    <span className="sticker-art">{s.art.cast ? <Character who={s.art.cast} size={48} /> : s.art.item ? <ItemPic item={s.art.item} size={44} /> : null}</span>
                    <span className="t-label">{s.name.nl}</span>
                    {en && <span className="sticker-en">{s.name.en}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.mistakes.length > 0 && (
            <>
              <h2 className="t-label">Deze nog even oefenen · Practise these</h2>
              <ul className="mistakes">
                {result.mistakes.map((m) => (
                  <li key={m.solved}>
                    <strong>{m.solved}</strong>
                    {m.given !== null && <span className="muted"> (jij: {m.given})</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="finish-actions">
        {hasNext ? (
          <button className="btn btn-primary btn-wide" onClick={onNext}>
            Volgende level <NextIcon size={28} />
          </button>
        ) : (
          <button className="btn btn-primary btn-wide" onClick={onBack}>
            {backLabel} <NextIcon size={28} />
          </button>
        )}
        <div className="btn-pair">
          <button className="btn btn-secondary" onClick={onAgain}>
            <RetryIcon /> Nog een keer
          </button>
          {hasNext && (
            <button className="btn btn-secondary" onClick={onBack}>
              {backLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
