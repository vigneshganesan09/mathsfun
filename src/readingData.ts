// The reading shelf: short original Dutch picture books, levelled by school
// groep (with the AVI level schools use) and by Dutch language level (ERK/CEFR).
// Every page has an English translation for parents.
import type { Bi, CharacterId, Item } from './core';
import bundled from './bundledBooks.json';
import { BOOKS_YOUNG } from './booksYoung';
import { BOOKS_OLDER } from './booksOlder';

export type ReadingLevelId = 'g12' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8' | 'a1' | 'a2' | 'b1' | 'b2';

/** Older saved choices used one shelf for groep 7 and 8. */
export function migrateLevel(id: string | null): ReadingLevelId | null {
  if (id === 'g78') return 'g7';
  return READING_LEVELS.some((l) => l.id === id) ? (id as ReadingLevelId) : null;
}

/** The shelf that fits a child's school groep. */
export function levelForGroep(groep: string): ReadingLevelId {
  const g = Number(groep.slice(0, 1));
  if (!g || g <= 2) return 'g12';
  return (`g${Math.min(8, g)}` as ReadingLevelId);
}

export interface ReadingLevel {
  id: ReadingLevelId;
  name: Bi;
  note: Bi;
  kind: 'groep' | 'erk';
}

export const READING_LEVELS: ReadingLevel[] = [
  { id: 'g12', kind: 'groep', name: { nl: 'Groep 1–2', en: 'Group 1–2' }, note: { nl: 'Voorlezen', en: 'Read to me' } },
  { id: 'g3', kind: 'groep', name: { nl: 'Groep 3', en: 'Group 3' }, note: { nl: 'AVI Start–M3', en: 'AVI Start–M3' } },
  { id: 'g4', kind: 'groep', name: { nl: 'Groep 4', en: 'Group 4' }, note: { nl: 'AVI E3–M4', en: 'AVI E3–M4' } },
  { id: 'g5', kind: 'groep', name: { nl: 'Groep 5', en: 'Group 5' }, note: { nl: 'AVI E4–M5', en: 'AVI E4–M5' } },
  { id: 'g6', kind: 'groep', name: { nl: 'Groep 6', en: 'Group 6' }, note: { nl: 'AVI M6–E6', en: 'AVI M6–E6' } },
  { id: 'g7', kind: 'groep', name: { nl: 'Groep 7', en: 'Group 7' }, note: { nl: 'AVI M7–E7', en: 'AVI M7–E7' } },
  { id: 'g8', kind: 'groep', name: { nl: 'Groep 8', en: 'Group 8' }, note: { nl: 'AVI Plus', en: 'AVI Plus' } },
  { id: 'a1', kind: 'erk', name: { nl: 'Niveau A1', en: 'Level A1' }, note: { nl: 'Beginner', en: 'Beginner' } },
  { id: 'a2', kind: 'erk', name: { nl: 'Niveau A2', en: 'Level A2' }, note: { nl: 'Basis · inburgering', en: 'Elementary · civic integration' } },
  { id: 'b1', kind: 'erk', name: { nl: 'Niveau B1', en: 'Level B1' }, note: { nl: 'Gevorderd · Staatsexamen I', en: 'Intermediate · State exam I' } },
  { id: 'b2', kind: 'erk', name: { nl: 'Niveau B2', en: 'Level B2' }, note: { nl: 'Hoger gevorderd · Staatsexamen II', en: 'Upper intermediate · State exam II' } },
];

/** Landscapes from the art layer (src/drawings.ts), used as page backgrounds. */
export type LandTheme = 'tulips' | 'polder' | 'beach' | 'forest' | 'city' | 'mountains' | 'space';

/** Library shelves inside a level. */
export type ShelfId = 'eerste' | 'dieren' | 'avontuur' | 'sprookjes' | 'motivatie' | 'weten' | 'dagelijks';

export const SHELVES: { id: ShelfId; name: Bi }[] = [
  { id: 'eerste', name: { nl: 'Eerste boekjes', en: 'First books' } },
  { id: 'dieren', name: { nl: 'Dieren', en: 'Animals' } },
  { id: 'motivatie', name: { nl: 'Ik kan het!', en: 'Stories that make you strong' } },
  { id: 'sprookjes', name: { nl: 'Sprookjes & fabels', en: 'Fairy tales & fables' } },
  { id: 'avontuur', name: { nl: 'Avontuur', en: 'Adventure' } },
  { id: 'weten', name: { nl: 'Weetjes', en: 'Facts' } },
  { id: 'dagelijks', name: { nl: 'Het dagelijks leven', en: 'Everyday life' } },
];

