// Pannello "Look & Effetti" per telefono: un tocco applica subito l'effetto alla clip selezionata.
const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n};
const ICON={fxGlitchPro:'⚡',fxGlitch:'▦',fxRGB:'◧',fxChroma:'🌈',fxShake:'〰',fxWave:'🌊',fxPulse:'💓',fxFlash:'✨',fxInvert:'◑',fxMosaic:'▩',fxZoomBurst:'💥',fxVHS:'📼',fxGrain:'⋰',fxFilm:'🎞',fxHolo:'🔷',fxPixel:'👾',fxVignette:'◉',fxLeak:'🔆',fxSpot:'🔦',fxStrobe:'💡',fxScan:'📡'};
let sheet=null,tab='fx';
function close(){sheet?.remove();sheet=null;document.body.classList.remove('kfx-open')}
export function openFxSheet(){
 const sel=document.getElementById('effect');if(!sel)return;
 const id=window.koreCap?.selected?.()||window.koreCap?.atPlayhead?.();if(!id){alert('Tocca prima la clip a cui dare l\'effetto.');return}
 window.koreCap.select(id);close();
 sheet=el('div','kfx');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Look ed effetti');
 const head=el('div','kfx-h');head.append(el('b',null,'Look & Effetti'));const x=el('button',null,'✕');x.type='button';x.onclick=close;head.append(x);
 const tabs=el('div','kfx-tabs');const tFx=el('button',null,'⚡ Effetti WOW'),tLook=el('button',null,'🎨 Look colore');tFx.type=tLook.type='button';tabs.append(tFx,tLook);
 const grid=el('div','kfx-grid');
 const opts=()=>[...sel.options].filter(o=>tab==='fx'?o.value.startsWith('fx'):!o.value.startsWith('fx'));
 function render(){
  tFx.setAttribute('aria-pressed',String(tab==='fx'));tLook.setAttribute('aria-pressed',String(tab==='look'));grid.replaceChildren();
  if(tab==='fx'){const none=el('button','kfx-c kfx-none','⊘\nNessuno');none.type='button';none.onclick=()=>apply('original');grid.append(none)}
  for(const o of opts()){const b=el('button','kfx-c',(tab==='fx'?(ICON[o.value]||'✦'):'●')+'\n'+o.textContent.replace(/^◆\s*/,''));b.type='button';b.dataset.v=o.value;b.setAttribute('aria-pressed',String(sel.value===o.value));b.onclick=()=>apply(o.value);grid.append(b)}
 }
 function apply(v){sel.value=v;sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}));for(const b of grid.children)b.setAttribute('aria-pressed',String(b.dataset.v===v))}
 tFx.onclick=()=>{tab='fx';render()};tLook.onclick=()=>{tab='look';render()};
 sheet.append(head,tabs,grid);document.body.append(sheet);document.body.classList.add('kfx-open');render();
}
window.koreFxSheet=openFxSheet;

// ---- Stile testo: font con anteprima, animazione, colore, ombra, dimensione ----
const FONTS=[['bebas','Bebas Neue'],['anton','Anton'],['montserrat','Montserrat'],['righteous','Righteous'],['outfit','Outfit'],['space','Space Grotesk'],['playfair','Playfair Display'],['oswald','Oswald'],['mono','Space Mono']];
const ANIMS=[['none','Fermo'],['pop','Pop'],['slide','Slide'],['typewriter','Scrivi'],['fade','Fade'],['pulse','Pulse'],['rotate','Ruota']];
const SHADOWS=[['none','Nessuna'],['soft','Morbida'],['neon','Neon rosa'],['cyan','Neon azzurro'],['gold','Oro']];
const COLORS=['#ffffff','#ffe14e','#ff2d92','#c4ff5d','#6cecff','#ff8a3d','#a56eff','#000000'];
let tsheet=null;
const setIn=(id,v)=>{const i=document.getElementById(id);if(!i)return;i.value=String(v);i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))};
function closeText(){tsheet?.remove();tsheet=null;document.body.classList.remove('kfx-open')}
export function openTextSheet(){
 const id=window.koreCap?.selected?.();const c=id&&window.koreCap.rows().flatMap(r=>r.clips).find(x=>x.id===id);
 if(!c||c.kind!=='title')return false;
 const mt=document.getElementById('mobileTools');if(mt&&!mt.classList.contains('hidden'))document.getElementById('mobileToolsClose')?.click();
 closeText();close();
 tsheet=el('div','kfx kfx-text');tsheet.setAttribute('role','dialog');tsheet.setAttribute('aria-label','Stile del testo');
 const head=el('div','kfx-h');head.append(el('b',null,'Stile testo'));const x=el('button',null,'✕');x.type='button';x.onclick=closeText;head.append(x);
 const body=el('div','kfx-body');
 const sec=(t,node)=>{body.append(el('div','kfx-t',t),node)};
 const cur=k=>document.getElementById(k)?.value;
 const chips=(cls,items,idIn,label)=>{const row=el('div','kfx-row '+cls);for(const [v,l] of items){const b=el('button','kfx-chip',l);b.type='button';b.dataset.v=v;if(cls==='fonts')b.style.fontFamily="'"+(Object.fromEntries(FONTS.map(f=>[f[0],f[1]]))[v])+"',sans-serif";b.setAttribute('aria-pressed',String(cur(idIn)===v));b.onclick=()=>{setIn(idIn,v);for(const o of row.children)o.setAttribute('aria-pressed',String(o.dataset.v===v))};row.append(b)}return row};
 sec('Font',chips('fonts',FONTS,'titleFont'));
 sec('Animazione',chips('',ANIMS,'titleAnimation'));
 const cr=el('div','kfx-row');for(const col of COLORS){const b=el('button','kfx-dot');b.type='button';b.style.background=col;b.setAttribute('aria-label','Colore '+col);b.setAttribute('aria-pressed',String((cur('titleColor')||'').toLowerCase()===col));b.onclick=()=>{setIn('titleColor',col);for(const o of cr.children)o.setAttribute('aria-pressed',String(o===b))};cr.append(b)}
 sec('Colore',cr);
 const ar=el('div','kfx-row');for(const col of COLORS.slice(1,7)){const b=el('button','kfx-dot');b.type='button';b.style.background=col;b.setAttribute('aria-label','Evidenziazione '+col);b.setAttribute('aria-pressed',String((cur('titleAccent')||'').toLowerCase()===col));b.onclick=()=>{setIn('titleAccent',col);for(const o of ar.children)o.setAttribute('aria-pressed',String(o===b))};ar.append(b)}
 sec('Evidenziazione',ar);
 sec('Ombra / bagliore',chips('',SHADOWS,'titleShadow'));
 const sz=document.getElementById('titleSize');
 if(sz){const r=el('input');r.type='range';r.min=sz.min||'12';r.max=sz.max||'120';r.value=sz.value;r.setAttribute('aria-label','Dimensione');r.oninput=()=>setIn('titleSize',r.value);sec('Dimensione',r)}
 tsheet.append(head,body);document.body.append(tsheet);document.body.classList.add('kfx-open');return true;
}
window.koreTextSheet=openTextSheet;
