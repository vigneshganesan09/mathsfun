import { describe, expect, it } from 'vitest';
import type { Question } from './core';
import { buildRound, dueSkills, EMPTY_STATS, newStickers, streak, updateSkill } from './review';

const q = (n: number): Question => ({
  text: { nl: 'Reken uit.', en: 'Work it out.' },
  expr: `${n} × 7 = □`,
  speak: { nl: '', en: '' },
  answer: n * 7,
  hint: { nl: '', en: '' },
  skillKey: `${n}x7`,
});

describe('Leitner review', () => {
  it('moves up a box when right first time, back to box 1 otherwise', () => {
    const a = updateSkill(undefined, q(3), 't', true, '2026-11-15');
    expect([a.box, a.due]).toEqual([2, '2026-11-16']);
    const b = updateSkill(a, q(3), 't', true, '2026-11-16');
    expect([b.box, b.due]).toEqual([3, '2026-11-19']);
    const c = updateSkill(b, q(3), 't', false, '2026-11-19');
    expect([c.box, c.due]).toEqual([1, '2026-11-19']);
  });

  it('lists due skills, weakest first, never mastered ones', () => {
    const stats = [
      { ...updateSkill(undefined, q(1), 't', false, '2026-11-10'), box: 2 as const },
      updateSkill(undefined, q(2), 't', false, '2026-11-15'),
      { ...updateSkill(undefined, q(4), 't', true, '2026-11-01'), box: 5 as const, due: '2026-11-01' },
      updateSkill(undefined, q(5), 'other', false, '2026-11-15'),
    ];
    expect(dueSkills(stats, '2026-11-15', 't').map((s) => s.key)).toEqual(['2x7', '1x7']);
  });

  it('builds a round of 7 new and 3 review questions without doubles', () => {
    const fresh = Array.from({ length: 10 }, (_, i) => q(i + 1));
    const due = [q(2), q(11), q(12), q(13)].map((x) => updateSkill(undefined, x, 't', false, '2026-11-15'));
    const round = buildRound(fresh, due, Math.random);
    expect(round).toHaveLength(10);
    expect(new Set(round.map((x) => x.skillKey)).size).toBe(10);
    expect(round.filter((x) => ['2x7', '11x7', '12x7'].includes(x.skillKey!))).toHaveLength(3);
  });
});

describe('streaks', () => {
  it('counts days in a row, starting yesterday if today is not done yet', () => {
    expect(streak(['2026-11-13', '2026-11-14', '2026-11-15'], '2026-11-15')).toBe(3);
    expect(streak(['2026-11-13', '2026-11-14'], '2026-11-15')).toBe(2);
    expect(streak([], '2026-11-15')).toBe(0);
  });

  it('forgives one missed day', () => {
    expect(streak(['2026-11-11', '2026-11-12', '2026-11-14', '2026-11-15'], '2026-11-15')).toBe(4);
    expect(streak(['2026-11-10', '2026-11-12', '2026-11-14', '2026-11-15'], '2026-11-15')).toBe(3);
  });
});

describe('stickers', () => {
  it('reports newly earned stickers once', () => {
    const after = { ...EMPTY_STATS, starredLevels: 1, correctTotal: 120 };
    expect(newStickers(EMPTY_STATS, after, '2026-11-15').map((s) => s.id)).toEqual(['eerste-ster', 'honderd']);
    expect(newStickers(after, after, '2026-11-15')).toEqual([]);
  });
});
