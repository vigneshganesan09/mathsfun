// Short picture lessons, one idea per slide. Slides never show an answer up
// front: the child answers first (□ in the sum), then the answer and the
// explanation are revealed. Each lesson ends with a "Nu jij!" quiz.
import type { Bi, CharacterId, Item, Scene, Topic } from './core';
import { LESSON_QUIZ } from './stories';

export interface Slide {
  text: Bi;
  /** A sum shown big under the picture; □ is where the child answers. */
  expr?: string;
  scene?: Scene;
  cast?: CharacterId[];
  /** The answer for □. The slide waits for it before revealing. */
  ask?: number;
  /** Shown once the child has answered. */
  reveal?: Bi;
  /** A button to the times-table trainer. */
  trainer?: boolean;
}

export interface Lesson {
  id: string;
  name: Bi;
  icon: Item;
  slides: Slide[];
  quiz: Topic;
}

const erbij: Lesson = {
  id: 'les-erbij',
  name: { nl: 'Erbij (optellen)', en: 'Adding' },
  icon: 'apple',
  quiz: LESSON_QUIZ.plus,
  slides: [
    {
      cast: ['noor'],
      text: {
        nl: 'Hoi! Ik ben Noor. Vandaag leer je erbij-sommen. Bij erbij worden het er méér.',
        en: "Hi! I'm Noor. Today you'll learn adding. When you add, you get more.",
      },
    },
    {
      scene: { item: 'apple', groups: [3, 2], join: '+' },
      expr: '3 + 2 = □',
      ask: 5,
      text: {
        nl: 'Noor heeft 3 appels en krijgt er 2 bij. Tel ze allemaal. Hoeveel zijn het?',
        en: 'Noor has 3 apples and gets 2 more. Count them all. How many are there?',
      },
      reveal: { nl: 'Goed geteld: 1, 2, 3, 4, 5. Dus 3 + 2 = 5.', en: 'Well counted: 1, 2, 3, 4, 5. So 3 + 2 = 5.' },
    },
    {
      scene: { item: 'marble', groups: [6, 3], join: '+' },
      expr: '6 + 3 = □',
      ask: 9,
      text: {
        nl: 'Slim tellen: begin bij het grootste getal, 6, en tel er 3 bij.',
        en: 'Smart counting: start at the biggest number, 6, and count on 3.',
      },
      reveal: { nl: '7, 8, 9! Dus 6 + 3 = 9.', en: '7, 8, 9! So 6 + 3 = 9.' },
    },
    {
      scene: { item: 'stroopwafel', groups: [8, 5], join: '+' },
      expr: '8 + 5 = □',
      ask: 13,
      text: {
        nl: 'Over de 10 heen? Maak eerst een tiental: 8 + 2 = 10. Daarna moet er nog 3 bij.',
        en: 'Going past 10? Make a ten first: 8 + 2 = 10. After that you still add 3.',
      },
      reveal: { nl: '10 + 3 = 13. Dus 8 + 5 = 13.', en: '10 + 3 = 13. So 8 + 5 = 13.' },
    },
    {
      scene: { item: 'apple', groups: [2, 3], join: '+' },
      expr: '2 + 3 = □',
      ask: 5,
      text: {
        nl: 'Je deed net 3 + 2. Nu draaien we de getallen om. Wat is 2 + 3?',
        en: 'You just did 3 + 2. Now we swap the numbers. What is 2 + 3?',
      },
      reveal: {
        nl: 'Ook 5! Bij erbij-sommen mag je de getallen omdraaien.',
        en: 'Also 5! With adding you can swap the numbers.',
      },
    },
  ],
};