export interface BookPage {
  nl: string;
  en: string;
  /** Landscape behind the characters for drawn pages. */
  scene?: LandTheme;
  cast?: CharacterId[];
  items?: { item: Item; count: number };
  /** Illustration URL (online books). */
  image?: string;
}

/** Where a downloaded book comes from, for the credits and licence notice. */
export interface OnlineSource {
  sourceTitle: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string;
  author?: string;
  illustrator?: string;
  translator?: string;
  readerUrl: string;
}

export interface Book {
  id: string;
  level: ReadingLevelId;
  title: Bi;
  cover: { cast?: CharacterId[]; item?: Item };
  coverImage?: string;
  /** Shelf inside the level (defaults to 'eerste' for groep 3, else 'avontuur'). */
  shelf?: ShelfId;
  /** AVI level label shown on the cover, e.g. "AVI M4". */
  avi?: string;
  /** Spine colour of the cover. */
  colour?: string;
  /** For retold public-domain tales: where the story comes from. */
  retold?: Bi;
  /** Hand-drawn story art from src/storyArt.ts (one picture per page). */
  storyArt?: 'haas' | 'leeuw' | 'eend';
  /** Set for books imported from a PDF file on this device (src/pdfBooks.ts). */
  pdf?: { fileName: string; addedAt: string; sourceUrl?: string; note?: string };
  /** Set for books downloaded from the online library. */
  online?: OnlineSource;
  pages: BookPage[];
}

