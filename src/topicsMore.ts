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

export const klokHeel = topic('klok-hele-halve', 'Klokkijken: hele en halve uren', 'Telling the time: hours and half hours', 'meten', (level, rng) =>
  clockQuestion(rng, [[0], [30], [0, 30]][level - 1]),
);

export const klokKwart = topic('klok-kwartier', 'Klokkijken: kwartieren', 'Telling the time: quarters', 'meten', (level, rng) =>
  clockQuestion(rng, [[0, 30], [15, 45], [0, 15, 30, 45]][level - 1]),
);

export const klokMinuten = topic('klok-minuten', 'Klokkijken: per 5 minuten', 'Telling the time: 5 minutes', 'meten', (level, rng) =>
  clockQuestion(rng, [[5, 10, 50, 55], [20, 25, 35, 40], [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]][level - 1]),
);

// ---------- which is more? ----------

export const meer = topic('wat-is-meer', 'Wat is meer?', 'Which is more?', 'getallen', (level, rng) => {
  const max = [5, 10, 15][level - 1];
  const a = randInt(rng, 1, max);
  let b = randInt(rng, 1, max);
  while (b === a) b = randInt(rng, 1, max);
  const big = Math.max(a, b);
  const text = { nl: `Wat is meer: ${a} of ${b}?`, en: `Which is more: ${a} or ${b}?` };
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'compare', a, b },
      skillKey: `meer ${Math.min(a, b)}-${big}`,
      hint: { nl: 'Kijk welke rij kralen langer is.', en: 'Look at which row of beads is longer.' },
      solution: { nl: `${big} is meer.`, en: `${big} is more.` },
    },
    { nl: String(big) },
    [{ nl: String(Math.min(a, b)) }],
  );
});

// ---------- missing number ----------

export const ontbreekt = topic('welk-getal-ontbreekt', 'Welk getal ontbreekt?', 'Missing numbers', 'getallen', (level, rng) => {
  const s = randInt(rng, 5, [10, 20, 100][level - 1]);
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
});

// ---------- fractions: the pizza ----------

export const pizza = topic('breuken-pizza', 'Breuken: de pizza', 'Fractions: the pizza', 'verhoudingen', (level, rng) => {
  const n = pick(rng, [[2, 3, 4], [4, 6, 8], [3, 5, 6, 8, 10]][level - 1]);
  const k = randInt(rng, 1, n - 1);
  const frac = (a: number, b: number): Choice => ({ nl: `${a}/${b}` });
  const wrong = shuffle(
    [
      [n - k, n],
      [k, n + 1],
      [k + 1, n],
      [k, n * 2],
      [Math.max(1, k - 1), n],
      [1, k + 1],
    ].filter(([a, b]) => a > 0 && a < b && !(a === k && b === n)),
    rng,
  ).map(([a, b]) => frac(a, b));
  const text = { nl: 'Welk deel van de pizza is oranje?', en: 'What part of the pizza is orange?' };
  return choice(
    rng,
    {
      text,
      speak: text,
      visual: { type: 'pie', parts: n, shaded: k },
      skillKey: `pizza ${k}/${n}`,
      hint: {
        nl: 'Tel alle stukken: dat getal komt onder de streep. Tel dan de oranje stukken: dat komt erboven.',
        en: 'Count all the slices: that number goes under the line. Then count the orange slices: that goes above it.',
      },
      solution: { nl: `${k} van de ${n} stukken is ${k}/${n}.`, en: `${k} of the ${n} slices is ${k}/${n}.` },
    },
    frac(k, n),
    wrong,
  );
});

// ---------- a fraction of a number ----------

export const deelVan = topic('deel-van', 'Een deel van…', 'A fraction of…', 'verhoudingen', (level, rng) => {
  const n = pick(rng, [2, 3, 4, 5, 10]);
  const k = level === 1 ? 1 : randInt(rng, 1, n - 1);
  const whole = n * randInt(rng, 2, level === 3 ? 12 : 6);
  const part = whole / n;
  const v = part * k;
  return {
    text: { nl: 'Reken uit.', en: 'Work it out.' },
    expr: `${k}/${n} van ${whole} = ${BOX}`,
    speak: {
      nl: `Hoeveel is ${k === 1 && n === 2 ? 'de helft' : `${k} ${n === 2 ? 'half' : `${n}e`}`} van ${whole}?`,
      en: `What is ${k}/${n} of ${whole}?`,
    },
    answer: v,
    skillKey: `${k}/${n} van ${whole}`,
    hint: {
      nl: `Deel ${whole} eerst door ${n}${k > 1 ? `, doe dat dan keer ${k}` : ''}.`,
      en: `First divide ${whole} by ${n}${k > 1 ? `, then multiply by ${k}` : ''}.`,
    },
    solution: {
      nl: `${whole} : ${n} = ${part}${k > 1 ? `, en ${part} × ${k} = ${v}` : ''}`,
      en: `${whole} : ${n} = ${part}${k > 1 ? `, and ${part} × ${k} = ${v}` : ''}`,
    },
  };
});

// ---------- decimals ----------

