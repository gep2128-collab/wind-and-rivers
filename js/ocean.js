// Phase 1: sea surface temperature anomaly layer and El Niño timeline.
// Loaded before app.js; uses its globals (proj, tm, Y0, layers, MES) only when called.
// Data: data/public/enso.js (NOAA CPC) and data/public/sst/*.js (ERA5, Copernicus C3S).

const SST_ANOM={years:{},loading:{},onload:null,
  add(d){
    const ms={};
    for(const k in d.months){const b=atob(d.months[k]),a=new Int8Array(b.length);for(let i=0;i<b.length;i++)a[i]=(b.charCodeAt(i)<<24)>>24;ms[k]=a;}
    d.months=ms;this.years[d.year]=d;this.onload&&this.onload(d.year);
  }};
window.SST_ANOM=SST_ANOM;

const SST_MAX=3; // °C at full colour
function sstColor(v){ // v in °C → [r,g,b,a]; normal sea stays dark so warm and cold stand out
  const t=Math.max(-1,Math.min(1,v/SST_MAX)),q=d3.rgb(d3.interpolateRdBu(.5-t/2));
  return[q.r,q.g,q.b,Math.round((.04+.91*Math.min(1,Math.abs(t)*1.6))*255)];
}
const SST_LUT=new Uint8ClampedArray(256*4);
for(let i=-127;i<=127;i++)SST_LUT.set(sstColor(i/10),(i+128)*4);

function monthKey(){const f=Math.floor(tm);return(Y0+Math.floor(f/12))+'-'+String(f%12+1).padStart(2,'0');}

function sstLoad(y){
  if(!window.SST_INFO||SST_ANOM.years[y]||SST_ANOM.loading[y])return;
  if(y<+SST_INFO.first.slice(0,4)||y>+SST_INFO.last.slice(0,4))return;
  SST_ANOM.loading[y]=true;
  const s=document.createElement('script');s.src=`data/public/sst/sst_anom_${y}.js`;s.onerror=()=>{SST_ANOM.loading[y]=false;};
  document.head.appendChild(s);
}
SST_ANOM.onload=()=>{drawRad();};

let sstCache={key:null,cv:null};
function sstFrame(){
  const key=monthKey(),y=+key.slice(0,4),d=SST_ANOM.years[y];
  if(!d){sstLoad(y);return null;}
  const arr=d.months[key];if(!arr)return null;
  if(sstCache.key!==key){
    const cv=sstCache.cv||document.createElement('canvas');cv.width=d.nx;cv.height=d.ny;
    const o=cv.getContext('2d'),img=o.createImageData(d.nx,d.ny);
    for(let n=0;n<arr.length;n++){if(arr[n]===-128)continue;img.data.set(SST_LUT.subarray((arr[n]+128)*4,(arr[n]+128)*4+4),n*4);}
    o.putImageData(img,0,0);sstCache={key,cv,d};
  }
  return sstCache;
}
function drawSST(c){
  const f=sstFrame();if(!f)return;const d=f.d,hx=Math.abs(d.dlon)/2,hy=Math.abs(d.dlat)/2;
  // clamp to ±180 so the projection does not wrap the left edge to the far right
  const a=proj([Math.max(-180,d.lon0-hx),d.lat0+hy]),b=proj([Math.min(180,d.lon0+(d.nx-1)*d.dlon+hx),d.lat0+(d.ny-1)*d.dlat-hy]);
  c.globalAlpha=1;c.imageSmoothingEnabled=true;c.drawImage(f.cv,a[0],a[1],b[0]-a[0],b[1]-a[1]);
}
function sstAt(lon,lat){
  const d=SST_ANOM.years[+monthKey().slice(0,4)],arr=d&&d.months[monthKey()];if(!arr)return null;
  const i=Math.round((lon-d.lon0)/d.dlon),j=Math.round((lat-d.lat0)/d.dlat);
  if(i<0||j<0||i>=d.nx||j>=d.ny)return null;const v=arr[j*d.nx+i];return v===-128?null:v/10;
}

