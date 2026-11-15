import { useEffect, useMemo, useRef, useState } from 'react';
import { BackIcon, BookIcon, CheckIcon, MicIcon, NextIcon, RetryIcon, SpeakerIcon, StarIcon } from './Icons';
import { canListen, LISTEN_ERROR_TEXT, useListener, type ListenError } from './listen';
import { Character, ItemPic, SceneView } from './pictures';
import { Bolle, BolleSays, Land, StoryPicture } from './Art';
import { loadPdfBooks } from './pdfBooks';
import { BUNDLED_PDFS, bundledPdf, decoratePdfBook, openBundledPdf, type BundledPdf } from './bundledPdfs';
import { PdfBookTools, PdfImport } from './PdfShelf';
import './library.css';
import { downloadOnlineBook, fetchOnlineIndex, ONLINE_HOME, ONLINE_LEVEL, type OnlineListing } from './onlineBooks';
import { BOOKS, levelForGroep, migrateLevel, READING_LEVELS, SHELVES, shelfOf, type Book, type ReadingLevelId } from './readingData';
import { cleanWord, normalizeWord, saidWord, scoreTokens, splitSyllables, tokenize, type Token } from './readingScore';
import { chime, speakText, stopSpeaking } from './speech';
import {
  addMissedWords,
  getBookBest,
  loadDownloadedBooks,
  loadReadingLevel,
  removeDownloadedBook,
  saveDownloadedBook,
  loadWordBank,
  removePractisedWord,
  saveBookScore,
  saveReadingLevel,
  type Settings,
} from './storage';
import { BiText, TopBar } from './ui';

type WordToPractise = { word: string; sentence: string };

const listensItself = (s: Settings) => s.listen === 'auto' && canListen;

function starsFor(pct: number): number {
  return pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
}

function Stars({ count, big = false }: { count: number; big?: boolean }) {
  return (
    <span className={big ? 'big-stars' : 'mini-stars'} aria-label={`${count} van 3 sterren`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? (big ? 'star-sun star-pop' : 'star-sun') : big ? 'star-dim star-off' : 'star-dim'} style={big ? { animationDelay: `${i * 200}ms` } : undefined}>
          <StarIcon filled={i < count} size={big ? 64 : 20} />
        </span>
      ))}
    </span>
  );
}

