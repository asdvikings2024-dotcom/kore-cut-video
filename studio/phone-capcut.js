// Editor da telefono in stile CapCut: anteprima, riproduzione con annulla/ripeti, timeline con cursore fisso al centro
// (scorre il filmato, non il cursore), righe per sovrimpressioni, audio e testo, barra strumenti in basso.
// Ogni azione richiama i pulsanti già esistenti dell'editor: la logica resta una sola.
const $=id=>document.getElementById(id);
const mobile=matchMedia('(max-width:759px)');
const ZOOMS=[16,28,44,80,150];let PPS=44;const ROW=46,FRAME_W=46,OVER=34,SMALL=28,DPR=2,MAX_SAMPLES=60;
let root,scroller,inner,toolbar,clock,playBtn,undoBtn,redoBtn,line;
let rail,built=false,raf=0,lastRows='',tools='root';
const thumbs=new Map();
const fmt=s=>{s=Math.max(0,s);const m=Math.floor(s/60),r=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0')};
function el(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n}
const api=()=>window.koreCap;

async function frames(c,tiles){
 const samples=Math.max(1,Math.min(tiles,MAX_SAMPLES)),key=c.key+':'+c.in+':'+c.out+':'+tiles;if(thumbs.has(key))return thumbs.get(key);
 const tw=FRAME_W*DPR,th=ROW*DPR,cv=document.createElement('canvas');cv.width=tw*tiles;cv.height=th;const ctx=cv.getContext('2d');ctx.fillStyle='#241b2c';ctx.fillRect(0,0,cv.width,cv.height);
 const tile=(src,sw,sh,j)=>{const k=Math.max(tw/sw,th/sh);ctx.save();ctx.beginPath();ctx.rect(j*tw,0,tw,th);ctx.clip();ctx.drawImage(src,j*tw+(tw-sw*k)/2,(th-sh*k)/2,sw*k,sh*k);ctx.restore()};
 // Ogni campione copre una o più tessere affiancate (mai stirato, così resta nitido).
 const put=(src,sw,sh,i)=>{const a=Math.floor(i*tiles/samples),b=Math.floor((i+1)*tiles/samples);for(let j=a;j<b;j++)tile(src,sw,sh,j)};
 try{
  if(c.image&&c.image.naturalWidth){for(let i=0;i<samples;i++)put(c.image,c.image.naturalWidth,c.image.naturalHeight,i)}
  else if(c.url){
   const v=document.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;v.src=c.url;try{v.play?.().then(()=>v.pause()).catch(()=>{})}catch(e){}
   await new Promise((res,rej)=>{v.onloadeddata=res;v.onerror=rej;setTimeout(rej,8000)});
   for(let i=0;i<samples;i++){
    const t=Math.min((v.duration||c.out)-.05,c.in+(c.out-c.in)*(i+.5)/samples);
    await new Promise(res=>{v.onseeked=res;setTimeout(res,1500);try{v.currentTime=Math.max(0,t)}catch(e){res()}});
    if(v.videoWidth)put(v,v.videoWidth,v.videoHeight,i);
   }
   v.removeAttribute('src');v.load();
  }
 }catch(e){}
 const url=cv.toDataURL('image/jpeg',.72);thumbs.set(key,url);return url;
}

function addHandles(b,c){
 for(const side of ['l','r']){
  const h=el('i','kc-h '+side);h.setAttribute('aria-label',side==='l'?'Taglia l\'inizio trascinando':'Taglia la fine trascinando');
  let st=null;
  h.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();if(!api().trimBegin(c.id))return;st={x:e.clientX,id:e.pointerId};try{h.setPointerCapture(e.pointerId)}catch(_){}});
  h.addEventListener('pointermove',e=>{if(!st||e.pointerId!==st.id)return;e.preventDefault();const r=api().trimTo(side,(e.clientX-st.x)/PPS);if(r){b.style.left=r.start*PPS+'px';b.style.width=Math.max(10,r.dur*PPS)+'px';api().seek(side==='l'?r.start:Math.max(0,r.start+r.dur-.05))}});
  const end=e=>{if(!st||e.pointerId!==st.id)return;st=null;api().trimEnd()};
  h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);h.addEventListener('click',e=>e.stopPropagation());
  b.append(h);
 }
}
function clipEl(c,rowKind){
 const b=el('button','kc-clip kc-'+rowKind);b.type='button';b.dataset.id=c.id;
 b.style.left=c.start*PPS+'px';b.style.width=Math.max(10,c.dur*PPS)+'px';
 b.setAttribute('aria-label',(c.label||c.kind)+', '+c.dur.toFixed(1)+' secondi');
 if(rowKind==='main'||rowKind==='over'){
  if(c.url||c.image){const n=Math.max(1,Math.ceil(c.dur*PPS/FRAME_W));frames(c,n).then(u=>{b.style.backgroundImage='url('+u+')';b.style.backgroundSize=(n*FRAME_W)+'px 100%';b.style.backgroundRepeat='no-repeat';b.style.backgroundPosition='left center'})}
  else b.textContent=c.label||'';
 }else b.append(el('span','kc-l',(c.kind==='title'?'T ':'♪ ')+(c.label||'')));
 addHandles(b,c);
 b.onclick=e=>{e.stopPropagation();const on=api().selected()===c.id;api().select(on?null:c.id)};
 return b;
}
function placeholder(text,icon,fn){
 const b=el('button','kc-add','<span>'+icon+'</span>'+text);b.type='button';b.onclick=e=>{e.stopPropagation();fn()};return b;
}
function pickAudio(){
 const inp=document.createElement('input');inp.type='file';inp.accept='audio/*,video/*';inp.onchange=async()=>{const f=[...inp.files];if(f.length)await api().addFiles(f)};inp.click();
}
function addMedia(){const l=$('import');if(l){window.koreImportTarget=null;l.click()}}