const eraf: Lesson = {
  id: 'les-eraf',
  name: { nl: 'Eraf (aftrekken)', en: 'Taking away' },
  icon: 'roll',
  quiz: LESSON_QUIZ.min,
  slides: [
    {
      cast: ['pip'],
      text: {
        nl: 'Woef! Ik ben Pip. Bij eraf-sommen worden het er minder. En ik snoep graag broodjes weg…',
        en: "Woof! I'm Pip. When you take away, you get fewer. And I love snacking on rolls…",
      },
    },
    {
      scene: { item: 'roll', groups: [7], gone: 2, container: 'plate' },
      expr: '7 − 2 = □',
      ask: 5,
      text: {
        nl: 'Er liggen 7 broodjes. Pip pakt er 2. Hoeveel zijn er nog over?',
        en: 'There are 7 rolls. Pip takes 2. How many are left?',
      },
      reveal: { nl: 'Er zijn er nog 5. Dus 7 − 2 = 5.', en: 'There are 5 left. So 7 − 2 = 5.' },
    },
    {
      scene: { item: 'cupcake', groups: [9], gone: 3 },
      expr: '9 − 3 = □',
      ask: 6,
      text: {
        nl: 'Slim tellen: begin bij 9 en tel 3 terug.',
        en: 'Smart counting: start at 9 and count back 3.',
      },
      reveal: { nl: '8, 7, 6! Dus 9 − 3 = 6.', en: '8, 7, 6! So 9 − 3 = 6.' },
    },
    {
      scene: { item: 'person', groups: [13], gone: 5, container: 'car' },
      expr: '13 − 5 = □',
      ask: 8,
      text: {
        nl: 'Onder de 10 komen? Ga eerst terug naar 10: 13 − 3 = 10. Daarna moet er nog 2 af.',
        en: 'Going below 10? Go back to 10 first: 13 − 3 = 10. After that you still take away 2.',
      },
      reveal: { nl: '10 − 2 = 8. Dus 13 − 5 = 8.', en: '10 − 2 = 8. So 13 − 5 = 8.' },
    },
    {
      cast: ['pip', 'noor'],
      expr: '□ + 5 = 13',
      ask: 8,
      text: {
        nl: 'Controleer met een erbij-som: welk getal plus 5 is 13?',
        en: 'Check with an adding sum: which number plus 5 makes 13?',
      },
      reveal: { nl: '8 + 5 = 13, dus 13 − 5 = 8 klopt!', en: "8 + 5 = 13, so 13 − 5 = 8 is right!" },
    },
  ],
};

const keer: Lesson = {
  id: 'les-keer',
  name: { nl: 'Keer (vermenigvuldigen)', en: 'Multiplying' },
  icon: 'egg',
  quiz: LESSON_QUIZ.keer,
  slides: [
    {
      cast: ['jan'],
      text: {
        nl: 'Hallo, ik ben boer Jan! Bij keer-sommen tel je groepjes die even groot zijn.',
        en: "Hello, I'm Farmer Jan! With times sums you count groups that are the same size.",
      },
    },
    {
      scene: { item: 'egg', groups: [4, 4, 4], container: 'box' },
      expr: '3 × 4',
      text: {
        nl: 'Hier zijn 3 dozen met elk 4 eieren. Dat zeg je als 3 keer 4, en je schrijft 3 × 4.',
        en: 'Here are 3 boxes with 4 eggs each. You say that as 3 times 4, and you write 3 × 4.',
      },
    },
    {
      scene: { item: 'egg', groups: [4, 4, 4], container: 'box' },
      expr: '4 + 4 + 4 = □',
      ask: 12,
      text: { nl: 'Tel de groepjes bij elkaar op.', en: 'Add the groups together.' },
      reveal: { nl: '4 + 4 + 4 = 12. Dus 3 × 4 = 12.', en: '4 + 4 + 4 = 12. So 3 × 4 = 12.' },
    },
    {
      scene: { item: 'egg', groups: [4, 4, 4], container: 'box' },
      expr: '4, 8, □',
      ask: 12,
      text: {
        nl: 'Nog sneller: tel in sprongen van 4. Welk getal komt na 4, 8?',
        en: 'Even faster: count in jumps of 4. Which number comes after 4, 8?',
      },
      reveal: { nl: '4, 8, 12! Zo tel je in sprongen.', en: "4, 8, 12! That's counting in jumps." },
    },
    {
      scene: { item: 'apple', groups: [3, 3, 3, 3], container: 'tree' },
      expr: '4 × 3 = □',
      ask: 12,
      text: {
        nl: 'Er staan 4 bomen met elk 3 appels. Is dat meer, minder of evenveel als 3 × 4?',
        en: 'There are 4 trees with 3 apples each. Is that more, fewer or the same as 3 × 4?',
      },
      reveal: {
        nl: 'Evenveel: 12! Omdraaien mag, dus 4 × 3 = 3 × 4.',
        en: 'The same: 12! You can swap, so 4 × 3 = 3 × 4.',
      },
    },
  ],
};

