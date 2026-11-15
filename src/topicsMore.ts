// More question types from the spec: clock reading, comparing, missing numbers,
// fractions (pizza), fractions of a number, decimals, perimeter, area, ratio
// tables and map scale. Pure TypeScript.
import { BOX, fmtEn, fmtNl, pick, randInt, type Bi, type Choice, type Domain, type LevelNo, type Question, type Rng, type Topic } from './core';

const N = fmtNl;
const E = fmtEn;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A choice question: the correct tile plus up to three different wrong ones, shuffled. */
function choice(rng: Rng, q: Omit<Question, 'kind' | 'options' | 'answer' | 'expr'>, correct: Choice, wrong: Choice[]): Question {
  const seen = new Set([correct.nl]);
  const distinct = wrong.filter((w) => !seen.has(w.nl) && seen.add(w.nl)).slice(0, 3);
  const options = shuffle([correct, ...distinct], rng);
  return { ...q, kind: 'choice', expr: '', options, answer: options.indexOf(correct) };
}

function topic(id: string, nl: string, en: string, domain: Domain, make: Topic['make']): Topic {
  return { id, name: { nl, en }, domain, make };
}

// ---------- clock (Dutch clock language) ----------

const NL_HOUR = ['twaalf', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf'];
const EN_HOUR = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const h12 = (h: number) => ((((h - 1) % 12) + 12) % 12) + 1;

/** How you say a time: "half drie" is 2:30 in Dutch (half to three). */
export function sayTime(h: number, m: number): Choice {
  const nx = h12(h + 1);
  const H = NL_HOUR[h];
  const NX = NL_HOUR[nx];
  const eH = EN_HOUR[h];
  const eNX = EN_HOUR[nx];
  if (m % 5 !== 0) return minuteTime(m, H, NX, eH, eNX);
  switch (m) {
    case 0:
      return { nl: `${H} uur`, en: `${eH} o'clock` };
    case 5:
      return { nl: `vijf over ${H}`, en: `five past ${eH}` };
    case 10:
      return { nl: `tien over ${H}`, en: `ten past ${eH}` };
    case 15:
      return { nl: `kwart over ${H}`, en: `quarter past ${eH}` };
    case 20:
      return { nl: `tien voor half ${NX}`, en: `twenty past ${eH}` };
    case 25:
      return { nl: `vijf voor half ${NX}`, en: `twenty-five past ${eH}` };
    case 30:
      return { nl: `half ${NX}`, en: `half past ${eH}` };
    case 35:
      return { nl: `vijf over half ${NX}`, en: `twenty-five to ${eNX}` };
    case 40:
      return { nl: `tien over half ${NX}`, en: `twenty to ${eNX}` };
    case 45:
      return { nl: `kwart voor ${NX}`, en: `quarter to ${eNX}` };
    case 50:
      return { nl: `tien voor ${NX}`, en: `ten to ${eNX}` };
    default:
      return { nl: `vijf voor ${NX}`, en: `five to ${eNX}` };
  }
}

function clockQuestion(rng: Rng, minutes: number[]): Question {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, minutes);
  const right = sayTime(h, m);
  const others: Choice[] = shuffle(
    [
      [h12(h + 1), m],
      [h12(h - 1), m],
      [h, (m + 30) % 60],
      [h12(h + 1), (m + 30) % 60],
      [h, minutes.length > 1 ? pick(rng, minutes.filter((x) => x !== m)) : (m + 15) % 60],
      [h12(h + 2), m],
    ],
    rng,
  ).map(([hh, mm]) => sayTime(hh, mm));
  const text = { nl: 'Hoe laat is het?', en: 'What time is it?' };
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'clock', h, m },
      skillKey: `klok ${h}:${m}`,
      hint:
        m === 30
          ? {
              nl: 'Bij half wijst de grote wijzer naar de 6. Je zegt half en dan het vólgende uur!',
              en: 'At half past, the long hand points to 6. In Dutch you say "half" and then the NEXT hour!',
            }
          : m === 0
            ? { nl: 'De grote wijzer staat op de 12. Kijk waar de kleine wijzer staat.', en: 'The long hand is on 12. Look where the short hand is.' }
            : {
                nl: 'Kijk eerst naar de grote (oranje) wijzer, dan naar de kleine.',
                en: 'Look at the long (orange) hand first, then the short one.',
              },
      solution: { nl: `Het is ${right.nl}.`, en: `It is ${right.en}.` },
    },
    right,
    others,
  );
}

const NL_NUM = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf', 'dertien', 'veertien'];
const EN_NUM = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four',
  'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine',
];

/** Times to the minute, the school way: 2:07 "zeven over twee", 2:23 "zeven voor half drie", 2:48 "twaalf voor drie". */
function minuteTime(m: number, H: string, NX: string, eH: string, eNX: string): Choice {
  if (m < 15) return { nl: `${NL_NUM[m]} over ${H}`, en: `${EN_NUM[m]} past ${eH}` };
  if (m < 30) return { nl: `${NL_NUM[30 - m]} voor half ${NX}`, en: `${EN_NUM[m]} past ${eH}` };
  if (m < 45) return { nl: `${NL_NUM[m - 30]} over half ${NX}`, en: `${EN_NUM[60 - m]} to ${eNX}` };
  return { nl: `${NL_NUM[60 - m]} voor ${NX}`, en: `${EN_NUM[60 - m]} to ${eNX}` };
}

/** Minutes that are not on a 5-minute mark, but never "one past" (that one is said differently). */
const ODD_MINUTES = Array.from({ length: 60 }, (_, m) => m).filter((m) => m % 5 !== 0 && ![1, 29, 31, 59].includes(m));

/** Reading a clock to the minute. */
function minuteClockQuestion(rng: Rng): Question {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, ODD_MINUTES);
  const right = sayTime(h, m);
  const others = shuffle(
    [
      [h, 60 - m],
      [h, (m + 30) % 60],
      [h12(h + 1), m],
      [h12(h - 1), m],
      [h12(h + 1), 60 - m],
    ],
    rng,
  ).map(([hh, mm]) => sayTime(hh, mm));
  const text = { nl: 'Hoe laat is het?', en: 'What time is it?' };
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'clock', h, m },
      skillKey: `klok ${h}:${m}`,
      hint: {
        nl: 'Tel de minuten vanaf het dichtstbijzijnde streepje: de 12 (uur), de 6 (half). Over of voor?',
        en: 'Count the minutes from the nearest mark: the 12 (o\'clock) or the 6 (half). Past or to?',
      },
      solution: { nl: `Het is ${right.nl}.`, en: `It is ${right.en}.` },
    },
    right,
    others,
  );
}