function ruler(total){
 const r=el('div','kc-ruler');const step=total>90?10:total>40?5:total>14?2:1;
 for(let t=0;t<=total+.001;t+=step){const m=el('span','kc-tick',fmt(t));m.style.left=t*PPS+'px';r.append(m)}
 return r;
}
function render(){
 if(!built||!api())return;
 const rows=api().rows(),total=Math.max(1,api().end()),sel=api().selected();
 const sig=JSON.stringify(rows.map(r=>r.clips.map(c=>[c.id,c.start,c.dur,c.in,c.out,c.label])))+'|'+total;
 if(sig===lastRows){mark(sel);return}
 lastRows=sig;
 inner.replaceChildren();inner.style.width=total*PPS+'px';
 inner.append(ruler(total));
 const main=rows[0],over=rows.slice(1);
 const overClips=over.flatMap(r=>r.clips.filter(c=>c.kind==='video'||c.kind==='image'));
 const textClips=rows.flatMap(r=>r.clips.filter(c=>c.kind==='title'));
 const audioClips=rows.flatMap(r=>r.clips.filter(c=>c.kind==='audio'));
 let h=22;
 const mk=(cls,hh)=>{const d=el('div','kc-row '+cls);d.style.height=hh+'px';inner.append(d);h+=hh+5;return d};
 const rm=mk('main',ROW);for(const c of main.clips.filter(c=>c.kind!=='title'&&c.kind!=='audio'))rm.append(clipEl(c,'main'));
 const plus=el('button','kc-plus','＋');plus.type='button';plus.setAttribute('aria-label','Aggiungi un altro video o foto');plus.style.left=(total*PPS+8)+'px';plus.onclick=e=>{e.stopPropagation();addMedia()};rm.append(plus);
 if(overClips.length){const ro=mk('over',OVER);for(const c of overClips)ro.append(clipEl(c,'over'))}
 if(textClips.length){const rt=mk('text',SMALL);for(const c of textClips)rt.append(clipEl(c,'text'))}
 if(audioClips.length){const ra=mk('audio',SMALL);for(const c of audioClips)ra.append(clipEl(c,'audio'))}
 scroller.style.height=(h+2)+'px';
 inner.onclick=()=>api().select(null);
 mark(sel);
}
function mark(sel){
 for(const b of inner.querySelectorAll('.kc-clip'))b.classList.toggle('on',b.dataset.id===sel);
 const mode=sel||'root';if(mode!==tools){tools=mode;buildTools()}
 undoBtn.disabled=!!$('undo')?.disabled;redoBtn.disabled=!!$('redo')?.disabled;
}

