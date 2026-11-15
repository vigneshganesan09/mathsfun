import { describe, expect, it } from 'vitest';
import { cleanLines, guessTitle, isBoilerplateLine, pageLines, pageText, titleFromFileName, type PdfTextItem } from './pdfText';

const item = (str: string, x: number, y: number, width = str.length * 6, height = 12): PdfTextItem => ({
  str,
  transform: [height, 0, 0, height, x, y],
  width,
  height,
});

describe('pageLines', () => {
  it('orders items top to bottom, then left to right', () => {
    const items = [item('wereld.', 60, 500), item('Hallo', 10, 500, 30), item('Tweede regel', 10, 480)];
    expect(pageLines(items)).toEqual(['Hallo wereld.', 'Tweede regel']);
  });

  it('keeps pieces of one word together when there is no gap', () => {
    expect(pageLines([item('kat', 16, 100, 18), item('De', 0, 100, 16)])).toEqual(['Dekat']);
    expect(pageLines([item(' kat', 16, 100), item('De', 0, 100, 16)])).toEqual(['De kat']);
  });

  it('treats slightly different baselines as one line', () => {
    expect(pageLines([item('Een', 0, 200.5, 20), item('hond', 30, 199.8)])).toEqual(['Een hond']);
  });

  it('ignores empty items', () => {
    expect(pageLines([item('', 0, 10), item('  ', 0, 30)])).toEqual([]);
  });
});

describe('pageText', () => {
  it('fixes hyphenated line breaks', () => {
    expect(pageText([item('Dit is een ver-', 0, 300), item('haal over Mo.', 0, 285)])).toBe('Dit is een verhaal over Mo.');
  });

  it('keeps a hyphen before a capital (e.g. names)', () => {
    expect(cleanLines(['Noord-', 'Holland is mooi.'])).toBe('Noord- Holland is mooi.');
  });

  it('collapses spaces', () => {
    expect(cleanLines(['De   kat', '   slaapt  .'])).toBe('De kat slaapt .');
  });

  it('drops page numbers', () => {
    expect(pageText([item('Sami rent naar huis.', 0, 300), item('7', 200, 20)])).toBe('Sami rent naar huis.');
    expect(cleanLines(['12 Sami rent.'])).toBe('Sami rent.');
    expect(cleanLines(['Sami rent. 12'])).toBe('Sami rent.');
    expect(cleanLines(['3'])).toBe('');
  });

  it('drops credits and licence lines', () => {
    const lines = [
      'De maan lacht.',
      'Dit verhaal komt van StoryWeaver.',
      'Licentie: CC BY 4.0',
      'This book was made possible by Pratham Books.',
      '© Book Dash 2019',
      'https://www.africanstorybook.org',
      'Illustraties: Anna',
    ];
    expect(cleanLines(lines)).toBe('De maan lacht.');
  });

  it('returns an empty string for a credits-only page', () => {
    expect(cleanLines(['Creative Commons Attribution 4.0', 'www.storyweaver.org.in', '24'])).toBe('');
  });
});

describe('isBoilerplateLine', () => {
  it('does not flag normal story sentences', () => {
    expect(isBoilerplateLine('Oma vertelt een verhaal.')).toBe(false);
    expect(isBoilerplateLine('Het boek valt op de grond.')).toBe(false);
  });
});

describe('titles', () => {
  it('cleans file names', () => {
    expect(titleFromFileName('de-verloren-kat_StoryWeaver-123456.pdf')).toBe('De verloren kat');
    expect(titleFromFileName('C:\\Downloads\\Waar_is_Mo%3F (1).pdf')).toBe('Waar is Mo?');
    expect(titleFromFileName('12345.pdf')).toBe('');
  });

  it('prefers a short first line on the cover', () => {
    expect(guessTitle('x.pdf', ['De rode vlieger', 'Auteur: Sam'])).toBe('De rode vlieger');
    expect(guessTitle('de-rode-vlieger.pdf', ['www.storyweaver.org.in'])).toBe('De rode vlieger');
    expect(guessTitle('de-rode-vlieger.pdf', 'Dit is een hele lange zin die zeker geen titel is maar gewoon tekst op de eerste bladzijde.')).toBe('De rode vlieger');
    expect(guessTitle('1234.pdf', [])).toBe('Mijn PDF-boek');
  });
});
