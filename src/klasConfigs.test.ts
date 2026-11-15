import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassSetup } from './Klas';
import { loadConfigs, removeConfig, sameSetup, saveConfig } from './klasConfigs';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
});

const setup: ClassSetup = { groepId: '4', topicId: 'plus100', level: 1, count: 15, teams: 1, think: 10, en: true, names: '' };

describe('class configurations', () => {
  it('saves, overwrites by name and removes', () => {
    saveConfig('Maandag rekenen', setup, new Date(1));
    saveConfig('Toets', { ...setup, level: 3 }, new Date(2));
    let list = saveConfig('maandag rekenen', { ...setup, count: 5 }, new Date(3));
    expect(list.map((c) => c.name)).toEqual(['maandag rekenen', 'Toets']);
    expect(list[0].setup.count).toBe(5);
    list = removeConfig(list[1].id);
    expect(loadConfigs()).toHaveLength(1);
  });

  it('compares the lesson settings, not the names list', () => {
    expect(sameSetup(setup, { ...setup, names: 'Noor\nSam' })).toBe(true);
    expect(sameSetup(setup, { ...setup, think: 20 })).toBe(false);
  });
});
