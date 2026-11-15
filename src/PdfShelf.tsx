// Parent tools for PDF picture books: add a downloaded PDF (or fetch one by link)
// and remove it again. The books themselves live in IndexedDB (src/pdfBooks.ts).
import { useRef, useState, type ChangeEvent } from 'react';
import { BookIcon, CheckIcon } from './Icons';
import { importPdf, importPdfFromUrl, MAX_PDF_BYTES, PdfImportError, removePdfBook, type PdfErrorCode } from './pdfBooks';
import { READING_LEVELS, type Book, type ReadingLevelId } from './readingData';
import type { Bi } from './core';
import './pdf.css';

const ERRORS: Record<PdfErrorCode, Bi> = {
  cors: {
    nl: 'Deze website staat downloaden vanuit de app niet toe. Download de PDF zelf en voeg hem hier toe.',
    en: "This website doesn't allow the app to download it. Download the PDF yourself and add it here.",
  },
  network: {
    nl: 'Het ophalen lukt nu niet. Is er internet? Je kunt de PDF ook zelf downloaden en hier toevoegen.',
    en: "Couldn't fetch it right now. Is there an internet connection? You can also download the PDF yourself and add it here.",
  },
  'not-pdf': {
    nl: 'Dit lijkt geen PDF-bestand. Kies een bestand dat eindigt op .pdf.',
    en: "This doesn't look like a PDF file. Choose a file ending in .pdf.",
  },
  'too-big': {
    nl: `Dit bestand is te groot (meer dan ${MAX_PDF_BYTES / 1024 / 1024} MB). Kies een kleinere PDF.`,
    en: `This file is too big (over ${MAX_PDF_BYTES / 1024 / 1024} MB). Choose a smaller PDF.`,
  },
  password: {
    nl: 'Deze PDF is beveiligd met een wachtwoord. Kies een PDF zonder wachtwoord.',
    en: 'This PDF is password-protected. Choose one without a password.',
  },
  failed: {
    nl: 'Het toevoegen lukte niet. Probeer het nog eens.',
    en: "Adding the book didn't work. Please try again.",
  },
};

const SOURCES: { name: string; url: string; licence: string; note: Bi }[] = [
  {
    name: 'StoryWeaver',
    url: 'https://storyweaver.org.in/en/stories?language=Dutch',
    licence: 'CC BY 4.0',
    note: { nl: 'Gratis account nodig om PDF’s te downloaden.', en: 'Free account needed to download PDFs.' },
  },
  {
    name: 'Book Dash',
    url: 'https://bookdash.org/books/',
    licence: 'CC BY 4.0',
    note: { nl: 'Prentenboeken om gratis te downloaden.', en: 'Picture books to download for free.' },
  },
  {
    name: 'African Storybook',
    url: 'https://www.africanstorybook.org/',
    licence: 'CC BY',
    note: { nl: 'Korte verhalen in veel talen.', en: 'Short stories in many languages.' },
  },
];

function Txt({ bi, english, className }: { bi: Bi; english: boolean; className?: string }) {
  return (
    <p className={className}>
      {bi.nl}
      {english && (
        <>
          <br />
          <span className="en">{bi.en}</span>
        </>
      )}
    </p>
  );
}

type Status = { kind: 'idle' } | { kind: 'busy'; done: number; total: number } | { kind: 'error'; code: PdfErrorCode } | { kind: 'added'; title: string };