const LATER: Record<number, Bi> = {
  15: { nl: 'een kwartier', en: 'a quarter of an hour' },
  30: { nl: 'een half uur', en: 'half an hour' },
  45: { nl: 'drie kwartier', en: 'three quarters of an hour' },
  60: { nl: '1 uur', en: '1 hour' },
  120: { nl: '2 uur', en: '2 hours' },
};
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const span = (d: number): Bi => LATER[d] ?? { nl: `${d} minuten`, en: `${d} minutes` };
const toHM = (t: number): [number, number] => {
  const x = ((t % 720) + 720) % 720;
  return [h12(Math.floor(x / 60)), x % 60];
};

/**
 * "Hoe laat is het over 20 minuten?": the clock shows now; the child picks the later (or earlier) time.
 * `step` is the size of the nearby wrong answers (30 for half hours, 15 for quarters, 5 for minutes).
 */
function laterQuestion(rng: Rng, startMinutes: number[], deltas: number[], step: number): Question {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, startMinutes);
  const d = pick(rng, deltas);
  const now = h * 60 + m;
  const right = sayTime(...toHM(now + d));
  const others = shuffle([now, now - d, now + d + 60, now + d - 60, now + d + step, now + d - step], rng).map((t) => sayTime(...toHM(t)));
  const s = span(Math.abs(d));
  const text =
    d > 0
      ? {
          nl: `De klok laat zien hoe laat het nu is. Hoe laat is het over ${s.nl}?`,
          en: `The clock shows the time now. What time will it be in ${s.en}?`,
        }
      : {
          nl: `De klok laat zien hoe laat het nu is. Hoe laat was het ${s.nl} geleden?`,
          en: `The clock shows the time now. What time was it ${s.en} ago?`,
        };
  const nowSaid = sayTime(h, m);
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'clock', h, m },
      skillKey: `klok ${h}:${m}${d > 0 ? '+' : ''}${d}`,
      hint: {
        nl: `Lees eerst de klok. Draai dan de grote wijzer in gedachten ${d > 0 ? 'vooruit' : 'terug'}: een heel uur is één rondje.`,
        en: `Read the clock first. Then turn the long hand ${d > 0 ? 'forwards' : 'backwards'} in your head: a whole hour is one full turn.`,
      },
      solution:
        d > 0
          ? { nl: `Nu is het ${nowSaid.nl}. Over ${s.nl} is het ${right.nl}.`, en: `Now it is ${nowSaid.en}. In ${s.en} it will be ${right.en}.` }
          : { nl: `Nu is het ${nowSaid.nl}. ${cap(s.nl)} geleden was het ${right.nl}.`, en: `Now it is ${nowSaid.en}. ${cap(s.en)} ago it was ${right.en}.` },
    },
    right,
    others,
  );
}

const QUARTERS = [0, 15, 30, 45];
const FIVES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const klokHeel = topic('klok-hele-halve', 'Klokkijken: hele en halve uren', 'Telling the time: hours and half hours', 'meten', (level, rng) => {
  if (level <= 3) return clockQuestion(rng, [[0], [30], [0, 30]][level - 1]);
  if (level === 4) return laterQuestion(rng, [0, 30], [30, 60, 120], 30);
  if (rng() < 0.25) return clockQuestion(rng, [0, 30]);
  return laterQuestion(rng, [0, 30], pick(rng, [[30, 60, 120], [-30, -60]]), 30);
});

export const klokKwart = topic('klok-kwartier', 'Klokkijken: kwartieren', 'Telling the time: quarters', 'meten', (level, rng) => {
  if (level <= 3) return clockQuestion(rng, [[0, 30], [15, 45], QUARTERS][level - 1]);
  if (level === 4) return laterQuestion(rng, QUARTERS, [15, 30, 60], 15);
  if (rng() < 0.25) return clockQuestion(rng, QUARTERS);
  return laterQuestion(rng, QUARTERS, pick(rng, [[15, 45, 30], [-15, -30, -45]]), 15);
});

export const klokMinuten = topic('klok-minuten', 'Klokkijken: per 5 minuten', 'Telling the time: 5 minutes', 'meten', (level, rng) => {
  if (level <= 3) return clockQuestion(rng, [[5, 10, 50, 55], [20, 25, 35, 40], FIVES][level - 1]);
  if (level === 4) return rng() < 0.6 ? minuteClockQuestion(rng) : laterQuestion(rng, FIVES, [10, 20, 25], 5);
  if (rng() < 0.35) return minuteClockQuestion(rng);
  return laterQuestion(rng, FIVES, pick(rng, [[20, 25, 35, 40], [-10, -20, -25]]), 5);
});

// ---------- which is more? ----------

export const meer = topic('wat-is-meer', 'Wat is meer?', 'Which is more?', 'getallen', (level, rng) => {
  const max = [5, 10, 15, 20, 20][level - 1];
  const a = randInt(rng, 1, max);
  let b = randInt(rng, 1, max);
  // Kampioen: numbers close together (at most 3 apart), and sometimes "which is less?".
  if (level === 5) b = a + pick(rng, a > max - 3 ? [-3, -2, -1] : a < 4 ? [1, 2, 3] : [-3, -2, -1, 1, 2, 3]);
  while (b === a) b = randInt(rng, 1, max);
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const less = level === 5 && rng() < 0.5;
  const right = less ? small : big;
  const text = less
    ? { nl: `Wat is minder: ${a} of ${b}?`, en: `Which is less: ${a} or ${b}?` }
    : { nl: `Wat is meer: ${a} of ${b}?`, en: `Which is more: ${a} or ${b}?` };
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'compare', a, b },
      skillKey: `${less ? 'minder' : 'meer'} ${small}-${big}`,
      hint: less
        ? { nl: 'Kijk welke rij kralen korter is.', en: 'Look at which row of beads is shorter.' }
        : { nl: 'Kijk welke rij kralen langer is.', en: 'Look at which row of beads is longer.' },
      solution: less ? { nl: `${small} is minder.`, en: `${small} is less.` } : { nl: `${big} is meer.`, en: `${big} is more.` },
    },
    { nl: String(right) },
    [{ nl: String(less ? big : small) }],
  );
});

// ---------- missing number ----------