function btn(icon,label,fn,cls){const b=el('button',cls||null,'<span aria-hidden="true">'+icon+'</span><small>'+label+'</small>');b.type='button';b.onclick=fn;return b}
function needClip(){let id=api().selected();if(!id){id=api().atPlayhead();if(id)api().select(id)}return id}
let pop=null;
function closePop(){pop?.remove();pop=null}
function openPop(title){closePop();pop=el('div','kc-pop');const h=el('div','kc-pop-h');h.append(el('b',null,title));const x=el('button',null,'✕');x.type='button';x.setAttribute('aria-label','Chiudi');x.onclick=closePop;h.append(x);pop.append(h);root.insertBefore(pop,toolbar);return pop}
function speedPop(id){
 const info=api().info(id);if(!info)return;const p=openPop('Velocità');const row=el('div','kc-chips');
 for(const v of [.5,1,1.5,2]){const b=el('button',null,String(v).replace('.',',')+'×');b.type='button';b.setAttribute('aria-pressed',String(Math.abs(info.speed-v)<.01));b.onclick=()=>{api().setSpeed(id,v);for(const o of row.children)o.setAttribute('aria-pressed',String(o===b))};row.append(b)}
 p.append(row);
}
function volumePop(id){
 const info=api().info(id);if(!info)return;const p=openPop('Volume');const out=el('span','kc-val',Math.round(info.volume*100)+'%');
 const r=el('input');r.type='range';r.min='0';r.max='200';r.step='5';r.value=String(Math.round(info.volume*100));r.setAttribute('aria-label','Volume');
 r.oninput=()=>{out.textContent=r.value+'%';api().setVolume(id,Number(r.value)/100)};
 const mute=el('button','kc-mute','🔇 Muto');mute.type='button';mute.onclick=()=>{r.value='0';r.oninput()};
 const row=el('div','kc-vol');row.append(r,out);p.append(row,mute);
}
async function pausesPop(id){
 const p=openPop('Togli pause');const msg=el('p','kc-msg','Analizzo l\'audio… può volerci qualche secondo.');p.append(msg);
 try{
  const r=await api().removeSilences(id,t=>{msg.textContent=t});
  if(!pop||!pop.contains(msg)){openPop('Togli pause').append(msg)}
  if(r.error)msg.textContent=r.error;
  else if(!r.cuts)msg.textContent='Non ho trovato pause da togliere.';
  else msg.textContent='Fatto: '+r.cuts+(r.cuts===1?' pausa tolta':' pause tolte')+' ('+r.removed.toFixed(1)+' s in meno). Se non ti piace premi Annulla. Sottotitoli e audio sopra restano al loro posto: falli dopo i tagli.';
 }catch(e){if(!pop||!pop.contains(msg))openPop('Togli pause').append(msg);msg.textContent=(e&&e.message)||'Non riuscito.'}
}
function buildTools(){
 closePop();toolbar.replaceChildren();toolbar.classList.toggle('clip',tools!=='root');toolbar.hidden=tools==='root';
 if(tools==='root')return;
 const sel=api().selected(),c=api().rows().flatMap(r=>r.clips).find(x=>x.id===sel);
 toolbar.append(btn('‹','Indietro',()=>api().select(null)),
  btn('✂','Dividi',()=>$('mobileSplit')?.click()),
  btn('⇤','Taglia inizio',()=>$('trimStart')?.click()),
  btn('⇥','Taglia fine',()=>$('trimEnd')?.click()),
  btn('☷','Modifica',()=>$('mobileAdvanced')?.click()),
  btn('⏱','Velocità',()=>speedPop(sel)),
  btn('🔊','Volume',()=>volumePop(sel)),
  btn('⧉','Duplica',()=>$('duplicate')?.click()));
 if(c&&(c.kind==='video'||c.kind==='audio')&&c.url!==undefined)toolbar.append(btn('🤫','Togli pause',()=>pausesPop(sel)));
 if(c&&c.tr)toolbar.append(btn('✎','Correggi parole',()=>window.koreOpenTranscriptEditor?.()));
 if(c&&c.kind==='image')toolbar.append(btn('✦','Togli sfondo',()=>window.koreCutoutAI?.(sel)));
 toolbar.append(btn('🗑','Elimina',()=>$('remove')?.click(),'danger'));
}
// Barra laterale a destra del video, come nelle app social: ogni strumento a un tocco.
function buildRail(){
 const stage=document.querySelector('.stage');if(!stage||rail)return;
 rail=el('div','kc-rail');rail.id='koreRail';rail.setAttribute('aria-label','Strumenti');
 const add=(icon,label,fn)=>{const b=el('button',null,'<i aria-hidden="true">'+icon+'</i><small>'+label+'</small>');b.type='button';b.onclick=fn;rail.append(b)};
 add('◫','Logo / Foto',()=>$('phoneOverlayOpen')?.click());
 add('T','Testo',()=>$('mobileText')?.click());
 add('▤','Sottotitoli',()=>$('mobileSubtitles')?.click());
 add('♪','Audio',pickAudio);
 add('✦','Effetti',()=>$('mobileEffects')?.click());
 add('☷','Modifica',()=>{if(needClip())$('mobileAdvanced')?.click()});
 stage.append(rail);
}
// Timeline mossa con la trasformazione (non con lo scorrimento del browser): niente rimbalzi né scatti.
let drag=null,inertia=0,dragged=false;
const endT=()=>Math.max(.1,api().end());
function setView(t){inner.style.transform='translate3d('+(-t*PPS)+'px,0,0)'}
function stopInertia(){if(inertia){cancelAnimationFrame(inertia);inertia=0}}
function moveTo(t){t=Math.max(0,Math.min(endT(),t));setView(t);api().seek(t);clock.textContent=fmt(t)+' / '+fmt(endT());return t}
function loop(){
 raf=0;if(!root||root.hidden)return;
 const k=api();if(k){
  if(!drag&&!inertia)setView(k.time());
  if(!drag&&!inertia)clock.textContent=fmt(k.time())+' / '+fmt(k.end());
  const p=k.playing();if(playBtn.dataset.p!==String(p)){playBtn.dataset.p=String(p);playBtn.firstChild.textContent=p?'❚❚':'▶'}
 }
 raf=requestAnimationFrame(loop);
}
function setZoom(level){
 level=Math.max(0,Math.min(ZOOMS.length-1,level));if(ZOOMS[level]===PPS)return;PPS=ZOOMS[level];lastRows='';render();setView(api().time());
}
const zoomLevel=()=>Math.max(0,ZOOMS.indexOf(PPS));
function bindDrag(){
 const pts=new Map();let pinch=null;
 scroller.addEventListener('pointerdown',e=>{
  if(e.button>0)return;stopInertia();dragged=false;pts.set(e.pointerId,e.clientX);
  if(pts.size===2){const [a,b]=[...pts.values()];pinch={d0:Math.max(20,Math.abs(a-b)),lvl:zoomLevel(),done:false};drag=null;return}
  drag={x:e.clientX,t0:api().time(),id:e.pointerId,on:false,last:[{x:e.clientX,at:performance.now()}]};
 });
 scroller.addEventListener('pointermove',e=>{
  if(pts.has(e.pointerId))pts.set(e.pointerId,e.clientX);
  if(pinch){if(pts.size>=2&&!pinch.done){const [a,b]=[...pts.values()],r=Math.abs(a-b)/pinch.d0;if(r>1.35){pinch.done=true;dragged=true;setZoom(pinch.lvl+1)}else if(r<.72){pinch.done=true;dragged=true;setZoom(pinch.lvl-1)}}e.preventDefault();return}
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x;
  if(!drag.on){if(Math.abs(dx)<6)return;drag.on=true;dragged=true;try{scroller.setPointerCapture(e.pointerId)}catch(_){}if(api().playing())api().toggle()}
  e.preventDefault();drag.last.push({x:e.clientX,at:performance.now()});if(drag.last.length>6)drag.last.shift();
  moveTo(drag.t0-dx/PPS);
 });
 const up=e=>{
  pts.delete(e.pointerId);
  if(pinch){if(pts.size<2){pinch=null;setTimeout(()=>{dragged=false},80)}return}
  if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;
  if(!d.on){return}
  setTimeout(()=>{dragged=false},60);
  const a=d.last[0],b=d.last[d.last.length-1],dt=Math.max(1,b.at-a.at);let v=-(b.x-a.x)/dt/PPS*1000;
  if(performance.now()-b.at>90||Math.abs(v)<.4)return;
  let t=api().time(),prev=performance.now();
  const step=now=>{const dt2=Math.min(40,now-prev);prev=now;t+=v*dt2/1000;v*=Math.pow(.93,dt2/16);const c=Math.max(0,Math.min(endT(),t));moveTo(c);if(Math.abs(v)<.35||c!==t){inertia=0;return}inertia=requestAnimationFrame(step)};
  inertia=requestAnimationFrame(step);
 };
 scroller.addEventListener('pointerup',up);scroller.addEventListener('pointercancel',up);
 scroller.addEventListener('click',e=>{if(dragged){e.stopPropagation();e.preventDefault()}},true);
}

