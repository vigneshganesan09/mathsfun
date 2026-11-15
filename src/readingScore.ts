// Scoring a child's read-aloud against the page, and splitting words into
// klankgroepjes (syllables) for practice. Pure functions, no browser APIs.

/** Dutch number words, so "drie" and "3" from the speech recogniser count as the same. */
const NUMBER_WORDS: Record<string, string> = {
  nul: '0', een: '1', twee: '2', drie: '3', vier: '4', vijf: '5', zes: '6', zeven: '7', acht: '8',
  negen: '9', tien: '10', elf: '11', twaalf: '12', dertien: '13', veertien: '14', vijftien: '15',
  zestien: '16', zeventien: '17', achttien: '18', negentien: '19', twintig: '20', dertig: '30',
  veertig: '40', vijftig: '50', zestig: '60', zeventig: '70', tachtig: '80', negentig: '90',
  honderd: '100', duizend: '1000',
};

/** Lowercase, no accents or punctuation; number words become digits. */
export function normalizeWord(w: string): string {
  const plain = w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return NUMBER_WORDS[plain] ?? plain;
}

export interface Token {
  /** As printed, with punctuation. */
  text: string;
  /** For comparing; '' for punctuation-only tokens, which are not scored. */
  norm: string;
  /** Character offset in the page text (for read-aloud highlighting). */
  start: number;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ text: m[0], norm: normalizeWord(m[0]), start: m.index });
  return out;
}

/** The word without surrounding punctuation, for lists and practice. */
export function cleanWord(text: string): string {
  return text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export interface Heard {
  primary: string;
  alternatives: string[];
}

export const NOTHING_HEARD: Heard = { primary: '', alternatives: [] };

function heardWords(s: string): string[] {
  return s.split(/\s+/).map(normalizeWord).filter(Boolean);
}

/** Join two heard words when together they make a page word ("fiets pad" → "fietspad"). */
function mergeCompounds(heard: string[], targets: Set<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < heard.length; i++) {
    const joined = heard[i] + (heard[i + 1] ?? '');
    if (i + 1 < heard.length && targets.has(joined) && !targets.has(heard[i])) {
      out.push(joined);
      i++;
    } else out.push(heard[i]);
  }
  return out;
}

/**
 * Which target words were read, in order: the longest common subsequence of
 * page words and heard words. On ties it keeps the earliest page words, so a
 * child who stops halfway gets the first half, not a repeated word near the end.
 */
export function alignMatches(target: string[], heard: string[]): boolean[] {
  const n = target.length;
  const m = heard.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      L[i][j] = target[i - 1] === heard[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    }
  }
  const ok = new Array<boolean>(n).fill(false);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (L[i - 1][j] === L[i][j]) i--; // this page word isn't needed for the best match
    else if (L[i][j - 1] === L[i][j]) j--; // an extra heard word
    else {
      ok[i - 1] = true;
      i--;
      j--;
    }
  }
  return ok;
}

/** true for every token read correctly (punctuation-only tokens count as correct). */
export function scoreTokens(tokens: Token[], heard: Heard): boolean[] {
  const scored = tokens.map((t, i) => ({ norm: t.norm, i })).filter((t) => t.norm !== '');
  const targetSet = new Set(scored.map((t) => t.norm));
  const words = mergeCompounds(heardWords(heard.primary), targetSet);
  const matched = alignMatches(
    scored.map((t) => t.norm),
    words,
  );
  // Second chance: the recogniser's other guesses.
  const alt = new Set(heard.alternatives.flatMap(heardWords));
  const result = tokens.map(() => true);
  scored.forEach((t, k) => {
    result[t.i] = matched[k] || alt.has(t.norm);
  });
  return result;
}

/** Did the child say this single word? */
export function saidWord(word: string, heard: Heard): boolean {
  const target = normalizeWord(word);
  const all = [heard.primary, ...heard.alternatives];
  return all.some((s) => {
    const ws = heardWords(s);
    return ws.includes(target) || ws.join('') === target;
  });
}

// ---------- klankgroepjes ----------

const VOWEL_GROUPS = ['ieuw', 'eeuw', 'aai', 'ooi', 'oei', 'ieu', 'eeu', 'aa', 'ee', 'oo', 'uu', 'ie', 'oe', 'eu', 'ei', 'ij', 'ui', 'ou', 'au'];
const PREFIXES = ['ver', 'be', 'ge', 'ont', 'her'];
const isVowel = (c: string) => 'aeiouy'.includes(c);

