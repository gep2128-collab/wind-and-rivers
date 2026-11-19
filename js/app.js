;
const RAD=Math.PI/180;
const ZONES={amazon:{name:'Amazon',b:[-82,-21,-43,6]},borneo:{name:'Borneo',b:[108,-5,120,8]}};
const MES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLS=['#3987e5','#1baf7a','#9bc53d','#eda100','#eb6834','#e34948'];
const BRK=[2,4,6,8,11];

const stage=document.getElementById('stage');
const C={base:cBase,rad:cRad,riv:cRiv,part:cPart,lab:cLab};
const X={};for(const k in C)X[k]=C[k].getContext('2d');
const proj=d3.geoEquirectangular();
let W=0,H=0,dpr=1,T=d3.zoomIdentity,landPath,riverGroups=[],riverLabels=[];
const land=topojson.feature(LAND,LAND.objects.land);
const layers={wind:true,rivers:true,sst:true,fire:true,t2m:false,tp:false,rad:false,cloud:false,fireyear:false};
let LABELS=''; // lab=stake in the URL writes what is at stake next to each study area (story map)

let Y0=2005,Y1=2026,tm=0;tm=lastDataTm()??(2024-Y0)*12;
let playing=false,DATA=[];
// ERA5 for the Amazon and Borneo loads by itself (js/air.js); files loaded with the button are added on top.
if(window.AIR)for(const r in AIR.sets)DATA.push(AIR.sets[r]);

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
  if(layers.rivers&&T.k>2.5){
    c.font='italic 11px Arimo,Arial,sans-serif';c.fillStyle='#1d4f8f';
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
  if(!layers.rad&&!layers.cloud&&!layers.sst&&!layers.t2m&&!layers.tp&&!layers.fire&&!layers.fireyear)return;
  setT(c);
  if(layers.sst)drawSST(c);
  if(layers.t2m){c.globalAlpha=.85;drawSets(c,'t2m',v=>d3.interpolateRdYlBu(1-Math.max(0,Math.min(1,(v-10)/25))));}
  if(layers.tp){c.globalAlpha=1;drawSets(c,'tp',v=>`rgba(40,120,235,${(Math.min(1,Math.max(0,v)/12)*.9).toFixed(2)})`);}
  if(layers.rad){
    const ds=DATA.filter(d=>d.ssrd);
    if(ds.length){c.globalAlpha=.6;drawSets(c,'ssrd',v=>d3.interpolateInferno(Math.min(1,v/320)));}
    else{c.globalAlpha=.5;const m=monthF(),a=proj([-180,90]),b=proj([180,-90]),g=c.createLinearGradient(0,a[1],0,b[1]);for(let lat=90;lat>=-90;lat-=2)g.addColorStop((90-lat)/180,d3.interpolateInferno(Math.max(0,insol(lat,m))/560));c.fillStyle=g;c.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);}
  }
  if(layers.cloud){
    c.globalAlpha=1;const ds=DATA.filter(d=>d.tcc);
    if(ds.length)drawSets(c,'tcc',v=>`rgba(95,130,190,${(Math.max(0,Math.min(1,v))*.8).toFixed(2)})`);
    else{const a=proj([-180,90]),b=proj([180,-90]);c.imageSmoothingEnabled=true;c.drawImage(demoCloudImage(),a[0],a[1],b[0]-a[0],b[1]-a[1]);}
  }
  if(layers.fire&&window.drawFire)drawFire(c,monthKey());
  if(layers.fireyear&&window.drawFireYear)drawFireYear(c);
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
function frameOf(d){
  const f=Math.floor(tm),y=Y0+Math.floor(f/12),key=y+'-'+String(f%12+1).padStart(2,'0'),i=d.idx[key];
  if(i==null)return null;
  if(d.builtin&&!d.u[i]){airLoad(d.region,y);return null;} // year not downloaded yet
  return i;
}
function drawGrid(c,d,k,col){
  const fi=frameOf(d);if(fi==null)return;const arr=d[k][fi];if(!arr)return;const oc=document.createElement('canvas');oc.width=d.nx;oc.height=d.ny;
  const o=oc.getContext('2d'),img=o.createImageData(d.nx,d.ny);
  for(let n=0;n<arr.length;n++){const v=arr[n];if(v==null||isNaN(v))continue;const q=d3.color(col(v));img.data.set([q.r,q.g,q.b,Math.round((q.opacity??1)*255)],n*4);}
  o.putImageData(img,0,0);
  const hx=Math.abs(d.dlon)/2,hy=Math.abs(d.dlat)/2,lx=Math.min(d.lon0,d.lon0+(d.nx-1)*d.dlon),ty=Math.max(d.lat0,d.lat0+(d.ny-1)*d.dlat);
  // clamp to ±180 so a world-wide grid does not wrap its left edge to the far right
  const a=proj([Math.max(-180,lx-hx),ty+hy]),b=proj([Math.min(180,lx+(d.nx-1)*Math.abs(d.dlon)+hx),ty-(d.ny-1)*Math.abs(d.dlat)-hy]);
  c.imageSmoothingEnabled=true;c.drawImage(oc,a[0],a[1],b[0]-a[0],b[1]-a[1]);
}
const isCoarse=d=>Math.abs(d.dlon)>=1.5;
function gridBox(d){const hx=Math.abs(d.dlon)/2,hy=Math.abs(d.dlat)/2,lo=[d.lon0,d.lon0+(d.nx-1)*d.dlon].sort((x,y)=>x-y),la=[d.lat0,d.lat0+(d.ny-1)*d.dlat].sort((x,y)=>x-y);
  const a=proj([Math.max(-180,lo[0]-hx),la[1]+hy]),b=proj([Math.min(180,lo[1]+hx),la[0]-hy]);return[a[0],a[1],b[0]-a[0],b[1]-a[1]];}
