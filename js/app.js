;
const RAD=Math.PI/180;
const ZONES={amazon:{name:'Amazon',b:[-82,-21,-43,6]},borneo:{name:'Borneo',b:[108,-5,120,8]}};
const MES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLS=['#3987e5','#1baf7a','#9bc53d','#eda100','#eb6834','#e34948'];
const BRK=[2,4,6,8,11];

const stage=document.getElementById('stage');
const C={base:cBase,rad:cRad,riv:cRiv,part:cPart};
const X={};for(const k in C)X[k]=C[k].getContext('2d');
const proj=d3.geoEquirectangular();
let W=0,H=0,dpr=1,T=d3.zoomIdentity,landPath,riverGroups=[],riverLabels=[];
const land=topojson.feature(LAND,LAND.objects.land);
const layers={wind:true,rivers:true,sst:true,rad:false,cloud:false};

let Y0=2005,Y1=2026,tm=0;tm=lastDataTm()??(2024-Y0)*12;
let playing=false,DATA=[];

function resize(){
  dpr=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;
  for(const k in C){C[k].width=W*dpr;C[k].height=H*dpr;}
  proj.fitExtent([[0,0],[W,H]],{type:'Sphere'});
  const gp=d3.geoPath(proj);
  landPath=new Path2D(gp(land));
  buildRivers();
  redrawStatic();
}
function buildRivers(){
  const groups={};riverLabels=[];const best={};
  for(const z in RIVERS)for(const r of RIVERS[z]){
    const g=r.r<=2?0:r.r<=4?1:r.r<=6?2:3;
    const p=groups[g]||(groups[g]=new Path2D());
    r.c.forEach((c,i)=>{const q=proj(c);i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]);});
    if(r.n&&r.r<=7&&(!best[r.n]||r.c.length>best[r.n].c.length))best[r.n]=r;
  }
  riverGroups=[0,1,2,3].filter(g=>groups[g]).map(g=>({p:groups[g],w:[2.6,1.9,1.4,0.9][g]}));
  for(const n in best){const c=best[n].c;riverLabels.push({n,r:best[n].r,p:proj(c[Math.floor(c.length/2)])});}
}
function setT(ctx){ctx.setTransform(dpr*T.k,0,0,dpr*T.k,dpr*T.x,dpr*T.y);}
function scr(lon,lat){const q=proj([lon,lat]);return[T.x+T.k*q[0],T.y+T.k*q[1]];}

function drawBase(){
  const c=X.base;c.setTransform(1,0,0,1,0,0);c.fillStyle='#000';c.fillRect(0,0,W*dpr,H*dpr);
  setT(c);c.fillStyle='#fff';c.fill(landPath);
  c.setTransform(dpr,0,0,dpr,0,0);
  for(const z in ZONES){
    const [w,s,e,n]=ZONES[z].b,a=scr(w,n),b=scr(e,s);
    c.strokeStyle='#eb6834';c.lineWidth=1.5;c.setLineDash([6,4]);c.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);c.setLineDash([]);
    c.font='500 13px "IBM Plex Mono",monospace';c.fillStyle='#eb6834';c.fillText(ZONES[z].name.toUpperCase(),a[0],a[1]-7);
  }
  if(layers.rivers&&T.k>2.5){
    c.font='italic 11px "IBM Plex Sans",sans-serif';c.fillStyle='#1d4f8f';
    for(const l of riverLabels){if(T.k<5&&l.r>5)continue;const x=T.x+T.k*l.p[0],y=T.y+T.k*l.p[1];if(x>0&&x<W&&y>0&&y<H)c.fillText(l.n,x+4,y-4);}
  }
}