// ---- El Niño timeline (ONI) ----
const ensoIdx={};if(window.ENSO)ENSO.months.forEach((m,i)=>ensoIdx[m]=i);
function lastDataTm(){
  if(!window.ENSO)return null;const m=ENSO.months[ENSO.months.length-1];
  return(+m.slice(0,4)-Y0)*12+(+m.slice(5)-1);
}
function ensoAt(key){const i=ensoIdx[key];return i==null?null:{oni:ENSO.oni[i],n12:ENSO.nino12[i],n34:ENSO.nino34[i],phase:ENSO.phase[i]};}
const fmt=v=>v==null?'—':(v>0?'+':'')+v.toFixed(2);

const ensoC=document.getElementById('ensoC');
function drawEnso(){
  if(!window.ENSO||!ensoC)return;
  const h=56,w=ensoC.clientWidth,r=Math.min(2,devicePixelRatio||1);ensoC.style.height=h+'px';
  if(ensoC.width!==Math.round(w*r)||ensoC.height!==h*r){ensoC.width=Math.round(w*r);ensoC.height=h*r;}
  const c=ensoC.getContext('2d');c.setTransform(r,0,0,r,0,0);c.clearRect(0,0,w,h);
  const y0=+ENSO.months[0].slice(0,4),n=(+ENSO.months[ENSO.months.length-1].slice(0,4)-y0+1)*12,bw=w/n,mid=h/2-6,sc=(h/2-10)/2.6;
  c.strokeStyle='rgba(255,255,255,.18)';c.beginPath();c.moveTo(0,mid);c.lineTo(w,mid);c.stroke();
  ENSO.months.forEach((m,i)=>{
    const v=ENSO.oni[i];if(v==null)return;const x=i*bw,p=ENSO.phase[i];
    c.fillStyle=p===1?'#e34948':p===-1?'#3987e5':'rgba(255,255,255,.35)';
    c.fillRect(x,v>0?mid-v*sc:mid,Math.max(1,bw-.3),Math.abs(v)*sc);
  });
  c.font='10px "IBM Plex Mono",monospace';c.fillStyle='#9c9a92';c.textAlign='center';
  for(let y=y0;y<=y0+n/12;y++){if((y-y0)%3)continue;const x=(y-y0)*12*bw;c.fillRect(x,h-14,1,4);c.fillText(y,x,h-2);}
  const k=monthKey(),i=ensoIdx[k]!=null?ensoIdx[k]:(+k.slice(0,4)-y0)*12+(+k.slice(5)-1);
  c.fillStyle='#ecebe6';c.fillRect(i*bw+bw/2-1,0,2,h-16);
}
function ensoSync(){
  const k=monthKey(),e=window.ENSO&&ensoAt(k),el=document.getElementById('ensoNow');
  if(el){
    if(!e)el.innerHTML='<span class="mut">No El Niño data for this month</span>';
    else{const lab=e.phase===1?'<b class="nino">El Niño</b>':e.phase===-1?'<b class="nina">La Niña</b>':'<b>Neutral</b>';
      el.innerHTML=`${lab} · ONI ${e.oni==null?'pending':fmt(e.oni)} · Niño 1+2 ${fmt(e.n12)} °C`;}
  }
  const y=+k.slice(0,4);sstLoad(y);sstLoad(y+1);
  drawEnso();
}
if(ensoC){
  const pick=ev=>{
    const rc=ensoC.getBoundingClientRect(),y0=+ENSO.months[0].slice(0,4),n=(+ENSO.months[ENSO.months.length-1].slice(0,4)-y0+1)*12;
    let i=Math.floor((ev.clientX-rc.left)/rc.width*n);i=Math.max(0,Math.min(ENSO.months.length-1,i));
    tm=(y0-Y0)*12+i;syncUI();drawRad();
  };
  let drag=false;
  ensoC.addEventListener('pointerdown',e=>{drag=true;ensoC.setPointerCapture(e.pointerId);pick(e);});
  ensoC.addEventListener('pointermove',e=>{if(drag)pick(e);});
  ensoC.addEventListener('pointerup',()=>drag=false);
  addEventListener('resize',drawEnso);
}
