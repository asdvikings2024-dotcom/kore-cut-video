// Editor da telefono in stile CapCut: anteprima, riproduzione con annulla/ripeti, timeline con cursore fisso al centro
// (scorre il filmato, non il cursore), righe per sovrimpressioni, audio e testo, barra strumenti in basso.
// Ogni azione richiama i pulsanti già esistenti dell'editor: la logica resta una sola.
const $=id=>document.getElementById(id);
const mobile=matchMedia('(max-width:759px)');
const PPS=44,FRAME_W=34,ROW=58,SMALL=30;
let root,scroller,inner,toolbar,clock,playBtn,undoBtn,redoBtn,line;
let built=false,lastSet=-1,touching=false,raf=0,lastRows='',pending=0,tools='root';
const thumbs=new Map();
const fmt=s=>{s=Math.max(0,s);const m=Math.floor(s/60),r=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0')};
function el(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n}
const api=()=>window.koreCap;

async function frames(c,count){
 const key=c.key+':'+c.in+':'+count;if(thumbs.has(key))return thumbs.get(key);
 const cv=document.createElement('canvas');cv.width=FRAME_W*count;cv.height=ROW;const ctx=cv.getContext('2d');ctx.fillStyle='#241b2c';ctx.fillRect(0,0,cv.width,cv.height);
 const draw=(src,sw,sh,i)=>{const k=Math.max(FRAME_W/sw,ROW/sh);ctx.save();ctx.beginPath();ctx.rect(i*FRAME_W,0,FRAME_W,ROW);ctx.clip();ctx.drawImage(src,i*FRAME_W+(FRAME_W-sw*k)/2,(ROW-sh*k)/2,sw*k,sh*k);ctx.restore()};
 try{
  if(c.image&&c.image.naturalWidth){for(let i=0;i<count;i++)draw(c.image,c.image.naturalWidth,c.image.naturalHeight,i)}
  else if(c.url){
   const v=document.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;v.src=c.url;
   await new Promise((res,rej)=>{v.onloadeddata=res;v.onerror=rej;setTimeout(rej,5000)});
   for(let i=0;i<count;i++){
    const t=Math.min((v.duration||c.out)-.05,c.in+(c.out-c.in)*(i+.5)/count);
    await new Promise(res=>{v.onseeked=res;setTimeout(res,1200);try{v.currentTime=Math.max(0,t)}catch(e){res()}});
    if(v.videoWidth)draw(v,v.videoWidth,v.videoHeight,i);
   }
   v.removeAttribute('src');v.load();
  }
 }catch(e){}
 const url=cv.toDataURL('image/jpeg',.6);thumbs.set(key,url);return url;
}

function clipEl(c,rowKind){
 const b=el('button','kc-clip kc-'+rowKind);b.type='button';b.dataset.id=c.id;
 b.style.left=c.start*PPS+'px';b.style.width=Math.max(10,c.dur*PPS)+'px';
 b.setAttribute('aria-label',(c.label||c.kind)+', '+c.dur.toFixed(1)+' secondi');
 if(rowKind==='main'||rowKind==='over'){
  if(c.url||c.image){const n=Math.max(1,Math.min(14,Math.ceil(c.dur*PPS/FRAME_W)));frames(c,n).then(u=>{b.style.backgroundImage='url('+u+')';b.style.backgroundSize='100% 100%'})}
  else b.textContent=c.label||'';
 }else b.append(el('span','kc-l',(c.kind==='title'?'T ':'♪ ')+(c.label||'')));
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
 const keep=scroller.scrollLeft;
 inner.replaceChildren();inner.style.width=total*PPS+'px';
 inner.append(ruler(total));
 const main=rows[0],over=rows.slice(1);
 const overClips=over.flatMap(r=>r.clips.filter(c=>c.kind==='video'||c.kind==='image'));
 const textClips=rows.flatMap(r=>r.clips.filter(c=>c.kind==='title'));
 const audioClips=rows.flatMap(r=>r.clips.filter(c=>c.kind==='audio'));
 const mk=(cls,h)=>{const d=el('div','kc-row '+cls);d.style.height=h+'px';inner.append(d);return d};
 const rm=mk('main',ROW);for(const c of main.clips.filter(c=>c.kind!=='title'&&c.kind!=='audio'))rm.append(clipEl(c,'main'));
 const plus=el('button','kc-plus','＋');plus.type='button';plus.setAttribute('aria-label','Aggiungi un altro video o foto');plus.style.left=(total*PPS+8)+'px';plus.onclick=e=>{e.stopPropagation();addMedia()};rm.append(plus);
 if(overClips.length){const ro=mk('over',ROW);for(const c of overClips)ro.append(clipEl(c,'over'))}
 const ra=mk('audio',SMALL);for(const c of audioClips)ra.append(clipEl(c,'audio'));if(!audioClips.length)ra.append(placeholder('Aggiungi audio','♪',pickAudio));
 const rt=mk('text',SMALL);for(const c of textClips)rt.append(clipEl(c,'text'));if(!textClips.length)rt.append(placeholder('Aggiungi testo','T',()=>$('mobileText')?.click()));
 inner.onclick=()=>api().select(null);
 scroller.scrollLeft=keep;mark(sel);
}
function mark(sel){
 for(const b of inner.querySelectorAll('.kc-clip'))b.classList.toggle('on',b.dataset.id===sel);
 const mode=sel||'root';if(mode!==tools){tools=mode;buildTools()}
 undoBtn.disabled=!!$('undo')?.disabled;redoBtn.disabled=!!$('redo')?.disabled;
}

function btn(icon,label,fn,cls){const b=el('button',cls||null,'<span aria-hidden="true">'+icon+'</span><small>'+label+'</small>');b.type='button';b.onclick=fn;return b}
function needClip(){let id=api().selected();if(!id){id=api().atPlayhead();if(id)api().select(id)}return id}
function buildTools(){
 toolbar.replaceChildren();toolbar.classList.toggle('clip',tools!=='root');
 if(tools!=='root'){
  const sel=api().selected(),c=api().rows().flatMap(r=>r.clips).find(x=>x.id===sel);
  toolbar.append(btn('‹','Indietro',()=>api().select(null)),
   btn('✂','Dividi',()=>$('mobileSplit')?.click()),
   btn('☷','Modifica',()=>$('mobileAdvanced')?.click()),
   btn('⧉','Duplica',()=>$('duplicate')?.click()));
  if(c&&c.tr)toolbar.append(btn('✎','Correggi parole',()=>window.koreOpenTranscriptEditor?.()));
  if(c&&c.kind==='image')toolbar.append(btn('✦','Togli sfondo',()=>window.koreCutoutAI?.(sel)));
  toolbar.append(btn('🗑','Elimina',()=>$('remove')?.click(),'danger'));
  return;
 }
 toolbar.append(
  btn('☷','Modifica',()=>{if(needClip())$('mobileAdvanced')?.click()}),
  btn('♪','Audio',pickAudio),
  btn('T','Testo',()=>$('mobileText')?.click()),
  btn('✦','Effetti',()=>$('mobileEffects')?.click()),
  btn('◫','Sovrimpressione',()=>$('phoneOverlayOpen')?.click()),
  btn('▤','Sottotitoli',()=>$('mobileSubtitles')?.click()),
  btn('◎','Filtri',()=>{if(needClip())$('mobileAdvanced')?.click()}));
}

let userAt=0;
function setScroll(x){if(Math.abs(scroller.scrollLeft-x)>1){lastSet=x;scroller.scrollLeft=x}}
function loop(){
 raf=0;if(!root||root.hidden)return;
 const k=api();if(k){
  if(k.playing()&&!touching)setScroll(Math.round(k.time()*PPS));
  clock.textContent=fmt(k.time())+' / '+fmt(k.end());
  const p=k.playing();if(playBtn.dataset.p!==String(p)){playBtn.dataset.p=String(p);playBtn.firstChild.textContent=p?'❚❚':'▶'}
 }
 raf=requestAnimationFrame(loop);
}
// Spostamenti fatti altrove (annulla, dividi, salti): il filmato segue il cursore, a meno che il dito stia scorrendo.
document.addEventListener('kore-timechange',()=>{if(!scroller||root.hidden||touching||performance.now()-userAt<500)return;const k=api();if(k&&!k.playing())setScroll(Math.round(k.time()*PPS))});
function onScroll(){
 if(Math.abs(scroller.scrollLeft-lastSet)<2)return;
 userAt=performance.now();
 if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const k=api();if(!k)return;if(k.playing()&&touching)k.toggle();lastSet=scroller.scrollLeft;k.seek(scroller.scrollLeft/PPS)});
}