const CORE_BOOKS: Book[] = [
  // ---------- groep 3 ----------
  {
    id: 'pip-en-de-bal',
    level: 'g3',
    title: { nl: 'Pip en de bal', en: 'Pip and the ball' },
    cover: { cast: ['pip'], item: 'marble' },
    pages: [
      { nl: 'Dit is Pip. Pip is een hond.', en: 'This is Pip. Pip is a dog.', cast: ['pip'] },
      { nl: 'Pip ziet een bal. De bal is rood.', en: 'Pip sees a ball. The ball is red.', cast: ['pip'], items: { item: 'marble', count: 1 } },
      { nl: 'Noor gooit de bal ver weg.', en: 'Noor throws the ball far away.', cast: ['noor', 'pip'] },
      { nl: 'Pip rent en rent. Hij pakt de bal!', en: 'Pip runs and runs. He grabs the ball!', cast: ['pip'], items: { item: 'marble', count: 1 } },
      { nl: 'Goed zo, Pip! Noor is blij.', en: 'Well done, Pip! Noor is happy.', cast: ['noor', 'pip'] },
    ],
  },
  {
    id: 'sam-en-de-appels',
    level: 'g3',
    title: { nl: 'Sam en de appels', en: 'Sam and the apples' },
    cover: { cast: ['sam'], item: 'apple' },
    pages: [
      { nl: 'Sam is in de tuin.', en: 'Sam is in the garden.', cast: ['sam'] },
      { nl: 'In de boom zit een appel. Nog een. En nog een!', en: 'There is an apple in the tree. Another one. And another one!', items: { item: 'apple', count: 3 } },
      { nl: 'Sam pakt de appels. Een, twee, drie.', en: 'Sam picks the apples. One, two, three.', cast: ['sam'], items: { item: 'apple', count: 3 } },
      { nl: 'Mam maakt er moes van. Mmm, wat lekker!', en: 'Mum makes apple sauce from them. Mmm, how tasty!', cast: ['sam'] },
    ],
  },

  // ---------- groep 4 ----------
  {
    id: 'de-trein-naar-oma',
    level: 'g4',
    title: { nl: 'De trein naar oma', en: 'The train to Grandma' },
    cover: { cast: ['noor'], item: 'person' },
    pages: [
      { nl: 'Noor gaat met de trein naar oma. Ze heeft een rugzak met een boek en een appel.', en: 'Noor is taking the train to Grandma. She has a backpack with a book and an apple.', cast: ['noor'] },
      { nl: 'In de trein is het druk. Noor zoekt een plekje bij het raam.', en: 'The train is busy. Noor looks for a seat by the window.', items: { item: 'person', count: 6 } },
      { nl: 'Buiten ziet ze koeien, schapen en een molen. De molen draait langzaam rond.', en: 'Outside she sees cows, sheep and a windmill. The windmill turns slowly.', cast: ['noor'] },
      { nl: 'Op het station staat oma te zwaaien. Noor rent naar haar toe en geeft haar een dikke knuffel.', en: 'Grandma is waving at the station. Noor runs to her and gives her a big hug.', cast: ['noor'] },
    ],
  },

  // ---------- groep 5 ----------
  {
    id: 'de-verdwenen-eieren',
    level: 'g5',
    title: { nl: 'Boer Jan en de verdwenen eieren', en: 'Farmer Jan and the missing eggs' },
    cover: { cast: ['jan'], item: 'egg' },
    pages: [
      { nl: 'Elke ochtend raapt boer Jan de eieren uit het kippenhok. Maar vandaag is het hok bijna leeg!', en: 'Every morning Farmer Jan collects the eggs from the henhouse. But today the henhouse is almost empty!', cast: ['jan'], items: { item: 'egg', count: 2 } },
      { nl: "'Wie heeft mijn eieren gepakt?' roept hij verbaasd. De kippen kakelen, maar ze zeggen niets.", en: "'Who has taken my eggs?' he calls in surprise. The hens cluck, but they say nothing.", cast: ['jan'] },
      { nl: 'Dan ziet hij sporen in het zand. Kleine pootjes... die lopen naar de schuur.', en: 'Then he sees tracks in the sand. Little paws... leading to the barn.', cast: ['jan'] },
      { nl: 'In de schuur ligt Pip, de hond van de buren. Om hem heen liggen tien eieren, allemaal heel!', en: "In the barn lies Pip, the neighbours' dog. Around him are ten eggs, all unbroken!", cast: ['pip'], items: { item: 'egg', count: 10 } },
      { nl: "Boer Jan moet lachen. 'Jij bent een echte eierenbewaker, Pip!'", en: "Farmer Jan has to laugh. 'You're a real egg guard, Pip!'", cast: ['jan', 'pip'] },
    ],
  },

  // ---------- groep 6 ----------
  {
    id: 'de-oude-molen',
    level: 'g6',
    title: { nl: 'Het geheim van de oude molen', en: 'The secret of the old windmill' },
    cover: { cast: ['sam', 'noor'], item: 'bike' },
    pages: [
      { nl: 'Sam en Noor fietsen na school langs de oude molen aan de rand van het dorp. Al jaren staan de wieken stil.', en: 'After school, Sam and Noor cycle past the old windmill at the edge of the village. Its sails have stood still for years.', cast: ['sam', 'noor'], items: { item: 'bike', count: 2 } },
      { nl: 'Maar vanmiddag zien ze iets vreemds: er brandt licht achter het kleine raampje bovenin.', en: 'But this afternoon they see something strange: a light is on behind the small window at the top.', cast: ['sam', 'noor'] },
      { nl: 'Voorzichtig duwen ze de zware deur open. Op de houten trap horen ze gekraak en gezoem.', en: 'Carefully they push the heavy door open. On the wooden stairs they hear creaking and humming.', cast: ['noor'] },
      { nl: "Boven zit de molenaar, een oude man met witte haren. Hij repareert een tandwiel. 'Zaterdag gaat de molen weer draaien,' zegt hij trots.", en: "At the top sits the miller, an old man with white hair. He is repairing a cogwheel. 'On Saturday the windmill will turn again,' he says proudly.", cast: ['sam'] },
      { nl: 'Die zaterdag staat het halve dorp te kijken. Langzaam beginnen de wieken te draaien, en iedereen juicht.', en: 'That Saturday half the village is watching. Slowly the sails begin to turn, and everyone cheers.', items: { item: 'person', count: 8 } },
    ],
  },

  // ---------- groep 7–8 ----------
  {
    id: 'storm-op-de-waddenzee',
    level: 'g7',
    title: { nl: 'Storm op de Waddenzee', en: 'Storm on the Wadden Sea' },
    cover: { cast: ['noor', 'sam'] },
    pages: [
      { nl: 'Tijdens de zomervakantie mogen Noor en Sam mee op een zeilboot naar Terschelling. De schipper, een stoere vrouw met een zonnebril, legt uit hoe de zeilen werken.', en: 'During the summer holidays Noor and Sam are allowed to sail to Terschelling. The skipper, a tough woman in sunglasses, explains how the sails work.', cast: ['noor', 'sam'] },
      { nl: 'Halverwege verandert het weer plotseling. Donkere wolken pakken zich samen en de wind wordt steeds harder.', en: 'Halfway there, the weather suddenly changes. Dark clouds gather and the wind gets stronger and stronger.' },
      { nl: "'Iedereen een zwemvest aan en blijf in de kajuit!' roept de schipper. De boot helt zo ver over dat de kopjes van tafel glijden.", en: "'Everyone put on a life jacket and stay in the cabin!' the skipper shouts. The boat leans over so far that the cups slide off the table.", cast: ['sam'] },
      { nl: 'Sam is misselijk, maar Noor houdt de kaart vast en helpt met navigeren. Samen tellen ze de boeien: nog drie tot de haven.', en: 'Sam feels seasick, but Noor holds the chart and helps navigate. Together they count the buoys: three more to the harbour.', cast: ['noor', 'sam'] },
      { nl: 'Als ze eindelijk aanmeren, breekt de zon door de wolken. Moe maar trots stappen ze aan wal. Dit avontuur vergeten ze nooit meer.', en: 'When they finally moor, the sun breaks through the clouds. Tired but proud, they step ashore. They will never forget this adventure.', cast: ['noor', 'sam'] },
    ],
  },

  // ---------- ERK A1 ----------
  {
    id: 'mijn-dag',
    level: 'a1',
    title: { nl: 'Mijn dag', en: 'My day' },
    cover: { item: 'person' },
    pages: [
      { nl: 'Ik heet Sara. Ik woon in Utrecht. Ik heb twee kinderen.', en: 'My name is Sara. I live in Utrecht. I have two children.', items: { item: 'person', count: 3 } },
      { nl: 'Om zeven uur sta ik op. Ik drink koffie en ik eet brood met kaas.', en: 'I get up at seven o’clock. I drink coffee and I eat bread with cheese.', items: { item: 'roll', count: 2 } },
      { nl: 'Ik breng de kinderen naar school. Daarna ga ik met de fiets naar mijn werk.', en: 'I take the children to school. Then I cycle to work.', items: { item: 'bike', count: 1 } },
      { nl: "'s Avonds koken we samen. Om negen uur ga ik naar bed.", en: 'In the evening we cook together. At nine o’clock I go to bed.' },
    ],
  },

  // ---------- ERK A2 ----------
  {
    id: 'bij-de-huisarts',
    level: 'a2',
    title: { nl: 'Bij de huisarts', en: "At the doctor's" },
    cover: { item: 'person' },
    pages: [
      { nl: 'Ik voel me al drie dagen niet lekker. Ik heb hoofdpijn en ik moet veel hoesten. Daarom bel ik de huisarts.', en: "I haven't felt well for three days. I have a headache and I cough a lot. That's why I call the GP." },
      { nl: "De assistente vraagt: 'Heeft u ook koorts?' Ik zeg: 'Ja, een beetje. Gisteren had ik 38 graden.'", en: "The assistant asks: 'Do you also have a fever?' I say: 'Yes, a little. Yesterday I had a temperature of 38 degrees.'" },
      { nl: 'Ik mag om half elf langskomen. De dokter luistert naar mijn longen en kijkt in mijn keel.', en: 'I can come by at half past ten. The doctor listens to my lungs and looks in my throat.', items: { item: 'person', count: 2 } },
      { nl: "'Het is een griepje,' zegt ze. 'Rust goed uit en drink veel water. Als het niet beter wordt, belt u volgende week terug.'", en: "'It's a touch of flu,' she says. 'Get plenty of rest and drink lots of water. If it doesn't get better, call back next week.'" },
    ],
  },

  // ---------- ERK B1 ----------
  {
    id: 'een-nieuwe-baan',
    level: 'b1',
    title: { nl: 'Een nieuwe baan', en: 'A new job' },
    cover: { item: 'person' },
    pages: [
      { nl: 'Na twee jaar zoeken heb ik eindelijk een baan gevonden bij een bibliotheek in Amersfoort. Ik was erg zenuwachtig voor het sollicitatiegesprek, maar het ging goed.', en: 'After two years of searching I have finally found a job at a library in Amersfoort. I was very nervous about the job interview, but it went well.' },
      { nl: 'Op mijn eerste werkdag kreeg ik een rondleiding van mijn collega Mark. Hij liet me zien waar de boeken worden uitgeleend en hoe het computersysteem werkt.', en: 'On my first working day my colleague Mark gave me a tour. He showed me where the books are lent out and how the computer system works.', items: { item: 'person', count: 2 } },
      { nl: 'Het moeilijkste vind ik nog de telefoon. Mensen praten vaak snel en gebruiken woorden die ik niet ken. Gelukkig mag ik altijd vragen of ze het willen herhalen.', en: "What I still find hardest is the phone. People often talk fast and use words I don't know. Luckily I can always ask them to repeat it." },
      { nl: 'Ik merk dat mijn Nederlands elke week beter wordt. Volgend jaar wil ik misschien een cursus volgen, zodat ik ook de leesclub voor kinderen kan leiden.', en: "I notice my Dutch gets better every week. Next year I may take a course, so I can also lead the children's reading club." },
    ],
  },

  // ---------- ERK B2 ----------
  {
    id: 'het-fietsland',
    level: 'b2',
    title: { nl: 'Het fietsland', en: 'The cycling country' },
    cover: { item: 'bike' },
    pages: [
      { nl: 'Nederland staat bekend als fietsland: er zijn meer fietsen dan inwoners. Voor veel mensen is de fiets niet alleen een vervoermiddel, maar ook een onderdeel van hun identiteit.', en: 'The Netherlands is known as a cycling country: there are more bikes than inhabitants. For many people the bike is not just a means of transport but also part of their identity.', items: { item: 'bike', count: 3 } },
      { nl: 'Toch is fietsen in de grote steden niet zonder problemen. Fietsenstallingen raken overvol en de drukte op de fietspaden leidt regelmatig tot gevaarlijke situaties.', en: 'Yet cycling in the big cities is not without problems. Bike parks become overcrowded and the busy cycle paths regularly lead to dangerous situations.' },
      { nl: 'Gemeenten investeren daarom in bredere fietspaden en ondergrondse stallingen. Critici vinden echter dat het geld beter besteed kan worden aan het openbaar vervoer.', en: 'Municipalities therefore invest in wider cycle paths and underground bike parks. Critics, however, think the money could be better spent on public transport.' },
      { nl: 'Wat de toekomst ook brengt, één ding lijkt zeker: zolang het land zo plat blijft, zullen de Nederlanders blijven fietsen, ongeacht het weer.', en: 'Whatever the future brings, one thing seems certain: as long as the country stays this flat, the Dutch will keep cycling, whatever the weather.' },
    ],
  },
];

