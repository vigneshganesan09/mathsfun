// Story mode: four little adventures with Noor, Sam, Pip the dog and Farmer Jan.
// Every question comes with a picture the child can count from.
import { BOX, coin, pick, randInt, type Bi, type Groep, type LevelNo, type Question, type Rng, type Scene, type Topic } from './core';

interface Told {
  text: Bi;
  scene: Scene;
}

type AddSub = (a: number, b: number) => Told;
/** g groups of n. `fixedN` is for things that always come in the same number (2 legs, 2 wheels). */
type Times = { fixedN?: number; tell: (g: number, n: number) => Told };

// ---------- story lines ----------

const BAKERY_ADD: AddSub[] = [
  (a, b) => ({
    text: {
      nl: `Noor legt ${a} broodjes in de mand. Opa bakt er nog ${b} bij. Hoeveel broodjes liggen er nu in de mand?`,
      en: `Noor puts ${a} rolls in the basket. Grandpa bakes ${b} more. How many rolls are in the basket now?`,
    },
    scene: { item: 'roll', groups: [a, b], join: '+', container: 'basket' },
  }),
  (a, b) => ({
    text: {
      nl: `Op de toonbank liggen ${a} stroopwafels. Sam brengt er nog ${b}, vers van de pan. Hoeveel stroopwafels zijn het samen?`,
      en: `There are ${a} stroopwafels on the counter. Sam brings ${b} more, fresh from the pan. How many stroopwafels is that altogether?`,
    },
    scene: { item: 'stroopwafel', groups: [a, b], join: '+', container: 'plate' },
  }),
  (a, b) => ({
    text: {
      nl: `Noor versiert ${a} cupcakes met witte room en ${b} met gele. Hoeveel cupcakes zijn er versierd?`,
      en: `Noor decorates ${a} cupcakes with white cream and ${b} with yellow. How many cupcakes are decorated?`,
    },
    scene: { item: 'cupcake', groups: [a, b], join: '+' },
  }),
];

const BAKERY_SUB: AddSub[] = [
  (a, b) => ({
    text: {
      nl: `In de vitrine staan ${a} cupcakes. Een klant koopt er ${b}. Hoeveel cupcakes staan er nog?`,
      en: `There are ${a} cupcakes in the shop window. A customer buys ${b}. How many cupcakes are left?`,
    },
    scene: { item: 'cupcake', groups: [a], gone: b },
  }),
  (a, b) => ({
    text: {
      nl: `Noor heeft ${a} broodjes op een bord. Oei! Pip de hond pikt er ${b}. Hoeveel broodjes heeft Noor nog?`,
      en: `Noor has ${a} rolls on a plate. Oops! Pip the dog grabs ${b}. How many rolls does Noor have left?`,
    },
    scene: { item: 'roll', groups: [a], gone: b, container: 'plate' },
  }),
  (a, b) => ({
    text: {
      nl: `Opa bakt ${a} stroopwafels. Sam en Noor eten er samen ${b} op. Hoeveel stroopwafels zijn er nog?`,
      en: `Grandpa bakes ${a} stroopwafels. Sam and Noor eat ${b} of them. How many stroopwafels are left?`,
    },
    scene: { item: 'stroopwafel', groups: [a], gone: b },
  }),
];

const TRAIN_ADD: AddSub[] = [
  (a, b) => ({
    text: {
      nl: `In de trein naar Almere zitten ${a} mensen. In Utrecht stappen er ${b} in. Hoeveel mensen zitten er nu in de trein?`,
      en: `There are ${a} people on the train to Almere. In Utrecht, ${b} get on. How many people are on the train now?`,
    },
    scene: { item: 'person', groups: [a, b], join: '+', container: 'car' },
  }),
  (a, b) => ({
    text: {
      nl: `Sam telt ${a} mensen in wagon 1 en ${b} mensen in wagon 2. Hoeveel mensen zijn het samen?`,
      en: `Sam counts ${a} people in carriage 1 and ${b} people in carriage 2. How many people is that altogether?`,
    },
    scene: { item: 'person', groups: [a, b], join: '+', container: 'car' },
  }),
  (a, b) => ({
    text: {
      nl: `Op het perron wachten ${a} reizigers. Er rennen er nog ${b} de trap op. Hoeveel reizigers staan er nu op het perron?`,
      en: `${a} travellers wait on the platform. ${b} more run up the stairs. How many travellers are on the platform now?`,
    },
    scene: { item: 'person', groups: [a, b], join: '+' },
  }),
];