// Draw the world-wide 2° grid first, with the fine 0.5° study areas cut out of it, then the fine grids on top.
function drawSets(c,k,col){
  const ds=DATA.filter(d=>d[k]),fine=ds.filter(d=>!isCoarse(d));
  for(const d of ds.filter(isCoarse)){
    if(!fine.length){drawGrid(c,d,k,col);continue;}
    c.save();const p=new Path2D(),w=gridBox(d);p.rect(...w);for(const f of fine)p.rect(...gridBox(f));c.clip(p,'evenodd');drawGrid(c,d,k,col);c.restore();
  }
  for(const d of fine)drawGrid(c,d,k,col);
}
// Study areas and the latitude band they share, drawn on the top canvas so they stay readable.
const ZONE_COLOR='#ffa51f'; // one orange for study-area names and frames
function drawZones(){
  const c=X.lab;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W*dpr,H*dpr);c.setTransform(dpr,0,0,dpr,0,0);
  const bs=Object.values(ZONES).map(z=>z.b),bandS=Math.max(...bs.map(b=>b[1])),bandN=Math.min(...bs.map(b=>b[3]));
  const x0=scr(-180,0)[0],x1=scr(180,0)[0];
  c.lineWidth=1;c.strokeStyle='rgba(255,255,255,.75)';c.setLineDash([7,6]);
  for(const lat of[bandN,bandS]){const y=scr(0,lat)[1];c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();}
  c.setLineDash([]);
  const yN=scr(0,bandN)[1],yS=scr(0,bandS)[1],xl=Math.max(x0,0)+8;
  c.font='11px Arimo,Arial,sans-serif';c.textBaseline='middle';
  // plain (not bold) white text; a soft shadow keeps it readable without an outline
  const lab=(t,x,y)=>{c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=3;c.fillStyle='#fff';c.fillText(t,x,y);c.shadowBlur=0;c.shadowColor='transparent';};
  lab(`${bandN}°N`,xl,yN-8);lab(`${Math.abs(bandS)}°S`,xl,yS+8);
  // band name only where it does not run into a study-area label
  const t='Shared latitude band',tx=xl+36,ax=Math.min(...Object.values(ZONES).map(z=>scr(z.b[0],z.b[3])[0]).filter(x=>x>tx));
  if(!(tx+c.measureText(t).width+8>ax))lab(t,tx,yN-8);
  for(const z in ZONES){
    const [w,s,e,n]=ZONES[z].b,a=scr(w,n),b=scr(e,s);
    c.strokeStyle=ZONE_COLOR;c.lineWidth=1.1;c.lineCap='round';c.setLineDash([0,3.5]);
    c.beginPath();c.roundRect(a[0],a[1],b[0]-a[0],b[1]-a[1],4);c.stroke();c.setLineDash([]);
    c.font='13px Arimo,Arial,sans-serif';c.textBaseline='alphabetic';
    // soft shadow (not an outline) so the orange stands out on red sea and white land
    const nm=ZONES[z].name.toUpperCase();c.shadowColor='rgba(0,0,0,.95)';c.shadowBlur=7;c.fillStyle=ZONE_COLOR;
    for(let k=0;k<3;k++)c.fillText(nm,a[0],a[1]-7); // stacked soft shadows form a dark glow behind the text
    c.shadowBlur=0;c.shadowColor='transparent';c.fillText(nm,a[0],a[1]-7);
  }
  c.lineCap='butt';
  if(LABELS==='stake')drawStake(c);
}
// What is at stake, written next to each study area (lab=stake): the year of the whole-year fire view,
// its hotspots (FIRMS), its fire CO₂ as a share of what the forest takes up in a year (GFED5.1 / CAMS GFAS, MODIS NPP)
// and the share of mammal species threatened (GBIF + IUCN categories).
function stakeLines(r){
  const y=FIRE_YEAR[r],out=[`${ZONES[r].name.toUpperCase()} · FIRES OF ${y||''}`];
  if(y&&window.FUEGO){let n=0;FUEGO.months.forEach((m,i)=>{if(m.startsWith(y+'-'))n+=FUEGO.regions[r].hotspots[i]||0;});out.push(`${n.toLocaleString('en')} fire hotspots`);}
  if(y&&window.CO2&&window.OXIGENO){let v=0,k=0;CO2.months.forEach((m,i)=>{if(m.startsWith(y+'-')&&CO2.regions[r].co2_mt[i]!=null){v+=CO2.regions[r].co2_mt[i];k++;}});
    const up=OXIGENO.regions[r]['2022'].co2_uptake_mt;if(k)out.push(`fire CO₂ = ${(100*v/up).toFixed(1)}% of a year's uptake`);}
  if(window.ESPECIES)out.push(`${ESPECIES.regions[r].mammals.threatened_pct}% of mammal species threatened`);
  return out;
}
function drawStake(c){
  c.textBaseline='top';
  for(const r in ZONES){
    const [w,s,e,n]=ZONES[r].b,a=scr(w,n),b=scr(e,s),L=stakeLines(r);
    c.font='bold 12px Arimo,Arial,sans-serif';const tw=Math.max(...L.map((t,i)=>(c.font=(i?'':'bold ')+'12px Arimo,Arial,sans-serif',c.measureText(t).width)))+20;
    const h=L.length*17+12,x=Math.max(6,Math.min(W-tw-6,a[0])),y=Math.min(H-h-6,b[1]+8);
    c.fillStyle='rgba(11,11,12,.88)';c.strokeStyle=ZONE_COLOR;c.lineWidth=1;c.beginPath();c.roundRect(x,y,tw,h,6);c.fill();c.stroke();
    L.forEach((t,i)=>{c.font=(i?'':'bold ')+'12px Arimo,Arial,sans-serif';c.fillStyle=i?'#ecebe6':ZONE_COLOR;c.fillText(t,x+10,y+8+i*17);});
  }
  c.textBaseline='alphabetic';
}
// Still part of the rivers (deep-teal banks + light-cyan water), cached until the view changes.
const rivStatic=document.createElement('canvas');let rivLast=0,rivDirty=true;
function drawRiverBase(){
  rivStatic.width=W*dpr;rivStatic.height=H*dpr;rivDirty=true;
  if(!layers.rivers)return;
  const r=rivStatic.getContext('2d');setT(r);r.lineCap='round';const s=Math.min(2.2,Math.sqrt(T.k)/1.4+.3);
  for(const g of riverGroups){r.strokeStyle='#0b5d73';r.lineWidth=(g.w*s+1.1)/T.k;r.stroke(g.p);}
  for(const g of riverGroups){r.strokeStyle='#8eefff';r.lineWidth=g.w*s/T.k;r.stroke(g.p);}
}
function redrawStatic(){drawBase();drawRad();drawZones();drawRiverBase();X.part.setTransform(1,0,0,1,0,0);X.part.clearRect(0,0,W*dpr,H*dpr);}

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
    const fr=tm-Math.floor(tm);let f2=Math.min(fi+1,d.u.length-1);if(!d.u[f2])f2=fi;
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
  // with the world-wide ERA5 grid loaded, particles can start anywhere it covers (80° N – 80° S)
  if(DATA.some(d=>d.region==='global')){n=Math.min(n,80);s=Math.max(s,-80);return w<e&&s<n?[w,s,e,n]:null;}
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
    c.setTransform(dpr,0,0,dpr,0,0);c.lineWidth=.8;c.lineCap='round';
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
  // Rivers: the still banks and water come from a cached canvas (redrawn only on zoom/pan);
  // each frame only the moving currents are drawn, at most ~30 times a second.
  if(now-rivLast>=33||rivDirty){
    rivLast=now;rivDirty=false;
    const r=X.riv;r.setTransform(1,0,0,1,0,0);r.clearRect(0,0,W*dpr,H*dpr);
    if(layers.rivers){
      r.drawImage(rivStatic,0,0);
      setT(r);r.lineCap='round';const s=Math.min(2.2,Math.sqrt(T.k)/1.4+.3),t=now/1000;
      riverGroups.forEach((g,i)=>{const v=(26-i*4)/T.k;
        r.setLineDash([6/T.k,4/T.k,2/T.k,9/T.k]);r.lineDashOffset=-t*v;r.strokeStyle='rgba(23,92,190,.75)';r.lineWidth=g.w*s*.55/T.k;r.stroke(g.p);
        r.setLineDash([1.5/T.k,15/T.k]);r.lineDashOffset=-t*v*1.6;r.strokeStyle='rgba(255,255,255,.95)';r.lineWidth=g.w*s*.45/T.k;r.stroke(g.p);});
      r.setLineDash([]);
    }
  }
  requestAnimationFrame(frame);
}

