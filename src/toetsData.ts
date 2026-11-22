// Toets (assessment): four tiers per groep — Beginner, Gemiddeld, Gevorderd, Pro.
// Each test mixes every world of the groep at the tier's levels; one try per
// question, no hints. Pass with 80% to open the next tier.
import type { Bi, Groep, LevelNo, Question, Rng, Topic } from './core';

export type TierId = 'beginner' | 'medium' | 'advanced' | 'pro';

export interface Tier {
  id: TierId;
  name: Bi;
  /** Levels the questions come from. */
  levels: LevelNo[];
  count: number;
  note: Bi;
}

export const TIERS: Tier[] = [
  { id: 'beginner', name: { nl: 'Beginner', en: 'Beginner' }, levels: [1, 2], count: 12, note: { nl: 'De basis van elke wereld.', en: 'The basics of every world.' } },
  { id: 'medium', name: { nl: 'Gemiddeld', en: 'Medium' }, levels: [2, 3], count: 15, note: { nl: 'Iets lastiger, alle werelden door elkaar.', en: 'A bit harder, all worlds mixed.' } },
  { id: 'advanced', name: { nl: 'Gevorderd', en: 'Advanced' }, levels: [3, 4], count: 18, note: { nl: 'Grotere getallen en ontbrekende getallen.', en: 'Bigger numbers and missing numbers.' } },
  { id: 'pro', name: { nl: 'Pro', en: 'Pro' }, levels: [4, 5], count: 20, note: { nl: 'De moeilijkste sommen: voor kampioenen.', en: 'The hardest sums: for champions.' } },
];

export const PASS_PCT = 80;

export const tierById = (id: TierId): Tier => TIERS.find((t) => t.id === id)!;

/** Storage id for a groep's tier (best % is kept like other test scores). */
export const toetsId = (groepId: string, tier: TierId) => `toets-${groepId}-${tier}`;

/** Stars for a test score: pass (80%) = 1, 90% = 2, 100% = 3. */
export function toetsStars(pct: number): 0 | 1 | 2 | 3 {
  return pct >= 100 ? 3 : pct >= 90 ? 2 : pct >= PASS_PCT ? 1 : 0;
}

/** A tier is open when it is the first, or the tier before it was passed. */
export function tierOpen(tier: TierId, best: (t: TierId) => number | undefined): boolean {
  const i = TIERS.findIndex((t) => t.id === tier);
  return i === 0 || (best(TIERS[i - 1].id) ?? 0) >= PASS_PCT;
}

/**
 * Build a test: every world of the groep in turn (so all are covered), each
 * question from one of the tier's levels, then shuffled. Questions that look
 * the same are skipped.
 */
export function buildToets(groep: Groep, tier: Tier, rng: Rng = Math.random): Question[] {
  const topics = groep.topics;
  const seen = new Set<string>();
  const out: Question[] = [];
  let guard = 0;
  while (out.length < tier.count && guard++ < tier.count * 40) {
    const t: Topic = topics[out.length % topics.length];
    const level = tier.levels[Math.floor(rng() * tier.levels.length)];
    const q = t.make(level, rng);
    const key = `${q.text.nl}|${q.expr}|${q.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...q, skillKey: q.skillKey ?? `${t.id}:${q.expr}` });
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
