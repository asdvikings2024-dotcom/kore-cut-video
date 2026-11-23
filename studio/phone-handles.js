// Maniglie direttamente sul video selezionato (stile CapCut): X per eliminare, ⟳ per ruotare, ⤢ per ridimensionare, ✦ per togliere lo sfondo con l'AI.
// Il trascinamento del corpo e il pizzico a due dita restano gestiti dall'editor touch.
const $=id=>document.getElementById(id);
const mobile=matchMedia('(max-width:759px)');
let box,btnRot,btnScale,btnDel,btnAI,drag=null,raf=0;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
function build(){
 const stage=document.querySelector('.stage');if(!stage||box)return !!box;
 box=el('div','kh');box.hidden=true;box.setAttribute('aria-label','Maniglie dell\'elemento');
 const mk=(cls,txt,label)=>{const b=el('button','kh-b '+cls,txt);b.type='button';b.setAttribute('aria-label',label);box.append(b);return b};
 btnDel=mk('kh-del','✕','Elimina elemento');btnRot=mk('kh-rot','⟳','Ruota trascinando');btnScale=mk('kh-scale','⤢','Ridimensiona trascinando');btnAI=mk('kh-ai','✦','Togli sfondo con AI');
 btnDel.onclick=e=>{e.stopPropagation();const id=window.koreCap?.selected();if(id)window.koreHandles.remove(id)};
 btnAI.onclick=e=>{e.stopPropagation();const id=window.koreCap?.selected();if(id)window.koreCutoutAI?.(id)};
 const start=(kind)=>e=>{
  const id=window.koreCap?.selected(),b=window.koreHandles.box(id);if(!b)return;e.preventDefault();e.stopPropagation();
  const r=b.canvas.getBoundingClientRect(),cx=r.left+b.cx*r.width,cy=r.top+b.cy*r.height;
  drag={kind,id,cx,cy,a0:Math.atan2(e.clientY-cy,e.clientX-cx),d0:Math.max(12,Math.hypot(e.clientX-cx,e.clientY-cy)),rot:b.rotation,zoom:b.zoom,pid:e.pointerId};
  e.currentTarget.setPointerCapture(e.pointerId);window.koreHandles.begin();
 };
 const move=e=>{
  if(!drag||e.pointerId!==drag.pid)return;e.preventDefault();
  if(drag.kind==='rot'){let d=(Math.atan2(e.clientY-drag.cy,e.clientX-drag.cx)-drag.a0)*180/Math.PI,v=drag.rot+d;v=((v+540)%360)-180;for(const t of [-180,-90,0,90,180])if(Math.abs(v-t)<=4)v=t===180?-180:t;window.koreHandles.set(drag.id,{rotation:Math.round(v*10)/10})}
  else{const k=Math.hypot(e.clientX-drag.cx,e.clientY-drag.cy)/drag.d0;window.koreHandles.set(drag.id,{zoom:Math.max(.08,Math.min(8,drag.zoom*k))})}
 };
 const end=e=>{if(!drag||e.pointerId!==drag.pid)return;drag=null;window.koreHandles.end()};
 btnRot.addEventListener('pointerdown',start('rot'));btnScale.addEventListener('pointerdown',start('scale'));
 for(const b of [btnRot,btnScale]){b.addEventListener('pointermove',move);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end)}
 stage.append(box);return true;
}
function place(){
 raf=0;
 const on=mobile.matches&&document.body.classList.contains('kore-cap')&&!document.body.classList.contains('mobile-home-open');
 const id=on&&window.koreCap?.selected(),b=id&&window.koreHandles?.box(id);
 if(!b){if(box)box.hidden=true;raf=requestAnimationFrame(place);return}
 const stage=box.parentElement.getBoundingClientRect(),r=b.canvas.getBoundingClientRect();
 // Se il video è più grande dell'anteprima, le maniglie restano dentro lo schermo.
 const w=Math.min(b.w,1)*r.width,h=Math.min(b.h,1)*r.height;
 const cx=r.left-stage.left+Math.max(w/2-(b.cx*r.width-r.width/2)*0,Math.min(r.width-w/2,b.cx*r.width)),cy=r.top-stage.top+Math.max(h/2,Math.min(r.height-h/2,b.cy*r.height));
 box.hidden=false;box.style.cssText='left:'+cx+'px;top:'+cy+'px;width:'+Math.max(44,w)+'px;height:'+Math.max(44,h)+'px;--r:'+(-b.rot)+'deg;transform:translate(-50%,-50%) rotate('+b.rot+'deg)';
 btnAI.hidden=b.kind!=='image';
 raf=requestAnimationFrame(place);
}
const wait=setInterval(()=>{if(build()){clearInterval(wait);if(!raf)raf=requestAnimationFrame(place)}},200);

// Etichetta verde "NUOVA": se non la vedi in alto, stai usando il link vecchio.
(async()=>{let v='';try{v=(await (await fetch(new URL('./build.json',import.meta.url),{cache:'no-store'})).json()).sha?.slice(0,7)||''}catch(e){}
 const b=el('div',null,'✓ NUOVA VERSIONE'+(v?' · '+v:''));b.id='koreNewBadge';document.body.append(b)})();
