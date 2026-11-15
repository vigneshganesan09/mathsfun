// Scoring from the spec (§5.3): 3 points for the 1st try, 2 for the 2nd,
// 1 after the hint, 0 when the answer had to be shown. Stars per level out of
// 30 points: ≥ 26 three stars, ≥ 20 two, ≥ 14 one. One star unlocks the next level.

export type StarCount = 0 | 1 | 2 | 3;

/** Points for a question answered after `wrongTries` mistakes (revealed = 0). */
export function pointsFor(wrongTries: number, revealed: boolean): number {
  if (revealed) return 0;
  return [3, 2, 1][wrongTries] ?? 0;
}

/** Stars for a round, scaled so a round of any length uses the 26/20/14 out of 30 rule. */
export function starsFor(points: number, maxPoints: number): StarCount {
  if (maxPoints <= 0) return 0;
  const p = (points / maxPoints) * 30;
  return p >= 26 ? 3 : p >= 20 ? 2 : p >= 14 ? 1 : 0;
}

export const UNLOCK_STARS = 1;
