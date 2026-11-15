// Spaced review (spec §9) and rewards (§10). Pure TypeScript.
import { skillKeyOf, type Bi, type CharacterId, type Item, type Question, type Rng } from './core';

// ---------- Leitner boxes ----------

export type Box = 1 | 2 | 3 | 4 | 5;

export interface SkillStat {
  key: string;
  topicId: string;
  box: Box;
  /** ISO date (YYYY-MM-DD) from which it is due again. */
  due: string;
  /** The question itself, so it can be asked again exactly. */
  question: Question;
}

/** Days until the next review per box. Box 5 = mastered. */
const WAIT: Record<Box, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 30 };

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

/** Right first time: up one box, due later. Otherwise back to box 1, due now. */
export function updateSkill(prev: SkillStat | undefined, question: Question, topicId: string, firstTry: boolean, today: string): SkillStat {
  const box = (firstTry ? Math.min(5, (prev?.box ?? 1) + 1) : 1) as Box;
  return { key: skillKeyOf(question), topicId, box, due: addDays(today, WAIT[box]), question };
}

/** Skills due today (or earlier), weakest first; optionally only for one topic. Box 5 is never due. */
export function dueSkills(stats: SkillStat[], today: string, topicId?: string): SkillStat[] {
  return stats
    .filter((s) => s.box < 5 && s.due <= today && (!topicId || s.topicId === topicId))
    .sort((a, b) => a.box - b.box || a.due.localeCompare(b.due));
}

/** A round: new questions plus up to `reviewMax` due review items, mixed in at random places. */
export function buildRound(fresh: Question[], due: SkillStat[], rng: Rng, size = 10, reviewMax = 3): Question[] {
  const review = due.slice(0, reviewMax).map((s) => s.question);
  const keys = new Set(review.map(skillKeyOf));
  const out = fresh.filter((q) => !keys.has(skillKeyOf(q))).slice(0, size - review.length);
  for (const r of review) out.splice(Math.floor(rng() * (out.length + 1)), 0, r);
  return out.slice(0, size);
}

// ---------- streaks ----------

/**
 * Days in a row with practice, counting back from today (or yesterday if today
 * is not done yet). One missed day per week is forgiven, so the flame pauses
 * instead of going out.
 */
export function streak(days: string[], today: string): number {
  const done = new Set(days);
  let day = done.has(today) ? today : addDays(today, -1);
  let count = 0;
  let freeUsed = 0;
  let sinceFree = 0;
  while (true) {
    if (done.has(day)) {
      count++;
      sinceFree++;
      if (sinceFree >= 7) {
        freeUsed = 0;
        sinceFree = 0;
      }
    } else if (freeUsed === 0 && count > 0 && done.has(addDays(day, -1))) {
      freeUsed = 1;
    } else break;
    day = addDays(day, -1);
  }
  return count;
}

// ---------- stickers ----------

export interface Stats {
  correctTotal: number;
  /** Practice days, YYYY-MM-DD. */
  days: string[];
  threeStarLevels: number;
  starredLevels: number;
  worldsDone: number;
  /** Levels 5 (Kampioen) with at least one star. */
  championLevels?: number;
  lessonsDone: number;
  booksRead: number;
  /** Tables (1–10) with a perfect written test. */
  perfectTables: number[];
}

export const EMPTY_STATS: Stats = {
  correctTotal: 0,
  days: [],
  threeStarLevels: 0,
  starredLevels: 0,
  worldsDone: 0,
  lessonsDone: 0,
  booksRead: 0,
  perfectTables: [],
};

export interface Sticker {
  id: string;
  name: Bi;
  how: Bi;
  art: { item?: Item; cast?: CharacterId };
  earned: (s: Stats, today: string) => boolean;
}

