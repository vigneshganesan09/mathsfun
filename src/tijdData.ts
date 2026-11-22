// Klok · Tijd leren: lessons, the set-the-clock game helpers and two practice
// topics (digital & 24-hour clock, calculating with time). Pure TypeScript.
import { BOX, pick, randInt, type Bi, type Choice, type LevelNo, type Question, type Rng, type Topic } from './core';
import { pointsFor } from './scoring';
import { klokHeel, klokKwart, klokMinuten, sayTime } from './topicsMore';

// ---------- small helpers ----------

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A choice question: the right tile plus up to three different wrong ones, shuffled. */
function choice(rng: Rng, q: Omit<Question, 'kind' | 'options' | 'answer' | 'expr'>, correct: Choice, wrong: Choice[]): Question {
  const seen = new Set([correct.nl]);
  const distinct = wrong.filter((w) => !seen.has(w.nl) && seen.add(w.nl)).slice(0, 3);
  const options = shuffle([correct, ...distinct], rng);
  return { ...q, kind: 'choice', expr: '', options, answer: options.indexOf(correct) };
}

const mod = (n: number, m: number) => ((n % m) + m) % m;
/** 1..12 for any hour. */
export const h12 = (h: number) => mod(h - 1, 12) + 1;
const pad = (n: number) => String(n).padStart(2, '0');
/** "3:30" (12-hour) or "15:30" (24-hour). */
export const digital = (h: number, m: number) => `${h}:${pad(m)}`;
/** Spoken form of a digital time: "15 uur 30" / "15:30". */
const sayDigital = (h: number, m: number): Bi => ({ nl: m === 0 ? `${h} uur` : `${h} uur ${m}`, en: `${h}:${pad(m)}` });
const same = (b: Bi): Bi => b;
const bi = (nl: string, en: string): Bi => ({ nl, en });

// ---------- set the clock (Zet de klok) ----------

export interface ClockTime {
  /** 1..12 */
  h: number;
  /** 0..59 */
  m: number;
}

/** Minutes past 12:00 on a 12-hour face (0..719), the state of the set-the-clock game. */
export type ClockTotal = number;

export const toTotal = (t: ClockTime): ClockTotal => mod(t.h, 12) * 60 + t.m;
export function fromTotal(total: ClockTotal): ClockTime {
  const t = mod(Math.round(total), 720);
  return { h: h12(Math.floor(t / 60)), m: t % 60 };
}

/** Snap size of the minute hand per level: 5 minutes, or 1 minute at levels 4–5. */
export const zetStep = (level: LevelNo): number => (level >= 4 ? 1 : 5);

/** Angle in degrees (0 = 12 o'clock, clockwise) of a point relative to the centre (screen coordinates, y down). */
export function pointToAngle(dx: number, dy: number): number {
  return mod((Math.atan2(dx, -dy) * 180) / Math.PI, 360);
}

/** The minute the long hand points at for an angle, snapped to `step` minutes (0..59). */
export function angleToMinutes(deg: number, step = 5): number {
  const raw = mod(deg, 360) / 6;
  return mod(Math.round(raw / step) * step, 60);
}

export const minuteHandAngle = (m: number) => mod(m, 60) * 6;
/** The short hand moves along with the minutes: at half past three it is halfway between 3 and 4. */
export const hourHandAngle = (h: number, m: number) => (mod(h, 12) + mod(m, 60) / 60) * 30;

/**
 * Drag the long hand to `minute`: the shortest way round from where it was, so the
 * hour goes up when the hand passes the 12 forwards and down when it goes back.
 */
export function dragTo(total: ClockTotal, minute: number): ClockTotal {
  const prev = mod(total, 60);
  let diff = mod(minute, 60) - prev;
  if (diff > 30) diff -= 60;
  if (diff < -30) diff += 60;
  return mod(total + diff, 720);
}

export const addMinutes = (total: ClockTotal, d: number): ClockTotal => mod(total + d, 720);

/** Minutes the targets of a level can have. */
export function zetMinutes(level: LevelNo): number[] {
  switch (level) {
    case 1:
      return [0];
    case 2:
      return [0, 30];
    case 3:
      return [0, 15, 30, 45];
    case 4:
      return Array.from({ length: 12 }, (_, i) => i * 5);
    default:
      // To the minute, but never "one past/to" (said differently in Dutch).
      return Array.from({ length: 60 }, (_, m) => m).filter((m) => m % 5 !== 0 && ![1, 29, 31, 59].includes(m));
  }
}

export const ZET_ROUND = 10;

