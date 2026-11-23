// Schermata semplice da telefono dopo aver scelto un modello: anteprima, fila di scene con durata e 5 azioni grandi.
// "Avanzato" apre l'editor completo.
const $=id=>document.getElementById(id);
const mobile=matchMedia('(max-width:759px)');
let strip,bar,sheet,thumbs=new Map(),sheetId=null;
const fmt=s=>(Math.round(s*10)/10).toFixed(1)+'s';
function el(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n}

async function thumb(c){
 const key=c.id+':'+c.in+':'+c.url;if(thumbs.has(key))return thumbs.get(key);
 const cv=document.createElement('canvas');cv.width=120;cv.height=180;const ctx=cv.getContext('2d');ctx.fillStyle='#1b1520';ctx.fillRect(0,0,120,180);
 const draw=(src,sw,sh)=>{const k=Math.max(120/sw,180/sh);ctx.drawImage(src,(120-sw*k)/2,(180-sh*k)/2,sw*k,sh*k)};
 try{
  if(c.image&&c.image.naturalWidth)draw(c.image,c.image.naturalWidth,c.image.naturalHeight);
  else if(c.url){
   const v=document.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;v.src=c.url;
   await new Promise((res,rej)=>{v.onloadeddata=res;v.onerror=()=>rej();setTimeout(rej,4000)});
   await new Promise(res=>{v.onseeked=res;setTimeout(res,1500);try{v.currentTime=Math.min((v.duration||1)-.05,c.in+.1)}catch(e){res()}});
   if(v.videoWidth)draw(v,v.videoWidth,v.videoHeight);v.removeAttribute('src');v.load();
  }
 }catch(e){}
 thumbs.set(key,cv);return cv;
}
async function renderStrip(){
 if(!strip||!window.koreSimple)return;
 const list=window.koreSimple.clips(),sel=window.koreSimple.selected();
 strip.replaceChildren();
 list.forEach((c,i)=>{
  const b=el('button','ks-clip');b.type='button';b.dataset.id=c.id;b.setAttribute('aria-label','Scena '+(i+1)+', '+fmt(c.dur));b.setAttribute('aria-pressed',String(c.id===sel));
  b.append(el('span','ks-n',String(i+1)),el('span','ks-d',fmt(c.dur)));
  b.onclick=()=>{window.koreSimple.select(c.id);mark()};
  strip.append(b);
  thumb(c).then(cv=>{const k=cv.cloneNode();k.getContext('2d').drawImage(cv,0,0);b.prepend(k)});
 });
 mark();
}
function mark(){
 const sel=window.koreSimple?.selected();
 for(const b of strip?.querySelectorAll('.ks-clip')||[]){const on=b.dataset.id===sel;b.setAttribute('aria-pressed',String(on));if(on)b.scrollIntoView({inline:'center',block:'nearest'})}
 for(const b of bar?.querySelectorAll('[data-need]')||[])b.disabled=!sel;
}
function closeSheet(){sheet?.remove();sheet=null}
function trimSheet(){
 const api=window.koreSimple,id=api.selected(),c=api.clips().find(x=>x.id===id);
 if(!c)return;closeSheet();
 sheet=el('div','ks-sheet');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Ritaglia');
 if(c.kind!=='video'||!c.mediaDur||c.mediaDur<=c.dur+.1){
  sheet.innerHTML='<p>'+(c.kind==='image'?'Questa è una foto: la durata la decide il modello.':'Il video è corto quanto la scena: non c’è altro da scegliere.')+'</p>';
 }else{
  const max=c.mediaDur-c.dur;
  sheet.innerHTML='<b>Da dove parte la scena</b><small>La scena dura '+fmt(c.dur)+'. Sposta per scegliere quale parte del video usare.</small>';
  const r=el('input');r.type='range';r.min=0;r.max=max.toFixed(2);r.step=.1;r.value=c.in;r.setAttribute('aria-label','Inizio della scena nel video');
  const out=el('output',null,fmt(c.in)+' / '+fmt(c.mediaDur));
  r.oninput=()=>{out.textContent=fmt(Number(r.value))+' / '+fmt(c.mediaDur);api.setIn(id,Number(r.value))};
  r.onchange=()=>renderStrip();
  sheet.append(r,out);
 }
 const ok=el('button','ks-ok','Fatto');ok.type='button';ok.onclick=()=>{closeSheet();renderStrip()};sheet.append(ok);
 bar.before(sheet);
}
function replace(){
 const id=window.koreSimple.selected();if(!id)return;
 const inp=document.createElement('input');inp.type='file';inp.accept='image/*,video/*';
 inp.onchange=async()=>{const f=inp.files?.[0];if(!f)return;const ok=await window.koreSimple.replace(id,f);if(ok){thumbs.clear();renderStrip()}else alert('Non sono riuscito a sostituire la scena. Riprova con un altro file.')};
 inp.click();
}
function build(){
 if(strip)return;
 const host=$('phoneTransport');if(!host)return false;
 strip=el('div','ks-strip');strip.id='koreSimpleStrip';
 bar=el('div','ks-bar');bar.id='koreSimpleBar';bar.setAttribute('role','toolbar');
 const items=[['⇄','Sostituisci',replace,true],['✂','Ritaglia',trimSheet,true],['◎','Filtri',()=>$('mobileEffects')?.click(),true],['T','Testo',()=>$('mobileText')?.click(),false],['☰','Avanzato',()=>disable(),false]];
 for(const [i,l,fn,need] of items){const b=el('button',null,'<span aria-hidden="true">'+i+'</span><small>'+l+'</small>');b.type='button';if(need)b.dataset.need='1';b.onclick=()=>{if(l!=='Ritaglia')closeSheet();fn()};bar.append(b)}
 host.after(strip);strip.after(bar);return true;
}
function enable(){
 if(!mobile.matches||!window.koreSimple)return;
 if(!build())return;
 document.body.classList.add('kore-simple');document.body.classList.remove('mobile-timeline-open');
 renderStrip();
}
function disable(){closeSheet();document.body.classList.remove('kore-simple')}
window.addEventListener('kore-template-created',()=>setTimeout(enable,350));
window.addEventListener('kore-simple-refresh',()=>{if(document.body.classList.contains('kore-simple'))renderStrip()});
new MutationObserver(()=>{if(document.body.classList.contains('kore-simple')){clearTimeout(window.__ksT);window.__ksT=setTimeout(mark,80)}}).observe(document.getElementById('tracks')||document.body,{attributes:true,subtree:true,attributeFilter:['class']});
mobile.addEventListener('change',()=>{if(!mobile.matches)disable()});
