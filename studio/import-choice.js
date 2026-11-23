// Quando da telefono aggiungi solo foto a un video già presente, chiede dove metterle:
// "Sopra il video" (logo o foto che si sposta col dito, con le maniglie) oppure "Dopo il video" (nuova scena).
// Così un logo non finisce più a schermo intero in fondo al montaggio senza poterlo spostare.
const $=id=>document.getElementById(id);
const mobile=matchMedia('(max-width:759px)');
function el(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n}
function hasClips(){try{return window.koreCap?.rows().some(r=>r.clips.length>0)}catch(e){return false}}
function ask(files){
 document.getElementById('koreImportChoice')?.remove();
 const wrap=el('div','kic');wrap.id='koreImportChoice';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','Dove aggiungo la foto?');
 const sheet=el('div','kic-sheet');
 const t=el('h2',null,files.length>1?'Dove aggiungo le foto?':'Dove aggiungo la foto?');
 const over=el('button','kic-big','<span>◫</span><b>Sopra il video</b><small>Logo o foto che sposti, ruoti e ingrandisci col dito</small>');
 const after=el('button','kic-big','<span>▶</span><b>Dopo il video</b><small>Come nuova scena in fondo</small>');
 const no=el('button','kic-no','Annulla');for(const b of [over,after,no])b.type='button';
 const close=()=>wrap.remove();
 over.onclick=async()=>{close();const r=await window.koreOverlayImport?.(files);if(!r?.imported)window.alert('Non sono riuscito ad aggiungerla. Riprova con un altro file.');else if(r.clipId&&window.koreCap){window.koreCap.select(r.clipId)}};
 after.onclick=async()=>{close();await window.koreCap?.addFiles(files)};
 no.onclick=close;wrap.onclick=e=>{if(e.target===wrap)close()};
 sheet.append(t,over,after,no);wrap.append(sheet);document.body.append(wrap);over.focus();
}
function init(){
 const input=$('import');if(!input||input.dataset.kic)return !!input;input.dataset.kic='1';
 input.addEventListener('change',e=>{
  if(!mobile.matches||document.body.classList.contains('mobile-home-open')||window.koreImportTarget||!hasClips())return;
  const files=[...(e.target.files||[])];
  if(!files.length||!files.every(f=>/^image\//.test(f.type)||/\.(png|jpe?g|webp|heic|heif|gif)$/i.test(f.name)))return;
  e.stopImmediatePropagation();e.target.value='';ask(files);
 },true);
 return true;
}
let tries=0;const t=setInterval(()=>{if(init()||++tries>75)clearInterval(t)},200);