/** Ten different target times for a round; level 2 has mostly half hours, level 3 mostly quarters. */
export function makeZetTargets(level: LevelNo, rng: Rng, count = ZET_ROUND): ClockTime[] {
  const minutes = zetMinutes(level);
  const out: ClockTime[] = [];
  const seen = new Set<number>();
  let guard = 0;
  while (out.length < count && guard++ < 2000) {
    let m = pick(rng, minutes);
    // Practise the new thing of the level most of the time.
    if (level === 2 && m === 0 && rng() < 0.6) m = 30;
    if (level === 3 && (m === 0 || m === 30) && rng() < 0.6) m = pick(rng, [15, 45]);
    const t = { h: randInt(rng, 1, 12), m };
    const key = toTotal(t);
    if (seen.has(key) && seen.size < 12 * minutes.length) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Where the hands start: 12 o'clock, or 3 o'clock when the target is 12 o'clock. */
export const zetStart = (target: ClockTime): ClockTotal => (toTotal(target) === 0 ? 180 : 0);

export type ZetCheck = 'right' | 'minutes' | 'hour';

/** Right, or what is off: the long hand (minutes) or only the short hand (hour). */
export function checkClock(target: ClockTime, set: ClockTotal): ZetCheck {
  const s = fromTotal(set);
  if (s.m !== target.m) return 'minutes';
  if (s.h !== h12(target.h)) return 'hour';
  return 'right';
}

/**
 * Points for one target: 3 first try, 1 on the second try (it comes after the hint
 * "kijk nog eens naar de grote wijzer"), 0 when the right time had to be shown.
 */
export const zetPoints = (wrongTries: number, revealed: boolean) => pointsFor(wrongTries === 0 ? 0 : 2, revealed);

export const ZET_ID = 'tijd-zet';

export const ZET_LEVEL_NAME: Record<LevelNo, Bi> = {
  1: bi('Hele uren', 'Whole hours'),
  2: bi('Halve uren', 'Half hours'),
  3: bi('Kwartieren', 'Quarters'),
  4: bi('Per 5 minuten', 'Every 5 minutes'),
  5: bi('Per minuut', 'To the minute'),
};

// ---------- dayparts ----------

export type Daypart = 'nacht' | 'ochtend' | 'middag' | 'avond';
export const DAYPART: Record<Daypart, Bi> = {
  nacht: bi("'s nachts", 'at night'),
  ochtend: bi("'s ochtends", 'in the morning'),
  middag: bi("'s middags", 'in the afternoon'),
  avond: bi("'s avonds", 'in the evening'),
};
/** 0–6 nacht, 6–12 ochtend, 12–18 middag, 18–24 avond. */
export const daypartOf = (h24: number): Daypart => (['nacht', 'ochtend', 'middag', 'avond'] as const)[Math.floor(mod(h24, 24) / 6)];
/** Hours that are clearly inside one daypart (no 0, 6, 12 or 18). */
const CLEAR_HOURS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23];
const DAYPART_HINT = bi(
  'De dag heeft vier delen: nacht (0 tot 6 uur), ochtend (6 tot 12 uur), middag (12 tot 18 uur) en avond (18 tot 24 uur).',
  'The day has four parts: night (0 to 6), morning (6 to 12), afternoon (12 to 18) and evening (18 to 24).',
);
const TWELVE_HINT = bi(
  'Na 12 uur tel je door: 13 uur is 1 uur \'s middags. Haal er 12 af om het uur op de wijzerklok te vinden.',
  'After 12 you keep counting: 13 o\'clock is 1 pm. Take away 12 to find the hour on the clock face.',
);

const QUARTERS = [0, 15, 30, 45];
const FIVES = Array.from({ length: 12 }, (_, i) => i * 5);

// ---------- topic: Digitaal & 24 uur ----------

const READ_HINT = bi(
  'De grote wijzer geeft de minuten: op de 12 is het 00, op de 6 is het 30. De kleine wijzer geeft het uur.',
  'The long hand gives the minutes: on 12 it is 00, on 6 it is 30. The short hand gives the hour.',
);

/** Analog clock → pick the digital time (12-hour). */
function analogToDigital(rng: Rng, minutes: number[]): Question {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, minutes);
  const right = same({ nl: digital(h, m), en: digital(h, m) });
  const wrongs: [number, number][] = [
    [h12(h + 1), m],
    [h12(h - 1), m],
    [h, mod(m + 30, 60)],
    [h, mod(60 - m, 60)],
    [h12(h + 1), mod(m + 30, 60)],
    [h, mod(m + 15, 60)],
  ];
  const text = bi('Welke digitale tijd laat de klok zien?', 'Which digital time does the clock show?');
  const said = sayTime(h, m);
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'clock', h, m },
      skillKey: `digitaal ${h}:${m}`,
      hint: READ_HINT,
      solution: bi(`De klok staat op ${said.nl}. Digitaal is dat ${digital(h, m)}.`, `The clock shows ${said.en}. Digital: ${digital(h, m)}.`),
    },
    right,
    shuffle(wrongs, rng).map(([a, b]) => ({ nl: digital(a, b), en: digital(a, b) })),
  );
}

/** Digital time (12-hour) → pick how you say it. */
function digitalToWords(rng: Rng, minutes: number[]): Question {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, minutes);
  const right = sayTime(h, m);
  const wrongs: [number, number][] = [
    [h12(h - 1), m], // "half drie" for 3:30 is the classic mix-up
    [h12(h + 1), m],
    [h, mod(m + 30, 60)],
    [h, mod(60 - m, 60)],
    [h12(h - 1), mod(m + 30, 60)],
  ];
  const d = digital(h, m);
  const text = bi(`De digitale klok zegt ${d}. Hoe zeg je dat?`, `The digital clock says ${d}. How do you say that in Dutch?`);
  return choice(
    rng,
    {
      text,
      speak: { nl: `De digitale klok zegt ${sayDigital(h, m).nl}. Hoe zeg je dat?`, en: text.en },
      skillKey: `digitaal-woord ${h}:${m}`,
      hint:
        m >= 20 && m <= 40
          ? bi('Rond half zeg je half en dan het vólgende uur.', 'Around half past, Dutch says "half" and then the NEXT hour.')
          : bi('Kijk naar de minuten: 15 is kwart over, 45 is kwart voor het volgende uur.', 'Look at the minutes: 15 is quarter past, 45 is quarter to the next hour.'),
      solution: bi(`${d} is ${right.nl}.`, `${d} is ${right.en}.`),
    },
    right,
    shuffle(wrongs, rng).map(([a, b]) => sayTime(a, b)),
  );
}

/** 24-hour time → how you say it on the clock face ("15:45" → "kwart voor vier"). */
function twentyFourToWords(rng: Rng, minutes: number[]): Question {
  const H = randInt(rng, 13, 23);
  const m = pick(rng, minutes);
  const h = H - 12;
  const right = sayTime(h, m);
  const wrongs: Choice[] = [
    sayTime(h12(h - 1), m),
    sayTime(h12(h + 1), m),
    sayTime(h, mod(m + 30, 60)),
    sayTime(h12(H - 10), m), // 15 → "drie" mixed up with "vijf"
    sayTime(h12(h + 2), m),
  ];
  const d = digital(H, m);
  const text = bi(`Hoe laat is ${d} op de wijzerklok?`, `What is ${d} on a clock with hands? (Dutch clock words)`);
  return choice(
    rng,
    {
      text,
      speak: { nl: `Hoe laat is ${sayDigital(H, m).nl} op de wijzerklok?`, en: text.en },
      skillKey: `24u ${H}:${m}`,
      hint: TWELVE_HINT,
      solution: bi(`${H} − 12 = ${h}, dus ${d} is ${right.nl} ${DAYPART[daypartOf(H)].nl}.`, `${H} − 12 = ${h}, so ${d} is ${right.en} ${DAYPART[daypartOf(H)].en}.`),
    },
    right,
    shuffle(wrongs, rng),
  );
}

