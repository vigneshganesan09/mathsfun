// PDF picture books that ship inside the app (public/pdfs, made by scripts/makePdfs.ts from the
// free Global Storybooks books). The first time a child opens one, the app reads the PDF with
// pdf.js and saves the pages on this device, so later it opens straight away, also offline.
import manifest from './bundledPdfs.json';
import type { Book, OnlineSource, ReadingLevelId, ShelfId } from './readingData';

export interface BundledPdf {
  id: string;
  file: string;
  level: ReadingLevelId;
  avi?: string;
  colour?: string;
  shelf?: ShelfId;
  title: { nl: string; en: string };
  coverImage?: string;
  online: OnlineSource;
  en: string[];
  creditsPage: number;
}

const base = () => (import.meta.env?.BASE_URL ?? '/') as string;

export const BUNDLED_PDFS: BundledPdf[] = (manifest as unknown as BundledPdf[]).map((m) => ({
  ...m,
  file: `${base()}${m.file}`,
  coverImage: m.coverImage ? `${base()}${m.coverImage}` : undefined,
}));

export const bundledPdf = (id: string) => BUNDLED_PDFS.find((p) => p.id === id);

/** Add what the PDF itself can't hold: English per page, credits, level and shelf. */
export function decoratePdfBook(book: Book): Book {
  const m = bundledPdf(book.id);
  if (!m) return book;
  return {
    ...book,
    title: m.title,
    level: m.level,
    avi: m.avi,
    colour: m.colour,
    shelf: m.shelf,
    online: m.online,
    pdf: { ...book.pdf!, sourceUrl: m.online.readerUrl },
    pages: book.pages.map((p, i) => ({ ...p, nl: i === m.creditsPage ? '' : p.nl, en: i === m.creditsPage ? '' : (m.en[i] ?? '') })),
  };
}

/** Open a bundled PDF: from this device if it was opened before, otherwise load and save it. */
export async function openBundledPdf(m: BundledPdf, onProgress?: (done: number, total: number) => void): Promise<Book> {
  const { importPdf, loadPdfBook } = await import('./pdfBooks');
  const stored = await loadPdfBook(m.id);
  if (stored) return decoratePdfBook(stored);
  const res = await fetch(m.file);
  if (!res.ok) throw new Error(`${res.status}`);
  const blob = await res.blob();
  const book = await importPdf(blob, m.file.split('/').pop() ?? 'boek.pdf', { level: m.level, id: m.id, title: m.title.nl, sourceUrl: m.online.readerUrl }, onProgress);
  return decoratePdfBook(book);
}
