import { describe, expect, it } from 'vitest';
import {
  addToOutbox,
  backfillEvents,
  buildSnapshot,
  cleanName,
  completionRow,
  isSnapshot,
  localUpdatedAt,
  markSent,
  mergeSnapshots,
  OUTBOX_MAX,
  parseOutbox,
  parseSyncMeta,
  profileFromStudent,
  restoreSnapshot,
  serializeOutbox,
  snapshotHash,
  stableUuid,
  studentRow,
  takeBatch,
  type LocalProfile,
  type OutboxItem,
  type Snapshot,
} from './cloudSync';

const profile: LocalProfile = { id: 'pabc', name: '  Noor  ', colour: 'sun', groep: '4', createdAt: '2026-01-01T00:00:00.000Z' };

const storage: Record<string, string | null> = {
  'rekenpret.profiles': JSON.stringify([profile]),
  'rekenpret.current': JSON.stringify('pabc'),
  'rekenpret.p.pabc.settings': JSON.stringify({ english: 'tap', voiceNl: 'local-voice', teacher: 'bolle' }),
  'rekenpret.p.pabc.levels': JSON.stringify({ 'plus:1': 2, 'min:2': 3 }),
  'rekenpret.p.pabc.completed': JSON.stringify({ 'lesson:breuk-1': { at: '2026-11-20', correct: 8, total: 10, times: 1 } }),
  'rekenpret.p.pabc.readingLevel': JSON.stringify('avi-m3'),
  'rekenpret.p.other.levels': JSON.stringify({ 'plus:1': 1 }),
  'rekenpret.p.pabc.broken': '{not json',
};

const snap = (entries: Record<string, unknown>, updatedAt: string, name = 'Noor'): Snapshot => ({
  v: 1,
  profile: { ...profile, name },
  entries,
  updatedAt,
});

describe('students', () => {
  it('builds a row with a trimmed first name', () => {
    expect(studentRow(profile, 'bolle')).toEqual({ local_id: 'pabc', name: 'Noor', colour: 'sun', groep: '4', teacher: 'bolle' });
  });
  it('keeps names within 1–40 characters', () => {
    expect(cleanName('   ')).toBe('Kind');
    expect(cleanName('x'.repeat(60))).toHaveLength(40);
  });
  it('makes a local profile from a cloud row', () => {
    expect(profileFromStudent({ local_id: 'p1', name: 'Sem', colour: null, groep: null, teacher: null })).toMatchObject({ id: 'p1', name: 'Sem', colour: 'brand', groep: '4' });
  });
});

describe('snapshots', () => {
  it('only takes this profile’s keys and strips the prefix', () => {
    const s = buildSnapshot(profile, storage, '2026-11-22T10:00:00.000Z');
    expect(Object.keys(s.entries).sort()).toEqual(['broken', 'completed', 'levels', 'readingLevel', 'settings']);
    expect(s.entries.levels).toEqual({ 'plus:1': 2, 'min:2': 3 });
    expect(s.entries.broken).toBe('{not json');
    expect(isSnapshot(s)).toBe(true);
  });
  it('restores back to the same key/values', () => {
    const s = buildSnapshot(profile, storage, '2026-11-22T10:00:00.000Z');
    const back = restoreSnapshot(s);
    expect(JSON.parse(back['rekenpret.p.pabc.levels'])).toEqual({ 'plus:1': 2, 'min:2': 3 });
    expect(back['rekenpret.p.pabc.readingLevel']).toBe(storage['rekenpret.p.pabc.readingLevel']);
    expect(Object.keys(back).every((k) => k.startsWith('rekenpret.p.pabc.'))).toBe(true);
    expect(Object.keys(restoreSnapshot(s, 'pnew'))[0]).toMatch(/^rekenpret\.p\.pnew\./);
  });
  it('rejects junk', () => {
    expect(isSnapshot(null)).toBe(false);
    expect(isSnapshot({ v: 2 })).toBe(false);
  });
  it('hash ignores key order and updatedAt', () => {
    const a = snap({ levels: { a: 1, b: 2 } }, '2026-01-01');
    const b = snap({ levels: { b: 2, a: 1 } }, '2026-02-02');
    expect(snapshotHash(a)).toBe(snapshotHash(b));
    expect(snapshotHash(a)).not.toBe(snapshotHash(snap({ levels: { a: 2, b: 2 } }, '2026-01-01')));
  });
});