/** Clock-face time + daypart → the 24-hour time. */
function wordsTo24(rng: Rng, minutes: number[]): Question {
  const H = pick(rng, CLEAR_HOURS);
  const m = pick(rng, minutes);
  const h = h12(H);
  const said = sayTime(h, m);
  // Half/quarter-to/… times name the next hour; the daypart belongs to the real time.
  const part = DAYPART[daypartOf(H)];
  const right = same({ nl: digital(H, m), en: digital(H, m) });
  const other = H >= 12 ? H - 12 : H + 12;
  const wrongs = [
    [other, m],
    [mod(H + 1, 24), m],
    [mod(H - 1, 24), m],
    [H, mod(m + 30, 60)],
    [mod(other + 1, 24), m],
  ].map(([a, b]) => ({ nl: digital(a, b), en: digital(a, b) }));
  const text = bi(`Het is ${said.nl} ${part.nl}. Welke tijd staat er op een 24-uursklok?`, `It is ${said.en} ${part.en}. Which time does a 24-hour clock show?`);
  return choice(
    rng,
    {
      text,
      speak: text,
      skillKey: `24u-terug ${H}:${m}`,
      hint: TWELVE_HINT,
      solution: bi(`${cap(said.nl)} ${part.nl} is ${digital(H, m)}.`, `${cap(said.en ?? said.nl)} ${part.en} is ${digital(H, m)}.`),
    },
    right,
    wrongs,
  );
}

const cap = (t: string) => t[0].toUpperCase() + t.slice(1);

/** 24-hour time → which part of the day. */
function daypartQuestion(rng: Rng): Question {
  const H = pick(rng, CLEAR_HOURS);
  const m = pick(rng, QUARTERS);
  const d = digital(H, m);
  const p = daypartOf(H);
  const text = bi(`De klok zegt ${d}. Wanneer is dat?`, `The clock says ${d}. When is that?`);
  const all: Daypart[] = ['ochtend', 'middag', 'avond', 'nacht'];
  return choice(
    rng,
    {
      text,
      speak: { nl: `De klok zegt ${sayDigital(H, m).nl}. Wanneer is dat?`, en: text.en },
      skillKey: `dagdeel ${H}`,
      hint: DAYPART_HINT,
      solution: bi(`${d} is ${DAYPART[p].nl}.`, `${d} is ${DAYPART[p].en}.`),
    },
    DAYPART[p],
    all.filter((x) => x !== p).map((x) => DAYPART[x]),
  );
}

/** Analog clock + daypart → the 24-hour time. */
function analogTo24(rng: Rng, minutes: number[]): Question {
  const H = pick(rng, CLEAR_HOURS.filter((x) => x > 12));
  const m = pick(rng, minutes);
  const h = H - 12;
  const part = DAYPART[daypartOf(H)];
  const right = same({ nl: digital(H, m), en: digital(H, m) });
  const wrongs = [
    [h, m],
    [H + 1 > 23 ? 13 : H + 1, m],
    [H - 1, m],
    [H, mod(m + 30, 60)],
    [H - 2, m],
  ].map(([a, b]) => ({ nl: digital(a, b), en: digital(a, b) }));
  const text = bi(`Het is ${part.nl}. Hoe laat is het op een 24-uursklok?`, `It is ${part.en}. What time is it on a 24-hour clock?`);
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'clock', h, m },
      skillKey: `24u-klok ${H}:${m}`,
      hint: bi('Lees eerst de klok. \'s Middags en \'s avonds tel je er 12 bij.', 'Read the clock first. In the afternoon and evening, add 12.'),
      solution: bi(`${h} + 12 = ${H}, dus het is ${digital(H, m)}.`, `${h} + 12 = ${H}, so it is ${digital(H, m)}.`),
    },
    right,
    wrongs,
  );
}

export const tijdDigitaal: Topic = {
  id: 'tijd-digitaal',
  name: bi('Digitaal & 24 uur', 'Digital & 24-hour clock'),
  domain: 'meten',
  make: (level, rng) => {
    switch (level) {
      case 1:
        return coinFlip(rng) ? analogToDigital(rng, [0, 30]) : digitalToWords(rng, [0, 30]);
      case 2:
        return pick(rng, [() => analogToDigital(rng, FIVES), () => digitalToWords(rng, QUARTERS), () => digitalToWords(rng, FIVES)])();
      case 3:
        return pick(rng, [() => twentyFourToWords(rng, [0, 30]), () => twentyFourToWords(rng, QUARTERS), () => analogTo24(rng, [0, 30])])();
      case 4:
        return pick(rng, [() => daypartQuestion(rng), () => wordsTo24(rng, QUARTERS), () => analogTo24(rng, QUARTERS)])();
      default:
        return pick(rng, [
          () => twentyFourToWords(rng, FIVES),
          () => wordsTo24(rng, FIVES),
          () => analogTo24(rng, FIVES),
          () => daypartQuestion(rng),
        ])();
    }
  },
};

const coinFlip = (rng: Rng) => rng() < 0.5;

// ---------- topic: Rekenen met tijd ----------

function numpad(q: Omit<Question, 'kind'>): Question {
  return { ...q, kind: 'numpad' };
}

const UNIT = {
  min: bi('minuten', 'minutes'),
  uur: bi('uur', 'hours'),
  dag: bi('dagen', 'days'),
  sec: bi('seconden', 'seconds'),
  maand: bi('maanden', 'months'),
  week: bi('weken', 'weeks'),
};

interface Fact {
  ask: Bi;
  expr: string;
  answer: number;
  unit: keyof typeof UNIT;
  hint: Bi;
  solution: Bi;
}

