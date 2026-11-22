import { useState } from 'react';
import { GROEPEN, type Groep } from './curriculum';
import { CheckIcon, LockIcon, NextIcon, RetryIcon, StarIcon } from './Icons';
import { Bolle } from './Art';
import { getStars, type Settings } from './storage';
import { PASS_PCT, tierOpen, TIERS, toetsId, toetsStars, type Tier, type TierId } from './toetsData';
import { TopBar } from './ui';

interface Props {
  settings: Settings;
  /** The child's groep id; the test starts there. */
  groepId: string;
  onBack: () => void;
  onStart: (groep: Groep, tier: Tier) => void;
}

const best = (groepId: string) => (t: TierId) => getStars(toetsId(groepId, t), 1);

/** Assessment hub: Beginner → Gemiddeld → Gevorderd → Pro, opened one after the other. */
export default function Toets({ settings, groepId, onBack, onStart }: Props) {
  const [gid, setGid] = useState(groepId);
  const groep = GROEPEN.find((g) => g.id === gid) ?? GROEPEN[0];
  const en = settings.english !== 'hidden';
  const bestOf = best(groep.id);

  return (
    <section className="screen toets">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Toets</h1>
            {en && <p className="en">Test · laat zien wat je kunt / show what you can do</p>}
          </>
        }
        right={<Bolle mood="think" size={72} />}
      />

      <div className="card">
        <h2 className="t-label">Groep · Group</h2>
        <div className="chips">
          {GROEPEN.map((g) => (
            <button key={g.id} className={`chip ${g.id === gid ? 'is-on' : ''}`} aria-pressed={g.id === gid} onClick={() => setGid(g.id)}>
              {g.name.nl}
            </button>
          ))}
        </div>
        <p className="en">
          Eén poging per vraag, geen hints. Haal {PASS_PCT}% om het volgende niveau te openen. · One try per question, no hints. Score {PASS_PCT}% to open the next
          level.
        </p>
      </div>

      <div className="toets-tiers">
        {TIERS.map((tier, i) => {
          const open = tierOpen(tier.id, bestOf);
          const score = bestOf(tier.id);
          const passed = (score ?? 0) >= PASS_PCT;
          const stars = toetsStars(score ?? 0);
          return (
            <article key={tier.id} className={`card toets-tier tier-${tier.id} ${open ? '' : 'is-locked'} ${passed ? 'is-passed' : ''}`}>
              <div className="toets-tier-head">
                <span className="toets-step" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h2 className="t-title">{tier.name.nl}</h2>
                  {en && tier.name.en !== tier.name.nl && <p className="en">{tier.name.en}</p>}
                </div>
                {passed && (
                  <span className="closed-badge t-label">
                    <CheckIcon size={18} /> Geslaagd · Passed
                  </span>
                )}
              </div>
              <p className="toets-note">
                {tier.note.nl}
                {en && <span className="en"> {tier.note.en}</span>}
              </p>
              <p className="t-label muted">
                {tier.count} vragen · level {tier.levels.join('–')} · {groep.topics.length} werelden
              </p>
              {score !== undefined && (
                <p className="toets-best t-label">
                  <span className="mini-stars" aria-label={`${stars} van 3 sterren`}>
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={k < stars ? 'star-sun' : 'star-dim'}>
                        <StarIcon filled={k < stars} size={20} />
                      </span>
                    ))}
                  </span>
                  Beste score · best: {score}%
                </p>
              )}
              {open ? (
                <button className={`btn ${passed ? 'btn-secondary' : 'btn-primary'}`} onClick={() => onStart(groep, tier)}>
                  {passed ? (
                    <>
                      <RetryIcon /> Opnieuw · Retake
                    </>
                  ) : (
                    <>
                      Start de toets <NextIcon size={26} />
                    </>
                  )}
                </button>
              ) : (
                <p className="toets-lock t-label">
                  <LockIcon /> Haal eerst {PASS_PCT}% bij {TIERS[i - 1].name.nl} · Pass {TIERS[i - 1].name.en} first
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