function insol(lat,m){
  const doy=(m-1)*30.44+15,d=23.44*RAD*Math.sin(2*Math.PI*(doy-81)/365),ecc=1+0.033*Math.cos(2*Math.PI*doy/365),phi=lat*RAD;
  const h0=Math.acos(Math.max(-1,Math.min(1,-Math.tan(phi)*Math.tan(d))));
  return 1361/Math.PI*ecc*(h0*Math.sin(phi)*Math.sin(d)+Math.cos(phi)*Math.cos(d)*Math.sin(h0));
}
function monthF(){return ((tm%12)+12)%12+1;}
function drawRad(){
  const c=X.rad;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W*dpr,H*dpr);
  if(!layers.rad&&!layers.cloud&&!layers.sst)return;
  setT(c);
  if(layers.sst)drawSST(c);
  if(layers.rad){
    const ds=DATA.filter(d=>d.ssrd);
    if(ds.length){c.globalAlpha=.6;for(const d of ds)drawGrid(c,d,'ssrd',v=>d3.interpolateInferno(Math.min(1,v/320)));}
    else{c.globalAlpha=.5;const m=monthF(),a=proj([-180,90]),b=proj([180,-90]),g=c.createLinearGradient(0,a[1],0,b[1]);for(let lat=90;lat>=-90;lat-=2)g.addColorStop((90-lat)/180,d3.interpolateInferno(Math.max(0,insol(lat,m))/560));c.fillStyle=g;c.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);}
  }
  if(layers.cloud){
    c.globalAlpha=1;const ds=DATA.filter(d=>d.tcc);
    if(ds.length)for(const d of ds)drawGrid(c,d,'tcc',v=>`rgba(95,130,190,${(Math.max(0,Math.min(1,v))*.8).toFixed(2)})`);
    else{const a=proj([-180,90]),b=proj([180,-90]);c.imageSmoothingEnabled=true;c.drawImage(demoCloudImage(),a[0],a[1],b[0]-a[0],b[1]-a[1]);}
  }
  c.globalAlpha=1;
}
// Demo cloud cover (0-1), a rough climatology: ITCZ band that follows the season,
// mid-latitude storm tracks, monsoons, Amazon and Borneo convection, and stratocumulus decks.
function demoCloud(lon,lat,m,yr){
  const itcz=2.5+7*Math.sin(2*Math.PI*(m-4.5)/12),enso=Math.sin(yr*2.13+.7);
  const g=(x0,y0,sx,sy)=>Math.exp(-(((lon-x0)/sx)**2)-(((lat-y0)/sy)**2));
  const winterN=.5+.5*Math.cos(2*Math.PI*(m-1)/12),wetAm=.5+.5*Math.cos(2*Math.PI*(m-2)/12),wetBo=.5+.5*Math.cos(2*Math.PI*(m-12)/12),jja=.5-.5*Math.cos(2*Math.PI*(m-1)/12);
  let v=.12;
  v+=.55*Math.exp(-(((lat-itcz)/7)**2));
  v+=(.45+.15*(lat>0?winterN:1-winterN))*Math.exp(-(((Math.abs(lat)-55)/12)**2));
  v+=(.35+.35*wetAm)*g(-62,-6,14,11);
  v+=(.5+.25*wetBo-.15*enso)*g(114,1,14,9);
  v+=.5*jja*g(82,20,18,9);
  v+=.45*(g(-82,-18,9,8)+g(5,-18,9,7)+g(-125,27,10,7));
  v-=.25*(Math.exp(-(((lat-24)/7)**2))+Math.exp(-(((lat+26)/7)**2)))*(1-g(114,1,25,15));
  v+=.18*Math.sin(lon*RAD*7+yr*1.7+m*.9)*Math.cos(lat*RAD*9-yr*.8)+.1*Math.sin(lon*RAD*17-m*1.3)*Math.sin(lat*RAD*13+yr);
  return Math.max(0,Math.min(1,v));
}
let cloudCache={key:null,cv:null};
function demoCloudImage(){
  const m=monthF(),yr=Math.floor(tm/12),key=yr+'-'+m;
  if(cloudCache.key===key)return cloudCache.cv;
  const nx=360,ny=180,cv=cloudCache.cv||document.createElement('canvas');cv.width=nx;cv.height=ny;
  const o=cv.getContext('2d'),img=o.createImageData(nx,ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const v=demoCloud(-179.5+i,89.5-j,m,yr),n=(j*nx+i)*4;
    img.data[n]=95;img.data[n+1]=130;img.data[n+2]=190;img.data[n+3]=Math.round(v*v*.8*255);
  }
  o.putImageData(img,0,0);cloudCache={key,cv};return cv;
}
function frameOf(d){const f=Math.floor(tm);const key=(Y0+Math.floor(f/12))+'-'+String(f%12+1).padStart(2,'0');return d.idx[key];}
function drawGrid(c,d,k,col){
  const fi=frameOf(d);if(fi==null)return;const arr=d[k][fi],oc=document.createElement('canvas');oc.width=d.nx;oc.height=d.ny;
  const o=oc.getContext('2d'),img=o.createImageData(d.nx,d.ny);
  for(let n=0;n<arr.length;n++){const v=arr[n];if(v==null||isNaN(v))continue;const q=d3.color(col(v));img.data.set([q.r,q.g,q.b,Math.round((q.opacity??1)*255)],n*4);}
  o.putImageData(img,0,0);
  const hx=Math.abs(d.dlon)/2,hy=Math.abs(d.dlat)/2,lx=Math.min(d.lon0,d.lon0+(d.nx-1)*d.dlon),ty=Math.max(d.lat0,d.lat0+(d.ny-1)*d.dlat);
  const a=proj([lx-hx,ty+hy]),b=proj([lx+(d.nx-1)*Math.abs(d.dlon)+hx,ty-(d.ny-1)*Math.abs(d.dlat)-hy]);
  c.imageSmoothingEnabled=true;c.drawImage(oc,a[0],a[1],b[0]-a[0],b[1]-a[1]);
}
function redrawStatic(){drawBase();drawRad();X.part.setTransform(1,0,0,1,0,0);X.part.clearRect(0,0,W*dpr,H*dpr);}

