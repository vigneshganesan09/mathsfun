# Duddu Learn (Rekenpret)

*Speels rekenen voor groep 1–8.* Playful maths and reading practice, Dutch first with English one
tap away. Built with React + Vite + TypeScript from the **Rekenpret** design system and the system
design spec in [`docs/SPEC.md`](docs/SPEC.md); working rules for Claude are in [`CLAUDE.md`](CLAUDE.md).

## Modes (spec §16)

After **Start** (which also unlocks speech on iPad) you choose:

- **Thuis oefenen**: one child at a time. Several children can each have a profile (name, colour,
  groep) with their own progress, settings, stickers and streak.
- **Klas · digibord**: the teacher drives a big board: groep, topic, level, 5/10/15 questions, teams,
  think-time countdown, "Wie mag?" name picker, clicker keys (Space/Enter/→, R, N, F), podium.
  The answer can be typed into the box on the board (Enter or ✓ checks it) and choice options can be
  tapped; a right answer reveals it, a wrong one says "Bijna! Probeer nog eens".
  **Bewaar als configuratie** saves the whole setup under a name; saved configurations appear at the top
  of the setup screen (tap to load, ▶ to start at once, × to remove), kept on this device.
- **Werken in je boek**: the app sends the child to a page in their own workbook, calls out the sums,
  optional focus timer, then checks against an answer key (or self-check) and keeps stars per page.
- **Lezen**: straight to the library (after picking the child).

## Look and feel (prototype art layer)

The app is called **Duddu Learn**: the logo (`public/logo.webp`, app icons `public/icon-*.png`, `favicon.png`) is the Duddu elephant, recoloured to the app's tokens (ink cap and badge, sun-yellow letters, brand-orange line, a grey elephant), because blue is kept for speech controls.

The screens follow the Rekenpret prototype: **Bolle**, the orange bead friend, guides the splash, home,
map, round results and library; every groep has its own **land** (groep 1–2 Tulpenland, 3 De Polder,
4 Het Strand, 5 Het Bos, 6 Grachtenstad, 7 De Bergen, 8 De Ruimte) shown as a banner and as a calm
strip behind practice; every world has a **Telbeestje** (counting creature) that appears when the
child earns its first star, collected in the sticker book. The drawings are SVG built in code
(`src/drawings.ts`, `src/storyArt.ts`, wrapped by `src/Art.tsx`), and all animation stops when the
device asks for reduced motion.

## Juf of meester (teacher characters)

Each child picks a teacher (at sign-up, or from the tile on their home screen): **Juf Noor**,
**Meester Sam**, **Pip de hond**, **Boer Jan**, **Juf Uil** or **Robbie de robot**. Each has a
look, a female or male device voice where available, their own pitch and pace, and their own praise
and try-again lines. Children can tap Luister (NL/EN) to hear each one before choosing. A voice the
parent picks in the parents screen still wins; "Automatisch" lets the teacher choose.

### Levels

Every world has **5 levels**: 1 Makkelijk, 2 Oefenen, 3 Goed bezig, 4 Lastig, 5 Kampioen. One star
opens the next level. Levels 4–5 add missing-number sums (a + □ = c), two-step sums, number stories,
bigger numbers and, per topic, things like reading the clock to the minute, "over 20 minuten",
equivalent fractions, missing sides from perimeter/area and finding the scale. A star on any level 5
earns the **Kampioen** sticker; "Wereld klaar" still means levels 1–3.

## Scoring and review (spec §5, §9, §10)

- 3 points first try, 2 second try, 1 after the hint, 0 when revealed (with a worked solution; the
  question comes back at the end of the round). 26/20/14 of 30 points = 3/2/1 stars; 1 star unlocks
  the next level.
- Spaced review with Leitner boxes per skill: a level round mixes in up to 3 due review items, and the
  **Dagmix** (daily mix) on the home screen asks 10 due items across all topics.
- Streak flame (one missed day per week is forgiven) and a sticker book.
- Parents get in by holding a button for 2 seconds (simple grown-up check).

## Question types

Number pad (with minus and decimal comma where needed, units such as cm, cm², €, m, km), choice tiles
(clock reading in Dutch clock language, "Wat is meer?", fraction pizza), picture questions (counting
beads, story scenes, rectangles for perimeter and area). New topics include klokkijken (hele/halve uren,
kwartieren, per 5 minuten), welk getal ontbreekt, breuken, een deel van, kommagetallen, omtrek,
oppervlakte, verhoudingstabel and schaal.

## Books: bundled, online and PDF

