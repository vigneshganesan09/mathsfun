import { describe, expect, it } from 'vitest';
import { typedNumber } from './Klas';

describe('typed answers on the class board', () => {
  it.each([
    ['40', 40],
    [' 40 ', 40],
    ['2,5', 2.5],
    ['2.5', 2.5],
    ['1.000', 1000],
    ['€ 12', 12],
    ['−3', -3],
  ])('%s → %s', (raw, n) => expect(typedNumber(raw)).toBe(n));

  it.each(['', 'veertig', '4o', '1,2,3'])('%s is not a number', (raw) => expect(typedNumber(raw)).toBeNull());
});
