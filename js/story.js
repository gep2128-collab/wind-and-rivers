// Story map: one step per screen. The fixed map is index.html (panels hidden); each card sets its view
// through the URL: t = month, z = world|amazon|borneo, l = layers to show.
// Charts are drawn from the same public data files as the explorer:
// ENSO (NOAA), CLIMA (ERA5), FUEGO (NASA FIRMS), CO2 (GFED5.1 / CAMS GFAS), ESPECIES (GBIF + IUCN), OXIGENO (MODIS).
(function(){
const MES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const C={red:'#e34948',blue:'#5a8cdc',grey:'#6b6b70',org:'#ffa51f',mut:'#9c9a92',ink:'#ecebe6',zero:'#4d4d50'};
const phase={};ENSO.months.forEach((m,i)=>phase[m]=ENSO.phase[i]);
const nino=(y,ms)=>ms.some(m=>phase[`${y}-${String(m).padStart(2,'0')}`]===1);
const svg=(w,h,body)=>`<svg viewBox="0 0 ${w} ${h}" role="img">${body}</svg>`;
const rect=(x,y,w,h,c)=>`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(w,.6).toFixed(1)}" height="${Math.max(h,.6).toFixed(1)}" fill="${c}"/>`;
const text=(x,y,s,c,o='')=>`<text x="${x}" y="${y}" fill="${c}" font-size="${o.includes('b')?12:11}" ${o.includes('b')?'font-weight="bold"':''} ${o.includes('r')?'text-anchor="end"':''}>${s}</text>`;
const sgn=v=>(v>0?'+':v<0?'−':'')+Math.abs(v);

// --- charts ---
function oniChart(){
  const v=ENSO.oni.map((x,i)=>[ENSO.months[i],x]).filter(d=>d[1]!=null),W=360,H=150,z=78,k=58/2.6,st=W/v.length;let b=rect(0,z,W,1,C.zero);
  v.forEach(([m,x],i)=>{const h=Math.abs(x)*k;b+=rect(i*st,x>=0?z-h:z+1,st*.85,h,x>=.5?C.red:x<=-.5?C.blue:C.grey);});
  const pk=v.reduce((a,d,i)=>d[1]>v[a][1]?i:a,0),last=v[v.length-1];
  b+=text(pk*st-48,z-v[pk][1]*k-6,`${v[pk][0].slice(0,4)}–${+v[pk][0].slice(2,4)+1}  ${sgn(v[pk][1])}`,C.red,'b');
  b+=text(W,z-last[1]*k-6,`${last[0].slice(0,4)}  ${sgn(last[1].toFixed(1))}`,C.red,'br');
  b+=text(0,H-2,v[0][0].slice(0,4),C.mut)+text(W,H-2,last[0].slice(0,4),C.mut,'r');
  return svg(W,H,b)+keys([[C.red,'El Niño'],[C.blue,'La Niña']]);
}
// dry-season rain vs the 1991–2020 normal, % (ERA5, land cells of the study box)
function rainPct(r,months){
  const c=CLIMA.regions[r].tp,out=[];
  for(let y=2005;y<=+CLIMA.months.at(-1).slice(0,4);y++){let v=0,n=0,ok=true;
    for(const m of months){const i=CLIMA.months.indexOf(`${y}-${String(m).padStart(2,'0')}`);if(i<0||c.value[i]==null){ok=false;break;}v+=c.value[i];n+=c.normal[m-1];}
    if(ok)out.push([y,Math.round(100*(v/n-1)),nino(y,months)]);}
  return out;
}
function rainChart(){
  const d=rainPct('borneo',[8,9,10]),W=360,H=170,z=72,k=62/60,st=W/d.length;let b=rect(0,z,W,1,C.zero);
  d.forEach(([y,p,n],i)=>{const h=Math.abs(p)*k;b+=rect(i*st+1,p>=0?z-h:z+1,st-3,h,n?C.red:C.grey);});
  const lab=y=>{const i=d.findIndex(x=>x[0]===y);if(i<0)return'';const p=d[i][1];return text(Math.min(i*st-10,W-70),z+Math.abs(p)*k+14,`${y}  ${sgn(p)}%`,C.red,'b');};
  b+=lab(2015)+lab(d.at(-1)[0])+text(0,H-2,d[0][0],C.mut)+text(W,H-2,d.at(-1)[0],C.mut,'r');
  return svg(W,H,b)+keys([[C.red,'El Niño years'],[C.grey,'other years']]);
}
// fire hotspots Sep–Nov of each full year (FIRMS, MODIS)
function fireRows(r){const h=FUEGO.regions[r].hotspots,out=[];
  for(let y=2005;y<=2025;y++){let v=0;for(const m of[9,10,11]){const i=FUEGO.months.indexOf(`${y}-${String(m).padStart(2,'0')}`);v+=(i<0?0:h[i]||0);}out.push([y,v,nino(y,[9,10,11])]);}
  return out;}
function fireChart(){
  const W=360,H=190,rows=[['BORNEO  ·  r = −0.85','borneo'],['AMAZON  ·  r = −0.29','amazon']],rh=(H-16)/2;let b='';
  rows.forEach(([lab,r],ri)=>{const d=fireRows(r),top=ri*rh,max=Math.max(...d.map(x=>x[1])),base=top+rh-4,bh=rh-24,st=W/d.length;
    b+=text(0,top+12,lab,C.ink,'b')+rect(0,base,W,1,C.zero);
    d.forEach(([y,v,n],i)=>{const h=Math.max(1,v/max*bh);b+=rect(i*st+1,base-h,st-3,h,n?C.red:C.grey);});});
  b+=text(0,H-2,'2005',C.mut)+text(W,H-2,'2025',C.mut,'r');
  return svg(W,H,b)+keys([[C.red,'El Niño years'],[C.grey,'other years']])+'<p class="note">Each row is scaled to its own highest year. r = link between dry-season rain and fire.</p>';
}
// what is at stake: Amazon vs Borneo
function yearly(r){const c=CO2.regions[r].co2_mt,y={};CO2.months.forEach((m,i)=>{if(c[i]==null)return;const k=m.slice(0,4);(y[k]=y[k]||[]).push(c[i]);});return y;}
function stake(r){const E=ESPECIES.regions[r],up=OXIGENO.regions[r]['2022'].co2_uptake_mt,Y=yearly(r),full=Object.keys(Y).filter(k=>Y[k].length===12);
  const sum=k=>Y[k].reduce((a,b)=>a+b,0),worst=full.reduce((a,k)=>sum(k)>sum(a)?k:a,full[0]),last=CO2.months.at(-1).slice(0,4);
  return{mam:E.mammals.threatened_pct,amp:E.amphibians.threatened_pct,worst:+(100*sum(worst)/up).toFixed(1),worstY:worst,ytd:Y[last]&&Y[last].length<12?+(100*sum(last)/up).toFixed(1):null,last,to:MES[+CO2.months.at(-1).slice(5)-1]};}
function stakeChart(){
  const a=stake('amazon'),b=stake('borneo'),rows=[['Mammal species threatened',a.mam,b.mam],['Amphibian species threatened',a.amp,b.amp],
    [`Fire CO₂ in the worst year, % of a year's uptake (Amazon ${a.worstY}, Borneo ${b.worstY})`,a.worst,b.worst]];
  if(b.ytd!=null)rows.push([`Fire CO₂ ${b.last} to ${b.to} (estimate), % of a year's uptake`,a.ytd,b.ytd]);
  const W=360,rh=50,bw=W-56,mx=Math.max(...rows.flatMap(r=>[r[1],r[2]]))*1.05;let s='';
  rows.forEach(([lab,x,y],i)=>{const t=i*rh;s+=text(0,t+11,lab,C.mut)+rect(0,t+17,x/mx*bw,9,C.grey)+text(x/mx*bw+6,t+25,x+'%',C.ink)+rect(0,t+30,y/mx*bw,9,C.org)+text(y/mx*bw+6,t+38,y+'%',C.org,'b');});
  return svg(W,rows.length*rh,s)+keys([[C.grey,'Amazon'],[C.org,'Borneo']]);
}
function keys(k){return `<div class="keys">${k.map(([c,l])=>`<span style="--c:${c}">${l}</span>`).join('')}</div>`;}
function nino12(m){return ENSO.nino12[ENSO.months.indexOf(m)];}

// --- sources (same citations as the explorer's "Sources" and docs/03) ---
const C3S='Contains modified Copernicus Climate Change Service information, 2026 (CC BY 4.0)';
const SRC={
  oni:'NOAA Climate Prediction Center: Oceanic Niño Index (ERSST v5) and Niño 1+2 / 3.4 indices (OISST v2.1), public domain.',
  sst:`Sea temperature: ERA5 monthly averaged reanalysis, anomaly vs 1991–2020 (Hersbach et al., 2023, doi:10.24381/cds.f17050d7). ${C3S}.`,
  rain:`Rain: ERA5 monthly averaged reanalysis, 0.5°, land cells, vs 1991–2020 (Hersbach et al., 2023, doi:10.24381/cds.f17050d7). ${C3S}.`,
  fire:'NASA FIRMS, MODIS Collection 6.1 active fires, vegetation fires, confidence ≥ 30 % (doi:10.5067/FIRMS/MODIS/MCD14ML). We acknowledge the use of data from LANCE FIRMS operated by NASA ESDIS. r: correlation with ERA5 dry-season rain.',
  stake:'Species: GBIF.org occurrence search, 18 Nov 2026; threatened = IUCN Red List categories CR, EN, VU as linked by GBIF; counts show what has been recorded, not everything that lives there. Fire CO₂: GFED5.1 (van der Werf, Chen et al., doi:10.5281/zenodo.16794692, CC BY 4.0) to 2022, then CAMS GFAS estimates scaled to GFED5.1 (contains modified Copernicus Atmosphere Monitoring Service information, 2026). Uptake: MODIS MOD17A3HGF v6.1, NASA LP DAAC (doi:10.5067/MODIS/MOD17A3HGF.061).',
  map:'Base map: Natural Earth, public domain.'};

// --- chapters ---
const CH=[
 {rail:0,t:'2026-10',z:'world',l:'sst',state:'Sea temperature',kick:'El Niño-Driven Wildfires',h1:'Two rainforests, one latitude',
  body:'<p>The Amazon and Borneo sit on the same band of the tropics (6°N–5°S), at opposite ends of the Pacific. Every few years El Niño dries them both. What happens next depends on who lights the fire.</p>',
  extra:'<div class="ct">How this page works</div><div class="facts"><div><b>5</b>steps: El Niño, ocean, dryness, wildfire, what is at stake</div><div><b>1</b>dataset per step, shown one after another</div><div><b>2</b>study areas, the orange frames on the map</div></div>',
  src:[SRC.sst,SRC.map],next:'Scroll: El Niño'},
 {rail:1,t:'2015-12',z:'world',l:'sst',state:'Sea temperature',kick:'1 · El Niño',h:'The Pacific warms',
  body:'<p>Every two to seven years the equatorial Pacific warms. In 2015–16 the El Niño index reached +2.6. In 2026 it is at +2.5 again: a strong El Niño under way.</p>',
  chartTitle:'El Niño index (ONI) by month · NOAA',chart:oniChart,src:[SRC.oni],next:'Scroll: the ocean'},
 {rail:2,t:'2026-10',z:'world',l:'sst',state:'Sea temperature',kick:'2 · Ocean',h:'Warm water piles up off South America',
  body:'<p>The warm water gathers along the coast of Peru. The rising air that brings rain to both forests moves out to the central Pacific with it.</p>',
  extra:()=>`<div class="ct">Sea off Peru (Niño 1+2) vs normal</div><div class="big"><div><b>${sgn(nino12('2015-12'))} °C</b><span>December 2015</span></div><div><b>${sgn(nino12(ENSO.months.at(-1)))} °C</b><span>${MES[+ENSO.months.at(-1).slice(5)-1]} ${ENSO.months.at(-1).slice(0,4)}</span></div></div>`,
  src:[SRC.sst,SRC.oni],next:'Scroll: dryness on land'},
 {rail:3,t:'2015-09',z:'borneo',l:'tp',state:'Rain',kick:'3 · Dryness on land',h:'El Niño dries both forests',
  body:()=>{const a=rainPct('amazon',[9,10,11]).find(d=>d[0]===2023);return `<p>Over the forests the air now sinks: fewer clouds, less rain, more heat. In Borneo the driest dry seasons of the last twenty years are the El Niño years.${a?` In late 2023 the Amazon got ${Math.abs(a[1])}% less rain than normal.`:''}</p>`;},
  chartTitle:'Borneo · rain Aug–Oct vs normal',chart:rainChart,after:'<p class="note">The map shows rain in mm per day; a rain-vs-normal layer is the next build step.</p>',src:[SRC.rain],next:'Scroll: wildfire'},
 {rail:4,t:'2015-09',z:'borneo',l:'fire',state:'Fire hotspots',kick:'4 · Wildfire',h:'In Borneo, fire follows the drought',
  body:'<p>In September–November 2015 Borneo had 7.4 times more fire hotspots than in the same months of neutral years. The less it rains, the more it burns.</p>',
  chartTitle:'Fire hotspots, Sep–Nov of each year',chart:fireChart,src:[SRC.fire],next:'Scroll: the Amazon'},
 {rail:4,t:'2015-09',z:'amazon',l:'fire',state:'Fire hotspots',kick:'4 · Wildfire',h:'In the Amazon, people light it every year',
  body:'<p>The same months of 2015 had only 1.3 times more hotspots than usual, and the link with rain is weak. Fire comes every year, El Niño or not: forest clearing and farm burning.</p><p><b>Dryness is the condition; people are the spark.</b></p>',
  src:[SRC.fire],next:'Scroll: what is at stake'},
 {rail:5,t:'2026-10',z:'world',l:'fireyear',q:()=>`&fy=amazon:${stake('amazon').worstY},borneo:${stake('borneo').worstY}&lab=stake`,
  stateFull:()=>`Fire hotspots in the worst year · Amazon ${stake('amazon').worstY} · Borneo ${stake('borneo').worstY}`,state:'',kick:'5 · What is at stake',h:'A quarter of Borneo’s mammals are threatened',
  body:()=>{const b=stake('borneo');return `<p>Two of the richest forests on Earth. In ${b.worstY}, Borneo’s fires released ${b.worst}% of the CO₂ its forest takes up in a year${b.ytd!=null?`; in ${b.last} it is already ${b.ytd}%`:''}.</p><p class="note">Map: every fire hotspot of each forest’s worst fire year, with what is at stake written beside it.</p>`;},
  chartTitle:'Amazon vs Borneo',chart:stakeChart,src:[SRC.stake,SRC.fire],next:'Scroll: explore'},
 {rail:6,t:'2026-10',z:'world',l:'wind,sst,fire,rivers',state:'All layers',kick:'6 · Explore',h:'Every layer, any month',
  body:'<p>Switch on wind, clouds, rain or fire for any month from 2005 to 2026, or compare the two forests side by side.</p>',
  extra:'<a class="btn solid" href="index.html">Open the explorer →</a><a class="btn" href="index.html#compare">Compare the two forests →</a>',src:[SRC.map]}];
const RAIL=['Opening','El Niño','Ocean','Dryness','Fire','At stake','Explore'];

const val=v=>typeof v==='function'?v():v||'';
const story=document.getElementById('story');
story.innerHTML=CH.map((c,i)=>`<section class="chapter" id="ch${i}" data-i="${i}"><article class="card">
  <div class="kick">${c.kick}</div>${c.h1?`<h1>${c.h1}</h1>`:`<h2>${c.h}</h2>`}${val(c.body)}
  ${c.chart?`<div class="ct">${c.chartTitle}</div><div class="chart">${c.chart()}</div>`:''}${val(c.extra)}${val(c.after)}
  ${c.next?`<div class="next">↓  ${c.next}</div>`:''}<div class="src">Sources · ${c.src.join(' ')}</div></article></section>`).join('');
const rail=document.getElementById('rail');
rail.innerHTML=RAIL.map((n,r)=>`<a href="#ch${CH.findIndex(c=>c.rail===r)}" data-r="${r}"><i></i>${r} ${n}</a>`).join('');

const frame=document.getElementById('mapframe'),state=document.getElementById('state');let cur=-1;
function go(i){if(i===cur)return;cur=i;const c=CH[i];
  // only the fragment changes, so the map page is not reloaded
  frame.src=`index.html#t=${c.t}&z=${c.z}&ui=0&l=${c.l}${val(c.q)}`;
  state.textContent=c.stateFull?val(c.stateFull):`${MES[+c.t.slice(5)-1].toUpperCase()} ${c.t.slice(0,4)} · ${c.state}`;
  rail.querySelectorAll('a').forEach(a=>a.classList.toggle('on',+a.dataset.r===c.rail));}
// the chapter that crosses the middle of the screen sets the map
const secs=[...document.querySelectorAll('.chapter')];let tick=false;
function pick(){tick=false;const mid=innerHeight/2;let i=0;secs.forEach((s,k)=>{if(s.getBoundingClientRect().top<=mid)i=k;});go(i);}
addEventListener('scroll',()=>{if(!tick){tick=true;setTimeout(pick,60);}},{passive:true});
addEventListener('resize',pick);
pick();
})();