function missingSum(rng: Rng, s: number): Question {
  const a = randInt(rng, 1, s - 1);
  return {
    text: { nl: 'Welk getal ontbreekt?', en: 'Which number is missing?' },
    expr: `${a} + ${BOX} = ${s}`,
    speak: { nl: `${a} plus hoeveel is ${s}?`, en: `${a} plus what equals ${s}?` },
    answer: s - a,
    skillKey: `${a}+?=${s}`,
    hint: { nl: `Hoeveel moet er bij ${a} om ${s} te maken? Tel verder vanaf ${a}.`, en: `How many do you add to ${a} to make ${s}? Count on from ${a}.` },
    solution: { nl: `${a} + ${s - a} = ${s}`, en: `${a} + ${s - a} = ${s}` },
  };
}

/** □ + a = s, s − □ = r or □ − a = r, within 100. */
function missingOther(rng: Rng, form: 'first' | 'minus' | 'from'): Question {
  const s = randInt(rng, 20, 100);
  const a = randInt(rng, 2, s - 2);
  const r = s - a;
  const text = { nl: 'Welk getal ontbreekt?', en: 'Which number is missing?' };
  if (form === 'first')
    return {
      text,
      expr: `${BOX} + ${a} = ${s}`,
      speak: { nl: `Hoeveel plus ${a} is ${s}?`, en: `What plus ${a} equals ${s}?` },
      answer: r,
      skillKey: `?+${a}=${s}`,
      hint: { nl: `Welk getal en ${a} maken samen ${s}? Reken ${s} − ${a}.`, en: `Which number and ${a} make ${s}? Work out ${s} − ${a}.` },
      solution: { nl: `${r} + ${a} = ${s}`, en: `${r} + ${a} = ${s}` },
    };
  if (form === 'minus')
    return {
      text,
      expr: `${s} − ${BOX} = ${r}`,
      speak: { nl: `${s} min hoeveel is ${r}?`, en: `${s} minus what equals ${r}?` },
      answer: a,
      skillKey: `${s}-?=${r}`,
      hint: { nl: `Hoeveel moet je van ${s} afhalen om op ${r} te komen? Tel van ${r} verder tot ${s}.`, en: `How many do you take from ${s} to get ${r}? Count on from ${r} to ${s}.` },
      solution: { nl: `${s} − ${a} = ${r}`, en: `${s} − ${a} = ${r}` },
    };
  return {
    text,
    expr: `${BOX} − ${a} = ${r}`,
    speak: { nl: `Hoeveel min ${a} is ${r}?`, en: `What minus ${a} equals ${r}?` },
    answer: s,
    skillKey: `?-${a}=${r}`,
    hint: { nl: `Je hebt er ${a} afgehaald en houdt ${r} over. Hoeveel was het eerst? Reken ${r} + ${a}.`, en: `You took away ${a} and have ${r} left. How many were there first? Work out ${r} + ${a}.` },
    solution: { nl: `${s} − ${a} = ${r}`, en: `${s} − ${a} = ${r}` },
  };
}

/** A number row going up or down in steps: 35, 40, □, 50. */
function missingInRow(rng: Rng, steps: number[], down: boolean): Question {
  const step = pick(rng, steps);
  const len = 4;
  const startMax = step === 2 ? 40 : 60;
  const low = step * randInt(rng, 0, Math.floor(startMax / step)) + (step === 10 ? randInt(rng, 0, 9) : 0);
  const row = Array.from({ length: len }, (_, i) => low + i * step);
  if (down) row.reverse();
  const at = randInt(rng, 0, len - 1);
  const answer = row[at];
  const shown = row.map((n, i) => (i === at ? BOX : String(n)));
  const said = (lang: 'nl' | 'en') => row.map((n, i) => (i === at ? (lang === 'nl' ? 'hoeveel' : 'what') : String(n))).join(', ');
  return {
    text: { nl: 'Welk getal ontbreekt in de rij?', en: 'Which number is missing in the row?' },
    expr: shown.join(', '),
    speak: { nl: `Welk getal ontbreekt? ${said('nl')}`, en: `Which number is missing? ${said('en')}` },
    answer,
    skillKey: `rij ${row.join(',')}@${at}`,
    hint: {
      nl: `Kijk hoeveel er steeds ${down ? 'af' : 'bij'} gaat van het ene getal naar het volgende.`,
      en: `Look at how much is ${down ? 'taken away' : 'added'} each time from one number to the next.`,
    },
    solution: {
      nl: `Er gaat steeds ${step} ${down ? 'af' : 'bij'}: ${row.join(', ')}`,
      en: `It goes ${down ? 'down' : 'up'} by ${step} each time: ${row.join(', ')}`,
    },
  };
}

export const ontbreekt = topic('welk-getal-ontbreekt', 'Welk getal ontbreekt?', 'Missing numbers', 'getallen', (level, rng) => {
  if (level <= 3) return missingSum(rng, randInt(rng, 5, [10, 20, 100][level - 1]));
  if (level === 4) {
    const r = rng();
    if (r < 0.3) return missingSum(rng, randInt(rng, 20, 100));
    if (r < 0.6) return missingOther(rng, 'first');
    return missingInRow(rng, [2, 5, 10], false);
  }
  const r = rng();
  if (r < 0.25) return missingOther(rng, 'minus');
  if (r < 0.45) return missingOther(rng, 'from');
  if (r < 0.6) return missingOther(rng, 'first');
  return missingInRow(rng, [2, 5, 10], rng() < 0.7);
});

// ---------- fractions: the pizza ----------

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const frac = (a: number, b: number): Choice => ({ nl: `${a}/${b}` });
const PIZZA_HINT: Bi = {
  nl: 'Tel alle stukken: dat getal komt onder de streep. Tel dan de oranje stukken: dat komt erboven.',
  en: 'Count all the slices: that number goes under the line. Then count the orange slices: that goes above it.',
};

/** Wrong fractions near a/b, all different from a/b itself. */
function nearFractions(rng: Rng, a: number, b: number, noEqual = false): Choice[] {
  return shuffle(
    [
      [b - a, b],
      [a, b + 1],
      [a + 1, b],
      [a, b * 2],
      [Math.max(1, a - 1), b],
      [1, a + 1],
    ].filter(([x, y]) => x > 0 && x < y && !(x === a && y === b) && !(noEqual && x * b === a * y)),
    rng,
  ).map(([x, y]) => frac(x, y));
}