const TRAIN_SUB: AddSub[] = [
  (a, b) => ({
    text: {
      nl: `In de trein zitten ${a} mensen. In Amersfoort stappen er ${b} uit. Hoeveel mensen blijven er zitten?`,
      en: `There are ${a} people on the train. In Amersfoort, ${b} get off. How many people stay on?`,
    },
    scene: { item: 'person', groups: [a], gone: b, container: 'car' },
  }),
  (a, b) => ({
    text: {
      nl: `Er zitten ${a} mensen in de trein. Bij Almere Centrum stappen er ${b} uit. Hoeveel mensen reizen er verder?`,
      en: `There are ${a} people on the train. At Almere Centrum, ${b} get off. How many people travel on?`,
    },
    scene: { item: 'person', groups: [a], gone: b, container: 'car' },
  }),
];

const FARM: Times[] = [
  {
    tell: (g, n) => ({
      text: {
        nl: `Boer Jan raapt eieren. In elke doos passen ${n} eieren. Hij vult ${g} dozen. Hoeveel eieren zijn het?`,
        en: `Farmer Jan collects eggs. Each box holds ${n} eggs. He fills ${g} boxes. How many eggs is that?`,
      },
      scene: { item: 'egg', groups: Array(g).fill(n), container: 'box' },
    }),
  },
  {
    tell: (g, n) => ({
      text: {
        nl: `In de boomgaard staan ${g} bomen. Aan elke boom hangen ${n} appels. Hoeveel appels zijn het samen?`,
        en: `There are ${g} trees in the orchard. Each tree has ${n} apples. How many apples is that altogether?`,
      },
      scene: { item: 'apple', groups: Array(g).fill(n), container: 'tree' },
    }),
  },
  {
    fixedN: 2,
    tell: (g) => ({
      text: {
        nl: `In de sloot zwemmen ${g} eenden. Elke eend heeft 2 poten. Hoeveel poten zijn dat samen?`,
        en: `${g} ducks are swimming in the ditch. Each duck has 2 legs. How many legs is that altogether?`,
      },
      scene: { item: 'duck', groups: [g] },
    }),
  },
];

const PARTY: Times[] = [
  {
    tell: (g, n) => ({
      text: {
        nl: `Het is feest! Op elk bord liggen ${n} koekjes. Noor zet ${g} borden op tafel. Hoeveel koekjes zijn er?`,
        en: `It's a party! There are ${n} cookies on each plate. Noor puts ${g} plates on the table. How many cookies are there?`,
      },
      scene: { item: 'cookie', groups: Array(g).fill(n), container: 'plate' },
    }),
  },
  {
    tell: (g, n) => ({
      text: {
        nl: `Er komen ${g} kinderen op het feest. Elk kind krijgt ${n} ballonnen. Hoeveel ballonnen moet Sam opblazen?`,
        en: `${g} children come to the party. Each child gets ${n} balloons. How many balloons does Sam have to blow up?`,
      },
      scene: { item: 'balloon', groups: Array(g).fill(n) },
    }),
  },
  {
    tell: (g, n) => ({
      text: {
        nl: `Sam zet de cupcakes in ${g} rijen van ${n}. Hoeveel cupcakes zijn het?`,
        en: `Sam puts the cupcakes in ${g} rows of ${n}. How many cupcakes is that?`,
      },
      scene: { item: 'cupcake', groups: Array(g).fill(n) },
    }),
  },
  {
    fixedN: 2,
    tell: (g) => ({
      text: {
        nl: `Bij het feest staan ${g} fietsen. Elke fiets heeft 2 wielen. Hoeveel wielen zijn dat?`,
        en: `There are ${g} bikes at the party. Each bike has 2 wheels. How many wheels is that?`,
      },
      scene: { item: 'bike', groups: [g] },
    }),
  },
];

/** Two steps: three groups added together, or two lots taken away. */
type TwoStep = (a: number, b: number, c: number) => Told;

const BAKERY_ADD3: TwoStep[] = [
  (a, b, c) => ({
    text: {
      nl: `Opa bakt ${a} broodjes. Daarna bakt hij er nog ${b}, en Noor bakt er ${c}. Hoeveel broodjes zijn er samen?`,
      en: `Grandpa bakes ${a} rolls. Then he bakes ${b} more, and Noor bakes ${c}. How many rolls are there altogether?`,
    },
    scene: { item: 'roll', groups: [a, b, c], join: '+', container: 'basket' },
  }),
  (a, b, c) => ({
    text: {
      nl: `Noor versiert ${a} cupcakes met roze room, ${b} met witte en ${c} met gele. Hoeveel cupcakes zijn er versierd?`,
      en: `Noor decorates ${a} cupcakes with pink cream, ${b} with white and ${c} with yellow. How many cupcakes are decorated?`,
    },
    scene: { item: 'cupcake', groups: [a, b, c], join: '+' },
  }),
];

