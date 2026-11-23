// "Sovrapponi" da telefono: foto, loghi o video sopra il montaggio, con scontorno (colore o AI) e controlli touch.
import {removeBackgroundColor,applyMask,visibleBounds} from './overlay-cutout.js?v=overlay-1';
import {createObjectAI} from './product-studio.js?v=objects-5';
const $=id=>document.getElementById(id);
const MAX_SIDE=1400;
let ai=null,dialog,state=null,runId=0;

function el(tag,props={},...kids){const n=Object.assign(document.createElement(tag),props);n.append(...kids);return n}
function toast(text){let t=$('phoneOverlayToast');if(!t){t=el('div',{id:'phoneOverlayToast',role:'status'});document.body.append(t)}t.textContent=text;t.classList.add('on');clearTimeout(t.timer);t.timer=setTimeout(()=>t.classList.remove('on'),5200)}

async function loadImage(file){
 try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){}
 return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Immagine non leggibile'))};img.src=url});
}
function workCanvas(img){
 const sw=img.width||img.naturalWidth,sh=img.height||img.naturalHeight,k=Math.min(1,MAX_SIDE/Math.max(sw,sh)),c=document.createElement('canvas');
 c.width=Math.max(1,Math.round(sw*k));c.height=Math.max(1,Math.round(sh*k));c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);return c;
}
function fromPixels(data,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(new ImageData(data,w,h),0,0);return c}
function cropped(c){
 const ctx=c.getContext('2d',{willReadFrequently:true}),d=ctx.getImageData(0,0,c.width,c.height),b=visibleBounds(d.data,c.width,c.height);
 if(!b||(b.w===c.width&&b.h===c.height))return c;
 const o=document.createElement('canvas');o.width=b.w;o.height=b.h;o.getContext('2d').drawImage(c,b.x,b.y,b.w,b.h,0,0,b.w,b.h);return o;
}

function setBusy(text){state.busy=!!text;dialog.querySelector('[data-status]').textContent=text||state.note||'';dialog.classList.toggle('busy',!!text);for(const b of dialog.querySelectorAll('[data-mode],[data-add],[data-back]'))b.disabled=!!text&&b.dataset.back===undefined}
function show(canvas){
 const view=dialog.querySelector('canvas');view.width=canvas.width;view.height=canvas.height;const ctx=view.getContext('2d');ctx.clearRect(0,0,view.width,view.height);ctx.drawImage(canvas,0,0);
}

async function apply(mode){
 if(!state||!state.work)return;const id=++runId;state.mode=mode;state.note='';
 for(const b of dialog.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
 dialog.querySelector('[data-tol]').hidden=mode!=='color';
 const w=state.work.width,h=state.work.height,ctx=state.work.getContext('2d',{willReadFrequently:true});
 try{
  if(mode==='orig'){state.result=state.work;show(state.work);setBusy('');return}
  const src=ctx.getImageData(0,0,w,h);
  if(mode==='color'){
   const tol=Number(dialog.querySelector('[data-tol] input').value),r=removeBackgroundColor(src.data,w,h,tol);
   if(id!==runId)return;
   if(!r.background){state.note='Lo sfondo è già trasparente.';state.result=state.work;show(state.work);setBusy('');return}
   state.note=r.removed<.02?'Quasi nulla tolto: lo sfondo non è uniforme. Prova "Foto · AI".':r.removed>.97?'Tolto quasi tutto: abbassa la precisione.':'Sfondo tolto. Regola la precisione se serve.';
   state.result=cropped(fromPixels(r.data,w,h));show(state.result);setBusy('');return;
  }
  if(!state.mask){
   ai??=createObjectAI();setBusy('Preparazione AI…');
   state.mask=await ai.run(state.work,{onProgress:t=>{if(id===runId)setBusy(t)}});
  }
  if(id!==runId)return;
  const r=applyMask(src.data,w,h,state.mask.mask,state.mask.width,state.mask.height);
  state.note=r.kept<.01?'Nessun soggetto trovato.':'Soggetto separato. Controlla i bordi prima di aggiungere.';
  state.result=cropped(fromPixels(r.data,w,h));show(state.result);setBusy('');
 }catch(e){if(id!==runId)return;state.result=state.work;show(state.work);state.mask=null;state.note='';setBusy('');dialog.querySelector('[data-status]').textContent=(e&&e.message)||'Non riuscito. Riprova.';for(const b of dialog.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode==='orig'))}
}

function reset(){runId++;ai?.dispose();ai=null;state=null;dialog.classList.remove('editing','busy');dialog.querySelector('[data-status]').textContent=''}
async function chooseImage(file){
 if(!file)return;
 try{
  const img=await loadImage(file);state={file,work:workCanvas(img),result:null,mask:null,mode:'orig',note:'',busy:false};
  img.close?.();dialog.classList.add('editing');state.result=state.work;show(state.work);apply('orig');
  dialog.querySelector('[data-tol] input').value=28;
 }catch(e){state=null;toast(e.message||'File non valido')}
}
async function addToProject(files,label){
 if(typeof window.koreOverlayImport!=='function')return toast('Funzione non disponibile in questa versione.');
 $('phoneMoreDialog')?.close?.();
 const r=await window.koreOverlayImport(files);
 if(!r||!r.imported)return toast('Non sono riuscito ad aggiungerlo. Riprova con un altro file.');
 document.body.classList.remove('mobile-timeline-open');$('mobileTimeline')?.setAttribute('aria-pressed','false');
 if(r.clipId)window.koreTouchEdit?.(r.clipId);
 toast(label+' aggiunto · trascinalo con un dito, due dita per ingrandire e ruotare');
}
async function confirmAdd(){
 if(!state||state.busy)return;const {result,file}=state;let out=file;
 if(result!==state.work){
  const blob=await new Promise(r=>result.toBlob(r,'image/png'));
  if(!blob)return toast('Esportazione immagine non riuscita.');
  out=new File([blob],(file.name.replace(/\.[^.]+$/,'')||'logo')+'-senza-sfondo.png',{type:'image/png'});
 }
 dialog.close();reset();await addToProject([out],'Elemento');
}

