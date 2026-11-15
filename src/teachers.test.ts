import { describe, expect, it } from 'vitest';
import { chooseVoice, TEACHERS, voiceKind, type VoiceInfo } from './teachers';

const v = (name: string, lang: string, local = true): VoiceInfo => ({ name, lang, voiceURI: `${name}-${lang}`, localService: local });
const VOICES = [v('Xander', 'nl-NL'), v('Ellen', 'nl-BE'), v('Google Nederlands', 'nl-NL', false), v('Daniel', 'en-GB'), v('Kate', 'en-GB'), v('Samantha', 'en-US')];

describe('teachers', () => {
  it('every teacher speaks Dutch and English', () => {
    for (const t of TEACHERS) {
      for (const line of [t.name, t.style, t.greeting, t.tryAgain, ...t.praise]) {
        expect(line.nl.length).toBeGreaterThan(0);
        expect(line.en.length).toBeGreaterThan(0);
      }
      expect(t.pitch).toBeGreaterThanOrEqual(0.5);
      expect(t.pitch).toBeLessThanOrEqual(2);
    }
    expect(new Set(TEACHERS.map((t) => t.id)).size).toBe(TEACHERS.length);
  });

  it('recognises common female and male voices', () => {
    expect(voiceKind({ name: 'Xander' })).toBe('male');
    expect(voiceKind({ name: 'Ellen' })).toBe('female');
    expect(voiceKind({ name: 'Google UK English Female' })).toBe('female');
    expect(voiceKind({ name: 'Microsoft Maarten Online' })).toBe('male');
    expect(voiceKind({ name: 'Mystery' })).toBe('any');
  });

  it('picks a voice of the right kind, Dutch from the Netherlands first', () => {
    expect(chooseVoice(VOICES, 'nl', 'male')?.name).toBe('Xander');
    expect(chooseVoice(VOICES, 'nl', 'female')?.name).toBe('Google Nederlands'); // nl-NL female beats nl-BE
    expect(chooseVoice(VOICES, 'en', 'male')?.name).toBe('Daniel');
    expect(chooseVoice(VOICES, 'en', 'female')?.name).toBe('Kate');
  });

  it("uses the parent's chosen voice when there is one", () => {
    expect(chooseVoice(VOICES, 'nl', 'female', 'Xander-nl-NL')?.name).toBe('Xander');
    expect(chooseVoice(VOICES, 'nl', 'female', 'gone')?.name).toBe('Google Nederlands');
  });
});
