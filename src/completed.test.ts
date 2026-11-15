import { beforeEach, describe, expect, it } from 'vitest';
import { getCompleted, lessonKey, markCompleted, tableLearnKey } from './storage';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
});

describe('finished learning', () => {
  it('is closed after the first time and counts retakes', () => {
    expect(getCompleted(lessonKey('erbij'))).toBeUndefined();
    markCompleted(lessonKey('erbij'), 4, 5, '2026-11-15');
    expect(getCompleted(lessonKey('erbij'))).toEqual({ at: '2026-11-15', correct: 4, total: 5, times: 1 });
    markCompleted(lessonKey('erbij'), 5, 5, '2026-11-16');
    expect(getCompleted(lessonKey('erbij'))).toMatchObject({ correct: 5, times: 2, at: '2026-11-16' });
  });

  it('keeps lessons and table learning apart', () => {
    markCompleted(tableLearnKey(7), 10, 10, '2026-11-15');
    expect(getCompleted(tableLearnKey(7))?.total).toBe(10);
    expect(getCompleted(lessonKey('7'))).toBeUndefined();
  });
});