const FACTS_1: Fact[] = [
  {
    ask: bi('Hoeveel minuten zitten er in een uur?', 'How many minutes are there in an hour?'),
    expr: `1 uur = ${BOX}`,
    answer: 60,
    unit: 'min',
    hint: bi('De grote wijzer gaat één keer helemaal rond. Elk streepje is een minuut: tel ze per vijf.', 'The long hand goes round once. Each small mark is a minute: count them in fives.'),
    solution: bi('Een uur heeft 60 minuten.', 'An hour has 60 minutes.'),
  },
  {
    ask: bi('Hoeveel minuten is een half uur?', 'How many minutes is half an hour?'),
    expr: `een half uur = ${BOX}`,
    answer: 30,
    unit: 'min',
    hint: bi('Een heel uur is een rondje van de grote wijzer. Half is de helft van dat rondje.', 'A whole hour is one turn of the long hand. Half is half of that turn.'),
    solution: bi('Een half uur is 30 minuten.', 'Half an hour is 30 minutes.'),
  },
  {
    ask: bi('Hoeveel minuten is een kwartier?', 'How many minutes is a quarter of an hour?'),
    expr: `een kwartier = ${BOX}`,
    answer: 15,
    unit: 'min',
    hint: bi('Een kwartier is een kwart uur: een uur in vier gelijke stukken.', 'A quarter of an hour: an hour cut into four equal parts.'),
    solution: bi('60 gedeeld door 4 is 15. Een kwartier is 15 minuten.', '60 divided by 4 is 15. A quarter of an hour is 15 minutes.'),
  },
  {
    ask: bi('Hoeveel dagen heeft een week?', 'How many days does a week have?'),
    expr: `1 week = ${BOX}`,
    answer: 7,
    unit: 'dag',
    hint: bi('Zeg ze op: maandag, dinsdag, … tot en met zondag. Tel mee op je vingers.', 'Say them: Monday, Tuesday, … up to Sunday. Count on your fingers.'),
    solution: bi('Maandag, dinsdag, woensdag, donderdag, vrijdag, zaterdag, zondag: 7 dagen.', 'Monday to Sunday: 7 days.'),
  },
  {
    ask: bi('Hoeveel uur heeft een hele dag (dag en nacht samen)?', 'How many hours does a whole day (day and night together) have?'),
    expr: `1 dag = ${BOX}`,
    answer: 24,
    unit: 'uur',
    hint: bi('De kleine wijzer gaat op een dag twee keer helemaal rond. Eén rondje is 12 uur.', 'The short hand goes round twice in a day. One turn is 12 hours.'),
    solution: bi('12 + 12 = 24. Een dag heeft 24 uur.', '12 + 12 = 24. A day has 24 hours.'),
  },
];

const FACTS_3: Fact[] = [
  {
    ask: bi('Hoeveel maanden heeft een jaar?', 'How many months does a year have?'),
    expr: `1 jaar = ${BOX}`,
    answer: 12,
    unit: 'maand',
    hint: bi('Zeg ze op: januari, februari, maart, … tot en met december.', 'Say them: January, February, March, … up to December.'),
    solution: bi('Januari tot en met december: 12 maanden.', 'January to December: 12 months.'),
  },
  {
    ask: bi('Hoeveel seconden zitten er in een minuut?', 'How many seconds are there in a minute?'),
    expr: `1 minuut = ${BOX}`,
    answer: 60,
    unit: 'sec',
    hint: bi('De secondewijzer gaat in één minuut een keer helemaal rond, langs alle streepjes.', 'The second hand goes round once in a minute, past all the small marks.'),
    solution: bi('Een minuut heeft 60 seconden.', 'A minute has 60 seconds.'),
  },
  {
    ask: bi('Hoeveel minuten is drie kwartier?', 'How many minutes is three quarters of an hour?'),
    expr: `drie kwartier = ${BOX}`,
    answer: 45,
    unit: 'min',
    hint: bi('Eén kwartier is 15 minuten. Neem het drie keer.', 'One quarter is 15 minutes. Take it three times.'),
    solution: bi('3 keer 15 is 45 minuten.', '3 times 15 is 45 minutes.'),
  },
];

const FACTS_5: Fact[] = [
  {
    ask: bi('Hoeveel dagen heeft een gewoon jaar (geen schrikkeljaar)?', 'How many days does a normal year (not a leap year) have?'),
    expr: `1 jaar = ${BOX}`,
    answer: 365,
    unit: 'dag',
    hint: bi('Het is iets meer dan 52 weken van 7 dagen.', 'It is a little more than 52 weeks of 7 days.'),
    solution: bi('Een gewoon jaar heeft 365 dagen, een schrikkeljaar 366.', 'A normal year has 365 days, a leap year 366.'),
  },
  {
    ask: bi('Hoeveel weken heeft een jaar ongeveer?', 'About how many weeks does a year have?'),
    expr: `1 jaar ≈ ${BOX}`,
    answer: 52,
    unit: 'week',
    hint: bi('Een jaar heeft 365 dagen. Hoe vaak past een week van 7 dagen daarin?', 'A year has 365 days. How many weeks of 7 days fit in it?'),
    solution: bi('365 gedeeld door 7 is ongeveer 52 weken.', '365 divided by 7 is about 52 weeks.'),
  },
];

function factQuestion(f: Fact): Question {
  return numpad({
    text: f.ask,
    speak: f.ask,
    expr: f.expr,
    answer: f.answer,
    unit: UNIT[f.unit].nl,
    hint: f.hint,
    solution: f.solution,
    skillKey: `tijdfeit ${f.expr}`,
  });
}

/** "3 uur = □ minuten", "2 minuten = □ seconden", "2 weken = □ dagen", "3 dagen = □ uur". */
function convertQuestion(rng: Rng, kind: 'uur-min' | 'min-sec' | 'week-dag' | 'dag-uur', max: number): Question {
  const n = randInt(rng, 2, max);
  const spec = {
    'uur-min': { from: bi('uur', 'hours'), to: 'min' as const, per: 60, one: bi('1 uur = 60 minuten', '1 hour = 60 minutes') },
    'min-sec': { from: bi('minuten', 'minutes'), to: 'sec' as const, per: 60, one: bi('1 minuut = 60 seconden', '1 minute = 60 seconds') },
    'week-dag': { from: bi('weken', 'weeks'), to: 'dag' as const, per: 7, one: bi('1 week = 7 dagen', '1 week = 7 days') },
    'dag-uur': { from: bi('dagen', 'days'), to: 'uur' as const, per: 24, one: bi('1 dag = 24 uur', '1 day = 24 hours') },
  }[kind];
  const to = UNIT[spec.to];
  const text = bi(`Hoeveel ${to.nl} is ${n} ${spec.from.nl}?`, `How many ${to.en} is ${n} ${spec.from.en}?`);
  return numpad({
    text,
    speak: text,
    expr: `${n} ${spec.from.nl} = ${BOX}`,
    answer: n * spec.per,
    unit: to.nl,
    hint: bi(`Weet je nog: ${spec.one.nl}. Neem dat ${n} keer.`, `Remember: ${spec.one.en}. Take that ${n} times.`),
    solution: bi(`${n} keer ${spec.per} is ${n * spec.per} ${to.nl}.`, `${n} times ${spec.per} is ${n * spec.per} ${to.en}.`),
    skillKey: `omrekenen ${kind} ${n}`,
  });
}

