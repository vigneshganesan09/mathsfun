// The times-table trainer: learn a table step by step (with pictures),
// then take a written test (type the answers) and a spoken test (say them).
import { BOX, randInt, type Bi, type Question, type Rng, type Topic } from './core';

export const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export type TableId = number | 'mix';
export type TableMode = 'learn' | 'write' | 'say';

export function tableName(t: TableId): Bi {
  return t === 'mix' ? { nl: 'Alle tafels door elkaar', en: 'All tables mixed' } : { nl: `Tafel van ${t}`, en: `${t} times table` };
}

/** Where a table test score is saved. */
export const tableScoreId = (t: TableId, mode: TableMode) => `tafel-${t}-${mode}`;

function hint(k: number, n: number): Bi {
  if (k === 1) return { nl: '1 keer een getal is dat getal zelf.', en: '1 times a number is the number itself.' };
  const jumps = Array.from({ length: k - 1 }, (_, i) => (i + 1) * n).join(', ');
  return {
    nl: `Tel in sprongen van ${n}: ${jumps}, … Of: ${k - 1} × ${n} = ${(k - 1) * n}, doe er nog ${n} bij.`,
    en: `Count in jumps of ${n}: ${jumps}, … Or: ${k - 1} × ${n} = ${(k - 1) * n}, add ${n} more.`,
  };
}

/** "k × n": k groups of n. The answer is never shown until the child answers. */
export function tableQuestion(k: number, n: number, withPicture: boolean): Question {
  const ask: Bi = { nl: `Hoeveel is ${k} keer ${n}?`, en: `What is ${k} times ${n}?` };
  return {
    text: ask,
    expr: `${k} × ${n} = ${BOX}`,
    speak: ask,
    answer: k * n,
    hint: hint(k, n),
    scene: withPicture ? { item: 'marble', groups: Array(k).fill(n) } : undefined,
  };
}

/** Learn: 1 × n up to 10 × n in order, with a picture of k groups of n. */
export function learnQuestions(n: number): Question[] {
  return TABLES.map((k) => tableQuestion(k, n, true));
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Test: the whole table shuffled, or 10 different sums from tables 2–10. No pictures, no hints. */
export function testQuestions(t: TableId, rng: Rng = Math.random): Question[] {
  if (t !== 'mix') return shuffle(TABLES, rng).map((k) => tableQuestion(k, t, false));
  const seen = new Set<string>();
  const out: Question[] = [];
  while (out.length < 10) {
    const k = randInt(rng, 2, 10);
    const n = randInt(rng, 2, 10);
    if (seen.has(`${k}x${n}`)) continue;
    seen.add(`${k}x${n}`);
    out.push(tableQuestion(k, n, false));
  }
  return out;
}

export function tableTopic(t: TableId): Topic {
  return { id: `tafel-${t}`, name: tableName(t), make: () => tableQuestion(1, 1, false) };
}
