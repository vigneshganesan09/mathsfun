// Downloads the Dutch Global Storybooks (African Storybook translations, CC BY)
// with their English versions and pictures, so they ship inside the app and
// work offline. Run: npx vite-node scripts/bundleBooks.ts
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { ONLINE_BASE, combineBook, parseBook, parseIndex, type ParsedBook } from '../src/onlineBooks';
import { tokenize } from '../src/readingScore';
import type { Book, ReadingLevelId } from '../src/readingData';

const get = async (u: string) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  return r;
};

const COLOURS = ['#e8574f', '#ff7a1a', '#16825a', '#3bb8a0', '#4ea9e0', '#8a6fd1', '#c98d5c', '#e8862f'];

function levelOf(b: Book, aspLevel: number): { level: ReadingLevelId; avi: string } {
  const words = b.pages.reduce((n, p) => n + tokenize(p.nl).filter((t) => t.norm).length, 0) / b.pages.length;
  if (aspLevel <= 1 && words <= 8) return { level: 'g3', avi: words <= 5 ? 'AVI Start' : 'AVI M3' };
  if (words <= 14) return { level: aspLevel <= 1 ? 'g3' : 'g4', avi: aspLevel <= 1 ? 'AVI E3' : 'AVI M4' };
  return { level: 'g4', avi: 'AVI E4' };
}

const index = parseIndex(await (await get(`${ONLINE_BASE}/nl/`)).text());
console.log(index.length, 'books');
const out: Book[] = [];
for (const [i, l] of index.entries()) {
  const nl = parseBook(await (await get(`${ONLINE_BASE}/nl/${l.id}/`)).text());
  let en: ParsedBook | null = null;
  try {
    en = parseBook(await (await get(`${ONLINE_BASE}/en/${l.id}/`)).text());
  } catch {
    /* Dutch only */
  }
  const b = combineBook(l.id, nl, en);
  const dir = `public/books/${l.id}`;
  mkdirSync(dir, { recursive: true });
  const local = async (src: string | undefined, name: string) => {
    if (!src) return undefined;
    const url = new URL(src, `${ONLINE_BASE}/nl/${l.id}/`).href;
    const ext = (url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1] ?? 'jpg').toLowerCase();
    const file = `${dir}/${name}.${ext}`;
    if (!existsSync(file)) writeFileSync(file, Buffer.from(await (await get(url)).arrayBuffer()));
    return `books/${l.id}/${name}.${ext}`;
  };
  b.coverImage = await local(l.cover, 'cover');
  for (const [k, p] of b.pages.entries()) p.image = await local(p.image, String(k + 1).padStart(2, '0'));
  const lv = levelOf(b, nl.level);
  b.level = lv.level;
  b.avi = lv.avi;
  b.shelf = 'eerste';
  b.colour = COLOURS[i % COLOURS.length];
  out.push(b);
  console.log(l.id, b.level, b.avi, b.title.nl, b.pages.length);
}
writeFileSync('src/bundledBooks.json', JSON.stringify(out, null, 1));
