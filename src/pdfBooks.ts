/// <reference types="vite/client" />
// PDF picture books imported by a parent: every page is rendered to a JPEG with
// pdf.js, its text is cleaned up (src/pdfText.ts), and the book is kept on this
// device in IndexedDB. Nothing is uploaded anywhere.
import type { Book, ReadingLevelId } from './readingData';
import { guessTitle, pageLines, cleanLines, type PdfTextItem } from './pdfText';

export const MAX_PDF_BYTES = 60 * 1024 * 1024;
const MAX_WIDTH = 1000;
const JPEG_QUALITY = 0.8;

export type PdfErrorCode = 'cors' | 'network' | 'not-pdf' | 'too-big' | 'password' | 'failed';

export class PdfImportError extends Error {
  code: PdfErrorCode;
  constructor(code: PdfErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PdfImportError';
    this.code = code;
  }
}

export interface PdfImportOptions {
  level: ReadingLevelId;
  sourceUrl?: string;
  /** Fixed id and title (PDFs that ship with the app); otherwise a random id and a guessed title. */
  id?: string;
  title?: string;
}

// ---------- pdf.js (loaded only when a PDF is imported) ----------

type PdfJs = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<PdfJs>,
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
    pdfjsPromise.catch(() => (pdfjsPromise = null));
  }
  return pdfjsPromise;
}

// ---------- tiny IndexedDB wrapper ----------

const DB_NAME = 'rekenpret-pdf';
const BOOKS = 'books';
const IMAGES = 'images';

interface StoredBook {
  id: string;
  level: ReadingLevelId;
  title: string;
  fileName: string;
  addedAt: string;
  sourceUrl?: string;
  pages: { nl: string }[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-indexeddb'));
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(BOOKS)) db.createObjectStore(BOOKS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

const reqP = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('aborted'));
  });

const imageKey = (id: string, i: number) => `${id}:${String(i).padStart(4, '0')}`;
const imageRange = (id: string) => IDBKeyRange.bound(`${id}:`, `${id}:￿`);

async function storeBook(meta: StoredBook, images: Blob[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([BOOKS, IMAGES], 'readwrite');
  tx.objectStore(BOOKS).put(meta);
  images.forEach((b, i) => tx.objectStore(IMAGES).put(b, imageKey(meta.id, i)));
  await txDone(tx);
}

// ---------- object URLs (revoked when a book is reloaded or removed) ----------

const liveUrls = new Map<string, string[]>();

function revokeUrls(id: string) {
  for (const u of liveUrls.get(id) ?? []) URL.revokeObjectURL(u);
  liveUrls.delete(id);
}

function toBook(meta: StoredBook, images: (Blob | undefined)[], note?: string): Book {
  revokeUrls(meta.id);
  const urls = images.map((b) => (b ? URL.createObjectURL(b) : ''));
  liveUrls.set(meta.id, urls.filter(Boolean));
  return {
    id: meta.id,
    level: meta.level,
    title: { nl: meta.title, en: meta.title },
    cover: {},
    coverImage: urls[0] || undefined,
    pdf: { fileName: meta.fileName, addedAt: meta.addedAt, sourceUrl: meta.sourceUrl, ...(note ? { note } : {}) },
    pages: meta.pages.map((p, i) => ({ nl: p.nl, en: '', image: urls[i] || undefined })),
  };
}

// ---------- import ----------

function randomId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return `pdf-${c.randomUUID().slice(0, 8)}`;
  return `pdf-${Math.random().toString(36).slice(2, 10)}`;
}

async function looksLikePdf(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const s = String.fromCharCode(...head);
  return s.includes('%PDF-');
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', JPEG_QUALITY),
  );
}

