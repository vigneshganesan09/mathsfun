// Pure helpers for PDF picture books (no browser APIs): turn pdf.js text items
// of one page into clean reading text, and guess a book title.

/** The part of a pdf.js TextItem we use. transform = [a, b, c, d, x, y] (y grows upwards). */
export interface PdfTextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

/** Credit / licence lines that are not part of the story. */
const BOILERPLATE: RegExp[] = [
  /creative\s*commons/i,
  /storyweaver/i,
  /pratham/i,
  /book\s*dash/i,
  /african\s*storybook/i,
  /www\./i,
  /https?:/i,
  /\.(org|com|net|in|za)\b/i,
  /©|\(c\)\s*\d{4}/i,
  /\blicen[ct]i?e\b/i,
  /\blicentie/i,
  /\bCC[\s-]?BY\b/i,
  /this book was/i,
  /dit boek (is|werd)/i,
  /\bISBN\b/i,
  /all rights reserved/i,
  /^\s*(tekst|text|verhaal|story|illustrat\w*|vertaling|vertaald door|translation|translated by|auteur|author|written by|illustrated by|geschreven door|ge[iï]llustreerd door)\s*[:\-–]/i,
];

export function isBoilerplateLine(line: string): boolean {
  return BOILERPLATE.some((re) => re.test(line));
}

const itemX = (it: PdfTextItem) => it.transform[4] ?? 0;
const itemY = (it: PdfTextItem) => it.transform[5] ?? 0;
const itemH = (it: PdfTextItem) => Math.abs(it.height || it.transform[3] || it.transform[0] || 10);

/** Group items into lines (top to bottom), each line left to right. */
export function pageLines(items: PdfTextItem[]): string[] {
  const usable = items.filter((it) => typeof it.str === 'string' && it.str.length > 0 && Array.isArray(it.transform));
  const sorted = [...usable].sort((a, b) => itemY(b) - itemY(a) || itemX(a) - itemX(b));
  const lines: { y: number; h: number; items: PdfTextItem[] }[] = [];
  for (const it of sorted) {
    const y = itemY(it);
    const line = lines.find((l) => Math.abs(l.y - y) <= Math.max(2, Math.min(l.h, itemH(it)) * 0.5));
    if (line) line.items.push(it);
    else lines.push({ y, h: itemH(it), items: [it] });
  }
  lines.sort((a, b) => b.y - a.y);
  return lines
    .map((l) => {
      const parts = [...l.items].sort((a, b) => itemX(a) - itemX(b));
      let out = '';
      let prevEnd: number | null = null;
      for (const it of parts) {
        const x = itemX(it);
        if (out && prevEnd !== null && !/\s$/.test(out) && !/^\s/.test(it.str)) {
          // A visible gap between two pieces means a space.
          if (x - prevEnd > itemH(it) * 0.15) out += ' ';
        }
        out += it.str;
        prevEnd = it.width !== undefined ? x + it.width : null;
      }
      return out.replace(/\s+/g, ' ').trim();
    })
    .filter((l) => l.length > 0);
}

/** Join lines into reading text: fix "ver-\nhaal", collapse spaces, drop page numbers. */
export function cleanLines(lines: string[]): string {
  const story = lines.filter((l) => !isBoilerplateLine(l) && !/^\s*\d{1,3}\s*$/.test(l));
  let text = story.join('\n');
  text = text.replace(/(\p{L})[-­]\s*\n\s*(\p{Ll})/gu, '$1$2');
  text = text.replace(/­/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  // Page numbers glued to the start or end of the text.
  text = text.replace(/^\d{1,3}\s+(?=\p{L})/u, '').replace(/(?<=[\p{L}.!?"'”’)])\s+\d{1,3}$/u, '');
  if (/^[\d\s.,]*$/.test(text)) return '';
  return text;
}

/** Clean reading text of one page ('' when the page has only credits or numbers). */
export function pageText(items: PdfTextItem[]): string {
  return cleanLines(pageLines(items));
}

const TITLE_NOISE = /\b(storyweaver|book ?dash|african ?storybook|dutch|nederlands|nl|pdf|final|print|web|v\d+)\b/gi;

function tidyTitle(s: string): string {
  const t = s.replace(/\s+/g, ' ').replace(/^[\s\-–:.,]+|[\s\-–:.,]+$/g, '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/** Title from the file name, e.g. "de-verloren-kat_StoryWeaver-12345.pdf" → "De verloren kat". */
export function titleFromFileName(fileName: string): string {
  let s = fileName.replace(/^.*[\\/]/, '').replace(/\.pdf$/i, '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep as is */
  }
  s = s.replace(/[_+\-]+/g, ' ').replace(TITLE_NOISE, ' ').replace(/\b\d{3,}\b/g, ' ').replace(/\(\s*\d*\s*\)/g, ' ');
  return tidyTitle(s);
}

/**
 * Guess a title: a short first line on the first page (covers usually start with the title),
 * otherwise the file name, otherwise a friendly default.
 */
export function guessTitle(fileName: string, firstPageLines: string[] | string = []): string {
  const lines = typeof firstPageLines === 'string' ? [firstPageLines] : firstPageLines;
  const first = lines.map((l) => l.trim()).find((l) => l && !isBoilerplateLine(l) && !/^\d+$/.test(l));
  if (first && first.length <= 60 && first.split(' ').length <= 10) {
    const t = tidyTitle(first.replace(/[.!?]+$/, ''));
    if (t) return t;
  }
  return titleFromFileName(fileName) || 'Mijn PDF-boek';
}
