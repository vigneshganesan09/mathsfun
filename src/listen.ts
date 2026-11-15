// Listening to the child with the browser's speech recognition (Dutch).
// Chrome and Edge send the audio to an online service to recognise it; Safari
// can work on the device. Firefox has no speech recognition: the app then lets
// a parent listen along and mark words instead.
import { useCallback, useEffect, useRef, useState } from 'react';
import { NOTHING_HEARD, type Heard } from './readingScore';

/* eslint-disable @typescript-eslint/no-explicit-any */
function recognitionCtor(): any {
  if (typeof window === 'undefined') return undefined;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canListen = !!recognitionCtor();

export type ListenError = 'not-allowed' | 'no-speech' | 'network' | 'other';

export interface Listener {
  listening: boolean;
  heard: Heard;
  error: ListenError | null;
  /** Bumps each time a listening session ends, so screens can react once. */
  endedCount: number;
  start: () => void;
  stop: () => void;
}

/**
 * Listen in Dutch. `continuous` keeps going through pauses (reading a page);
 * otherwise it stops after one phrase (saying a word or an answer).
 */
export function useListener(continuous: boolean): Listener {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<Heard>(NOTHING_HEARD);
  const [error, setError] = useState<ListenError | null>(null);
  const [endedCount, setEndedCount] = useState(0);
  const rec = useRef<any>(null);

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError('other');
      setEndedCount((n) => n + 1);
      return;
    }
    rec.current?.abort();
    const r = new Ctor();
    r.lang = 'nl-NL';
    r.continuous = continuous;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onresult = (e: any) => {
      let primary = '';
      const alternatives: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        primary += ` ${res[0].transcript}`;
        for (let j = 1; j < res.length; j++) alternatives.push(res[j].transcript);
      }
      setHeard({ primary: primary.trim(), alternatives });
    };
    r.onerror = (e: any) => {
      const code = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not-allowed' : e.error === 'no-speech' ? 'no-speech' : e.error === 'network' ? 'network' : e.error === 'aborted' ? null : 'other';
      if (code) setError(code);
    };
    r.onend = () => {
      setListening(false);
      setEndedCount((n) => n + 1);
    };
    rec.current = r;
    setHeard(NOTHING_HEARD);
    setError(null);
    try {
      r.start();
      setListening(true);
    } catch {
      setError('other');
      setEndedCount((n) => n + 1);
    }
  }, [continuous]);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { listening, heard, error, endedCount, start, stop };
}

export const LISTEN_ERROR_TEXT: Record<ListenError, { nl: string; en: string }> = {
  'not-allowed': {
    nl: 'De microfoon mag niet gebruikt worden. Geef toestemming, of laat een ouder meeluisteren.',
    en: 'The microphone is blocked. Allow it, or let a parent listen along.',
  },
  'no-speech': { nl: 'Ik hoorde niets. Probeer het nog eens, iets harder.', en: "I didn't hear anything. Try again, a bit louder." },
  network: {
    nl: 'Luisteren lukt nu niet (geen verbinding). Laat een ouder meeluisteren.',
    en: "Listening isn't working right now (no connection). Let a parent listen along.",
  },
  other: { nl: 'Luisteren lukt niet in deze browser. Laat een ouder meeluisteren.', en: "Listening doesn't work in this browser. Let a parent listen along." },
};
