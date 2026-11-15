// Turns the bundled free picture books (Global Storybooks / African Storybook, CC BY and CC BY-NC,
// which allow sharing in another format with credit) into real PDF files that ship with the app.
// Run after scripts/bundleBooks.ts:  npx vite-node scripts/makePdfs.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Book } from '../src/readingData';

const books = JSON.parse(readFileSync('src/bundledBooks.json', 'utf8')) as Book[];
const INK = rgb(0.12, 0.165, 0.267);
const MUTED = rgb(0.34, 0.376, 0.478);
const W = 842; // A4 landscape
const H = 595;

function hexRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Write wrapped text in a box, shrinking the font until it fits. Returns nothing. */
function textBox(page: PDFPage, text: string, font: PDFFont, x: number, y: number, w: number, h: number, size: number, color = INK) {
  let lines = wrap(text, font, size, w);
  while (lines.length * size * 1.5 > h && size > 12) {
    size -= 2;
    lines = wrap(text, font, size, w);
  }
  const lead = size * 1.5;
  let top = y + h / 2 + (lines.length * lead) / 2 - size;
  for (const l of lines) {
    page.drawText(l, { x, y: top, size, font, color });
    top -= lead;
  }
}

async function picture(doc: PDFDocument, path: string | undefined) {
  if (!path) return undefined;
  const bytes = readFileSync(`public/${path}`);
  return /\.png$/i.test(path) ? doc.embedPng(bytes) : doc.embedJpg(bytes);
}

mkdirSync('public/pdfs', { recursive: true });
const manifest = [];
for (const b of books) {
  const doc = await PDFDocument.create();
  doc.setTitle(b.title.nl);
  doc.setAuthor([b.online?.author, b.online?.illustrator].filter(Boolean).join(', '));
  doc.setSubject(`${b.online?.licence ?? ''} — ${b.online?.sourceUrl ?? ''}`);
  doc.setLanguage('nl-NL');
  doc.setProducer('Duddu Learn');
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const spine = hexRgb(b.colour ?? '#ff7a1a');

  const frame = (page: PDFPage) => {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 0.973, 0.925) });
    page.drawRectangle({ x: 0, y: 0, width: 18, height: H, color: spine });
  };
  const placeImage = async (page: PDFPage, path: string | undefined, x: number, y: number, w: number, h: number) => {
    const img = await picture(doc, path);
    if (!img) return;
    const s = Math.min(w / img.width, h / img.height);
    page.drawImage(img, { x: x + (w - img.width * s) / 2, y: y + (h - img.height * s) / 2, width: img.width * s, height: img.height * s });
  };

  // cover
  const cover = doc.addPage([W, H]);
  frame(cover);
  await placeImage(cover, b.coverImage, 48, 40, 380, H - 80);
  textBox(cover, b.title.nl, bold, 460, 120, 340, 360, 44);
  const en: string[] = [b.title.en];

  // story pages: picture left, Dutch text right
  for (const p of b.pages) {
    const page = doc.addPage([W, H]);
    frame(page);
    await placeImage(page, p.image, 48, 40, 420, H - 80);
    textBox(page, p.nl, bold, 500, 60, 300, H - 120, 34);
    en.push(p.en);
  }

  // credits
  const o = b.online!;
  const credits = doc.addPage([W, H]);
  frame(credits);
  const lines = [
    b.title.nl,
    o.author ? `Tekst: ${o.author}` : '',
    o.illustrator ? `Tekeningen: ${o.illustrator}` : '',
    o.translator ? `Vertaling: ${o.translator}` : '',
    `Bron: African Storybook (${o.sourceUrl}), via Global Storybooks (${o.readerUrl}).`,
    `Licentie: ${o.licence} (${o.licenceUrl}).`,
    'Deze PDF is gemaakt voor Duddu Learn uit het oorspronkelijke boek; tekst en tekeningen zijn niet veranderd.',
  ].filter(Boolean);
  let y = H - 90;
  for (const [i, l] of lines.entries()) {
    for (const w of wrap(l, i ? regular : bold, i ? 15 : 26, W - 140)) {
      credits.drawText(w, { x: 70, y, size: i ? 15 : 26, font: i ? regular : bold, color: i ? MUTED : INK });
      y -= i ? 24 : 40;
    }
    y -= 6;
  }
  en.push('');

  const file = `pdfs/${b.id}.pdf`;
  writeFileSync(`public/${file}`, await doc.save());
  manifest.push({
    id: `pdf-${b.id}`,
    file,
    level: b.level,
    avi: b.avi,
    colour: b.colour,
    shelf: b.shelf,
    title: b.title,
    coverImage: b.coverImage,
    online: b.online,
    /** English per PDF page (cover, story pages, credits). */
    en,
    /** Page index of the credits page: shown, never scored. */
    creditsPage: en.length - 1,
  });
  console.log(file, b.pages.length + 2, 'pages');
}
writeFileSync('src/bundledPdfs.json', JSON.stringify(manifest, null, 1));