// ---------- retold fables and fairy tales with hand-drawn pictures (src/storyArt.ts) ----------

const page = (nl: string, en: string): BookPage => ({ nl, en });

const TALES: Book[] = [
  {
    id: 'haas-en-schildpad',
    level: 'g4',
    shelf: 'motivatie',
    avi: 'AVI E3',
    colour: '#4fa65a',
    storyArt: 'haas',
    retold: { nl: 'naar Aesopus (fabel), opnieuw verteld en getekend voor Duddu Learn', en: 'after Aesop (fable), retold and illustrated for Duddu Learn' },
    title: { nl: 'De haas en de schildpad', en: 'The Hare and the Tortoise' },
    cover: {},
    pages: [
      page('Haas is heel snel. Hij lacht om Schildpad. "Jij bent zo traag!"', 'Hare is very fast. He laughs at Tortoise. "You are so slow!"'),
      page('Schildpad zegt: "Zullen we een wedstrijd doen?"', 'Tortoise says: "Shall we have a race?"'),
      page('Klaar, af! Haas rent weg. Schildpad loopt stap voor stap.', 'Ready, go! Hare runs off. Tortoise walks step by step.'),
      page('Haas is ver vooruit. "Ik doe even een dutje," zegt hij.', 'Hare is far ahead. "I will take a little nap," he says.'),
      page('Schildpad stopt niet. Stap, stap, stap. Hij loopt langs de slapende haas.', 'Tortoise does not stop. Step, step, step. He walks past the sleeping hare.'),
      page('Haas wordt wakker en rent hard. Maar Schildpad is er al!', 'Hare wakes up and runs fast. But Tortoise is already there!'),
      page('Schildpad wint! Wie niet opgeeft, komt er wel. Langzaam maar zeker!', "Tortoise wins! If you don't give up, you get there. Slow and steady!"),
    ],
  },
  {
    id: 'lelijke-eendje',
    level: 'g4',
    shelf: 'sprookjes',
    avi: 'AVI E3',
    colour: '#4ea9e0',
    storyArt: 'eend',
    retold: { nl: 'naar H.C. Andersen (sprookje), opnieuw verteld en getekend voor Duddu Learn', en: 'after H.C. Andersen (fairy tale), retold and illustrated for Duddu Learn' },
    title: { nl: 'Het lelijke eendje', en: 'The Ugly Duckling' },
    cover: {},
    pages: [
      page('Mama Eend zit op haar eieren. Krak! Daar zijn de kuikens.', 'Mother Duck sits on her eggs. Crack! Here are the ducklings.'),
      page('Maar één eendje is groot en grijs. "Wat ben jij lelijk!" roepen de anderen.', 'But one duckling is big and grey. "You are so ugly!" the others shout.'),
      page('Het grijze eendje is verdrietig. Het gaat alleen weg.', 'The grey duckling is sad. It goes away alone.'),
      page('Het wordt winter. Het is koud. Het eendje wacht en wacht.', 'Winter comes. It is cold. The duckling waits and waits.'),
      page('Dan wordt het lente. Het eendje kijkt in het water.', 'Then spring comes. The duckling looks into the water.'),
      page('Het is een prachtige zwaan! "Kom bij ons," zeggen de zwanen. Iedereen groeit op zijn eigen manier.', 'It is a beautiful swan! "Come with us," say the swans. Everyone grows in their own way.'),
    ],
  },
  {
    id: 'leeuw-en-muis',
    level: 'g4',
    shelf: 'sprookjes',
    avi: 'AVI E3',
    colour: '#e0862f',
    storyArt: 'leeuw',
    retold: { nl: 'naar Aesopus (fabel), opnieuw verteld en getekend voor Duddu Learn', en: 'after Aesop (fable), retold and illustrated for Duddu Learn' },
    title: { nl: 'De leeuw en de muis', en: 'The Lion and the Mouse' },
    cover: {},
    pages: [
      page('Leeuw slaapt in de zon. Een klein muisje rent over zijn neus.', 'Lion is sleeping in the sun. A little mouse runs over his nose.'),
      page('Leeuw wordt wakker en pakt de muis. "Ik eet jou op!" brult hij.', 'Lion wakes up and grabs the mouse. "I will eat you!" he roars.'),
      page('"Laat me gaan," piept Muis. "Ooit help ik jou ook!" Leeuw lacht en laat haar gaan.', '"Let me go," squeaks Mouse. "One day I will help you too!" Lion laughs and lets her go.'),
      page('Op een dag zit Leeuw vast in een net. Hij brult en brult.', 'One day Lion is caught in a net. He roars and roars.'),
      page('Muis hoort hem. Ze knaagt en knaagt aan het touw.', 'Mouse hears him. She gnaws and gnaws at the rope.'),
      page('Leeuw is vrij! "Dank je wel, kleine vriend." Ook als je klein bent, kun je groot helpen.', 'Lion is free! "Thank you, little friend." Even when you are small, you can help in a big way.'),
    ],
  },
];

