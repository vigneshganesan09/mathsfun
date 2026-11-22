import { useEffect, useState } from 'react';
import {
  cachedCloudUser,
  CLOUD_RESTORED_EVENT,
  cloudConfigured,
  deleteCloudData,
  getCloudUser,
  lastCloudSync,
  onCloudAuth,
  signInWithEmail,
  signOut,
  syncNow,
  type CloudUser,
  type SyncResult,
} from './cloud';
import './cloud.css';

interface Text {
  nl: string;
  en: string;
}

const T = {
  title: { nl: 'Online opslaan', en: 'Save online' },
  off: {
    nl: 'Online opslaan staat uit. De eigenaar van de app kan het aanzetten (zie docs/DATABASE.md). Alles blijft op dit apparaat bewaard.',
    en: 'Saving online is switched off. The owner of the app can switch it on (see docs/DATABASE.md). Everything stays saved on this device.',
  },
  intro: {
    nl: 'Bewaar de voortgang van je kinderen in je eigen ouder-account en zet hem op een ander apparaat terug. Alleen voornamen worden opgeslagen.',
    en: "Keep your children's progress in your own parent account and bring it back on another device. Only first names are stored.",
  },
  email: { nl: 'E-mailadres van de ouder', en: "Parent's email address" },
  send: { nl: 'Stuur inloglink', en: 'Send sign-in link' },
  sending: { nl: 'Even geduld…', en: 'One moment…' },
  sent: { nl: 'Kijk in je mail en tik op de link om in te loggen.', en: 'Check your email and tap the link to sign in.' },
  badEmail: { nl: 'Dat lijkt geen e-mailadres. Kijk nog eens?', en: "That doesn't look like an email address. Have another look?" },
  failed: { nl: 'Dat lukte nu niet. Probeer het straks nog eens.', en: "That didn't work right now. Please try again later." },
  signedIn: { nl: 'Ingelogd als', en: 'Signed in as' },
  lastSync: { nl: 'Laatst gesynchroniseerd', en: 'Last synced' },
  never: { nl: 'nog niet', en: 'not yet' },
  sync: { nl: 'Nu synchroniseren', en: 'Sync now' },
  syncing: { nl: 'Bezig…', en: 'Syncing…' },
  offline: { nl: 'Geen internet. Het wordt later verstuurd.', en: 'No internet. It will be sent later.' },
  signOut: { nl: 'Uitloggen', en: 'Sign out' },
  del: { nl: 'Verwijder online gegevens', en: 'Delete online data' },
  delAsk: {
    nl: 'Alle online gegevens van je kinderen worden gewist. Wat op dit apparaat staat, blijft. Dit kan niet ongedaan worden gemaakt.',
    en: "All your children's online data will be erased. What is on this device stays. This cannot be undone.",
  },
  delAccount: { nl: 'Verwijder ook mijn account', en: 'Also delete my account' },
  delYes: { nl: 'Ja, verwijder', en: 'Yes, delete' },
  cancel: { nl: 'Annuleer', en: 'Cancel' },
  deleted: { nl: 'De online gegevens zijn verwijderd.', en: 'The online data has been deleted.' },
} satisfies Record<string, Text>;

const both = (t: Text) => `${t.nl} · ${t.en}`;

function Bi({ t, english, className = '' }: { t: Text; english: boolean; className?: string }) {
  return (
    <p className={className}>
      {t.nl}
      {english && <span className="en cloud-en">{t.en}</span>}
    </p>
  );
}

function syncText(r: SyncResult): Text {
  if (r.error === 'offline') return T.offline;
  if (r.error) return T.failed;
  return {
    nl: `Klaar: ${r.uploaded.toLocaleString('nl-NL')} verstuurd, ${r.restored.toLocaleString('nl-NL')} teruggezet.`,
    en: `Done: ${r.uploaded.toLocaleString('nl-NL')} sent, ${r.restored.toLocaleString('nl-NL')} restored.`,
  };
}

function when(iso: string | null): Text {
  if (!iso) return T.never;
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
  return { nl: d.toLocaleString('nl-NL', opts), en: d.toLocaleString('en-GB', opts) };
}

