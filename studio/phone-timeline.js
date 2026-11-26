// Barra azioni sulla timeline da telefono: Dividi, Modifica, Duplica, Elimina per la clip selezionata, più zoom.
// Ogni pulsante inoltra il tocco al pulsante originale dell'editor, così la logica resta una sola.
const $=id=>document.getElementById(id);
const mobile=matchMedia('(max-width:759px)');
const ITEMS=[
 {icon:'✂',label:'Dividi',target:'mobileSplit',needsClip:true},
 {icon:'☷',label:'Modifica',target:'mobileAdvanced',needsClip:true},
 {icon:'⧉',label:'Duplica',target:'duplicate',needsClip:true},
 {icon:'✕',label:'Elimina',target:'remove',needsClip:true,danger:true},
 null,
 {icon:'−',label:'Riduci',target:'timelineZoomOut',aria:'Riduci zoom timeline'},
 {icon:'+',label:'Zoom',target:'timelineZoomIn',aria:'Aumenta zoom timeline'},
 {icon:'↔',label:'Adatta',target:'timelineFit',aria:'Adatta la timeline allo schermo'}
];
function build(){
 const hint=$('phoneSelectionHint');
 if(!hint||$('phoneClipBar'))return !!$('phoneClipBar');
 const bar=document.createElement('div');bar.id='phoneClipBar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Azioni sulla clip e zoom');
 for(const item of ITEMS){
  if(!item){bar.append(document.createElement('i'));continue}
  const b=document.createElement('button');b.type='button';b.dataset.target=item.target;if(item.needsClip)b.dataset.needsClip='1';if(item.danger)b.className='danger';
  b.setAttribute('aria-label',item.aria||item.label);b.innerHTML='<span aria-hidden="true">'+item.icon+'</span>'+item.label;
  b.onclick=()=>{const original=$(item.target);if(original&&!original.disabled)original.click()};
  bar.append(b);
 }
 hint.after(bar);
 return true;
}
function update(){
 const bar=$('phoneClipBar');if(!bar)return;
 const body=document.body;
 const open=mobile.matches&&body.classList.contains('mobile-timeline-open')&&!body.classList.contains('mobile-home-open');
 const hasClips=!!document.querySelector('#tracks .clip'),selected=!!document.querySelector('#tracks .clip.selected');
 body.classList.toggle('phone-clipbar-on',open&&hasClips);
 body.classList.toggle('phone-clip-selected',open&&selected);
 for(const b of bar.querySelectorAll('[data-needs-clip]'))b.disabled=!selected;
}
let tries=0;
const wait=setInterval(()=>{
 if(build()){
  clearInterval(wait);
  const tracks=$('tracks');
  if(tracks)new MutationObserver(update).observe(tracks,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['class']});
  mobile.addEventListener('change',update);
  update();
 }else if(++tries>75)clearInterval(wait);
},200);

// Maniglia "Timeline": di base la timeline resta chiusa; si apre solo toccando questa barra (e si richiude allo stesso modo).
function buildHandle(){
 const bar=$('mobileEditorBar');if(!bar||$('phoneTimelineHandle'))return !!$('phoneTimelineHandle');
 const h=document.createElement('button');h.id='phoneTimelineHandle';h.type='button';h.setAttribute('aria-controls','timeline');
 h.innerHTML='<span class="th-grip" aria-hidden="true"></span><span class="th-label"></span><span class="th-info"></span>';
 h.onclick=()=>{$('mobileTimeline')?.click()};
 bar.before(h);
 const refresh=()=>{
  const open=document.body.classList.contains('mobile-timeline-open'),count=document.querySelectorAll('#tracks .clip').length,clock=$('clock')?.textContent||'';
  h.setAttribute('aria-expanded',String(open));
  h.querySelector('.th-label').textContent=open?'▼ Chiudi timeline':'▲ Timeline';
  h.querySelector('.th-info').textContent=count+(count===1?' clip':' clip')+' · '+clock.split('/')[0].trim();
  document.body.classList.toggle('phone-handle-on',mobile.matches&&count>0&&!document.body.classList.contains('mobile-home-open'));
 };
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});
 if($('tracks'))new MutationObserver(refresh).observe($('tracks'),{childList:true,subtree:true});
 if($('clock'))new MutationObserver(refresh).observe($('clock'),{childList:true,characterData:true,subtree:true});
 mobile.addEventListener('change',refresh);refresh();return true;
}
let handleTries=0;const handleWait=setInterval(()=>{if(buildHandle()||++handleTries>75)clearInterval(handleWait)},200);