function psi(lon,lat,t){
  const M=[[.12,.15,12,1.3,.7],[.21,.18,8,-.9,1.1],[.33,.29,4.5,.8,-.6],[.9,.8,1,1.7,1.2]];
  let u=0,v=0;
  for(const [a,b,A,wt,wq] of M){const p=a*lon+wt*t,q=b*lat+wq*t;u+=-A*b*Math.sin(p)*Math.cos(q);v+=A*a*Math.cos(p)*Math.sin(q);}
  return[u,v];
}
function demo(lon,lat,t){
  const m=monthF(),yr=Math.floor(tm/12),enso=Math.sin(yr*2.13+.7)*.25;
  const itcz=2.5+7*Math.sin(2*Math.PI*(m-4.5)/12);
  const ph=lat-itcz*Math.cos(lat*RAD),a=Math.abs(ph),sg=ph<0?-1:1;
  let u=a>60?-3*Math.sin((a-60)/30*Math.PI):-5.5*Math.cos(3*ph*RAD)*(a<30?1+enso:1);
  let v=a<30?-4*sg*Math.sin(a/30*Math.PI):a<60?2.5*sg*Math.sin((a-30)/30*Math.PI):-1.5*sg*Math.sin((a-60)/30*Math.PI);
  const mon=Math.cos(2*Math.PI*(m-7.5)/12);
  const gA=Math.exp(-(((lon-112)/22)**2)-(((lat-8)/14)**2));u+=5*mon*gA;v+=3.5*mon*gA;
  const gB=Math.exp(-(((lon-125)/25)**2)-(((lat+10)/8)**2));u+=-6*mon*gB;
  const gS=Math.exp(-(((lon+63)/6)**2)-(((lat+15)/9)**2)),djf=.6+.4*Math.cos(2*Math.PI*(m-1)/12);v+=-7*djf*gS;u+=-1*gS;
  const e=psi(lon,lat,t+yr*3.1);
  return[u+e[0],v+e[1]];
}
function sample(d,k,fi,lon,lat){
  const gx=(lon-d.lon0)/d.dlon,gy=(lat-d.lat0)/d.dlat;
  if(gx<0||gy<0||gx>d.nx-1||gy>d.ny-1)return null;
  const i=Math.min(d.nx-2,Math.floor(gx)),j=Math.min(d.ny-2,Math.floor(gy)),fx=gx-i,fy=gy-j,A=d[k][fi],n=d.nx;
  if(d.nx<2||d.ny<2)return A[0];
  return A[j*n+i]*(1-fx)*(1-fy)+A[j*n+i+1]*fx*(1-fy)+A[(j+1)*n+i]*(1-fx)*fy+A[(j+1)*n+i+1]*fx*fy;
}
function windAt(lon,lat,t){
  if(!DATA.length)return demo(lon,lat,t);
  for(const d of DATA){
    const fi=frameOf(d);if(fi==null)continue;
    const fr=tm-Math.floor(tm),f2=Math.min(fi+1,d.u.length-1);
    const u1=sample(d,'u',fi,lon,lat);if(u1==null)continue;
    const v1=sample(d,'v',fi,lon,lat),u2=sample(d,'u',f2,lon,lat),v2=sample(d,'v',f2,lon,lat);
    return[u1*(1-fr)+u2*fr,v1*(1-fr)+v2*fr];
  }
  return null;
}

