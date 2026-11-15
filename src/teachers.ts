// The teacher characters a child can choose. Each one has its own look,
// voice (a female or male device voice where available), pitch, speed and
// way of praising. Pure TypeScript: voice choice works on plain voice data.
import type { Bi, CharacterId, Lang } from './core';

export type TeacherId = 'juf-noor' | 'meester-sam' | 'pip' | 'boer-jan' | 'juf-uil' | 'robbie';
export type VoiceKind = 'female' | 'male' | 'any';

export interface Teacher {
  id: TeacherId;
  who: CharacterId;
  name: Bi;
  /** One line about how this teacher sounds, for the picker. */
  style: Bi;
  voice: VoiceKind;
  /** 0.5–2; 1 is normal. */
  pitch: number;
  /** Multiplies the speed the parent chose. */
  rate: number;
  greeting: Bi;
  praise: Bi[];
  tryAgain: Bi;
}

export const TEACHERS: Teacher[] = [
  {
    id: 'juf-noor',
    who: 'noor',
    name: { nl: 'Juf Noor', en: 'Miss Noor' },
    style: { nl: 'Vrolijk en duidelijk', en: 'Cheerful and clear' },
    voice: 'female',
    pitch: 1.15,
    rate: 1,
    greeting: { nl: 'Hoi! Ik ben juf Noor. Zullen we samen rekenen?', en: "Hi! I'm Miss Noor. Shall we do some maths together?" },
    praise: [
      { nl: 'Goed zo!', en: 'Well done!' },
      { nl: 'Knap gedaan!', en: 'Nicely done!' },
      { nl: 'Super, ga zo door!', en: 'Super, keep it up!' },
    ],
    tryAgain: { nl: 'Bijna! Probeer nog eens.', en: 'Almost! Try again.' },
  },
  {
    id: 'meester-sam',
    who: 'sam',
    name: { nl: 'Meester Sam', en: 'Mr Sam' },
    style: { nl: 'Rustig en vriendelijk', en: 'Calm and friendly' },
    voice: 'male',
    pitch: 1,
    rate: 0.95,
    greeting: { nl: 'Hallo! Ik ben meester Sam. Ik help je graag.', en: "Hello! I'm Mr Sam. I'm happy to help you." },
    praise: [
      { nl: 'Top!', en: 'Great!' },
      { nl: 'Helemaal goed!', en: 'Exactly right!' },
      { nl: 'Mooi gerekend!', en: 'Nice work!' },
    ],
    tryAgain: { nl: 'Bijna! Kijk nog eens goed.', en: 'Almost! Take another look.' },
  },
  {
    id: 'pip',
    who: 'pip',
    name: { nl: 'Pip de hond', en: 'Pip the dog' },
    style: { nl: 'Hoog en grappig', en: 'High and funny' },
    voice: 'any',
    pitch: 1.6,
    rate: 1.05,
    greeting: { nl: 'Woef! Ik ben Pip. Rekenen is net zo leuk als een bal!', en: "Woof! I'm Pip. Maths is as much fun as a ball!" },
    praise: [
      { nl: 'Woef! Goed zo!', en: 'Woof! Well done!' },
      { nl: 'Kwispel kwispel, helemaal goed!', en: 'Wag wag, exactly right!' },
      { nl: 'Jij bent een slimme!', en: "You're a clever one!" },
    ],
    tryAgain: { nl: 'Snuffel snuffel… bijna! Nog een keer.', en: 'Sniff sniff… almost! One more time.' },
  },
  {
    id: 'boer-jan',
    who: 'jan',
    name: { nl: 'Boer Jan', en: 'Farmer Jan' },
    style: { nl: 'Laag en langzaam', en: 'Low and slow' },
    voice: 'male',
    pitch: 0.75,
    rate: 0.85,
    greeting: { nl: 'Goedemorgen! Ik ben boer Jan. Laten we eens tellen.', en: "Good morning! I'm Farmer Jan. Let's do some counting." },
    praise: [
      { nl: 'Prachtig, net als mijn appels!', en: 'Lovely, just like my apples!' },
      { nl: 'Goed geteld!', en: 'Well counted!' },
      { nl: 'Daar word ik blij van!', en: 'That makes me happy!' },
    ],
    tryAgain: { nl: 'Rustig aan… bijna. Probeer het nog eens.', en: 'Take it easy… almost. Try it again.' },
  },
  {
    id: 'juf-uil',
    who: 'uil',
    name: { nl: 'Juf Uil', en: 'Miss Owl' },
    style: { nl: 'Wijs en heel rustig', en: 'Wise and very calm' },
    voice: 'female',
    pitch: 0.95,
    rate: 0.8,
    greeting: { nl: 'Oehoe! Ik ben juf Uil. We doen het stap voor stap.', en: "Hoo-hoo! I'm Miss Owl. We'll go step by step." },
    praise: [
      { nl: 'Oehoe, wat knap!', en: 'Hoo-hoo, how clever!' },
      { nl: 'Heel goed nagedacht!', en: 'Very well thought out!' },
      { nl: 'Precies goed!', en: 'Exactly right!' },
    ],
    tryAgain: { nl: 'Denk nog even rustig na. Bijna!', en: 'Think about it calmly. Almost!' },
  },
  {
    id: 'robbie',
    who: 'robot',
    name: { nl: 'Robbie de robot', en: 'Robbie the robot' },
    style: { nl: 'Diep en piepend', en: 'Deep and beepy' },
    voice: 'any',
    pitch: 0.5,
    rate: 0.95,
    greeting: { nl: 'Bliep bliep. Ik ben Robbie. Rekenmodule staat aan!', en: "Beep beep. I'm Robbie. Maths module switched on!" },
    praise: [
      { nl: 'Bliep! Helemaal goed!', en: 'Beep! Exactly right!' },
      { nl: 'Berekening klopt!', en: 'Calculation correct!' },
      { nl: 'Super, mijn lampjes knipperen!', en: 'Super, my lights are flashing!' },
    ],
    tryAgain: { nl: 'Bliep… bijna. Nieuwe poging!', en: 'Beep… almost. New attempt!' },
  },
];

