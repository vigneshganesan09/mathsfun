import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanText, combineBook, parseBook, parseIndex } from './onlineBooks';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('online books (Global African Storybook Project)', () => {
  it('lists the Dutch stories with level and cover', () => {
    const list = parseIndex(fixture('asp-nl-index.html'));
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(list[0]).toMatchObject({ id: '0087', title: 'Ik hou van lezen!', level: 1 });
    expect(list.every((b) => /^\d{4}$/.test(b.id) && b.level >= 1 && b.level <= 5 && b.cover.startsWith('https://'))).toBe(true);
  });

  it('reads a story: title, credits, licence and pages', () => {
    const nl = parseBook(fixture('asp-nl-0001.html'));
    expect(nl.title).toBe('Een hele lange man');
    expect(nl.level).toBe(2);
    expect(nl.credits).toEqual({ author: 'Cornelius Gulere', illustrator: 'Catherine Groenewald', translator: 'Esther Beugeling-Ford' });
    expect(nl.licence?.url).toContain('creativecommons.org/licenses/by/3.0');
    expect(nl.pages[0]).toEqual({ no: '02', image: 'https://raw.githubusercontent.com/global-asp/gsn-imagebank/master/0001/02.jpg', text: 'Zijn schoffel was te kort.' });
    // The second language on the page (Swahili) must not leak in.
    expect(nl.pages.some((p) => /Jembe/.test(p.text))).toBe(false);
  });

  it('pairs Dutch pages with the English translation', () => {
    const book = combineBook('0001', parseBook(fixture('asp-nl-0001.html')), parseBook(fixture('asp-en-0001.html')));
    expect(book.id).toBe('asp-0001');
    expect(book.level).toBe('g4');
    expect(book.title).toEqual({ nl: 'Een hele lange man', en: 'A very tall man' });
    expect(book.pages[0]).toMatchObject({ nl: 'Zijn schoffel was te kort.', en: 'His hoe was too short.' });
    expect(book.online?.sourceUrl).toContain('africanstorybook.org');
  });

  it('cleans up markup', () => {
    expect(cleanText('  <b>Hoi</b>&nbsp;daar &amp; &#39;jij&#39;  ')).toBe("Hoi daar & 'jij'");
  });
});