/** Levels 1–4: which part is orange (level 4: or which part is NOT orange). */
function pizzaPart(rng: Rng, sizes: number[], askWhite: boolean): Question {
  const n = pick(rng, sizes);
  const k = randInt(rng, 1, n - 1);
  const white = askWhite && 2 * k !== n && rng() < 0.5;
  const a = white ? n - k : k;
  const text = white
    ? { nl: 'Welk deel van de pizza is níet oranje?', en: 'What part of the pizza is NOT orange?' }
    : { nl: 'Welk deel van de pizza is oranje?', en: 'What part of the pizza is orange?' };
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'pie', parts: n, shaded: k },
      skillKey: `pizza ${white ? 'wit ' : ''}${a}/${n}`,
      hint: white
        ? { nl: 'Tel alle stukken: dat getal komt onder de streep. Tel dan de witte stukken: dat komt erboven.', en: 'Count all the slices: that number goes under the line. Then count the white slices: that goes above it.' }
        : PIZZA_HINT,
      solution: white
        ? { nl: `${a} van de ${n} stukken is wit: ${a}/${n}.`, en: `${a} of the ${n} slices are white: ${a}/${n}.` }
        : { nl: `${k} van de ${n} stukken is ${k}/${n}.`, en: `${k} of the ${n} slices is ${k}/${n}.` },
    },
    frac(a, n),
    // Levels 4–5 also drop wrong tiles that are secretly the same size (2/6 and 1/3).
    white ? [frac(k, n), ...nearFractions(rng, a, n, true)] : nearFractions(rng, a, n, true),
  );
}

/** Kampioen: the orange part as a simpler fraction (6/8 → 3/4). Only fractions of a different size are wrong tiles. */
function pizzaSimplest(rng: Rng): Question {
  const n = pick(rng, [4, 6, 8, 9, 10, 12]);
  const ks = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((k) => gcd(k, n) > 1);
  const k = pick(rng, ks);
  const g = gcd(k, n);
  const [a, b] = [k / g, n / g];
  const wrong = shuffle(
    [
      [a, b + 1],
      [a + 1, b],
      [b - a, b],
      [Math.max(1, a - 1), b],
      [1, b + 1],
      [a, b * 2],
      [a + 1, b + 1],
    ].filter(([x, y]) => x > 0 && x < y && x * n !== k * y),
    rng,
  ).map(([x, y]) => frac(x, y));
  const text = { nl: 'Welke breuk is even groot als het oranje deel?', en: 'Which fraction is the same size as the orange part?' };
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'pie', parts: n, shaded: k },
      skillKey: `pizza even groot ${k}/${n}`,
      hint: {
        nl: 'Schrijf eerst de breuk van het oranje deel op. Deel dan het getal boven én onder de streep door hetzelfde getal.',
        en: 'First write the fraction for the orange part. Then divide the number above AND below the line by the same number.',
      },
      solution: { nl: `${k}/${n} = ${a}/${b} (boven en onder gedeeld door ${g})`, en: `${k}/${n} = ${a}/${b} (top and bottom divided by ${g})` },
    },
    frac(a, b),
    wrong,
  );
}

export const pizza = topic('breuken-pizza', 'Breuken: de pizza', 'Fractions: the pizza', 'verhoudingen', (level, rng) => {
  if (level <= 3) return pizzaPart(rng, [[2, 3, 4], [4, 6, 8], [3, 5, 6, 8, 10]][level - 1], false);
  if (level === 4) return pizzaPart(rng, [6, 8, 9, 10, 12], true);
  return rng() < 0.6 ? pizzaSimplest(rng) : pizzaPart(rng, [8, 9, 10, 12], true);
});

// ---------- a fraction of a number ----------

/** "de helft", "3 vierde" … for read-aloud. */
function sayFrac(k: number, n: number): string {
  if (n === 2) return k === 1 ? 'de helft' : `${k} half`;
  const name = ({ 3: 'derde', 4: 'vierde', 5: 'vijfde', 6: 'zesde', 8: 'achtste', 10: 'tiende', 20: 'twintigste', 25: 'vijfentwintigste', 100: 'honderdste' } as Record<number, string>)[n] ?? `${n}e`;
  return `${k} ${name}`;
}

export const deelVan = topic('deel-van', 'Een deel van…', 'A fraction of…', 'verhoudingen', (level, rng) => {
  let n: number, k: number, whole: number;
  if (level <= 3) {
    n = pick(rng, [2, 3, 4, 5, 10]);
    k = level === 1 ? 1 : randInt(rng, 1, n - 1);
    whole = n * randInt(rng, 2, level === 3 ? 12 : 6);
  } else if (level === 4) {
    n = pick(rng, [3, 4, 5, 6, 8, 10]);
    k = randInt(rng, 2, n - 1);
    whole = n * randInt(rng, 10, 25);
  } else {
    n = pick(rng, [4, 5, 6, 8, 10, 20, 25]);
    k = randInt(rng, 2, Math.min(n - 1, 9));
    whole = n * randInt(rng, 10, 40);
  }
  const part = whole / n;
  const v = part * k;
  // Kampioen: sometimes the whole is missing: 3/4 van □ = 60.
  if (level === 5 && rng() < 0.4) {
    return {
      text: { nl: 'Welk getal ontbreekt?', en: 'Which number is missing?' },
      expr: `${k}/${n} van ${BOX} = ${N(v)}`,
      speak: { nl: `${sayFrac(k, n)} van hoeveel is ${v}?`, en: `${k}/${n} of what is ${v}?` },
      answer: whole,
      skillKey: `${k}/${n} van ? = ${v}`,
      hint: {
        nl: `${k} stukken samen zijn ${N(v)}. Reken eerst uit hoeveel 1 stuk is, en dan hoeveel ${n} stukken zijn.`,
        en: `${k} parts together are ${E(v)}. First work out 1 part, then ${n} parts.`,
      },
      solution: {
        nl: `${N(v)} : ${k} = ${N(part)}, en ${N(part)} × ${n} = ${N(whole)}`,
        en: `${E(v)} : ${k} = ${E(part)}, and ${E(part)} × ${n} = ${E(whole)}`,
      },
    };
  }
  return {
    text: { nl: 'Reken uit.', en: 'Work it out.' },
    expr: `${k}/${n} van ${N(whole)} = ${BOX}`,
    speak: {
      nl: level <= 3 ? `Hoeveel is ${k === 1 && n === 2 ? 'de helft' : `${k} ${n === 2 ? 'half' : `${n}e`}`} van ${whole}?` : `Hoeveel is ${sayFrac(k, n)} van ${whole}?`,
      en: `What is ${k}/${n} of ${whole}?`,
    },
    answer: v,
    skillKey: `${k}/${n} van ${whole}`,
    hint: {
      nl: `Deel ${N(whole)} eerst door ${n}${k > 1 ? `, doe dat dan keer ${k}` : ''}.`,
      en: `First divide ${E(whole)} by ${n}${k > 1 ? `, then multiply by ${k}` : ''}.`,
    },
    solution: {
      nl: `${N(whole)} : ${n} = ${N(part)}${k > 1 ? `, en ${N(part)} × ${k} = ${N(v)}` : ''}`,
      en: `${E(whole)} : ${n} = ${E(part)}${k > 1 ? `, and ${E(part)} × ${k} = ${E(v)}` : ''}`,
    },
  };
});

