import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUNDLED_PDFS, decoratePdfBook } from './bundledPdfs';

const local = (url: string) => `public/${url.replace(/^\//, '')}`;

describe('PDF books inside the app', () => {
  it('every listed PDF file ships with the app and is a PDF', () => {
    expect(BUNDLED_PDFS.length).toBeGreaterThanOrEqual(20);
    for (const m of BUNDLED_PDFS) {
      expect(existsSync(local(m.file)), m.file).toBe(true);
      expect(readFileSync(local(m.file)).subarray(0, 5).toString()).toBe('%PDF-');
    }
  });

  it('keeps credits and an English line per page', () => {
    for (const m of BUNDLED_PDFS) {
      expect(m.online.licence).toMatch(/Creative Commons/);
      expect(m.creditsPage).toBe(m.en.length - 1);
      expect(m.en[0]).toBe(m.title.en);
    }
    expect(new Set(BUNDLED_PDFS.map((m) => m.id)).size).toBe(BUNDLED_PDFS.length);
  });

  it('never scores the credits page', () => {
    const m = BUNDLED_PDFS[0];
    const pages = m.en.map((_, i) => ({ nl: `bladzijde ${i}`, en: '' }));
    const book = decoratePdfBook({ id: m.id, level: 'g3', title: { nl: '', en: '' }, cover: {}, pdf: { fileName: 'x.pdf', addedAt: '' }, pages });
    expect(book.pages[m.creditsPage].nl).toBe('');
    expect(book.pages[1].en).toBe(m.en[1]);
    expect(book.online?.author).toBe(m.online.author);
  });
});