// Plain scroll moves the page down to the comparison; Ctrl + scroll (or a trackpad pinch) zooms the map.
// On touch screens one finger scrolls the page and two fingers pan and zoom the map.
const zoom=d3.zoom().scaleExtent([1,60]).filter(e=>e.type==='wheel'?(e.ctrlKey||e.metaKey):e.type.startsWith('touch')?(e.touches&&e.touches.length>1):!e.button).on('zoom',e=>{T=e.transform;redrawStatic();
  document.querySelectorAll('#zoom button').forEach(b=>b.classList.remove('on'));});
d3.select(stage).call(zoom).on('dblclick.zoom',null);d3.select(stage).style('touch-action','pan-y');
function flyTo(z){
  let t=d3.zoomIdentity;
  if(z!=='world'){const [w,s,e,n]=ZONES[z].b,a=proj([w,n]),b=proj([e,s]);
    // leave room for the panels, unless they are hidden (ui=0)
    const top=40,bot=H-(document.body.classList.contains('clean')?40:W<760?270:150),k=.9*Math.min(W/(b[0]-a[0]),(bot-top)/(b[1]-a[1]));t=d3.zoomIdentity.translate(W/2-k*(a[0]+b[0])/2,(top+bot)/2-k*(a[1]+b[1])/2).scale(k);}
  d3.select(stage).transition().duration(1600).ease(d3.easeCubicInOut).call(zoom.transform,t)
    .on('end',()=>document.querySelector(`#zoom [data-z=${z}]`).classList.add('on'));
}
document.querySelectorAll('#zoom button').forEach(b=>b.onclick=()=>flyTo(b.dataset.z));