export const kommagetallen = topic('kommagetallen', 'Kommagetallen', 'Decimals', 'verhoudingen', (level, rng) => {
  // Work in tenths so there are no rounding errors.
  const max = [49, 99, 99][level - 1];
  const x = randInt(rng, 11, max);
  const y = randInt(rng, 11, max);
  const sub = level === 3 && rng() < 0.5;
  const [a, b] = sub ? [Math.max(x, y), Math.min(x, y)] : [x, y];
  const v = (sub ? a - b : a + b) / 10;
  const sym = sub ? '−' : '+';
  return {
    text: { nl: 'Reken uit.', en: 'Work it out.' },
    expr: `${N(a / 10)} ${sym} ${N(b / 10)} = ${BOX}`,
    speak: {
      nl: `Hoeveel is ${N(a / 10)} ${sub ? 'min' : 'plus'} ${N(b / 10)}?`,
      en: `What is ${E(a / 10)} ${sub ? 'minus' : 'plus'} ${E(b / 10)}?`,
    },
    answer: v,
    decimals: true,
    skillKey: `${a / 10}${sym}${b / 10}`,
    hint: {
      nl: 'Reken eerst met de hele getallen, dan met de tienden (achter de komma).',
      en: 'Work with the whole numbers first, then the tenths (after the comma).',
    },
    solution: { nl: `${N(a / 10)} ${sym} ${N(b / 10)} = ${N(v)}`, en: `${E(a / 10)} ${sym} ${E(b / 10)} = ${E(v)}` },
  };
});

// ---------- perimeter and area ----------

export const omtrek = topic('omtrek', 'Omtrek', 'Perimeter', 'meten', (level, rng) => {
  const w = randInt(rng, 2, [6, 10, 14][level - 1]);
  const h = randInt(rng, 2, [5, 7, 9][level - 1]);
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
});

export const oppervlakte = topic('oppervlakte', 'Oppervlakte', 'Area', 'meten', (level, rng) => {
  const w = randInt(rng, 2, [6, 10, 15][level - 1]);
  const h = randInt(rng, 2, [5, 8, 10][level - 1]);
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
});

// ---------- ratio tables ----------

const RATIO_THINGS: Bi[] = [
  { nl: 'ijsjes', en: 'ice creams' },
  { nl: 'treinkaartjes', en: 'train tickets' },
  { nl: 'schriften', en: 'notebooks' },
  { nl: 'stroopwafels', en: 'stroopwafels' },
];

export const verhoudingstabel = topic('verhoudingstabel', 'Verhoudingstabel', 'Ratio tables', 'verhoudingen', (level, rng) => {
  const price = randInt(rng, 2, [5, 8, 12][level - 1]);
  const n1 = randInt(rng, 2, 5);
  let n2 = randInt(rng, 6, [10, 15, 20][level - 1]);
  if (n2 === n1) n2++;
  const t = pick(rng, RATIO_THINGS);
  const text = {
    nl: `${n1} ${t.nl} kosten € ${n1 * price}. Wat kosten ${n2} ${t.nl}?`,
    en: `${n1} ${t.en} cost € ${n1 * price}. How much do ${n2} ${t.en} cost?`,
  };
  return {
    text,
    expr: BOX,
    speak: {
      nl: `${n1} ${t.nl} kosten ${n1 * price} euro. Wat kosten ${n2} ${t.nl}?`,
      en: `${n1} ${t.en} cost ${n1 * price} euros. How much do ${n2} ${t.en} cost?`,
    },
    answer: n2 * price,
    unit: '€',
    skillKey: `verhouding ${n1}:${n1 * price}→${n2}`,
    hint: {
      nl: `Maak een verhoudingstabel. Reken eerst uit wat 1 kost: € ${n1 * price} : ${n1}.`,
      en: `Make a ratio table. First work out the price of 1: € ${n1 * price} : ${n1}.`,
    },
    solution: {
      nl: `1 kost € ${price}, dus ${n2} kosten ${n2} × € ${price} = € ${n2 * price}`,
      en: `1 costs € ${price}, so ${n2} cost ${n2} × € ${price} = € ${n2 * price}`,
    },
  };
});

// ---------- map scale ----------

const SCALES = [
  { ratio: '1 : 100', per: 100, f: 1, unit: 'm', nl: 'meter', en: 'metres' },
  { ratio: '1 : 1.000', per: 1000, f: 10, unit: 'm', nl: 'meter', en: 'metres' },
  { ratio: '1 : 100.000', per: 100000, f: 1, unit: 'km', nl: 'kilometer', en: 'kilometres' },
];

export const schaal = topic('schaal', 'Schaal en kaarten', 'Scale and maps', 'meten', (level: LevelNo, rng: Rng) => {
  const s = SCALES[level - 1];
  const cm = randInt(rng, 2, 15);
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
    hint: {
      nl: `1 cm op de kaart is ${N(s.per)} cm echt. 100 cm = 1 m, en 1.000 m = 1 km.`,
      en: `1 cm on the map is ${E(s.per)} cm in real life. 100 cm = 1 m, and 1,000 m = 1 km.`,
    },
    solution: {
      nl: `${cm} × ${N(s.per)} cm = ${N(cm * s.f)} ${s.unit}`,
      en: `${cm} × ${E(s.per)} cm = ${E(cm * s.f)} ${s.unit}`,
    },
  };
});