/** The picture for a page: a book illustration, our story art, or a drawn scene. */
function PagePicture({ book, pageNo }: { book: Book; pageNo: number }) {
  const page = book.pages[pageNo];
  if (page.image) return <img className="page-img" src={page.image} alt={`Illustratie bladzijde ${pageNo + 1}`} />;
  if (book.storyArt) return <StoryPicture art={book.storyArt} page={pageNo + 1} />;
  if (page.scene || page.cast || page.items) {
    return (
      <div className="page-scene">
        <Land theme={page.scene ?? 'polder'} />
        <div className="page-scene-cast">
          {page.cast?.map((c) => (
            <Character key={c} who={c} size={110} />
          ))}
          {!page.cast && <Bolle mood="read" size={110} />}
        </div>
        {page.items && (
          <div className="page-scene-items">
            <SceneView scene={{ item: page.items.item, groups: [page.items.count] }} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="page-scene">
      <Land theme="polder" />
      <div className="page-scene-cast">
        <Bolle mood="read" size={110} />
      </div>
    </div>
  );
}

/** Credits and licence for a downloaded book (CC BY requires attribution). */
export function OnlineCredits({ book }: { book: Book }) {
  if (book.retold) return <p className="credits">“{book.title.nl}” — {book.retold.nl}. Het oorspronkelijke verhaal is publiek domein. · {book.retold.en}; the original story is in the public domain.</p>;
  if (book.pdf && !book.online) return <p className="credits">PDF: {book.pdf.fileName}. De makers en licentie staan in het boek zelf. · The credits and licence are inside the book.</p>;
  const o = book.online;
  if (!o) return null;
  const who = [o.author && `Tekst · text: ${o.author}`, o.illustrator && `Tekeningen · pictures: ${o.illustrator}`, o.translator && `Vertaling · translation: ${o.translator}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <p className="credits">
      {who && <>{who}. </>}
      Bron · source:{' '}
      <a href={o.sourceUrl} target="_blank" rel="noreferrer">
        {o.sourceTitle || 'African Storybook'}
      </a>{' '}
      (African Storybook, via Global Storybooks).{' '}
      {o.licenceUrl ? (
        <a href={o.licenceUrl} target="_blank" rel="noreferrer">
          {o.licence}
        </a>
      ) : (
        o.licence
      )}
      .
    </p>
  );
}

const DEFAULT_COLOURS = ['#e8574f', '#ff7a1a', '#16825a', '#3bb8a0', '#4ea9e0', '#8a6fd1', '#c98d5c'];
export const bookColour = (b: Book) => b.colour ?? DEFAULT_COLOURS[[...b.id].reduce((n, c) => n + c.charCodeAt(0), 0) % DEFAULT_COLOURS.length];

function BookCover({ b }: { b: Book }) {
  if (b.coverImage) return <img src={b.coverImage} alt="" loading="lazy" />;
  if (b.storyArt) return <StoryPicture art={b.storyArt} page={0} />;
  const first = b.pages[0];
  return (
    <div className="page-scene">
      <Land theme={first?.scene ?? 'polder'} />
      <div className="page-scene-cast">
        {(b.cover.cast ?? first?.cast)?.map((c) => <Character key={c} who={c} size={84} />) ?? <Bolle mood="read" size={84} />}
        {b.cover.item && <ItemPic item={b.cover.item} size={48} />}
      </div>
    </div>
  );
}

const wordCount = (b: Book) => b.pages.reduce((n, p) => n + tokenize(p.nl).filter((t) => t.norm).length, 0);

// ---------- the bookshelf ----------

interface LibraryProps {
  settings: Settings;
  /** The child's groep id, to open the right shelf the first time. */
  groep: string;
  onBack: () => void;
  onOpen: (b: Book) => void;
  onPractice: (words: WordToPractise[]) => void;
}

type OnlineState = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; list: OnlineListing[] };

function BookCard({ b, en, onOpen }: { b: Book; en: boolean; onOpen: () => void }) {
  const best = getBookBest(b.id);
  const level = READING_LEVELS.find((l) => l.id === b.level);
  return (
    <button className="bookcard" style={{ '--bk': bookColour(b) } as React.CSSProperties} onClick={onOpen}>
      <span className="bookcard-cover">
        <BookCover b={b} />
        <span className="bookcard-lvl">{b.avi ?? level?.note.nl}</span>
        {b.pdf && <span className="bookcard-tag">PDF</span>}
      </span>
      <span className="bookcard-body">
        <span className="bookcard-name">{b.title.nl}</span>
        {en && b.title.en !== b.title.nl && <span className="en">{b.title.en}</span>}
        <span className="t-label muted">
          {b.pages.length} bladzijden · {wordCount(b)} woorden
        </span>
        {best !== undefined ? (
          <span className="bookcard-score">
            <Stars count={starsFor(best)} /> {best}%
          </span>
        ) : (
          <span className="t-label muted">Nog niet gelezen · Not read yet</span>
        )}
      </span>
    </button>
  );
}

export function Library({ settings, groep, onBack, onOpen, onPractice }: LibraryProps) {
  const [levelId, setLevelId] = useState<ReadingLevelId>(() => migrateLevel(loadReadingLevel()) ?? levelForGroep(groep));
  const [tab, setTab] = useState<'shelf' | 'online' | 'pdf'>('shelf');
  const [downloaded, setDownloaded] = useState<Book[]>(loadDownloadedBooks);
  const [pdfBooks, setPdfBooks] = useState<Book[]>([]);
  const [online, setOnline] = useState<OnlineState>({ status: 'idle' });
  const [busy, setBusy] = useState<Record<string, 'loading' | 'error'>>({});
  const [opening, setOpening] = useState<{ id: string; done: number; total: number; error?: boolean } | null>(null);
  const bank = useMemo(loadWordBank, []);
  const en = settings.english !== 'hidden';
  const pickLevel = (id: ReadingLevelId) => {
    setLevelId(id);
    saveReadingLevel(id);
  };

  useEffect(() => {
    let alive = true;
    loadPdfBooks()
      .then((list) => alive && setPdfBooks(list.map(decoratePdfBook)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const loadOnline = () => {
    setOnline({ status: 'loading' });
    fetchOnlineIndex()
      .then((list) => setOnline(list.length ? { status: 'ready', list } : { status: 'error' }))
      .catch(() => setOnline({ status: 'error' }));
  };

  useEffect(() => {
    if (tab === 'online' && online.status === 'idle') loadOnline();
  }, [tab, online.status]);

  const download = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: 'loading' }));
    try {
      const book = await downloadOnlineBook(id);
      saveDownloadedBook(book);
      // Warm the cache so the pictures also work offline.
      await Promise.allSettled(book.pages.map((p) => p.image && fetch(p.image, { mode: 'no-cors' })));
      setDownloaded(loadDownloadedBooks());
      setBusy(({ [id]: _, ...rest }) => rest);
    } catch {
      setBusy((b) => ({ ...b, [id]: 'error' }));
    }
  };

  const openPdf = async (m: BundledPdf) => {
    if (opening && !opening.error) return;
    setOpening({ id: m.id, done: 0, total: 0 });
    try {
      const book = await openBundledPdf(m, (done, total) => setOpening({ id: m.id, done, total }));
      setPdfBooks((list) => [...list.filter((b) => b.id !== book.id), book]);
      setOpening(null);
      onOpen(book);
    } catch {
      setOpening({ id: m.id, done: 0, total: 0, error: true });
    }
  };

  const remove = (id: string) => {
    removeDownloadedBook(id);
    setDownloaded(loadDownloadedBooks());
  };

  const chips = (kind: 'groep' | 'erk') =>
    READING_LEVELS.filter((l) => l.kind === kind).map((l) => {
      const n = all.filter((b) => b.level === l.id).length;
      return (
        <button key={l.id} className={`chip ${l.id === levelId ? 'is-on' : ''}`} aria-pressed={l.id === levelId} onClick={() => pickLevel(l.id)}>
          {l.name.nl}
          <small>
            {l.note.nl} · {n} {n === 1 ? 'boek' : 'boeken'}
          </small>
        </button>
      );
    });

  // Bundled books come first; a downloaded copy of the same story is not shown twice.
  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...BOOKS, ...downloaded, ...pdfBooks.filter((b) => !bundledPdf(b.id))].filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
  }, [downloaded, pdfBooks]);
  const shelf = all.filter((b) => b.level === levelId);
  const level = READING_LEVELS.find((l) => l.id === levelId)!;
  const onShelf = new Set(all.map((b) => b.id));

  return (
    <section className="screen library">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">De bibliotheek</h1>
            {en && <p className="en">The library · kies een boek en lees het voor / pick a book and read it aloud</p>}
          </>
        }
        right={<Bolle mood="read" size={76} />}
      />

      <div className="segmented" role="tablist" aria-label="Boeken">
        <button role="tab" aria-selected={tab === 'shelf'} className={tab === 'shelf' ? 'is-on' : ''} onClick={() => setTab('shelf')}>
          Boekenkast
          <small>Bookshelf</small>
        </button>
        <button role="tab" aria-selected={tab === 'online'} className={tab === 'online' ? 'is-on' : ''} onClick={() => setTab('online')}>
          Gratis online
          <small>Free online books</small>
        </button>
        <button role="tab" aria-selected={tab === 'pdf'} className={tab === 'pdf' ? 'is-on' : ''} onClick={() => setTab('pdf')}>
          PDF-boeken
          <small>PDF books</small>
        </button>
      </div>

      {tab === 'shelf' && (
        <>
          {bank.length > 0 && (
            <button className="tile word-bank" onClick={() => onPractice(bank)}>
              <span className="t-title">Mijn oefenwoorden</span>
              {en && <span className="en">My practice words</span>}
              <span className="t-label">
                {bank.length} {bank.length === 1 ? 'woord' : 'woorden'}: {bank.slice(0, 4).map((w) => w.word).join(', ')}
                {bank.length > 4 ? ' …' : ''}
              </span>
            </button>
          )}

          <div className="card">
            <h2 className="t-label">Groepen · school groups</h2>
            <div className="chips">{chips('groep')}</div>
            <h2 className="t-label">Nederlands leren (ERK) · learning Dutch (CEFR)</h2>
            <div className="chips">{chips('erk')}</div>
          </div>

          {levelId === 'g12' && (
            <BolleSays mood="read" size={84} text={{ nl: 'Deze boekjes lees ik voor. Tik op Lees mij voor!', en: 'I read these books to you. Tap Read to me!' }} />
          )}

          {SHELVES.map((sh) => {
            const books = shelf.filter((b) => shelfOf(b) === sh.id);
            if (!books.length) return null;
            return (
              <div key={sh.id} className="shelf-row">
                <div className="shelf-title">
                  <span className="shelf-ic">
                    <BookIcon size={26} />
                  </span>
                  <div>
                    <h2 className="t-title">{sh.name.nl}</h2>
                    {en && <span className="en">{sh.name.en}</span>}
                  </div>
                </div>
                <div className="bookshelf">
                  {books.map((b) => (
                    <BookCard key={b.id} b={b} en={en} onOpen={() => onOpen(b)} />
                  ))}
                </div>
              </div>
            );
          })}
          {shelf.length === 0 && (
            <p className="en">
              Nog geen boeken bij {level.name.nl}. Voeg een PDF-boek toe of kijk bij de gratis online boeken. · No books for {level.name.en} yet; add a PDF or try the free online books.
            </p>
          )}
          <p className="credits">
            Prentenboeken met eigen tekeningen uit{' '}
            <a href={ONLINE_HOME} target="_blank" rel="noreferrer">
              Global Storybooks
            </a>{' '}
            (oorspronkelijk African Storybook; open licenties CC BY / CC BY-NC, makers staan in elk boek). De fabels en sprookjes zijn opnieuw verteld en getekend voor Duddu Learn. · Picture
            books from Global Storybooks (originally African Storybook, open licences); fables and fairy tales retold for Duddu Learn.
          </p>
        </>
      )}

      {tab === 'online' && (
        <>
          <div className="card">
            <BiText
              bi={{
                nl: 'Gratis prentenboeken van African Storybook, in het Nederlands met Engelse vertaling. Boeken met een vinkje staan al in je boekenkast en werken ook zonder internet.',
                en: 'Free picture books from African Storybook, in Dutch with an English translation. Books with a tick are already on your shelf and work without internet too.',
              }}
              settings={settings}
              size="body"
            />
          </div>

          {online.status === 'loading' && <p className="t-label">Boeken ophalen… · Fetching books…</p>}
          {online.status === 'error' && (
            <div className="feedback feedback-soft">
              <span className="feedback-icon">
                <RetryIcon />
              </span>
              <div className="bi-lines">
                <BiText bi={{ nl: 'De online boeken lukken nu niet. Is er internet?', en: "Couldn't load the online books. Is there an internet connection?" }} settings={settings} size="body" />
                <button className="btn btn-secondary btn-small" onClick={loadOnline}>
                  Opnieuw · Try again
                </button>
              </div>
            </div>
          )}
          {online.status === 'ready' && (
            <div className="bookshelf">
              {online.list.map((l) => {
                const id = `asp-${l.id}`;
                const have = all.find((b) => b.id === id);
                const state = busy[l.id];
                const lvl = READING_LEVELS.find((r) => r.id === (have?.level ?? ONLINE_LEVEL[l.level]));
                return (
                  <div key={l.id} className="bookcard online-card">
                    <span className="bookcard-cover">
                      <img src={have?.coverImage ?? l.cover} alt="" loading="lazy" />
                      <span className="bookcard-lvl">{lvl?.name.nl}</span>
                    </span>
                    <span className="bookcard-body">
                      <span className="bookcard-name">{l.title}</span>
                      {have ? (
                        <>
                          <span className="t-label">
                            <CheckIcon size={18} /> In je boekenkast · On your shelf
                          </span>
                          <button className="btn btn-primary btn-small" onClick={() => onOpen(have)}>
                            <BookIcon /> Lezen
                          </button>
                          {downloaded.some((b) => b.id === id) && !BOOKS.some((b) => b.id === id) && (
                            <button className="btn btn-secondary btn-small" onClick={() => remove(id)}>
                              Verwijderen · Remove
                            </button>
                          )}
                        </>
                      ) : (
                        <button className="btn btn-secondary btn-small" onClick={() => download(l.id)} disabled={state === 'loading'}>
                          {state === 'loading' ? 'Bezig… · Loading…' : state === 'error' ? 'Opnieuw · Retry' : 'Downloaden · Download'}
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="credits">
            Bron · source:{' '}
            <a href={ONLINE_HOME} target="_blank" rel="noreferrer">
              Global Storybooks
            </a>{' '}
            /{' '}
            <a href="https://africanstorybook.org/" target="_blank" rel="noreferrer">
              African Storybook
            </a>
            , Creative Commons.
          </p>
          {!onShelf.size && null}
        </>
      )}

      {tab === 'pdf' && (
        <>
          <div className="shelf-title">
            <span className="shelf-ic">
              <BookIcon size={26} />
            </span>
            <div>
              <h2 className="t-title">PDF-boeken in de app</h2>
              {en && <span className="en">PDF books inside the app · tik om te lezen / tap to read</span>}
            </div>
          </div>
          <div className="bookshelf">
            {BUNDLED_PDFS.map((m) => {
              const saved = pdfBooks.some((b) => b.id === m.id);
              const lvl = READING_LEVELS.find((l) => l.id === m.level);
              const now = opening?.id === m.id ? opening : null;
              return (
                <div key={m.id} className="pdf-entry">
                  <button className="bookcard" style={{ '--bk': m.colour ?? '#ff7a1a' } as React.CSSProperties} onClick={() => openPdf(m)} disabled={!!opening && !opening.error && !now}>
                    <span className="bookcard-cover">
                      {m.coverImage && <img src={m.coverImage} alt="" loading="lazy" />}
                      <span className="bookcard-lvl">{lvl?.name.nl}</span>
                      <span className="bookcard-tag">PDF</span>
                    </span>
                    <span className="bookcard-body">
                      <span className="bookcard-name">{m.title.nl}</span>
                      {en && <span className="en">{m.title.en}</span>}
                      {now && !now.error ? (
                        <span className="t-label">
                          PDF openen… {now.total ? `${now.done}/${now.total}` : ''} · Opening…
                        </span>
                      ) : now?.error ? (
                        <span className="t-label">Dat lukte niet, tik nog eens. · That didn't work, tap again.</span>
                      ) : saved ? (
                        <span className="t-label">
                          <CheckIcon size={18} /> Opgeslagen · Saved on this device
                        </span>
                      ) : (
                        <span className="t-label muted">{m.en.length} bladzijden · tik om te openen</span>
                      )}
                    </span>
                  </button>
                  <a className="pdf-file-link t-label" href={m.file} download>
                    PDF-bestand bewaren · Save the PDF file
                  </a>
                </div>
              );
            })}
          </div>
          <p className="credits">
            Deze PDF's zijn gemaakt van gratis prentenboeken van African Storybook (via Global Storybooks), met open licenties (CC BY / CC BY-NC). De makers staan op de laatste
            bladzijde van elk boek. · Made from free African Storybook picture books; credits are on the last page.
          </p>

          <h2 className="t-title">Zelf een PDF toevoegen</h2>
          {en && <p className="en">Add your own PDF</p>}
          <PdfImport
            english={en}
            defaultLevel={levelId}
            onAdded={(b) => {
              setPdfBooks((p) => [...p.filter((x) => x.id !== b.id), b]);
              pickLevel(b.level);
            }}
          />
          {pdfBooks.some((b) => !bundledPdf(b.id)) && (
            <>
              <h2 className="t-title">Mijn PDF-boeken</h2>
              {en && <p className="en">My PDF books</p>}
              <div className="bookshelf">
                {pdfBooks.filter((b) => !bundledPdf(b.id)).map((b) => (
                  <div key={b.id} className="pdf-entry">
                    <BookCard b={b} en={en} onOpen={() => onOpen(b)} />
                    <PdfBookTools book={b} onRemoved={(id) => setPdfBooks((p) => p.filter((x) => x.id !== id))} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

// ---------- reading a book ----------

type Phase = 'read' | 'listening' | 'parent' | 'result' | 'practice' | 'done';

interface ReaderProps {
  book: Book;
  settings: Settings;
  onBack: () => void;
  /** Called once when the last page is done (for stats and stickers). */
  onFinished?: () => void;
}

function wrongWords(tokens: Token[], ok: boolean[], sentence: string): WordToPractise[] {
  return tokens.filter((t, i) => t.norm && !ok[i]).map((t) => ({ word: cleanWord(t.text), sentence }));
}

function uniqueWords(list: WordToPractise[]): WordToPractise[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    const k = normalizeWord(w.word);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function BookReader({ book, settings, onBack, onFinished }: ReaderProps) {
  const auto = listensItself(settings);
  const [pageNo, setPageNo] = useState(0);
  const [results, setResults] = useState<(boolean[] | null)[]>(() => book.pages.map(() => null));
  const [phase, setPhase] = useState<Phase>('read');
  const [marks, setMarks] = useState<boolean[]>([]);
  const [speakingAt, setSpeakingAt] = useState<number | null>(null);
  const [showEn, setShowEn] = useState(settings.english === 'always');
  const [listenError, setListenError] = useState<ListenError | null>(null);
  const [practice, setPractice] = useState<WordToPractise[]>([]);
  const [practiceReturn, setPracticeReturn] = useState<Phase>('result');
  const [newBest, setNewBest] = useState(false);
  const listener = useListener(true);
  // Reading time: counted while the child reads a page aloud (for words per minute).
  const readStart = useRef<number | null>(null);
  const readMs = useRef(0);
  const stopClock = () => {
    if (readStart.current !== null) readMs.current += Date.now() - readStart.current;
    readStart.current = null;
  };

  const page = book.pages[pageNo];
  const tokens = useMemo(() => tokenize(page.nl), [page]);
  /** PDF pages can be pictures or credits only: nothing to read aloud there. */
  const hasText = tokens.some((t) => t.norm);
  const goTo = (n: number) => {
    stopSpeaking();
    setSpeakingAt(null);
    setListenError(null);
    setPageNo(n);
    setPhase('read');
    setShowEn(settings.english === 'always');
  };
  const live = phase === 'listening' ? scoreTokens(tokens, listener.heard) : null;
  const lastPage = pageNo === book.pages.length - 1;

  useEffect(() => () => stopSpeaking(), []);

  // The child read every word: stop listening straight away.
  useEffect(() => {
    if (live && live.every(Boolean)) listener.stop();
  }, [live, listener]);

  // Listening ended: score the page (or explain why it didn't work).
  const seenEnd = useRef(listener.endedCount);
  useEffect(() => {
    if (listener.endedCount === seenEnd.current) return;
    seenEnd.current = listener.endedCount;
    if (phase !== 'listening') return;
    if (!listener.heard.primary) {
      setListenError(listener.error ?? 'no-speech');
      setPhase('read');
      return;
    }
    stopClock();
    setMarks(scoreTokens(tokens, listener.heard));
    setPhase('result');
  }, [listener.endedCount, listener.heard, listener.error, phase, tokens]);

  const startReading = () => {
    readStart.current = Date.now();
    stopSpeaking();
    setSpeakingAt(null);
    setListenError(null);
    if (auto) {
      listener.start();
      setPhase('listening');
    } else {
      setMarks(tokens.map(() => true));
      setPhase('parent');
    }
  };

  const parentInstead = () => {
    setListenError(null);
    setMarks(tokens.map(() => true));
    setPhase('parent');
  };

  const readToMe = () => {
    setSpeakingAt(0);
    speakText(page.nl, 'nl', {
      onWord: (ci) => setSpeakingAt(ci),
      onEnd: () => setSpeakingAt(null),
    });
  };

  const tokenAt = (ci: number | null) => {
    if (ci === null) return -1;
    let k = -1;
    tokens.forEach((t, i) => {
      if (t.start <= ci) k = i;
    });
    return k;
  };
  const speakingIndex = tokenAt(speakingAt);

  /** Save this page's marks and its hard words. Returns all page results. */
  const commitPage = () => {
    if (results[pageNo] === marks) return results; // already saved (e.g. after practising)
    const next = [...results];
    next[pageNo] = marks;
    setResults(next);
    addMissedWords(wrongWords(tokens, marks, page.nl));
    return next;
  };

  const goNext = () => {
    const all = hasText ? commitPage() : results;
    if (lastPage) {
      const { pct } = totals(all);
      setNewBest(saveBookScore(book.id, pct));
      onFinished?.();
      setPhase('done');
    } else {
      goTo(pageNo + 1);
    }
  };

  const totals = (all: (boolean[] | null)[]) => {
    let words = 0;
    let right = 0;
    const wrong: WordToPractise[] = [];
    all.forEach((ok, p) => {
      if (!ok) return;
      const toks = tokenize(book.pages[p].nl);
      toks.forEach((t, i) => {
        if (!t.norm) return;
        words++;
        if (ok[i]) right++;
      });
      wrong.push(...wrongWords(toks, ok, book.pages[p].nl));
    });
    return { words, right, pct: words ? Math.round((right / words) * 100) : 0, wrong: uniqueWords(wrong) };
  };

  const onWordTap = (i: number) => {
    const t = tokens[i];
    if (!t.norm) return;
    if (phase === 'parent' || phase === 'result') {
      setMarks((m) => m.map((v, k) => (k === i ? !v : v)));
    } else if (phase === 'read') {
      speakText(cleanWord(t.text), 'nl', { slower: 0.8 });
    }
  };

  // ----- practice inside the book -----
  if (phase === 'practice') {
    return <WordPractice words={practice} settings={settings} onDone={() => setPhase(practiceReturn)} title={book.title.nl} />;
  }

  // ----- end of the book -----
  if (phase === 'done') {
    const t = totals(results);
    const secs = Math.round(readMs.current / 1000);
    const wpm = secs ? Math.round(t.right / (secs / 60)) : 0;
    const stars = starsFor(t.pct);
    const colour = bookColour(book);
    return (
      <section className="screen read-result" style={{ '--bk': colour } as React.CSSProperties}>
        <TopBar
          onBack={onBack}
          title={
            <>
              <p className="t-label muted">Leesresultaat · Reading result</p>
              <h1 className="t-title">{book.title.nl}</h1>
            </>
          }
        />
        <div className="res-top">
          <Bolle mood={stars ? 'cheer' : 'happy'} size={120} />
          <div>
            <Stars count={stars} big />
            <h2 className="t-display">{t.pct >= 90 ? 'Super gelezen!' : t.pct >= 75 ? 'Goed gelezen!' : t.pct >= 50 ? 'Knap gedaan!' : 'Goed geoefend!'}</h2>
            {newBest && <p className="chip-sun">Nieuw record! · New best!</p>}
          </div>
        </div>
        <div className="read-stats">
          <div className="read-stat">
            <b>{t.pct}%</b>
            <span>
              goed gelezen
              <span className="muted">
                {t.right} van {t.words} woorden · words right
              </span>
            </span>
          </div>
          <div className="read-stat">
            <b>{wpm || '–'}</b>
            <span>
              woorden per minuut<span className="muted">words per minute</span>
            </span>
          </div>
          <div className="read-stat">
            <b>
              {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
            </b>
            <span>
              leestijd<span className="muted">reading time</span>
            </span>
          </div>
          <div className="read-stat is-soft">
            <b>{t.words - t.right}</b>
            <span>
              nog oefenen<span className="muted">to practise</span>
            </span>
          </div>
        </div>
        <div className="card read-all">
          {book.pages.map((pg, p) => {
            const ok = results[p];
            const toks = tokenize(pg.nl);
            if (!toks.some((x) => x.norm)) return null;
            return (
              <p key={p} className="read-line" lang="nl">
                {toks.map((x, i) => (
                  <span key={i}>
                    <span className={!x.norm ? '' : !ok ? 'rw is-pend' : ok[i] ? 'rw is-right' : 'rw is-wrong'}>{x.text.trim()}</span>{' '}
                  </span>
                ))}
              </p>
            );
          })}
          <p className="t-label muted">
            <span className="rw is-right">goed</span> <span className="rw is-wrong">oefenen</span> <span className="rw is-pend">niet gelezen</span> · right / practise / not read
          </p>
        </div>
        {t.wrong.length > 0 && (
          <>
            <h2 className="t-title">Oefenwoorden · Words to practise</h2>
            <div className="word-chips">
              {t.wrong.map((w) => (
                <button key={w.word} className="word-chip" onClick={() => speakText(w.word, 'nl', { slower: 0.8 })}>
                  <SpeakerIcon size={16} /> {w.word}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="finish-actions">
          {t.wrong.length > 0 && (
            <button
              className="btn btn-primary btn-wide"
              onClick={() => {
                setPractice(t.wrong);
                setPracticeReturn('done');
                setPhase('practice');
              }}
            >
              Oefen de woorden <NextIcon size={28} />
            </button>
          )}
          <div className="btn-pair">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setResults(book.pages.map(() => null));
                readMs.current = 0;
                goTo(0);
              }}
            >
              <RetryIcon /> Nog een keer lezen
            </button>
            <button className="btn btn-secondary" onClick={onBack}>
              Bibliotheek · Library
            </button>
          </div>
        </div>
        <OnlineCredits book={book} />
      </section>
    );
  }

  // ----- a page -----
  const scoredCount = tokens.filter((t) => t.norm).length;
  const rightCount = tokens.filter((t, i) => t.norm && marks[i]).length;
  const pageWrong = phase === 'result' ? uniqueWords(wrongWords(tokens, marks, page.nl)) : [];
  const big = book.level === 'g3' || book.level === 'g4';

  const wordClass = (i: number) => {
    const t = tokens[i];
    if (!t.norm) return 'w';
    const c = ['w'];
    if (i === speakingIndex) c.push('is-speaking');
    if (live?.[i]) c.push('is-heard');
    if ((phase === 'result' || phase === 'parent') && !marks[i]) c.push('is-wrong');
    if (phase === 'result' && marks[i]) c.push('is-right');
    return c.join(' ');
  };

  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">{book.title.nl}</h1>
            <p className="t-label muted">
              Bladzijde {pageNo + 1} van {book.pages.length} · page {pageNo + 1} of {book.pages.length}
            </p>
          </>
        }
      />

      <div className={`spread ${book.pdf ? 'is-pdf' : ''}`} style={{ '--bk': bookColour(book) } as React.CSSProperties}>
        <div className="spread-pic">
          <PagePicture book={book} pageNo={pageNo} />
        </div>
        <div className="spread-text">
          {hasText ? (
            <p className={`page-text ${big ? 'is-big' : ''}`} lang="nl">
              {tokens.map((t, i) => (
                <button key={i} className={wordClass(i)} onClick={() => onWordTap(i)} tabIndex={t.norm ? 0 : -1}>
                  {t.text}
                </button>
              ))}
            </p>
          ) : (
            <p className="t-label muted">Kijk naar het plaatje. · Look at the picture.</p>
          )}
          {settings.english !== 'hidden' &&
            page.en &&
            (showEn ? (
              <p className="en" lang="en">
                {page.en}
              </p>
            ) : (
              <button className="en-toggle" onClick={() => setShowEn(true)}>
                EN
              </button>
            ))}
          {lastPage && <OnlineCredits book={book} />}
        </div>
        <button className="turn turn-prev" disabled={pageNo === 0 || phase !== 'read'} onClick={() => goTo(pageNo - 1)} aria-label="Vorige bladzijde · Previous page">
          <BackIcon />
        </button>
        <button className="turn turn-next" disabled={lastPage || phase !== 'read'} onClick={() => goTo(pageNo + 1)} aria-label="Volgende bladzijde · Next page">
          <NextIcon />
        </button>
      </div>

      {listenError && (
        <div className="feedback feedback-soft">
          <span className="feedback-icon">
            <MicIcon />
          </span>
          <div className="bi-lines">
            <BiText bi={LISTEN_ERROR_TEXT[listenError]} settings={settings} size="body" />
            <button className="btn btn-secondary btn-small" onClick={parentInstead}>
              Ouder luistert mee · Parent listens
            </button>
          </div>
        </div>
      )}

      {phase === 'read' && !hasText && (
        <div className="read-actions">
          <button className="btn btn-primary" onClick={goNext}>
            {lastPage ? 'Boek uit!' : 'Volgende'} <NextIcon size={28} />
          </button>
        </div>
      )}

      {phase === 'read' && hasText && (
        <div className="read-actions">
          {settings.voice && (
            <button className={`btn ${book.level === 'g12' ? 'btn-primary' : 'btn-accent'}`} onClick={readToMe}>
              <SpeakerIcon /> {book.level === 'g12' ? 'Lees mij voor · Read to me' : 'Luister eerst · Listen first'}
            </button>
          )}
          <button className="btn btn-primary" onClick={startReading}>
            <MicIcon size={28} /> Ik lees!
          </button>
        </div>
      )}

      {phase === 'listening' && (
        <div className="listening">
          <span className="mic-pulse">
            <MicIcon size={32} />
          </span>
          <BiText bi={{ nl: 'Ik luister… Lees de bladzijde hardop.', en: "I'm listening… Read the page out loud." }} settings={settings} size="body" />
          <button className="btn btn-primary" onClick={listener.stop}>
            Klaar <CheckIcon size={26} />
          </button>
        </div>
      )}

      {phase === 'parent' && (
        <div className="listening">
          <BiText
            bi={{
              nl: 'Lees hardop voor. Ouder: tik op elk woord dat niet goed ging, en dan op Klaar.',
              en: "Read out loud. Parent: tap every word that wasn't right, then tap Done.",
            }}
            settings={settings}
            size="body"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              stopClock();
              setPhase('result');
            }}
          >
            Klaar <CheckIcon size={26} />
          </button>
        </div>
      )}

      {phase === 'result' && (
        <>
          <div className={`feedback ${rightCount === scoredCount ? 'feedback-good' : 'feedback-soft'}`}>
            <span className="feedback-icon burst">{rightCount === scoredCount ? <CheckIcon /> : <StarIcon filled />}</span>
            <div className="bi-lines">
              <BiText
                bi={{
                  nl: rightCount === scoredCount ? `Alles goed! ${rightCount} van ${scoredCount} woorden.` : `${rightCount} van ${scoredCount} woorden goed gelezen!`,
                  en: rightCount === scoredCount ? `All correct! ${rightCount} of ${scoredCount} words.` : `${rightCount} of ${scoredCount} words read correctly!`,
                }}
                settings={settings}
                size="body"
              />
              {pageWrong.length > 0 && (
                <div className="word-chips">
                  {pageWrong.map((w) => (
                    <button key={w.word} className="word-chip" onClick={() => speakText(w.word, 'nl', { slower: 0.8 })}>
                      <SpeakerIcon size={16} /> {w.word}
                    </button>
                  ))}
                </div>
              )}
              <p className="t-label">Klopt een woord niet? Tik erop om het te veranderen. · Tap a word to correct the score.</p>
            </div>
          </div>
          <div className="read-actions">
            {pageWrong.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  commitPage();
                  setPractice(pageWrong);
                  setPracticeReturn('result');
                  setPhase('practice');
                }}
              >
                Oefen deze woorden
              </button>
            )}
            <button className="btn btn-secondary" onClick={startReading}>
              <RetryIcon /> Nog een keer
            </button>
            <button className="btn btn-primary" onClick={goNext}>
              {lastPage ? 'Boek uit!' : 'Volgende'} <NextIcon size={28} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// ---------- practising single words ----------

interface PracticeProps {
  words: WordToPractise[];
  settings: Settings;
  onDone: () => void;
  title?: string;
}

type WordStatus = 'ready' | 'listening' | 'right' | 'retry' | 'later';

export function WordPractice({ words, settings, onDone, title }: PracticeProps) {
  const auto = listensItself(settings);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<WordStatus>('ready');
  const [tries, setTries] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [listenError, setListenError] = useState<ListenError | null>(null);
  const listener = useListener(false);
  const finished = idx >= words.length;
  const w = words[Math.min(idx, words.length - 1)];

  useEffect(() => () => stopSpeaking(), []);

  const markRight = () => {
    setStatus('right');
    setFixed((f) => f + 1);
    removePractisedWord(w.word);
    if (settings.sounds) chime();
  };

  const seenEnd = useRef(listener.endedCount);
  useEffect(() => {
    if (listener.endedCount === seenEnd.current) return;
    seenEnd.current = listener.endedCount;
    if (status !== 'listening') return;
    if (!listener.heard.primary) {
      setListenError(listener.error ?? 'no-speech');
      setStatus(tries > 0 ? 'retry' : 'ready');
      return;
    }
    if (saidWord(w.word, listener.heard)) markRight();
    else {
      const t = tries + 1;
      setTries(t);
      setStatus(t >= 3 ? 'later' : 'retry');
    }
  });

  const next = () => {
    setIdx(idx + 1);
    setStatus('ready');
    setTries(0);
    setListenError(null);
  };

  const sayIt = () => {
    stopSpeaking();
    setListenError(null);
    listener.start();
    setStatus('listening');
  };

  const back = (
    <TopBar
      onBack={onDone}
      title={
        <>
          <h1 className="t-title">Woorden oefenen</h1>
          <p className="t-label muted">
            {title ? `${title} · ` : ''}
            {Math.min(idx + 1, words.length)} / {words.length}
          </p>
        </>
      }
    />
  );

  if (finished) {
    return (
      <section className="screen">
        {back}
        <div className="celebrate">
          <h1 className="t-display">Goed geoefend!</h1>
          <div className="card">
            <BiText
              bi={{
                nl: `Je hebt ${fixed} van de ${words.length} woorden goed gezegd.${fixed < words.length ? ' De andere oefenen we later nog eens.' : ''}`,
                en: `You said ${fixed} of the ${words.length} words correctly.${fixed < words.length ? " We'll practise the others again later." : ''}`,
              }}
              settings={settings}
            />
          </div>
        </div>
        <button className="btn btn-primary btn-wide" onClick={onDone}>
          Klaar <CheckIcon size={28} />
        </button>
      </section>
    );
  }

  const parts = splitSyllables(w.word);
  const target = normalizeWord(w.word);
  const done = status === 'right' || status === 'later';

  return (
    <section className="screen">
      {back}
      <div className={`card practice-card ${status === 'right' ? 'is-right' : ''}`}>
        <p className="practice-word" lang="nl">
          {w.word}
        </p>
        {parts.length > 1 && (
          <p className="syllables" aria-label="klankgroepjes">
            {parts.map((p, i) => (
              <span key={i} className="syllable">
                {p}
              </span>
            ))}
          </p>
        )}
        <p className="practice-sentence" lang="nl">
          {tokenize(w.sentence).map((t, i) => (
            <span key={i} className={t.norm === target ? 'is-target' : undefined}>
              {t.text}{' '}
            </span>
          ))}
        </p>
        <div className="btn-pair">
          <button className="btn btn-accent" onClick={() => speakText(w.word, 'nl', { slower: 0.75 })}>
            <SpeakerIcon /> Woord
          </button>
          <button className="btn btn-accent" onClick={() => speakText(w.sentence, 'nl')}>
            <SpeakerIcon /> Zin
          </button>
        </div>
      </div>

      {listenError && (
        <div className="feedback feedback-soft">
          <span className="feedback-icon">
            <MicIcon />
          </span>
          <BiText bi={LISTEN_ERROR_TEXT[listenError]} settings={settings} size="body" />
        </div>
      )}

      {status === 'right' && (
        <div className="feedback feedback-good">
          <span className="feedback-icon burst">
            <CheckIcon />
          </span>
          <BiText bi={{ nl: 'Goed gezegd!', en: 'Well said!' }} settings={settings} size="body" />
        </div>
      )}
      {status === 'retry' && (
        <div className="feedback feedback-soft">
          <span className="feedback-icon">
            <RetryIcon />
          </span>
          <BiText
            bi={{ nl: 'Bijna! Luister nog eens en zeg het in stukjes.', en: 'Almost! Listen again and say it in parts.' }}
            settings={settings}
            size="body"
          />
        </div>
      )}
      {status === 'later' && (
        <div className="feedback feedback-soft">
          <span className="feedback-icon">
            <BookIcon />
          </span>
          <BiText bi={{ nl: 'Dit woord oefenen we later nog eens.', en: "We'll practise this word again later." }} settings={settings} size="body" />
        </div>
      )}

      {done ? (
        <button className="btn btn-primary btn-wide" onClick={next}>
          Volgende <NextIcon size={28} />
        </button>
      ) : auto && !listenError ? (
        status === 'listening' ? (
          <div className="listening">
            <span className="mic-pulse">
              <MicIcon size={32} />
            </span>
            <BiText bi={{ nl: 'Zeg het woord…', en: 'Say the word…' }} settings={settings} size="body" />
          </div>
        ) : (
          <button className="btn btn-primary btn-wide" onClick={sayIt}>
            <MicIcon size={28} /> Zeg het!
          </button>
        )
      ) : (
        <div className="btn-pair">
          <button className="btn btn-primary" onClick={markRight}>
            <CheckIcon /> Goed gezegd
          </button>
          <button className="btn btn-secondary" onClick={() => setStatus('later')}>
            Nog lastig
          </button>
        </div>
      )}
    </section>
  );
}
