// Pure helpers for "Werken in je boek" (book mode, SPEC §16.2). No React, no browser APIs.

/**
 * Normalise an answer so the child's typed answer and the answer key can be compared.
 * Trims, ignores case and extra spaces, accepts 2,5 = 2.5, 1.000 = 1000, € 12 = 12, − = -.
 * Text answers ("half drie") are compared word by word.
 */
export function normAns(input: string): string {
  let s = String(input)
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, '-') // − – — become a plain minus
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '') // trailing full stop: "35." = "35"
    .trim();

  // Money: "€ 12", "€12", "12 €", "12 euro"
  s = s.replace(/^€\s*/, '').replace(/\s*(€|euro)$/, '').trim();

  // "- 5" = "-5", "3 / 4" = "3/4"
  s = s.replace(/^-\s+(?=\d)/, '-').replace(/\s*\/\s*/g, '/');

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    // Dutch thousands dots, optional comma decimals: 1.000 / 12.500,5
    return String(Number(s.replace(/\./g, '').replace(',', '.')));
  }
  if (/^-?\d+(,\d+)?$/.test(s) || /^-?\d*\.\d+$/.test(s)) {
    // 2,5 / 2.5 / 007 / .5
    return String(Number(s.replace(',', '.')));
  }
  if (/^-?,\d+$/.test(s)) return String(Number(s.replace(',', '.')));

  return s;
}

/** Do two answers match after normalising? Empty answers never match. */
export function sameAnswer(given: string, want: string): boolean {
  const g = normAns(given);
  return g !== '' && g === normAns(want);
}

/** Split an answer key on ; or new lines and drop empty entries. */
export function parseKey(text: string): string[] {
  return String(text)
    .split(/[;\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Stars for a book page: ≥ 90% 3, ≥ 70% 2, ≥ 50% 1, else 0. */
export function starsFor(good: number, total: number): 0 | 1 | 2 | 3 {
  if (!(total > 0)) return 0;
  const pct = good / total;
  return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
}

// ---------- saved results ----------

export interface BookResult {
  book: string;
  page: string;
  ex: string;
  /** Best stars ever for this book/page/exercise. */
  stars: number;
  /** Last attempt. */
  good: number;
  total: number;
  /** Time of the last attempt (ms since epoch). */
  when: number;
}

export type BookResults = Record<string, BookResult>;

/** Key under which results for one book/page/exercise are saved. */
export function bookId(book: string, page: string, ex: string): string {
  return `${book.trim().toLowerCase()}/${page.trim().toLowerCase()}/${ex.trim().toLowerCase()}`;
}

/** Add an attempt, keeping the best stars. Returns a new object. */
export function recordResult(
  all: BookResults,
  r: { book: string; page: string; ex: string; good: number; total: number; when: number },
): BookResults {
  const id = bookId(r.book, r.page, r.ex);
  const stars = starsFor(r.good, r.total);
  const prev = all[id];
  return { ...all, [id]: { ...r, stars: Math.max(prev?.stars ?? 0, stars) } };
}

/** Most recent results first. */
export function recentResults(all: BookResults, n = 5): BookResult[] {
  return Object.values(all)
    .filter((r) => r && typeof r.when === 'number')
    .sort((a, b) => b.when - a.when)
    .slice(0, n);
}
