// The Rekenpret curriculum: groep → world (topic) → 3 levels of 10 questions.
// Every question is written in Dutch and English. Displayed sums use Dutch
// notation: thousands with a dot (10.000), ":" for division, "−" for minus.

import {
  BOX,
  coin,
  fmtEn,
  fmtNl,
  pick,
  randInt,
  type Bi,
  type Groep,
  type Item,
  type Lang,
  type LevelNo,
  type Question,
  type Rng,
  type Topic,
} from './core';
import { pictureStory } from './stories';
import {
  deelVan,
  klokHeel,
  klokKwart,
  klokMinuten,
  kommagetallen,
  meer,
  omtrek,
  ontbreekt,
  oppervlakte,
  pizza,
  schaal,
  verhoudingstabel,
} from './topicsMore';

export * from './core';

const N = fmtNl;
const E = fmtEn;

// ---------- plain sums ----------

type Op = '+' | '-' | 'x' | ':';

const SYM: Record<Op, string> = { '+': '+', '-': '−', x: '×', ':': ':' };
const WORD: Record<Op, Bi> = {
  '+': { nl: 'plus', en: 'plus' },
  '-': { nl: 'min', en: 'minus' },
  x: { nl: 'keer', en: 'times' },
  ':': { nl: 'gedeeld door', en: 'divided by' },
};

function say(n: number, lang: Lang): string {
  return n < 0 ? `${lang === 'nl' ? 'min' : 'minus'} ${-n}` : String(n);
}

function calc(a: number, op: Op, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case 'x':
      return a * b;
    case ':':
      return a / b;
  }
}

const WORK_IT_OUT: Bi = { nl: 'Reken uit.', en: 'Work it out.' };

function arith(a: number, op: Op, b: number, hint?: Bi): Question {
  return {
    text: WORK_IT_OUT,
    expr: `${N(a)} ${SYM[op]} ${N(b)} = ${BOX}`,
    speak: {
      nl: `Hoeveel is ${say(a, 'nl')} ${WORD[op].nl} ${say(b, 'nl')}?`,
      en: `What is ${say(a, 'en')} ${WORD[op].en} ${say(b, 'en')}?`,
    },
    answer: calc(a, op, b),
    hint: hint ?? hintFor(a, op, b),
    skillKey: `${a}${SYM[op]}${b}`,
    solution: {
      nl: `${N(a)} ${SYM[op]} ${N(b)} = ${N(calc(a, op, b))}`,
      en: `${E(a)} ${SYM[op]} ${E(b)} = ${E(calc(a, op, b))}`,
    },
  };
}

// ---------- hints ----------

function trailingZeros(n: number): number {
  let k = 0;
  while (n !== 0 && n % 10 === 0) {
    n /= 10;
    k++;
  }
  return k;
}

/** "Leave off the zeros" hint for sums of round numbers like 40.000 + 30.000. */
function zerosHint(a: number, op: '+' | '-', b: number): Bi | undefined {
  const k = Math.min(trailingZeros(a), trailingZeros(b));
  if (k < 2) return undefined;
  const x = a / 10 ** k;
  const y = b / 10 ** k;
  return {
    nl: `Laat ${k} nullen even weg: ${N(x)} ${SYM[op]} ${N(y)}. Zet ze daarna weer terug.`,
    en: `Leave off ${k} zeros: ${E(x)} ${SYM[op]} ${E(y)}. Then put them back.`,
  };
}