export function CloudAccount({ english }: { english: boolean }) {
  const [user, setUser] = useState<CloudUser | null>(() => cachedCloudUser());
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Text | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [last, setLast] = useState<string | null>(() => (cloudConfigured ? lastCloudSync() : null));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alsoAccount, setAlsoAccount] = useState(false);

  useEffect(() => {
    if (!cloudConfigured) return;
    let alive = true;
    void getCloudUser().then((u) => alive && setUser(u));
    const stop = onCloudAuth((u) => {
      if (!alive) return;
      setUser(u);
      if (u) setLinkSent(false);
    });
    const onRestored = () => setLast(lastCloudSync());
    window.addEventListener(CLOUD_RESTORED_EVENT, onRestored);
    return () => {
      alive = false;
      stop();
      window.removeEventListener(CLOUD_RESTORED_EVENT, onRestored);
    };
  }, []);

  if (!cloudConfigured) {
    return (
      <div className="card cloud-card">
        <h2 className="t-label">{both(T.title)}</h2>
        <Bi t={T.off} english={english} className="muted" />
      </div>
    );
  }

  const sendLink = async () => {
    setBusy(true);
    setNote(null);
    const r = await signInWithEmail(email);
    setBusy(false);
    if (r.ok) setLinkSent(true);
    else setNote(r.error === 'invalid-email' ? T.badEmail : T.failed);
  };

  const sync = async () => {
    setBusy(true);
    setNote(null);
    const r = await syncNow();
    setBusy(false);
    setLast(lastCloudSync());
    setNote(syncText(r));
  };

  const doDelete = async () => {
    setBusy(true);
    setNote(null);
    const r = await deleteCloudData({ account: alsoAccount });
    setBusy(false);
    setConfirmDelete(false);
    setAlsoAccount(false);
    setLast(lastCloudSync());
    setNote(r.ok ? T.deleted : T.failed);
    if (r.ok && alsoAccount) setUser(null);
  };

  return (
    <div className="card cloud-card">
      <h2 className="t-label">{both(T.title)}</h2>

      {!user && (
        <>
          <Bi t={T.intro} english={english} className="muted" />
          {linkSent ? (
            <div className="warn cloud-sent" role="status">
              <span aria-hidden="true">✉️ </span>
              {T.sent.nl}
              {english && <span className="en cloud-en">{T.sent.en}</span>}
            </div>
          ) : (
            <form
              className="cloud-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) void sendLink();
              }}
            >
              <label className="t-label muted" htmlFor="cloud-email">
                {both(T.email)}
              </label>
              <input
                id="cloud-email"
                className="text-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                maxLength={254}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>
                {busy ? both(T.sending) : both(T.send)}
              </button>
            </form>
          )}
        </>
      )}

      {user && (
        <>
          <dl className="cloud-facts">
            <dt className="t-label muted">{both(T.signedIn)}</dt>
            <dd className="cloud-email">{user.email ?? '—'}</dd>
            <dt className="t-label muted">{both(T.lastSync)}</dt>
            <dd>
              {when(last).nl}
              {english && <span className="en cloud-en">{when(last).en}</span>}
            </dd>
          </dl>
          <div className="btn-pair">
            <button className="btn btn-primary" disabled={busy} onClick={() => void sync()}>
              {busy ? both(T.syncing) : both(T.sync)}
            </button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => void signOut().then(() => setUser(null))}>
              {both(T.signOut)}
            </button>
          </div>

          {!confirmDelete ? (
            <button className="btn btn-secondary cloud-delete" disabled={busy} onClick={() => setConfirmDelete(true)}>
              {both(T.del)}
            </button>
          ) : (
            <div className="warn cloud-confirm" role="alertdialog" aria-label={both(T.del)}>
              <p>
                <span aria-hidden="true">⚠️ </span>
                {T.delAsk.nl}
                {english && <span className="en cloud-en">{T.delAsk.en}</span>}
              </p>
              <label className="cloud-check">
                <input type="checkbox" checked={alsoAccount} onChange={(e) => setAlsoAccount(e.target.checked)} />
                <span>{both(T.delAccount)}</span>
              </label>
              <div className="btn-pair">
                <button className="btn btn-primary" disabled={busy} onClick={() => void doDelete()}>
                  {both(T.delYes)}
                </button>
                <button className="btn btn-secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>
                  {both(T.cancel)}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {note && (
        <p className="cloud-note" role="status">
          {note.nl}
          {english && <span className="en cloud-en">{note.en}</span>}
        </p>
      )}
    </div>
  );
}