let P=[];
function view(){
  const a=proj.invert(T.invert([0,0])),b=proj.invert(T.invert([W,H]));
  let w=Math.max(-180,a[0]),e=Math.min(180,b[0]),n=Math.min(85,a[1]),s=Math.max(-85,b[1]);
  if(DATA.length){const d=DATA[Math.floor(Math.random()*DATA.length)],lo=[d.lon0,d.lon0+(d.nx-1)*d.dlon].sort((x,y)=>x-y),la=[d.lat0,d.lat0+(d.ny-1)*d.dlat].sort((x,y)=>x-y);
    w=Math.max(w,lo[0]);e=Math.min(e,lo[1]);s=Math.max(s,la[0]);n=Math.min(n,la[1]);if(w>=e||s>=n)return null;}
  return[w,s,e,n];
}
function spawn(p,v){v=v||view();if(!v){p.dead=true;return;}p.dead=false;p.lon=v[0]+Math.random()*(v[2]-v[0]);p.lat=v[1]+Math.random()*(v[3]-v[1]);p.age=Math.floor(Math.random()*90);}
function seed(){const N=Math.round(Math.min(7000,W*H/170));P=[];const v=view();for(let i=0;i<N;i++){const p={};spawn(p,v);P.push(p);}}

let last=performance.now(),tau=0;
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;tau+=dt*.06;
  if(playing){tm+=dt/2.5;const ld=lastDataTm(),max=(ld!=null?ld+1:(Y1-Y0+1)*12)-1e-3;if(tm>max)tm=0;syncUI();}
  const c=X.part;c.setTransform(1,0,0,1,0,0);
  c.globalCompositeOperation='destination-in';c.fillStyle='rgba(0,0,0,.92)';c.fillRect(0,0,W*dpr,H*dpr);c.globalCompositeOperation='source-over';
  if(layers.wind){
    c.setTransform(dpr,0,0,dpr,0,0);c.lineWidth=1.25;c.lineCap='round';
    const degPx=proj.scale()*RAD*T.k,K=.22/degPx,b=COLS.map(()=>new Path2D()),v=view();
    for(const p of P){
      if(p.dead){if(Math.random()<.02)spawn(p,v);continue;}
      const w=windAt(p.lon,p.lat,tau);
      if(!w||++p.age>110){spawn(p,v);continue;}
      const sp=Math.hypot(w[0],w[1]),a=scr(p.lon,p.lat);
      p.lon+=w[0]*K/Math.max(.2,Math.cos(p.lat*RAD));p.lat+=w[1]*K;
      const q=scr(p.lon,p.lat);
      if(Math.abs(p.lon)>180||q[0]<0||q[0]>W||q[1]<0||q[1]>H||Math.abs(p.lat)>85){spawn(p,v);continue;}
      let k=0;while(k<BRK.length&&sp>BRK[k])k++;
      b[k].moveTo(a[0],a[1]);b[k].lineTo(q[0],q[1]);
    }
    b.forEach((pth,i)=>{c.strokeStyle=COLS[i];c.stroke(pth);});
  }
  const r=X.riv;r.setTransform(1,0,0,1,0,0);r.clearRect(0,0,W*dpr,H*dpr);
  if(layers.rivers){
    setT(r);r.lineCap='round';const s=Math.min(2.2,Math.sqrt(T.k)/1.4+.3);
    for(const g of riverGroups){r.setLineDash([]);r.strokeStyle='#1f5fb8';r.lineWidth=g.w*s/T.k;r.stroke(g.p);}
    for(const g of riverGroups){r.setLineDash([3/T.k,11/T.k]);r.lineDashOffset=-(now/1000*22)/T.k;r.strokeStyle='#9fe0ff';r.lineWidth=g.w*s*.8/T.k;r.stroke(g.p);}
    r.setLineDash([]);
  }
  requestAnimationFrame(frame);
}