function addHint(a: number, b: number): Bi {
  const ones = a % 10;
  if (b < 10 && ones !== 0 && ones + b > 10) {
    const x = 10 - ones;
    return {
      nl: `Maak eerst een tiental: ${N(a)} + ${x} = ${N(a + x)}. Dan nog ${b - x} erbij.`,
      en: `Make a ten first: ${E(a)} + ${x} = ${E(a + x)}. Then add ${b - x} more.`,
    };
  }
  if (b < 10) return { nl: `Begin bij ${N(a)} en tel ${b} verder.`, en: `Start at ${E(a)} and count on ${b}.` };
  if (b < 100 && b % 10 === 0) {
    return a < 100 && a % 10 === 0
      ? { nl: `Denk in tientallen: ${a / 10} + ${b / 10}.`, en: `Think in tens: ${a / 10} + ${b / 10}.` }
      : { nl: `Tel ${b / 10} tientallen verder vanaf ${N(a)}.`, en: `Count on ${b / 10} tens from ${E(a)}.` };
  }
  if (b < 100) {
    const t = b - (b % 10);
    return {
      nl: `Splits ${b} in ${t} en ${b % 10}: eerst ${N(a)} + ${t} = ${N(a + t)}, dan nog ${b % 10} erbij.`,
      en: `Split ${b} into ${t} and ${b % 10}: first ${E(a)} + ${t} = ${E(a + t)}, then add ${b % 10} more.`,
    };
  }
  return (
    zerosHint(a, '+', b) ?? {
      nl: 'Tel eerst de grote delen op, daarna de rest. Zet de getallen onder elkaar als dat helpt.',
      en: 'Add the big parts first, then the rest. Write the numbers under each other if that helps.',
    }
  );
}

function subHint(a: number, b: number): Bi {
  const ones = a % 10;
  if (b < 10 && a > 10 && ones !== 0 && b > ones) {
    return {
      nl: `Eerst terug naar ${N(a - ones)}: ${N(a)} − ${ones}. Dan nog ${b - ones} eraf.`,
      en: `First go back to ${E(a - ones)}: ${E(a)} − ${ones}. Then take away ${b - ones} more.`,
    };
  }
  if (b < 10) return { nl: `Begin bij ${N(a)} en tel ${b} terug.`, en: `Start at ${E(a)} and count back ${b}.` };
  if (b < 100 && b % 10 === 0) {
    return a <= 100 && a % 10 === 0
      ? { nl: `Denk in tientallen: ${a / 10} − ${b / 10}.`, en: `Think in tens: ${a / 10} − ${b / 10}.` }
      : { nl: `Tel ${b / 10} tientallen terug vanaf ${N(a)}.`, en: `Count back ${b / 10} tens from ${E(a)}.` };
  }
  if (b < 100) {
    const t = b - (b % 10);
    return {
      nl: `Splits ${b} in ${t} en ${b % 10}: eerst ${N(a)} − ${t} = ${N(a - t)}, dan nog ${b % 10} eraf.`,
      en: `Split ${b} into ${t} and ${b % 10}: first ${E(a)} − ${t} = ${E(a - t)}, then take away ${b % 10} more.`,
    };
  }
  return (
    zerosHint(a, '-', b) ?? {
      nl: 'Haal eerst de grote delen eraf, daarna de rest. Zet de getallen onder elkaar als dat helpt.',
      en: 'Take away the big parts first, then the rest. Write the numbers under each other if that helps.',
    }
  );
}

function mulHint(a: number, b: number): Bi {
  if (a === 1 || b === 1) {
    return { nl: '1 keer een getal is dat getal zelf.', en: '1 times a number is the number itself.' };
  }
  if (a <= 10 && b <= 10) {
    return {
      nl: `${a - 1} × ${b} = ${(a - 1) * b}. Doe er nog ${b} bij.`,
      en: `${a - 1} × ${b} = ${(a - 1) * b}. Add ${b} more.`,
    };
  }
  // Split the two-digit factor into tens and ones.
  const [x, y] = b > 10 ? [b, a] : [a, b];
  const t = x - (x % 10);
  const o = x % 10;
  if (o === 0) {
    return {
      nl: `Reken ${x / 10} × ${y} en zet er een 0 achter.`,
      en: `Work out ${x / 10} × ${y} and put a 0 on the end.`,
    };
  }
  return {
    nl: `Splits ${x} in ${t} en ${o}: ${t} × ${y} = ${N(t * y)} en ${o} × ${y} = ${N(o * y)}. Tel ze op.`,
    en: `Split ${x} into ${t} and ${o}: ${t} × ${y} = ${E(t * y)} and ${o} × ${y} = ${E(o * y)}. Add them up.`,
  };
}

