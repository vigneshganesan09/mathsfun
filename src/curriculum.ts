// The Rekenpret curriculum: groep → world (topic) → 5 levels of 10 questions.
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

/** Keep drawing until `ok` holds (gives up after 200 tries and returns the last one). */
function until<T>(make: () => T, ok: (t: T) => boolean): T {
  let t = make();
  for (let i = 0; i < 200 && !ok(t); i++) t = make();
  return t;
}

/** Pick one of a few question makers. */
function oneOf(rng: Rng, makers: (() => Question)[]): Question {
  return pick(rng, makers)();
}

// ---------- missing numbers, two-step sums and number stories (levels 4–5) ----------

const WHICH_NUMBER: Bi = { nl: 'Welk getal hoort op het hokje?', en: 'Which number goes in the box?' };

function missingHint(a: number, op: Op, b: number, c: number, unknown: 'first' | 'second'): Bi {
  switch (op) {
    case '+':
      return unknown === 'second'
        ? {
            nl: `Hoeveel moet je bij ${N(a)} doen om ${N(c)} te krijgen? Reken terug: ${N(c)} − ${N(a)}.`,
            en: `How much do you add to ${E(a)} to get ${E(c)}? Work back: ${E(c)} − ${E(a)}.`,
          }
        : {
            nl: `Welk getal plus ${N(b)} is ${N(c)}? Reken terug: ${N(c)} − ${N(b)}.`,
            en: `Which number plus ${E(b)} makes ${E(c)}? Work back: ${E(c)} − ${E(b)}.`,
          };
    case '-':
      return unknown === 'second'
        ? {
            nl: `Hoeveel moet er van ${N(a)} af om op ${N(c)} uit te komen? Reken: ${N(a)} − ${N(c)}.`,
            en: `How much do you take from ${E(a)} to end up at ${E(c)}? Work out ${E(a)} − ${E(c)}.`,
          }
        : {
            nl: `Na het eraf halen blijft er ${N(c)} over. Reken terug met erbij: ${N(c)} + ${N(b)}.`,
            en: `After taking away, ${E(c)} is left. Work back by adding: ${E(c)} + ${E(b)}.`,
          };
    case 'x': {
      const k = unknown === 'first' ? b : a;
      return c / k <= 10 && k <= 10
        ? {
            nl: `Welk getal keer ${k} is ${N(c)}? Denk aan de tafel van ${k}.`,
            en: `Which number times ${k} makes ${E(c)}? Think of the ${k} times table.`,
          }
        : {
            nl: `Welk getal keer ${N(k)} is ${N(c)}? Reken: ${N(c)} gedeeld door ${N(k)}.`,
            en: `Which number times ${E(k)} makes ${E(c)}? Work out ${E(c)} divided by ${E(k)}.`,
          };
    }
    case ':':
      return unknown === 'second'
        ? {
            nl: `Hoeveel groepjes van ${N(c)} passen er in ${N(a)}? Reken: ${N(a)} : ${N(c)}.`,
            en: `How many groups of ${E(c)} fit into ${E(a)}? Work out ${E(a)} : ${E(c)}.`,
          }
        : {
            nl: `Reken terug met keer: ${N(c)} × ${N(b)}.`,
            en: `Work back with times: ${E(c)} × ${E(b)}.`,
          };
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A sum with the box in place of one of the two numbers: `a + □ = c` or `□ − b = c`. */
function missing(a: number, op: Op, b: number, unknown: 'first' | 'second', hint?: Bi): Question {
  const c = calc(a, op, b);
  const left = unknown === 'first' ? `${BOX} ${SYM[op]} ${N(b)}` : `${N(a)} ${SYM[op]} ${BOX}`;
  return {
    text: WHICH_NUMBER,
    expr: `${left} = ${N(c)}`,
    speak:
      unknown === 'first'
        ? {
            nl: `Welk getal ${WORD[op].nl} ${say(b, 'nl')} is ${say(c, 'nl')}?`,
            en: `Which number ${WORD[op].en} ${say(b, 'en')} makes ${say(c, 'en')}?`,
          }
        : {
            nl: cap(`${say(a, 'nl')} ${WORD[op].nl} welk getal is ${say(c, 'nl')}?`),
            en: cap(`${say(a, 'en')} ${WORD[op].en} which number makes ${say(c, 'en')}?`),
          },
    answer: unknown === 'first' ? a : b,
    hint: hint ?? missingHint(a, op, b, c, unknown),
    skillKey: unknown === 'first' ? `?${SYM[op]}${b}=${c}` : `${a}${SYM[op]}?=${c}`,
    solution: {
      nl: `${N(a)} ${SYM[op]} ${N(b)} = ${N(c)}`,
      en: `${E(a)} ${SYM[op]} ${E(b)} = ${E(c)}`,
    },
  };
}

/** Either side unknown, half the time each. */
function missingAny(rng: Rng, a: number, op: Op, b: number, hint?: Bi): Question {
  return missing(a, op, b, coin(rng) ? 'first' : 'second', hint);
}

/** Two steps, worked out from left to right: `a + b − c = □`, `a × b + c = □`. */
function twoStep(a: number, op1: Op, b: number, op2: Op, c: number, hint?: Bi): Question {
  const x = calc(a, op1, b);
  const answer = calc(x, op2, c);
  return {
    text: WORK_IT_OUT,
    expr: `${N(a)} ${SYM[op1]} ${N(b)} ${SYM[op2]} ${N(c)} = ${BOX}`,
    speak: {
      nl: `Hoeveel is ${say(a, 'nl')} ${WORD[op1].nl} ${say(b, 'nl')} ${WORD[op2].nl} ${say(c, 'nl')}?`,
      en: `What is ${say(a, 'en')} ${WORD[op1].en} ${say(b, 'en')} ${WORD[op2].en} ${say(c, 'en')}?`,
    },
    answer,
    hint: hint ?? {
      nl: `Twee stappen. Reken eerst ${N(a)} ${SYM[op1]} ${N(b)} uit. Doe daarna ${SYM[op2]} ${N(c)}.`,
      en: `Two steps. First work out ${E(a)} ${SYM[op1]} ${E(b)}. Then do ${SYM[op2]} ${E(c)}.`,
    },
    skillKey: `${a}${SYM[op1]}${b}${SYM[op2]}${c}`,
    solution: {
      nl: `${N(a)} ${SYM[op1]} ${N(b)} = ${N(x)}, en ${N(x)} ${SYM[op2]} ${N(c)} = ${N(answer)}`,
      en: `${E(a)} ${SYM[op1]} ${E(b)} = ${E(x)}, and ${E(x)} ${SYM[op2]} ${E(c)} = ${E(answer)}`,
    },
  };
}

/** A number story line: fills in numbers written for the screen (1.000 / 1,000) or for speech (1000). */
type Line = (a: string, b: string, lang: Lang) => string;

const ADD_LINES: Line[] = [
  (a, b, l) =>
    l === 'nl'
      ? `Noor heeft ${a} knikkers. Ze krijgt er ${b} bij. Hoeveel knikkers heeft ze nu?`
      : `Noor has ${a} marbles. She gets ${b} more. How many marbles does she have now?`,
  (a, b, l) =>
    l === 'nl'
      ? `In de bibliotheek staan ${a} boeken. Er komen ${b} nieuwe boeken bij. Hoeveel boeken zijn het samen?`
      : `The library has ${a} books. ${b} new books arrive. How many books is that altogether?`,
  (a, b, l) =>
    l === 'nl'
      ? `Sam heeft ${a} punten in een spel. Hij wint er nog ${b} bij. Hoeveel punten heeft hij nu?`
      : `Sam has ${a} points in a game. He wins ${b} more. How many points does he have now?`,
];

const SUB_LINES: Line[] = [
  (a, b, l) =>
    l === 'nl'
      ? `In de trein zitten ${a} mensen. Er stappen ${b} mensen uit. Hoeveel mensen zitten er nog in de trein?`
      : `There are ${a} people on the train. ${b} people get off. How many people are still on the train?`,
  (a, b, l) =>
    l === 'nl'
      ? `Een boek heeft ${a} bladzijden. Noor heeft er al ${b} gelezen. Hoeveel bladzijden moet ze nog lezen?`
      : `A book has ${a} pages. Noor has already read ${b}. How many pages does she still have to read?`,
  (a, b, l) =>
    l === 'nl'
      ? `Opa heeft ${a} euro. Hij geeft ${b} euro uit. Hoeveel euro heeft hij nog?`
      : `Grandpa has ${a} euros. He spends ${b} euros. How many euros does he have left?`,
];

const MUL_LINES: Line[] = [
  (a, b, l) =>
    l === 'nl'
      ? `Er staan ${a} dozen. In elke doos zitten ${b} koekjes. Hoeveel koekjes zijn dat samen?`
      : `There are ${a} boxes. Each box has ${b} cookies. How many cookies is that altogether?`,
  (a, b, l) =>
    l === 'nl'
      ? `Sam koopt ${a} zakjes met elk ${b} knikkers. Hoeveel knikkers heeft hij?`
      : `Sam buys ${a} bags with ${b} marbles in each. How many marbles does he have?`,
  (a, b, l) =>
    l === 'nl'
      ? `In de zaal staan ${a} rijen met elk ${b} stoelen. Hoeveel stoelen zijn er?`
      : `The hall has ${a} rows with ${b} chairs in each. How many chairs are there?`,
];

const DIV_LINES: Line[] = [
  (a, b, l) =>
    l === 'nl'
      ? `Juf verdeelt ${a} stickers eerlijk over ${b} kinderen. Hoeveel stickers krijgt elk kind?`
      : `The teacher shares ${a} stickers fairly between ${b} children. How many stickers does each child get?`,
  (a, b, l) =>
    l === 'nl'
      ? `Er gaan ${a} kinderen op schoolreis. In elk busje passen ${b} kinderen. Hoeveel busjes zijn er nodig?`
      : `${a} children go on a school trip. Each minibus holds ${b} children. How many minibuses are needed?`,
  (a, b, l) =>
    l === 'nl'
      ? `Opa heeft ${a} appels. Hij doet er ${b} in elke zak. Hoeveel zakken heeft hij nodig?`
      : `Grandpa has ${a} apples. He puts ${b} in each bag. How many bags does he need?`,
];

const LINES: Record<Op, Line[]> = { '+': ADD_LINES, '-': SUB_LINES, x: MUL_LINES, ':': DIV_LINES };

const STORY_HINT: Record<Op, (a: number, b: number) => Bi> = {
  '+': (a, b) => ({
    nl: `Er komt iets bij, dus het is een erbij-som: ${N(a)} + ${N(b)}.`,
    en: `Something is added, so it's a plus sum: ${E(a)} + ${E(b)}.`,
  }),
  '-': (a, b) => ({
    nl: `Er gaat iets af, dus het is een eraf-som: ${N(a)} − ${N(b)}.`,
    en: `Something is taken away, so it's a minus sum: ${E(a)} − ${E(b)}.`,
  }),
  x: (a, b) => ({
    nl: `${N(a)} groepjes van ${N(b)}: dat is een keer-som, ${N(a)} × ${N(b)}.`,
    en: `${E(a)} groups of ${E(b)}: that's a times sum, ${E(a)} × ${E(b)}.`,
  }),
  ':': (a, b) => ({
    nl: `Hoe vaak past ${N(b)} in ${N(a)}? Reken ${N(a)} gedeeld door ${N(b)}.`,
    en: `How many times does ${E(b)} fit into ${E(a)}? Work out ${E(a)} divided by ${E(b)}.`,
  }),
};

/** A short number story (no picture) for `a op b`. */
function wordProblem(rng: Rng, a: number, op: Op, b: number): Question {
  const line = pick(rng, LINES[op]);
  const answer = calc(a, op, b);
  return {
    text: { nl: line(N(a), N(b), 'nl'), en: line(E(a), E(b), 'en') },
    expr: BOX,
    speak: { nl: line(String(a), String(b), 'nl'), en: line(String(a), String(b), 'en') },
    answer,
    hint: STORY_HINT[op](a, b),
    skillKey: `story ${a}${SYM[op]}${b}`,
    solution: {
      nl: `${N(a)} ${SYM[op]} ${N(b)} = ${N(answer)}`,
      en: `${E(a)} ${SYM[op]} ${E(b)} = ${E(answer)}`,
    },
  };
}

// ---------- the topics ----------

const COUNT_ROWS: Bi = {
  nl: 'Elke volle rij is 10. Tel de volle rijen: 10, 20, … en tel dan de rest erbij.',
  en: 'Each full row is 10. Count the full rows: 10, 20, … then count on the rest.',
};

const tellen = topic('tellen', 'Tellen', 'Counting', (level, rng) => {
  const n = [randInt(rng, 1, 5), randInt(rng, 3, 10), randInt(rng, 8, 20), randInt(rng, 15, 25), randInt(rng, 20, 30)][level - 1];
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
        : n > 20
          ? COUNT_ROWS
          : { nl: 'Een rij heeft 5 oranje en 5 witte bolletjes: samen 10.', en: 'A row has 5 orange and 5 white beads: 10 in all.' },
  };
});

const voorEnNa = topic('voor-en-na', 'Ervoor en erna', 'Before and after', (level, rng) => {
  // Levels 4–5 stay in the teens and twenties and add "which number is in between?".
  const [min, max] = ([[1, 5], [1, 10], [1, 20], [10, 20], [10, 30]] as const)[level - 1];
  const r = rng();
  if (level === 5 && r < 0.25) {
    const n = 2 * randInt(rng, 5, 13);
    const text = { nl: `Tel in sprongen van 2. Welk getal komt na ${n}?`, en: `Count in jumps of 2. Which number comes after ${n}?` };
    return {
      text,
      expr: `${n - 4}, ${n - 2}, ${n}, ${BOX}`,
      speak: text,
      answer: n + 2,
      hint: { nl: `Sla steeds één getal over: ${n - 2}, … ${n}, …`, en: `Skip one number each time: ${n - 2}, … ${n}, …` },
    };
  }
  if (level >= 4 && r < 0.6) {
    const n = randInt(rng, min, max - 2);
    const text = { nl: `Welk getal zit tussen ${n} en ${n + 2}?`, en: `Which number is between ${n} and ${n + 2}?` };
    return {
      text,
      expr: `${n}, ${BOX}, ${n + 2}`,
      speak: text,
      answer: n + 1,
      hint: { nl: `Tel hardop vanaf ${n}. Welk getal zeg je daarna?`, en: `Count out loud from ${n}. Which number do you say next?` },
    };
  }
  if (coin(rng)) {
    const n = randInt(rng, min, max - 1);
    const text = { nl: `Welk getal komt na ${n}?`, en: `Which number comes after ${n}?` };
    return { text, expr: `${n}, ${BOX}`, speak: text, answer: n + 1, hint: { nl: `Tel hardop verder vanaf ${n}.`, en: `Count on out loud from ${n}.` } };
  }
  const n = randInt(rng, Math.max(2, min), max);
  const text = { nl: `Welk getal komt voor ${n}?`, en: `Which number comes before ${n}?` };
  return { text, expr: `${BOX}, ${n}`, speak: text, answer: n - 1, hint: { nl: `Tel hardop terug vanaf ${n}.`, en: `Count back out loud from ${n}.` } };
});

/** a + b + c within 10, with all three groups in the picture. */
function threeAddends(rng: Rng): Question {
  const a = randInt(rng, 1, 6);
  const b = randInt(rng, 1, 8 - a);
  const c = randInt(rng, 1, 10 - a - b);
  return {
    ...twoStep(a, '+', b, '+', c, {
      nl: `Tel eerst ${a} en ${b} bij elkaar. Doe er dan ${c} bij.`,
      en: `First add ${a} and ${b}. Then add ${c} more.`,
    }),
    scene: { item: pick(rng, PICTURE_ITEMS), groups: [a, b, c], join: '+' },
  };
}

/** a + □ = c (or □ + b = c) within 10. */
function missingTo10(rng: Rng, unknown: 'first' | 'second'): Question {
  const c = randInt(rng, 5, 10);
  const a = randInt(rng, 1, c - 1);
  return missing(a, '+', c - a, unknown, {
    nl: `Je hebt er ${unknown === 'first' ? c - a : a}. Tel door tot ${c}. Hoeveel stapjes is dat?`,
    en: `You have ${unknown === 'first' ? c - a : a}. Count on to ${c}. How many steps is that?`,
  });
}

const erbij10 = topic('erbij-10', 'Erbij tot 10', 'Adding to 10', (level, rng) => {
  if (level === 4) return oneOf(rng, [() => threeAddends(rng), () => missingTo10(rng, 'second')]);
  if (level === 5) {
    return oneOf(rng, [
      () => {
        const a = randInt(rng, 3, 7);
        return pictureStory(rng, a, '+', randInt(rng, 2, 10 - a));
      },
      () => threeAddends(rng),
      () => missingTo10(rng, 'second'),
      () => missingTo10(rng, 'first'),
    ]);
  }
  if (level === 3) {
    const a = randInt(rng, 2, 8);
    return pictureStory(rng, a, '+', randInt(rng, 2, 10 - a));
  }
  const a = level === 1 ? randInt(rng, 1, 4) : randInt(rng, 1, 9);
  const b = randInt(rng, 1, (level === 1 ? 5 : 10) - a);
  return { ...arith(a, '+', b), scene: { item: pick(rng, PICTURE_ITEMS), groups: [a, b], join: '+' } };
});

/** a − b − c within 10: the picture shows a, with b + c faded. */
function twoTakeAways(rng: Rng): Question {
  const a = randInt(rng, 5, 10);
  const b = randInt(rng, 1, a - 2);
  const c = randInt(rng, 1, a - b);
  return {
    ...twoStep(a, '-', b, '-', c, {
      nl: `Haal er eerst ${b} af. Haal er daarna nog ${c} af.`,
      en: `First take away ${b}. Then take away ${c} more.`,
    }),
    scene: { item: pick(rng, PICTURE_ITEMS), groups: [a], gone: b + c },
  };
}

/** a − □ = c (or □ − b = c) within 10. */
function missingFrom10(rng: Rng, unknown: 'first' | 'second'): Question {
  const a = randInt(rng, 4, 10);
  const b = randInt(rng, 1, a - 1);
  return missing(a, '-', b, unknown);
}

const eraf10 = topic('eraf-10', 'Eraf tot 10', 'Taking away to 10', (level, rng) => {
  if (level === 4) return oneOf(rng, [() => twoTakeAways(rng), () => missingFrom10(rng, 'second')]);
  if (level === 5) {
    return oneOf(rng, [
      () => {
        const a = randInt(rng, 5, 10);
        return pictureStory(rng, a, '-', randInt(rng, 2, a));
      },
      () => twoTakeAways(rng),
      () => missingFrom10(rng, 'second'),
      () => missingFrom10(rng, 'first'),
    ]);
  }
  if (level === 3) {
    const a = randInt(rng, 4, 10);
    return pictureStory(rng, a, '-', randInt(rng, 2, a));
  }
  const a = level === 1 ? randInt(rng, 2, 5) : randInt(rng, 3, 10);
  const b = randInt(rng, 1, a);
  return { ...arith(a, '-', b), scene: { item: pick(rng, PICTURE_ITEMS), groups: [a], gone: b } };
});

const splitsen = topic('splitsen', 'Splitsen', 'Number bonds', (level, rng) => {
  // Levels 4–5: split numbers above 10, and the box can come first.
  const total = [randInt(rng, 3, 5), randInt(rng, 6, 10), 10, randInt(rng, 11, 15), randInt(rng, 12, 20)][level - 1];
  const k = randInt(rng, 1, total - 1);
  const boxFirst = level >= 4 && coin(rng);
  return {
    text: { nl: `Splits ${total}.`, en: `Split ${total}.` },
    expr: boxFirst ? `${total} = ${BOX} + ${k}` : `${total} = ${k} + ${BOX}`,
    speak: boxFirst
      ? { nl: `${total} is hoeveel en ${k}?`, en: `${total} is how many and ${k}?` }
      : { nl: `${total} is ${k} en hoeveel?`, en: `${total} is ${k} and how many more?` },
    answer: total - k,
    hint: { nl: `Tel van ${k} door tot ${total}.`, en: `Count on from ${k} to ${total}.` },
    ...(level >= 4 ? { skillKey: `${total}=${boxFirst ? `?+${k}` : `${k}+?`}` } : {}),
  };
});

/** A + or − pair within 20 that crosses ten. */
function crossTen(rng: Rng, add: boolean): [number, number] {
  if (add) {
    const a = randInt(rng, 2, 9);
    return [a, randInt(rng, 11 - a, 9)];
  }
  const a = randInt(rng, 11, 18);
  return [a, randInt(rng, a - 9, 9)];
}

function missingTo20(rng: Rng): Question {
  const add = coin(rng);
  const [a, b] = crossTen(rng, add);
  return missingAny(rng, a, add ? '+' : '-', b);
}

const tot20 = topic('tot-20', 'Erbij en eraf tot 20', 'Adding and taking away to 20', (level, rng) => {
  if (level === 4) return missingTo20(rng);
  if (level === 5) {
    return oneOf(rng, [
      () => missingTo20(rng),
      () => {
        const add = coin(rng);
        const [a, b] = crossTen(rng, add);
        return pictureStory(rng, a, add ? '+' : '-', b);
      },
      () => {
        // Over ten and back again: 8 + 6 − 5.
        const [a, b] = crossTen(rng, true);
        return twoStep(a, '+', b, '-', until(() => randInt(rng, 2, 9), (c) => c !== b));
      },
      () => {
        const [a, b] = crossTen(rng, false);
        return twoStep(a, '-', b, '+', randInt(rng, 2, 20 - (a - b)));
      },
    ]);
  }
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
  } else {
    [a, b] = crossTen(rng, add);
  }
  if (level === 3) return pictureStory(rng, a, add ? '+' : '-', b);
  return arith(a, add ? '+' : '-', b);
});