/**
 * Split a Dutch word into klankgroepjes the way it's taught in groep 3–4:
 * one consonant goes to the next part (mo-len), two are split (kip-pen),
 * and with more the last one moves on (kerst-boom). Not a full hyphenator.
 */
export function splitSyllables(word: string): string[] {
  const lower = word.toLowerCase();
  if (!/^[a-z]+$/.test(lower) || lower.length < 4) return [word];

  // A common prefix is its own part: ver-stop-pen.
  for (const p of PREFIXES) {
    if (lower.startsWith(p) && lower.length > p.length + 2 && !isVowel(lower[p.length])) {
      const rest = splitSyllables(word.slice(p.length));
      return [word.slice(0, p.length), ...rest];
    }
  }

  // Break into units: vowel groups and consonants ("ch" stays together).
  type Unit = { s: string; v: boolean; at: number };
  const units: Unit[] = [];
  let i = 0;
  while (i < lower.length) {
    const vg = VOWEL_GROUPS.find((g) => lower.startsWith(g, i));
    if (vg) {
      units.push({ s: vg, v: true, at: i });
      i += vg.length;
    } else if (isVowel(lower[i])) {
      units.push({ s: lower[i], v: true, at: i });
      i++;
    } else if (lower.startsWith('ch', i)) {
      units.push({ s: 'ch', v: false, at: i });
      i += 2;
    } else {
      units.push({ s: lower[i], v: false, at: i });
      i++;
    }
  }

  const cuts: number[] = [];
  let prevVowel = -1;
  units.forEach((u, k) => {
    if (!u.v) return;
    if (prevVowel >= 0) {
      const between = units.slice(prevVowel + 1, k);
      if (between.length === 0) cuts.push(u.at);
      else if (between.length === 1) cuts.push(between[0].at);
      else {
        let take = 1;
        // "sch" starts the next part: bood-schap-pen.
        if (between[between.length - 1].s === 'ch' && between[between.length - 2]?.s === 's') take = 2;
        if (between.length - take < 1) take = between.length - 1;
        cuts.push(between[between.length - take].at);
      }
    }
    prevVowel = k;
  });

  const parts: string[] = [];
  let from = 0;
  for (const c of cuts) {
    parts.push(word.slice(from, c));
    from = c;
  }
  parts.push(word.slice(from));
  return parts.filter(Boolean);
}

// ---------- spoken numbers (for the spoken times-table test) ----------

const UNITS: Record<string, number> = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9 };
const TEENS: Record<string, number> = {
  tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19,
};
const TENS: Record<string, number> = { twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90 };
const UNDER_100 = new RegExp(`^(${Object.keys(UNITS).join('|')})en(${Object.keys(TENS).join('|')})$`);

function under100(w: string): number | null {
  if (w === 'nul') return 0;
  if (w in UNITS) return UNITS[w];
  if (w in TEENS) return TEENS[w];
  if (w in TENS) return TENS[w];
  const m = w.match(UNDER_100);
  return m ? UNITS[m[1]] + TENS[m[2]] : null;
}

/** "56", "zesenvijftig", "drieëntwintig", "honderd", "honderdtwintig" → number. */
export function parseDutchNumber(word: string): number | null {
  const w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (/^\d+$/.test(w)) return Number(w);
  if (w.startsWith('honderd')) {
    const rest = w.slice('honderd'.length);
    if (!rest) return 100;
    const r = under100(rest.replace(/^en/, ''));
    return r === null ? null : 100 + r;
  }
  return under100(w);
}

/** Every number the recogniser might have heard, best guess first. */
export function heardNumbers(heard: Heard): number[] {
  const out: number[] = [];
  for (const s of [heard.primary, ...heard.alternatives]) {
    const words = s.split(/\s+/).filter(Boolean);
    for (const w of words) {
      const n = parseDutchNumber(w);
      if (n !== null) out.push(n);
    }
    // "zes en vijftig" said slowly comes back as separate words.
    const joined = parseDutchNumber(words.join(''));
    if (joined !== null) out.push(joined);
  }
  return [...new Set(out)];
}