function divHint(a: number, b: number): Bi {
  if (b <= 10 && a / b <= 10) {
    return {
      nl: `Welk getal keer ${b} is ${a}? Denk aan de tafel van ${b}.`,
      en: `Which number times ${b} makes ${a}? Think of the ${b} times table.`,
    };
  }
  return {
    nl: `Hoe vaak past ${b} in ${N(a)}? Begin met grote stappen, zoals 10 × ${b} = ${N(10 * b)}.`,
    en: `How many times does ${b} fit into ${E(a)}? Start with big jumps, like 10 × ${b} = ${E(10 * b)}.`,
  };
}

function hintFor(a: number, op: Op, b: number): Bi {
  switch (op) {
    case '+':
      return addHint(a, b);
    case '-':
      return subHint(a, b);
    case 'x':
      return mulHint(a, b);
    case ':':
      return divHint(a, b);
  }
}

// ---------- topic builders ----------

/** Things that make nice pictures for small sums. */
const PICTURE_ITEMS: Item[] = ['apple', 'cupcake', 'duck', 'balloon', 'marble', 'cookie'];

function topic(id: string, nl: string, en: string, make: Topic['make'], allowNegative = false): Topic {
  return { id, name: { nl, en }, make, allowNegative };
}

/** Addition or subtraction with round numbers in units of `unit`, staying within `max`. */
function roundSum(rng: Rng, unit: number, max: number): Question {
  const m = max / unit;
  if (coin(rng)) {
    const x = randInt(rng, 1, m - 1);
    return arith(x * unit, '+', randInt(rng, 1, m - x) * unit);
  }
  const x = randInt(rng, 2, m);
  return arith(x * unit, '-', randInt(rng, 1, x - 1) * unit);
}

const tellen = topic('tellen', 'Tellen', 'Counting', (level, rng) => {
  const n = [randInt(rng, 1, 5), randInt(rng, 3, 10), randInt(rng, 8, 20)][level - 1];
  const text = { nl: 'Hoeveel bolletjes zie je?', en: 'How many beads do you see?' };
  return {
    text,
    expr: BOX,
    speak: text,
    answer: n,
    beads: n,
    hint:
      n <= 5
        ? { nl: 'Wijs ze één voor één aan en tel mee.', en: 'Point to each one and count along.' }
        : { nl: 'Een rij heeft 5 oranje en 5 witte bolletjes: samen 10.', en: 'A row has 5 orange and 5 white beads: 10 in all.' },
  };
});

const voorEnNa = topic('voor-en-na', 'Ervoor en erna', 'Before and after', (level, rng) => {
  const max = [5, 10, 20][level - 1];
  if (coin(rng)) {
    const n = randInt(rng, 1, max - 1);
    const text = { nl: `Welk getal komt na ${n}?`, en: `Which number comes after ${n}?` };
    return { text, expr: `${n}, ${BOX}`, speak: text, answer: n + 1, hint: { nl: `Tel hardop verder vanaf ${n}.`, en: `Count on out loud from ${n}.` } };
  }
  const n = randInt(rng, 2, max);
  const text = { nl: `Welk getal komt voor ${n}?`, en: `Which number comes before ${n}?` };
  return { text, expr: `${BOX}, ${n}`, speak: text, answer: n - 1, hint: { nl: `Tel hardop terug vanaf ${n}.`, en: `Count back out loud from ${n}.` } };
});

const erbij10 = topic('erbij-10', 'Erbij tot 10', 'Adding to 10', (level, rng) => {
  if (level === 3) {
    const a = randInt(rng, 2, 8);
    return pictureStory(rng, a, '+', randInt(rng, 2, 10 - a));
  }
  const a = level === 1 ? randInt(rng, 1, 4) : randInt(rng, 1, 9);
  const b = randInt(rng, 1, (level === 1 ? 5 : 10) - a);
  return { ...arith(a, '+', b), scene: { item: pick(rng, PICTURE_ITEMS), groups: [a, b], join: '+' } };
});

const eraf10 = topic('eraf-10', 'Eraf tot 10', 'Taking away to 10', (level, rng) => {
  if (level === 3) {
    const a = randInt(rng, 4, 10);
    return pictureStory(rng, a, '-', randInt(rng, 2, a));
  }
  const a = level === 1 ? randInt(rng, 2, 5) : randInt(rng, 3, 10);
  const b = randInt(rng, 1, a);
  return { ...arith(a, '-', b), scene: { item: pick(rng, PICTURE_ITEMS), groups: [a], gone: b } };
});