/** Two-digit + two-digit with a carry in the ones, total ≤ 100. */
function addCarry100(rng: Rng): [number, number] {
  const at = randInt(rng, 1, 7);
  const ao = randInt(rng, 2, 9);
  return [at * 10 + ao, randInt(rng, 1, 8 - at) * 10 + randInt(rng, 11 - ao, 9)];
}

/** Two-digit − two-digit where the ones need borrowing. */
function subBorrow100(rng: Rng): [number, number] {
  const at = randInt(rng, 3, 9);
  const ao = randInt(rng, 0, 8);
  return [at * 10 + ao, randInt(rng, 1, at - 1) * 10 + randInt(rng, ao + 1, 9)];
}

const plus100 = topic('plus-100', 'Erbij tot 100', 'Adding to 100', (level, rng) => {
  if (level === 1) {
    const a = randInt(rng, 1, 8);
    return arith(a * 10, '+', randInt(rng, 1, 9 - a) * 10);
  }
  if (level === 2) {
    const a = randInt(rng, 11, 89);
    return arith(a, '+', randInt(rng, 2, Math.min(9, 100 - a)));
  }
  if (level === 4) {
    const [a, b] = addCarry100(rng);
    return coin(rng) ? arith(a, '+', b) : missing(a, '+', b, 'second');
  }
  if (level === 5) {
    const [a, b] = addCarry100(rng);
    return oneOf(rng, [
      () => missing(a, '+', b, 'first'),
      () => wordProblem(rng, a, '+', b),
      () => {
        const x = randInt(rng, 11, 45);
        const y = randInt(rng, 11, 40);
        return twoStep(x, '+', y, '+', randInt(rng, 5, 100 - x - y));
      },
    ]);
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
  if (level === 4) {
    const [a, b] = subBorrow100(rng);
    return coin(rng) ? arith(a, '-', b) : missing(a, '-', b, 'second');
  }
  if (level === 5) {
    const [a, b] = subBorrow100(rng);
    return oneOf(rng, [
      () => missing(a, '-', b, 'first'),
      () => wordProblem(rng, a, '-', b),
      () => {
        const x = randInt(rng, 50, 99);
        const y = randInt(rng, 11, 30);
        return twoStep(x, '-', y, '-', randInt(rng, 2, x - y - 1));
      },
    ]);
  }
  const a = randInt(rng, 30, 99);
  return arith(a, '-', randInt(rng, 11, a - 1));
});

function tables(rng: Rng, tableList: number[]): Question {
  return arith(randInt(rng, 1, 10), 'x', pick(rng, tableList));
}

/** □ × t = c or k × □ = c, from the tables in `tableList`. */
function missingFactor(rng: Rng, tableList: number[], minK = 1): Question {
  return missingAny(rng, randInt(rng, minK, 10), 'x', pick(rng, tableList));
}

const tafels4 = topic('tafels-1-2-5-10', 'Tafels van 1, 2, 5 en 10', 'Times tables 1, 2, 5 and 10', (level, rng) => {
  if (level === 4) return missingFactor(rng, [2, 5, 10], 2);
  if (level === 5) {
    return oneOf(rng, [
      () => missingFactor(rng, [2, 5, 10], 2),
      () => {
        const t = pick(rng, [2, 5, 10]);
        return arith(randInt(rng, 2, 10) * t, ':', t);
      },
      () => wordProblem(rng, randInt(rng, 3, 10), 'x', pick(rng, [2, 5, 10])),
    ]);
  }
  return tables(rng, [[1, 10], [2, 5], [1, 2, 5, 10]][level - 1]);
});

/** Three-digit sums that carry over a ten or hundred. */
function addCarry1000(rng: Rng): [number, number] {
  return until(
    (): [number, number] => {
      const a = randInt(rng, 101, 799);
      return [a, randInt(rng, 101, 1000 - a)];
    },
    ([a, b]) => (a % 100) + (b % 100) > 100 || (a % 10) + (b % 10) > 10,
  );
}

function subBorrow1000(rng: Rng): [number, number] {
  return until(
    (): [number, number] => {
      const a = randInt(rng, 300, 999);
      return [a, randInt(rng, 101, a - 1)];
    },
    ([a, b]) => b % 100 > a % 100,
  );
}

const rekenen1000 = topic('rekenen-1000', 'Rekenen tot 1.000', 'Sums to 1,000', (level, rng) => {
  if (level === 1) return roundSum(rng, 100, 1000);
  if (level === 2) {
    if (coin(rng)) {
      const a = randInt(rng, 101, 899);
      return arith(a, '+', randInt(rng, 11, Math.min(99, 1000 - a)));
    }
    return arith(randInt(rng, 150, 999), '-', randInt(rng, 11, 99));
  }
  if (level === 4) {
    return oneOf(rng, [
      () => {
        const [a, b] = addCarry1000(rng);
        return arith(a, '+', b);
      },
      () => {
        const [a, b] = subBorrow1000(rng);
        return arith(a, '-', b);
      },
      () => {
        // Make 1.000: 370 + □ = 1.000.
        const a = randInt(rng, 11, 99) * 10;
        return missing(a, '+', 1000 - a, 'second');
      },
    ]);
  }
  if (level === 5) {
    return oneOf(rng, [
      () => {
        const [a, b] = addCarry1000(rng);
        return missingAny(rng, a, '+', b);
      },
      () => {
        const [a, b] = subBorrow1000(rng);
        return missingAny(rng, a, '-', b);
      },
      () => {
        const [a, b] = addCarry1000(rng);
        return wordProblem(rng, a, '+', b);
      },
      () => {
        const [a, b] = subBorrow1000(rng);
        return wordProblem(rng, a, '-', b);
      },
      () => {
        const [a, b] = addCarry1000(rng);
        return twoStep(a, '+', b, '-', randInt(rng, 101, a + b - 1));
      },
    ]);
  }
  if (coin(rng)) {
    const a = randInt(rng, 101, 700);
    return arith(a, '+', randInt(rng, 101, 1000 - a));
  }
  const a = randInt(rng, 300, 999);
  return arith(a, '-', randInt(rng, 101, a - 1));
});

const alleTafels = topic('alle-tafels', 'Alle tafels', 'All times tables', (level, rng) => {
  if (level === 4) return missingFactor(rng, [3, 4, 6, 7, 8, 9], 2);
  if (level === 5) {
    return oneOf(rng, [
      () => missingFactor(rng, [6, 7, 8, 9], 3),
      () => {
        const a = randInt(rng, 3, 10);
        const b = randInt(rng, 3, 9);
        return coin(rng) ? twoStep(a, 'x', b, '+', randInt(rng, 2, 20)) : twoStep(a, 'x', b, '-', randInt(rng, 2, a * b - 1));
      },
      () => wordProblem(rng, randInt(rng, 3, 10), 'x', randInt(rng, 3, 9)),
    ]);
  }
  return tables(rng, [[3, 4], [6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]][level - 1]);
});

const delen = topic('delen', 'Delen', 'Dividing', (level, rng) => {
  if (level >= 4) {
    const t = randInt(rng, 3, 9);
    const q = randInt(rng, 2, 10);
    if (level === 4) return missingAny(rng, q * t, ':', t);
    return oneOf(rng, [
      () => missingAny(rng, q * t, ':', t),
      () => wordProblem(rng, q * t, ':', t),
      () =>
        // With a zero: 240 : 6.
        arith(q * t * 10, ':', t, {
          nl: `Laat de 0 even weg: ${q * t} : ${t}. Zet de 0 daarna weer achter je antwoord.`,
          en: `Leave off the 0: ${q * t} : ${t}. Then put the 0 back on your answer.`,
        }),
    ]);
  }
  const t = pick(rng, [[2, 5, 10], [3, 4], [2, 3, 4, 5, 6, 7, 8, 9, 10]][level - 1]);
  return arith(randInt(rng, 1, 10) * t, ':', t);
});

/** Four-digit sums that carry. */
function addCarry10000(rng: Rng): [number, number] {
  return until(
    (): [number, number] => {
      const a = randInt(rng, 1001, 7999);
      return [a, randInt(rng, 1001, 10000 - a)];
    },
    ([a, b]) => (a % 1000) + (b % 1000) > 1000 && (a % 10) + (b % 10) >= 10,
  );
}

/** Four-digit subtraction across zeros: 7.003 − 2.468. */
function subZeros10000(rng: Rng): [number, number] {
  const a = randInt(rng, 3, 9) * 1000 + pick(rng, [0, randInt(rng, 1, 9), randInt(rng, 1, 9) * 10, randInt(rng, 1, 9) * 100]);
  return [a, until(() => randInt(rng, 1001, a - 1), (b) => b % 1000 > a % 1000)];
}

const plus10000 = topic('plus-10000', 'Optellen tot 10.000', 'Adding to 10,000', (level, rng) => {
  if (level === 1) {
    const a = randInt(rng, 1, 8);
    return arith(a * 1000, '+', randInt(rng, 1, 9 - a) * 1000);
  }
  if (level === 2) {
    const a = randInt(rng, 1001, 8999);
    return arith(a, '+', randInt(rng, 101, Math.min(999, 10000 - a)));
  }
  if (level === 4) {
    if (coin(rng)) {
      const [a, b] = addCarry10000(rng);
      return arith(a, '+', b);
    }
    // Make a round thousand: 4.350 + □ = 7.000.
    const a = randInt(rng, 101, 899) * 10;
    const c = randInt(rng, Math.ceil((a + 1) / 1000) + 1, 10) * 1000;
    return missing(a, '+', c - a, 'second');
  }
  if (level === 5) {
    const [a, b] = addCarry10000(rng);
    return oneOf(rng, [
      () => missingAny(rng, a, '+', b),
      () => wordProblem(rng, a, '+', b),
      () => {
        const x = randInt(rng, 1001, 4000);
        const y = randInt(rng, 1001, 3000);
        return twoStep(x, '+', y, '+', randInt(rng, 101, 10000 - x - y));
      },
    ]);
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
  if (level === 4) {
    const [a, b] = subZeros10000(rng);
    return coin(rng) ? arith(a, '-', b) : missing(a, '-', b, 'second');
  }
  if (level === 5) {
    const [a, b] = subZeros10000(rng);
    return oneOf(rng, [
      () => missing(a, '-', b, 'first'),
      () => wordProblem(rng, a, '-', b),
      () => {
        const x = randInt(rng, 5000, 9999);
        const y = randInt(rng, 1001, 3000);
        return twoStep(x, '-', y, '-', randInt(rng, 101, x - y - 1));
      },
    ]);
  }
  const a = randInt(rng, 3000, 9999);
  return arith(a, '-', randInt(rng, 1001, a - 1));
});

const keer = topic('vermenigvuldigen', 'Vermenigvuldigen', 'Multiplying', (level, rng) => {
  if (level === 1) return arith(randInt(rng, 2, 9) * 10, 'x', randInt(rng, 2, 9));
  if (level === 2) return arith(randInt(rng, 11, 99), 'x', randInt(rng, 2, 9));
  if (level === 4) {
    return oneOf(rng, [
      () => arith(randInt(rng, 101, 499), 'x', randInt(rng, 3, 9)),
      () => arith(randInt(rng, 21, 49), 'x', randInt(rng, 11, 29)),
      () => missing(randInt(rng, 11, 99), 'x', randInt(rng, 3, 9), 'first'),
    ]);
  }
  if (level === 5) {
    return oneOf(rng, [
      () => arith(randInt(rng, 31, 99), 'x', randInt(rng, 21, 49)),
      () => missingAny(rng, randInt(rng, 12, 99), 'x', randInt(rng, 4, 9)),
      () => wordProblem(rng, randInt(rng, 12, 49), 'x', randInt(rng, 11, 25)),
      () => twoStep(randInt(rng, 11, 25), 'x', randInt(rng, 11, 19), '+', randInt(rng, 11, 99)),
    ]);
  }
  return arith(randInt(rng, 11, 25), 'x', randInt(rng, 11, 19));
});

const groteGetallen = topic('grote-getallen', 'Grote getallen', 'Big numbers', (level, rng) => {
  if (level === 4) {
    if (coin(rng)) return roundSum(rng, 10, 1_000_000);
    // Make a million: 456.000 + □ = 1.000.000.
    const a = randInt(rng, 101, 999) * 1000;
    return missing(a, '+', 1_000_000 - a, 'second');
  }
  if (level === 5) {
    const u = 1000;
    return oneOf(rng, [
      () => {
        const a = randInt(rng, 101, 899) * u;
        return missingAny(rng, a, '+', randInt(rng, 11, 1000 - a / u) * u);
      },
      () => {
        const a = randInt(rng, 200, 1000) * u;
        return missingAny(rng, a, '-', randInt(rng, 11, a / u - 1) * u);
      },
      () => {
        const a = randInt(rng, 101, 600) * u;
        const b = randInt(rng, 101, 1000 - a / u) * u;
        return twoStep(a, '+', b, '-', randInt(rng, 11, (a + b) / u - 1) * u);
      },
      () => {
        const a = randInt(rng, 1001, 8000) * 100;
        return coin(rng)
          ? wordProblem(rng, a, '+', randInt(rng, 101, 10000 - a / 100) * 100)
          : wordProblem(rng, a, '-', randInt(rng, 101, a / 100 - 1) * 100);
      },
    ]);
  }
  return roundSum(rng, [10000, 1000, 100][level - 1], 1_000_000);
});

const staartdeling = topic('staartdeling', 'Staartdeling', 'Long division', (level, rng) => {
  if (level === 1) {
    const b = randInt(rng, 2, 9);
    return arith(randInt(rng, 11, Math.floor(99 / b)) * b, ':', b);
  }
  if (level === 2) {
    const b = randInt(rng, 2, 9);
    return arith(randInt(rng, Math.ceil(100 / b), Math.floor(999 / b)) * b, ':', b);
  }
  if (level === 4) {
    if (coin(rng)) {
      // Four digits by one digit: 5.432 : 8.
      const b = randInt(rng, 3, 9);
      return arith(randInt(rng, Math.ceil(1000 / b), Math.floor(9999 / b)) * b, ':', b);
    }
    const b = randInt(rng, 12, 49);
    return arith(randInt(rng, 11, 99) * b, ':', b);
  }
  if (level === 5) {
    return oneOf(rng, [
      () => {
        const b = randInt(rng, 12, 49);
        return arith(randInt(rng, 21, Math.floor(9999 / b)) * b, ':', b);
      },
      () => {
        const b = randInt(rng, 11, 25);
        return missing(randInt(rng, 11, 60) * b, ':', b, 'first');
      },
      () => {
        const b = randInt(rng, 12, 30);
        return wordProblem(rng, randInt(rng, 11, 40) * b, ':', b);
      },
    ]);
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

/** A base that p% of gives a whole number, up to `max`. */
function percentBase(rng: Rng, p: number, max: number): number {
  const unit = 100 / gcd(p, 100);
  return unit * randInt(rng, 1, Math.floor(max / unit));
}

function percentOf(p: number, base: number): Question {
  return {
    text: WORK_IT_OUT,
    expr: `${p}% van ${N(base)} = ${BOX}`,
    speak: { nl: `Hoeveel is ${p} procent van ${base}?`, en: `What is ${p} percent of ${base}?` },
    answer: (base * p) / 100,
    hint: percentHint(p, base),
  };
}

const SALE_ITEMS: Bi[] = [
  { nl: 'Een fiets', en: 'A bike' },
  { nl: 'Een jas', en: 'A coat' },
  { nl: 'Een skateboard', en: 'A skateboard' },
  { nl: 'Een tent', en: 'A tent' },
];

/** "A bike costs € 400 with 25% off. What do you pay?" */
function discount(rng: Rng): Question {
  const p = pick(rng, [10, 20, 25, 30, 40, 50]);
  const base = percentBase(rng, p, 100) * 10;
  const item = pick(rng, SALE_ITEMS);
  const off = (base * p) / 100;
  const tell = (price: string, lang: Lang) =>
    lang === 'nl'
      ? `${item.nl} kost € ${price}. Je krijgt ${p}% korting. Hoeveel euro betaal je?`
      : `${item.en} costs € ${price}. You get ${p}% off. How many euros do you pay?`;
  return {
    text: { nl: tell(N(base), 'nl'), en: tell(E(base), 'en') },
    expr: BOX,
    unit: '€',
    speak: { nl: tell(String(base), 'nl'), en: tell(String(base), 'en') },
    answer: base - off,
    hint: {
      nl: `Reken eerst ${p}% van € ${N(base)} uit: zoveel korting krijg je. Haal dat van de prijs af.`,
      en: `First work out ${p}% of € ${E(base)}: that's the discount. Take it off the price.`,
    },
    skillKey: `korting ${p}% ${base}`,
    solution: {
      nl: `${p}% van € ${N(base)} = € ${N(off)}, en € ${N(base)} − € ${N(off)} = € ${N(base - off)}`,
      en: `${p}% of € ${E(base)} = € ${E(off)}, and € ${E(base)} − € ${E(off)} = € ${E(base - off)}`,
    },
  };
}

/** "□% van 200 = 50". */
function whichPercent(rng: Rng): Question {
  const p = pick(rng, [10, 20, 25, 50, 75]);
  const base = randInt(rng, 1, 50) * 20;
  const part = (base * p) / 100;
  return {
    text: { nl: 'Hoeveel procent is het?', en: 'What percentage is it?' },
    expr: `${BOX}% van ${N(base)} = ${N(part)}`,
    speak: { nl: `Hoeveel procent van ${base} is ${part}?`, en: `What percent of ${base} is ${part}?` },
    answer: p,
    hint: {
      nl: `10% van ${N(base)} is ${N(base / 10)}. Is ${N(part)} de helft, een kwart, of een aantal keer 10%?`,
      en: `10% of ${E(base)} is ${E(base / 10)}. Is ${E(part)} a half, a quarter, or a few times 10%?`,
    },
    skillKey: `?% ${base}=${part}`,
    solution: { nl: `${p}% van ${N(base)} = ${N(part)}`, en: `${p}% of ${E(base)} = ${E(part)}` },
  };
}

const procenten = topic('procenten', 'Procenten', 'Percentages', (level, rng) => {
  if (level === 4) {
    const p = pick(rng, [35, 45, 60, 70, 80, 90]);
    return percentOf(p, percentBase(rng, p, 2000));
  }
  if (level === 5) {
    return oneOf(rng, [
      () => {
        const p = pick(rng, [15, 35, 55, 65, 85, 95]);
        return percentOf(p, percentBase(rng, p, 5000));
      },
      () => discount(rng),
      () => whichPercent(rng),
    ]);
  }
  const p = pick(rng, [[50, 10], [25, 20, 5], [15, 30, 75, 40]][level - 1]);
  return percentOf(p, percentBase(rng, p, 1000));
});

const PLACES = [
  { unit: 10, nl: 'tientallen', en: 'ten', digitNl: 'eenheden', digitEn: 'ones' },
  { unit: 100, nl: 'honderdtallen', en: 'hundred', digitNl: 'tientallen', digitEn: 'tens' },
  { unit: 1000, nl: 'duizendtallen', en: 'thousand', digitNl: 'honderdtallen', digitEn: 'hundreds' },
  { unit: 10_000, nl: 'tienduizendtallen', en: 'ten thousand', digitNl: 'duizendtallen', digitEn: 'thousands' },
  { unit: 100_000, nl: 'honderdduizendtallen', en: 'hundred thousand', digitNl: 'tienduizendtallen', digitEn: 'ten thousands' },
];

const afronden = topic('afronden', 'Afronden', 'Rounding', (level, rng) => {
  const place = PLACES[level - 1];
  const unit = place.unit;
  let n: number;
  if (level === 5 && coin(rng)) {
    // Tricky: rounding up carries into the next place (976.544 → 1.000.000).
    const top = randInt(rng, 1, 9) * 10 * unit;
    n = top - randInt(rng, 1, unit / 2 - 1);
  } else {
    // Level 5 stays below 9.500.000 so the answer fits on the number pad.
    const max = level === 5 ? 95 * unit - 1 : unit * 100 - 1;
    do {
      n = randInt(rng, unit + 1, max);
    } while (n % unit === 0);
  }
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

const STEPS_ON_THERMOMETER: Bi = {
  nl: 'Denk aan een thermometer. Tel de stapjes van het ene getal naar het andere. Vergeet de 0 niet.',
  en: 'Think of a thermometer. Count the steps from one number to the other. Remember to pass 0.',
};

/** Night and day temperatures: "how many degrees warmer?". */
function tempDifference(rng: Rng): Question {
  const night = -randInt(rng, 1, 10);
  const day = randInt(rng, 1, 15);
  const tell = (lang: Lang) =>
    lang === 'nl'
      ? `'s Nachts is het ${say(night, 'nl')} graden. Overdag is het ${day} graden. Hoeveel graden is het overdag warmer?`
      : `At night it is ${say(night, 'en')} degrees. In the day it is ${day} degrees. How many degrees warmer is the day?`;
  return {
    text: {
      nl: `'s Nachts is het ${N(night)} °C. Overdag is het ${day} °C. Hoeveel graden is het overdag warmer?`,
      en: `At night it is ${E(night)} °C. In the day it is ${day} °C. How many degrees warmer is the day?`,
    },
    expr: `${BOX} °C`,
    speak: { nl: tell('nl'), en: tell('en') },
    answer: day - night,
    hint: {
      nl: `Tel eerst van ${N(night)} omhoog naar 0. Tel dan verder naar ${day}.`,
      en: `First count up from ${E(night)} to 0. Then count on to ${day}.`,
    },
    skillKey: `verschil ${night} ${day}`,
    solution: { nl: `${day} − ${N(night)} = ${day - night}`, en: `${day} − ${E(night)} = ${day - night}` },
  };
}

/** "It is 3 degrees. It gets 8 colder, then 2 warmer." */
function tempTwoSteps(rng: Rng): Question {
  const a = randInt(rng, -5, 5);
  const b = randInt(rng, 3, 12);
  const c = randInt(rng, 1, 9);
  const answer = a - b + c;
  const tell = (lang: Lang) =>
    lang === 'nl'
      ? `Het is ${say(a, 'nl')} graden. Het wordt ${b} graden kouder. Daarna wordt het ${c} graden warmer. Hoeveel graden is het nu?`
      : `It is ${say(a, 'en')} degrees. It gets ${b} degrees colder. Then it gets ${c} degrees warmer. What is the temperature now?`;
  return {
    text: {
      nl: `Het is ${N(a)} °C. Het wordt ${b} graden kouder. Daarna wordt het ${c} graden warmer. Hoeveel graden is het nu?`,
      en: `It is ${E(a)} °C. It gets ${b} degrees colder. Then it gets ${c} degrees warmer. What is the temperature now?`,
    },
    expr: `${BOX} °C`,
    speak: { nl: tell('nl'), en: tell('en') },
    answer,
    hint: {
      nl: `Twee stappen op de thermometer: eerst ${b} omlaag vanaf ${N(a)}, dan ${c} omhoog.`,
      en: `Two steps on the thermometer: first ${b} down from ${E(a)}, then ${c} up.`,
    },
    skillKey: `temp ${a}-${b}+${c}`,
    solution: {
      nl: `${N(a)} − ${b} = ${N(a - b)}, en ${N(a - b)} + ${c} = ${N(answer)}`,
      en: `${E(a)} − ${b} = ${E(a - b)}, and ${E(a - b)} + ${c} = ${E(answer)}`,
    },
  };
}

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
    if (level === 4) {
      return oneOf(rng, [
        // −6 + □ = 3
        () => missing(-randInt(rng, 1, 10), '+', randInt(rng, 2, 15), 'second', STEPS_ON_THERMOMETER),
        // 4 − □ = −5
        () => missing(randInt(rng, 1, 10), '-', randInt(rng, 11, 20), 'second', STEPS_ON_THERMOMETER),
        () => tempDifference(rng),
      ]);
    }
    if (level === 5) {
      return oneOf(rng, [
        () => {
          const a = randInt(rng, -5, 5);
          return twoStep(a, '-', randInt(rng, 6, 12), '+', randInt(rng, 1, 9), THERMOMETER);
        },
        // □ + 7 = −2  or  □ − 4 = −9
        () => {
          const add = coin(rng);
          const a = randInt(rng, -12, -1);
          const b = randInt(rng, 2, 9);
          const c = add ? a + b : a - b;
          return missing(a, add ? '+' : '-', b, 'first', {
            nl: `Reken terug op de thermometer: begin bij ${N(c)} en ga ${b} ${add ? 'omlaag' : 'omhoog'}.`,
            en: `Work back on the thermometer: start at ${E(c)} and go ${b} ${add ? 'down' : 'up'}.`,
          });
        },
        () => tempDifference(rng),
        () => tempTwoSteps(rng),
      ]);
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
  [[plus10000, 4], [min10000, 4], [keer, 3], [staartdeling, 3], [procenten, 3], [delen, 5]],
  [[plus10000, 5], [min10000, 5], [keer, 5], [staartdeling, 4], [groteGetallen, 4], [procenten, 4]],
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