function build(){
 if($('phoneOverlayDialog'))return;
 dialog=el('dialog',{id:'phoneOverlayDialog'});dialog.setAttribute('aria-labelledby','phoneOverlayTitle');
 const imageInput=el('input',{type:'file',accept:'image/*',hidden:true}),videoInput=el('input',{type:'file',accept:'video/*',hidden:true});
 const head=el('div',{className:'po-head'},el('h2',{id:'phoneOverlayTitle',textContent:'Sovrapponi sul video'}),el('button',{type:'button',textContent:'✕',ariaLabel:'Chiudi'}));
 head.querySelector('button').onclick=()=>dialog.close();
 const pick=el('div',{className:'po-pick'},
  Object.assign(el('button',{type:'button',className:'po-big'},el('span',{textContent:'▧'}),el('b',{textContent:'Foto o logo'}),el('small',{textContent:'Con sfondo trasparente e AI'})),{onclick:()=>imageInput.click()}),
  Object.assign(el('button',{type:'button',className:'po-big'},el('span',{textContent:'▶'}),el('b',{textContent:'Video'}),el('small',{textContent:'Un secondo video sopra il primo'})),{onclick:()=>videoInput.click()}));
 const modes=el('div',{className:'po-modes',role:'group',ariaLabel:'Sfondo'});
 for(const [mode,label] of [['orig','Originale'],['color','Logo · togli colore'],['ai','Foto · AI']]){const b=el('button',{type:'button',textContent:label});b.dataset.mode=mode;b.setAttribute('aria-pressed',String(mode==='orig'));b.onclick=()=>apply(mode);modes.append(b)}
 const tol=el('label',{className:'po-tol'},el('span',{textContent:'Precisione'}),el('input',{type:'range',min:6,max:90,step:1,value:28}));tol.dataset.tol='1';tol.hidden=true;
 let timer;tol.querySelector('input').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>apply('color'),120)};
 const stage=el('div',{className:'po-stage'},el('canvas',{ariaLabel:'Anteprima della sovrapposizione'}));
 const status=el('p',{className:'po-status',role:'status'});status.dataset.status='1';
 const add=el('button',{type:'button',className:'po-add',textContent:'＋ Aggiungi al video'});add.dataset.add='1';add.onclick=confirmAdd;
 const back=el('button',{type:'button',className:'po-back',textContent:'Cambia file'});back.dataset.back='1';back.onclick=reset;
 const edit=el('div',{className:'po-edit'},stage,modes,tol,status,el('div',{className:'po-actions'},back,add));
 dialog.append(head,pick,edit,imageInput,videoInput);
 imageInput.onchange=()=>{const f=imageInput.files?.[0];imageInput.value='';chooseImage(f)};
 videoInput.onchange=async()=>{const f=videoInput.files?.[0];videoInput.value='';if(f){dialog.close();await addToProject([f],'Video')}};
 dialog.addEventListener('close',reset);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 document.body.append(dialog);
}

function addButton(){
 const bar=$('mobileEditorBar');if(!bar||$('phoneOverlayOpen'))return !!$('phoneOverlayOpen');
 const b=el('button',{id:'phoneOverlayOpen',type:'button'});b.innerHTML='<span aria-hidden="true">◫</span><small>Sovrapponi</small>';b.setAttribute('aria-label','Sovrapponi foto, logo o video');b.style.order='2';
 b.onclick=()=>{reset();dialog.showModal()};bar.append(b);return true;
}

// Controlli extra nel pannello touch per foto/video: ruota, specchia, trasparenza, elimina.
function extras(panel){
 if(panel.querySelector('.kore-extra'))return;
 const bold=panel.querySelector('[data-style="bold"]');if(!bold||!bold.hidden)return; // solo foto/video, non titoli
 const set=(id,value)=>{const input=$(id);input.value=String(value);input.dispatchEvent(new Event('change',{bubbles:true}))};
 const row=el('div',{className:'kore-extra'});
 const mk=(label,aria,fn)=>{const b=el('button',{type:'button',textContent:label,ariaLabel:aria});b.onclick=fn;row.append(b)};
 const turn=d=>{const v=Number($('rotation').value)||0;set('rotation',Math.round(((v+d+540)%360)-180))};
 mk('⟲ 15°','Ruota a sinistra',()=>turn(-15));mk('⟳ 15°','Ruota a destra',()=>turn(15));
 mk('◐ −','Più trasparente',()=>set('opacity',Math.max(10,(Number($('opacity').value)||100)-15)));
 mk('◐ +','Meno trasparente',()=>set('opacity',Math.min(100,(Number($('opacity').value)||100)+15)));
 mk('⇋ Specchia','Specchia',()=>set('mirror',$('mirror').value==='on'?'off':'on'));
 const del=el('button',{type:'button',textContent:'🗑 Elimina',ariaLabel:'Elimina elemento',className:'danger'});
 del.onclick=()=>{$('remove').click();panel.querySelector('[aria-label="Chiudi modifica touch"]')?.click()};row.append(del);
 panel.querySelector('.touch-actions').after(row);
}
function watchPanel(){
 new MutationObserver(()=>{const p=$('koreTouchEditor');if(p)extras(p)}).observe(document.body,{childList:true});
}

function init(){build();watchPanel();let tries=0;const t=setInterval(()=>{if(addButton()||++tries>75)clearInterval(t)},200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
