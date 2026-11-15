// Illustrations built from the design system's simple shapes: discs, rounded
// blocks and pills, with the chunky 2px ink outline. No clip-art, no emoji.
import { Fragment, type ReactElement } from 'react';
import type { CharacterId, Item, Scene, Visual } from './core';

const INK = 'var(--ink)';
const S = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const FILLS = ['var(--brand)', 'var(--accent)', 'var(--sun)', 'var(--ink-muted)'];
const fill = (i: number, list = FILLS) => list[i % list.length];

/** Each item is drawn in a 40×40 box. */
const DRAW: Record<Item, (i: number) => ReactElement> = {
  apple: () => (
    <>
      <path d="M20 13 L21 6" {...S} fill="none" />
      <ellipse cx="25" cy="8" rx="5" ry="2.6" transform="rotate(-25 25 8)" fill="var(--sun)" {...S} />
      <path
        d="M20 13c-4-3-12-2-12 8 0 8 6 13 9 13 1.5 0 2-1 3-1s1.5 1 3 1c3 0 9-5 9-13 0-10-8-11-12-8z"
        fill="var(--brand)"
        {...S}
      />
      <ellipse cx="14" cy="20" rx="2" ry="3.5" fill="var(--card)" opacity="0.7" />
    </>
  ),
  roll: () => (
    <>
      <ellipse cx="20" cy="23" rx="16" ry="10" fill="var(--sun)" {...S} />
      <path d="M12 18l3 9M19 15l2 11M26 17l2 9" {...S} fill="none" />
    </>
  ),
  stroopwafel: () => (
    <>
      <circle cx="20" cy="20" r="15" fill="var(--sun)" {...S} />
      <path
        d="M14 12L30 28M10 20L22 32M18 8L32 22M26 12L10 28M30 20L18 32M22 8L8 22"
        stroke={INK}
        strokeWidth="1.3"
        opacity="0.55"
      />
    </>
  ),
  cupcake: (i) => (
    <>
      <path d="M10 22h20l-3 14H13z" fill="var(--brand)" {...S} />
      <path d="M8 23c0-6 4-10 7-10 1-5 9-5 10 0 3 0 7 4 7 10z" fill={i % 2 ? 'var(--sun)' : 'var(--card)'} {...S} />
      <circle cx="20" cy="9" r="3.5" fill="var(--brand)" {...S} />
    </>
  ),
  person: (i) => (
    <>
      <rect x="10" y="22" width="20" height="17" rx="9" fill={fill(i)} {...S} />
      <circle cx="20" cy="14" r="8.5" fill="var(--card)" {...S} />
      <circle cx="17" cy="13" r="1.4" fill={INK} />
      <circle cx="23" cy="13" r="1.4" fill={INK} />
      <path d="M16.5 17q3.5 2.6 7 0" {...S} strokeWidth={1.6} fill="none" />
    </>
  ),
  egg: () => (
    <>
      <ellipse cx="20" cy="21" rx="11" ry="14" fill="var(--card)" {...S} />
      <ellipse cx="16" cy="15" rx="2" ry="3.5" fill="var(--sun)" opacity="0.5" />
    </>
  ),
  duck: () => (
    <>
      <path d="M18 31v6M25 31v6M15 37h5M22 37h5" stroke="var(--brand)" strokeWidth={2.6} strokeLinecap="round" />
      <ellipse cx="22" cy="24" rx="14" ry="8.5" fill="var(--sun)" {...S} />
      <circle cx="12" cy="13" r="6.5" fill="var(--sun)" {...S} />
      <path d="M6 12l-5 2.5 5 2.5z" fill="var(--brand)" {...S} />
      <circle cx="11" cy="12" r="1.4" fill={INK} />
      <path d="M20 22q5 4 10 0" {...S} fill="none" />
    </>
  ),
  cookie: () => (
    <>
      <circle cx="20" cy="20" r="14" fill="var(--sun)" {...S} />
      {[
        [15, 15],
        [24, 13],
        [23, 24],
        [14, 25],
        [28, 20],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={INK} />
      ))}
    </>
  ),
  balloon: (i) => (
    <>
      <path d="M20 29c-3 4 3 6 0 10" {...S} strokeWidth={1.6} fill="none" />
      <ellipse cx="20" cy="15" rx="10.5" ry="12.5" fill={fill(i, ['var(--brand)', 'var(--accent)', 'var(--sun)'])} {...S} />
      <path d="M18 27.5l2 2 2-2z" fill={INK} />
      <ellipse cx="16" cy="10" rx="2" ry="3.5" fill="var(--card)" opacity="0.6" />
    </>
  ),
  bike: () => (
    <>
      <circle cx="10" cy="28" r="7.5" fill="none" {...S} strokeWidth={2.5} />
      <circle cx="30" cy="28" r="7.5" fill="none" {...S} strokeWidth={2.5} />
      <path d="M10 28l7-12h11l2 12M17 16l4 12H10M21 28l7-12" stroke="var(--brand)" strokeWidth={2.6} strokeLinejoin="round" fill="none" />
      <path d="M14 13h6M28 16l1-5h4" {...S} strokeWidth={2.4} fill="none" />
    </>
  ),
  marble: (i) => (
    <>
      <circle cx="20" cy="20" r="12" fill={fill(i, ['var(--accent)', 'var(--brand)', 'var(--sun)'])} {...S} />
      <circle cx="16" cy="16" r="3" fill="var(--card)" opacity="0.8" />
    </>
  ),
};

