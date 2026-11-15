import type { LevelNo } from './core';
import type { Book, ReadingLevelId } from './readingData';
import { normalizeWord } from './readingScore';
import { EMPTY_STATS, type SkillStat, type Stats } from './review';
import type { StarCount } from './scoring';
import type { Speed } from './speech';
import { DEFAULT_TEACHER, type TeacherId } from './teachers';

// Everything is kept in this browser only, per child profile. Every read and
// write is guarded so the app still works when storage is blocked.

export type EnglishMode = 'always' | 'tap' | 'hidden';

export interface Settings {
  english: EnglishMode;
  voice: boolean;
  /** Read each question aloud in Dutch as it appears (spec: on for groep 1–4). */
  autoRead: boolean;
  sounds: boolean;
  /** Chosen voices (voiceURI), or null for the best available one. */
  voiceNl: string | null;
  voiceEn: string | null;
  speed: Speed;
  /** Reading and spoken tests: the device listens, or a parent listens along and marks. */
  listen: 'auto' | 'parent';
  /** The teacher character the child chose. */
  teacher: TeacherId;
}

export const DEFAULT_SETTINGS: Settings = {
  english: 'tap',
  voice: true,
  autoRead: true,
  sounds: true,
  voiceNl: null,
  voiceEn: null,
  speed: 'normal',
  listen: 'auto',
  teacher: DEFAULT_TEACHER,
};

export type ProfileColour = 'brand' | 'accent' | 'sun' | 'correct';

export interface Profile {
  id: string;
  name: string;
  colour: ProfileColour;
  /** A groep id from GROEPEN, e.g. '4'. */
  groep: string;
  createdAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: keep going without saving.
  }
}

// ---------- profiles ----------

const PROFILES = 'rekenpret.profiles';
const CURRENT = 'rekenpret.current';
let active = 'default';

/** Data saved before profiles existed. It moves to the first profile. */
const LEGACY = ['settings', 'stars', 'books', 'words', 'readingLevel'];

const pkey = (name: string, id = active) => `rekenpret.p.${id}.${name}`;

export const loadProfiles = (): Profile[] => read<Profile[]>(PROFILES, []);
export const loadCurrentProfileId = (): string | null => read<string | null>(CURRENT, null);

export function setActiveProfile(id: string): void {
  active = id;
  write(CURRENT, id);
}

export function createProfile(name: string, colour: ProfileColour, groep: string, teacher: TeacherId = DEFAULT_TEACHER): Profile {
  const profiles = loadProfiles();
  const p: Profile = { id: `p${Date.now().toString(36)}`, name, colour, groep, createdAt: new Date().toISOString() };
  if (profiles.length === 0) {
    for (const k of LEGACY) {
      const old = read<unknown>(`rekenpret.${k}`, undefined);
      if (old !== undefined) write(pkey(k, p.id), old);
    }
  }
  // Auto-read is on for the youngest groups (spec §15).
  const young = ['1-2', '3', '4'].includes(groep);
  write(pkey('settings', p.id), { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(pkey('settings', p.id), {}), autoRead: young, teacher });
  write(PROFILES, [...profiles, p]);
  return p;
}

export function updateProfile(p: Profile): void {
  write(
    PROFILES,
    loadProfiles().map((x) => (x.id === p.id ? p : x)),
  );
}

export function deleteProfile(id: string): void {
  write(
    PROFILES,
    loadProfiles().filter((p) => p.id !== id),
  );
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`rekenpret.p.${id}.`))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ---------- settings ----------

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(pkey('settings'), {}) });
export const saveSettings = (s: Settings) => write(pkey('settings'), s);

// ---------- level stars (0–3, spec §5.3) ----------

export function getLevelStars(topicId: string, level: LevelNo): StarCount | undefined {
  return read<Record<string, StarCount>>(pkey('levels'), {})[`${topicId}:${level}`];
}

/** Keep the best stars for a level. Returns true when this is a new best. */
export function saveLevelStars(topicId: string, level: LevelNo, stars: StarCount): boolean {
  const all = read<Record<string, StarCount>>(pkey('levels'), {});
  const k = `${topicId}:${level}`;
  if (all[k] !== undefined && all[k] >= stars) return false;
  all[k] = stars;
  write(pkey('levels'), all);
  return true;
}

export function allLevelStars(): Record<string, StarCount> {
  return read<Record<string, StarCount>>(pkey('levels'), {});
}

// ---------- scores out of 10 (table tests, lesson quizzes) ----------

type Scores = Record<string, number>;

export function getStars(topicId: string, level: LevelNo): number | undefined {
  return read<Scores>(pkey('stars'), {})[`${topicId}:${level}`];
}