describe('merge', () => {
  const local = snap(
    {
      settings: { english: 'tap', voiceNl: 'mac-voice' },
      levels: { 'plus:1': 3, 'min:1': 1 },
      books: { b1: 60 },
      completed: { 'lesson:a': { at: '2026-11-01', correct: 5, total: 10, times: 1 } },
      readingLevel: 'avi-start',
    },
    '2026-11-01T00:00:00.000Z',
  );
  const remote = snap(
    {
      settings: { english: 'always', voiceNl: 'ipad-voice' },
      levels: { 'plus:1': 1, 'min:1': 2, 'keer:3': 1 },
      books: { b1: 90 },
      completed: {
        'lesson:a': { at: '2026-11-10', correct: 9, total: 10, times: 2 },
        'table-learn:7': { at: '2026-11-10', correct: 10, total: 10, times: 1 },
      },
      readingLevel: 'avi-m3',
    },
    '2026-11-10T00:00:00.000Z',
    'Noor B',
  );

  it('newer copy wins for plain values, but stars keep the max', () => {
    const m = mergeSnapshots(local, remote);
    expect(m.entries.readingLevel).toBe('avi-m3');
    expect(m.entries.levels).toEqual({ 'plus:1': 3, 'min:1': 2, 'keer:3': 1 });
    expect(m.entries.books).toEqual({ b1: 90 });
    expect(m.updatedAt).toBe(remote.updatedAt);
    expect(m.profile.name).toBe('Noor B');
    expect(m.profile.id).toBe('pabc');
  });
  it('completions keep the most finishes', () => {
    const m = mergeSnapshots(local, remote);
    expect((m.entries.completed as Record<string, { times: number }>)['lesson:a'].times).toBe(2);
    expect(Object.keys(m.entries.completed as object).sort()).toEqual(['lesson:a', 'table-learn:7']);
  });
  it('keeps this device’s voices', () => {
    const m = mergeSnapshots(local, remote);
    expect(m.entries.settings).toEqual({ english: 'always', voiceNl: 'mac-voice' });
  });
  it('local wins when it is newer', () => {
    const m = mergeSnapshots({ ...local, updatedAt: '2026-12-01T00:00:00.000Z' }, remote);
    expect(m.entries.readingLevel).toBe('avi-start');
    expect(m.profile.name).toBe('Noor');
  });
  it('keeps keys that exist on one side only', () => {
    const m = mergeSnapshots(snap({ words: { a: 1 } }, '2026-01-02'), snap({ skills: { s: 1 } }, '2026-01-01'));
    expect(m.entries).toEqual({ words: { a: 1 }, skills: { s: 1 } });
  });
  it('local updatedAt is old when nothing changed since the last upload', () => {
    const meta = { studentId: 'u', hash: 'h1', syncedAt: '2026-01-01' };
    expect(localUpdatedAt('h1', meta, '2026-11-22')).toBe('2026-01-01');
    expect(localUpdatedAt('h2', meta, '2026-11-22')).toBe('2026-11-22');
    expect(localUpdatedAt('h1', undefined, '2026-11-22')).toBe('2026-11-22');
  });
});

describe('completions', () => {
  it('maps an event to a row', () => {
    const row = completionRow({ kind: 'table_test', item: '7', correct: 9.4, total: 10, pct: 94 }, 'stu', 'cid', '2026-11-22T10:00:00.000Z');
    expect(row).toEqual({
      client_id: 'cid',
      student_id: 'stu',
      kind: 'table_test',
      item: '7',
      level: null,
      correct: 9,
      total: 10,
      stars: null,
      pct: 94,
      completed_at: '2026-11-22T10:00:00.000Z',
    });
  });
  it('stable uuids look like uuids and repeat', () => {
    const u = stableUuid('pabc|lesson:a|1');
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(stableUuid('pabc|lesson:a|1')).toBe(u);
    expect(stableUuid('pabc|lesson:a|2')).not.toBe(u);
  });
  it('backfills finished lessons, table learning and level stars', () => {
    const s = buildSnapshot(profile, storage, '2026-11-22T10:00:00.000Z');
    const ev = backfillEvents(s);
    expect(ev.map((e) => e.event.kind).sort()).toEqual(['lesson', 'level', 'level']);
    const lesson = ev.find((e) => e.event.kind === 'lesson')!;
    expect(lesson.event).toMatchObject({ item: 'breuk-1', correct: 8, total: 10 });
    expect(lesson.at).toBe('2026-11-20T12:00:00.000Z');
    expect(ev.find((e) => e.event.item === 'min')!.event).toMatchObject({ level: 2, stars: 3 });
    expect(backfillEvents(s).map((e) => e.client_id)).toEqual(ev.map((e) => e.client_id));
  });
});

describe('outbox', () => {
  const item = (n: number): OutboxItem => ({
    client_id: `c${n}`,
    profile_id: 'pabc',
    at: '2026-11-22T10:00:00.000Z',
    event: { kind: 'level', item: 'plus', level: 1, correct: 9, total: 10, stars: 3 },
  });

  it('adds, takes a batch and marks sent', () => {
    let o = addToOutbox([], item(1), item(2), item(3));
    o = addToOutbox(o, item(2));
    expect(o).toHaveLength(3);
    const batch = takeBatch(o, 2);
    expect(batch.map((x) => x.client_id)).toEqual(['c1', 'c2']);
    o = markSent(o, batch.map((x) => x.client_id));
    expect(o.map((x) => x.client_id)).toEqual(['c3']);
  });
  it('round-trips as JSON and drops junk', () => {
    const o = addToOutbox([], item(1));
    expect(parseOutbox(serializeOutbox(o))).toEqual(o);
    expect(parseOutbox(null)).toEqual([]);
    expect(parseOutbox('{bad')).toEqual([]);
    expect(parseOutbox(JSON.stringify([{ client_id: 'x' }, { ...item(5), event: { kind: 'nope' } }, item(6)]))).toHaveLength(1);
  });
  it('is capped', () => {
    const many = Array.from({ length: OUTBOX_MAX + 5 }, (_, i) => item(i));
    const o = addToOutbox([], ...many);
    expect(o).toHaveLength(OUTBOX_MAX);
    expect(o[0].client_id).toBe('c5');
  });
  it('sync meta parses safely', () => {
    expect(parseSyncMeta(null)).toEqual({ lastSync: null, profiles: {} });
    expect(parseSyncMeta(JSON.stringify({ lastSync: 'x', profiles: { a: { studentId: 's', hash: 'h', syncedAt: 't' } } })).profiles.a.studentId).toBe('s');
  });
});