function build(){
 if(built)return true;
 const host=$('phoneTransport');if(!host||!api())return false;
 root=el('section','kc');root.id='koreCap';root.setAttribute('aria-label','Montaggio');root.hidden=true;
 clock=el('span','kc-clock','00:00 / 00:00');
 playBtn=el('button','kc-play','<span>▶</span>');playBtn.type='button';playBtn.setAttribute('aria-label','Riproduci o ferma');playBtn.onclick=()=>api().toggle();
 undoBtn=el('button','kc-ur','<span>↶</span>');undoBtn.type='button';undoBtn.setAttribute('aria-label','Annulla');undoBtn.onclick=()=>$('undo')?.click();
 redoBtn=el('button','kc-ur','<span>↷</span>');redoBtn.type='button';redoBtn.setAttribute('aria-label','Ripeti');redoBtn.onclick=()=>$('redo')?.click();
 const trans=el('div','kc-trans');const right=el('div','kc-right');right.append(undoBtn,redoBtn);trans.append(clock,playBtn,right);
 scroller=el('div','kc-scroll');inner=el('div','kc-inner');scroller.append(inner);
 line=el('i','kc-line');line.setAttribute('aria-hidden','true');
 const tl=el('div','kc-tl');tl.append(scroller,line);
 toolbar=el('div','kc-tools');toolbar.setAttribute('aria-label','Strumenti');
 root.append(trans,tl,toolbar);host.after(root);
 scroller.addEventListener('scroll',onScroll,{passive:true});
 scroller.addEventListener('touchstart',()=>{touching=true;if(api().playing())api().toggle()},{passive:true});
 const end=()=>{setTimeout(()=>{touching=false},350)};scroller.addEventListener('touchend',end,{passive:true});scroller.addEventListener('touchcancel',end,{passive:true});
 built=true;buildTools();return true;
}
function active(){
 return mobile.matches&&!document.body.classList.contains('mobile-home-open')&&!!document.querySelector('#tracks .clip');
}
function update(){
 if(!mobile.matches&&!built)return;
 if(!built&&!build())return;
 const on=active();
 document.body.classList.toggle('kore-cap',on);root.hidden=!on;
 if(on){render();if(!raf)raf=requestAnimationFrame(loop)}
}
window.addEventListener('kore-cap-refresh',()=>update());
new MutationObserver(()=>update()).observe(document.body,{attributes:true,attributeFilter:['class']});
mobile.addEventListener('change',update);
let tries=0;const wait=setInterval(()=>{if(build()||++tries>75){clearInterval(wait);update()}},200);