const yr=document.getElementById('yr'),mo=document.getElementById('mo');
function syncUI(){
  const f=Math.floor(tm),y=Y0+Math.floor(f/12),m=f%12+1;
  if(+yr.value!==y){yr.value=y;}if(+mo.value!==m){mo.value=m;}
  yrO.textContent=y;moO.textContent=MES[m-1];
  const txt=MES[m-1].toUpperCase()+' '+y;
  if(date.textContent!==txt){
    date.textContent=txt;const key=y+'-'+String(m).padStart(2,'0');
    if(window.airSync)airSync(y);if(window.fireSync)fireSync(y);
    if(window.climaSync)climaSync(key);
    const fn=document.getElementById('fireNow');if(fn&&window.fireSummary)fn.innerHTML=fireSummary(key);
    drawRad();ensoSync();
  }
}
yr.oninput=mo.oninput=()=>{tm=(yr.value-Y0)*12+(mo.value-1);const ld=lastDataTm();if(ld!=null&&tm>ld)tm=ld;syncUI();drawRad();};
play.onclick=()=>{playing=!playing;play.textContent=playing?'❚❚ Pause':'▶ Play';};
document.querySelectorAll('#layers button').forEach(b=>b.onclick=()=>{layers[b.dataset.l]=!layers[b.dataset.l];b.classList.toggle('on',layers[b.dataset.l]);redrawStatic();updNote();});

