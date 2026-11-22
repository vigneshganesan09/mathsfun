// Pure helpers for the optional online backup (src/cloud.ts does the network part).
// No window, no localStorage, no supabase here: everything works on plain values so
// it can be tested with Vitest.

// ---------- local storage key format (same as src/storage.ts) ----------

export const PROFILES_KEY = 'rekenpret.profiles';
export const CURRENT_KEY = 'rekenpret.current';
export const OUTBOX_KEY = 'rekenpret.cloud.outbox';
export const SYNC_META_KEY = 'rekenpret.cloud.sync';

export const profilePrefix = (profileId: string) => `rekenpret.p.${profileId}.`;

/** The shape of a profile in `rekenpret.profiles` (mirrors Profile in src/storage.ts). */
export interface LocalProfile {
  id: string;
  name: string;
  colour: string;
  groep: string;
  createdAt: string;
}

// ---------- students ----------

export interface StudentRow {
  local_id: string;
  name: string;
  colour: string | null;
  groep: string | null;
  teacher: string | null;
}

/** First name only, 1–40 characters (the database checks the same). */
export function cleanName(name: string): string {
  const n = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  return n || 'Kind';
}

export function studentRow(p: LocalProfile, teacher?: string | null): StudentRow {
  return {
    local_id: p.id,
    name: cleanName(p.name),
    colour: p.colour || null,
    groep: p.groep || null,
    teacher: teacher ?? null,
  };
}

/** A profile for a student that came from the cloud and has no snapshot yet. */
export function profileFromStudent(s: StudentRow & { created_at?: string }): LocalProfile {
  return {
    id: s.local_id,
    name: s.name,
    colour: s.colour ?? 'brand',
    groep: s.groep ?? '4',
    createdAt: s.created_at ?? new Date(0).toISOString(),
  };
}

// ---------- snapshots ----------

export interface Snapshot {
  v: 1;
  profile: LocalProfile;
  /** Per-profile entries without the `rekenpret.p.<id>.` prefix, JSON-parsed. */
  entries: Record<string, unknown>;
  /** When this copy last changed (ISO). Used for last-writer-wins. */
  updatedAt: string;
}

function parse(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Build a snapshot from a key → raw value map (e.g. all of localStorage). */
export function buildSnapshot(profile: LocalProfile, storage: Record<string, string | null>, updatedAt: string): Snapshot {
  const prefix = profilePrefix(profile.id);
  const entries: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(storage)) {
    if (!k.startsWith(prefix)) continue;
    const name = k.slice(prefix.length);
    if (!name) continue;
    const v = parse(raw);
    if (v !== undefined) entries[name] = v;
  }
  return { v: 1, profile: { ...profile }, entries, updatedAt };
}

/** Turn a snapshot back into localStorage key → raw JSON string pairs. */
export function restoreSnapshot(s: Snapshot, profileId = s.profile.id): Record<string, string> {
  const prefix = profilePrefix(profileId);
  const out: Record<string, string> = {};
  for (const [name, v] of Object.entries(s.entries)) out[prefix + name] = JSON.stringify(v);
  return out;
}

/** Is this a usable snapshot (from the database, so it is untrusted JSON)? */
export function isSnapshot(x: unknown): x is Snapshot {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<Snapshot>;
  return (
    s.v === 1 &&
    !!s.profile &&
    typeof s.profile.id === 'string' &&
    typeof s.profile.name === 'string' &&
    !!s.entries &&
    typeof s.entries === 'object' &&
    typeof s.updatedAt === 'string'
  );
}

// ---------- merging ----------