const splitsen = topic('splitsen', 'Splitsen', 'Number bonds', (level, rng) => {
  const total = [randInt(rng, 3, 5), randInt(rng, 6, 10), 10][level - 1];
  const k = randInt(rng, 1, total - 1);
  return {
    text: { nl: `Splits ${total}.`, en: `Split ${total}.` },
    expr: `${total} = ${k} + ${BOX}`,
    speak: { nl: `${total} is ${k} en hoeveel?`, en: `${total} is ${k} and how many more?` },
    answer: total - k,
    hint: { nl: `Tel van ${k} door tot ${total}.`, en: `Count on from ${k} to ${total}.` },
  };
});

const tot20 = topic('tot-20', 'Erbij en eraf tot 20', 'Adding and taking away to 20', (level, rng) => {
  const add = coin(rng);
  let a: number;
  let b: number;
  if (level === 1) {
    // No crossing over ten.
    if (add) {
      a = randInt(rng, 10, 18);
      b = randInt(rng, 1, 19 - a);
    } else {
      a = randInt(rng, 11, 19);
      b = randInt(rng, 1, a - 10);
    }
  } else if (add) {
    // Crossing over ten.
    a = randInt(rng, 2, 9);
    b = randInt(rng, 11 - a, 9);
  } else {
    a = randInt(rng, 11, 18);
    b = randInt(rng, a - 9, 9);
  }
  if (level === 3) return pictureStory(rng, a, add ? '+' : '-', b);
  return arith(a, add ? '+' : '-', b);
});

const plus100 = topic('plus-100', 'Erbij tot 100', 'Adding to 100', (level, rng) => {
  if (level === 1) {
    const a = randInt(rng, 1, 8);
    return arith(a * 10, '+', randInt(rng, 1, 9 - a) * 10);
  }
  if (level === 2) {
    const a = randInt(rng, 11, 89);
    return arith(a, '+', randInt(rng, 2, Math.min(9, 100 - a)));
  }
  const a = randInt(rng, 11, 79);
  return arith(a, '+', randInt(rng, 11, 100 - a));
});

const min100 = topic('min-100', 'Eraf tot 100', 'Taking away to 100', (level, rng) => {
  if (level === 1) {
    const a = randInt(rng, 2, 10);
    return arith(a * 10, '-', randInt(rng, 1, a - 1) * 10);
  }
  if (level === 2) return arith(randInt(rng, 21, 99), '-', randInt(rng, 2, 9));
  const a = randInt(rng, 30, 99);
  return arith(a, '-', randInt(rng, 11, a - 1));
});

function tables(rng: Rng, tableList: number[]): Question {
  return arith(randInt(rng, 1, 10), 'x', pick(rng, tableList));
}

const tafels4 = topic('tafels-1-2-5-10', 'Tafels van 1, 2, 5 en 10', 'Times tables 1, 2, 5 and 10', (level, rng) =>
  tables(rng, [[1, 10], [2, 5], [1, 2, 5, 10]][level - 1]),
);

const rekenen1000 = topic('rekenen-1000', 'Rekenen tot 1.000', 'Sums to 1,000', (level, rng) => {
  if (level === 1) return roundSum(rng, 100, 1000);
  if (level === 2) {
    if (coin(rng)) {
      const a = randInt(rng, 101, 899);
      return arith(a, '+', randInt(rng, 11, Math.min(99, 1000 - a)));
    }
    return arith(randInt(rng, 150, 999), '-', randInt(rng, 11, 99));
  }
  if (coin(rng)) {
    const a = randInt(rng, 101, 700);
    return arith(a, '+', randInt(rng, 101, 1000 - a));
  }
  const a = randInt(rng, 300, 999);
  return arith(a, '-', randInt(rng, 101, a - 1));
});

const alleTafels = topic('alle-tafels', 'Alle tafels', 'All times tables', (level, rng) =>
  tables(rng, [[3, 4], [6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]][level - 1]),
);

const delen = topic('delen', 'Delen', 'Dividing', (level, rng) => {
  const t = pick(rng, [[2, 5, 10], [3, 4], [2, 3, 4, 5, 6, 7, 8, 9, 10]][level - 1]);
  return arith(randInt(rng, 1, 10) * t, ':', t);
});

