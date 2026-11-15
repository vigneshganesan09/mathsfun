# Rekenpret — working rules for Claude

The spec lives in `docs/SPEC.md`; the visual rules come from the Rekenpret design system (tokens in
`src/styles.css`). This repo extends the spec with reading (`Lezen`), lessons, story mode and the
times-table trainer.

## Layout

- `src/core.ts`, `src/curriculum.ts`, `src/stories.ts`, `src/tableData.ts`, `src/lessonData.ts`,
  `src/readingData.ts`, `src/readingScore.ts`, `src/scoring.ts`, `src/review.ts`: pure TypeScript
  (no React, no `window`, no `speechSynthesis`). Test them with Vitest.
- Screens are `src/*.tsx`; shared pieces in `src/ui.tsx` and `src/pictures.tsx`.
- Browser services: `src/speech.ts` (read-aloud), `src/listen.ts` (speech recognition),
  `src/storage.ts` (localStorage, per profile).

## Rules

- All child-facing text is bilingual: every string has `{ nl, en }`. Never hard-code a single-language
  string in a component (button labels may combine both: "Klaar · Done").
- Never use runtime machine translation. Dutch and English text are written ahead of time.
- Numbers on screen use nl-NL formatting (comma decimals, dot thousands). Speech text goes through
  `speakable()` in `src/speech.ts`.
- Use Dutch school maths words: erbij, eraf, keer, gedeeld door, splitsen, tafel van, breuk,
  kommagetal, procent, omtrek, oppervlakte.
- Use only the design tokens. Blue (`--accent`) is ONLY for speech and language controls.
- Tap targets ≥ 56px. Colour is never the only feedback signal (always an icon too).
- Wrong answers are gentle: "Bijna! Probeer nog eens." Never red error styling, never sounds on wrong.
- Never show an answer before the child has answered; reveal it afterwards.
- No timers by default, no ads, no analytics, no network calls at runtime, except: fonts, speech
  recognition (the parent can switch to "Ouder luistert mee"), and the free online books in Lezen
  (`src/onlineBooks.ts`, fetched only when the child opens that tab or taps Download), and a PDF link
  the parent typed in the PDF tab (`src/pdfBooks.ts`, only on "Ophalen"). Never send personal data
  anywhere.
- Online and bundled books are CC BY / CC BY-NC: always show their credits and licence (`OnlineCredits`).
  Bundled book pictures live in `public/books` (regenerate with `npx vite-node scripts/bundleBooks.ts`),
  and the in-app PDF versions in `public/pdfs` + `src/bundledPdfs.json` (`npx vite-node scripts/makePdfs.ts`).
- Drawings (Bolle, lands, Telbeestjes, story art) are SVG strings in `src/drawings.ts` and
  `src/storyArt.ts`; use them through `src/Art.tsx`.
- Every new question generator needs a validation test that samples hundreds of questions
  (`src/curriculum.test.ts`).
- macOS is case-insensitive: never create two files whose names differ only in case
  (e.g. `Tables.tsx` and `tables.ts`).
