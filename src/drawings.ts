// @ts-nocheck — drawing code ported from the Rekenpret prototype; returns SVG strings.
// Typed React wrappers live in src/Art.tsx.
const PAL = {ink:'#1f2a44', brand:'#ff7a1a', brandDk:'#e8650a', sun:'#ffc93c', cream:'#fff8ec', pink:'#ff9eaa', grass:'#7cc46a', grassDk:'#4fa65a', sea:'#7cc6f2', seaDk:'#4ea9e0', sand:'#f6d58e', sky:'#d4ebff', teal:'#3bb8a0', plum:'#8a6fd1'};

/* Bolle — the Rekenpret friend: a round bead creature with a bead antenna */
function bolle(mood='happy', size=120, extra=''){
  const S=PAL, eyeL=[44,56], eyeR=[76,56];
  let arms = `<path d="M22 74 Q10 82 12 92" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="12" cy="93" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>
              <path d="M98 74 Q110 82 108 92" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="108" cy="93" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>`;
  let pupils = `<circle cx="46" cy="58" r="5.5" fill="${S.ink}"/><circle cx="78" cy="58" r="5.5" fill="${S.ink}"/><circle cx="48" cy="55.5" r="1.8" fill="#fff"/><circle cx="80" cy="55.5" r="1.8" fill="#fff"/>`;
  let eyes = `<g class="b-eyes"><circle cx="${eyeL[0]}" cy="${eyeL[1]}" r="12" fill="#fff" stroke="${S.ink}" stroke-width="3"/><circle cx="${eyeR[0]}" cy="${eyeR[1]}" r="12" fill="#fff" stroke="${S.ink}" stroke-width="3"/>${pupils}</g>`;
  let mouth = `<path d="M49 76 Q60 87 71 76" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  let over = '';
  if(mood==='cheer'){
    eyes = `<path d="M34 59 Q44 46 54 59M66 59 Q76 46 86 59" stroke="${S.ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    mouth = `<path d="M45 72 Q60 96 75 72Z" fill="${S.ink}" stroke="${S.ink}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="60" cy="83" rx="7" ry="4" fill="${S.pink}"/>`;
    arms = `<path d="M24 62 Q10 50 8 36" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="8" cy="34" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>
            <path d="M96 62 Q110 50 112 36" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="112" cy="34" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>`;
    over = `<g class="b-spark"><path d="M14 14l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="${S.sun}" stroke="${S.ink}" stroke-width="2"/><path d="M104 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="${S.sun}" stroke="${S.ink}" stroke-width="2"/></g>`;
  } else if(mood==='think'){
    pupils = `<circle cx="48" cy="52" r="5.5" fill="${S.ink}"/><circle cx="80" cy="52" r="5.5" fill="${S.ink}"/><circle cx="50" cy="50" r="1.8" fill="#fff"/><circle cx="82" cy="50" r="1.8" fill="#fff"/>`;
    eyes = `<g class="b-eyes"><circle cx="44" cy="56" r="12" fill="#fff" stroke="${S.ink}" stroke-width="3"/><circle cx="76" cy="56" r="12" fill="#fff" stroke="${S.ink}" stroke-width="3"/>${pupils}</g>`;
    mouth = `<path d="M53 80 Q60 76 67 80" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    arms = `<path d="M22 74 Q10 82 12 92" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="12" cy="93" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>
            <path d="M98 76 Q96 90 82 92" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="80" cy="91" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>`;
    over = `<g class="b-dots"><circle cx="100" cy="26" r="4" fill="#fff" stroke="${S.ink}" stroke-width="2"/><circle cx="108" cy="14" r="6" fill="#fff" stroke="${S.ink}" stroke-width="2"/></g>`;
  } else if(mood==='oops'){
    over = `<path d="M33 38 L52 42M87 38 L68 42" stroke="${S.ink}" stroke-width="4" stroke-linecap="round"/>`;
    mouth = `<path d="M49 80 Q54.5 75 60 80 Q65.5 85 71 80" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if(mood==='wave'){
    arms = `<path d="M22 74 Q10 82 12 92" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="12" cy="93" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>
            <g class="b-wave"><path d="M98 66 Q112 56 112 40" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="112" cy="38" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/></g>`;
  } else if(mood==='read'){
    arms = `<rect x="34" y="84" width="52" height="26" rx="4" fill="#fff" stroke="${S.ink}" stroke-width="3"/><path d="M60 84v26M40 92h14M40 99h12M66 92h14M66 99h10" stroke="${S.ink}" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="98" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/><circle cx="88" cy="98" r="6.5" fill="${S.brand}" stroke="${S.ink}" stroke-width="3"/>`;
    pupils = `<circle cx="45" cy="62" r="5.5" fill="${S.ink}"/><circle cx="77" cy="62" r="5.5" fill="${S.ink}"/>`;
    eyes = `<g class="b-eyes"><circle cx="44" cy="56" r="12" fill="#fff" stroke="${S.ink}" stroke-width="3"/><circle cx="76" cy="56" r="12" fill="#fff" stroke="${S.ink}" stroke-width="3"/>${pupils}</g>`;
    mouth = `<path d="M52 76 Q60 81 68 76" stroke="${S.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  return `<svg class="bolle m-${mood} ${extra}" width="${size}" height="${size*130/120}" viewBox="-4 -4 128 138" role="img" aria-label="Bolle">
    <ellipse cx="60" cy="126" rx="30" ry="5" fill="${S.ink}" opacity=".15" class="b-shadow"/>
    <g class="b-body">
    <ellipse cx="44" cy="114" rx="12" ry="7" fill="${S.brandDk}" stroke="${S.ink}" stroke-width="3"/><ellipse cx="76" cy="114" rx="12" ry="7" fill="${S.brandDk}" stroke="${S.ink}" stroke-width="3"/>
    <path d="M60 24 V10" stroke="${S.ink}" stroke-width="3.5" stroke-linecap="round"/><circle cx="60" cy="8" r="7" fill="${S.sun}" stroke="${S.ink}" stroke-width="3"/>
    <circle cx="60" cy="68" r="45" fill="${S.brand}" stroke="${S.ink}" stroke-width="4"/>
    <path d="M24 60 A38 38 0 0 1 48 28" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".45"/>
    <ellipse cx="60" cy="88" rx="25" ry="17" fill="#ffc58f"/>
    <ellipse cx="32" cy="74" rx="6.5" ry="4" fill="${S.pink}"/><ellipse cx="88" cy="74" rx="6.5" ry="4" fill="${S.pink}"/>
    ${eyes}${mouth}${arms}${over}</g></svg>`;
}

/* Telbeestjes — one collectible creature per world. Count the spots! */
const BEAST_NAMES = ['Tikkie','Kraaltje','Meerje','Splitsje','Plusje','Minnetje','Klokkie','Honderdje','Wegje','Tafelbeer','Gatje','Deeltje','Duizendpoot','Pizzapuk','Verhaaltje','Keerkat','Kommaatje','Stukkie','Rondje','Procentje','Staartje','Vlakje','Verhoudino','Vriesje','Schaaltje','Lastigje','Mixie'];
const BEAST_COLS = ['#ff7a1a','#ffc93c','#3bb8a0','#ff9eaa','#7cc6f2','#8a6fd1','#7cc46a'];
function creature(i, size=100, locked=false){
  const col = locked ? '#e7dcc8' : BEAST_COLS[i%BEAST_COLS.length], lt = locked ? '#efe6d6' : 'rgba(255,255,255,.55)';
  const shape = i%4, eyesN = (i*7)%3+1, legs = 2+(i%3), spots = (i%5)+1, top = (i*3+1)%4, ink = locked ? '#b9ad99' : PAL.ink;
  const body = [`<circle cx="50" cy="56" r="31"/>`,`<rect x="24" y="22" width="52" height="64" rx="26"/>`,`<ellipse cx="50" cy="61" rx="38" ry="25"/>`,`<path d="M50 23C70 23 78 44 80 62C82 82 66 88 50 88C34 88 18 82 20 62C22 44 30 23 50 23Z"/>`][shape];
  const ty = [25,22,36,23][shape], by = [86,86,85,88][shape], cy = [52,48,58,52][shape];
  let tops = '';
  if(top===0) tops = `<path d="M36 ${ty+8}L32 ${ty-12}L46 ${ty+2}ZM64 ${ty+8}L68 ${ty-12}L54 ${ty+2}Z" fill="${locked?col:'#fff8ec'}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  if(top===1) tops = `<circle cx="33" cy="${ty+6}" r="10" fill="${col}" stroke="${ink}" stroke-width="3"/><circle cx="67" cy="${ty+6}" r="10" fill="${col}" stroke="${ink}" stroke-width="3"/>`;
  if(top===2) tops = `<path d="M50 ${ty+2}V${ty-14}" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="${ty-16}" r="5" fill="${locked?col:PAL.sun}" stroke="${ink}" stroke-width="3"/>`;
  if(top===3) tops = `<path d="M38 ${ty+6}L42 ${ty-8}L47 ${ty+4}L51 ${ty-10}L55 ${ty+4}L60 ${ty-8}L63 ${ty+6}Z" fill="${col}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  let ls=''; for(let k=0;k<legs;k++){ const x = 50 + (k-(legs-1)/2)*16; ls += `<rect x="${x-5}" y="${by-6}" width="10" height="14" rx="5" fill="${col}" stroke="${ink}" stroke-width="3"/>`; }
  let face='';
  if(!locked){
    const xs = eyesN===1?[50]:eyesN===2?[40,60]:[35,50,65], r = eyesN===3?6.5:eyesN===1?10:8;
    face = xs.map(x=>`<circle cx="${x}" cy="${cy}" r="${r}" fill="#fff" stroke="${ink}" stroke-width="2.5"/><circle cx="${x+1}" cy="${cy+1}" r="${r*.45}" fill="${ink}"/>`).join('')
      + `<path d="M43 ${cy+13} Q50 ${cy+19} 57 ${cy+13}" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    for(let k=0;k<spots;k++){ const a = Math.PI*(0.15+0.7*k/Math.max(1,spots-1)), rr=18; const sx = 50 - Math.cos(a)*rr, sy = cy+24 - Math.sin(a)*4 + (spots===1?0:0); face += `<circle cx="${spots===1?50:sx}" cy="${Math.min(sy, by-10)}" r="3.4" fill="${lt}" stroke="${ink}" stroke-width="1.5"/>`; }
  } else face = `<text x="50" y="${cy+12}" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="30" fill="#b9ad99">?</text>`;
  return `<svg class="beast" width="${size}" height="${size}" viewBox="0 -8 100 108" role="img" aria-label="${locked?'nog niet gevonden':BEAST_NAMES[i%BEAST_NAMES.length]}">
    <ellipse cx="50" cy="${by+8}" rx="28" ry="4" fill="${PAL.ink}" opacity=".12"/>${tops}${ls}
    <g fill="${col}" stroke="${ink}" stroke-width="3.5">${body}</g>${face}</svg>`;
}