export function saveStars(topicId: string, level: LevelNo, stars: number): boolean {
  const all = read<Scores>(pkey('stars'), {});
  const k = `${topicId}:${level}`;
  if (all[k] !== undefined && all[k] >= stars) return false;
  all[k] = stars;
  write(pkey('stars'), all);
  return true;
}

// ---------- finished learning (lessons, table learning): closed, can be retaken ----------

export interface Completed {
  /** ISO date of the last time it was finished. */
  at: string;
  correct: number;
  total: number;
  /** How many times it was finished (1 = first time, more = retakes). */
  times: number;
}

export const lessonKey = (id: string) => `lesson:${id}`;
export const tableLearnKey = (t: string | number) => `table-learn:${t}`;

export function loadCompleted(): Record<string, Completed> {
  return read<Record<string, Completed>>(pkey('completed'), {});
}

export function getCompleted(key: string): Completed | undefined {
  return loadCompleted()[key];
}

export function markCompleted(key: string, correct: number, total: number, today = new Date().toISOString().slice(0, 10)): Completed {
  const all = loadCompleted();
  const done: Completed = { at: today, correct, total, times: (all[key]?.times ?? 0) + 1 };
  all[key] = done;
  write(pkey('completed'), all);
  return done;
}

/** "15 november" style date for the closed badge. */
export function shortDate(iso: string): { nl: string; en: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    nl: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' }),
    en: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
  };
}

// ---------- reading ----------

export const loadReadingLevel = (): ReadingLevelId | null => read<ReadingLevelId | null>(pkey('readingLevel'), null);
export const saveReadingLevel = (id: ReadingLevelId) => write(pkey('readingLevel'), id);

/** Best percentage of words read correctly, per book. */
export function getBookBest(bookId: string): number | undefined {
  return read<Record<string, number>>(pkey('books'), {})[bookId];
}

export function saveBookScore(bookId: string, pct: number): boolean {
  const all = read<Record<string, number>>(pkey('books'), {});
  if (all[bookId] !== undefined && all[bookId] >= pct) return false;
  all[bookId] = pct;
  write(pkey('books'), all);
  return true;
}

export interface PracticeWord {
  word: string;
  /** The sentence it came from, for context. */
  sentence: string;
  misses: number;
}

/** Words the child found hard, to practise later. */
export function loadWordBank(): PracticeWord[] {
  return Object.values(read<Record<string, PracticeWord>>(pkey('words'), {})).sort((a, b) => b.misses - a.misses);
}

export function addMissedWords(words: { word: string; sentence: string }[]): void {
  const bank = read<Record<string, PracticeWord>>(pkey('words'), {});
  for (const w of words) {
    const k = normalizeWord(w.word);
    if (!k) continue;
    bank[k] = { word: w.word, sentence: w.sentence, misses: (bank[k]?.misses ?? 0) + 1 };
  }
  write(pkey('words'), bank);
}

/** Said correctly in practice: take it off the list. */
export function removePractisedWord(word: string): void {
  const bank = read<Record<string, PracticeWord>>(pkey('words'), {});
  delete bank[normalizeWord(word)];
  write(pkey('words'), bank);
}

// ---------- spaced review ----------

export function loadSkills(): SkillStat[] {
  return Object.values(read<Record<string, SkillStat>>(pkey('skills'), {}));
}

export function saveSkills(updated: SkillStat[]): void {
  const all = read<Record<string, SkillStat>>(pkey('skills'), {});
  for (const s of updated) all[s.key] = s;
  write(pkey('skills'), all);
}

// ---------- stats and stickers ----------

export const loadStats = (): Stats => ({ ...EMPTY_STATS, ...read<Partial<Stats>>(pkey('stats'), {}) });
export const saveStats = (s: Stats) => write(pkey('stats'), s);

export function clearProgress(): void {
  for (const k of ['stars', 'levels', 'books', 'words', 'skills', 'stats']) write(pkey(k), {});
}

// ---------- downloaded online books (shared by all children on this device) ----------

const ONLINE_BOOKS = 'rekenpret.onlineBooks';

export function loadDownloadedBooks(): Book[] {
  return Object.values(read<Record<string, Book>>(ONLINE_BOOKS, {}));
}

export function saveDownloadedBook(b: Book): void {
  write(ONLINE_BOOKS, { ...read<Record<string, Book>>(ONLINE_BOOKS, {}), [b.id]: b });
}

export function removeDownloadedBook(id: string): void {
  const all = read<Record<string, Book>>(ONLINE_BOOKS, {});
  delete all[id];
  write(ONLINE_BOOKS, all);
}