/** How long from one time to another, in minutes (or whole hours). */
function durationQuestion(rng: Rng, startMinutes: number[], deltas: number[], inHours = false): Question {
  const H = randInt(rng, 7, 20);
  const m = pick(rng, startMinutes);
  const d = pick(rng, deltas);
  const start = H * 60 + m;
  const end = start + d;
  const a = digital(H, m);
  const b = digital(Math.floor(end / 60) % 24, end % 60);
  const answer = inHours ? d / 60 : d;
  const unit = inHours ? UNIT.uur : UNIT.min;
  const text = bi(`Hoe lang is het van ${a} tot ${b}?`, `How long is it from ${a} to ${b}?`);
  const sa = sayDigital(H, m);
  const sb = sayDigital(Math.floor(end / 60) % 24, end % 60);
  return numpad({
    text,
    speak: { nl: `Hoe lang is het van ${sa.nl} tot ${sb.nl}?`, en: text.en },
    expr: BOX,
    answer,
    unit: unit.nl,
    hint: inHours
      ? bi('Tel de hele uren: van het ene hele uur naar het volgende is een uur.', 'Count the whole hours: from one whole hour to the next is one hour.')
      : bi('Spring eerst naar het hele uur, en tel dan verder. Een heel uur is één rondje van de grote wijzer.', 'Jump to the whole hour first, then count on. A whole hour is one full turn of the long hand.'),
    solution: bi(`Van ${a} tot ${b} is ${answer} ${unit.nl}.`, `From ${a} to ${b} is ${answer} ${unit.en}.`),
    skillKey: `duur ${d}`,
  });
}

/** What time is it N minutes later (or earlier)? Digital tiles. */
function laterQuestion(rng: Rng, startMinutes: number[], deltas: number[], step: number): Question {
  const H = randInt(rng, 7, 21);
  const m = pick(rng, startMinutes);
  const d = pick(rng, deltas);
  const now = H * 60 + m;
  const t = (x: number) => digital(Math.floor(mod(x, 1440) / 60), mod(x, 60));
  const right = { nl: t(now + d), en: t(now + d) };
  const wrongs = shuffle([now + d + step, now + d - step, now + d + 60, now + d - 60, now - d, now + d + 2 * step], rng)
    .filter((x) => x !== now + d)
    .map((x) => ({ nl: t(x), en: t(x) }));
  const span = spanOf(Math.abs(d));
  const text =
    d > 0
      ? bi(`Het is ${t(now)}. Hoe laat is het over ${span.nl}?`, `It is ${t(now)}. What time is it in ${span.en}?`)
      : bi(`Het is ${t(now)}. Hoe laat was het ${span.nl} geleden?`, `It is ${t(now)}. What time was it ${span.en} ago?`);
  return choice(
    rng,
    {
      text,
      speak: text,
      skillKey: `later ${d}`,
      hint:
        d > 0
          ? bi('Tel eerst door tot het volgende hele uur. Een uur heeft 60 minuten, niet 100!', 'Count on to the next whole hour first. An hour has 60 minutes, not 100!')
          : bi('Tel terug naar het hele uur, en dan verder terug. Een uur heeft 60 minuten.', 'Count back to the whole hour, then further back. An hour has 60 minutes.'),
      solution: bi(`${t(now)} ${d > 0 ? 'en dan' : 'min'} ${span.nl}: ${right.nl}.`, `${t(now)} ${d > 0 ? 'plus' : 'minus'} ${span.en}: ${right.en}.`),
    },
    right,
    wrongs,
  );
}

function spanOf(d: number): Bi {
  if (d === 15) return bi('een kwartier', 'a quarter of an hour');
  if (d === 30) return bi('een half uur', 'half an hour');
  if (d === 60) return bi('1 uur', '1 hour');
  if (d > 60 && d % 60 === 0) return bi(`${d / 60} uur`, `${d / 60} hours`);
  if (d > 60) return bi(`${Math.floor(d / 60)} uur en ${d % 60} minuten`, `${Math.floor(d / 60)} hour${d >= 120 ? 's' : ''} and ${d % 60} minutes`);
  return bi(`${d} minuten`, `${d} minutes`);
}

const DAYS: Bi[] = [
  bi('maandag', 'Monday'),
  bi('dinsdag', 'Tuesday'),
  bi('woensdag', 'Wednesday'),
  bi('donderdag', 'Thursday'),
  bi('vrijdag', 'Friday'),
  bi('zaterdag', 'Saturday'),
  bi('zondag', 'Sunday'),
];
const MONTHS: Bi[] = [
  bi('januari', 'January'),
  bi('februari', 'February'),
  bi('maart', 'March'),
  bi('april', 'April'),
  bi('mei', 'May'),
  bi('juni', 'June'),
  bi('juli', 'July'),
  bi('augustus', 'August'),
  bi('september', 'September'),
  bi('oktober', 'October'),
  bi('november', 'November'),
  bi('december', 'December'),
];
export { DAYS as WEEKDAYS, MONTHS };