function build(){
 if(built)return true;
 const host=$('phoneTransport');if(!host||!api())return false;
 root=el('section','kc');root.id='koreCap';root.setAttribute('aria-label','Montaggio');root.hidden=true;
 clock=el('span','kc-clock','00:00 / 00:00');
 playBtn=el('button','kc-play','<span>▶</span>');playBtn.type='button';playBtn.setAttribute('aria-label','Riproduci o ferma');playBtn.onclick=()=>api().toggle();
 undoBtn=el('button','kc-ur','<span>↶</span>');undoBtn.type='button';undoBtn.setAttribute('aria-label','Annulla');undoBtn.onclick=()=>$('undo')?.click();
 redoBtn=el('button','kc-ur','<span>↷</span>');redoBtn.type='button';redoBtn.setAttribute('aria-label','Ripeti');redoBtn.onclick=()=>$('redo')?.click();
 const zin=el('button','kc-ur','<span>＋</span>');zin.type='button';zin.setAttribute('aria-label','Ingrandisci la timeline');zin.onclick=()=>setZoom(zoomLevel()+1);const zout=el('button','kc-ur','<span>－</span>');zout.type='button';zout.setAttribute('aria-label','Riduci la timeline');zout.onclick=()=>setZoom(zoomLevel()-1);
 const trans=el('div','kc-trans');const right=el('div','kc-right');right.append(zout,zin,undoBtn,redoBtn);trans.append(clock,playBtn,right);
 scroller=el('div','kc-scroll');inner=el('div','kc-inner');scroller.append(inner);
 line=el('i','kc-line');line.setAttribute('aria-hidden','true');
 const tl=el('div','kc-tl');tl.append(scroller,line);
 toolbar=el('div','kc-tools');toolbar.setAttribute('aria-label','Strumenti');
 root.append(trans,tl,toolbar);host.after(root);
 bindDrag();
 buildRail();built=true;buildTools();return true;
}
function active(){
 return mobile.matches&&!document.body.classList.contains('mobile-home-open')&&!!document.querySelector('#tracks .clip');
}
function update(){
 if(!mobile.matches&&!built)return;
 if(!built&&!build())return;
 const on=active();
 document.body.classList.toggle('kore-cap',on);root.hidden=!on;if(rail)rail.hidden=!on;
 if(on){render();if(!raf)raf=requestAnimationFrame(loop)}
}
window.addEventListener('kore-cap-refresh',()=>update());
new MutationObserver(()=>update()).observe(document.body,{attributes:true,attributeFilter:['class']});
mobile.addEventListener('change',update);
let tries=0;const wait=setInterval(()=>{if(build()||++tries>75){clearInterval(wait);update()}},200);