export function PdfImport({
  english,
  defaultLevel,
  onAdded,
}: {
  english: boolean;
  defaultLevel: ReadingLevelId;
  onAdded: (book: Book) => void;
}) {
  const [level, setLevel] = useState<ReadingLevelId>(defaultLevel);
  const [link, setLink] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = status.kind === 'busy';

  const progress = (done: number, total: number) => setStatus({ kind: 'busy', done, total });

  const run = async (job: () => Promise<Book>) => {
    setStatus({ kind: 'busy', done: 0, total: 0 });
    try {
      const book = await job();
      setStatus({ kind: 'added', title: book.title.nl });
      onAdded(book);
    } catch (e) {
      setStatus({ kind: 'error', code: e instanceof PdfImportError ? e.code : 'failed' });
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) return setStatus({ kind: 'error', code: 'too-big' });
    if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return setStatus({ kind: 'error', code: 'not-pdf' });
    void run(() => importPdf(file, file.name, { level }, progress));
  };

  const onFetch = () => {
    if (!link.trim()) return;
    void run(() => importPdfFromUrl(link, { level }, progress));
  };

  const levelChips = (kind: 'groep' | 'erk') =>
    READING_LEVELS.filter((l) => l.kind === kind).map((l) => (
      <button
        key={l.id}
        type="button"
        className={`chip ${l.id === level ? 'is-on' : ''}`}
        aria-pressed={l.id === level}
        disabled={busy}
        onClick={() => setLevel(l.id)}
      >
        {l.name.nl}
        {english && <small>{l.name.en}</small>}
      </button>
    ));

  return (
    <section className="card pdf-import">
      <h2 className="t-title">
        <BookIcon /> Eigen PDF-boek · Your own PDF book
      </h2>
      <Txt
        english={english}
        className="muted"
        bi={{
          nl: 'Download een gratis prentenboek als PDF en voeg het hier toe. Het boek blijft op dit apparaat.',
          en: 'Download a free picture book as a PDF and add it here. The book stays on this device.',
        }}
      />

      <p className="t-label">Niveau · Level</p>
      <div className="chips">{levelChips('groep')}</div>
      <div className="chips">{levelChips('erk')}</div>

      <div className="pdf-actions">
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="pdf-file" onChange={onFile} disabled={busy} />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          PDF toevoegen · Add a PDF
        </button>
      </div>

      <label className="t-label" htmlFor="pdf-link">
        Of plak een link naar een PDF · Or paste a link to a PDF
      </label>
      <div className="pdf-link-row">
        <input
          id="pdf-link"
          className="text-input"
          type="url"
          inputMode="url"
          placeholder="https://…/boek.pdf"
          value={link}
          disabled={busy}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onFetch()}
        />
        <button type="button" className="btn btn-secondary" disabled={busy || !link.trim()} onClick={onFetch}>
          Ophalen · Fetch
        </button>
      </div>

      {status.kind === 'busy' && (
        <div className="pdf-progress" role="status">
          <p className="t-label">
            {status.total
              ? `Bladzijde ${status.done} van ${status.total} · Page ${status.done} of ${status.total}`
              : 'Boek openen… · Opening the book…'}
          </p>
          <div className="pdf-bar" role="progressbar" aria-valuemin={0} aria-valuemax={status.total || 1} aria-valuenow={status.done}>
            <div className="pdf-bar-fill" style={{ width: `${status.total ? (status.done / status.total) * 100 : 4}%` }} />
          </div>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="warn" role="alert">
          <Txt english={english} bi={ERRORS[status.code]} />
        </div>
      )}
      {status.kind === 'added' && (
        <p className="pdf-added" role="status">
          <CheckIcon /> “{status.title}” staat in de boekenkast · is on the bookshelf
        </p>
      )}

      <h3 className="t-label">Gratis boeken · Free books</h3>
      <ul className="pdf-sources">
        {SOURCES.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name}
            </a>{' '}
            <span className="muted">({s.licence})</span>
            <Txt english={english} className="muted" bi={s.note} />
          </li>
        ))}
      </ul>
      <Txt
        english={english}
        className="muted"
        bi={{
          nl: 'Deze boeken mag je gratis gebruiken als je de makers noemt. Laat de namen en de licentie in het boek staan; meestal staan ze op de laatste bladzijden, en die blijven in het boek.',
          en: 'You may use these books for free as long as you credit the makers. Keep the names and the licence in the book; they are usually on the last pages, which stay in the book.',
        }}
      />
    </section>
  );
}

export function PdfBookTools({ book, onRemoved }: { book: Book; onRemoved: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!book.pdf) return null;
  const added = new Date(book.pdf.addedAt);

  const remove = async () => {
    setBusy(true);
    await removePdfBook(book.id);
    onRemoved(book.id);
  };

  return (
    <div className="pdf-tools">
      <p className="muted">
        PDF: {book.pdf.fileName}
        {!Number.isNaN(added.getTime()) && ` · ${added.toLocaleDateString('nl-NL')}`}
        {book.pdf.sourceUrl && (
          <>
            {' · '}
            <a href={book.pdf.sourceUrl} target="_blank" rel="noopener noreferrer">
              Bron · Source
            </a>
          </>
        )}
      </p>
      {book.pdf.note && <p className="warn">{book.pdf.note}</p>}
      {confirm ? (
        <div className="btn-pair">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={remove}>
            Ja, verwijderen · Yes, remove
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirm(false)}>
            Nee · No
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => setConfirm(true)}>
          Boek verwijderen · Remove book
        </button>
      )}
    </div>
  );
}
