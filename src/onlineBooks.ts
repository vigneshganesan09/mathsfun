// Free online picture books: the Dutch and English translations of African
// Storybook stories published by the Global African Storybook Project
// (global-asp.github.io, CC BY licences, browser-readable with CORS).
// The parsers are pure functions so they can be tested without a browser.
import type { Book, ReadingLevelId } from './readingData';

export const ONLINE_BASE = 'https://global-asp.github.io/storybooks-swahili/stories';
export const ONLINE_HOME = 'https://global-asp.github.io/storybooks-swahili/';

export interface OnlineListing {
  /** Four-digit story id, the same in every language. */
  id: string;
  title: string;
  /** 1 (easiest) to 5. */
  level: number;
  cover: string;
}

export interface ParsedBook {
  title: string;
  level: number;
  credits: { author?: string; illustrator?: string; translator?: string };
  licence?: { name: string; url: string };
  source?: { title: string; url: string };
  /** Story pages (the cover is left out), keyed by page number "02", "03", … */
  pages: { no: string; image: string; text: string }[];
}

/** African Storybook levels mapped onto the reading shelf's groep levels. */
export const ONLINE_LEVEL: Record<number, ReadingLevelId> = { 1: 'g3', 2: 'g4', 3: 'g5', 4: 'g6', 5: 'g7' };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Strip tags, decode common entities and collapse white space. */
export function cleanText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
      if (e.startsWith('#') && !(e in ENTITIES)) return String.fromCodePoint(Number(e.slice(1)));
      return ENTITIES[e] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** The stories list page for a language. */
export function parseIndex(html: string, lang = 'nl'): OnlineListing[] {
  const out: OnlineListing[] = [];
  const seen = new Set<string>();
  const card = new RegExp(
    `href="[^"]*/stories/${lang}/(\\d{4})/"[\\s\\S]*?<img[^>]*src="([^"]+)"[\\s\\S]*?card-title[^>]*>([\\s\\S]*?)</h3>[\\s\\S]*?data-tooltip="Level (\\d)"`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = card.exec(html))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ id: m[1], cover: m[2], title: cleanText(m[3]), level: Number(m[4]) });
  }
  return out;
}

function credit(html: string, label: string): string | undefined {
  const m = html.match(new RegExp(`data-tooltip="${label}"[\\s\\S]*?</span>([\\s\\S]*?)</h3>`));
  const t = m ? cleanText(m[1]) : '';
  return t || undefined;
}

/** One story page in one language. */
export function parseBook(html: string): ParsedBook {
  const blocks = html.split(/<div[^>]*id="text(\d{2})"[^>]*>/);
  // blocks: [before, "01", body, "02", body, …]
  const pages: ParsedBook['pages'] = [];
  let title = '';
  for (let i = 1; i < blocks.length; i += 2) {
    const no = blocks[i];
    const body = blocks[i + 1] ?? '';
    const image = body.match(/<img[^>]*class="img-responsive"[^>]*src="([^"]+)"/)?.[1] ?? '';
    if (no === '01') {
      title = cleanText(body.match(/<h1>\s*<span class="def">([\s\S]*?)<\/span>/)?.[1] ?? '');
      continue;
    }
    const text = cleanText(body.match(/level\d-txt def"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '');
    if (text) pages.push({ no, image, text });
  }
  const lic = html.match(/rel="license" href="([^"]+)"[\s\S]*?licensed under a <a[^>]*>([\s\S]*?)<\/a>/);
  const src = html.match(/Source:<\/span>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  return {
    title,
    level: Number(html.match(/data-tooltip="Level"[\s\S]*?Level (\d)/)?.[1] ?? 1),
    credits: { author: credit(html, 'Written by'), illustrator: credit(html, 'Illustrated by'), translator: credit(html, 'Translated by') },
    licence: lic ? { url: lic[1], name: cleanText(lic[2]) } : undefined,
    source: src ? { url: src[1], title: cleanText(src[2]) } : undefined,
    pages,
  };
}

/** Put the Dutch and English versions of a story together as a shelf book. */
export function combineBook(id: string, nl: ParsedBook, en: ParsedBook | null): Book {
  const enByNo = new Map((en?.pages ?? []).map((p) => [p.no, p.text]));
  return {
    id: `asp-${id}`,
    level: ONLINE_LEVEL[nl.level] ?? 'g3',
    title: { nl: nl.title, en: en?.title || nl.title },
    cover: {},
    coverImage: nl.pages[0]?.image,
    online: {
      sourceTitle: nl.source?.title ?? '',
      sourceUrl: nl.source?.url ?? ONLINE_HOME,
      licence: nl.licence?.name ?? 'Creative Commons',
      licenceUrl: nl.licence?.url ?? '',
      author: nl.credits.author,
      illustrator: nl.credits.illustrator,
      translator: nl.credits.translator,
      readerUrl: `${ONLINE_BASE}/nl/${id}/`,
    },
    pages: nl.pages.map((p) => ({ nl: p.text, en: enByNo.get(p.no) ?? '', image: p.image })),
  };
}

// ---------- fetching (browser) ----------

async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

export async function fetchOnlineIndex(): Promise<OnlineListing[]> {
  return parseIndex(await getText(`${ONLINE_BASE}/nl/`));
}

/** Download a story in Dutch, with the English translation if there is one. */
export async function downloadOnlineBook(id: string): Promise<Book> {
  const nl = parseBook(await getText(`${ONLINE_BASE}/nl/${id}/`));
  let en: ParsedBook | null = null;
  try {
    en = parseBook(await getText(`${ONLINE_BASE}/en/${id}/`));
  } catch {
    // No English version: the book still works in Dutch.
  }
  return combineBook(id, nl, en);
}