- **Bundled**: all 20 Dutch picture books from
  [Global Storybooks](https://global-asp.github.io/storybooks-swahili/) (African Storybook, CC BY /
  CC BY-NC) ship inside the app with their pictures (`public/books`, made by
  `npx vite-node scripts/bundleBooks.ts`), so they work offline. Credits and licence show in each book.
- **Gratis online**: the same catalogue, live; anything new there can be downloaded to the shelf.
- **PDF-boeken in de app**: 20 real PDF picture books ship inside the app (`public/pdfs`, made by
  `npx vite-node scripts/makePdfs.ts` from the free books above: cover, the original pictures and
  Dutch text, and a credits page with the licence). Tap one to read it in the app: the first time,
  the app reads the PDF and saves its pages on the device, so after that it opens instantly and
  offline. The page is shown full width with the words to read aloud below it (same scoring), and
  the PDF file itself can be saved with "PDF-bestand bewaren".
- **Zelf een PDF toevoegen**: a parent downloads a free PDF picture book (StoryWeaver, Book Dash, African
  Storybook…) and adds it with **PDF toevoegen**, or pastes a link (only works when that site allows
  it; most need a manual download). The app renders each page as a picture with pdf.js, takes the page
  text as the reading text, and keeps the book on this device (IndexedDB). Pages with only pictures or
  credits are shown but not scored. Keep the book's licence: its credit pages stay in the book.

## Install and offline

The app is a PWA: in Chrome/Edge use "Install", on iPad "Share → Add to Home Screen". It works
offline after the first visit (downloaded books too).

## What's in it

### Lessen · Lessons

When a child finishes a lesson (its "Nu jij!" story sums), the lesson is marked **Afgerond ·
Closed** with the date and score, and its tile becomes **Opnieuw doen · Retake** (shown as
"Herkansing" inside). Finishing **Leren** for a table in the Tafeltrainer closes it the same way.

Four picture lessons, one idea per step, each read aloud in Dutch and English and ending with a
5-question *Nu jij!* quiz:

- **Erbij (optellen) · Adding:** counting all, counting on from the biggest, making a ten, swapping.
- **Eraf (aftrekken) · Taking away:** what's left, counting back, back to ten, checking with adding.
- **Keer (vermenigvuldigen) · Multiplying:** equal groups, repeated adding, counting in jumps, swapping.
- **De tafels · Times tables:** tables of 2, 5 and 10, Sam's doubling trick, and a link to the
  times-table trainer.

Lesson sums never show the answer up front: the child types it first, then the answer and the
explanation are revealed (after two wrong tries the answer is shown).

### Verhaaltjes · Story mode

Four illustrated adventures with Noor, Sam, Pip the dog and Farmer Jan. Every question has a picture
that shows exactly the numbers in the story, so a child can count when stuck.

| Story | Maths |
| --- | --- |
| Bij de bakker · At the bakery | + and − to 10, 15, 20 (rolls, stroopwafels, cupcakes) |
| De trein naar Almere · The train to Almere | + and − to 10, 20, 30 (people getting on and off) |
| Op de boerderij · On the farm | × as equal groups (egg boxes, apple trees, ducks' legs) |
| Het tafelfeest · The times-table party | tables of 2, 5, 10, then 3, 4, then 6, 7, 8 (cookies, balloons, bikes) |

Pictures are drawn from the design system's simple shapes (discs, rounded blocks, pills) in
[`src/pictures.tsx`](src/pictures.tsx): no clip-art, no emoji. Groep 3's adding and taking-away
worlds use them too.

### Tafeltrainer · Times-table trainer

For each table 1–10 (and all tables mixed):

- **Leren · Learn:** 1 × n up to 10 × n in order, with a picture of the groups and a skip-counting hint.
- **Schrijftoets · Written test:** the table shuffled; type each answer.
- **Spreektoets · Spoken test:** each sum is read aloud and the child says the answer. Dutch number
  words are understood ("zesenvijftig", "drieënzestig").

In the tests there are no pictures or hints, and each answer is revealed only after the child has
answered. The results screen lists the sums to practise again. Best scores are shown per table.

### Klok · Tijd leren

A section for learning to tell the time: six step-by-step lessons (de wijzers en hele uren, half,
kwart over/voor, per 5 minuten, de digitale en 24-uursklok, dagen en maanden); **Zet de klok**, where
the child drags the long hand (or uses big +/− buttons) to a time said in Dutch clock language, 5
levels from whole hours to the minute; **Lees de klok** (the clock worlds); **Digitaal & 24 uur**; and
**Rekenen met tijd** (how long, what time after…, minutes/hours/days), each with 5 levels.

### Toets · Test

Per groep four tests that open one after the other: Beginner (levels 1–2), Gemiddeld (2–3),
Gevorderd (3–4) and Pro (4–5). Every world of the groep is mixed in; one try per question, no hints;
80% passes and opens the next test. Best score and stars are kept; any test can be retaken.

### Online opslaan · Database

Progress can be saved in a PostgreSQL database (Supabase) by a parent or teacher account (sign-in
link by email, in the parent area). Students, every completion (levels, lessons, tables, tests,
books, clock) and a backup of each child's progress are stored, protected per account. It is off
until the Supabase project is set up: see `docs/DATABASE.md`.

### Lezen · Reading

The library opens on the shelf for the child's groep: **groep 1–2** (voorlezen: the app reads to the
child), **groep 3 to 8** (with the AVI level schools use), and **Dutch language levels** (ERK/CEFR A1,
A2, B1, B2). Each level is split into shelves (Eerste boekjes, Dieren, Ik kan het!, Sprookjes &
fabels, Avontuur, Weetjes, Het dagelijks leven). Every groep has at least four books: original
stories, retold public-domain tales (Aesopus, Grimm, Andersen, Dutch legends) and the free picture
books. Books open as a two-page spread: picture left, big text right, page-turn buttons.

