import { describe, expect, it } from 'vitest';
import { BOX, fmtEn, fmtNl, GROEPEN, LEVELS, makeLevel, QUESTIONS_PER_LEVEL, type Question } from './curriculum';
import { LESSONS } from './lessonData';
import { LESSON_QUIZ, STORY_GROEP } from './stories';
import { learnQuestions, TABLES, testQuestions } from './tableData';

const SAMPLES = 400;
const parse = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace('−', '-'));
const NUM = '(−?[\\d.,]+)';

/** Work out the answer from what the child sees, so the display can't drift from the answer. */
function solveFromScreen(q: Question): number | undefined {
  let m = q.expr.match(new RegExp(`^${NUM} ([+−×:]) ${NUM} = ${BOX}$`));
  if (m) {
    const a = parse(m[1]);
    const b = parse(m[3]);
    return { '+': a + b, '−': a - b, '×': a * b, ':': a / b }[m[2]];
  }
  if ((m = q.expr.match(new RegExp(`^${NUM} = ${NUM} \\+ ${BOX}$`)))) return parse(m[1]) - parse(m[2]);
  if ((m = q.expr.match(new RegExp(`^${NUM}, ${BOX}$`)))) return parse(m[1]) + 1;
  if ((m = q.expr.match(new RegExp(`^${BOX}, ${NUM}$`)))) return parse(m[1]) - 1;
  if ((m = q.expr.match(new RegExp(`^(\\d+)% van ${NUM} = ${BOX}$`)))) return (parse(m[2]) * Number(m[1])) / 100;
  if ((m = q.expr.match(new RegExp(`^(\\d+)/(\\d+) van ${NUM} = ${BOX}$`)))) return (parse(m[3]) / Number(m[2])) * Number(m[1]);
  if ((m = q.expr.match(new RegExp(`^${NUM} \\+ ${BOX} = ${NUM}$`)))) return parse(m[2]) - parse(m[1]);
  if (q.beads !== undefined) return q.beads;
  return undefined; // stories, rounding: checked separately
}

const all = GROEPEN.flatMap((g) => g.topics.flatMap((t) => LEVELS.map((level) => ({ g, t, level }))));

