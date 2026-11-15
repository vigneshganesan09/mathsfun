// Saved class-board configurations ("Mijn configuraties"): a teacher stores a lesson setup
// under a name and loads or starts it again with one tap. Kept on this device only.
import type { ClassSetup } from './Klas';

export interface ClassConfig {
  id: string;
  name: string;
  setup: ClassSetup;
  savedAt: string;
}

const KEY = 'rekenpret-class-configs';
const MAX = 24;

export function loadConfigs(): ClassConfig[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as ClassConfig[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function store(list: ClassConfig[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the configuration just isn't kept.
  }
}

/** Save (or overwrite one with the same name). Newest first. */
export function saveConfig(name: string, setup: ClassSetup, now = new Date()): ClassConfig[] {
  const clean = name.trim().slice(0, 40) || 'Mijn les';
  const rest = loadConfigs().filter((c) => c.name.toLowerCase() !== clean.toLowerCase());
  const cfg: ClassConfig = { id: `c${now.getTime().toString(36)}`, name: clean, setup: { ...setup }, savedAt: now.toISOString() };
  const list = [cfg, ...rest].slice(0, MAX);
  store(list);
  return list;
}

export function removeConfig(id: string): ClassConfig[] {
  const list = loadConfigs().filter((c) => c.id !== id);
  store(list);
  return list;
}

/** Same lesson settings (the name list is not compared). */
export function sameSetup(a: ClassSetup, b: ClassSetup): boolean {
  const keys: (keyof ClassSetup)[] = ['groepId', 'topicId', 'level', 'count', 'teams', 'think', 'en'];
  return keys.every((k) => a[k] === b[k]);
}