// ---------- free picture books from Global Storybooks, bundled with their pictures ----------
// Made by scripts/bundleBooks.ts. Licences are CC BY or CC BY-NC (kept per book).

const BUNDLED_SHELF: Record<string, ShelfId> = {
  'asp-0095': 'motivatie',
  'asp-0087': 'motivatie',
  'asp-0337': 'sprookjes',
  'asp-0156': 'sprookjes',
  'asp-0002': 'dieren',
  'asp-0327': 'dieren',
  'asp-0009': 'dieren',
};

/** Pictures live in public/books; make the paths work under any base URL. */
const withBase = (path?: string) => (path && !/^(https?:|data:|blob:|\/)/.test(path) ? `${import.meta.env?.BASE_URL ?? '/'}${path}` : path);

export const BUNDLED_BOOKS: Book[] = (bundled as unknown as Book[]).map((b) => ({
  ...b,
  shelf: BUNDLED_SHELF[b.id] ?? b.shelf,
  coverImage: withBase(b.coverImage),
  pages: b.pages.map((p) => ({ ...p, image: withBase(p.image) })),
}));

export const BOOKS: Book[] = [...CORE_BOOKS, ...TALES, ...BOOKS_YOUNG, ...BOOKS_OLDER, ...BUNDLED_BOOKS];

/** Shelf of a book inside its level. */
export const shelfOf = (b: Book): ShelfId => b.shelf ?? (b.level === 'g3' || b.level === 'g12' ? 'eerste' : b.level.startsWith('g') ? 'avontuur' : 'dagelijks');
