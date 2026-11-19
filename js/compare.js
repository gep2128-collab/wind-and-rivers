// Comparison section: Amazon vs Borneo, built from the project's data files.
// Data: ENSO (NOAA), CLIMA (ERA5), FUEGO (NASA FIRMS), CO2 (GFED5.1 / CAMS GFAS), OXIGENO (MODIS NPP), ESPECIES (GBIF + IUCN categories).
(function(){
  const REG={amazon:{name:'Amazon',pilot:'Madre de Dios, Peru',z:'amazon'},borneo:{name:'Borneo',pilot:'Central Kalimantan, Indonesia',z:'borneo'}};
  const nf=(v,d=0)=>v==null||isNaN(v)?'—':v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
  const sg=(v,d=1)=>v==null?'—':(v>0?'+':v<0?'−':'')+nf(Math.abs(v),d);
  const phase={};if(window.ENSO)ENSO.months.forEach((m,i)=>phase[m]=ENSO.phase[i]);
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;

  // area of a lon/lat box on the sphere, km²
  function boxArea(b){const R=6371.0088,[w,s,e,n]=b;return R*R*(e-w)*Math.PI/180*(Math.sin(n*Math.PI/180)-Math.sin(s*Math.PI/180));}
  const lat=v=>`${Math.abs(v)}°${v<0?'S':'N'}`,lon=v=>`${Math.abs(v)}°${v<0?'W':'E'}`;

  // average by El Niño phase: {nino, neutral}
  function byPhase(months,vals){const g={1:[],0:[]};months.forEach((m,i)=>{const p=phase[m],v=vals[i];if(v!=null&&(p===1||p===0))g[p].push(v);});return{nino:mean(g[1]),neutral:mean(g[0])};}

  function yearly(months,vals){const y={};months.forEach((m,i)=>{if(vals[i]==null)return;const k=m.slice(0,4);(y[k]=y[k]||[]).push(vals[i]);});
    const out={};for(const k in y)if(y[k].length===12)out[k]=y[k].reduce((a,b)=>a+b,0);return out;}

  function card(r){
    const R=REG[r],b=ZONES[r].b,S=[];
    // --- forest and air (MODIS NPP) ---
    const O=window.OXIGENO&&OXIGENO.regions[r],o=O&&(O['2022']||O[Object.keys(O).pop()]);
    // --- fire CO2 ---
    let co2Avg=null,co2Max=null,co2MaxY=null,ytd=null;
    if(window.CO2&&CO2.regions[r]){const Y=yearly(CO2.months,CO2.regions[r].co2_mt);const ks=Object.keys(Y);
      co2Avg=mean(ks.map(k=>Y[k]));for(const k of ks)if(co2Max==null||Y[k]>co2Max){co2Max=Y[k];co2MaxY=k;}
      // the current year is not complete: show it apart, marked as an estimate
      const c=CO2.regions[r],ly=CO2.months[CO2.months.length-1].slice(0,4);if(!Y[ly]){let v=0,n=0;CO2.months.forEach((m,i)=>{if(m.startsWith(ly)&&c.co2_mt[i]!=null){v+=c.co2_mt[i];n++;}});ytd={y:ly,v,n,to:CO2.months[CO2.months.length-1]};}}
    // --- hotspots by phase ---
    let hot=null;if(window.FUEGO&&FUEGO.regions[r])hot=byPhase(FUEGO.months,FUEGO.regions[r].hotspots);
    // --- climate in El Niño months ---
    let t=null,p=null;if(window.CLIMA&&CLIMA.regions[r]){const c=CLIMA.regions[r];t=byPhase(CLIMA.months,c.t2m.anom).nino;
      const pa=byPhase(CLIMA.months,c.tp.anom).nino,pn=mean(c.tp.normal);p=pn?100*pa/pn:null;}
    const E=window.ESPECIES&&ESPECIES.regions[r];
    // ic = icon from js/icons.js for what the number is about
    const ico=(n,sz)=>window.iconSvg&&n?iconSvg(n,sz):'';
    const st=(v,l,cls='',ic='')=>`<div class="stat"><b class="${cls}">${ico(ic,20)}${v}</b><span>${l}</span></div>`;
    const share=o&&co2Max!=null?100*co2Max/o.co2_uptake_mt:null;
    const lifeRow=(k,label,ic)=>E&&E[k]?`<tr><td>${ico(ic,15)}${label}</td><td>${nf(E[k].species)} species</td><td class="thr">${nf(E[k].threatened_pct,1)}% threatened</td></tr>`:'';
    return `<article class="card" data-r="${r}">
      <div><h3>${R.name.toUpperCase()}</h3><div class="where">${lat(b[1])}–${lat(b[3])} · ${lon(b[0])}–${lon(b[2])} · study area ${nf(boxArea(b)/1e6,2)} million km²</div></div>
      <div class="grp"><div class="gt">Forest and air · normal year (2022)</div><div class="stats">
        ${st(o?nf(o.o2_mt)+' Mt':'—','O₂ released by the vegetation in a year','cyan','leaf')}
        ${st(o?nf(o.co2_uptake_mt)+' Mt':'—','CO₂ taken up by the vegetation in a year','cyan','leaf')}
      </div></div>
      <div class="grp"><div class="gt">Fire</div><div class="stats">
        ${st(co2Avg!=null?nf(co2Avg)+' Mt':'—','CO₂ from fires per year, average of full years 2005–2025','red','cloud')}
        ${st(co2Max!=null?nf(co2Max)+' Mt':'—',co2MaxY?`CO₂ from fires in ${co2MaxY}, the worst year`+(share!=null?` · ${nf(share,1)}% of what the forest takes up in a year`:''):'Worst year','red','cloud')}
        ${ytd?st(nf(ytd.v)+' Mt',`CO₂ from fires in ${ytd.y} so far (Jan–${MES[+ytd.to.slice(5)-1]}, estimate)`+(o?` · ${nf(100*ytd.v/o.co2_uptake_mt,1)}% of a year's uptake`:''),'red','cloud'):''}
        ${st(hot&&hot.neutral?'×'+nf(hot.nino/hot.neutral,2):'—','Fire hotspots in El Niño months vs neutral months','org','flame')}
        ${st(t!=null?sg(t)+' °C':'—',`Air temperature in El Niño months vs normal${p!=null?` · rain ${sg(p,0)}%`:''}`,'org','thermo')}
      </div></div>
      <div class="grp"><div class="gt">Life recorded in the area</div>
        <table class="life">${lifeRow('plants','Plants','leaf')}${lifeRow('animals','Animals','bug')}${lifeRow('mammals','· Mammals','mammal')}${lifeRow('birds','· Birds','bird')}${lifeRow('amphibians','· Amphibians','amphibian')}</table>
      </div>
      <button class="go" data-r="${r}">Start a fire in ${R.pilot} →</button>
    </article>`;
  }

  const cards=document.getElementById('cards');if(!cards)return;
  cards.innerHTML=card('amazon')+card('borneo');
  document.getElementById('cmpNote').innerHTML=
    'Study area = the dotted frame on the map. O₂ and CO₂ uptake: MODIS net primary production (NASA); a mature forest also uses up most of this O₂, so its net oxygen output is close to zero. '+
    'Fire CO₂: GFED5.1 to 2022, then CAMS GFAS estimates. Hotspots: NASA FIRMS. Climate: ERA5 land average vs 1991–2020. '+
    'Species: distinct species with georeferenced records in GBIF.org; threatened = IUCN Red List categories CR, EN or VU. Records are uneven, so counts show what has been recorded, not everything that lives there.';
  cards.addEventListener('click',e=>{
    const btn=e.target.closest('button.go');if(!btn)return;const r=btn.dataset.r,R=REG[r];
    document.getElementById('simTitle').textContent=`${R.name} · ${R.pilot}`;
    document.getElementById('simText').textContent='The interactive fire simulator for this pilot area is the next build step (phase 4): you will click a point to start a fire and watch it spread with the month\'s wind, rain and vegetation.';
    document.getElementById('sim').scrollIntoView({behavior:'smooth'});
  });
})();
