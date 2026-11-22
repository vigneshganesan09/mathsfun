// Optional online backup for a parent/teacher account (Supabase, see docs/DATABASE.md).
// Only active when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY were set at build time;
// otherwise everything here is a no-op and @supabase/supabase-js is never loaded.
// Nothing in here throws into the UI: failures are logged and returned as gentle results.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  addToOutbox,
  backfillEvents,
  buildSnapshot,
  completionRow,
  CURRENT_KEY,
  isSnapshot,
  localUpdatedAt,
  markSent,
  mergeSnapshots,
  OUTBOX_KEY,
  parseOutbox,
  parseSyncMeta,
  profileFromStudent,
  PROFILES_KEY,
  restoreSnapshot,
  serializeOutbox,
  snapshotHash,
  stableUuid,
  studentRow,
  SYNC_META_KEY,
  takeBatch,
  type CompletionEvent,
  type CompletionRow,
  type LocalProfile,
  type OutboxItem,
  type Snapshot,
  type SyncMeta,
} from './cloudSync';

const URL_ = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const cloudConfigured: boolean = !!URL_ && !!KEY_;

/** Set while a parent is signed in on this device (so cloudRecord need not load the library). */
const USER_KEY = 'rekenpret.cloud.user';
export const CLOUD_RESTORED_EVENT = 'rekenpret:cloud-restored';

export interface CloudUser {
  id: string;
  email: string | null;
}

export interface SyncResult {
  uploaded: number;
  restored: number;
  /** A short reason when the sync could not (fully) run. */
  error?: string;
}

// ---------- small localStorage helpers (same format as src/storage.ts) ----------

function getRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked or full
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function readJson<T>(key: string, fallback: T): T {
  const raw = getRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function allStorage(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rekenpret.p.')) out[k] = localStorage.getItem(k);
    }
  } catch {
    // ignore
  }
  return out;
}

const loadProfiles = (): LocalProfile[] => {
  const p = readJson<unknown>(PROFILES_KEY, []);
  return Array.isArray(p) ? (p as LocalProfile[]) : [];
};
const saveProfiles = (p: LocalProfile[]) => setRaw(PROFILES_KEY, JSON.stringify(p));
const loadMeta = (): SyncMeta => parseSyncMeta(getRaw(SYNC_META_KEY));
const saveMeta = (m: SyncMeta) => setRaw(SYNC_META_KEY, JSON.stringify(m));
const loadOutbox = () => parseOutbox(getRaw(OUTBOX_KEY));
const saveOutbox = (o: OutboxItem[]) => setRaw(OUTBOX_KEY, serializeOutbox(o));

function teacherOf(entries: Record<string, unknown>): string | null {
  const s = entries.settings as { teacher?: unknown } | undefined;
  return s && typeof s.teacher === 'string' ? s.teacher : null;
}

function errText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // fall through
  }
  return stableUuid(`${Date.now()}|${Math.random()}|${Math.random()}`);
}

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

// ---------- login session: this browser session only, unless "stay logged in" ----------

const REMEMBER_KEY = 'rekenpret.cloud.remember';

/** Stay logged in on this device? Off by default: the login ends when the app or browser is closed. */
export function rememberLogin(): boolean {
  return readJson<boolean>(REMEMBER_KEY, false);
}

function setRemember(on: boolean): void {
  setRaw(REMEMBER_KEY, JSON.stringify(on));
}

function store(): Storage | null {
  try {
    return rememberLogin() ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

/** Where Supabase keeps the session: localStorage when remembered, otherwise sessionStorage. */
const authStorage = {
  getItem: (k: string) => {
    try {
      return store()?.getItem(k) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      store()?.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

// ---------- the client (loaded on demand) ----------

let clientPromise: Promise<SupabaseClient | null> | null = null;

function getClient(): Promise<SupabaseClient | null> {
  if (!cloudConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        const c = createClient(URL_, KEY_, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'rekenpret.cloud.auth', storage: authStorage },
        });
        c.auth.onAuthStateChange((_event, session) => {
          if (session?.user) setRaw(USER_KEY, JSON.stringify({ id: session.user.id, email: session.user.email ?? null }));
          else removeRaw(USER_KEY);
        });
        return c;
      })
      .catch((e) => {
        console.warn('[cloud] could not load', e);
        clientPromise = null;
        return null;
      });
  }
  return clientPromise;
}

async function currentUser(c: SupabaseClient): Promise<CloudUser | null> {
  try {
    const { data } = await c.auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email ?? null } : null;
  } catch (e) {
    console.warn('[cloud] session', e);
    return null;
  }
}

