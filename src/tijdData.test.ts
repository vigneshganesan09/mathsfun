import { describe, expect, it } from 'vitest';
import { BOX, fmtNl, LEVELS, type LevelNo, type Question, type Topic } from './core';
import { starsFor } from './scoring';
import { sayTime } from './topicsMore';
import {
  addMinutes,
  angleToMinutes,
  checkClock,
  dragTo,
  fromTotal,
  hourHandAngle,
  makeZetTargets,
  minuteHandAngle,
  pointToAngle,
  TIJD_LESSONS,
  TIJD_TOPICS,
  tijdDigitaal,
  tijdRekenen,
  toTotal,
  zetMinutes,
  zetPoints,
  zetStart,
  zetStep,
  ZET_ROUND,
} from './tijdData';

function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLES = 300;
const sample = (t: Topic, level: LevelNo): Question[] => {
  const rng = seeded(level * 101 + t.id.length);
  return Array.from({ length: SAMPLES }, () => t.make(level, rng));
};

/** Numbers that stand on their own (not part of a clock time like 14:30, or its spoken form "14 uur 30"). */
function looseNumbers(s: string): string[] {
  return s.replace(/\d{1,2}:\d{2}/g, ' ').replace(/\d{1,2} uur \d{1,2}/g, ' ').match(/\d+(?:[.,]\d+)*/g) ?? [];
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The label appears in the text as a whole word/time (not inside "19:30" when the label is "9:30"). */
const mentions = (text: string, label: string) => new RegExp(`(^|[^\\p{L}\\d:'])${escape(label)}($|[^\\p{L}\\d:])`, 'iu').test(text);

describe.each([tijdDigitaal, tijdRekenen])('$id', (t) => {
  it.each(LEVELS)('level %s: 300 valid questions without leaked answers', (level) => {
    for (const q of sample(t, level)) {
      const label = `${t.id} L${level}: ${q.text.nl}`;
      for (const b of [q.text, q.speak, q.hint]) {
        expect(b.nl.length, label).toBeGreaterThan(0);
        expect(b.en.length, label).toBeGreaterThan(0);
      }
      const visible = [q.text.nl, q.text.en, q.speak.nl, q.speak.en, q.hint.nl, q.hint.en];
      if (q.kind === 'choice') {
        expect(q.expr).toBe('');
        const opts = q.options!;
        expect(opts.length, label).toBeGreaterThanOrEqual(3);
        expect(opts.length, label).toBeLessThanOrEqual(4);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(opts.length);
        expect(new Set(opts.map((o) => o.nl)).size, label).toBe(opts.length);
        for (const o of opts) expect(o.en, label).toBeTruthy();
        const right = opts[q.answer].nl;
        for (const v of visible) expect(mentions(v, right), `${label} leaks "${right}" in "${v}"`).toBe(false);
      } else {
        expect(q.kind).toBe('numpad');
        expect(q.expr.split(BOX).length, label).toBe(2);
        expect(Number.isInteger(q.answer), label).toBe(true);
        expect(q.answer, label).toBeGreaterThan(0);
        expect(q.unit, label).toBeTruthy();
        const ans = fmtNl(q.answer);
        for (const v of [...visible, q.expr]) expect(looseNumbers(v), `${label} leaks ${ans} in "${v}"`).not.toContain(ans);
      }
    }
  });

  it('levels 4 and 5 ask things level 3 never asks', () => {
    const key = (q: Question) => `${q.text.nl}|${q.expr}|${q.answer}`;
    const three = new Set(sample(t, 3).map(key));
    for (const level of [4, 5] as const) expect(sample(t, level).filter((q) => !three.has(key(q))).length).toBeGreaterThan(SAMPLES / 3);
  });
});

describe('time facts are right', () => {
  it('24-hour → clock words matches sayTime', () => {
    for (const q of sample(tijdDigitaal, 3)) {
      const m = q.text.nl.match(/Hoe laat is (\d+):(\d+) op de wijzerklok/);
      if (!m) continue;
      expect(q.options![q.answer].nl).toBe(sayTime(Number(m[1]) - 12, Number(m[2])).nl);
    }
  });

  it('durations are computed in real minutes', () => {
    for (const level of LEVELS)
      for (const q of sample(tijdRekenen, level)) {
        const m = q.text.nl.match(/van (\d+):(\d+) tot (\d+):(\d+)/);
        if (!m) continue;
        const d = Number(m[3]) * 60 + Number(m[4]) - (Number(m[1]) * 60 + Number(m[2]));
        expect(q.unit === 'uur' ? q.answer * 60 : q.answer).toBe(d);
      }
  });

  it('exports every practice topic', () => {
    expect(TIJD_TOPICS.map((t) => t.id)).toEqual(['klok-hele-halve', 'klok-kwartier', 'klok-minuten', 'tijd-digitaal', 'tijd-rekenen']);
    expect(new Set(TIJD_TOPICS.map((t) => t.id)).size).toBe(TIJD_TOPICS.length);
  });
});

describe('lessons', () => {
  it('have bilingual slides and well-formed questions that do not give the answer away', () => {
    expect(TIJD_LESSONS.map((l) => l.id)).toEqual(['wijzers', 'half', 'kwart', 'vijf', 'digitaal', 'kalender']);
    for (const l of TIJD_LESSONS) {
      expect(l.slides.some((s) => s.ask)).toBe(true);
      for (const s of l.slides) {
        expect(s.text.nl && s.text.en).toBeTruthy();
        if (!s.ask) continue;
        const { options, answer, text } = s.ask;
        expect(answer).toBeGreaterThanOrEqual(0);
        expect(answer).toBeLessThan(options.length);
        expect(new Set(options.map((o) => o.nl)).size).toBe(options.length);
        expect(mentions(text.nl, options[answer].nl)).toBe(false);
        expect(mentions(s.text.nl, options[answer].nl)).toBe(false);
      }
    }
  });
});

describe('zet de klok helpers', () => {
  it('turns a pointer position into an angle (0 = up, clockwise)', () => {
    expect(pointToAngle(0, -10)).toBeCloseTo(0);
    expect(pointToAngle(10, 0)).toBeCloseTo(90);
    expect(pointToAngle(0, 10)).toBeCloseTo(180);
    expect(pointToAngle(-10, 0)).toBeCloseTo(270);
  });

  it('snaps angles to 5 minutes, or to 1 minute', () => {
    expect(angleToMinutes(0)).toBe(0);
    expect(angleToMinutes(90)).toBe(15);
    expect(angleToMinutes(100)).toBe(15); // 16.7 min → 15
    expect(angleToMinutes(110)).toBe(20); // 18.3 min → 20
    expect(angleToMinutes(358)).toBe(0); // wraps to the 12
    expect(angleToMinutes(100, 1)).toBe(17);
    expect(angleToMinutes(-6, 1)).toBe(59);
    expect(zetStep(1)).toBe(5);
    expect(zetStep(3)).toBe(5);
    expect(zetStep(4)).toBe(1);
    expect(zetStep(5)).toBe(1);
  });

  it('moves the short hand along with the minutes', () => {
    expect(hourHandAngle(3, 0)).toBe(90);
    expect(hourHandAngle(3, 30)).toBe(105);
    expect(hourHandAngle(12, 0)).toBe(0);
    expect(hourHandAngle(11, 45)).toBeCloseTo(352.5);
    expect(minuteHandAngle(45)).toBe(270);
  });

  it('dragging past the 12 changes the hour', () => {
    const t = toTotal({ h: 2, m: 50 });
    expect(fromTotal(dragTo(t, 5))).toEqual({ h: 3, m: 5 });
    expect(fromTotal(dragTo(toTotal({ h: 3, m: 5 }), 55))).toEqual({ h: 2, m: 55 });
    expect(fromTotal(dragTo(toTotal({ h: 12, m: 55 }), 0))).toEqual({ h: 1, m: 0 });
    expect(fromTotal(dragTo(toTotal({ h: 1, m: 0 }), 50))).toEqual({ h: 12, m: 50 });
    expect(fromTotal(dragTo(t, 20))).toEqual({ h: 2, m: 20 });
    expect(fromTotal(addMinutes(toTotal({ h: 12, m: 0 }), -60))).toEqual({ h: 11, m: 0 });
    expect(fromTotal(addMinutes(toTotal({ h: 11, m: 30 }), 60))).toEqual({ h: 12, m: 30 });
  });

  it.each(LEVELS)('level %s makes 10 different targets with the right minutes', (level) => {
    for (let seed = 1; seed < 40; seed++) {
      const targets = makeZetTargets(level, seeded(seed));
      expect(targets).toHaveLength(ZET_ROUND);
      expect(new Set(targets.map(toTotal)).size).toBe(ZET_ROUND);
      for (const t of targets) {
        expect(t.h).toBeGreaterThanOrEqual(1);
        expect(t.h).toBeLessThanOrEqual(12);
        expect(zetMinutes(level)).toContain(t.m);
        if (level <= 3) expect(t.m % zetStep(level)).toBe(0);
        expect(zetStart(t)).not.toBe(toTotal(t));
      }
    }
    expect(zetMinutes(1)).toEqual([0]);
    expect(zetMinutes(2)).toEqual([0, 30]);
    expect(zetMinutes(3)).toEqual([0, 15, 30, 45]);
  });

  it('checks the set time and says which hand is off', () => {
    const target = { h: 2, m: 30 };
    expect(checkClock(target, toTotal({ h: 2, m: 30 }))).toBe('right');
    expect(checkClock(target, toTotal({ h: 3, m: 30 }))).toBe('hour');
    expect(checkClock(target, toTotal({ h: 2, m: 0 }))).toBe('minutes');
    expect(checkClock({ h: 12, m: 0 }, 0)).toBe('right');
  });

  it('scores 3 / 1 / 0 and gives stars like the rest of the app', () => {
    expect(zetPoints(0, false)).toBe(3);
    expect(zetPoints(1, false)).toBe(1);
    expect(zetPoints(2, true)).toBe(0);
    expect(starsFor(30, 30)).toBe(3);
    expect(starsFor(26, 30)).toBe(3);
    expect(starsFor(20, 30)).toBe(2);
    expect(starsFor(14, 30)).toBe(1);
    expect(starsFor(13, 30)).toBe(0);
  });
});