const BAKERY_SUB2: TwoStep[] = [
  (a, b, c) => ({
    text: {
      nl: `In de vitrine staan ${a} cupcakes. 's Ochtends worden er ${b} verkocht en 's middags nog ${c}. Hoeveel cupcakes staan er nog?`,
      en: `There are ${a} cupcakes in the shop window. ${b} are sold in the morning and ${c} more in the afternoon. How many cupcakes are left?`,
    },
    scene: { item: 'cupcake', groups: [a], gone: b + c },
  }),
  (a, b, c) => ({
    text: {
      nl: `Opa bakt ${a} stroopwafels. Sam eet er ${b} op en Pip de hond pikt er ${c}. Hoeveel stroopwafels zijn er nog?`,
      en: `Grandpa bakes ${a} stroopwafels. Sam eats ${b} and Pip the dog grabs ${c}. How many stroopwafels are left?`,
    },
    scene: { item: 'stroopwafel', groups: [a], gone: b + c },
  }),
];

const TRAIN_ADD3: TwoStep[] = [
  (a, b, c) => ({
    text: {
      nl: `In de trein zitten ${a} mensen. In Utrecht stappen er ${b} in en in Amersfoort nog ${c}. Hoeveel mensen zitten er nu in de trein?`,
      en: `There are ${a} people on the train. In Utrecht ${b} get on and in Amersfoort ${c} more. How many people are on the train now?`,
    },
    scene: { item: 'person', groups: [a, b, c], join: '+', container: 'car' },
  }),
  (a, b, c) => ({
    text: {
      nl: `Sam telt ${a} mensen in wagon 1, ${b} in wagon 2 en ${c} in wagon 3. Hoeveel mensen zijn het samen?`,
      en: `Sam counts ${a} people in carriage 1, ${b} in carriage 2 and ${c} in carriage 3. How many people is that altogether?`,
    },
    scene: { item: 'person', groups: [a, b, c], join: '+', container: 'car' },
  }),
];

const TRAIN_SUB2: TwoStep[] = [
  (a, b, c) => ({
    text: {
      nl: `In de trein zitten ${a} mensen. In Utrecht stappen er ${b} uit en in Amersfoort nog ${c}. Hoeveel mensen reizen er mee naar Almere?`,
      en: `There are ${a} people on the train. In Utrecht ${b} get off and in Amersfoort ${c} more. How many people travel on to Almere?`,
    },
    scene: { item: 'person', groups: [a], gone: b + c, container: 'car' },
  }),
];

// ---------- turning a story line into a question ----------

function addSubQuestion(told: Told, a: number, op: '+' | '-', b: number): Question {
  const plus = op === '+';
  return {
    text: told.text,
    expr: BOX,
    speak: told.text,
    answer: plus ? a + b : a - b,
    scene: told.scene,
    hint: plus
      ? {
          nl: `Begin bij ${a} en tel er ${b} bij. Dat is ${a} + ${b}.`,
          en: `Start at ${a} and count on ${b}. That's ${a} + ${b}.`,
        }
      : {
          nl: `Tel de plaatjes die nog over zijn. Of reken: ${a} − ${b}.`,
          en: `Count the pictures that are left. Or work out ${a} − ${b}.`,
        },
  };
}

function jumps(n: number, g: number): string {
  return Array.from({ length: Math.min(g, 3) }, (_, i) => (i + 1) * n).join(', ');
}

/** `fixedG` (levels 4–5): how many there are for the always-2 lines (ducks, bikes), so those aren't too easy. */
function timesQuestion(rng: Rng, lines: Times[], g0: number, n: number, fixedG?: (rng: Rng) => number): Question {
  const line = pick(rng, lines);
  const size = line.fixedN ?? n;
  const g = line.fixedN && fixedG ? fixedG(rng) : g0;
  const told = line.tell(g, size);
  return {
    text: told.text,
    expr: BOX,
    speak: told.text,
    answer: g * size,
    scene: told.scene,
    hint: {
      nl: `Tel in sprongen van ${size}: ${jumps(size, g)} … Dat is ${g} × ${size}.`,
      en: `Count in jumps of ${size}: ${jumps(size, g)} … That's ${g} × ${size}.`,
    },
  };
}