const plus10000 = topic('plus-10000', 'Optellen tot 10.000', 'Adding to 10,000', (level, rng) => {
  if (level === 1) {
    const a = randInt(rng, 1, 8);
    return arith(a * 1000, '+', randInt(rng, 1, 9 - a) * 1000);
  }
  if (level === 2) {
    const a = randInt(rng, 1001, 8999);
    return arith(a, '+', randInt(rng, 101, Math.min(999, 10000 - a)));
  }
  const a = randInt(rng, 1001, 7999);
  return arith(a, '+', randInt(rng, 1001, 10000 - a));
});

const min10000 = topic('min-10000', 'Aftrekken tot 10.000', 'Taking away to 10,000', (level, rng) => {
  if (level === 1) {
    const a = randInt(rng, 2, 10);
    return arith(a * 1000, '-', randInt(rng, 1, a - 1) * 1000);
  }
  if (level === 2) return arith(randInt(rng, 1500, 9999), '-', randInt(rng, 101, 999));
  const a = randInt(rng, 3000, 9999);
  return arith(a, '-', randInt(rng, 1001, a - 1));
});

const keer = topic('vermenigvuldigen', 'Vermenigvuldigen', 'Multiplying', (level, rng) => {
  if (level === 1) return arith(randInt(rng, 2, 9) * 10, 'x', randInt(rng, 2, 9));
  if (level === 2) return arith(randInt(rng, 11, 99), 'x', randInt(rng, 2, 9));
  return arith(randInt(rng, 11, 25), 'x', randInt(rng, 11, 19));
});

const groteGetallen = topic('grote-getallen', 'Grote getallen', 'Big numbers', (level, rng) =>
  roundSum(rng, [10000, 1000, 100][level - 1], 1_000_000),
);

const staartdeling = topic('staartdeling', 'Staartdeling', 'Long division', (level, rng) => {
  if (level === 1) {
    const b = randInt(rng, 2, 9);
    return arith(randInt(rng, 11, Math.floor(99 / b)) * b, ':', b);
  }
  if (level === 2) {
    const b = randInt(rng, 2, 9);
    return arith(randInt(rng, Math.ceil(100 / b), Math.floor(999 / b)) * b, ':', b);
  }
  const b = randInt(rng, 11, 25);
  return arith(randInt(rng, 4, 40) * b, ':', b);
});

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function percentHint(p: number, base: number): Bi {
  switch (p) {
    case 50:
      return { nl: '50% is de helft.', en: '50% is half.' };
    case 25:
      return { nl: '25% is een kwart: de helft van de helft.', en: '25% is a quarter: half of a half.' };
    case 10:
      return { nl: '10% is een tiende: deel door 10.', en: '10% is a tenth: divide by 10.' };
    case 20:
      return { nl: '20% is 2 × 10%. Reken eerst 10% uit.', en: '20% is 2 × 10%. Work out 10% first.' };
    case 5:
      return { nl: '5% is de helft van 10%.', en: '5% is half of 10%.' };
    case 75:
      return { nl: '75% is drie kwart: 3 × 25%.', en: '75% is three quarters: 3 × 25%.' };
    default:
      return {
        nl: `Reken eerst 10% uit: ${N(base / 10)}. Hoe vaak heb je dat nodig?`,
        en: `Work out 10% first: ${E(base / 10)}. How many of those do you need?`,
      };
  }
}

const procenten = topic('procenten', 'Procenten', 'Percentages', (level, rng) => {
  const p = pick(rng, [[50, 10], [25, 20, 5], [15, 30, 75, 40]][level - 1]);
  const unit = 100 / gcd(p, 100);
  const base = unit * randInt(rng, 1, Math.floor(1000 / unit));
  return {
    text: WORK_IT_OUT,
    expr: `${p}% van ${N(base)} = ${BOX}`,
    speak: { nl: `Hoeveel is ${p} procent van ${base}?`, en: `What is ${p} percent of ${base}?` },
    answer: (base * p) / 100,
    hint: percentHint(p, base),
  };
});