/* Landscapes — one land per groep, layered for depth */
const SCENE_BY_GROEP = {2:'tulips',3:'polder',4:'beach',5:'forest',6:'city',7:'mountains',8:'space'};
const LAND_NAME = {tulips:['Tulpenland','Tulip Land'],polder:['De Polder','The Polder'],beach:['Het Strand','The Beach'],forest:['Het Bos','The Forest'],city:['Grachtenstad','Canal Town'],mountains:['De Bergen','The Mountains'],space:['De Ruimte','Outer Space']};
function cloud(x,y,s=1){ return `<g class="cloud" transform="translate(${x} ${y}) scale(${s})"><path d="M0 20a14 14 0 0 1 14-14a20 20 0 0 1 36-2a14 14 0 0 1 22 10a10 10 0 0 1 0 20H8a10 10 0 0 1-8-14z" fill="#fff" stroke="${PAL.ink}" stroke-width="2.5" stroke-linejoin="round"/></g>`; }
function tree(x,y,s=1,c=PAL.grassDk){ return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="0" width="8" height="18" rx="3" fill="#9a6b45" stroke="${PAL.ink}" stroke-width="2.5"/><circle cx="0" cy="-10" r="18" fill="${c}" stroke="${PAL.ink}" stroke-width="2.5"/></g>`; }
function pine(x,y,s=1,c='#2f7d48'){ return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="0" width="6" height="12" fill="#9a6b45" stroke="${PAL.ink}" stroke-width="2.5"/><path d="M0 -46L18 -14H9L22 4H-22L-9 -14H-18Z" fill="${c}" stroke="${PAL.ink}" stroke-width="2.5" stroke-linejoin="round"/></g>`; }
function scene(theme, cls=''){
  const I=PAL.ink, sw='stroke="'+I+'" stroke-width="3" stroke-linejoin="round"';
  let sky=PAL.sky, g='';
  const sun = `<g class="sunspin" style="transform-origin:690px 52px"><circle cx="690" cy="52" r="26" fill="${PAL.sun}" ${sw}/>${[0,1,2,3,4,5,6,7].map(k=>{const a=k*Math.PI/4;return `<path d="M${690+Math.cos(a)*34} ${52+Math.sin(a)*34}L${690+Math.cos(a)*44} ${52+Math.sin(a)*44}" stroke="${I}" stroke-width="3" stroke-linecap="round"/>`}).join('')}</g>`;
  if(theme==='polder'){
    g = sun + cloud(80,30,.9) + cloud(420,50,.7) +
      `<path d="M0 140 Q200 100 400 130 T800 120 V220 H0Z" fill="#a8dd8a" ${sw}/>` +
      `<g transform="translate(560 58)"><path d="M-14 82 L-9 20 H9 L14 82Z" fill="${PAL.cream}" ${sw}/><path d="M-12 20 L0 4 L12 20Z" fill="${I}"/><rect x="-5" y="60" width="10" height="22" rx="4" fill="${I}"/>
        <g class="sails" style="transform-origin:0px 18px">${[0,90,180,270].map(r=>`<g transform="rotate(${r} 0 18)"><rect x="-4" y="-40" width="8" height="58" fill="${I}"/><rect x="4" y="-40" width="14" height="40" fill="${PAL.brand}" ${sw}/></g>`).join('')}<circle cx="0" cy="18" r="5" fill="${PAL.sun}" ${sw}/></g></g>` +
      tree(120,128,.9) + tree(160,134,.7,'#6cbf5a') + tree(700,122,.8) +
      `<path d="M0 168 H800 V188 H0Z" fill="${PAL.sea}" ${sw}/><path d="M60 178h30M300 176h40M520 180h30M700 177h40" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M0 188 H800 V220 H0Z" fill="${PAL.grass}" ${sw}/>` +
      `<g transform="translate(300 150)"><ellipse cx="0" cy="0" rx="22" ry="12" fill="#fff" ${sw}/><circle cx="-8" cy="-2" r="4" fill="${I}"/><circle cx="8" cy="3" r="5" fill="${I}"/><ellipse cx="22" cy="-6" rx="9" ry="7" fill="#fff" ${sw}/><rect x="-14" y="8" width="5" height="10" fill="${I}"/><rect x="10" y="8" width="5" height="10" fill="${I}"/></g>`;
  }
  if(theme==='tulips'){
    sky='#dff0ff';
    g = sun + cloud(120,26,.8) + cloud(460,44,.65) + `<path d="M0 120 Q400 90 800 118 V220 H0Z" fill="#9fd47f" ${sw}/>` +
      `<g transform="translate(640 74)"><path d="M0 40 L30 10 L60 40Z" fill="${PAL.brand}" ${sw}/><rect x="6" y="40" width="48" height="36" fill="${PAL.cream}" ${sw}/><rect x="24" y="54" width="12" height="22" fill="${I}"/></g>`;
    const cols=[PAL.brand,PAL.pink,PAL.sun,'#e8574f'];
    for(let r=0;r<4;r++) for(let c=0;c<22;c++){ const x=c*38+ (r%2)*19 - 10, y=150+r*18, col=cols[(r+Math.floor(c/5))%4], s=.7+r*.12;
      g += `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0V16" stroke="${PAL.grassDk}" stroke-width="3"/><path d="M-7 -10 L-7 0 Q0 6 7 0 L7 -10 L3.5 -5 L0 -11 L-3.5 -5Z" fill="${col}" stroke="${I}" stroke-width="2.2" stroke-linejoin="round"/></g>`; }
  }
  if(theme==='beach'){
    g = sun + cloud(90,34,.8) + cloud(380,24,.6) + `<path d="M0 110 H800 V160 H0Z" fill="${PAL.sea}" ${sw}/>` +
      `<g class="waves"><path d="M20 128 q15 -8 30 0 t30 0M220 140 q15 -8 30 0 t30 0M480 124 q15 -8 30 0 t30 0M640 142 q15 -8 30 0 t30 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g>` +
      `<g transform="translate(420 104)"><path d="M0 0 L40 0 L34 10 H6Z" fill="${PAL.brand}" ${sw}/><path d="M20 0V-30L38 -6Z" fill="#fff" ${sw}/></g>` +
      `<path d="M0 150 Q200 132 400 152 T800 146 V220 H0Z" fill="${PAL.sand}" ${sw}/>` +
      `<g transform="translate(110 40)">${[0,1,2,3].map(k=>`<rect x="${-14+k*1.5}" y="${30+k*28}" width="${28-k*3}" height="28" fill="${k%2?'#fff':'#e8574f'}" ${sw}/>`).join('')}<rect x="-18" y="14" width="36" height="16" rx="4" fill="${PAL.sun}" ${sw}/><path d="M-20 14 L0 -2 L20 14Z" fill="${I}"/></g>` +
      `<g transform="translate(600 178)"><path d="M0 0 V-46" stroke="${I}" stroke-width="3"/><path d="M-36 -40 Q0 -76 36 -40Z" fill="${PAL.brand}" ${sw}/><path d="M-12 -40 Q0 -76 12 -40" fill="none" stroke="${I}" stroke-width="2.5"/></g>` +
      `<g transform="translate(300 186)"><path d="M0 0 h30 l-4 -16 h-22z" fill="${PAL.sun}" ${sw}/><path d="M15 -16 V-28" stroke="${I}" stroke-width="3"/></g>`;
  }
  if(theme==='forest'){
    sky='#e6f4d8';
    g = sun + cloud(380,24,.6) + `<path d="M0 130 Q200 96 420 124 T800 110 V220 H0Z" fill="#8fcf74" ${sw}/>` +
      pine(60,138,1.2) + pine(120,150,1.5,'#3f9a5a') + pine(220,140,1.1) + pine(640,140,1.3,'#3f9a5a') + pine(720,150,1.6) + pine(520,136,1) +
      `<path d="M0 170 Q400 150 800 172 V220 H0Z" fill="${PAL.grass}" ${sw}/>` +
      [[300,182],[360,190],[460,180]].map(([x,y],k)=>`<g transform="translate(${x} ${y}) scale(${1-k*.15})"><rect x="-5" y="-4" width="10" height="16" rx="4" fill="${PAL.cream}" ${sw}/><path d="M-18 -2 Q0 -28 18 -2Z" fill="#e8574f" ${sw}/><circle cx="-6" cy="-10" r="3" fill="#fff"/><circle cx="6" cy="-14" r="2.5" fill="#fff"/></g>`).join('') +
      `<g transform="translate(400 160)"><ellipse cx="0" cy="0" rx="22" ry="14" fill="#9a6b45" ${sw}/><path d="M-20 -4 l-6 -8 l8 2 l-2 -9 l7 6 l2 -9 l5 8 l4 -8 l3 9 l7 -5 l-1 9 l9 -1z" fill="#7a5235" stroke="${I}" stroke-width="2"/><circle cx="18" cy="-2" r="2.5" fill="${I}"/><circle cx="24" cy="2" r="2.5" fill="${I}"/></g>`;
  }
  if(theme==='city'){
    sky='#ffe6c2';
    const cols=[PAL.brand,PAL.sun,PAL.pink,PAL.sea,PAL.cream,PAL.teal,'#e8574f'];
    g = `<circle cx="690" cy="60" r="30" fill="${PAL.sun}" ${sw}/>` + cloud(100,30,.7) + cloud(430,40,.6);
    for(let k=0;k<11;k++){ const x=k*74, h=90+((k*37)%40), w=70, y=170-h, c=cols[k%cols.length];
      const gable = k%3===0 ? `M${x} ${y} L${x+w/2} ${y-26} L${x+w} ${y}Z` : k%3===1 ? `M${x+8} ${y} V${y-12} H${x+18} V${y-24} H${x+52} V${y-12} H${x+62} V${y}Z` : `M${x+6} ${y} Q${x+6} ${y-26} ${x+35} ${y-30} Q${x+64} ${y-26} ${x+64} ${y}Z`;
      g += `<path d="${gable}" fill="${c}" ${sw}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${sw}/>`;
      for(let r=0;r<Math.floor(h/30);r++) for(let q=0;q<2;q++) g += `<rect x="${x+12+q*30}" y="${y+12+r*28}" width="16" height="18" rx="3" fill="${(r+q+k)%4?'#fff8ec':PAL.sun}" stroke="${I}" stroke-width="2.5"/>`;
    }
    g += `<path d="M0 170 H800 V220 H0Z" fill="${PAL.sea}" ${sw}/><path d="M300 170 Q400 120 500 170" fill="none" stroke="${I}" stroke-width="10"/><path d="M300 170 Q400 120 500 170" fill="none" stroke="#c98d5c" stroke-width="5"/>` +
      `<g class="boat"><path d="M120 188 h80 l-10 14 h-60z" fill="${PAL.brand}" ${sw}/><rect x="140" y="176" width="34" height="12" rx="3" fill="#fff" ${sw}/></g><path d="M40 205h40M560 200h50M680 208h40" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
  }
  if(theme==='mountains'){
    sky='#d9ecff';
    g = sun + cloud(70,24,.8) + cloud(330,48,.6) +
      `<path d="M-20 170 L140 40 L300 170Z" fill="#9db0d6" ${sw}/><path d="M140 40 L104 70 L124 64 L140 78 L158 64 L176 70Z" fill="#fff" ${sw}/>` +
      `<path d="M220 170 L420 20 L620 170Z" fill="#8aa0c8" ${sw}/><path d="M420 20 L376 54 L400 48 L420 64 L442 48 L466 54Z" fill="#fff" ${sw}/>` +
      `<path d="M520 170 L680 60 L840 170Z" fill="#9db0d6" ${sw}/><path d="M680 60 L648 84 L666 80 L680 92 L696 80 L712 84Z" fill="#fff" ${sw}/>` +
      `<path d="M0 160 Q400 140 800 162 V220 H0Z" fill="#a8dd8a" ${sw}/><ellipse cx="420" cy="196" rx="120" ry="14" fill="${PAL.sea}" ${sw}/>` +
      pine(60,180,1) + pine(100,190,.8) + pine(700,184,1.1) + pine(746,192,.8) +
      `<g class="balloon"><path d="M250 60 a26 30 0 1 1 52 0 q0 20 -20 34 h-12 q-20 -14 -20 -34z" fill="${PAL.brand}" ${sw}/><path d="M276 30 v64" stroke="${I}" stroke-width="2"/><rect x="268" y="100" width="16" height="12" rx="2" fill="#c98d5c" ${sw}/></g>`;
  }
  if(theme==='space'){
    sky=PAL.ink;
    for(let k=0;k<40;k++){ const x=(k*97)%800, y=(k*53)%160+6; g+=`<circle class="${k%3?'':'twinkle'}" cx="${x}" cy="${y}" r="${k%4?1.8:3}" fill="${k%5?'#fff':PAL.sun}" style="animation-delay:${(k%7)*.3}s"/>`; }
    g += `<circle cx="660" cy="64" r="34" fill="${PAL.sun}" stroke="#fff" stroke-width="3"/><circle cx="648" cy="56" r="6" fill="#e9b52f"/><circle cx="672" cy="76" r="4" fill="#e9b52f"/>` +
      `<g transform="translate(180 80)"><circle r="26" fill="${PAL.teal}" stroke="#fff" stroke-width="3"/><ellipse rx="44" ry="10" fill="none" stroke="${PAL.brand}" stroke-width="5" transform="rotate(-18)"/></g>` +
      `<circle cx="470" cy="40" r="12" fill="${PAL.pink}" stroke="#fff" stroke-width="3"/>` +
      `<g class="rocket" transform="translate(380 70) rotate(30)"><path d="M0 -40 Q16 -20 14 20 H-14 Q-16 -20 0 -40Z" fill="#fff" stroke="${I}" stroke-width="3"/><circle cx="0" cy="-8" r="7" fill="${PAL.sea}" stroke="${I}" stroke-width="3"/><path d="M-14 8 L-24 26 H-12ZM14 8 L24 26 H12Z" fill="${PAL.brand}" stroke="${I}" stroke-width="3" stroke-linejoin="round"/><path class="flame" d="M-8 22 Q0 46 8 22Z" fill="${PAL.sun}" stroke="${I}" stroke-width="2"/></g>` +
      `<path d="M0 176 Q200 150 400 172 T800 166 V220 H0Z" fill="#c9cfdc" stroke="#fff" stroke-width="3"/><ellipse cx="160" cy="196" rx="26" ry="6" fill="#aab2c4"/><ellipse cx="560" cy="190" rx="34" ry="7" fill="#aab2c4"/>`;
  }
  return `<svg class="land-svg ${cls}" viewBox="0 0 800 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect width="800" height="220" fill="${sky}"/>${g}</svg>`;
}


export { PAL, bolle, creature, scene, SCENE_BY_GROEP, LAND_NAME, BEAST_NAMES, BEAST_COLS };