/** Import a PDF picture book, store it on this device and return it as a normal Book. */
export async function importPdf(
  file: Blob,
  fileName: string,
  opts: PdfImportOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<Book> {
  if (file.size > MAX_PDF_BYTES) throw new PdfImportError('too-big');
  if (!(await looksLikePdf(file))) throw new PdfImportError('not-pdf');

  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  let doc: Awaited<ReturnType<PdfJs['getDocument']>['promise']>;
  try {
    doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'PasswordException') throw new PdfImportError('password');
    throw new PdfImportError('not-pdf', String(e));
  }

  try {
    const total = doc.numPages;
    onProgress?.(0, total);
    const pages: { nl: string }[] = [];
    const images: Blob[] = [];
    let firstLines: string[] = [];

    for (let n = 1; n <= total; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(MAX_WIDTH / base.width, 3);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new PdfImportError('failed', 'no canvas');
      ctx.fillStyle = '#ffffff'; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(await canvasToJpeg(canvas));
      canvas.width = canvas.height = 0;

      const content = await page.getTextContent();
      const lines = pageLines(content.items.filter((it): it is PdfTextItem & typeof it => 'str' in it));
      if (n === 1) firstLines = lines;
      pages.push({ nl: cleanLines(lines) });
      page.cleanup();
      onProgress?.(n, total);
    }

    const meta: StoredBook = {
      id: opts.id ?? randomId(),
      level: opts.level,
      title: opts.title ?? guessTitle(fileName, firstLines),
      fileName,
      addedAt: new Date().toISOString(),
      sourceUrl: opts.sourceUrl,
      pages,
    };

    let note: string | undefined;
    try {
      await storeBook(meta, images);
    } catch {
      note = 'Dit apparaat kan het boek niet bewaren; het blijft alleen tot je de app sluit. · This device cannot store the book; it stays only until the app is closed.';
    }
    return toBook(meta, images, note);
  } finally {
    void doc.destroy();
  }
}

/** Fetch a PDF from a link. Many sites block this (CORS): then the error code is 'cors'. */
export async function importPdfFromUrl(
  url: string,
  opts: PdfImportOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<Book> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new PdfImportError('not-pdf', 'bad url');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new PdfImportError('not-pdf', 'bad url');

  let res: Response;
  try {
    res = await fetch(parsed.href, { mode: 'cors', credentials: 'omit' });
  } catch {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new PdfImportError('network');
    throw new PdfImportError('cors');
  }
  if (res.type === 'opaque') throw new PdfImportError('cors');
  if (!res.ok) throw new PdfImportError('network', `HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_PDF_BYTES) throw new PdfImportError('too-big');
  const blob = await res.blob();

  const name = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || 'boek.pdf');
  return importPdf(blob, /\.pdf$/i.test(name) ? name : `${name}.pdf`, { ...opts, sourceUrl: opts.sourceUrl ?? parsed.href }, onProgress);
}

/** All PDF books stored on this device (with fresh object URLs for the pictures). */
export async function loadPdfBooks(): Promise<Book[]> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return [];
  }
  try {
    const tx = db.transaction([BOOKS, IMAGES], 'readonly');
    const metas = await reqP(tx.objectStore(BOOKS).getAll() as IDBRequest<StoredBook[]>);
    const books: Book[] = [];
    for (const meta of metas) {
      const imgs = await reqP(tx.objectStore(IMAGES).getAll(imageRange(meta.id)) as IDBRequest<Blob[]>);
      const byPage = meta.pages.map((_, i) => imgs[i]);
      books.push(toBook(meta, byPage));
    }
    return books.sort((a, b) => (a.pdf!.addedAt < b.pdf!.addedAt ? -1 : 1));
  } catch {
    return [];
  }
}

/** Remove a PDF book and its pictures from this device. */
export async function removePdfBook(id: string): Promise<void> {
  revokeUrls(id);
  try {
    const db = await openDb();
    const tx = db.transaction([BOOKS, IMAGES], 'readwrite');
    tx.objectStore(BOOKS).delete(id);
    tx.objectStore(IMAGES).delete(imageRange(id));
    await txDone(tx);
  } catch {
    /* nothing stored, nothing to remove */
  }
}

/** One stored PDF book, or null when it is not on this device yet. */
export async function loadPdfBook(id: string): Promise<Book | null> {
  try {
    const db = await openDb();
    const tx = db.transaction([BOOKS, IMAGES], 'readonly');
    const meta = await reqP(tx.objectStore(BOOKS).get(id) as IDBRequest<StoredBook | undefined>);
    if (!meta) return null;
    const imgs = await reqP(tx.objectStore(IMAGES).getAll(imageRange(id)) as IDBRequest<Blob[]>);
    return toBook(meta, meta.pages.map((_, i) => imgs[i]));
  } catch {
    return null;
  }
}