// ---------- decimals ----------

/** a ± b with a and b counted in `per`ths (10 = tenths, 100 = hundredths), so there are no rounding errors. */
function decimalSum(a: number, sym: '+' | '−', b: number, per: number): Question {
  const v = (sym === '−' ? a - b : a + b) / per;
  const [x, y] = [a / per, b / per];
  return {
    text: { nl: 'Reken uit.', en: 'Work it out.' },
    expr: `${N(x)} ${sym} ${N(y)} = ${BOX}`,
    speak: {
      nl: `Hoeveel is ${N(x)} ${sym === '−' ? 'min' : 'plus'} ${N(y)}?`,
      en: `What is ${E(x)} ${sym === '−' ? 'minus' : 'plus'} ${E(y)}?`,
    },
    answer: v,
    decimals: true,
    skillKey: `${x}${sym}${y}`,
    hint:
      per === 100
        ? {
            nl: 'Zet de komma’s onder elkaar: tienden onder tienden, honderdsten onder honderdsten. 0,5 is hetzelfde als 0,50.',
            en: 'Line up the commas: tenths under tenths, hundredths under hundredths. 0.5 is the same as 0.50.',
          }
        : {
            nl: 'Reken eerst met de hele getallen, dan met de tienden (achter de komma).',
            en: 'Work with the whole numbers first, then the tenths (after the comma).',
          },
    solution: { nl: `${N(x)} ${sym} ${N(y)} = ${N(v)}`, en: `${E(x)} ${sym} ${E(y)} = ${E(v)}` },
  };
}

/** Two steps in tenths: a + b − c. */
function decimalTwoStep(rng: Rng): Question {
  const a = randInt(rng, 11, 199);
  const b = randInt(rng, 11, 99);
  const c = randInt(rng, 11, a + b - 1);
  const v = (a + b - c) / 10;
  const [x, y, z] = [a / 10, b / 10, c / 10];
  return {
    text: { nl: 'Reken uit. Doe het in twee stappen.', en: 'Work it out. Do it in two steps.' },
    expr: `${N(x)} + ${N(y)} − ${N(z)} = ${BOX}`,
    speak: { nl: `Hoeveel is ${N(x)} plus ${N(y)} min ${N(z)}?`, en: `What is ${E(x)} plus ${E(y)} minus ${E(z)}?` },
    answer: v,
    decimals: true,
    skillKey: `${x}+${y}-${z}`,
    hint: { nl: `Reken eerst ${N(x)} + ${N(y)}. Haal er dan ${N(z)} af.`, en: `First work out ${E(x)} + ${E(y)}. Then take away ${E(z)}.` },
    solution: { nl: `${N(x)} + ${N(y)} = ${N((a + b) / 10)}, en ${N((a + b) / 10)} − ${N(z)} = ${N(v)}`, en: `${E(x)} + ${E(y)} = ${E((a + b) / 10)}, and ${E((a + b) / 10)} − ${E(z)} = ${E(v)}` },
  };
}

export const kommagetallen = topic('kommagetallen', 'Kommagetallen', 'Decimals', 'verhoudingen', (level, rng) => {
  if (level <= 3) {
    const max = [49, 99, 99][level - 1];
    const x = randInt(rng, 11, max);
    const y = randInt(rng, 11, max);
    const sub = level === 3 && rng() < 0.5;
    const [a, b] = sub ? [Math.max(x, y), Math.min(x, y)] : [x, y];
    return decimalSum(a, sub ? '−' : '+', b, 10);
  }
  if (level === 4) {
    const r = rng();
    if (r < 0.25) {
      // A whole number minus a kommagetal: 7 − 2,4.
      const a = 10 * randInt(rng, 3, 20);
      return decimalSum(a, '−', randInt(rng, 11, a - 1), 10);
    }
    const x = randInt(rng, 101, 299);
    const y = randInt(rng, 11, 199);
    return r < 0.6 ? decimalSum(x, '+', y, 10) : decimalSum(Math.max(x, y), '−', Math.min(x, y), 10);
  }
  const r = rng();
  if (r < 0.3) return decimalTwoStep(rng);
  // Hundredths, sometimes with a tenths number: 4,35 + 2,8.
  const x = randInt(rng, 101, 999);
  const y = rng() < 0.3 ? 10 * randInt(rng, 2, 49) : randInt(rng, 11, 499);
  return r < 0.65 ? decimalSum(x, '+', y, 100) : decimalSum(Math.max(x, y), '−', Math.min(x, y), 100);
});

// ---------- perimeter and area ----------

