// Shared types and helpers for questions, stories and lessons.

export type Bi = { nl: string; en: string };
export type Lang = keyof Bi;
export type LevelNo = 1 | 2 | 3 | 4 | 5;
export type Rng = () => number;

/** Things we can draw in a picture. */
export type Item =
  | 'apple'
  | 'roll'
  | 'stroopwafel'
  | 'cupcake'
  | 'person'
  | 'egg'
  | 'duck'
  | 'cookie'
  | 'balloon'
  | 'bike'
  | 'marble';

/** What a group of items sits in. */
export type Container = 'basket' | 'box' | 'plate' | 'car' | 'tree' | 'none';

export type CharacterId = 'noor' | 'sam' | 'pip' | 'jan' | 'uil' | 'robot';

export type Domain = 'getallen' | 'verhoudingen' | 'meten' | 'verbanden';

export const DOMAIN_NAME: Record<Domain, Bi> = {
  getallen: { nl: 'Getallen', en: 'Numbers' },
  verhoudingen: { nl: 'Verhoudingen', en: 'Ratios & fractions' },
  meten: { nl: 'Meten & Meetkunde', en: 'Measuring & shapes' },
  verbanden: { nl: 'Verbanden', en: 'Tables & graphs' },
};

/** A countable picture: groups of items, optionally joined by "+", with some "gone" ones for taking away. */
export interface Scene {
  item: Item;
  groups: number[];
  join?: '+';
  /** How many of the last group's items have gone (drawn faded). */
  gone?: number;
  container?: Container;
}

/** Extra pictures: an analog clock, a pizza with slices, a rectangle with sides, two bead rows. */
export type Visual =
  | { type: 'clock'; h: number; m: number }
  | { type: 'pie'; parts: number; shaded: number }
  | { type: 'rect'; w: number; h: number; unit: string }
  | { type: 'compare'; a: number; b: number };

/** A tile for choice questions: Dutch label, optional English sub-label. */
export interface Choice {
  nl: string;
  en?: string;
}

export interface Question {
  /** The line on the card, e.g. "Reken uit." or a story. */
  text: Bi;
  /** The sum shown big on the card; BOX marks the answer box. '' for none (choice questions). */
  expr: string;
  /** What the read-aloud buttons say. */
  speak: Bi;
  /** For number questions; for choice questions this is the correct option's index. */
  answer: number;
  hint: Bi;
  /** Worked solution shown when the answer is revealed. */
  solution?: Bi;
  /** 'choice': tap one of the tiles in `options`. Default: type a number. */
  kind?: 'numpad' | 'choice';
  options?: Choice[];
  /** Number answers may have a decimal comma (2,5). */
  decimals?: boolean;
  /** Unit after the answer box, e.g. 'cm', 'cm²', 'm', 'km'; '€' goes before it. */
  unit?: string;
  /** Same skill → same key, for spaced review (e.g. "7x8", "clock 2:30"). */
  skillKey?: string;
  /** For counting questions: how many rekenrek beads to draw. */
  beads?: number;
  /** A picture to count from. */
  scene?: Scene;
  visual?: Visual;
}

/** The answer as the child would see it: a number in Dutch notation, or the right tile's label. */
export function answerLabel(q: Question): string {
  if (q.kind === 'choice') return q.options?.[q.answer]?.nl ?? '';
  const n = fmtNl(q.answer);
  return q.unit === '€' ? `€ ${n}` : q.unit ? `${n} ${q.unit}` : n;
}

/** Key for spaced review: the same sum or the same picture question gives the same key. */
export function skillKeyOf(q: Question): string {
  return q.skillKey ?? `${q.expr}|${q.text.nl}`;
}

export interface Topic {
  id: string;
  name: Bi;
  /** Shows a minus key on the number pad. */
  allowNegative?: boolean;
  /** Story mode: an introduction shown before the first question. */
  intro?: Bi;
  cast?: CharacterId[];
  /** A small picture for the world tile. */
  icon?: Item;
  /** The school domain, used to colour the world tile. */
  domain?: Domain;
  make: (level: LevelNo, rng: Rng) => Question;
}

export interface Groep {
  id: string;
  name: Bi;
  age: string;
  topics: Topic[];
}

export const BOX = '□';
export const LEVELS: LevelNo[] = [1, 2, 3, 4, 5];
export const MAX_LEVEL: LevelNo = 5;

/** Short names for the levels on the map and the class board. */
export const LEVEL_NAME: Record<LevelNo, Bi> = {
  1: { nl: 'Makkelijk', en: 'Easy' },
  2: { nl: 'Oefenen', en: 'Practice' },
  3: { nl: 'Goed bezig', en: 'Getting good' },
  4: { nl: 'Lastig', en: 'Tricky' },
  5: { nl: 'Kampioen', en: 'Champion' },
};
export const QUESTIONS_PER_LEVEL = 10;

export function fmtNl(n: number): string {
  const s = Math.abs(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
  return n < 0 ? `−${s}` : s;
}

export function fmtEn(n: number): string {
  const s = Math.abs(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
  return n < 0 ? `−${s}` : s;
}

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: Rng, items: T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

export const coin = (rng: Rng) => rng() < 0.5;

function sameQuestion(a: Question, b: Question): boolean {
  return a.expr === b.expr && a.text.nl === b.text.nl && a.beads === b.beads;
}

/** A level of questions, never the same one twice in a row. */
export function makeLevel(t: Topic, level: LevelNo, rng: Rng = Math.random, count = QUESTIONS_PER_LEVEL): Question[] {
  const out: Question[] = [];
  while (out.length < count) {
    let q = t.make(level, rng);
    const prev = out[out.length - 1];
    for (let tries = 0; prev && sameQuestion(prev, q) && tries < 10; tries++) q = t.make(level, rng);
    out.push(q);
  }
  return out;
}
