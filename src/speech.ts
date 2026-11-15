import type { Lang } from './core';
import { chooseVoice, teacherById, type Teacher, type TeacherId } from './teachers';

// Read-aloud with the Web Speech API. Parents can pick the Dutch and English
// voice and the speed that their child finds easiest to understand.

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

let voices: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();

if (canSpeak) {
  const refresh = () => {
    voices = window.speechSynthesis.getVoices();
    listeners.forEach((l) => l());
  };
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

/** Be told when the browser's voice list loads or changes. Returns an unsubscribe function. */
export function onVoicesChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export type Speed = 'slow' | 'normal' | 'fast';
export const SPEED_RATE: Record<Speed, number> = { slow: 0.7, normal: 0.9, fast: 1.05 };

interface VoicePrefs {
  nl: string | null;
  en: string | null;
  speed: Speed;
  /** The child's teacher: decides voice type (female/male), pitch and pace. */
  teacher?: TeacherId;
}

let prefs: VoicePrefs = { nl: null, en: null, speed: 'normal' };

/** Called by the app whenever the parent changes the voice settings. */
export function setVoicePrefs(p: VoicePrefs): void {
  prefs = p;
}

const PREFERRED: Record<Lang, string[]> = { nl: ['nl-NL', 'nl-BE'], en: ['en-GB', 'en-US'] };
const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();

/** All voices for a language, best guesses first (nl-NL before nl-BE, local before online). */
export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  const order = PREFERRED[lang].map((l) => l.toLowerCase());
  const rank = (v: SpeechSynthesisVoice) => {
    const i = order.indexOf(norm(v));
    return (i === -1 ? order.length : i) * 2 + (v.localService ? 0 : 1);
  };
  return voices.filter((v) => norm(v).startsWith(lang)).sort((a, b) => rank(a) - rank(b));
}

function voiceFor(lang: Lang, teacher: Teacher = teacherById(prefs.teacher)): SpeechSynthesisVoice | undefined {
  return chooseVoice(voices, lang, teacher.voice, prefs[lang]);
}

export function hasVoice(lang: Lang): boolean {
  return canSpeak && !!voiceFor(lang);
}

/** Turn sum symbols into words so every voice reads them the same way. */
export function speakable(text: string, lang: Lang): string {
  const w =
    lang === 'nl'
      ? { minus: ' min ', times: ' keer ', div: ' gedeeld door ', pct: ' procent', eq: ' is ' }
      : { minus: ' minus ', times: ' times ', div: ' divided by ', pct: ' percent', eq: ' is ' };
  return text
    .replace(/\s?−\s?/g, w.minus)
    .replace(/\s?×\s?/g, w.times)
    .replace(/ : /g, w.div)
    .replace(/%/g, w.pct)
    .replace(/ = /g, w.eq)
    .replace(/\s+/g, ' ')
    .trim();
}

interface SpeakOptions {
  /** Multiplies the chosen speed, e.g. 0.8 for single practice words. */
  slower?: number;
  /** Called with the character offset of each word as it is spoken (not every voice supports this). */
  onWord?: (charIndex: number) => void;
  onEnd?: () => void;
  /** Use a specific voice, e.g. for the "test this voice" button. */
  voiceURI?: string;
  /** Speak as this teacher instead of the chosen one (teacher picker preview). */
  teacher?: TeacherId;
}

/** Read text exactly as written (for books and words). */
export function speakText(text: string, lang: Lang, opts: SpeakOptions = {}): void {
  if (!canSpeak) {
    opts.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = PREFERRED[lang][0];
  const teacher = teacherById(opts.teacher ?? prefs.teacher);
  const v = (opts.voiceURI && voices.find((x) => x.voiceURI === opts.voiceURI)) || voiceFor(lang, teacher);
  if (v) u.voice = v;
  u.rate = SPEED_RATE[prefs.speed] * teacher.rate * (opts.slower ?? 1);
  u.pitch = teacher.pitch;
  if (opts.onWord) u.onboundary = (e) => (e.name === 'word' || !e.name) && opts.onWord!(e.charIndex);
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  synth.speak(u);
}

/** Read a question, hint or message (sum symbols become words). */
export function speak(text: string, lang: Lang): void {
  speakText(speakable(text, lang), lang);
}

export function stopSpeaking(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}

let audio: AudioContext | undefined;

/** A gentle two-note chime for a correct answer. */
export function chime(): void {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    const start = ctx.currentTime;
    [659.25, 987.77].forEach((freq, i) => {
      const t = start + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    // No audio available: the visual feedback still shows.
  }
}
