// Phase 2: ERA5 air layers and regional climate, loaded automatically.
// Loaded before app.js; uses its globals (DATA, tm, Y0, drawRad, seed, MES) only when called.
// Data: data/public/era5/*.js and data/public/clima_regional.js (ERA5, Copernicus C3S, CC BY 4.0),
// built by scripts/fase2_aire.py.

const AIR={sets:{},loading:{},
  // Decode one region-year file into the same shape as a loaded ERA5 JSON (see app.js DATA).
  add(f){
    const d=this.sets[f.region];if(!d)return;const q=AIR_INFO.quant;
    for(const key in f.months){
      const i=d.idx[key];if(i==null)continue;
      for(const k in q){
        if(!f.months[key][k])continue; // the world-wide grid only carries wind, clouds and radiation
        const b=atob(f.months[key][k]),a=new Float32Array(b.length),[sc,off]=q[k],div=k==='tcc'?100:1;
        for(let n=0;n<b.length;n++){const v=(b.charCodeAt(n)<<24)>>24;a[n]=v===-128?NaN:(v*sc+off)/div;}
        d[k][i]=a;
      }
    }
    const first=!this.ready;this.ready=true;
    if(first)seed();
    drawRad();
  }};
window.AIR=AIR;

if(window.AIR_INFO){
  for(const r in AIR_INFO.regions){
    const m=AIR_INFO.regions[r],d={name:'ERA5 '+r,builtin:true,nx:m.nx,ny:m.ny,lon0:m.lon0,lat0:m.lat0,dlon:m.dlon,dlat:m.dlat,
      times:[],idx:{},region:r};
    for(const k in AIR_INFO.quant)d[k]=[];
    let y=+m.first.slice(0,4),mo=+m.first.slice(5);
    while(`${y}-${String(mo).padStart(2,'0')}`<=m.last){const key=`${y}-${String(mo).padStart(2,'0')}`;d.idx[key]=d.times.length;d.times.push(key);if(++mo>12){mo=1;y++;}}
    AIR.sets[r]=d;
  }
}
function airLoad(r,y){
  const m=window.AIR_INFO&&AIR_INFO.regions[r],id=r+y;if(!m||AIR.loading[id])return;
  if(y<+m.first.slice(0,4)||y>+m.last.slice(0,4))return;
  AIR.loading[id]=true;
  const s=document.createElement('script');s.src=`data/public/era5/${r}_${y}.js`;s.onerror=()=>{AIR.loading[id]=false;};
  document.head.appendChild(s);
}
// Load the year on screen and the next one, for every region.
function airSync(y){for(const r in AIR.sets){airLoad(r,y);airLoad(r,y+1);}}

// ---- Regional climate (land cells only) vs the 1991–2020 normal ----
function climaSync(key){
  const el=document.getElementById('climaNow');if(!el)return;
  const C=window.CLIMA,i=C?C.months.indexOf(key):-1;
  if(i<0){el.innerHTML='';return;}
  const sg=v=>(v>0?'+':'')+v.toFixed(1),row=(name,s)=>{
    const t=s.t2m,p=s.tp,h=s.rh,pct=p.value[i]-p.anom[i]>0?Math.round(p.anom[i]/(p.value[i]-p.anom[i])*100):0;
    const cls=v=>v>0?'warm':v<0?'cool':'';
    return`<div><b>${name}</b> ${t.value[i].toFixed(1)} °C <span class="${cls(t.anom[i])}">(${sg(t.anom[i])})</span> · rain ${p.value[i].toFixed(1)} mm/day <span class="${cls(-p.anom[i])}">(${pct>0?'+':''}${pct}%)</span> · humidity ${Math.round(h.value[i])}%</div>`;
  };
  el.innerHTML=Object.entries({amazon:'Amazon',borneo:'Borneo'}).filter(([r])=>C.regions[r]).map(([r,n])=>row(n,C.regions[r])).join('')
    +'<div class="mut">Land average · in brackets: difference from the 1991–2020 normal</div>';
}