const afronden = topic('afronden', 'Afronden', 'Rounding', (level, rng) => {
  const unit = [10, 100, 1000][level - 1];
  let n: number;
  do {
    n = randInt(rng, unit + 1, unit * 100 - 1);
  } while (n % unit === 0);
  const place = [
    { nl: 'tientallen', en: 'ten', digitNl: 'eenheden', digitEn: 'ones' },
    { nl: 'honderdtallen', en: 'hundred', digitNl: 'tientallen', digitEn: 'tens' },
    { nl: 'duizendtallen', en: 'thousand', digitNl: 'honderdtallen', digitEn: 'hundreds' },
  ][level - 1];
  return {
    text: { nl: `Rond ${N(n)} af op ${place.nl}.`, en: `Round ${E(n)} to the nearest ${place.en}.` },
    expr: `${N(n)} ≈ ${BOX}`,
    speak: { nl: `Rond ${n} af op ${place.nl}.`, en: `Round ${n} to the nearest ${place.en}.` },
    answer: Math.round(n / unit) * unit,
    hint: {
      nl: `Kijk naar het cijfer van de ${place.digitNl}: 5 of meer? Dan rond je naar boven af.`,
      en: `Look at the ${place.digitEn} digit: 5 or more? Then round up.`,
    },
  };
});

const THERMOMETER: Bi = {
  nl: 'Denk aan een thermometer: onder 0 tel je verder naar beneden.',
  en: 'Think of a thermometer: below 0 you keep counting down.',
};

const onderNul = topic(
  'onder-nul',
  'Onder nul',
  'Below zero',
  (level, rng) => {
    if (level === 1) {
      const a = randInt(rng, 1, 9);
      const b = randInt(rng, a + 1, 15);
      if (coin(rng)) {
        const text = {
          nl: `Het is ${a} graden. Het wordt ${b} graden kouder. Hoeveel graden is het nu?`,
          en: `It is ${a} degrees. It gets ${b} degrees colder. What is the temperature now?`,
        };
        return { text, expr: `${BOX} °C`, speak: text, answer: a - b, hint: THERMOMETER };
      }
      return arith(a, '-', b, THERMOMETER);
    }
    const a = -randInt(rng, 1, 10);
    if (level === 2 || coin(rng)) return arith(a, '+', randInt(rng, 1, 15), THERMOMETER);
    return arith(a, '-', randInt(rng, 1, 10), THERMOMETER);
  },
  true,
);

const MIXED: [Topic, LevelNo][][] = [
  [[rekenen1000, 2], [alleTafels, 3], [delen, 3]],
  [[plus10000, 2], [min10000, 2], [keer, 2]],
  [[staartdeling, 2], [groteGetallen, 2], [procenten, 2]],
];

const gemengd = topic('gemengd', 'Gemengd oefenen', 'Mixed practice', (level, rng) => {
  const [t, l] = pick(rng, MIXED[level - 1]);
  return t.make(l, rng);
});

export const GROEPEN: Groep[] = [
  { id: '1-2', name: { nl: 'Groep 1–2', en: 'Group 1–2' }, age: '4–6', topics: [tellen, voorEnNa, meer] },
  { id: '3', name: { nl: 'Groep 3', en: 'Group 3' }, age: '6–7', topics: [erbij10, eraf10, splitsen, tot20, klokHeel] },
  { id: '4', name: { nl: 'Groep 4', en: 'Group 4' }, age: '7–8', topics: [plus100, min100, ontbreekt, tafels4, klokKwart] },
  { id: '5', name: { nl: 'Groep 5', en: 'Group 5' }, age: '8–9', topics: [rekenen1000, alleTafels, delen, pizza, klokMinuten] },
  { id: '6', name: { nl: 'Groep 6', en: 'Group 6' }, age: '9–10', topics: [plus10000, min10000, keer, kommagetallen, deelVan, omtrek] },
  { id: '7', name: { nl: 'Groep 7', en: 'Group 7' }, age: '10–11', topics: [groteGetallen, staartdeling, procenten, verhoudingstabel, oppervlakte] },
  { id: '8', name: { nl: 'Groep 8', en: 'Group 8' }, age: '11–12', topics: [gemengd, afronden, onderNul, schaal] },
];

procenten.domain = 'verhoudingen';