const zoom=d3.zoom().scaleExtent([1,60]).on('zoom',e=>{T=e.transform;redrawStatic();
  document.querySelectorAll('#zoom button').forEach(b=>b.classList.remove('on'));});
d3.select(stage).call(zoom).on('dblclick.zoom',null);
function flyTo(z){
  let t=d3.zoomIdentity;
  if(z!=='world'){const [w,s,e,n]=ZONES[z].b,a=proj([w,n]),b=proj([e,s]);
    const top=40,bot=H-(W<760?270:150),k=.9*Math.min(W/(b[0]-a[0]),(bot-top)/(b[1]-a[1]));t=d3.zoomIdentity.translate(W/2-k*(a[0]+b[0])/2,(top+bot)/2-k*(a[1]+b[1])/2).scale(k);}
  d3.select(stage).transition().duration(1600).ease(d3.easeCubicInOut).call(zoom.transform,t)
    .on('end',()=>document.querySelector(`#zoom [data-z=${z}]`).classList.add('on'));
}
document.querySelectorAll('#zoom button').forEach(b=>b.onclick=()=>flyTo(b.dataset.z));

const yr=document.getElementById('yr'),mo=document.getElementById('mo');
function syncUI(){
  const f=Math.floor(tm),y=Y0+Math.floor(f/12),m=f%12+1;
  if(+yr.value!==y){yr.value=y;}if(+mo.value!==m){mo.value=m;}
  yrO.textContent=y;moO.textContent=MES[m-1];
  const txt=MES[m-1].toUpperCase()+' '+y;if(date.textContent!==txt){date.textContent=txt;drawRad();ensoSync();}
}
yr.oninput=mo.oninput=()=>{tm=(yr.value-Y0)*12+(mo.value-1);const ld=lastDataTm();if(ld!=null&&tm>ld)tm=ld;syncUI();drawRad();};
play.onclick=()=>{playing=!playing;play.textContent=playing?'❚❚ Pause':'▶ Play';};
document.querySelectorAll('#layers button').forEach(b=>b.onclick=()=>{layers[b.dataset.l]=!layers[b.dataset.l];b.classList.toggle('on',layers[b.dataset.l]);redrawStatic();updNote();});

