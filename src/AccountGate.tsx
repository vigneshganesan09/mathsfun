import { useState } from 'react';
import { Bolle } from './Art';
import { CheckIcon, NextIcon } from './Icons';
import { authErrorText, cameFromPasswordReset, loginWithPassword, registerAccount, sendPasswordReset, updatePassword } from './cloud';
import './account.css';

type View = 'login' | 'register' | 'forgot' | 'sent' | 'confirm' | 'newpw';

/**
 * The account page shown before the app when online saving is switched on:
 * a parent or teacher logs in (or registers) with email and password.
 */
export default function AccountGate({ onSignedIn }: { onSignedIn: () => void }) {
  const [view, setView] = useState<View>(() => (cameFromPasswordReset() ? 'newpw' : 'login'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }>, next: (r: { needsConfirm?: boolean }) => void) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setError(authErrorText(r.error ?? ''));
    else next(r);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (view === 'login') void run(() => loginWithPassword(email, password, remember), onSignedIn);
    else if (view === 'register')
      void run(
        () => registerAccount(name, email, password, remember),
        (r) => (r.needsConfirm ? setView('confirm') : onSignedIn()),
      );
    else if (view === 'forgot') void run(() => sendPasswordReset(email), () => setView('sent'));
    else if (view === 'newpw') void run(() => updatePassword(password), onSignedIn);
  };

  const title: Record<View, { nl: string; en: string }> = {
    login: { nl: 'Inloggen', en: 'Log in' },
    register: { nl: 'Account aanmaken', en: 'Register' },
    forgot: { nl: 'Wachtwoord vergeten', en: 'Forgot password' },
    sent: { nl: 'Kijk in je mail', en: 'Check your email' },
    confirm: { nl: 'Bevestig je e-mailadres', en: 'Confirm your email' },
    newpw: { nl: 'Nieuw wachtwoord', en: 'New password' },
  };

  return (
    <section className="screen account">
      <div className="account-head">
        <img className="account-logo" src={`${import.meta.env.BASE_URL}logo.webp`} alt="Duddu Learn" width={120} height={120} />
        <div>
          <h1 className="t-title">{title[view].nl}</h1>
          <p className="en">{title[view].en} · voor ouders en leerkrachten / for parents and teachers</p>
        </div>
      </div>

      {(view === 'login' || view === 'register') && (
        <div className="segmented" role="tablist" aria-label="Account">
          <button role="tab" aria-selected={view === 'login'} className={view === 'login' ? 'is-on' : ''} onClick={() => (setView('login'), setError(null))}>
            Inloggen
            <small>Log in</small>
          </button>
          <button role="tab" aria-selected={view === 'register'} className={view === 'register' ? 'is-on' : ''} onClick={() => (setView('register'), setError(null))}>
            Account aanmaken
            <small>Register</small>
          </button>
        </div>
      )}

      {view === 'sent' || view === 'confirm' ? (
        <div className="card account-card">
          <Bolle mood="read" size={96} />
          <p>
            {view === 'sent'
              ? `We hebben een mail gestuurd naar ${email}. Klik op de link om een nieuw wachtwoord te kiezen.`
              : `We hebben een mail gestuurd naar ${email}. Klik op de link om je account te bevestigen, en log daarna in.`}
          </p>
          <p className="en">
            {view === 'sent' ? 'We sent you an email with a link to choose a new password.' : 'We sent you an email: click the link to confirm your account, then log in.'}
          </p>
          <button className="btn btn-primary" onClick={() => setView('login')}>
            Naar inloggen · To log in <NextIcon size={26} />
          </button>
        </div>
      ) : (
        <form className="card account-card" onSubmit={submit}>
          {view === 'register' && (
            <label className="account-field">
              <span className="t-label">Je naam · Your name</span>
              <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} required />
            </label>
          )}
          {view !== 'newpw' && (
            <label className="account-field">
              <span className="t-label">E-mailadres · Email</span>
              <input className="text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
          )}
          {view !== 'forgot' && (
            <label className="account-field">
              <span className="t-label">{view === 'newpw' ? 'Nieuw wachtwoord · New password' : 'Wachtwoord · Password'}</span>
              <input
                className="text-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                minLength={view === 'login' ? undefined : 8}
                required
              />
              {view !== 'login' && <span className="en">Minstens 8 tekens · At least 8 characters</span>}
            </label>
          )}
          {(view === 'login' || view === 'register') && (
            <label className="account-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                Ingelogd blijven op dit apparaat
                <span className="en"> · Stay logged in on this device (otherwise you log in again next time)</span>
              </span>
            </label>
          )}
          {error && (
            <p className="warn" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-wide" type="submit" disabled={busy}>
            {busy ? 'Even geduld… · Please wait…' : view === 'login' ? 'Inloggen · Log in' : view === 'register' ? 'Account aanmaken · Register' : view === 'forgot' ? 'Stuur de link · Send the link' : 'Opslaan · Save'}
            {!busy && <CheckIcon size={26} />}
          </button>
          {view === 'login' && (
            <button type="button" className="link-btn" onClick={() => (setView('forgot'), setError(null))}>
              Wachtwoord vergeten? · Forgot password?
            </button>
          )}
          {view === 'forgot' && (
            <button type="button" className="link-btn" onClick={() => (setView('login'), setError(null))}>
              Terug naar inloggen · Back to log in
            </button>
          )}
        </form>
      )}

      <p className="en account-privacy">
        Het account is van de ouder of leerkracht. Van leerlingen bewaren we alleen de voornaam, de groep en hun resultaten. · The account belongs to the parent or
        teacher; for students we only keep the first name, groep and results.
      </p>
    </section>
  );
}