export const DEFAULT_TEACHER: TeacherId = 'juf-noor';

export function teacherById(id: TeacherId | undefined): Teacher {
  return TEACHERS.find((t) => t.id === id) ?? TEACHERS[0];
}

// ---------- matching a device voice to a teacher ----------

export interface VoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

// Common voice names on Apple, Windows, Android and Chrome devices.
const FEMALE = /ellen|claire|fenna|colette|hanna|lotte|laura|flo|sandy|shelley|grandma|samantha|karen|moira|serena|tessa|victoria|kate|susan|zira|hazel|libby|sonia|female|vrouw|google nederlands|google uk english female|google us english/i;
const MALE = /xander|maarten|frank|arthur|daniel|oliver|fred|alex|thomas|rocko|reed|eddy|grandpa|ralph|david|mark|george|ryan|male|man\b/i;

export function voiceKind(v: Pick<VoiceInfo, 'name'>): VoiceKind {
  if (MALE.test(v.name) && !/female/i.test(v.name)) return 'male';
  if (FEMALE.test(v.name)) return 'female';
  return 'any';
}

const PREFERRED: Record<Lang, string[]> = { nl: ['nl-nl', 'nl-be'], en: ['en-gb', 'en-us'] };

/**
 * Pick the device voice for a teacher: a voice the parent chose wins; else the
 * best regional voice of the right kind (female/male), local before online.
 */
export function chooseVoice<V extends VoiceInfo>(voices: V[], lang: Lang, kind: VoiceKind, chosenURI?: string | null): V | undefined {
  if (chosenURI) {
    const chosen = voices.find((v) => v.voiceURI === chosenURI);
    if (chosen) return chosen;
  }
  const norm = (v: V) => v.lang.replace('_', '-').toLowerCase();
  const order = PREFERRED[lang];
  const candidates = voices.filter((v) => norm(v).startsWith(lang));
  const score = (v: V) => {
    const region = order.indexOf(norm(v));
    const k = voiceKind(v);
    const kindPenalty = kind === 'any' || k === kind ? 0 : k === 'any' ? 1 : 2;
    return kindPenalty * 10 + (region === -1 ? order.length : region) * 2 + (v.localService ? 0 : 1);
  };
  return [...candidates].sort((a, b) => score(a) - score(b))[0];
}