/** A picture story for a + or − sum (used by the groep 3 worlds too). Needs a ≥ 2 and b ≥ 2. */
export function pictureStory(rng: Rng, a: number, op: '+' | '-', b: number): Question {
  const lines = op === '+' ? [...BAKERY_ADD, ...TRAIN_ADD] : [...BAKERY_SUB, ...TRAIN_SUB];
  return addSubQuestion(pick(rng, lines)(a, b), a, op, b);
}

/** + and − within `max`, both numbers at least 2. */
function addSubWithin(rng: Rng, max: number, addLines: AddSub[], subLines: AddSub[], kind: 'mix' | '+' | '-' = 'mix'): Question {
  const add = kind === 'mix' ? coin(rng) : kind === '+';
  if (add) {
    const a = randInt(rng, 2, max - 2);
    const b = randInt(rng, 2, max - a);
    return addSubQuestion(pick(rng, addLines)(a, b), a, '+', b);
  }
  const a = randInt(rng, 4, max);
  const b = randInt(rng, 2, a - 1);
  return addSubQuestion(pick(rng, subLines)(a, b), a, '-', b);
}

/** Two-step stories within `max`, every number at least 2. */
function twoStepWithin(rng: Rng, max: number, add3: TwoStep[], sub2: TwoStep[]): Question {
  const add = coin(rng);
  let a: number, b: number, c: number;
  if (add) {
    a = randInt(rng, 2, max - 4);
    b = randInt(rng, 2, max - a - 2);
    c = randInt(rng, 2, max - a - b);
  } else {
    a = randInt(rng, 7, max);
    b = randInt(rng, 2, a - 3);
    c = randInt(rng, 2, a - 1 - b);
  }
  const told = pick(rng, add ? add3 : sub2)(a, b, c);
  return {
    text: told.text,
    expr: BOX,
    speak: told.text,
    answer: add ? a + b + c : a - b - c,
    scene: told.scene,
    hint: add
      ? { nl: `Reken in twee stappen: eerst ${a} + ${b}, en daar dan ${c} bij.`, en: `Work it out in two steps: first ${a} + ${b}, then add ${c}.` }
      : {
          nl: `Reken in twee stappen: eerst ${a} − ${b}, en daar dan nog ${c} af. Of tel de plaatjes die over zijn.`,
          en: `Work it out in two steps: first ${a} − ${b}, then take away ${c} more. Or count the pictures that are left.`,
        },
  };
}

/** Times stories from a list of [groups, size] pairs (all at most 40 things, so the picture stays countable). */
function timesFrom(rng: Rng, lines: Times[], pairs: [number, number][], fixedMax: number): Question {
  const [g, n] = pick(rng, pairs);
  return timesQuestion(rng, lines, g, n, (r) => randInt(r, fixedMax - 6, fixedMax));
}

// ---------- the story worlds ----------

const bakkerij: Topic = {
  id: 'verhaal-bakkerij',
  name: { nl: 'Bij de bakker', en: 'At the bakery' },
  icon: 'cupcake',
  cast: ['noor', 'pip'],
  intro: {
    nl: 'Noor helpt vandaag in de bakkerij van opa. Er wordt gebakken, verkocht en gesnoept! Pip de hond kijkt ook mee. Help jij Noor met tellen?',
    en: "Noor is helping in Grandpa's bakery today. There's baking, selling and snacking! Pip the dog is watching too. Will you help Noor count?",
  },
  make: (level, rng) => {
    if (level <= 3) return addSubWithin(rng, [10, 15, 20][level - 1], BAKERY_ADD, BAKERY_SUB);
    if (level === 4) return rng() < 0.65 ? addSubWithin(rng, 30, BAKERY_ADD, BAKERY_SUB) : twoStepWithin(rng, 20, BAKERY_ADD3, BAKERY_SUB2);
    return rng() < 0.65 ? twoStepWithin(rng, 40, BAKERY_ADD3, BAKERY_SUB2) : addSubWithin(rng, 40, BAKERY_ADD, BAKERY_SUB);
  },
};

const trein: Topic = {
  id: 'verhaal-trein',
  name: { nl: 'De trein naar Almere', en: 'The train to Almere' },
  icon: 'person',
  cast: ['sam'],
  intro: {
    nl: 'Sam reist met de trein naar Almere. Bij elk station stappen er mensen in of uit. Tel jij mee hoeveel mensen er in de trein zitten?',
    en: 'Sam is taking the train to Almere. At every station people get on or off. Will you help count how many people are on the train?',
  },
  make: (level, rng) => {
    if (level <= 3) return addSubWithin(rng, [10, 20, 30][level - 1], TRAIN_ADD, TRAIN_SUB);
    if (level === 4) return rng() < 0.6 ? addSubWithin(rng, 40, TRAIN_ADD, TRAIN_SUB) : twoStepWithin(rng, 30, TRAIN_ADD3, TRAIN_SUB2);
    return rng() < 0.7 ? twoStepWithin(rng, 40, TRAIN_ADD3, TRAIN_SUB2) : addSubWithin(rng, 40, TRAIN_ADD, TRAIN_SUB);
  },
};

