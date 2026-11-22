# Online opslaan · Save online (Supabase)

Duddu Learn works fully offline: every child's progress lives in the browser (localStorage).
Optionally a **parent or teacher account** can back that up to a hosted PostgreSQL database
(Supabase) and restore it on another device. Children never sign in or type a password; the parent
signs in with an email magic link in the parent area ("Online opslaan · Save online").

When the two build variables below are not set, the app builds and runs exactly as before and the
card only says that the owner can switch it on. The Supabase library is then never downloaded.

## 1. Create the project

1. Sign up at <https://supabase.com> and create a **free** project. Pick an EU region
   (e.g. Frankfurt) so the data stays in the EU.
2. Note the database password somewhere safe (you will not need it in the app).

## 2. Create the tables

Either:

- **SQL editor**: open *SQL Editor → New query*, paste the whole of
  `supabase/migrations/20261122000000_init.sql` and press *Run*; or
- **CLI**: `npx supabase login`, `npx supabase link --project-ref <your-ref>`, then
  `npx supabase db push`.

This creates `students`, `completions`, `student_state`, the `student_progress` view and the
`delete_my_account()` function, all protected by Row Level Security (a parent only ever sees their
own rows).

## 3. Sign-in settings

*Authentication → URL Configuration*:

- **Site URL**: `https://vigneshganesan09.github.io/mathsfun/`
- **Redirect URLs**: add `https://vigneshganesan09.github.io/mathsfun/` and
  `http://localhost:5199/` (and any other dev port you use).

*Authentication → Providers → Email* must be enabled (it is by default). The free tier's built-in
mailer sends only a few emails per hour; for real use set up custom SMTP under
*Authentication → Emails*. You can translate the magic-link email template into Dutch there.

## 4. Keys

*Project Settings → API*: copy the **Project URL** and the **anon public** key. The anon key is
meant to be public (it ships in the website); the RLS policies are what protect the data. Never use
the `service_role` key in the app.

- **GitHub**: repository *Settings → Secrets and variables → Actions → New repository secret*:
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The deploy workflow passes them to
  `vite build`. Push to `main` (or run the workflow) to redeploy.
- **Local development**: create `.env.local` in the repo root (ignored by git via `*.local`):

  ```
  VITE_SUPABASE_URL=https://<your-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=<anon public key>
  ```

  then restart `npm run dev`.

## What is stored

| Table | Contents |
| --- | --- |
| `students` | first name, colour, groep, chosen teacher, the device's profile id |
| `completions` | one row per finished level / lesson / table / test / book: score, stars, time |
| `student_state` | a JSON copy of the child's local data (stars, finished lessons, settings, word list, reading level) so it can be restored on another device |

`student_progress` summarises per child: number of completions, tests passed (score at least 80%)
and last activity.

Sync rules: the newest copy wins, except that stars, scores and book bests keep the highest value
and finished lessons keep the most finishes. Chosen voices stay per device.

## Privacy (children's data, GDPR / AVG)

- The account belongs to the parent or teacher, who is responsible for the children's data.
- Store **first names only** (the database allows at most 40 characters). No birth dates, photos,
  school names or recordings are uploaded.
- Nothing is uploaded until a parent signs in and the data stays private to that account (RLS).
- *Verwijder online gegevens · Delete online data* removes all children and their results from the
  database; with *Verwijder ook mijn account* the login itself is deleted too, and everything goes
  with it (ON DELETE CASCADE). Data on the device stays until the parent deletes the child there.
- Supabase is the data processor; mention it in your privacy statement and sign their DPA if you
  use the app with a school.


## Login and registration

When the keys are set, the app opens with an account page: a parent or teacher **logs in** with
email and password, or chooses **Account aanmaken** (name, email, password of at least 8
characters). By default the login lasts until the app or browser is closed, so you log in each time;
tick *Ingelogd blijven op dit apparaat* to stay logged in on a personal device. *Wachtwoord
vergeten?* emails a link to set a new password.

After logging in, **Leerling registreren** creates a student profile and saves it in the database
straight away. Logging out saves everything online and removes the students' data from that device;
it returns at the next login, on any device.

Supabase settings for this: *Authentication → Providers → Email* on, with *Confirm email* on (new
accounts must click the link in the confirmation mail first) or off (log in straight away). Add the
site URL to *Redirect URLs* so the confirmation and password links come back to the app.
