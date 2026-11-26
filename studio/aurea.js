// Tema Aurea: palette oro/ambra con due varianti (Notte e Giorno).
// Ricalcola al volo i colori di tutti i fogli di stile; il video e l'anteprima restano invariati.
const KEY='koreTheme',MODES=['aurea-dark','aurea-light'],NAMES={'aurea-dark':'Aurea Notte','aurea-light':'Aurea Bianca'};
const SKIP=/data-kore-theme|k-themes|k-theme-btn|stage|preview|canvas|video|kc-wave|kfx-th|has-th|kore-wave|demo|poster|thumb/i;
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[h,s,l]}
function hsl2rgb(h,s,l){h/=360;const f=(p,q,t)=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p},q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return[f(p,q,h+1/3),f(p,q,h),f(p,q,h-1/3)].map(v=>Math.round(v*255))}
function map(r,g,b,mode){
 const[h,s,l]=rgb2hsl(r,g,b),light=mode==='aurea-light';
 if(s>.3&&l>.12&&l<.92){ // colori vivi: restano rosa e viola, piu' puliti e luminosi
  const nh=(h>=15&&h<=290)?(h<150?330:h):h;return hsl2rgb(nh,.92,light?Math.min(Math.max(l,.4),.5):Math.max(l,.58))}
 if(light){const nl=l<.3?.985-l*.12:l>.7?Math.max(.07,(1-l)*.5):1-l;return hsl2rgb(318,.2*(1-Math.abs(nl-.5)*1.7),nl)}
 return l<.3?hsl2rgb(268,.34,Math.min(.1,l*.7)):[r,g,b];
}
function conv(text,mode){
 return text.replace(/(:\s*|\s)(white|black)(?=[\s;,)!}]|$)/gi,(m,p,k)=>p+(k.toLowerCase()==='white'?'#ffffff':'#000000')).replace(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi,(m,x)=>{
  if(x.length<=4)x=x.split('').map(c=>c+c).join('');const r=parseInt(x.slice(0,2),16),g=parseInt(x.slice(2,4),16),b=parseInt(x.slice(4,6),16),a=x.slice(6,8),n=map(r,g,b,mode);return '#'+n.map(v=>v.toString(16).padStart(2,'0')).join('')+a})
 .replace(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi,(m,r,g,b,a)=>{const n=map(+r,+g,+b,mode);return a===undefined?`rgb(${n})`:`rgba(${n},${a})`});
}
function build(mode){
 let out='';
 for(const sh of [...document.styleSheets]){
  if(sh.ownerNode&&sh.ownerNode.id==='koreAurea')continue;let rules;try{rules=sh.cssRules}catch(e){continue}
  for(const r of rules){if(r.type===3||r.type===5)continue;const sel=r.selectorText||'';if(SKIP.test(sel))continue;const t=r.cssText;if(!/#[0-9a-f]{3}|rgb/i.test(t))continue;out+=conv(t,mode)+'\n'}
 }
 return out;
}
let current='aurea-dark';
export function setTheme(mode){
 if(!MODES.includes(mode))mode='aurea-dark';current=mode;
 document.getElementById('koreAurea')?.remove();document.documentElement.dataset.koreTheme=mode;
 {const st=document.createElement('style');st.id='koreAurea';st.textContent=build(mode)+'\nhtml,body{background-color:'+(mode==='aurea-light'?'#fbf5fa':'#07050d')+'}';document.head.append(st);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',mode==='aurea-light'?'#fbf5fa':'#07050d')}
 document.body.dataset.look=mode==='aurea-light'?'light':'graphite';
 document.querySelectorAll('.projects-home-card').forEach(e=>{if(mode==='aurea-light'){e.style.setProperty('background','linear-gradient(120deg,#b00af518,#ffffffb8)','important');e.style.setProperty('color','#1b1020','important')}else{e.style.removeProperty('background');e.style.removeProperty('color')}});
 try{localStorage.setItem(KEY,mode)}catch(e){}
 document.querySelectorAll('[data-kore-theme]').forEach(sel=>{sel.value=mode});
 document.querySelectorAll('.k-theme-btn').forEach(b=>b.title=NAMES[mode]);
}
export function nextTheme(){const n=MODES[(MODES.indexOf(current)+1)%MODES.length];setTheme(n);return NAMES[n]}
window.koreTheme={set:setTheme,next:nextTheme,get:()=>current,names:NAMES};
function addButtons(){homePicker();
 const mk=()=>{const b=document.createElement('button');b.type='button';b.className='k-theme-btn';b.textContent='◐';b.setAttribute('aria-label','Cambia tema');b.onclick=e=>{e.stopPropagation();const n=nextTheme();const t=document.getElementById('koreToast');if(t){t.textContent='Tema: '+n;t.hidden=false;clearTimeout(t._k);t._k=setTimeout(()=>t.hidden=true,1600)}};return b};
  const rail=document.getElementById('koreRail');if(rail&&!rail.querySelector('.k-theme-btn')){const b=mk();b.className+=' k-rail-theme';b.innerHTML='<i aria-hidden="true">◐</i><small>Tema</small>';rail.append(b)}
}
function homePicker(){
 const targets=[document.querySelector('#mobileStart .mobile-start-actions'),document.querySelector('.entry-functions')].filter(Boolean);
 for(const fn of targets){
  if(fn.nextElementSibling?.classList.contains('k-themes'))continue;
  const box=document.createElement('div');box.className='k-themes';box.setAttribute('role','group');box.setAttribute('aria-label','Tema');
  for(const [v,t] of [['aurea-dark','Aurea Notte'],['aurea-light','Aurea Bianca']]){const b=document.createElement('button');b.type='button';b.dataset.t=v;b.textContent=t;b.onclick=()=>{
   setTheme(v);
   markThemes()};box.append(b)}
  fn.after(box);
 }
 markThemes();
}
function markThemes(){const cur=current;document.querySelectorAll('.k-themes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.t===cur)))}
document.addEventListener('kore-theme-change',()=>markThemes());
function wireSelects(){
 document.querySelectorAll('[data-kore-theme]').forEach(sel=>{
  sel.innerHTML='<option value="aurea-dark">Aurea Notte</option><option value="aurea-light">Aurea Bianca</option>';sel.value=current;
  sel.addEventListener('change',e=>{e.stopImmediatePropagation();setTheme(sel.value)},true);
 });
}
function start(){wireSelects();homePicker();let saved='aurea-dark';try{saved=localStorage.getItem(KEY)||'aurea-dark'}catch(e){}addButtons();new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});setTheme(saved)}
if(document.readyState==='complete')setTimeout(start,300);else window.addEventListener('load',()=>setTimeout(start,300));
