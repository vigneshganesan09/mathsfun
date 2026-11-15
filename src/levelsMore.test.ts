import { describe, expect, it } from 'vitest';
import { BOX, LEVELS, type LevelNo, type Question, type Topic } from './core';
import { STORY_GROEP } from './stories';
import {
  deelVan,
  kommagetallen,
  klokHeel,
  klokKwart,
  klokMinuten,
  meer,
  omtrek,
  ontbreekt,
  oppervlakte,
  pizza,
  sayTime,
  schaal,
  verhoudingstabel,
} from './topicsMore';

const SAMPLES = 300;
const TOPICS: Topic[] = [klokHeel, klokKwart, klokMinuten, meer, ontbreekt, pizza, deelVan, kommagetallen, omtrek, oppervlakte, verhoudingstabel, schaal, ...STORY_GROEP.topics];

const sample = (t: Topic, level: LevelNo): Question[] => Array.from({ length: SAMPLES }, () => t.make(level, Math.random));

/** What makes a question "this kind": its text, the shape of its sum (numbers blanked) and its picture type. */
const form = (q: Question) => `${q.text.nl.replace(/\d+/g, '#')}|${q.expr.replace(/[\d.,]+/g, '#')}|${q.visual?.type ?? ''}|${q.scene?.groups.length ?? ''}`;
const fingerprint = (q: Question) => `${form(q)}|${q.answer}|${q.kind === 'choice' ? q.options![q.answer].nl : ''}`;

describe('levels 4 and 5', () => {
  it.each(TOPICS.flatMap((t) => ([4, 5] as const).map((level) => [t.id, level, t] as const)))(
    '%s level %s differs from level 3',
    (_, level, t) => {
      const three = sample(t, 3);
      const higher = sample(t, level);
      const threeForms = new Set(three.map(form));
      const threePrints = new Set(three.map(fingerprint));
      // For number tiles (Wat is meer?) the right tile's number counts as the answer.
      const value = (q: Question) => (q.kind === 'choice' ? Number(q.options![q.answer].nl) : q.answer);
      const maxAnswer = (qs: Question[]) => Math.max(...qs.map(value).filter((v) => !Number.isNaN(v)));
      const newForm = higher.some((q) => !threeForms.has(form(q)));
      const bigger = maxAnswer(higher) > maxAnswer(three);
      // Mostly questions level 3 can't make.
      const unseen = higher.filter((q) => !threePrints.has(fingerprint(q))).length;
      expect(newForm || bigger, t.id).toBe(true);
      expect(unseen, t.id).toBeGreaterThan(SAMPLES / 3);
    },
  );

  it.each(TOPICS.map((t) => [t.id, t] as const))('%s: every level answers within its rules', (_, t) => {
    for (const level of LEVELS) {
      for (const q of sample(t, level)) {
        expect(q.expr === '' || q.expr.split(BOX).length === 2).toBe(true);
        if (q.kind === 'choice') {
          const labels = q.options!.map((o) => o.nl);
          expect(labels.length).toBeGreaterThanOrEqual(t === meer ? 2 : 3);
          expect(new Set(labels).size).toBe(labels.length);
        } else {
          expect(q.answer).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('says times to the minute the school way', () => {
    expect(sayTime(2, 7).nl).toBe('zeven over twee');
    expect(sayTime(2, 23).nl).toBe('zeven voor half drie');
    expect(sayTime(2, 33).nl).toBe('drie over half drie');
    expect(sayTime(2, 48).nl).toBe('twaalf voor drie');
    expect(sayTime(2, 48).en).toBe('twelve to three');
    expect(sayTime(4, 20).nl).toBe('tien voor half vijf');
  });

  it('clock and pizza choices never show the answer before answering', () => {
    for (const t of [klokHeel, klokKwart, klokMinuten, pizza]) {
      for (const level of [4, 5] as const) {
        for (const q of sample(t, level)) {
          const right = q.options![q.answer].nl;
          expect(q.text.nl).not.toContain(right);
          expect(q.hint.nl).not.toContain(right);
        }
      }
    }
  });

  it('pizza levels 4–5: no other tile is the same size as the right one', () => {
    const value = (s: string) => {
      const [a, b] = s.split('/').map(Number);
      return a / b;
    };
    for (const q of [...sample(pizza, 4), ...sample(pizza, 5)]) {
      const right = value(q.options![q.answer].nl);
      const same = q.options!.filter((o) => Math.abs(value(o.nl) - right) < 1e-9);
      expect(same, q.options!.map((o) => o.nl).join('|')).toHaveLength(1);
    }
  });
});

describe('pizza: no wrong tile equals the right fraction (all levels)', () => {
  it('never offers an equal fraction as a wrong answer', async () => {
    const { pizza } = await import('./topicsMore');
    const val = (s: string) => {
      const [a, b] = s.split('/').map(Number);
      return a / b;
    };
    for (const level of [1, 2, 3, 4, 5] as const) {
      for (let i = 0; i < 300; i++) {
        const q = pizza.make(level, Math.random);
        if (!q.options) continue;
        const right = val(q.options[q.answer].nl);
        q.options.forEach((o, j) => {
          if (j !== q.answer && /^\d+\/\d+$/.test(o.nl)) expect(Math.abs(val(o.nl) - right)).toBeGreaterThan(1e-9);
        });
      }
    }
  });
});
