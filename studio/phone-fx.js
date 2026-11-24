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