1. *Luister eerst*: the page is read aloud, highlighting each word (where the voice supports it).
2. *Ik lees!*: the child reads aloud; the device listens and marks each word live.
3. The page score shows how many words were read correctly and which went wrong. Tap a word to
   correct the score if the recogniser misheard.
4. Wrong words go to **Mijn oefenwoorden**: practise them with klankgroepjes (kip·pen·hok),
   listen-and-repeat, and the sentence they came from.
5. At the end of the book: stars, percentage read correctly, words per minute, reading time, the
   whole text marked word by word, and the words to practise.

Listening uses the browser's speech recognition (Chrome, Edge, Safari). **Chrome and Edge send the
audio to an online service** to recognise it; Safari can do it on the device. Without it, or if a
parent prefers, choose *Ouder luistert mee* in the parents screen: the child reads aloud and a parent
taps the words that went wrong.

### Voor ouders · For parents

- Pick the **Dutch and English voice** your child understands best, with a test button, and the
  **speed** (slow, normal, quick). Voices come from the device: add more in the system settings.
- English translation: always, on tap, or hidden.
- Listening: device listens, or parent listens along.

### Oefenen · Practice

- **Groep → world → level.** Pick your groep (1–2 to 8); each groep has worlds on a map, each world
  has 5 levels of 10 questions. A level unlocks once the one before it is played.
- **Dutch first, English one tap away.** Every question, hint and message is stored in both
  languages. Parents choose: English always shown, on tap (default) or hidden.
- **Read-aloud.** Blue NL / EN speaker buttons on every question, hint and message, using the
  browser's speech voices (`nl-NL`, then `nl-BE`; `en-GB`) at rate 0.9.
- **Kind feedback.** Wrong once: *Bijna! Probeer nog eens.* Wrong twice: the hint opens. Wrong three
  times: the answer is shown and you move on. A star for every question solved within two tries.
- **Dutch notation** on screen: `10.000`, `84 : 4`, `−3`.
- Gentle chime on correct (can be muted separately from read-aloud). Respects *reduce motion*.
- Stars and settings are saved in this browser only.

### Worlds per groep

| Groep | Worlds |
| --- | --- |
| 1–2 | Tellen (rekenrek beads), Ervoor en erna |
| 3 | Erbij tot 10, Eraf tot 10, Splitsen, Erbij en eraf tot 20 (with story sums) |
| 4 | Erbij tot 100, Eraf tot 100, Tafels van 1, 2, 5 en 10 |
| 5 | Rekenen tot 1.000, Alle tafels, Delen |
| 6 | Optellen tot 10.000, Aftrekken tot 10.000, Vermenigvuldigen |
| 7 | Grote getallen, Staartdeling, Procenten |
| 8 | Gemengd oefenen, Afronden, Onder nul |

All questions are typed on the number pad for now. The design's other question types (tap tiles,
drag-to-match, number line, clock, coins, fraction pizza) and the domains that need them
(Verhoudingen, Meten & Meetkunde, Verbanden) are still to come.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: type check, tests, build, then the
site is pushed to the `gh-pages` branch, which GitHub Pages serves at
https://vigneshganesan09.github.io/mathsfun/.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm test         # check every world and level generates correct questions
npm run build    # type-check and build for production
```