function updNote(){
  // One or two short lines; the full credits open with "Sources".
  const own=DATA.filter(d=>!d.builtin),air=DATA.some(d=>d.builtin),p=[];
  p.push(air?(DATA.some(d=>d.region==='global')?'Wind: ERA5 (world 2°, study areas 0.5°)':'Wind: ERA5 (Amazon and Borneo)'):'<b>Demo wind</b> (synthetic)');
  if(own.length)p.push(`<b>Your files:</b> ${own.map(d=>d.name).join(', ')}`);
  if(layers.sst)p.push('Sea temp: ERA5 anomaly vs 1991–2020');
  if(window.ENSO)p.push('El Niño: NOAA ONI');
  if(layers.fire&&window.FIRE_INFO)p.push('Fire: NASA FIRMS');
  if(layers.fireyear&&window.FIRE_INFO)p.push('Fire: NASA FIRMS, hotspots summed over the year');
  if(layers.t2m)p.push('Air temp: ERA5');
  if(layers.tp)p.push('Rain: ERA5');
  if(layers.rivers)p.push('Rivers: Natural Earth');
  if(layers.rad)p.push(DATA.some(d=>d.ssrd)?'Radiation: ERA5':'Radiation: calculated (demo)');
  if(layers.cloud)p.push(DATA.some(d=>d.tcc)?'Clouds: ERA5':'Clouds: synthetic (demo)');
  note.innerHTML=p.join(' · ')+' · <a href="#" id="srcBtn">Sources</a>';
  srcBtn.onclick=e=>{e.preventDefault();credits.hidden=!credits.hidden;};
  legend.innerHTML=(layers.sst?'<div>Sea temp anomaly °C</div><div class="bar sb"></div><div style="display:flex;justify-content:space-between;width:120px"><span>−3</span><span>0</span><span>+3</span></div>':'')+(layers.wind?'<div>Wind m/s</div><div class="bar"></div><div style="display:flex;justify-content:space-between;width:120px"><span>0</span><span>6</span><span>12+</span></div>':'')
    +(layers.rad?'<div style="margin-top:4px">Radiation W/m²</div><div class="bar rb"></div><div style="display:flex;justify-content:space-between;width:120px"><span>0</span><span>'+(DATA.some(d=>d.ssrd)?'320':'560')+'</span></div>':'')
    +(layers.fire&&window.FIRE_INFO?'<div style="margin-top:4px">Fire hotspots per month</div><div style="height:8px;width:120px;border-radius:2px;background:linear-gradient(90deg,#fed976,#fd8d3c,#e31a1c,#800026)"></div><div style="display:flex;justify-content:space-between;width:120px"><span>1</span><span>20</span><span>500+</span></div>':'')
    +(layers.t2m?'<div style="margin-top:4px">Air temp °C</div><div style="height:8px;width:120px;border-radius:2px;background:linear-gradient(90deg,#4575b4,#ffffbf,#d73027)"></div><div style="display:flex;justify-content:space-between;width:120px"><span>10</span><span>22</span><span>35</span></div>':'')
    +(layers.tp?'<div style="margin-top:4px">Rain mm/day</div><div style="height:8px;width:120px;border-radius:2px;background:linear-gradient(90deg,rgba(40,120,235,0),rgba(40,120,235,.9))"></div><div style="display:flex;justify-content:space-between;width:120px"><span>0</span><span>6</span><span>12+</span></div>':'')
    +(layers.cloud?'<div style="margin-top:4px">Cloud cover</div><div style="height:8px;width:120px;border-radius:2px;background:linear-gradient(90deg,rgba(95,130,190,0),rgba(95,130,190,.8))"></div><div style="display:flex;justify-content:space-between;width:120px"><span>0%</span><span>100%</span></div>':'');
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
  const ll=proj.invert(T.invert([e.clientX-stage.getBoundingClientRect().left,e.clientY-stage.getBoundingClientRect().top]));if(!ll||Math.abs(ll[1])>90){probe.style.display='none';return;}
  const w=windAt(ll[0],ll[1],tau);
  probe.style.display='block';probe.style.left=(e.clientX+14)+'px';probe.style.top=(e.clientY+14)+'px';
  let s=`${Math.abs(ll[1]).toFixed(2)}°${ll[1]<0?'S':'N'} ${Math.abs(ll[0]).toFixed(2)}°${ll[0]<0?'W':'E'}`;
  if(w){const sp=Math.hypot(w[0],w[1]),dir=(Math.atan2(-w[0],-w[1])/RAD+360)%360;s+=` · ${sp.toFixed(1)} m/s from ${Math.round(dir)}°`;}
  if(layers.sst){const a=sstAt(ll[0],ll[1]);if(a!=null)s+=` · sea ${a>0?'+':''}${a.toFixed(1)} °C vs normal`;}
  for(const d of DATA.filter(d=>d.builtin)){const fi=frameOf(d);if(fi==null)continue;
    const t=sample(d,'t2m',fi,ll[0],ll[1]);if(t==null||isNaN(t))continue;
    s+=` · air ${t.toFixed(1)} °C · rain ${Math.max(0,sample(d,'tp',fi,ll[0],ll[1])).toFixed(1)} mm/day`;break;}
  if(layers.fire&&window.fireAt){const n=fireAt(ll[0],ll[1],monthKey());if(n)s+=` · ${n} fire hotspots this month`;}
  probe.textContent=s;
});
stage.addEventListener('mouseleave',()=>probe.style.display='none');

