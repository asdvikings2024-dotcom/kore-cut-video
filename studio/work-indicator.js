// Indicatore di lavoro per i Sottotitoli AI: passi chiari, barra di avanzamento, tempo stimato,
// pillola sempre visibile (anche con la finestra ridotta) e schermo tenuto acceso durante l'analisi.
const $=id=>document.getElementById(id);
let lock=null;
export function parseStatus(text){
 const t=String(text||'');let m;
 if(/^✓/.test(t))return {phase:'done'};
 if(/^(Errore|Da verificare|Analisi annullata)/.test(t))return {phase:'end'};
 if(m=t.match(/Trascrizione\s+(\d+)\s*[–-]\s*(\d+)\s*s\s*\/\s*(\d+)\s*s/))return {phase:3,from:+m[1],to:+m[2],total:+m[3]};
 if(m=t.match(/Riprendo l.analisi da (\d+)/))return {phase:3,from:+m[1],to:+m[1],total:0,resumed:true};
 if(/Rianalisi/.test(t))return {phase:3,keep:true};
 if(m=t.match(/Download .*?(\d+)\s*%/))return {phase:2,download:+m[1]};
 if(/Caricamento AI|Preparazione|AI già pronta|Trascrizione già disponibile/.test(t))return {phase:2};
 if(/Decodifica|audio|Audio/.test(t))return {phase:1};
 return null;
}
export function formatEta(seconds){
 if(!Number.isFinite(seconds)||seconds<0)return '';
 if(seconds<8)return 'meno di 10 secondi';
 if(seconds<55)return 'circa '+Math.round(seconds/5)*5+' secondi';
 const min=Math.round(seconds/60);return 'circa '+min+(min===1?' minuto':' minuti');
}
export function estimate(samples,now,total,at){
 // samples: [{t, at}] a partire dal primo tratto; ritorna secondi rimanenti o null
 if(samples.length<2)return null;const a=samples[0],b=samples[samples.length-1],done=b.at-a.at,elapsed=(b.t-a.t)/1000;
 if(done<=0||elapsed<=0)return null;return Math.max(0,(total-at)/(done/elapsed));
}
async function keepAwake(on){
 try{if(on&&!lock&&navigator.wakeLock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null})}else if(!on&&lock){await lock.release();lock=null}}catch(e){}
}
function pill(){
 let p=$('koreWorkPill');if(p)return p;
 p=document.createElement('button');p.id='koreWorkPill';p.type='button';p.hidden=true;p.setAttribute('aria-live','polite');
 p.innerHTML='<span class="wp-dot" aria-hidden="true"></span><span class="wp-text"></span>';
 p.onclick=()=>{const d=$('koreVideoAsrDialog');if(d)d.classList.remove('kore-minimized')};
 document.body.append(p);return p;
}
function attach(dialog){
 if(dialog.dataset.work)return;dialog.dataset.work='1';
 const state=dialog.querySelector('.kore-speech-status'),actions=dialog.querySelector('.kore-speech-actions:last-of-type')||dialog.querySelector('.kore-speech-actions');
 if(!state)return;
 const box=document.createElement('div');box.className='kore-work';box.hidden=true;
 box.innerHTML='<div class="kw-step"></div><div class="kw-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="kw-eta"></div>';
 state.after(box);
 const step=box.querySelector('.kw-step'),bar=box.querySelector('.kw-bar'),fill=bar.firstElementChild,eta=box.querySelector('.kw-eta'),p=pill(),pt=p.querySelector('.wp-text');
 const min=document.createElement('button');min.type='button';min.className='kw-min';min.textContent='Riduci e continua a montare';min.hidden=true;
 (dialog.querySelector('.kore-caption-panel')||dialog).append(min);
 min.onclick=()=>dialog.classList.add('kore-minimized');
 let samples=[],ending=null;
 const show=(label,frac,etaText,pillText)=>{box.hidden=false;min.hidden=false;step.textContent=label;eta.textContent=etaText||'';if(frac==null){bar.classList.add('indeterminate');bar.removeAttribute('aria-valuenow');fill.style.width=''}else{bar.classList.remove('indeterminate');const v=Math.max(2,Math.min(100,Math.round(frac*100)));fill.style.width=v+'%';bar.setAttribute('aria-valuenow',String(v))}p.hidden=false;pt.textContent=pillText||label;keepAwake(true)};
 const stop=ok=>{samples=[];keepAwake(false);min.hidden=true;dialog.classList.remove('kore-minimized');if(ok){box.hidden=false;bar.classList.remove('indeterminate');fill.style.width='100%';step.textContent='Fatto';eta.textContent='';p.hidden=false;pt.textContent='✓ Sottotitoli pronti';clearTimeout(p.t);p.t=setTimeout(()=>{p.hidden=true},3500)}else{box.hidden=true;p.hidden=true}};
 const read=()=>{
  const r=parseStatus(state.textContent);if(!r)return;
  if(r.phase==='done')return stop(true);if(r.phase==='end')return stop(false);
  if(r.phase===1){samples=[];show('Passo 1 di 3 · Estraggo l’audio',null,'','✦ Estraggo l’audio…')}
  else if(r.phase===2){samples=[];if(r.download!=null)show('Passo 2 di 3 · Scarico l’AI ('+r.download+'%) · solo la prima volta',r.download/100,'Dopo il primo uso resta nel telefono','✦ Scarico l’AI · '+r.download+'%');else show('Passo 2 di 3 · Preparo l’AI',null,'','✦ Preparo l’AI…')}
  else if(r.phase===3&&!r.keep){
   const total=r.total||1,now=performance.now();samples.push({t:now,at:r.from});
   const left=r.total?estimate(samples,now,total,r.from):null,frac=r.total?r.from/total:null,etaText=left==null?(r.total?'Calcolo il tempo che manca…':''):'Mancano '+formatEta(left);
   const pc=frac==null?'':' · '+Math.round(frac*100)+'%';
   show('Passo 3 di 3 · Trascrivo '+(r.total?r.from+' s su '+total+' s':'…'),frac,etaText,'✦ Sottotitoli'+pc+(left==null?'':' · '+formatEta(left)));
  }
 };
 new MutationObserver(read).observe(state,{childList:true,characterData:true,subtree:true});
 new MutationObserver(()=>{if(!document.contains(dialog)){keepAwake(false);p.hidden=true}}).observe(document.body,{childList:true});
 read();
}
function init(){
 const scan=()=>{const d=$('koreVideoAsrDialog');if(d)attach(d)};
 new MutationObserver(scan).observe(document.body,{childList:true});scan();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()}
