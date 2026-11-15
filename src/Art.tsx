import type { Bi } from './core';
import { bolle, creature, LAND_NAME, scene, SCENE_BY_GROEP } from './drawings';
import type { LandTheme } from './readingData';
import { STORY_ART } from './storyArt';
import './illustrations.css';

// The illustration layer from the Rekenpret prototype: Bolle the bead friend,
// one landscape per groep and a counting creature (Telbeestje) per world.
// The drawings are SVG strings built from our own code (no user text inside).

export type BolleMood = 'happy' | 'wave' | 'think' | 'oops' | 'cheer' | 'read';

const Svg = ({ html, className }: { html: string; className?: string }) => (
  <span className={`art ${className ?? ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
);

export function Bolle({ mood = 'happy', size = 120, className }: { mood?: BolleMood; size?: number; className?: string }) {
  return <Svg className={`art-bolle ${className ?? ''}`} html={bolle(mood, size) as string} />;
}

export function Beast({ index, size = 100, locked = false }: { index: number; size?: number; locked?: boolean }) {
  return <Svg className="art-beast" html={creature(index, size, locked) as string} />;
}

export function Land({ theme, className }: { theme: LandTheme; className?: string }) {
  return <Svg className={`art-land ${className ?? ''}`} html={scene(theme) as string} />;
}

/** The land that belongs to a groep id ('1-2', '3', … '8'). */
export function landFor(groepId: string): LandTheme {
  const g = groepId === '1-2' ? 2 : Number(groepId) || 4;
  return (SCENE_BY_GROEP as Record<number, LandTheme>)[Math.min(8, Math.max(2, g))];
}

export function landName(theme: LandTheme): Bi {
  const [nl, en] = (LAND_NAME as unknown as Record<string, [string, string]>)[theme];
  return { nl, en };
}

export function StoryPicture({ art, page }: { art: keyof typeof STORY_ART; page: number }) {
  const list = STORY_ART[art];
  return <Svg className="art-story" html={list[Math.min(page, list.length - 1)]()} />;
}

/** A speech bubble next to Bolle. */
export function BolleSays({ mood = 'happy', size = 96, text }: { mood?: BolleMood; size?: number; text: Bi }) {
  return (
    <div className="bolle-says">
      <Bolle mood={mood} size={size} />
      <p className="bubble">
        {text.nl}
        <span className="sub">{text.en}</span>
      </p>
    </div>
  );
}