addEventListener('resize',()=>{resize();seed();});
// Shareable views: #t=2015-12&z=amazon&ui=0 opens on that month and region (ui=0 hides the panels).
// l=sst,fire picks the layers to show (l= with nothing shows none); without l the layers stay as they are.
function applyHash(){
  const h=new URLSearchParams(location.hash.slice(1)),t=h.get('t'),z=h.get('z');
  if(h.has('l')){const on=h.get('l').split(',');for(const k in layers)layers[k]=on.includes(k);
    document.querySelectorAll('#layers button').forEach(b=>b.classList.toggle('on',layers[b.dataset.l]));}
  // fy=amazon:2024,borneo:2015 (or fy=2015) picks the year of the whole-year fire view
  if(h.has('fy')){FIRE_YEAR={};for(const p of h.get('fy').split(',')){const [a,b]=p.split(':');if(b)FIRE_YEAR[a]=+b;else for(const r in ZONES)FIRE_YEAR[r]=+a;}}
  LABELS=h.get('lab')||'';
  if(h.has('l')||h.has('fy')||h.has('lab')){redrawStatic();updNote();}
  if(t&&/^\d{4}-\d{2}$/.test(t)){tm=(+t.slice(0,4)-Y0)*12+(+t.slice(5)-1);const ld=lastDataTm();if(ld!=null&&tm>ld)tm=ld;if(tm<0)tm=0;syncUI();drawRad();}
  document.body.classList.toggle('clean',h.get('ui')==='0');
  if(z&&(z==='world'||ZONES[z]))flyTo(z);
}
addEventListener('hashchange',applyHash);
// Map labels are drawn on canvas: redraw them once the Arimo web font has loaded
if(document.fonts)document.fonts.ready.then(()=>{redrawStatic();if(window.drawEnso)drawEnso();});
resize();seed();syncUI();ensoSync();updNote();applyHash();requestAnimationFrame(frame);
