import { DOMAIN_NAME, LEVELS, type Groep, type LevelNo, type Topic } from './core';
import { LockIcon, ParentIcon, PinIcon, StarIcon } from './Icons';
import { ItemPic } from './pictures';
import { UNLOCK_STARS } from './scoring';
import { getLevelStars, type Settings } from './storage';
import { TopBar } from './ui';
import { Beast, BolleSays, Land, landFor, landName } from './Art';
import { GROEPEN } from './curriculum';

/** Each world has its own Telbeestje; the index is the topic's place in the whole curriculum. */
export function beastIndex(topicId: string): number {
  const all = GROEPEN.flatMap((g) => g.topics.map((t) => t.id));
  const i = all.indexOf(topicId);
  return i < 0 ? 0 : i;
}

/** A world's creature is found once any level has a star. */
export const worldFound = (t: Topic) => LEVELS.some((l) => (getLevelStars(t.id, l) ?? 0) > 0);

/** Stars earned in a groep, and the most there are. */
export function groepStars(groep: Groep): { got: number; max: number } {
  let got = 0;
  for (const t of groep.topics) for (const l of LEVELS) got += getLevelStars(t.id, l) ?? 0;
  return { got, max: groep.topics.length * LEVELS.length * 3 };
}

export function LandBanner({ groep, settings, guide }: { groep: Groep; settings: Settings; guide?: { nl: string; en: string } }) {
  const theme = landFor(groep.id);
  const name = landName(theme);
  const { got, max } = groepStars(groep);
  const en = settings.english !== 'hidden';
  return (
    <div className="land-banner">
      <Land theme={theme} />
      <div className="land-copy">
        <span className="t-label">{groep.name.nl}</span>
        <h2 className="t-title">{name.nl}</h2>
        {en && <span className="en">{name.en}</span>}
        <div className="land-bar" aria-hidden="true">
          <span style={{ width: `${max ? (got / max) * 100 : 0}%` }} />
        </div>
        <span className="t-label muted">
          {got} van {max} sterren{en ? ` · ${got} of ${max} stars` : ''}
        </span>
      </div>
      {guide && (
        <div className="land-guide">
          <BolleSays mood="wave" size={92} text={guide} />
        </div>
      )}
    </div>
  );
}

interface Props {
  groep: Groep;
  settings: Settings;
  onBack: () => void;
  onParents: () => void;
  onPlay: (t: Topic, level: LevelNo) => void;
}

function LevelStars({ count }: { count: number }) {
  return (
    <span className="level-stars" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? 'star-sun' : 'star-dim'}>
          <StarIcon filled={i < count} size={20} />
        </span>
      ))}
    </span>
  );
}

export default function WorldMap({ groep, settings, onBack, onParents, onPlay }: Props) {
  const story = groep.id === 'verhalen';
  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">{groep.name.nl}</h1>
            {settings.english !== 'hidden' && (
              <p className="en">
                {groep.name.en} · kies een {story ? 'verhaal' : 'wereld'} / pick a {story ? 'story' : 'world'}
              </p>
            )}
          </>
        }
        right={
          <button className="round-btn" onClick={onParents} aria-label="Voor ouders / For parents">
            <ParentIcon />
          </button>
        }
      />

      {!story && <LandBanner groep={groep} settings={settings} guide={{ nl: 'Kies een wereld en vind het Telbeestje!', en: 'Pick a world and find its counting creature!' }} />}

      <div className="worlds">
        {groep.topics.map((t) => {
          const domain = t.domain ?? 'getallen';
          return (
            <article key={t.id} className={`card world d-${domain}`}>
              {!story && (
                <div className="wscene">
                  <Land theme={landFor(groep.id)} />
                  <Beast index={beastIndex(t.id)} size={78} locked={!worldFound(t)} />
                </div>
              )}
              <header className="world-head">
                <span className={t.icon ? 'pin pin-pic' : 'pin'}>{t.icon ? <ItemPic item={t.icon} size={40} /> : <PinIcon />}</span>
                <div>
                  <h2 className="t-title">{t.name.nl}</h2>
                  {settings.english !== 'hidden' && <p className="en">{t.name.en}</p>}
                  {!story && <span className="domain-chip t-label">{DOMAIN_NAME[domain].nl}</span>}
                </div>
              </header>
              <div className="levels">
                {LEVELS.map((level) => {
                  const stars = getLevelStars(t.id, level);
                  const prev = level > 1 ? getLevelStars(t.id, (level - 1) as LevelNo) : UNLOCK_STARS;
                  const locked = (prev ?? 0) < UNLOCK_STARS;
                  return (
                    <button
                      key={level}
                      className={`tile level-tile ${locked ? 'is-locked' : ''}`}
                      disabled={locked}
                      onClick={() => onPlay(t, level)}
                      aria-label={locked ? `Level ${level}, op slot: haal eerst 1 ster` : `Level ${level}, ${stars ?? 0} van 3 sterren`}
                    >
                      <span className="t-label">Level {level}</span>
                      {locked ? (
                        <>
                          <LockIcon />
                          <span className="lock-note">1 ster nodig</span>
                        </>
                      ) : (
                        <LevelStars count={stars ?? 0} />
                      )}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