/** A rectangle given in words: no picture, so the sides can't be read off. */
function sideFrom(rng: Rng, kind: 'omtrek' | 'opp'): Question {
  const square = rng() < 0.35;
  const w = randInt(rng, 3, 15);
  let h = square ? w : randInt(rng, 2, 12);
  if (!square && h === w) h++;
  const unit = kind === 'omtrek' ? 'cm' : 'cm²';
  const total = kind === 'omtrek' ? 2 * (w + h) : w * h;
  const what = kind === 'omtrek' ? { nl: 'omtrek', en: 'perimeter' } : { nl: 'oppervlakte', en: 'area' };
  if (square) {
    const text = {
      nl: `Een vierkant heeft een ${what.nl} van ${total} ${unit}. Hoe lang is één zijde?`,
      en: `A square has ${kind === 'omtrek' ? 'a perimeter' : 'an area'} of ${total} ${unit}. How long is one side?`,
    };
    return {
      text,
      expr: BOX,
      speak: kind === 'opp' ? { nl: text.nl.replace('cm²', 'vierkante centimeter'), en: text.en.replace('cm²', 'square centimetres') } : text,
      answer: w,
      unit: 'cm',
      skillKey: `${kind} vierkant ${total}`,
      hint:
        kind === 'omtrek'
          ? { nl: `Een vierkant heeft 4 even lange zijden. Reken ${total} : 4.`, en: `A square has 4 sides of the same length. Work out ${total} : 4.` }
          : { nl: `Welk getal keer zichzelf is ${total}?`, en: `Which number times itself is ${total}?` },
      solution:
        kind === 'omtrek'
          ? { nl: `${total} : 4 = ${w} cm`, en: `${total} : 4 = ${w} cm` }
          : { nl: `${w} × ${w} = ${total} cm², dus de zijde is ${w} cm`, en: `${w} × ${w} = ${total} cm², so the side is ${w} cm` },
    };
  }
  const text = {
    nl: `Een rechthoek is ${w} cm lang. De ${what.nl} is ${total} ${unit}. Hoe breed is de rechthoek?`,
    en: `A rectangle is ${w} cm long. The ${what.en} is ${total} ${unit}. How wide is the rectangle?`,
  };
  return {
    text,
    expr: BOX,
    speak: kind === 'opp' ? { nl: text.nl.replace('cm²', 'vierkante centimeter'), en: text.en.replace('cm²', 'square centimetres') } : text,
    answer: h,
    unit: 'cm',
    skillKey: `${kind} ${w}→${total}`,
    hint:
      kind === 'omtrek'
        ? { nl: `De lengte zit 2 keer in de omtrek. Haal ${w} + ${w} van ${total} af, en deel wat overblijft door 2.`, en: `The length is in the perimeter twice. Take ${w} + ${w} from ${total}, and divide what is left by 2.` }
        : { nl: `Lengte × breedte = oppervlakte. ${w} × hoeveel is ${total}?`, en: `Length × width = area. ${w} times what is ${total}?` },
    solution:
      kind === 'omtrek'
        ? { nl: `${total} − ${2 * w} = ${2 * h}, en ${2 * h} : 2 = ${h} cm`, en: `${total} − ${2 * w} = ${2 * h}, and ${2 * h} : 2 = ${h} cm` }
        : { nl: `${total} : ${w} = ${h} cm`, en: `${total} : ${w} = ${h} cm` },
  };
}

/** An L-shape in words: a W by H rectangle with an a by b corner cut off. */
function lShape(rng: Rng, kind: 'omtrek' | 'opp'): Question {
  const W = randInt(rng, 6, 15);
  const H = randInt(rng, 5, 12);
  const a = randInt(rng, 2, W - 2);
  const b = randInt(rng, 2, H - 2);
  const v = kind === 'omtrek' ? 2 * (W + H) : W * H - a * b;
  const text = {
    nl: `Uit een rechthoek van ${W} cm bij ${H} cm knip je een hoek van ${a} cm bij ${b} cm. Zo krijg je een L-vorm. Wat is de ${kind === 'omtrek' ? 'omtrek' : 'oppervlakte'} van de L-vorm?`,
    en: `From a rectangle of ${W} cm by ${H} cm you cut a corner of ${a} cm by ${b} cm. That gives an L-shape. What is the ${kind === 'omtrek' ? 'perimeter' : 'area'} of the L-shape?`,
  };
  return {
    text,
    expr: BOX,
    speak: kind === 'opp' ? { nl: `${text.nl} In vierkante centimeters.`, en: `${text.en} In square centimetres.` } : text,
    answer: v,
    unit: kind === 'omtrek' ? 'cm' : 'cm²',
    skillKey: `L-${kind} ${W}x${H}-${a}x${b}`,
    hint:
      kind === 'omtrek'
        ? {
            nl: 'Teken het! Schuif de twee randjes van de hoek in gedachten naar buiten. Wat valt je op?',
            en: 'Draw it! In your head, push the two edges of the cut corner outwards. What do you notice?',
          }
        : {
            nl: 'Reken de oppervlakte van de hele rechthoek uit. Haal er dan de oppervlakte van de hoek af.',
            en: 'Work out the area of the whole rectangle. Then take away the area of the corner.',
          },
    solution:
      kind === 'omtrek'
        ? {
            nl: `De omtrek is even groot als die van de hele rechthoek: ${W} + ${H} + ${W} + ${H} = ${v} cm`,
            en: `The perimeter is the same as the whole rectangle's: ${W} + ${H} + ${W} + ${H} = ${v} cm`,
          }
        : { nl: `${W} × ${H} = ${W * H}, en ${W * H} − ${a} × ${b} = ${v} cm²`, en: `${W} × ${H} = ${W * H}, and ${W * H} − ${a} × ${b} = ${v} cm²` },
  };
}

function perimeterRect(w: number, h: number): Question {
  const v = 2 * (w + h);
  const text = { nl: 'Wat is de omtrek van deze rechthoek?', en: 'What is the perimeter of this rectangle?' };
  return {
    text,
    expr: BOX,
    speak: text,
    answer: v,
    unit: 'cm',
    visual: { type: 'rect', w, h, unit: 'cm' },
    skillKey: `omtrek ${w}x${h}`,
    hint: { nl: 'De omtrek is de rand eromheen: tel alle vier de zijden bij elkaar op.', en: 'The perimeter is the edge all the way round: add up all four sides.' },
    solution: { nl: `${w} + ${h} + ${w} + ${h} = ${v} cm`, en: `${w} + ${h} + ${w} + ${h} = ${v} cm` },
  };
}

export const omtrek = topic('omtrek', 'Omtrek', 'Perimeter', 'meten', (level, rng) => {
  if (level <= 3) return perimeterRect(randInt(rng, 2, [6, 10, 14][level - 1]), randInt(rng, 2, [5, 7, 9][level - 1]));
  if (level === 4) return rng() < 0.3 ? perimeterRect(randInt(rng, 8, 25), randInt(rng, 5, 15)) : sideFrom(rng, 'omtrek');
  return rng() < 0.45 ? lShape(rng, 'omtrek') : sideFrom(rng, 'omtrek');
});

function areaRect(w: number, h: number): Question {
  const v = w * h;
  const text = { nl: 'Wat is de oppervlakte van deze rechthoek?', en: 'What is the area of this rectangle?' };
  return {
    text,
    expr: BOX,
    speak: { nl: `${text.nl} In vierkante centimeters.`, en: `${text.en} In square centimetres.` },
    answer: v,
    unit: 'cm²',
    visual: { type: 'rect', w, h, unit: 'cm' },
    skillKey: `opp ${w}x${h}`,
    hint: { nl: 'Oppervlakte = lengte × breedte. Hoeveel hokjes van 1 cm passen erin?', en: 'Area = length × width. How many 1 cm squares fit inside?' },
    solution: { nl: `${w} × ${h} = ${v} cm²`, en: `${w} × ${h} = ${v} cm²` },
  };
}