function updNote(){
  const real=DATA.length>0;
  let s=real?`<b>Data loaded:</b> ${DATA.map(d=>d.name).join(', ')}. `:'<b>Demo mode.</b> The wind is a synthetic field (trade winds, an ITCZ that shifts by month, the Asian monsoon, the South American low-level jet), not measurements. Load a JSON converted from ERA5 to see real data. ';
  s+='Rivers: Natural Earth 10m, flow animated toward the river mouth. ';
  if(layers.sst)s+=`Sea temperature: monthly anomaly vs ${window.SST_INFO?SST_INFO.clim:'1991–2020'} from ERA5 (contains modified Copernicus Climate Change Service information, 2026); red = warmer than normal, blue = colder. El Niño bar: Oceanic Niño Index (ONI) and Niño 1+2, NOAA CPC. `;
  if(layers.rad)s+=DATA.some(d=>d.ssrd)?'Radiation: ERA5 surface solar radiation (W/m²). ':'Radiation: top-of-atmosphere insolation calculated from orbital geometry (W/m²); surface radiation requires ERA5 or CERES. ';
  if(layers.cloud)s+=DATA.some(d=>d.tcc)?'Clouds: ERA5 total cloud cover. ':'Clouds: synthetic cloud cover (demo), not measurements; load a JSON that includes tcc for real clouds. ';
  s+='Drag to pan, scroll to zoom.';
  note.innerHTML=s;
  legend.innerHTML=(layers.sst?'<div>Sea temp anomaly °C</div><div class="bar sb"></div><div style="display:flex;justify-content:space-between;width:160px"><span>−3</span><span>0</span><span>+3</span></div>':'')+(layers.wind?'<div>Wind m/s</div><div class="bar"></div><div style="display:flex;justify-content:space-between;width:160px"><span>0</span><span>6</span><span>12+</span></div>':'')
    +(layers.rad?'<div style="margin-top:4px">Radiation W/m²</div><div class="bar rb"></div><div style="display:flex;justify-content:space-between;width:160px"><span>0</span><span>'+(DATA.some(d=>d.ssrd)?'320':'560')+'</span></div>':'')
    +(layers.cloud?'<div style="margin-top:4px">Cloud cover</div><div style="height:8px;width:160px;border-radius:2px;background:linear-gradient(90deg,rgba(95,130,190,0),rgba(95,130,190,.8))"></div><div style="display:flex;justify-content:space-between;width:160px"><span>0%</span><span>100%</span></div>':'');
}
file.onchange=async e=>{
  for(const f of e.target.files){
    try{const d=JSON.parse(await f.text());if(!d.u||!d.v||!d.times)throw 0;
      d.name=f.name;d.idx={};d.times.forEach((t,i)=>d.idx[t.slice(0,7)]=i);DATA.push(d);
    }catch(_){note.innerHTML='<b>Could not read '+f.name+'.</b> Use the JSON produced by era5_to_json.py.';return;}
  }
  const ys=DATA.flatMap(d=>d.times.map(t=>+t.slice(0,4)));Y0=Math.min(...ys);Y1=Math.max(...ys);
  yr.min=Y0;yr.max=Y1;tm=Math.min(tm,(Y1-Y0+1)*12-1);if(tm<0)tm=0;
  seed();syncUI();redrawStatic();updNote();
};

stage.addEventListener('mousemove',e=>{
  const ll=proj.invert(T.invert([e.clientX,e.clientY]));if(!ll||Math.abs(ll[1])>90){probe.style.display='none';return;}
  const w=windAt(ll[0],ll[1],tau);
  probe.style.display='block';probe.style.left=(e.clientX+14)+'px';probe.style.top=(e.clientY+14)+'px';
  let s=`${Math.abs(ll[1]).toFixed(2)}°${ll[1]<0?'S':'N'} ${Math.abs(ll[0]).toFixed(2)}°${ll[0]<0?'W':'E'}`;
  if(w){const sp=Math.hypot(w[0],w[1]),dir=(Math.atan2(-w[0],-w[1])/RAD+360)%360;s+=` · ${sp.toFixed(1)} m/s from ${Math.round(dir)}°`;}
  if(layers.sst){const a=sstAt(ll[0],ll[1]);if(a!=null)s+=` · sea ${a>0?'+':''}${a.toFixed(1)} °C vs normal`;}
  probe.textContent=s;
});
stage.addEventListener('mouseleave',()=>probe.style.display='none');

addEventListener('resize',()=>{resize();seed();});
resize();seed();syncUI();ensoSync();updNote();requestAnimationFrame(frame);
