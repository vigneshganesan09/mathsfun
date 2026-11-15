import { describe, expect, it } from 'vitest';
import { pointsFor, starsFor } from './scoring';

describe('scoring (spec §5.3)', () => {
  it('gives 3, 2, 1, 0 points', () => {
    expect([pointsFor(0, false), pointsFor(1, false), pointsFor(2, false), pointsFor(2, true)]).toEqual([3, 2, 1, 0]);
  });

  it('turns 30-point rounds into stars', () => {
    expect([30, 26, 25, 20, 19, 14, 13, 0].map((p) => starsFor(p, 30))).toEqual([3, 3, 2, 2, 1, 1, 0, 0]);
  });

  it('scales for shorter rounds', () => {
    expect(starsFor(15, 15)).toBe(3);
    expect(starsFor(7, 15)).toBe(1);
  });
});