export const STICKERS: Sticker[] = [
  { id: 'eerste-ster', name: { nl: 'Eerste ster', en: 'First star' }, how: { nl: 'Haal een ster in een level.', en: 'Earn a star in a level.' }, art: { item: 'balloon' }, earned: (s) => s.starredLevels >= 1 },
  { id: 'drie-sterren', name: { nl: 'Drie sterren!', en: 'Three stars!' }, how: { nl: 'Haal drie sterren in een level.', en: 'Earn three stars in a level.' }, art: { item: 'cupcake' }, earned: (s) => s.threeStarLevels >= 1 },
  { id: 'wereld', name: { nl: 'Wereld klaar', en: 'World done' }, how: { nl: 'Haal een ster in level 1, 2 en 3 van een wereld.', en: 'Earn a star in levels 1, 2 and 3 of a world.' }, art: { cast: 'jan' }, earned: (s) => s.worldsDone >= 1 },
  { id: 'honderd', name: { nl: '100 goed', en: '100 right' }, how: { nl: 'Geef 100 goede antwoorden.', en: 'Give 100 right answers.' }, art: { item: 'stroopwafel' }, earned: (s) => s.correctTotal >= 100 },
  { id: 'vijfhonderd', name: { nl: '500 goed', en: '500 right' }, how: { nl: 'Geef 500 goede antwoorden.', en: 'Give 500 right answers.' }, art: { item: 'cookie' }, earned: (s) => s.correctTotal >= 500 },
  { id: 'les', name: { nl: 'Goed geleerd', en: 'Well learned' }, how: { nl: 'Maak een les helemaal af.', en: 'Finish a lesson.' }, art: { cast: 'noor' }, earned: (s) => s.lessonsDone >= 1 },
  { id: 'boek', name: { nl: 'Boekenwurm', en: 'Bookworm' }, how: { nl: 'Lees een boek uit.', en: 'Read a whole book.' }, art: { cast: 'sam' }, earned: (s) => s.booksRead >= 1 },
  { id: 'vijf-boeken', name: { nl: 'Vijf boeken', en: 'Five books' }, how: { nl: 'Lees vijf boeken uit.', en: 'Read five books.' }, art: { item: 'apple' }, earned: (s) => s.booksRead >= 5 },
  { id: 'tafel', name: { nl: 'Tafelkampioen', en: 'Table champion' }, how: { nl: 'Maak een schrijftoets helemaal goed.', en: 'Get a written table test all right.' }, art: { item: 'egg' }, earned: (s) => s.perfectTables.length >= 1 },
  { id: 'alle-tafels', name: { nl: 'Alle tafels!', en: 'All the tables!' }, how: { nl: 'Alle tafels van 1 tot 10 foutloos.', en: 'Every table 1 to 10 without a mistake.' }, art: { item: 'bike' }, earned: (s) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((t) => s.perfectTables.includes(t)) },
  { id: 'drie-dagen', name: { nl: '3 dagen op rij', en: '3 days in a row' }, how: { nl: 'Oefen drie dagen achter elkaar.', en: 'Practise three days in a row.' }, art: { cast: 'pip' }, earned: (s, today) => streak(s.days, today) >= 3 },
  { id: 'week', name: { nl: 'Een hele week', en: 'A whole week' }, how: { nl: 'Oefen zeven dagen achter elkaar.', en: 'Practise seven days in a row.' }, art: { item: 'duck' }, earned: (s, today) => streak(s.days, today) >= 7 },
  { id: 'kampioen', name: { nl: 'Kampioen', en: 'Champion' }, how: { nl: 'Haal een ster in een Kampioen-level (level 5).', en: 'Earn a star in a Champion level (level 5).' }, art: { cast: 'uil' }, earned: (s) => (s.championLevels ?? 0) >= 1 },
];

/** Stickers earned now that weren't before. */
export function newStickers(before: Stats, after: Stats, today: string): Sticker[] {
  return STICKERS.filter((s) => !s.earned(before, today) && s.earned(after, today));
}