const tafels: Lesson = {
  id: 'les-tafels',
  name: { nl: 'De tafels', en: 'Times tables' },
  icon: 'cookie',
  quiz: LESSON_QUIZ.tafels,
  slides: [
    {
      cast: ['noor', 'sam'],
      text: {
        nl: 'Een tafel is een rijtje keersommen met hetzelfde getal. De tafel van 2 gaat zo: 1 × 2, 2 × 2, 3 × 2 …',
        en: 'A times table is a list of times sums with the same number. The 2 times table goes: 1 × 2, 2 × 2, 3 × 2 …',
      },
    },
    {
      scene: { item: 'bike', groups: [4] },
      expr: '4 × 2 = □',
      ask: 8,
      text: {
        nl: 'Elke fiets heeft 2 wielen. Hoeveel wielen hebben 4 fietsen?',
        en: 'Every bike has 2 wheels. How many wheels do 4 bikes have?',
      },
      reveal: { nl: '4 × 2 = 8 wielen. Dat is de tafel van 2.', en: '4 × 2 = 8 wheels. That is the 2 times table.' },
    },
    {
      scene: { item: 'cookie', groups: [5, 5, 5], container: 'plate' },
      expr: '3 × 5 = □',
      ask: 15,
      text: {
        nl: 'Op elk bord liggen 5 koekjes. Tip: bij de tafel van 5 eindigt het antwoord altijd op 0 of 5.',
        en: 'There are 5 cookies on each plate. Tip: in the 5 times table the answer always ends in 0 or 5.',
      },
      reveal: { nl: '3 × 5 = 15. Zie je? Het eindigt op 5.', en: '3 × 5 = 15. See? It ends in 5.' },
    },
    {
      scene: { item: 'marble', groups: [10, 10, 10] },
      expr: '3 × 10 = □',
      ask: 30,
      text: {
        nl: 'De tafel van 10 is makkelijk: zet een 0 achter het getal.',
        en: 'The 10 times table is easy: put a 0 after the number.',
      },
      reveal: { nl: '3 × 10 = 30.', en: '3 × 10 = 30.' },
    },
    {
      cast: ['sam'],
      expr: '4 × 6 = □',
      ask: 24,
      text: {
        nl: 'Trucje van Sam: 2 × 6 = 12. Voor 4 × 6 verdubbel je dat.',
        en: "Sam's trick: 2 × 6 = 12. For 4 × 6 you double it.",
      },
      reveal: { nl: '12 + 12 = 24. Dus 4 × 6 = 24.', en: '12 + 12 = 24. So 4 × 6 = 24.' },
    },
    {
      cast: ['jan'],
      trainer: true,
      text: {
        nl: 'Klaar om de tafels echt te leren? In de tafeltrainer leer je elke tafel, en doe je een schrijftoets en een spreektoets.',
        en: 'Ready to really learn the tables? In the times-table trainer you learn each table, then take a written test and a spoken test.',
      },
    },
  ],
};

export const LESSONS: Lesson[] = [erbij, eraf, keer, tafels];
