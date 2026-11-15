import { describe, expect, it } from 'vitest';
import { BOOKS, levelForGroep, migrateLevel, READING_LEVELS } from './readingData';
import { cleanWord, heardNumbers, normalizeWord, parseDutchNumber, saidWord, scoreTokens, splitSyllables, tokenize } from './readingScore';

const score = (page: string, primary: string, alternatives: string[] = []) =>
  scoreTokens(tokenize(page), { primary, alternatives });

describe('reading score', () => {
  const page = 'Pip ziet een bal. De bal is rood.';

  it('counts a perfect read as all correct', () => {
    expect(score(page, 'pip ziet een bal de bal is rood')).toEqual(Array(8).fill(true));
  });

  it('marks skipped and misread words', () => {
    // "een" skipped, "rood" read as "groot"
    expect(score(page, 'pip ziet bal de bal is groot')).toEqual([true, true, false, true, true, true, true, false]);
  });

  it('ignores repeats and self-corrections', () => {
    expect(score(page, 'pip pip ziet een een bal de bal is rood').every(Boolean)).toBe(true);
  });

  it('marks the rest wrong when the child stops early', () => {
    expect(score(page, 'pip ziet een bal')).toEqual([true, true, true, true, false, false, false, false]);
  });

  it('accepts digits for number words and ignores accents and case', () => {
    expect(score('Één, twee, drie!', '1 2 3').every(Boolean)).toBe(true);
    expect(normalizeWord('Één,')).toBe('1');
  });

  it('joins a compound the recogniser split', () => {
    expect(score('Het fietspad is druk.', 'het fiets pad is druk').every(Boolean)).toBe(true);
  });

  it("uses the recogniser's other guesses as a second chance", () => {
    expect(score('De molen draait.', 'de mollen draait', ['de molen draait'])).toEqual([true, true, true]);
  });

  it('checks single practice words', () => {
    expect(saidWord('kippenhok', { primary: 'kippen hok', alternatives: [] })).toBe(true);
    expect(saidWord('molen', { primary: 'mollen', alternatives: [] })).toBe(false);
  });

  it('strips punctuation for word lists', () => {
    expect(cleanWord("'Wie")).toBe('Wie');
    expect(cleanWord('pootjes...')).toBe('pootjes');
  });
});

describe('klankgroepjes', () => {
  it.each([
    ['kippenhok', 'kip-pen-hok'],
    ['molen', 'mo-len'],
    ['schapen', 'scha-pen'],
    ['eieren', 'ei-e-ren'],
    ['boerderij', 'boer-de-rij'],
    ['verbaasd', 'ver-baasd'],
    ['appels', 'ap-pels'],
    ['lachen', 'la-chen'],
    ['boodschappen', 'bood-schap-pen'],
    ['draait', 'draait'],
    ['koeien', 'koei-en'],
    ['langzaam', 'lang-zaam'],
    ['verstoppen', 'ver-stop-pen'],
  ])('%s → %s', (word, parts) => {
    expect(splitSyllables(word).join('-')).toBe(parts);
  });
});

describe('books', () => {
  it('every level has a book and every page is in Dutch and English', () => {
    for (const level of READING_LEVELS) expect(BOOKS.some((b) => b.level === level.id)).toBe(true);
    for (const book of BOOKS) {
      expect(book.pages.length).toBeGreaterThanOrEqual(4);
      // Free picture books may have very short pages ("Zij zwaait."); our own books have at least 3 words.
      const min = book.online ? 1 : 3;
      for (const p of book.pages) {
        expect(tokenize(p.nl).filter((t) => t.norm).length, `${book.id}: ${p.nl}`).toBeGreaterThanOrEqual(min);
        expect(p.en.length, `${book.id}: ${p.nl}`).toBeGreaterThan(0);
      }
    }
  });

  it('has at least four books for every school groep', () => {
    for (const level of READING_LEVELS.filter((l) => l.kind === 'groep')) {
      expect(BOOKS.filter((b) => b.level === level.id).length, level.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('drawn pages use a known landscape and bundled pictures are local', () => {
    const lands = ['tulips', 'polder', 'beach', 'forest', 'city', 'mountains', 'space'];
    for (const book of BOOKS) {
      for (const p of book.pages) {
        if (p.scene) expect(lands).toContain(p.scene);
        if (p.image) expect(p.image).not.toMatch(/^https?:/);
      }
    }
  });

  it('opens the shelf that fits the groep', () => {
    expect(levelForGroep('1-2')).toBe('g12');
    expect(levelForGroep('5')).toBe('g5');
    expect(levelForGroep('8')).toBe('g8');
    expect(migrateLevel('g78')).toBe('g7');
    expect(migrateLevel('nonsense')).toBeNull();
  });

  it('has unique book ids', () => {
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(BOOKS.length);
  });
});

describe('spoken numbers', () => {
  it.each([
    ['56', 56],
    ['zesenvijftig', 56],
    ['drieëntwintig', 23],
    ['twaalf', 12],
    ['honderd', 100],
    ['honderdtwintig', 120],
    ['nul', 0],
  ])('%s → %s', (w, n) => {
    expect(parseDutchNumber(w)).toBe(n);
  });

  it('finds numbers in what was heard', () => {
    expect(heardNumbers({ primary: 'zes en vijftig', alternatives: [] })).toContain(56);
    expect(heardNumbers({ primary: 'het is 42', alternatives: ['het is tweeënveertig'] })).toEqual([42]);
  });
});