export const ITEM_NAME: Record<Item, { nl: string; en: string }> = {
  apple: { nl: 'appels', en: 'apples' },
  roll: { nl: 'broodjes', en: 'rolls' },
  stroopwafel: { nl: 'stroopwafels', en: 'stroopwafels' },
  cupcake: { nl: 'cupcakes', en: 'cupcakes' },
  person: { nl: 'mensen', en: 'people' },
  egg: { nl: 'eieren', en: 'eggs' },
  duck: { nl: 'eenden', en: 'ducks' },
  cookie: { nl: 'koekjes', en: 'cookies' },
  balloon: { nl: 'ballonnen', en: 'balloons' },
  bike: { nl: 'fietsen', en: 'bikes' },
  marble: { nl: 'knikkers', en: 'marbles' },
};

export function ItemPic({ item, i = 0, size = 40, gone = false }: { item: Item; i?: number; size?: number; gone?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={gone ? 'item gone' : 'item'} aria-hidden="true">
      {DRAW[item](i)}
    </svg>
  );
}

/** Rows of at most 5, as even as possible: 6 → 3+3, 8 → 4+4, 13 → 5+4+4. */
function columns(n: number): number {
  if (n <= 5) return Math.max(n, 1);
  const rows = Math.ceil(n / 5);
  return Math.ceil(n / rows);
}