describe('curriculum', () => {
  it('has unique topic ids', () => {
    const ids = GROEPEN.flatMap((g) => g.topics.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(all.map(({ g, t, level }) => [`groep ${g.id} · ${t.id} · level ${level}`, t, level] as const))(
    '%s gives sound questions',
    (_, t, level) => {
      for (let i = 0; i < SAMPLES; i++) {
        const q = t.make(level, Math.random);
        if (q.kind === 'choice') {
          const labels = q.options!.map((o) => o.nl);
          expect(labels.length, q.text.nl).toBeGreaterThanOrEqual(2);
          expect(new Set(labels).size, labels.join('|')).toBe(labels.length);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(labels.length);
          expect(q.expr).toBe('');
          continue;
        }
        if (q.decimals) expect(Number.isInteger(Math.round(q.answer * 10) / 1), q.expr).toBe(true);
        else expect(Number.isInteger(q.answer), q.expr).toBe(true);
        expect(Math.abs(q.answer)).toBeLessThan(10_000_000); // fits on the number pad
        if (!t.allowNegative) expect(q.answer, q.expr).toBeGreaterThanOrEqual(0);
        expect(q.expr.split(BOX)).toHaveLength(2);
        expect(q.solution ?? q.hint, q.expr).toBeDefined();
        for (const s of [q.text, q.speak, q.hint]) {
          expect(s.nl.length).toBeGreaterThan(0);
          expect(s.en.length).toBeGreaterThan(0);
        }
        const solved = solveFromScreen(q);
        if (solved !== undefined) expect(q.answer, q.expr).toBeCloseTo(solved, 9);
      }
    },
  );

  it('rounds correctly', () => {
    const afronden = GROEPEN.flatMap((g) => g.topics).find((t) => t.id === 'afronden')!;
    for (const level of LEVELS) {
      const unit = [10, 100, 1000][level - 1];
      for (let i = 0; i < SAMPLES; i++) {
        const q = afronden.make(level, Math.random);
        const n = parse(q.expr.split(' ')[0]);
        expect(Math.abs(q.answer - n)).toBeLessThanOrEqual(unit / 2);
        expect(q.answer % unit).toBe(0);
      }
    }
  });

  it('makes levels of 10', () => {
    expect(makeLevel(GROEPEN[2].topics[0], 1)).toHaveLength(QUESTIONS_PER_LEVEL);
  });
});

describe('formatting', () => {
  it('uses Dutch notation on screen', () => {
    expect(fmtNl(10000)).toBe('10.000');
    expect(fmtNl(2.5)).toBe('2,5');
    expect(fmtNl(-3)).toBe('−3');
    expect(fmtEn(10000)).toBe('10,000');
  });
});

describe('story mode and lessons', () => {
  /** The picture must show exactly what the question asks about. */
  function answerFromScene(q: Question): number {
    const s = q.scene!;
    if (s.join === '+') return s.groups.reduce((a, b) => a + b, 0);
    if (s.gone !== undefined) return s.groups[0] - s.gone;
    if (s.groups.length > 1) return s.groups.length * s.groups[0];
    return s.groups[0] * 2; // ducks' legs, bikes' wheels
  }

  const pictured = [
    ...STORY_GROEP.topics.flatMap((t) => LEVELS.map((level) => [t.id, t, level] as const)),
    ...Object.values(LESSON_QUIZ).map((t) => [t.id, t, 1 as const] as const),
    ...GROEPEN[1].topics.slice(0, 2).flatMap((t) => LEVELS.map((level) => [t.id, t, level] as const)),
  ];

  it.each(pictured)('%s level %s: picture matches the answer', (_, t, level) => {
    for (let i = 0; i < SAMPLES; i++) {
      const q = t.make(level, Math.random);
      expect(q.scene, q.text.nl).toBeDefined();
      expect(answerFromScene(q), q.text.nl).toBe(q.answer);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      const drawn = q.scene!.groups.reduce((a, b) => a + b, 0);
      expect(drawn).toBeLessThanOrEqual(40); // stays countable
      expect(q.text.en.length).toBeGreaterThan(0);
      // Numbers in the story match in both languages.
      expect(q.text.nl.match(/\d+/g)).toEqual(q.text.en.match(/\d+/g));
    }
  });

  it('every lesson slide is in Dutch and English', () => {
    for (const lesson of LESSONS) {
      expect(lesson.slides.length).toBeGreaterThan(3);
      for (const slide of lesson.slides) {
        expect(slide.text.nl.length).toBeGreaterThan(0);
        expect(slide.text.en.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('answers stay hidden until answered', () => {
  it('lesson questions do not give away the answer in the text', () => {
    for (const lesson of LESSONS) {
      for (const slide of lesson.slides) {
        if (slide.ask === undefined) continue;
        expect(slide.expr, slide.text.nl).toContain(BOX);
        expect(slide.reveal, slide.text.nl).toBeDefined();
        const word = new RegExp(`(^|\\D)${slide.ask}(\\D|$)`);
        expect(word.test(slide.text.nl), slide.text.nl).toBe(false);
        expect(word.test(slide.text.en), slide.text.en).toBe(false);
      }
    }
  });

  it('times-table tests cover each table once, without pictures', () => {
    for (const t of TABLES) {
      const qs = testQuestions(t);
      expect(qs.map((q) => q.answer).sort((a, b) => a - b)).toEqual(TABLES.map((k) => k * t).sort((a, b) => a - b));
      expect(qs.every((q) => !q.scene && q.expr.endsWith(BOX))).toBe(true);
    }
    expect(new Set(testQuestions('mix').map((q) => q.expr)).size).toBe(10);
    expect(learnQuestions(7).map((q) => q.answer)).toEqual(TABLES.map((k) => k * 7));
  });
});

describe('clock language', () => {
  it('says Dutch times the school way', async () => {
    const { sayTime } = await import('./topicsMore');
    expect(sayTime(2, 30).nl).toBe('half drie');
    expect(sayTime(2, 30).en).toBe('half past two');
    expect(sayTime(12, 45).nl).toBe('kwart voor een');
    expect(sayTime(4, 20).nl).toBe('tien voor half vijf');
    expect(sayTime(9, 0).nl).toBe('negen uur');
  });
});
