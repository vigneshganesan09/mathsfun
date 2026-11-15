import { describe, expect, it } from 'vitest';
import { bookId, normAns, parseKey, recentResults, recordResult, sameAnswer, starsFor } from './bookCheck';

describe('normAns', () => {
  it('trims and ignores case and extra spaces', () => {
    expect(normAns('  42 ')).toBe('42');
    expect(normAns('Half   Drie')).toBe('half drie');
    expect(normAns(' half drie. ')).toBe('half drie');
  });

  it('accepts comma and dot decimals', () => {
    expect(normAns('2,5')).toBe(normAns('2.5'));
    expect(normAns('2,50')).toBe('2.5');
    expect(normAns('0,25')).toBe('0.25');
  });

  it('accepts thousands dots', () => {
    expect(normAns('1.000')).toBe('1000');
    expect(normAns('12.500,5')).toBe('12500.5');
    expect(normAns('1000')).toBe('1000');
  });

  it('ignores euro signs', () => {
    expect(normAns('€ 12')).toBe('12');
    expect(normAns('€12')).toBe('12');
    expect(normAns('12 euro')).toBe('12');
    expect(normAns('€ 2,50')).toBe('2.5');
  });

  it('treats the maths minus as a minus', () => {
    expect(normAns('−5')).toBe('-5');
    expect(normAns('- 5')).toBe('-5');
  });

  it('keeps fractions, ignoring spaces around the slash', () => {
    expect(normAns('3 / 4')).toBe('3/4');
    expect(normAns('3/4')).toBe('3/4');
  });

  it('removes leading zeros and trailing full stops on numbers', () => {
    expect(normAns('007')).toBe('7');
    expect(normAns('35.')).toBe('35');
  });

  it('does not match different answers', () => {
    expect(sameAnswer('41', '42')).toBe(false);
    expect(sameAnswer('half vier', 'half drie')).toBe(false);
    expect(sameAnswer('', '')).toBe(false);
    expect(sameAnswer('Half drie', 'half drie')).toBe(true);
    expect(sameAnswer('2.5', '2,5')).toBe(true);
  });
});

describe('parseKey', () => {
  it('splits on ; and new lines and drops empties', () => {
    expect(parseKey('35; 42; 7; 2,5; half drie')).toEqual(['35', '42', '7', '2,5', 'half drie']);
    expect(parseKey('35\n42\r\n\n7;;  ;8\n')).toEqual(['35', '42', '7', '8']);
    expect(parseKey('')).toEqual([]);
    expect(parseKey('  ;\n ')).toEqual([]);
  });
});

describe('starsFor', () => {
  it('gives 0–3 stars by percentage', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(8, 10)).toBe(2);
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(6, 10)).toBe(1);
    expect(starsFor(5, 10)).toBe(1);
    expect(starsFor(4, 10)).toBe(0);
    expect(starsFor(0, 0)).toBe(0);
  });
});

describe('results', () => {
  it('keeps the best stars per book/page/exercise and sorts recent first', () => {
    let all = recordResult({}, { book: 'Pluspunt', page: '34', ex: '3', good: 9, total: 10, when: 1 });
    all = recordResult(all, { book: 'pluspunt ', page: '34', ex: '3', good: 5, total: 10, when: 2 });
    all = recordResult(all, { book: '', page: '35', ex: '', good: 8, total: 10, when: 3 });
    const id = bookId('Pluspunt', '34', '3');
    expect(all[id].stars).toBe(3);
    expect(all[id].good).toBe(5);
    expect(recentResults(all).map((r) => r.page)).toEqual(['35', '34']);
  });
});
