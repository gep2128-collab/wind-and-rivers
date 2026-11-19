// Phase 3: fire hotspots (NASA FIRMS) and fire emissions (GFED5.1), loaded automatically.
// Loaded before app.js; uses its globals (proj, tm, Y0, drawRad) only when called.
// Data: data/public/fuego/*.js, data/public/fuego_mensual.js (FIRMS) and data/public/co2_regional.js (GFED5.1),
// built by scripts/fase3_firms.py and scripts/fase3_gfed.py.

const FIRE={years:{},loading:{},
  add(f){
    const ms={};
    for(const k in f.months){const b=atob(f.months[k]),a=new Uint16Array(b.length/2);for(let i=0;i<a.length;i++)a[i]=b.charCodeAt(2*i)|(b.charCodeAt(2*i+1)<<8);ms[k]=a;}
    (this.years[f.region]||(this.years[f.region]={}))[f.year]=Object.assign(f,{months:ms});
    fireCache.key=null;drawRad();
  }};
window.FIRE=FIRE;

function fireLoad(r,y){
  const m=window.FIRE_INFO&&FIRE_INFO.regions[r],id=r+y;if(!m||FIRE.loading[id])return;
  if(y<+m.first.slice(0,4)||y>+m.last.slice(0,4))return;
  FIRE.loading[id]=true;
  const s=document.createElement('script');s.src=`data/public/fuego/${r}_${y}.js`;s.onerror=()=>{FIRE.loading[id]=false;};
  document.head.appendChild(s);
}
function fireSync(y){if(window.FIRE_INFO)for(const r in FIRE_INFO.regions)fireLoad(r,y);}

// Hotspots per 0.5° cell and month: yellow → red → dark red, transparent where there is none.
const FIRE_LUT=[...Array(256)].map((_,i)=>{const t=i/255,q=d3.rgb(d3.interpolateYlOrRd(.25+.75*t));return[q.r,q.g,q.b,Math.round((.55+.45*t)*255)];});
let fireCache={key:null,imgs:[]};
function drawFire(c,key){
  if(!window.FIRE_INFO)return;
  if(fireCache.key!==key){
    fireCache={key,imgs:[]};const y=+key.slice(0,4);
    for(const r in FIRE_INFO.regions){
      const d=FIRE.years[r]&&FIRE.years[r][y];if(!d){fireLoad(r,y);continue;}
      const arr=d.months[key];if(!arr)continue;
      const cv=document.createElement('canvas');cv.width=d.nx;cv.height=d.ny;
      const o=cv.getContext('2d'),img=o.createImageData(d.nx,d.ny);
      for(let n=0;n<arr.length;n++){if(!arr[n])continue;const t=Math.min(255,Math.round(Math.log10(arr[n])/Math.log10(500)*255));img.data.set(FIRE_LUT[t],n*4);}
      o.putImageData(img,0,0);fireCache.imgs.push({cv,d});
    }
  }
  c.globalAlpha=1;c.imageSmoothingEnabled=false;
  for(const {cv,d} of fireCache.imgs){
    const a=proj([d.lon0-d.dlon/2,d.lat0-d.dlat/2]),b=proj([d.lon0+(d.nx-.5)*d.dlon,d.lat0+(d.ny-.5)*d.dlat]);
    c.drawImage(cv,a[0],a[1],b[0]-a[0],b[1]-a[1]);
  }
  c.imageSmoothingEnabled=true;
}
// Whole-year view (story map, chapter 5): hotspots summed over the 12 months of one year per region.
// FIRE_YEAR = {amazon: 2024, borneo: 2015}, set from the URL (fy=amazon:2024,borneo:2015 or fy=2015).
let FIRE_YEAR={},fireYearCache={key:null,imgs:[]};
function drawFireYear(c){
  if(!window.FIRE_INFO)return;const key=JSON.stringify(FIRE_YEAR);
  if(fireYearCache.key!==key){
    let ready=true;const imgs=[];
    for(const r in FIRE_INFO.regions){
      const y=FIRE_YEAR[r];if(!y)continue;const d=FIRE.years[r]&&FIRE.years[r][y];if(!d){fireLoad(r,y);ready=false;continue;}
      const sum=new Uint32Array(d.nx*d.ny);for(const k in d.months){const a=d.months[k];for(let n=0;n<a.length;n++)sum[n]+=a[n];}
      const cv=document.createElement('canvas');cv.width=d.nx;cv.height=d.ny;const o=cv.getContext('2d'),img=o.createImageData(d.nx,d.ny);
      for(let n=0;n<sum.length;n++){if(!sum[n])continue;const t=Math.min(255,Math.round(Math.log10(sum[n])/Math.log10(3000)*255));img.data.set(FIRE_LUT[t],n*4);}
      o.putImageData(img,0,0);imgs.push({cv,d});
    }
    fireYearCache={key:ready?key:null,imgs};
  }
  c.globalAlpha=1;c.imageSmoothingEnabled=false;
  for(const {cv,d} of fireYearCache.imgs){
    const a=proj([d.lon0-d.dlon/2,d.lat0-d.dlat/2]),b=proj([d.lon0+(d.nx-.5)*d.dlon,d.lat0+(d.ny-.5)*d.dlat]);
    c.drawImage(cv,a[0],a[1],b[0]-a[0],b[1]-a[1]);
  }
  c.imageSmoothingEnabled=true;
}
function fireAt(lon,lat,key){
  if(!window.FIRE_INFO)return null;const y=+key.slice(0,4);
  for(const r in FIRE_INFO.regions){
    const d=FIRE.years[r]&&FIRE.years[r][y],arr=d&&d.months[key];if(!arr)continue;
    const i=Math.floor((lon-(d.lon0-d.dlon/2))/d.dlon),j=Math.floor((lat-(d.lat0-d.dlat/2))/d.dlat);
    if(i>=0&&j>=0&&i<d.nx&&j<d.ny)return arr[j*d.nx+i];
  }
  return null;
}

// Monthly fire summary per region: hotspots (FIRMS) and, when available, CO₂ and burned area (GFED5.1).
function fireSummary(key){
  const F=window.FUEGO,G=window.CO2;if(!F)return'';
  const i=F.months.indexOf(key),gi=G?G.months.indexOf(key):-1,out=[];
  for(const [r,n] of [['amazon','Amazon'],['borneo','Borneo']]){
    const s=F.regions[r];if(!s||i<0)continue;let t=`<b>${n}</b> ${s.hotspots[i].toLocaleString('en')} fire hotspots`;
    const g=G&&G.regions[r];
    if(g&&gi>=0){t+=` · ${Math.round(g.burned_ha[gi]).toLocaleString('en')} ha burned · ${g.co2_mt[gi].toFixed(1)} Mt CO₂`;}
    out.push(`<div>${t}</div>`);
  }
  return out.join('');
}