export const oppervlakte = topic('oppervlakte', 'Oppervlakte', 'Area', 'meten', (level, rng) => {
  if (level <= 3) return areaRect(randInt(rng, 2, [6, 10, 15][level - 1]), randInt(rng, 2, [5, 8, 10][level - 1]));
  if (level === 4) return rng() < 0.3 ? areaRect(randInt(rng, 11, 25), randInt(rng, 6, 15)) : sideFrom(rng, 'opp');
  return rng() < 0.5 ? lShape(rng, 'opp') : sideFrom(rng, 'opp');
});

// ---------- ratio tables ----------

const RATIO_THINGS: Bi[] = [
  { nl: 'ijsjes', en: 'ice creams' },
  { nl: 'treinkaartjes', en: 'train tickets' },
  { nl: 'schriften', en: 'notebooks' },
  { nl: 'stroopwafels', en: 'stroopwafels' },
];

function ratioForward(t: Bi, n1: number, cost1: number, n2: number, cost2: number, hint: Bi, solution: Bi, key: string): Question {
  return {
    text: {
      nl: `${n1} ${t.nl} kosten € ${cost1}. Wat kosten ${n2} ${t.nl}?`,
      en: `${n1} ${t.en} cost € ${cost1}. How much do ${n2} ${t.en} cost?`,
    },
    expr: BOX,
    speak: {
      nl: `${n1} ${t.nl} kosten ${cost1} euro. Wat kosten ${n2} ${t.nl}?`,
      en: `${n1} ${t.en} cost ${cost1} euros. How much do ${n2} ${t.en} cost?`,
    },
    answer: cost2,
    unit: '€',
    skillKey: key,
    hint,
    solution,
  };
}

/** Backwards: how many do you get for this much money? */
function ratioBackward(t: Bi, n1: number, cost1: number, n2: number, cost2: number, hint: Bi, solution: Bi, key: string): Question {
  return {
    text: {
      nl: `${n1} ${t.nl} kosten € ${cost1}. Hoeveel ${t.nl} krijg je voor € ${cost2}?`,
      en: `${n1} ${t.en} cost € ${cost1}. How many ${t.en} do you get for € ${cost2}?`,
    },
    expr: BOX,
    speak: {
      nl: `${n1} ${t.nl} kosten ${cost1} euro. Hoeveel ${t.nl} krijg je voor ${cost2} euro?`,
      en: `${n1} ${t.en} cost ${cost1} euros. How many ${t.en} do you get for ${cost2} euros?`,
    },
    answer: n2,
    skillKey: key,
    hint,
    solution,
  };
}

export const verhoudingstabel = topic('verhoudingstabel', 'Verhoudingstabel', 'Ratio tables', 'verhoudingen', (level, rng) => {
  if (level <= 3) {
    const price = randInt(rng, 2, [5, 8, 12][level - 1]);
    const n1 = randInt(rng, 2, 5);
    let n2 = randInt(rng, 6, [10, 15, 20][level - 1]);
    if (n2 === n1) n2++;
    const t = pick(rng, RATIO_THINGS);
    return ratioForward(
      t,
      n1,
      n1 * price,
      n2,
      n2 * price,
      {
        nl: `Maak een verhoudingstabel. Reken eerst uit wat 1 kost: € ${n1 * price} : ${n1}.`,
        en: `Make a ratio table. First work out the price of 1: € ${n1 * price} : ${n1}.`,
      },
      {
        nl: `1 kost € ${price}, dus ${n2} kosten ${n2} × € ${price} = € ${n2 * price}`,
        en: `1 costs € ${price}, so ${n2} cost ${n2} × € ${price} = € ${n2 * price}`,
      },
      `verhouding ${n1}:${n1 * price}→${n2}`,
    );
  }
  const t = pick(rng, RATIO_THINGS);
  // Level 4 goes via 1; Kampioen goes via a group of g, because 1 costs a broken amount (6 for € 9).
  const g = level === 4 ? 1 : randInt(rng, 2, 5);
  let c = level === 4 ? randInt(rng, 3, 15) : randInt(rng, 3, 12);
  if (g > 1 && c % g === 0) c++;
  const a = randInt(rng, 2, level === 4 ? 6 : 5);
  let b = randInt(rng, level === 4 ? 12 : 5, level === 4 ? 40 : 12);
  if (b === a) b++;
  const [n1, n2, cost1, cost2] = [g * a, g * b, c * a, c * b];
  const one = g === 1 ? { nl: '1', en: '1' } : { nl: `${g} ${t.nl}`, en: `${g} ${t.en}` };
  const hint: Bi = {
    nl: `Maak een verhoudingstabel. Reken eerst uit wat ${one.nl} ${g === 1 ? 'kost' : 'kosten'}: € ${cost1} : ${a}.`,
    en: `Make a ratio table. First work out the price of ${one.en}: € ${cost1} : ${a}.`,
  };
  const backward = level === 4 ? rng() < 0.4 : rng() < 0.5;
  if (backward)
    return ratioBackward(
      t, n1, cost1, n2, cost2, hint,
      g === 1
        ? { nl: `1 kost € ${c}, en € ${cost2} : € ${c} = ${n2} ${t.nl}`, en: `1 costs € ${c}, and € ${cost2} : € ${c} = ${n2} ${t.en}` }
        : {
            nl: `${one.nl} kosten € ${c}. € ${cost2} : € ${c} = ${b}, dus je krijgt ${b} × ${g} = ${n2} ${t.nl}`,
            en: `${one.en} cost € ${c}. € ${cost2} : € ${c} = ${b}, so you get ${b} × ${g} = ${n2} ${t.en}`,
          },
      `verhouding ${n1}:${cost1}←${cost2}`,
    );
  return ratioForward(
    t, n1, cost1, n2, cost2, hint,
    g === 1
      ? { nl: `1 kost € ${c}, dus ${n2} kosten ${n2} × € ${c} = € ${cost2}`, en: `1 costs € ${c}, so ${n2} cost ${n2} × € ${c} = € ${cost2}` }
      : {
          nl: `${one.nl} kosten € ${c}. ${n2} is ${b} × ${g}, dus ${b} × € ${c} = € ${cost2}`,
          en: `${one.en} cost € ${c}. ${n2} is ${b} × ${g}, so ${b} × € ${c} = € ${cost2}`,
        },
    `verhouding ${n1}:${cost1}→${n2}`,
  );
});

