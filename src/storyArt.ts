// @ts-nocheck — story pictures ported from the Rekenpret prototype (retold Aesopus and Andersen tales).
// Each book is a list of functions returning an SVG string; index 0 is the cover.
const SA = (() => {
  const INK='#1f2a44', O=`stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`, o3=`stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const at=(x,y,s,inner,flip)=>`<g transform="translate(${x} ${y}) scale(${flip?-s:s} ${s})">${inner}</g>`;
  const cloud=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 30a20 20 0 0 1 20-20a28 28 0 0 1 52-4a20 20 0 0 1 30 14a14 14 0 0 1 0 28H10a14 14 0 0 1-10-18z" fill="#fff" ${o3}/></g>`;
  const sun=(x,y,r=40)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#ffc93c" ${O}/>`+[0,1,2,3,4,5,6,7].map(k=>{const a=k*Math.PI/4;return `<path d="M${x+Math.cos(a)*(r+10)} ${y+Math.sin(a)*(r+10)}L${x+Math.cos(a)*(r+24)} ${y+Math.sin(a)*(r+24)}" ${O}/>`}).join('');
  const flowers=(list)=>list.map(([x,y,c])=>`<g transform="translate(${x} ${y})"><path d="M0 0v14" stroke="#4fa65a" stroke-width="3"/>${[0,1,2,3,4].map(k=>`<circle cx="${Math.cos(k*1.256)*6}" cy="${Math.sin(k*1.256)*6}" r="5" fill="${c}" stroke="${INK}" stroke-width="2"/>`).join('')}<circle r="4" fill="#ffc93c" stroke="${INK}" stroke-width="2"/></g>`).join('');
  const tuft=(x,y,c='#4fa65a')=>`<path d="M${x-10} ${y}l4 -16l6 12l4 -18l5 16l5 -12l3 18z" fill="${c}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const tree=(x,y,s=1)=>at(x,y,s,`<rect x="-14" y="-120" width="28" height="122" rx="8" fill="#9a6b45" ${O}/><circle cx="0" cy="-170" r="70" fill="#4fa65a" ${O}/><circle cx="-40" cy="-140" r="40" fill="#5bb466" ${O}/><circle cx="44" cy="-136" r="42" fill="#5bb466" ${O}/>`);
  const acacia=(x,y,s=1)=>at(x,y,s,`<path d="M-8 0 L-6 -110 L-40 -150 M-6 -110 L30 -160 M-6 -110 L2 -150" stroke="#7a5235" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M-8 0 L-6 -110" stroke="${INK}" stroke-width="3" fill="none"/><ellipse cx="0" cy="-168" rx="130" ry="30" fill="#3f8f4f" ${O}/>`);
  const zzz=(x,y)=>`<path d="M${x} ${y}h18l-18 18h18M${x+26} ${y-30}h14l-14 14h14M${x+48} ${y-54}h10l-10 10h10" fill="none" ${o3}/>`;
  const sparkle=(x,y,s=1)=>at(x,y,s,`<path d="M0 -18l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="#ffc93c" ${o3}/>`);
  const heart=(x,y,s=1)=>at(x,y,s,`<path d="M0 8C-20 -6 -16 -22 -6 -22C-2 -22 0 -18 0 -16C0 -18 2 -22 6 -22C16 -22 20 -6 0 8Z" fill="#ff9eaa" ${o3}/>`);
  const speed=(x,y)=>`<path d="M${x} ${y}h-60M${x+10} ${y+24}h-80M${x} ${y+48}h-50" ${o3} opacity=".6"/>`;
  const snow=()=>[...Array(34)].map((_,k)=>`<circle cx="${(k*137)%600}" cy="${(k*89)%420+10}" r="${k%3?4:6}" fill="#fff" stroke="#b8c6d8" stroke-width="1.5"/>`).join('');
  /* ---------- backgrounds ---------- */
  const BG={
    meadow:()=>`<rect width="600" height="600" fill="#cfe8ff"/>${sun(500,95)}${cloud(60,70,1)}${cloud(280,120,.7)}<path d="M0 360 Q150 300 300 350 T600 330 V600 H0Z" fill="#a8dd8a" ${O}/><path d="M0 420 Q300 390 600 420 V600 H0Z" fill="#7cc46a" ${O}/><path d="M-10 600 Q200 470 620 470" fill="none" stroke="#f6d58e" stroke-width="46"/><path d="M-10 600 Q200 470 620 470" fill="none" stroke="${INK}" stroke-width="3" opacity=".25"/>${flowers([[60,450,'#ff9eaa'],[110,560,'#ff7a1a'],[520,560,'#ff9eaa'],[560,440,'#ffffff']])}${tuft(250,560)}${tuft(470,590)}`,
    finish:()=>BG.meadow()+`<rect x="458" y="300" width="12" height="190" fill="#fff" ${O}/><rect x="578" y="300" width="12" height="190" fill="#fff" ${O}/><g>${[...Array(12)].map((_,k)=>`<rect x="${470+(k%6)*18}" y="${300+Math.floor(k/6)*18}" width="18" height="18" fill="${(k+Math.floor(k/6))%2?INK:'#fff'}"/>`).join('')}<rect x="470" y="300" width="108" height="36" fill="none" ${O}/></g>`,
    savanna:()=>`<rect width="600" height="600" fill="#ffe6c2"/>${sun(470,110,52)}${cloud(40,60,.8)}<path d="M0 380 Q200 340 400 370 T600 360 V600 H0Z" fill="#f2cf7a" ${O}/><path d="M0 450 Q300 420 600 450 V600 H0Z" fill="#e9b85b" ${O}/>${acacia(110,400,.9)}${tuft(60,520,'#c9a03a')}${tuft(330,590,'#c9a03a')}${tuft(560,520,'#c9a03a')}`,
    pond:(season='spring')=>{ const w=season==='winter';
      return `<rect width="600" height="600" fill="${w?'#dfe7f1':'#cfe8ff'}"/>${w?'':sun(510,90)}${cloud(50,60,.9)}${w?'':cloud(300,110,.6)}<path d="M0 340 Q300 300 600 340 V600 H0Z" fill="${w?'#f4f7fb':'#8fd16a'}" ${O}/><ellipse cx="300" cy="470" rx="270" ry="100" fill="${w?'#cfe6f5':'#7cc6f2'}" ${O}/>${w?'':'<path d="M120 470h50M300 510h60M420 450h40" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'}${[[40,420],[64,410],[548,420],[570,430]].map(([x,y])=>`<path d="M${x} ${y}v-80" stroke="${w?'#b4a888':'#4fa65a'}" stroke-width="6" stroke-linecap="round"/><ellipse cx="${x}" cy="${y-84}" rx="7" ry="18" fill="${w?'#c9b99a':'#9a6b45'}" ${o3}/>`).join('')}${w?snow():flowers([[90,560,'#ff9eaa'],[520,575,'#fff'],[480,370,'#ff7a1a']])}`; },
    nest:()=>`<rect width="600" height="600" fill="#cfe8ff"/>${sun(510,90)}${cloud(70,70,.9)}<path d="M0 340 Q300 300 600 340 V600 H0Z" fill="#8fd16a" ${O}/>${[[40,430],[70,420],[540,430]].map(([x,y])=>`<path d="M${x} ${y}v-90" stroke="#4fa65a" stroke-width="6" stroke-linecap="round"/><ellipse cx="${x}" cy="${y-94}" rx="7" ry="18" fill="#9a6b45" ${o3}/>`).join('')}<ellipse cx="380" cy="520" rx="170" ry="44" fill="#c9a06a" ${O}/><path d="M220 510 q40 -20 80 0 q40 -20 80 0 q40 -20 80 0" fill="none" stroke="#9a6b45" stroke-width="4"/>`,
  };
  /* ---------- characters (feet at 0,0) ---------- */
  const eye=(x,y,r=6,closed)=> closed?`<path d="M${x-r} ${y} q${r} ${r} ${r*2} 0" fill="none" ${o3}/>`:`<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x+r*.35}" cy="${y-r*.35}" r="${r*.3}" fill="#fff"/>`;
  function hare(pose='stand'){
    const F='#c9a27a', B='#f3e3cc';
    if(pose==='sleep') return `<ellipse cx="0" cy="-36" rx="76" ry="38" fill="${F}" ${O}/><ellipse cx="-80" cy="-40" rx="14" ry="12" fill="#fff" ${O}/><path d="M60 -60 q-60 -30 -110 -20" fill="none" stroke="${INK}" stroke-width="3"/><ellipse cx="40" cy="-80" rx="12" ry="46" transform="rotate(-70 40 -80)" fill="${F}" ${O}/><circle cx="70" cy="-46" r="34" fill="${F}" ${O}/>${eye(78,-50,7,true)}<circle cx="102" cy="-40" r="5" fill="#ff9eaa" ${o3}/><ellipse cx="62" cy="-30" rx="8" ry="5" fill="#ff9eaa" opacity=".8"/>${zzz(96,-110)}`;
    const run=pose==='run', laugh=pose==='laugh';
    const legs = run ? `<ellipse cx="-62" cy="-22" rx="30" ry="11" transform="rotate(-20 -62 -22)" fill="${F}" ${O}/><ellipse cx="46" cy="-6" rx="28" ry="10" fill="${F}" ${O}/>` : `<ellipse cx="-14" cy="-6" rx="28" ry="10" fill="${F}" ${O}/><ellipse cx="26" cy="-6" rx="28" ry="10" fill="${F}" ${O}/>`;
    const body = `<ellipse cx="-62" cy="-50" rx="14" ry="13" fill="#fff" ${O}/><ellipse cx="0" cy="-62" rx="46" ry="54" fill="${F}" ${O}/><ellipse cx="12" cy="-54" rx="24" ry="34" fill="${B}"/>`;
    const ears = `<ellipse cx="4" cy="-196" rx="13" ry="46" transform="rotate(-12 4 -196)" fill="${F}" ${O}/><ellipse cx="4" cy="-196" rx="5" ry="32" transform="rotate(-12 4 -196)" fill="#ff9eaa"/><ellipse cx="40" cy="-192" rx="13" ry="46" transform="rotate(14 40 -192)" fill="${F}" ${O}/><ellipse cx="40" cy="-192" rx="5" ry="32" transform="rotate(14 40 -192)" fill="#ff9eaa"/>`;
    const head = `<circle cx="24" cy="-136" r="36" fill="${F}" ${O}/><ellipse cx="34" cy="-120" rx="20" ry="14" fill="${B}"/>${eye(36,-144,7,laugh)}<circle cx="56" cy="-128" r="6" fill="#ff9eaa" ${o3}/><ellipse cx="14" cy="-122" rx="8" ry="5" fill="#ff9eaa" opacity=".8"/>` + (laugh?`<path d="M32 -112 q12 14 24 0z" fill="${INK}" ${o3}/>`:`<path d="M36 -112 q8 8 16 0" fill="none" ${o3}/>`);
    const arm = laugh ? `<path d="M30 -80 q30 0 36 -24" fill="none" stroke="${F}" stroke-width="14" stroke-linecap="round"/><path d="M30 -80 q30 0 36 -24" fill="none" ${o3}/>` : `<path d="M28 -70 q18 14 10 30" fill="none" stroke="${F}" stroke-width="14" stroke-linecap="round"/>`;
    const g = legs+body+ears+head+arm;
    return run ? `<g transform="rotate(14)">${g}</g>${speed(-90,-120)}` : g;
  }
  function tortoise(pose='walk'){
    const S='#6aa84f', K='#b5d98a';
    return `<rect x="-62" y="-26" width="18" height="26" rx="8" fill="${K}" ${O}/><rect x="-30" y="-26" width="18" height="28" rx="8" fill="${K}" ${O}/><rect x="16" y="-26" width="18" height="28" rx="8" fill="${K}" ${O}/><rect x="46" y="-26" width="18" height="26" rx="8" fill="${K}" ${O}/>
      <path d="M-70 -20 l-16 6 l14 6z" fill="${K}" ${o3}/>
      <path d="M58 -40 q20 -30 46 -26" fill="none" stroke="${K}" stroke-width="22" stroke-linecap="round"/><path d="M58 -40 q20 -30 46 -26" fill="none" ${o3} opacity=".0"/>
      <circle cx="104" cy="-74" r="26" fill="${K}" ${O}/>${eye(112,-80,6,pose==='happy')}<path d="M104 -62 q10 8 20 -2" fill="none" ${o3}/><ellipse cx="96" cy="-64" rx="6" ry="4" fill="#ff9eaa" opacity=".8"/>
      <path d="M-72 -22 Q-72 -120 0 -120 Q72 -120 72 -22 Z" fill="${S}" ${O}/><path d="M-80 -22 H80" ${O}/>
      <path d="M-24 -96 h48 l14 30 l-14 30 h-48 l-14 -30z" fill="#8cc06d" ${o3}/><path d="M-38 -66 h-30 M38 -66 h30 M-24 -96 l-14 -14 M24 -96 l14 -14 M-24 -36 l-10 14 M24 -36 l10 14" ${o3}/>
      ${pose==='win'?`<circle cx="104" cy="-110" r="0"/><path d="M84 -100 l20 -24 l20 24" fill="#ffc93c" ${o3}/>`:''}`;
  }
  function lion(pose='happy'){
    const M='#e0862f', Fc='#f7c873';
    const mane = [...Array(16)].map((_,k)=>{const a=k*Math.PI/8;return `<circle cx="${Math.cos(a)*66}" cy="${-150+Math.sin(a)*66}" r="24" fill="${M}" ${O}/>`}).join('');
    const sleep=pose==='sleep', roar=pose==='roar'||pose==='net';
    const bodyL = `<ellipse cx="-110" cy="-56" rx="96" ry="56" fill="${Fc}" ${O}/><path d="M-200 -60 q-40 -10 -40 -50" fill="none" ${O}/><circle cx="-242" cy="-112" r="12" fill="${M}" ${O}/>
      <rect x="-190" y="-30" width="30" height="32" rx="12" fill="${Fc}" ${O}/><rect x="-80" y="-30" width="30" height="32" rx="12" fill="${Fc}" ${O}/>`;
    const face = `${mane}<circle cx="0" cy="-150" r="70" fill="${M}" ${O}/><circle cx="-44" cy="-196" r="16" fill="${Fc}" ${O}/><circle cx="44" cy="-196" r="16" fill="${Fc}" ${O}/><circle cx="0" cy="-146" r="54" fill="${Fc}" ${O}/>
      ${eye(-20,-160,8,sleep)}${eye(20,-160,8,sleep)}<path d="M-10 -138 h20 l-10 12z" fill="#9a5b2e" ${o3}/>
      ${roar?`<path d="M-22 -118 q22 -8 44 0 q-4 36 -22 36 q-18 0 -22 -36z" fill="${INK}" ${o3}/><path d="M-12 -98 q12 8 24 0" fill="#ff9eaa"/>`:`<path d="M-14 -118 q14 12 28 0" fill="none" ${o3}/>`}
      <circle cx="-34" cy="-130" r="8" fill="#ff9eaa" opacity=".6"/><circle cx="34" cy="-130" r="8" fill="#ff9eaa" opacity=".6"/>
      <rect x="-40" y="-36" width="32" height="36" rx="12" fill="${Fc}" ${O}/><rect x="10" y="-36" width="32" height="36" rx="12" fill="${Fc}" ${O}/>`;
    let g = bodyL+face+(sleep?zzz(54,-230):'');
    if(pose==='net'){ let n=''; for(let x=-260;x<=90;x+=30) n+=`<path d="M${x} -250 L${x+40} 6" stroke="#9a6b45" stroke-width="5"/>`; for(let y=-240;y<=0;y+=30) n+=`<path d="M-270 ${y} L100 ${y+10}" stroke="#9a6b45" stroke-width="5"/>`; g += `<g opacity=".95">${n}</g><path d="M-270 -250 L100 -250" stroke="#7a5235" stroke-width="8"/>`; }
    return g;
  }
  function mouse(pose='stand'){
    const G='#a9a9b8';
    return `<path d="M-30 -14 q-40 -6 -50 -36" fill="none" stroke="#ff9eaa" stroke-width="4" stroke-linecap="round"/><ellipse cx="0" cy="-22" rx="32" ry="22" fill="${G}" ${O}/>
      <circle cx="22" cy="-60" r="16" fill="${G}" ${O}/><circle cx="34" cy="-50" r="22" fill="${G}" ${O}/><circle cx="22" cy="-60" r="9" fill="#ff9eaa"/>
      ${eye(42,-54,4,pose==='happy')}<circle cx="56" cy="-46" r="5" fill="#ff9eaa" ${o3}/><path d="M56 -46 l14 -4 M56 -46 l14 4" ${o3}/>
      <ellipse cx="-14" cy="-2" rx="10" ry="5" fill="${G}" ${o3}/><ellipse cx="16" cy="-2" rx="10" ry="5" fill="${G}" ${o3}/>
      ${pose==='gnaw'?`<path d="M62 -60 l8 -6 M66 -40 l10 2 M60 -30 l6 8" ${o3}/>`:''}`;
  }
  function duck(col='#ffd44d', pose='stand'){
    const sad=pose==='sad';
    return `<ellipse cx="0" cy="-34" rx="44" ry="32" fill="${col}" ${O}/><path d="M-44 -40 l-18 -10 l6 20z" fill="${col}" ${o3}/><path d="M-14 -40 q20 -16 34 6" fill="none" ${o3}/>
      <circle cx="32" cy="-78" r="24" fill="${col}" ${O}/>${eye(40,-84,5)}<path d="M54 -76 q20 2 24 10 q-12 6 -26 0z" fill="#ff7a1a" ${o3}/>
      ${sad?`<path d="M28 -100 l12 6" ${o3}/><path d="M42 -70 q-4 8 -2 14" stroke="#7cc6f2" stroke-width="4" fill="none" stroke-linecap="round"/>`:''}
      <path d="M-12 -2 v4 h-12 M14 -2 v4 h12" stroke="#ff7a1a" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  }
  function swan(pose='swim'){
    return `<path d="M-90 -40 q20 50 150 30 q20 -30 0 -50 q-60 -20 -150 20z" fill="#fff" ${O}/><path d="M-50 -46 q40 -30 90 -6" fill="none" ${o3}/>
      <path d="M56 -40 q30 -40 4 -90 q-14 -30 14 -40" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round"/><path d="M56 -40 q30 -40 4 -90 q-14 -30 14 -40" fill="none" ${o3} opacity=".0"/>
      <path d="M68 -44 q24 -40 0 -86 M44 -40 q30 -44 4 -92" fill="none" ${o3}/>
      <circle cx="80" cy="-172" r="20" fill="#fff" ${O}/>${eye(86,-176,4)}<path d="M96 -170 q22 2 26 12 q-14 4 -26 -2z" fill="#ff7a1a" ${o3}/><path d="M92 -172 q4 -4 8 -2" fill="${INK}"/>`;
  }
  const egg=(x,y,crack)=>`<ellipse cx="${x}" cy="${y}" rx="26" ry="34" fill="#fffaf0" ${O}/>${crack?`<path d="M${x-26} ${y-4} l10 -8 l8 8 l10 -10 l10 8 l14 -6" fill="none" ${o3}/>`:''}`;
  const water=(y)=>`<path d="M-120 ${y} q30 -10 60 0 t60 0 t60 0 t60 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`;
  const svg=(inner)=>`<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
  /* ---------- the three books ---------- */
  const haas = [
    ()=>svg(BG.meadow()+at(190,500,1.1,hare('stand'))+at(390,520,1.1,tortoise('happy'))+sparkle(520,230)),
    ()=>svg(BG.meadow()+at(220,500,1.15,hare('laugh'))+at(420,520,1,tortoise('walk'))),
    ()=>svg(BG.meadow()+at(380,520,1.1,tortoise('happy'),true)+at(170,500,1.05,hare('stand'))),
    ()=>svg(BG.meadow()+at(430,470,1,hare('run'))+at(120,540,.8,tortoise('walk'))),
    ()=>svg(BG.meadow()+tree(460,470,1)+at(380,505,1,hare('sleep'))+at(90,540,.6,tortoise('walk'))),
    ()=>svg(BG.meadow()+tree(240,470,.9)+at(170,505,1,hare('sleep'))+at(400,540,1,tortoise('walk'))),
    ()=>svg(BG.finish()+at(500,520,.95,tortoise('happy'))+sparkle(560,260)+sparkle(430,250,.8)+at(170,490,.9,hare('run'))),
    ()=>svg(BG.finish()+at(180,500,1.05,hare('laugh'))+at(410,520,1.1,tortoise('win'))+sparkle(470,330)+sparkle(330,320,.8)+heart(290,420)),
  ];
  const leeuw = [
    ()=>svg(BG.savanna()+at(390,520,1,lion('happy'))+at(470,540,1,mouse('happy'))),
    ()=>svg(BG.savanna()+at(380,520,1,lion('sleep'))+at(330,330,.8,mouse('stand'))),
    ()=>svg(BG.savanna()+at(380,520,1,lion('roar'))+at(470,320,.9,mouse('stand'))+`<ellipse cx="470" cy="330" rx="34" ry="20" fill="#f7c873" ${O}/>`),
    ()=>svg(BG.savanna()+at(330,520,1,lion('happy'))+at(500,540,1,mouse('happy'))+heart(520,440,.8)),
    ()=>svg(BG.savanna()+at(390,520,1,lion('net'))),
    ()=>svg(BG.savanna()+at(360,520,1,lion('net'))+at(470,540,1.1,mouse('gnaw'))),
    ()=>svg(BG.savanna()+at(360,520,1,lion('happy'))+at(470,545,1.1,mouse('happy'))+heart(450,300)+heart(520,260,.7)+sparkle(250,300)),
  ];
  const eend = [
    ()=>svg(BG.pond('spring')+at(200,480,1.1,duck('#9aa0a6'))+at(400,470,1,swan())),
    ()=>svg(BG.nest()+at(150,470,1.4,duck('#ffffff'))+egg(300,500,false)+egg(360,505,true)+at(430,520,.7,duck('#ffd44d'))+at(500,515,.7,duck('#ffd44d'))+sparkle(380,420,.8)),
    ()=>svg(BG.pond('spring')+at(110,480,.7,duck('#ffd44d'))+at(190,490,.7,duck('#ffd44d'))+at(270,480,.7,duck('#ffd44d'))+at(450,500,1.1,duck('#9aa0a6','sad'))),
    ()=>svg(BG.pond('spring')+at(110,430,.45,duck('#ffd44d'))+at(160,435,.45,duck('#ffd44d'))+at(440,560,.95,duck('#9aa0a6','sad'))),
    ()=>svg(BG.pond('winter')+at(300,520,1.1,duck('#9aa0a6','sad'))),
    ()=>svg(BG.pond('spring')+at(300,450,1,swan())+`<g transform="translate(300 470) scale(1 -1)" opacity=".35">${swan()}</g>`),
    ()=>svg(BG.pond('spring')+at(170,470,.85,swan())+at(330,480,1.05,swan())+at(470,460,.8,swan())+heart(300,250)+sparkle(420,260)),
  ];
  return {haas, leeuw, eend};
})();

export const STORY_ART: Record<'haas' | 'leeuw' | 'eend', (() => string)[]> = SA;