export function SceneView({ scene, big = false }: { scene: Scene; big?: boolean }) {
  const total = scene.groups.reduce((a, b) => a + b, 0);
  const base = total > 30 ? 22 : total > 20 ? 26 : total > 12 ? 32 : total > 6 ? 40 : 52;
  const size = Math.round(base * (big ? 1.25 : 1));
  const lastGroup = scene.groups.length - 1;
  const gone = scene.gone ?? 0;
  const name = ITEM_NAME[scene.item].nl;
  const label =
    scene.join === '+'
      ? `${scene.groups.join(' en ')} ${name}`
      : scene.groups.length > 1
        ? `${scene.groups.length} groepjes van ${scene.groups[0]} ${name}`
        : gone
          ? `${scene.groups[0]} ${name}, ${gone} zijn weg`
          : `${scene.groups[0]} ${name}`;
  let idx = 0;

  return (
    <div className="scene" role="img" aria-label={label}>
      {scene.groups.map((n, g) => (
        <Fragment key={g}>
          {g > 0 && scene.join && <span className="scene-op">{scene.join}</span>}
          <div
            className={`scene-group c-${scene.container ?? 'none'}`}
            style={{ gridTemplateColumns: `repeat(${columns(n)}, ${size}px)` }}
          >
            {Array.from({ length: n }, (_, i) => (
              <ItemPic key={i} item={scene.item} i={idx++} size={size} gone={g === lastGroup && i >= n - gone} />
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export const CHARACTER_NAME: Record<CharacterId, string> = { noor: 'Noor', sam: 'Sam', pip: 'Pip', jan: 'Boer Jan', uil: 'Juf Uil', robot: 'Robbie' };

/** The story characters, 80×100. */
export function Character({ who, size = 80 }: { who: CharacterId; size?: number }) {
  const face = (
    <>
      <circle cx="34" cy="38" r="2.4" fill={INK} />
      <circle cx="46" cy="38" r="2.4" fill={INK} />
      <path d="M33 46q7 6 14 0" {...S} strokeWidth={2.4} fill="none" />
      <circle cx="28" cy="45" r="3" fill="var(--brand)" opacity="0.35" />
      <circle cx="52" cy="45" r="3" fill="var(--brand)" opacity="0.35" />
    </>
  );
  let body: ReactElement;
  switch (who) {
    case 'noor':
      body = (
        <>
          <rect x="22" y="58" width="36" height="38" rx="18" fill="var(--brand)" {...S} />
          <circle cx="16" cy="30" r="8" fill={INK} />
          <circle cx="64" cy="30" r="8" fill={INK} />
          <circle cx="40" cy="38" r="20" fill="var(--card)" {...S} />
          <path d="M20 34c2-14 12-18 20-18s18 4 20 18c-6-6-14-9-20-9s-14 3-20 9z" fill={INK} />
          {face}
        </>
      );
      break;
    case 'sam':
      body = (
        <>
          <rect x="22" y="58" width="36" height="38" rx="18" fill="var(--accent)" {...S} />
          <circle cx="40" cy="38" r="20" fill="var(--card)" {...S} />
          <path d="M19 32c0-12 9-18 21-18s21 6 21 18c-8-5-14-6-21-6s-13 1-21 6z" fill="var(--sun)" {...S} />
          {face}
        </>
      );
      break;
    case 'jan':
      body = (
        <>
          <rect x="22" y="58" width="36" height="38" rx="18" fill="var(--sun)" {...S} />
          <path d="M30 60v34M50 60v34" {...S} strokeWidth={3} />
          <circle cx="40" cy="40" r="19" fill="var(--card)" {...S} />
          <rect x="14" y="22" width="52" height="7" rx="3.5" fill={INK} />
          <rect x="26" y="8" width="28" height="18" rx="7" fill="var(--brand)" {...S} />
          <circle cx="34" cy="40" r="2.4" fill={INK} />
          <circle cx="46" cy="40" r="2.4" fill={INK} />
          <path d="M31 48q9 7 18 0" {...S} strokeWidth={2.4} fill="none" />
        </>
      );
      break;
    case 'uil':
      body = (
        <>
          <path d="M22 34l-6-18 16 10M58 34l6-18-16 10" fill="var(--brand)" {...S} />
          <ellipse cx="40" cy="62" rx="26" ry="32" fill="var(--brand)" {...S} />
          <ellipse cx="40" cy="72" rx="15" ry="18" fill="var(--sun)" {...S} />
          <path d="M33 66q7 4 14 0M33 74q7 4 14 0M33 82q7 4 14 0" {...S} strokeWidth={1.6} fill="none" />
          <circle cx="30" cy="44" r="10" fill="var(--card)" {...S} />
          <circle cx="50" cy="44" r="10" fill="var(--card)" {...S} />
          <circle cx="30" cy="45" r="4" fill={INK} />
          <circle cx="50" cy="45" r="4" fill={INK} />
          <path d="M20 39h20M40 39h20" {...S} strokeWidth={1.8} />
          <path d="M36 52l4 6 4-6z" fill="var(--sun)" {...S} />
          <path d="M30 94l-3 4M36 94v4M44 94v4M50 94l3 4" stroke="var(--sun)" strokeWidth={3} strokeLinecap="round" />
        </>
      );
      break;
    case 'robot':
      body = (
        <>
          <path d="M40 10v8" {...S} strokeWidth={3} />
          <circle cx="40" cy="8" r="5" fill="var(--brand)" {...S} />
          <rect x="18" y="18" width="44" height="34" rx="10" fill="var(--card)" {...S} />
          <rect x="24" y="26" width="32" height="16" rx="8" fill={INK} />
          <circle cx="33" cy="34" r="3.5" fill="var(--sun)" />
          <circle cx="47" cy="34" r="3.5" fill="var(--sun)" />
          <path d="M34 46h12" {...S} strokeWidth={2.4} />
          <rect x="12" y="30" width="6" height="12" rx="3" fill="var(--ink-muted)" {...S} />
          <rect x="62" y="30" width="6" height="12" rx="3" fill="var(--ink-muted)" {...S} />
          <rect x="20" y="56" width="40" height="34" rx="10" fill="var(--accent)" {...S} />
          <circle cx="32" cy="70" r="4" fill="var(--sun)" {...S} />
          <circle cx="48" cy="70" r="4" fill="var(--brand)" {...S} />
          <rect x="30" y="78" width="20" height="5" rx="2.5" fill="var(--card)" />
          <path d="M28 90v8M52 90v8" {...S} strokeWidth={4} />
        </>
      );
      break;
    case 'pip':
      body = (
        <>
          <path d="M68 66q10-10 6-20" {...S} strokeWidth={3} fill="none" />
          <ellipse cx="46" cy="74" rx="26" ry="16" fill="var(--sun)" {...S} />
          <path d="M30 86v10M42 88v8M54 88v8M64 84v10" {...S} strokeWidth={3} />
          <circle cx="28" cy="48" r="17" fill="var(--sun)" {...S} />
          <ellipse cx="13" cy="44" rx="6" ry="11" fill={INK} transform="rotate(15 13 44)" />
          <ellipse cx="43" cy="44" rx="6" ry="11" fill={INK} transform="rotate(-15 43 44)" />
          <circle cx="23" cy="46" r="2.4" fill={INK} />
          <circle cx="33" cy="46" r="2.4" fill={INK} />
          <ellipse cx="28" cy="54" rx="4" ry="3" fill={INK} />
          <path d="M28 57v3" {...S} />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 80 100" width={size} height={(size * 100) / 80} className="character" role="img" aria-label={CHARACTER_NAME[who]}>
      {body}
    </svg>
  );
}

// ---------- pictures for clock, fraction, area and compare questions ----------

function ClockFace({ h, m }: { h: number; m: number }) {
  const hourAngle = ((h % 12) + m / 60) * 30;
  const minAngle = m * 6;
  const at = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: 80 + Math.sin(a) * r, y: 80 - Math.cos(a) * r };
  };
  const hourHand = at(hourAngle, 34);
  const minHand = at(minAngle, 54);
  return (
    <svg className="visual-clock" viewBox="0 0 160 160" role="img" aria-label="klok">
      <circle cx="80" cy="80" r="74" fill="var(--card)" stroke={INK} strokeWidth="4" />
      {Array.from({ length: 12 }, (_, i) => {
        const outer = at(i * 30, 66);
        const inner = at(i * 30, 58);
        const num = at(i * 30, 45);
        return (
          <g key={i}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={INK} strokeWidth={i % 3 ? 2 : 4} strokeLinecap="round" />
            <text x={num.x} y={num.y + 6} textAnchor="middle" className="clock-num">
              {i || 12}
            </text>
          </g>
        );
      })}
      <line x1="80" y1="80" x2={hourHand.x} y2={hourHand.y} stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <line x1="80" y1="80" x2={minHand.x} y2={minHand.y} stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="80" cy="80" r="6" fill={INK} />
    </svg>
  );
}

function Pie({ parts, shaded }: { parts: number; shaded: number }) {
  const slice = (i: number) => {
    const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
    const p = (a: number) => `${80 + 70 * Math.cos(a)} ${80 + 70 * Math.sin(a)}`;
    return `M80 80L${p(a0)}A70 70 0 0 1 ${p(a1)}Z`;
  };
  return (
    <svg className="visual-pie" viewBox="0 0 160 160" role="img" aria-label={`pizza in ${parts} stukken`}>
      {Array.from({ length: parts }, (_, i) => (
        <path key={i} d={slice(i)} fill={i < shaded ? 'var(--brand)' : 'var(--surface)'} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function RectPic({ w, h, unit }: { w: number; h: number; unit: string }) {
  const sc = Math.min(260 / w, 130 / h, 22);
  const W = w * sc;
  const H = h * sc;
  return (
    <svg className="visual-rect" viewBox={`0 0 ${W + 90} ${H + 60}`} style={{ maxWidth: W + 90 }} role="img" aria-label={`rechthoek van ${w} bij ${h} ${unit}`}>
      <rect x="45" y="15" width={W} height={H} rx="4" fill="var(--sun)" stroke={INK} strokeWidth="3" />
      <text x={45 + W / 2} y={H + 45} textAnchor="middle" className="rect-label">
        {w} {unit}
      </text>
      <text x="38" y={15 + H / 2 + 7} textAnchor="end" className="rect-label">
        {h} {unit}
      </text>
    </svg>
  );
}

function BeadRow({ n }: { n: number }) {
  return (
    <svg className="bead-row" viewBox={`0 0 ${n * 26 + 14} 34`} style={{ width: n * 26 + 14 }} role="img" aria-label={`${n} kralen`}>
      <rect x="2" y="15" width={n * 26 + 10} height="4" rx="2" fill="var(--ink-muted)" opacity="0.35" />
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={18 + i * 26} cy="17" r="11" fill={i < 5 ? 'var(--brand)' : i < 10 ? 'var(--card)' : 'var(--sun)'} stroke={INK} strokeWidth="2" />
      ))}
    </svg>
  );
}

export function VisualView({ v }: { v: Visual }) {
  switch (v.type) {
    case 'clock':
      return (
        <div className="visual">
          <ClockFace h={v.h} m={v.m} />
        </div>
      );
    case 'pie':
      return (
        <div className="visual">
          <Pie parts={v.parts} shaded={v.shaded} />
        </div>
      );
    case 'rect':
      return (
        <div className="visual">
          <RectPic w={v.w} h={v.h} unit={v.unit} />
        </div>
      );
    case 'compare':
      return (
        <div className="visual visual-compare">
          <BeadRow n={v.a} />
          <BeadRow n={v.b} />
        </div>
      );
  }
}