type NumMap = Record<string, number>;
interface CompletedLike {
  at: string;
  correct: number;
  total: number;
  times: number;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Per key, keep the highest number (level stars, scores, book percentages). */
export function mergeMax(a: unknown, b: unknown): NumMap {
  const out: NumMap = {};
  for (const m of [a, b]) {
    if (!isObj(m)) continue;
    for (const [k, v] of Object.entries(m)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      out[k] = out[k] === undefined ? v : Math.max(out[k], v);
    }
  }
  return out;
}

/** Per key, keep the record finished most often (then the most recent one). */
export function mergeCompleted(a: unknown, b: unknown): Record<string, CompletedLike> {
  const out: Record<string, CompletedLike> = {};
  for (const m of [a, b]) {
    if (!isObj(m)) continue;
    for (const [k, v] of Object.entries(m)) {
      if (!isObj(v) || typeof v.times !== 'number') continue;
      const c = v as unknown as CompletedLike;
      const cur = out[k];
      if (!cur || c.times > cur.times || (c.times === cur.times && String(c.at) > String(cur.at))) out[k] = c;
    }
  }
  return out;
}

/** Keys whose values only ever grow: merged per key instead of last-writer-wins. */
export const MAX_KEYS = ['levels', 'stars', 'books'] as const;
/** Settings that belong to the device (installed voices), never taken from another device. */
const DEVICE_SETTINGS = ['voiceNl', 'voiceEn'];

/**
 * Merge two copies of the same child. The newer copy (by updatedAt) wins, except that
 * level stars, scores and book bests keep the maximum and finished lessons keep the most
 * finishes. Voices chosen on this device stay.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  const localWins = local.updatedAt >= remote.updatedAt;
  const winner = localWins ? local : remote;
  const entries: Record<string, unknown> = { ...(localWins ? remote.entries : local.entries), ...winner.entries };
  for (const k of MAX_KEYS) {
    if (k in local.entries || k in remote.entries) entries[k] = mergeMax(local.entries[k], remote.entries[k]);
  }
  if ('completed' in local.entries || 'completed' in remote.entries) {
    entries.completed = mergeCompleted(local.entries.completed, remote.entries.completed);
  }
  const ls = local.entries.settings;
  if (isObj(entries.settings) && isObj(ls)) {
    const s = { ...entries.settings };
    for (const k of DEVICE_SETTINGS) if (k in ls) s[k] = ls[k];
    entries.settings = s;
  }
  return {
    v: 1,
    profile: { ...winner.profile, id: local.profile.id },
    entries,
    updatedAt: winner.updatedAt,
  };
}

// ---------- hashing (change detection, stable ids) ----------

/** JSON with sorted object keys, so equal data gives equal text. */
export function stableStringify(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stableStringify).join(',')}]`;
  if (isObj(x)) {
    return `{${Object.keys(x)
      .sort()
      .filter((k) => x[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(x[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

function hash32(s: string, seed: number): number {
  let h = seed ^ 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Short fingerprint of a snapshot's entries + profile (not of updatedAt). */
export function snapshotHash(s: Snapshot): string {
  const text = stableStringify({ p: s.profile, e: s.entries });
  return hash32(text, 1).toString(36) + hash32(text, 2).toString(36);
}

/** A deterministic UUID-shaped id for a string (so re-uploads of the same event dedupe). */
export function stableUuid(s: string): string {
  const hex = [1, 2, 3, 4].map((seed) => hash32(s, seed).toString(16).padStart(8, '0')).join('');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// ---------- completions ----------

export type CompletionKind = 'level' | 'lesson' | 'table_learn' | 'table_test' | 'test' | 'book' | 'tijd';
export const COMPLETION_KINDS: readonly CompletionKind[] = ['level', 'lesson', 'table_learn', 'table_test', 'test', 'book', 'tijd'];

export interface CompletionEvent {
  kind: CompletionKind;
  item: string;
  level?: number;
  correct: number;
  total: number;
  stars?: number;
  pct?: number;
}

export interface CompletionRow {
  client_id: string;
  student_id: string;
  kind: CompletionKind;
  item: string;
  level: number | null;
  correct: number;
  total: number;
  stars: number | null;
  pct: number | null;
  completed_at: string;
}

const int = (n: number | undefined): number | null => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null);

export function completionRow(e: CompletionEvent, studentId: string, clientId: string, at: string): CompletionRow {
  return {
    client_id: clientId,
    student_id: studentId,
    kind: e.kind,
    item: String(e.item).slice(0, 200),
    level: int(e.level),
    correct: int(e.correct) ?? 0,
    total: int(e.total) ?? 0,
    stars: int(e.stars),
    pct: int(e.pct),
    completed_at: at,
  };
}

/**
 * Events for what a child already finished before the account existed, from a snapshot's
 * `completed` and `levels` entries. Each gets a stable client id, so uploading twice is harmless.
 */
export function backfillEvents(s: Snapshot): OutboxItem[] {
  const out: OutboxItem[] = [];
  const pid = s.profile.id;
  const completed = s.entries.completed;
  if (isObj(completed)) {
    for (const [key, v] of Object.entries(completed)) {
      if (!isObj(v)) continue;
      const c = v as unknown as CompletedLike;
      let kind: CompletionKind | null = null;
      let item = key;
      if (key.startsWith('lesson:')) [kind, item] = ['lesson', key.slice(7)];
      else if (key.startsWith('table-learn:')) [kind, item] = ['table_learn', key.slice(12)];
      if (!kind) continue;
      const at = typeof c.at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.at) ? (c.at.length === 10 ? `${c.at}T12:00:00.000Z` : c.at) : s.updatedAt;
      out.push({
        client_id: stableUuid(`${pid}|${key}|${c.times}`),
        profile_id: pid,
        at,
        event: { kind, item, correct: Number(c.correct) || 0, total: Number(c.total) || 0 },
      });
    }
  }
  const levels = s.entries.levels;
  if (isObj(levels)) {
    for (const [key, stars] of Object.entries(levels)) {
      const i = key.lastIndexOf(':');
      if (i <= 0 || typeof stars !== 'number') continue;
      const level = Number(key.slice(i + 1));
      out.push({
        client_id: stableUuid(`${pid}|level|${key}|${stars}`),
        profile_id: pid,
        at: s.updatedAt,
        event: { kind: 'level', item: key.slice(0, i), level: Number.isFinite(level) ? level : undefined, correct: 0, total: 0, stars },
      });
    }
  }
  return out;
}

// ---------- outbox (events waiting to be uploaded) ----------

export interface OutboxItem {
  client_id: string;
  profile_id: string;
  /** ISO time the child finished it. */
  at: string;
  event: CompletionEvent;
}

export type Outbox = OutboxItem[];

/** Keep the outbox small even if the device is offline for a long time. */
export const OUTBOX_MAX = 1000;

export function parseOutbox(raw: string | null | undefined): Outbox {
  const v = parse(raw);
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is OutboxItem =>
      isObj(x) &&
      typeof x.client_id === 'string' &&
      typeof x.profile_id === 'string' &&
      typeof x.at === 'string' &&
      isObj(x.event) &&
      COMPLETION_KINDS.includes((x.event as { kind: CompletionKind }).kind),
  );
}

export const serializeOutbox = (o: Outbox): string => JSON.stringify(o);

/** Add items (ignoring ones already queued); the oldest drop off past OUTBOX_MAX. */
export function addToOutbox(o: Outbox, ...items: OutboxItem[]): Outbox {
  const seen = new Set(o.map((x) => x.client_id));
  const next = [...o];
  for (const it of items) {
    if (seen.has(it.client_id)) continue;
    seen.add(it.client_id);
    next.push(it);
  }
  return next.length > OUTBOX_MAX ? next.slice(next.length - OUTBOX_MAX) : next;
}

export function takeBatch(o: Outbox, size = 100): OutboxItem[] {
  return o.slice(0, Math.max(0, size));
}

/** Remove items that were uploaded. */
export function markSent(o: Outbox, clientIds: Iterable<string>): Outbox {
  const sent = new Set(clientIds);
  return o.filter((x) => !sent.has(x.client_id));
}

// ---------- per-device sync bookkeeping ----------

export interface SyncMeta {
  /** When the last full sync finished (ISO). */
  lastSync: string | null;
  /** Per local profile: its cloud student id and the hash last uploaded. */
  profiles: Record<string, { studentId: string; hash: string; syncedAt: string }>;
}

export function parseSyncMeta(raw: string | null | undefined): SyncMeta {
  const v = parse(raw);
  if (!isObj(v)) return { lastSync: null, profiles: {} };
  return {
    lastSync: typeof v.lastSync === 'string' ? v.lastSync : null,
    profiles: isObj(v.profiles) ? (v.profiles as SyncMeta['profiles']) : {},
  };
}

/**
 * When did this device's copy last change? If it is unchanged since the last upload,
 * it is as old as that upload (so a newer copy in the cloud wins); otherwise it is new.
 */
export function localUpdatedAt(hash: string, meta: SyncMeta['profiles'][string] | undefined, now: string): string {
  return meta && meta.hash === hash ? meta.syncedAt : now;
}
