// Tema Aurea: palette oro/ambra con due varianti (Notte e Giorno).
// Ricalcola al volo i colori di tutti i fogli di stile; il video e l'anteprima restano invariati.
const KEY='koreTheme',MODES=['orig','aurora-dark','aurora-light'],NAMES={orig:'Originale','aurora-dark':'Aurora Notte','aurora-light':'Aurora Giorno'};
const SKIP=/stage|preview|canvas|video|kc-wave|kfx-th|has-th|kore-wave|demo|poster|thumb/i;
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[h,s,l]}
function hsl2rgb(h,s,l){h/=360;const f=(p,q,t)=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p},q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return[f(p,q,h+1/3),f(p,q,h),f(p,q,h-1/3)].map(v=>Math.round(v*255))}
function map(r,g,b,mode){
 const[h,s,l]=rgb2hsl(r,g,b),light=mode==='aurora-light';
 if(s>.3&&l>.12&&l<.92){ // colori vivi: rosa/oro -> lime aurora; viola e azzurro restano
  const pinkOrGold=h>=290||h<70;
  if(pinkOrGold)return hsl2rgb(76,.95,light?Math.min(l,.36):Math.max(l,.55));
  return hsl2rgb(h,.8,light?Math.min(l,.42):Math.max(l,.55))}
 if(light){const nl=1-l;return hsl2rgb(225,.3*(1-Math.abs(nl-.5)*1.5),nl)}
 return l<.3?hsl2rgb(232,.3,Math.min(.14,l*.85)):[r,g,b];
}
function conv(text,mode){
 return text.replace(/(:\s*|\s)(white|black)(?=[\s;,)!}]|$)/gi,(m,p,k)=>p+(k.toLowerCase()==='white'?'#ffffff':'#000000')).replace(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi,(m,x)=>{
  if(x.length<=4)x=x.split('').map(c=>c+c).join('');const r=parseInt(x.slice(0,2),16),g=parseInt(x.slice(2,4),16),b=parseInt(x.slice(4,6),16),a=x.slice(6,8),n=map(r,g,b,mode);return '#'+n.map(v=>v.toString(16).padStart(2,'0')).join('')+a})
 .replace(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi,(m,r,g,b,a)=>{const n=map(+r,+g,+b,mode);return a===undefined?`rgb(${n})`:`rgba(${n},${a})`});
}
function build(mode){
 let out='';
 for(const sh of [...document.styleSheets]){
  if(sh.ownerNode&&sh.ownerNode.id==='koreAurora')continue;let rules;try{rules=sh.cssRules}catch(e){continue}
  for(const r of rules){if(r.type===3||r.type===5)continue;const sel=r.selectorText||'';if(SKIP.test(sel))continue;const t=r.cssText;if(!/#[0-9a-f]{3}|rgb/i.test(t))continue;out+=conv(t,mode)+'\n'}
 }
 return out;
}
let current='orig';
export function setTheme(mode){
 if(!MODES.includes(mode))mode='orig';current=mode;
 document.getElementById('koreAurora')?.remove();document.documentElement.dataset.koreTheme=mode;
 if(mode!=='orig'){const st=document.createElement('style');st.id='koreAurora';st.textContent=build(mode)+'\nhtml,body{background-color:'+(mode==='aurora-light'?'#eef2fb':'#080b16')+'}';document.head.append(st);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',mode==='aurora-light'?'#eef2fb':'#080b16')}
 if(mode!=='orig')document.body.dataset.look=mode==='aurora-light'?'light':'graphite';
 try{localStorage.setItem(KEY,mode)}catch(e){}
 document.querySelectorAll('[data-kore-theme]').forEach(sel=>{if(mode!=='orig')sel.value=mode});
 document.querySelectorAll('.k-theme-btn').forEach(b=>b.title=NAMES[mode]);
}
export function nextTheme(){const n=MODES[(MODES.indexOf(current)+1)%MODES.length];setTheme(n);return NAMES[n]}
window.koreTheme={set:setTheme,next:nextTheme,get:()=>current,names:NAMES};
function addButtons(){
 const mk=()=>{const b=document.createElement('button');b.type='button';b.className='k-theme-btn';b.textContent='◐';b.setAttribute('aria-label','Cambia tema');b.onclick=e=>{e.stopPropagation();const n=nextTheme();const t=document.getElementById('koreToast');if(t){t.textContent='Tema: '+n;t.hidden=false;clearTimeout(t._k);t._k=setTimeout(()=>t.hidden=true,1600)}};return b};
  const rail=document.getElementById('koreRail');if(rail&&!rail.querySelector('.k-theme-btn')){const b=mk();b.className+=' k-rail-theme';b.innerHTML='<i aria-hidden="true">◐</i><small>Tema</small>';rail.append(b)}
}
function wireSelects(){
 document.querySelectorAll('[data-kore-theme]').forEach(sel=>{
  for(const [v,t] of [['aurora-dark','Aurora Notte'],['aurora-light','Aurora Giorno']])if(![...sel.options].some(o=>o.value===v)){const o=document.createElement('option');o.value=v;o.textContent=t;sel.append(o)}
  sel.addEventListener('change',()=>{if(sel.value.startsWith('aurora'))setTheme(sel.value);else if(current!=='orig')setTheme('orig')})
 });
}
function start(){wireSelects();let saved='orig';try{saved=localStorage.getItem(KEY)||'orig'}catch(e){}addButtons();new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});if(saved!=='orig')setTheme(saved)}
if(document.readyState==='complete')setTimeout(start,300);else window.addEventListener('load',()=>setTimeout(start,300));