// ---------- map scale ----------

const SCALES = [
  { ratio: '1 : 100', per: 100, f: 1, unit: 'm', nl: 'meter', en: 'metres' },
  { ratio: '1 : 1.000', per: 1000, f: 10, unit: 'm', nl: 'meter', en: 'metres' },
  { ratio: '1 : 100.000', per: 100000, f: 1, unit: 'km', nl: 'kilometer', en: 'kilometres' },
];
type Scale = (typeof SCALES)[number];
const BIG_SCALES: Scale[] = [
  { ratio: '1 : 10.000', per: 10000, f: 100, unit: 'm', nl: 'meter', en: 'metres' },
  { ratio: '1 : 25.000', per: 25000, f: 250, unit: 'm', nl: 'meter', en: 'metres' },
  { ratio: '1 : 50.000', per: 50000, f: 500, unit: 'm', nl: 'meter', en: 'metres' },
  { ratio: '1 : 200.000', per: 200000, f: 2, unit: 'km', nl: 'kilometer', en: 'kilometres' },
];
const SCALE_HINT = (s: Scale): Bi => ({
  nl: `1 cm op de kaart is ${N(s.per)} cm echt. 100 cm = 1 m, en 1.000 m = 1 km.`,
  en: `1 cm on the map is ${E(s.per)} cm in real life. 100 cm = 1 m, and 1,000 m = 1 km.`,
});

function scaleForward(s: Scale, cm: number): Question {
  return {
    text: {
      nl: `De schaal is ${s.ratio}. Op de kaart is het ${cm} cm. Hoeveel ${s.nl} is het echt?`,
      en: `The scale is ${s.ratio}. On the map it is ${cm} cm. How many ${s.en} is it in real life?`,
    },
    expr: BOX,
    speak: {
      nl: `De schaal is 1 op ${s.per}. Op de kaart is het ${cm} centimeter. Hoeveel ${s.nl} is het echt?`,
      en: `The scale is 1 to ${s.per}. On the map it is ${cm} centimetres. How many ${s.en} is it in real life?`,
    },
    answer: cm * s.f,
    unit: s.unit,
    skillKey: `schaal ${s.ratio} ${cm}`,
    hint: SCALE_HINT(s),
    solution: {
      nl: `${cm} × ${N(s.per)} cm = ${N(cm * s.f)} ${s.unit}`,
      en: `${cm} × ${E(s.per)} cm = ${E(cm * s.f)} ${s.unit}`,
    },
  };
}

/** Backwards: real distance → how many cm on the map? */
function scaleBackward(s: Scale, cm: number): Question {
  const real = cm * s.f;
  return {
    text: {
      nl: `De schaal is ${s.ratio}. Echt is het ${N(real)} ${s.unit}. Hoeveel cm is het op de kaart?`,
      en: `The scale is ${s.ratio}. In real life it is ${E(real)} ${s.unit}. How many cm is it on the map?`,
    },
    expr: BOX,
    speak: {
      nl: `De schaal is 1 op ${s.per}. Echt is het ${real} ${s.nl}. Hoeveel centimeter is het op de kaart?`,
      en: `The scale is 1 to ${s.per}. In real life it is ${real} ${s.en}. How many centimetres is it on the map?`,
    },
    answer: cm,
    unit: 'cm',
    skillKey: `schaal terug ${s.ratio} ${real}`,
    hint: {
      nl: `1 cm op de kaart is ${N(s.f)} ${s.unit} echt. Hoe vaak past ${N(s.f)} in ${N(real)}?`,
      en: `1 cm on the map is ${E(s.f)} ${s.unit} in real life. How many times does ${E(s.f)} go into ${E(real)}?`,
    },
    solution: { nl: `${N(real)} : ${N(s.f)} = ${cm} cm`, en: `${E(real)} : ${E(s.f)} = ${cm} cm` },
  };
}

/** Kampioen: find the scale itself. */
function scaleFind(s: Scale, cm: number): Question {
  const real = cm * s.f;
  return {
    text: {
      nl: `Op de kaart is het ${cm} cm. Echt is het ${N(real)} ${s.unit}. Wat is de schaal?`,
      en: `On the map it is ${cm} cm. In real life it is ${E(real)} ${s.unit}. What is the scale?`,
    },
    expr: `1 : ${BOX}`,
    speak: {
      nl: `Op de kaart is het ${cm} centimeter. Echt is het ${real} ${s.nl}. De schaal is 1 op hoeveel?`,
      en: `On the map it is ${cm} centimetres. In real life it is ${real} ${s.en}. The scale is 1 to what?`,
    },
    answer: s.per,
    skillKey: `schaal vind ${s.ratio} ${cm}`,
    hint: {
      nl: `Maak van ${N(real)} ${s.unit} eerst centimeters. Hoeveel cm echt is dan 1 cm op de kaart?`,
      en: `First turn ${E(real)} ${s.unit} into centimetres. Then how many real cm is 1 cm on the map?`,
    },
    solution: {
      nl: `${N(real)} ${s.unit} = ${N(cm * s.per)} cm, en ${N(cm * s.per)} : ${cm} = ${N(s.per)}. De schaal is ${s.ratio}.`,
      en: `${E(real)} ${s.unit} = ${E(cm * s.per)} cm, and ${E(cm * s.per)} : ${cm} = ${E(s.per)}. The scale is ${s.ratio}.`,
    },
  };
}

export const schaal = topic('schaal', 'Schaal en kaarten', 'Scale and maps', 'meten', (level: LevelNo, rng: Rng) => {
  if (level <= 3) return scaleForward(SCALES[level - 1], randInt(rng, 2, 15));
  if (level === 4) {
    if (rng() < 0.6) return scaleForward(pick(rng, BIG_SCALES), randInt(rng, 2, 15));
    return scaleBackward(pick(rng, [SCALES[1], SCALES[2], BIG_SCALES[0]]), randInt(rng, 2, 15));
  }
  const r = rng();
  const s = pick(rng, [...BIG_SCALES, SCALES[1], SCALES[2]]);
  const cm = randInt(rng, 2, 12);
  if (r < 0.3) return scaleForward(s, cm);
  if (r < 0.65) return scaleBackward(s, cm);
  return scaleFind(s, cm);
});