/** Which day is N days after/before a day? */
function dayQuestion(rng: Rng, maxStep: number): Question {
  const i = randInt(rng, 0, 6);
  let n = randInt(rng, 1, maxStep);
  if (n % 7 === 0) n += 1;
  const back = rng() < 0.3;
  const j = mod(i + (back ? -n : n), 7);
  const text =
    n === 1
      ? back
        ? bi(`Welke dag komt vóór ${DAYS[i].nl}?`, `Which day comes before ${DAYS[i].en}?`)
        : bi(`Welke dag komt na ${DAYS[i].nl}?`, `Which day comes after ${DAYS[i].en}?`)
      : back
        ? bi(`Vandaag is het ${DAYS[i].nl}. Welke dag was het ${n} dagen geleden?`, `Today is ${DAYS[i].en}. What day was it ${n} days ago?`)
        : bi(`Vandaag is het ${DAYS[i].nl}. Welke dag is het over ${n} dagen?`, `Today is ${DAYS[i].en}. What day is it in ${n} days?`);
  return choice(
    rng,
    {
      text,
      speak: text,
      skillKey: `dag ${i}${back ? '-' : '+'}${n}`,
      hint: bi('Zeg de dagen van de week op een rij en tel op je vingers. Na de laatste dag begint de week weer opnieuw.', 'Say the days of the week in a row and count on your fingers. After the last day the week starts again.'),
      solution: bi(`Het is ${DAYS[j].nl}.`, `It is ${DAYS[j].en}.`),
    },
    DAYS[j],
    [DAYS[mod(j + 1, 7)], DAYS[mod(j - 1, 7)], DAYS[i], DAYS[mod(j + 2, 7)]],
  );
}

/** Which month comes after/before? */
function monthQuestion(rng: Rng): Question {
  const i = randInt(rng, 0, 11);
  const back = rng() < 0.4;
  const j = mod(i + (back ? -1 : 1), 12);
  const text = back
    ? bi(`Welke maand komt vóór ${MONTHS[i].nl}?`, `Which month comes before ${MONTHS[i].en}?`)
    : bi(`Welke maand komt na ${MONTHS[i].nl}?`, `Which month comes after ${MONTHS[i].en}?`);
  return choice(
    rng,
    {
      text,
      speak: text,
      skillKey: `maand ${i}${back ? '-' : '+'}`,
      hint: bi('Zeg de maanden van het jaar op een rij, vanaf de eerste maand. Na de laatste maand begint een nieuw jaar.', 'Say the months of the year in a row, from the first month. After the last month a new year begins.'),
      solution: bi(`Het is ${MONTHS[j].nl}.`, `It is ${MONTHS[j].en}.`),
    },
    MONTHS[j],
    [MONTHS[mod(j + 1, 12)], MONTHS[mod(j - 1, 12)], MONTHS[i], MONTHS[mod(j + 2, 12)]],
  );
}

/** A film/trip: starts at a time, lasts a while → what time does it end? */
function endTimeQuestion(rng: Rng): Question {
  const H = randInt(rng, 9, 20);
  const m = pick(rng, FIVES);
  const d = pick(rng, [75, 85, 90, 95, 105, 110, 125, 135, 150]);
  const t = (x: number) => digital(Math.floor(mod(x, 1440) / 60), mod(x, 60));
  const start = H * 60 + m;
  const what = pick(rng, [bi('De film', 'The film'), bi('De voetbalwedstrijd', 'The football match'), bi('Het schoolreisje', 'The school trip')]);
  const span = spanOf(d);
  const text = bi(`${what.nl} begint om ${t(start)} en duurt ${span.nl}. Hoe laat is het afgelopen?`, `${what.en} starts at ${t(start)} and lasts ${span.en}. What time does it end?`);
  const right = { nl: t(start + d), en: t(start + d) };
  return choice(
    rng,
    {
      text,
      speak: text,
      skillKey: `eindtijd ${d}`,
      hint: bi('Tel eerst de hele uren erbij, en daarna de minuten. Kom je over de 60, dan begint een nieuw uur.', 'Add the whole hours first, then the minutes. Past 60 a new hour begins.'),
      solution: bi(`${t(start)} en dan ${span.nl} is ${right.nl}.`, `${t(start)} plus ${span.en} is ${right.en}.`),
    },
    right,
    [start + d + 10, start + d - 10, start + d + 60, start + d - 60, start + d + 40].map((x) => ({ nl: t(x), en: t(x) })),
  );
}

export const tijdRekenen: Topic = {
  id: 'tijd-rekenen',
  name: bi('Rekenen met tijd', 'Calculating with time'),
  domain: 'meten',
  make: (level, rng) => {
    switch (level) {
      case 1:
        return pick(rng, [
          () => factQuestion(pick(rng, FACTS_1)),
          () => factQuestion(pick(rng, FACTS_1)),
          () => durationQuestion(rng, [0], [60, 120, 180], true),
          () => dayQuestion(rng, 1),
        ])();
      case 2:
        return pick(rng, [
          () => durationQuestion(rng, [0, 30], [30, 60, 90]),
          () => durationQuestion(rng, QUARTERS, [15, 30, 45]),
          () => laterQuestion(rng, [0, 30], [30, 60, -30], 30),
          () => convertQuestion(rng, 'uur-min', 3),
          () => dayQuestion(rng, 3),
        ])();
      case 3:
        return pick(rng, [
          () => factQuestion(pick(rng, FACTS_3)),
          () => durationQuestion(rng, FIVES.filter((x) => x <= 30), [10, 20, 25, 35, 40, 50]),
          () => laterQuestion(rng, QUARTERS, [15, 45, -15, -45], 15),
          () => convertQuestion(rng, 'week-dag', 4),
          () => monthQuestion(rng),
        ])();
      case 4:
        return pick(rng, [
          () => durationQuestion(rng, FIVES, [70, 80, 90, 100, 110]),
          () => laterQuestion(rng, FIVES, [20, 25, 35, 40, -20, -25], 5),
          () => convertQuestion(rng, 'min-sec', 5),
          () => convertQuestion(rng, 'uur-min', 5),
          () => dayQuestion(rng, 10),
        ])();
      default:
        return pick(rng, [
          () => durationQuestion(rng, FIVES, [125, 135, 150, 165, 195]),
          () => endTimeQuestion(rng),
          () => convertQuestion(rng, 'dag-uur', 5),
          () => convertQuestion(rng, 'min-sec', 10),
          () => factQuestion(pick(rng, FACTS_5)),
        ])();
    }
  },
};