/** The signed-in parent, or null (also when cloud is not configured). */
export async function getCloudUser(): Promise<CloudUser | null> {
  const c = await getClient();
  return c ? currentUser(c) : null;
}

/** The parent remembered on this device, without loading anything (may be stale). */
export function cachedCloudUser(): CloudUser | null {
  return cloudConfigured ? readJson<CloudUser | null>(USER_KEY, null) : null;
}

/** Listen for sign-in / sign-out. Returns an unsubscribe function. */
export function onCloudAuth(cb: (user: CloudUser | null) => void): () => void {
  let stop = false;
  let unsub: (() => void) | null = null;
  void getClient().then((c) => {
    if (!c || stop) return;
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      cb(u ? { id: u.id, email: u.email ?? null } : null);
    });
    unsub = () => data.subscription.unsubscribe();
  });
  return () => {
    stop = true;
    unsub?.();
  };
}

export async function signInWithEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const c = await getClient();
  if (!c) return { ok: false, error: 'not-configured' };
  const clean = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, error: 'invalid-email' };
  try {
    const { error } = await c.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: location.origin + import.meta.env.BASE_URL, shouldCreateUser: true },
    });
    if (error) {
      console.warn('[cloud] sign in', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[cloud] sign in', e);
    return { ok: false, error: errText(e) };
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthResult = { ok: true; needsConfirm?: boolean } | { ok: false; error: string };

/** Friendly bilingual text for Supabase auth errors. */
export function authErrorText(e: string): string {
  const m = e.toLowerCase();
  if (m === 'not-configured') return 'Online opslaan staat uit. · Saving online is switched off.';
  if (m === 'invalid-email') return 'Dat e-mailadres klopt niet. · That email address is not valid.';
  if (m === 'short-password') return 'Kies een wachtwoord van minstens 8 tekens. · Choose a password of at least 8 characters.';
  if (m.includes('invalid login')) return 'E-mail of wachtwoord klopt niet. · Email or password is not right.';
  if (m.includes('not confirmed')) return 'Bevestig eerst je e-mailadres via de mail die je kreeg. · Confirm your email address first (check your mail).';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Dit e-mailadres heeft al een account: log in. · This email already has an account: log in.';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Even wachten en dan opnieuw proberen. · Please wait a moment and try again.';
  if (m.includes('fetch') || m.includes('network')) return 'Geen verbinding. Is er internet? · No connection. Is there internet?';
  return `Dat lukte niet: ${e}`;
}

/** Create a parent/teacher account (Supabase may send a confirmation email first). */
export async function registerAccount(name: string, email: string, password: string, remember: boolean): Promise<AuthResult> {
  const c = await getClient();
  if (!c) return { ok: false, error: 'not-configured' };
  const clean = email.trim();
  if (!EMAIL_RE.test(clean)) return { ok: false, error: 'invalid-email' };
  if (password.length < 8) return { ok: false, error: 'short-password' };
  setRemember(remember);
  try {
    const { data, error } = await c.auth.signUp({
      email: clean,
      password,
      options: { data: { full_name: name.trim().slice(0, 60) }, emailRedirectTo: location.origin + import.meta.env.BASE_URL },
    });
    if (error) return { ok: false, error: error.message };
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, error: 'already registered' };
    return { ok: true, needsConfirm: !data.session };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
}

/** Log in with email and password. */
export async function loginWithPassword(email: string, password: string, remember: boolean): Promise<AuthResult> {
  const c = await getClient();
  if (!c) return { ok: false, error: 'not-configured' };
  const clean = email.trim();
  if (!EMAIL_RE.test(clean)) return { ok: false, error: 'invalid-email' };
  setRemember(remember);
  try {
    const { error } = await c.auth.signInWithPassword({ email: clean, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
}

/** Forgot the password: email a link to set a new one (the app then asks for it). */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const c = await getClient();
  if (!c) return { ok: false, error: 'not-configured' };
  const clean = email.trim();
  if (!EMAIL_RE.test(clean)) return { ok: false, error: 'invalid-email' };
  try {
    const { error } = await c.auth.resetPasswordForEmail(clean, { redirectTo: location.origin + import.meta.env.BASE_URL });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
}

/** Set a new password (after following the reset link). */
export async function updatePassword(password: string): Promise<AuthResult> {
  const c = await getClient();
  if (!c) return { ok: false, error: 'not-configured' };
  if (password.length < 8) return { ok: false, error: 'short-password' };
  try {
    const { error } = await c.auth.updateUser({ password });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
}

/** True while the page was opened from a "new password" email link. */
export function cameFromPasswordReset(): boolean {
  return typeof location !== 'undefined' && /type=recovery/.test(location.hash + location.search);
}

/**
 * Log out: save everything online first, then remove the children's data from this
 * device (it comes back at the next login). Returns false if the save failed, so the
 * caller can warn before throwing local data away.
 */
export async function logoutAndClear(force = false): Promise<boolean> {
  const r = await syncNow();
  if (r.error && !force) return false;
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('rekenpret.p.') || k === 'rekenpret.profiles' || k === 'rekenpret.current' || k === SYNC_META_KEY || k === OUTBOX_KEY)
        localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
  await signOut();
  return true;
}

export async function signOut(): Promise<void> {
  removeRaw(USER_KEY);
  const c = await getClient();
  if (!c) return;
  try {
    await c.auth.signOut();
  } catch (e) {
    console.warn('[cloud] sign out', e);
  }
}

/** When the last full sync on this device finished (ISO), or null. */
export const lastCloudSync = (): string | null => loadMeta().lastSync;

// ---------- sync ----------

interface StudentDb {
  id: string;
  local_id: string;
  name: string;
  colour: string | null;
  groep: string | null;
  teacher: string | null;
  created_at: string;
}

let syncing: Promise<SyncResult> | null = null;

/** Upload every child on this device, bring back children from other devices, flush the outbox. */
export function syncNow(): Promise<SyncResult> {
  if (!syncing) syncing = doSync().finally(() => (syncing = null));
  return syncing;
}

async function doSync(): Promise<SyncResult> {
  const result: SyncResult = { uploaded: 0, restored: 0 };
  try {
    const c = await getClient();
    if (!c) return { ...result, error: 'not-configured' };
    const user = await currentUser(c);
    if (!user) return { ...result, error: 'signed-out' };
    if (!online()) return { ...result, error: 'offline' };

    const now = new Date().toISOString();
    const meta = loadMeta();
    let profiles = loadProfiles();
    const storage = allStorage();

    const studentsRes = await c.from('students').select('id, local_id, name, colour, groep, teacher, created_at');
    if (studentsRes.error) throw studentsRes.error;
    const remoteStudents = (studentsRes.data ?? []) as StudentDb[];
    const stateRes = await c.from('student_state').select('student_id, data');
    if (stateRes.error) throw stateRes.error;
    const remoteState = new Map<string, Snapshot>();
    for (const r of (stateRes.data ?? []) as { student_id: string; data: unknown }[]) {
      if (isSnapshot(r.data)) remoteState.set(r.student_id, r.data);
    }
    // 0. Children removed on this device: remove them online too, never bring them back.
    const deleted = new Set(readJson<string[]>('rekenpret.deletedProfiles', []));
    if (deleted.size) {
      const gone = remoteStudents.filter((s) => deleted.has(s.local_id));
      if (gone.length) {
        const del = await c.from('students').delete().in('id', gone.map((s) => s.id));
        if (del.error) throw del.error;
      }
      for (let i = remoteStudents.length - 1; i >= 0; i--) if (deleted.has(remoteStudents[i].local_id)) remoteStudents.splice(i, 1);
      for (const id of deleted) delete meta.profiles[id];
      setRaw('rekenpret.deletedProfiles', JSON.stringify([]));
    }
    const byLocalId = new Map(remoteStudents.map((s) => [s.local_id, s]));

    // 1. Children on this device: merge with their cloud copy.
    const merged: Snapshot[] = [];
    for (const p of profiles) {
      const base = buildSnapshot(p, storage, now);
      const hash = snapshotHash(base);
      const local: Snapshot = { ...base, updatedAt: localUpdatedAt(hash, meta.profiles[p.id], now) };
      const remoteRow = byLocalId.get(p.id);
      const remote = remoteRow ? remoteState.get(remoteRow.id) : undefined;
      const m = remote ? mergeSnapshots(local, remote) : local;
      if (snapshotHash(m) !== hash) {
        writeSnapshot(m);
        result.restored++;
      }
      merged.push(m);
    }
    if (result.restored) {
      const names = new Map(merged.map((m) => [m.profile.id, m.profile]));
      profiles = profiles.map((p) => ({ ...p, ...(names.get(p.id) ?? {}), id: p.id }));
      saveProfiles(profiles);
    }

    // 2. Upsert them as students.
    if (merged.length) {
      const rows = merged.map((m) => studentRow(m.profile, teacherOf(m.entries)));
      const up = await c.from('students').upsert(rows, { onConflict: 'owner,local_id' }).select('id, local_id');
      if (up.error) throw up.error;
      for (const r of (up.data ?? []) as { id: string; local_id: string }[]) {
        const s = byLocalId.get(r.local_id);
        if (s) s.id = r.id;
        else byLocalId.set(r.local_id, { id: r.id, local_id: r.local_id } as StudentDb);
      }
    }

    // 3. Upload snapshots that changed since the last upload (or are missing online).
    const states: { student_id: string; data: Snapshot }[] = [];
    let outbox = loadOutbox();
    for (const m of merged) {
      const sid = byLocalId.get(m.profile.id)?.id;
      if (!sid) continue;
      const hash = snapshotHash(m);
      const prev = meta.profiles[m.profile.id];
      if (!prev || prev.hash !== hash || prev.studentId !== sid || !remoteState.has(sid)) states.push({ student_id: sid, data: m });
      if (!prev) outbox = addToOutbox(outbox, ...backfillEvents(m)); // history from before the account
      meta.profiles[m.profile.id] = { studentId: sid, hash, syncedAt: m.updatedAt };
    }
    if (states.length) {
      const up = await c.from('student_state').upsert(states, { onConflict: 'student_id' });
      if (up.error) throw up.error;
      result.uploaded += states.length;
    }

    // 4. Children that are online but not on this device: bring them here.
    const localIds = new Set(profiles.map((p) => p.id));
    const added: LocalProfile[] = [];
    for (const s of remoteStudents) {
      if (localIds.has(s.local_id)) continue;
      const snap = remoteState.get(s.id);
      const profile: LocalProfile = { ...(snap ? snap.profile : profileFromStudent(s)), id: s.local_id };
      const full: Snapshot = snap ? { ...snap, profile } : { v: 1, profile, entries: {}, updatedAt: now };
      writeSnapshot(full);
      added.push(profile);
      meta.profiles[profile.id] = { studentId: s.id, hash: snapshotHash(full), syncedAt: full.updatedAt };
      result.restored++;
    }
    if (added.length) {
      profiles = [...loadProfiles(), ...added];
      saveProfiles(profiles);
      if (readJson<string | null>(CURRENT_KEY, null) === null) setRaw(CURRENT_KEY, JSON.stringify(added[0].id));
    }

    meta.lastSync = new Date().toISOString();
    saveMeta(meta);
    saveOutbox(outbox);

    // 5. Completions waiting on this device.
    result.uploaded += await flush(c);

    if (result.restored) dispatchRestored();
    return result;
  } catch (e) {
    console.warn('[cloud] sync', e);
    if (result.restored) dispatchRestored();
    return { ...result, error: errText(e) };
  }
}

function writeSnapshot(s: Snapshot): void {
  for (const [k, v] of Object.entries(restoreSnapshot(s))) setRaw(k, v);
}

function dispatchRestored(): void {
  try {
    window.dispatchEvent(new Event(CLOUD_RESTORED_EVENT));
  } catch {
    // ignore
  }
}

// ---------- outbox ----------

let flushing: Promise<number> | null = null;

function flush(c: SupabaseClient): Promise<number> {
  if (!flushing) flushing = doFlush(c).finally(() => (flushing = null));
  return flushing;
}

/** Upload queued completions. Returns how many were sent. */
async function doFlush(c: SupabaseClient): Promise<number> {
  let sent = 0;
  try {
    if (!online() || !(await currentUser(c))) return 0;
    const meta = loadMeta();
    const profiles = loadProfiles();
    const known = new Set(profiles.map((p) => p.id));

    // Make sure every child in the queue exists online.
    const missing = profiles.filter((p) => !meta.profiles[p.id] && loadOutbox().some((x) => x.profile_id === p.id));
    if (missing.length) {
      const storage = allStorage();
      const rows = missing.map((p) => studentRow(p, teacherOf(buildSnapshot(p, storage, '').entries)));
      const up = await c.from('students').upsert(rows, { onConflict: 'owner,local_id' }).select('id, local_id');
      if (up.error) throw up.error;
      for (const r of (up.data ?? []) as { id: string; local_id: string }[]) {
        // hash '' forces the full snapshot upload on the next syncNow.
        meta.profiles[r.local_id] = { studentId: r.id, hash: '', syncedAt: new Date(0).toISOString() };
      }
      saveMeta(meta);
    }

    for (let round = 0; round < 20; round++) {
      // Drop events of children that were removed from this device.
      let outbox = loadOutbox();
      const orphan = outbox.filter((x) => !known.has(x.profile_id)).map((x) => x.client_id);
      if (orphan.length) saveOutbox((outbox = markSent(outbox, orphan)));
      const batch = takeBatch(outbox, 100);
      if (!batch.length) break;
      const rows: CompletionRow[] = [];
      for (const it of batch) {
        const sid = meta.profiles[it.profile_id]?.studentId;
        if (sid) rows.push(completionRow(it.event, sid, it.client_id, it.at));
      }
      if (!rows.length) break;
      const { error } = await c.from('completions').upsert(rows, { onConflict: 'client_id', ignoreDuplicates: true });
      if (error) throw error;
      // Re-read: new events may have been added while uploading.
      saveOutbox(markSent(loadOutbox(), rows.map((r) => r.client_id)));
      sent += rows.length;
    }
  } catch (e) {
    console.warn('[cloud] upload', e);
  }
  return sent;
}

/**
 * Note that the active child finished something. Queued on this device and uploaded in the
 * background when a parent is signed in and the device is online. Never throws.
 */
export function cloudRecord(e: CompletionEvent): void {
  try {
    if (!cloudConfigured || !cachedCloudUser()) return;
    const profileId = readJson<string | null>(CURRENT_KEY, null);
    if (!profileId) return;
    saveOutbox(addToOutbox(loadOutbox(), { client_id: newId(), profile_id: profileId, at: new Date().toISOString(), event: e }));
    if (online()) {
      void getClient().then((c) => (c ? flush(c) : 0));
    }
  } catch (err) {
    console.warn('[cloud] record', err);
  }
}

/**
 * Remove this parent's children (and, by cascade, all their results and snapshots) from the
 * database. With `account: true` the login itself is deleted too. Data on this device stays.
 */
export async function deleteCloudData(opts: { account?: boolean } = {}): Promise<{ ok: boolean; error?: string }> {
  const c = await getClient();
  if (!c) return { ok: false, error: 'not-configured' };
  try {
    const user = await currentUser(c);
    if (!user) return { ok: false, error: 'signed-out' };
    const { error } = await c.from('students').delete().eq('owner', user.id);
    if (error) throw error;
    removeRaw(SYNC_META_KEY);
    removeRaw(OUTBOX_KEY);
    if (opts.account) {
      const r = await c.rpc('delete_my_account');
      if (r.error) throw r.error;
      await signOut();
    }
    return { ok: true };
  } catch (e) {
    console.warn('[cloud] delete', e);
    return { ok: false, error: errText(e) };
  }
}

// ---------- start-up ----------

if (cloudConfigured && typeof window !== 'undefined') {
  // Coming back from the magic link (tokens in the URL), or a parent is signed in here:
  // load the client so it picks up / refreshes the session and sends what is queued.
  const fromLink = /access_token=|refresh_token=|[?&]code=|error_description=/.test(location.hash + location.search);
  if (fromLink || cachedCloudUser()) {
    void getClient().then((c) => {
      if (!c) return;
      if (fromLink) void syncNow();
      else void flush(c);
    });
  }
  window.addEventListener('online', () => {
    if (cachedCloudUser()) void getClient().then((c) => (c ? flush(c) : 0));
  });
}
