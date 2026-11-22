import { describe, expect, it } from 'vitest';
import { BOX, GROEPEN } from './curriculum';
import { buildToets, PASS_PCT, tierOpen, TIERS, toetsStars, type TierId } from './toetsData';

describe('toets', () => {
  it('builds a full test for every groep and tier, covering every world', () => {
    for (const g of GROEPEN) {
      for (const tier of TIERS) {
        const qs = buildToets(g, tier);
        expect(qs).toHaveLength(tier.count);
        for (const q of qs) {
          expect(q.text.nl.length).toBeGreaterThan(0);
          expect(q.kind === 'choice' || q.expr.includes(BOX) || q.expr === '').toBe(true);
        }
        expect(new Set(qs.map((q) => `${q.text.nl}|${q.expr}|${q.answer}`)).size).toBe(qs.length);
      }
    }
  });

  it('opens tiers in order after a pass', () => {
    const best: Partial<Record<TierId, number>> = { beginner: 85 };
    const get = (t: TierId) => best[t];
    expect(tierOpen('beginner', get)).toBe(true);
    expect(tierOpen('medium', get)).toBe(true);
    expect(tierOpen('advanced', get)).toBe(false);
    best.medium = PASS_PCT - 1;
    expect(tierOpen('advanced', get)).toBe(false);
  });

  it('gives stars from the pass mark up', () => {
    expect([79, 80, 90, 100].map(toetsStars)).toEqual([0, 1, 2, 3]);
  });
});