/** Every practice topic of the Klok · Tijd section. */
export const TIJD_TOPICS: Topic[] = [klokHeel, klokKwart, klokMinuten, tijdDigitaal, tijdRekenen];
export const LEES_TOPICS: Topic[] = [klokHeel, klokKwart, klokMinuten];

// ---------- lessons (Leren) ----------

export interface TijdAsk {
  text: Bi;
  options: Bi[];
  answer: number;
  /** Shown only after the child has answered. */
  reveal: Bi;
  clock?: ClockTime;
}

export interface TijdSlide {
  text: Bi;
  clock?: ClockTime;
  /** A big digital clock display, e.g. "14:30". */
  digital?: string;
  /** A row of words, e.g. the days of the week. */
  list?: Bi[];
  ask?: TijdAsk;
}

export interface TijdLesson {
  id: string;
  name: Bi;
  /** The clock on the lesson tile. */
  icon: ClockTime;
  slides: TijdSlide[];
}

export const TIJD_LESSONS: TijdLesson[] = [
  {
    id: 'wijzers',
    name: bi('De grote en de kleine wijzer', 'The long and the short hand'),
    icon: { h: 3, m: 0 },
    slides: [
      {
        text: bi('Een klok heeft twee wijzers. De grote (lange) wijzer wijst de minuten aan. De kleine (korte) wijzer wijst het uur aan.', 'A clock has two hands. The long hand shows the minutes. The short hand shows the hour.'),
        clock: { h: 10, m: 10 },
      },
      {
        text: bi('Staat de grote wijzer recht omhoog op de 12? Dan is het een heel uur. Kijk waar de kleine wijzer staat: op de 3. Het is drie uur.', 'Is the long hand pointing straight up at 12? Then it is a whole hour. Look at the short hand: it is on 3. It is three o\'clock.'),
        clock: { h: 3, m: 0 },
      },
      {
        text: bi('Hier wijst de kleine wijzer naar de 8 en de grote naar de 12. Het is acht uur.', 'Here the short hand points at 8 and the long hand at 12. It is eight o\'clock.'),
        clock: { h: 8, m: 0 },
      },
      {
        text: bi('Nu jij! Kijk eerst naar de grote wijzer, dan naar de kleine.', 'Your turn! Look at the long hand first, then the short one.'),
        ask: {
          text: bi('Hoe laat is het?', 'What time is it?'),
          clock: { h: 5, m: 0 },
          options: [bi('vijf uur', "five o'clock"), bi('twaalf uur', "twelve o'clock"), bi('zes uur', "six o'clock")],
          answer: 0,
          reveal: bi('De grote wijzer staat op de 12, de kleine op de 5: vijf uur.', 'The long hand is on 12, the short hand on 5: five o\'clock.'),
        },
      },
    ],
  },
  {
    id: 'half',
    name: bi('Half', 'Half past'),
    icon: { h: 2, m: 30 },
    slides: [
      {
        text: bi('Staat de grote wijzer onderaan op de 6? Dan is het een half uur later dan het hele uur.', 'Is the long hand at the bottom, on 6? Then it is half an hour past the whole hour.'),
        clock: { h: 2, m: 30 },
      },
      {
        text: bi('In het Nederlands zeg je dan half en het vólgende uur. De kleine wijzer staat tussen de 2 en de 3. We gaan naar drie uur toe: het is half drie.', 'In Dutch you then say "half" and the NEXT hour. The short hand is between 2 and 3. We are on our way to three: it is "half drie" (half past two).'),
        clock: { h: 2, m: 30 },
      },
      {
        text: bi('Half drie is dus een half uur vóór drie uur. In het Engels zeg je half past two.', '"Half drie" is half an hour before three o\'clock. In English you say half past two.'),
        clock: { h: 2, m: 30 },
      },
      {
        text: bi('Nu jij! Naar welk uur gaat de kleine wijzer toe?', 'Your turn! Which hour is the short hand moving towards?'),
        ask: {
          text: bi('Hoe zeg je deze tijd in het Nederlands?', 'How do you say this time in Dutch?'),
          clock: { h: 7, m: 30 },
          options: [bi('half zeven', 'half zeven'), bi('half acht', 'half acht'), bi('zeven uur', 'zeven uur')],
          answer: 1,
          reveal: bi('De kleine wijzer staat tussen de 7 en de 8, op weg naar acht: half acht.', 'The short hand is between 7 and 8, on its way to eight: "half acht" (half past seven).'),
        },
      },
    ],
  },
  {
    id: 'kwart',
    name: bi('Kwart over en kwart voor', 'Quarter past and quarter to'),
    icon: { h: 4, m: 15 },
    slides: [
      {
        text: bi('Een uur kun je in vier stukken verdelen: vier kwartieren. Een kwartier is 15 minuten.', 'You can cut an hour into four parts: four quarters. A quarter of an hour is 15 minutes.'),
        clock: { h: 12, m: 15 },
      },
      {
        text: bi('Staat de grote wijzer op de 3? Dan is het kwart over. Hier is het kwart over vier.', 'Is the long hand on 3? Then it is quarter past. Here it is quarter past four.'),
        clock: { h: 4, m: 15 },
      },
      {
        text: bi('Staat de grote wijzer op de 9? Dan is het kwart voor het volgende uur. Hier is het kwart voor vijf.', 'Is the long hand on 9? Then it is quarter to the next hour. Here it is quarter to five.'),
        clock: { h: 4, m: 45 },
      },
      {
        text: bi('Nu jij! Staat de grote wijzer op de 3 of op de 9?', 'Your turn! Is the long hand on 3 or on 9?'),
        ask: {
          text: bi('Hoe laat is het?', 'What time is it?'),
          clock: { h: 9, m: 45 },
          options: [bi('kwart over negen', 'quarter past nine'), bi('kwart voor negen', 'quarter to nine'), bi('kwart voor tien', 'quarter to ten')],
          answer: 2,
          reveal: bi('De grote wijzer staat op de 9: kwart voor. Het volgende uur is tien: kwart voor tien.', 'The long hand is on 9: quarter to. The next hour is ten: quarter to ten.'),
        },
      },
    ],
  },
  {
    id: 'vijf',
    name: bi('Per 5 minuten', 'Every 5 minutes'),
    icon: { h: 1, m: 40 },
    slides: [
      {
        text: bi('Van het ene getal naar het volgende is 5 minuten. Tel met de grote wijzer mee: 5, 10, 15, 20 …', 'From one number to the next is 5 minutes. Count along with the long hand: 5, 10, 15, 20 …'),
        clock: { h: 1, m: 10 },
      },
      {
        text: bi('Vlak na het hele uur zeg je over: vijf over, tien over. Hier is het tien over een.', 'Just after the hour you say past: five past, ten past. Here it is ten past one.'),
        clock: { h: 1, m: 10 },
      },
      {
        text: bi('Vlak bij half kijk je naar de 6: tien vóór half twee, vijf vóór half twee, of vijf óver half twee.', 'Close to half past, look at the 6: "tien voor half twee" (1:20), "vijf voor half twee" (1:25) or "vijf over half twee" (1:35).'),
        clock: { h: 1, m: 25 },
      },
      {
        text: bi('Dit is tien over half twee: de grote wijzer is twee stappen voorbij de 6.', 'This is "tien over half twee" (1:40): the long hand is two steps past the 6.'),
        clock: { h: 1, m: 40 },
      },
      {
        text: bi('Vlak voor het volgende uur zeg je voor: tien voor twee, vijf voor twee.', 'Just before the next hour you say to: ten to two, five to two.'),
        clock: { h: 1, m: 50 },
      },
      {
        text: bi('Nu jij! Is de grote wijzer dicht bij de 12 of bij de 6?', 'Your turn! Is the long hand close to the 12 or to the 6?'),
        ask: {
          text: bi('Hoe laat is het?', 'What time is it?'),
          clock: { h: 6, m: 35 },
          options: [bi('vijf over half zeven', 'twenty-five to seven'), bi('vijf voor half zeven', 'twenty-five past six'), bi('vijf over zes', 'five past six')],
          answer: 0,
          reveal: bi('De grote wijzer is één stap voorbij de 6: vijf over half zeven (6:35).', 'The long hand is one step past the 6: "vijf over half zeven" (6:35).'),
        },
      },
    ],
  },
  {
    id: 'digitaal',
    name: bi('De digitale klok en 24 uur', 'The digital clock and 24 hours'),
    icon: { h: 2, m: 30 },
    slides: [
      {
        text: bi('Een digitale klok heeft geen wijzers, maar cijfers. Vóór de dubbele punt staat het uur, erachter de minuten.', 'A digital clock has no hands, only digits. Before the colon is the hour, after it the minutes.'),
        digital: '2:30',
        clock: { h: 2, m: 30 },
      },
      {
        text: bi('Een dag heeft 24 uur. Na 12 uur \'s middags telt de digitale klok gewoon door: 13, 14, 15 …', 'A day has 24 hours. After 12 noon the digital clock keeps counting: 13, 14, 15 …'),
        digital: '14:00',
      },
      {
        text: bi('14:00 is 2 uur \'s middags. Haal er 12 af: 14 − 12 = 2. Op de wijzerklok staat dan de kleine wijzer op de 2.', '14:00 is 2 in the afternoon. Take away 12: 14 − 12 = 2. On the clock face the short hand is on 2.'),
        digital: '14:00',
        clock: { h: 2, m: 0 },
      },
      {
        text: bi('En 14:30? Dat is een half uur later: half drie \'s middags.', 'And 14:30? Half an hour later: half past two in the afternoon.'),
        digital: '14:30',
        clock: { h: 2, m: 30 },
      },
      {
        text: bi('Nu jij! Haal 12 van het uur af.', 'Your turn! Take 12 away from the hour.'),
        ask: {
          text: bi('Hoe laat is 19:00 op de wijzerklok?', 'What is 19:00 on the clock face?'),
          options: [bi('negen uur \'s avonds', 'nine in the evening'), bi('zeven uur \'s avonds', 'seven in the evening'), bi('zeven uur \'s ochtends', 'seven in the morning')],
          answer: 1,
          reveal: bi('19 − 12 = 7. 19:00 is zeven uur \'s avonds.', '19 − 12 = 7. 19:00 is seven in the evening.'),
        },
      },
    ],
  },
  {
    id: 'kalender',
    name: bi('Dagen en maanden', 'Days and months'),
    icon: { h: 12, m: 0 },
    slides: [
      {
        text: bi('Een week heeft zeven dagen. Zeg ze maar hardop!', 'A week has seven days. Say them out loud!'),
        list: DAYS,
      },
      {
        text: bi('Zaterdag en zondag samen heten het weekend. Na zondag begint een nieuwe week, weer met maandag.', 'Saturday and Sunday together are the weekend. After Sunday a new week begins, with Monday again.'),
        list: [DAYS[5], DAYS[6]],
      },
      {
        text: bi('Een jaar heeft twaalf maanden.', 'A year has twelve months.'),
        list: MONTHS,
      },
      {
        text: bi('Nu jij! Zeg de dagen op een rij.', 'Your turn! Say the days in a row.'),
        ask: {
          text: bi('Welke dag komt na woensdag?', 'Which day comes after Wednesday?'),
          options: [DAYS[1], DAYS[3], DAYS[4]],
          answer: 1,
          reveal: bi('Maandag, dinsdag, woensdag, donderdag. Na woensdag komt donderdag.', 'Monday, Tuesday, Wednesday, Thursday. After Wednesday comes Thursday.'),
        },
      },
      {
        text: bi('Nog één! Zeg de maanden op een rij.', 'One more! Say the months in a row.'),
        ask: {
          text: bi('Welke maand komt na maart?', 'Which month comes after March?'),
          options: [MONTHS[1], MONTHS[4], MONTHS[3]],
          answer: 2,
          reveal: bi('Januari, februari, maart, april. Na maart komt april.', 'January, February, March, April. After March comes April.'),
        },
      },
    ],
  },
];

export const lessonActivity = (id: string) => `tijd-les-${id}`;
export const zetActivity = (level: LevelNo) => `tijd-zet-L${level}`;