const boerderij: Topic = {
  id: 'verhaal-boerderij',
  name: { nl: 'Op de boerderij', en: 'On the farm' },
  icon: 'duck',
  cast: ['jan', 'pip'],
  intro: {
    nl: 'Op de boerderij van boer Jan is het druk: eieren rapen, appels plukken en eenden voeren. Alles gaat in groepjes. Reken je mee met keer-sommen?',
    en: "It's busy on Farmer Jan's farm: collecting eggs, picking apples and feeding ducks. Everything comes in groups. Will you help with times sums?",
  },
  make: (level, rng) => {
    if (level === 1) return timesQuestion(rng, FARM, randInt(rng, 2, 4), pick(rng, [2, 3, 5]));
    if (level === 2) return timesQuestion(rng, FARM, randInt(rng, 2, 5), randInt(rng, 3, 6));
    if (level === 3) return timesQuestion(rng, FARM, randInt(rng, 3, 6), randInt(rng, 4, 6));
    if (level === 4) return timesFrom(rng, FARM, [[4, 7], [5, 7], [3, 7], [3, 8], [4, 8], [7, 4], [7, 5], [8, 4]], 14);
    return timesFrom(rng, FARM, [[4, 9], [3, 9], [5, 8], [4, 8], [8, 5], [9, 4], [7, 5], [5, 7], [8, 4]], 20);
  },
};

const feest: Topic = {
  id: 'verhaal-feest',
  name: { nl: 'Het tafelfeest', en: 'The times-table party' },
  icon: 'balloon',
  cast: ['noor', 'sam'],
  intro: {
    nl: 'Noor en Sam geven een feest! Er zijn borden met koekjes, ballonnen en fietsen. Met de tafels tel je alles supersnel. Doe je mee?',
    en: 'Noor and Sam are having a party! There are plates of cookies, balloons and bikes. With your times tables you can count everything super fast. Will you join in?',
  },
  make: (level, rng) => {
    if (level === 1) {
      const n = pick(rng, [2, 5, 10]);
      return timesQuestion(rng, PARTY, randInt(rng, 2, n === 10 ? 3 : 5), n);
    }
    if (level === 2) return timesQuestion(rng, PARTY, randInt(rng, 2, 6), pick(rng, [3, 4]));
    if (level === 3) return timesQuestion(rng, PARTY, randInt(rng, 2, 4), pick(rng, [6, 7, 8]));
    if (level === 4) return timesFrom(rng, PARTY, [[5, 6], [5, 7], [3, 9], [4, 9], [6, 6], [4, 7], [4, 8]], 14);
    return timesFrom(rng, PARTY, [[5, 7], [5, 8], [4, 9], [3, 9], [7, 5], [8, 5], [9, 4], [6, 6]], 20);
  },
};

export const STORY_GROEP: Groep = {
  id: 'verhalen',
  name: { nl: 'Verhaaltjes', en: 'Story mode' },
  age: '',
  topics: [bakkerij, trein, boerderij, feest],
};

// ---------- short quizzes at the end of each lesson ----------

const quiz = (id: string, make: (rng: Rng) => Question): Topic => ({
  id,
  name: { nl: 'Nu jij!', en: 'Your turn!' },
  make: (_level: LevelNo, rng: Rng) => make(rng),
});

export const LESSON_QUIZ = {
  plus: quiz('quiz-plus', (rng) => addSubWithin(rng, 10, [...BAKERY_ADD, ...TRAIN_ADD], [], '+')),
  min: quiz('quiz-min', (rng) => addSubWithin(rng, 10, [], [...BAKERY_SUB, ...TRAIN_SUB], '-')),
  keer: quiz('quiz-keer', (rng) => timesQuestion(rng, FARM, randInt(rng, 2, 4), randInt(rng, 2, 5))),
  tafels: quiz('quiz-tafels', (rng) => {
    const n = pick(rng, [2, 5, 10]);
    return timesQuestion(rng, PARTY, randInt(rng, 2, n === 10 ? 3 : 5), n);
  }),
};
