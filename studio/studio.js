import {uniqueVisibleCaptions} from './caption-visibility.js?v=nav-22';
import {installPreviewLayout} from './preview-layout.js?v=layout-20';
import {installTouchEditor} from './touch-editor.js?v=overlay-3';
import {detectSilences} from './touch-transform.js?v=smart-20';
import {normalizeAsrTiming,findPauses,snapWordsToSpeech} from './asr-timing.js?v=word-1';
import {addCaptionPreview} from './caption-preview.js?v=preview-16';
import {transcriptAt,transcriptSrtRows} from './timed-transcript.js?v=type-21';
import {installCaptionLayout} from './caption-layout.js?v=smart-19';
import {suspiciousRepetition} from './asr-quality.js?v=speed-13';
import {extractAudioTrack} from './mp4-audio.js?v=audio-12';
import {captureCompatibleAudio} from './compatible-audio.js?v=audio-12';
import {askSaveBeforeExit} from './exit-guard.js?v=smart-19';
import {packProject,unpackProject,validateVideoProject,downloadBackup} from './project-archive.js?v=touch-18';
import {prepareSpeech,transcribeInWorker} from './asr-client.js?v=work-1';
import {installEntryMenu} from './entry-menu.js?v=entry-8';
import {sceneReady,sceneTarget,mediaMatchesFilter} from './scene-selection.js?v=immersive-7';
import {encodeNormalizedWav} from './audio-tools.js?v=projects-6';
import {drawStudioVideo,STUDIO_VIDEO_EFFECTS} from './creative-effects.js?v=objects-5';
import {installMobileExperience} from './mobile-experience.js?v=phone-4';
import { openPhotoEditor } from '/studio/photo-editor.js?v=smart-19';
'use strict';
const KORE_EDIT_TRANSITIONS={"editpush0": ["push", 0, "Push sinistra"], "editpush1": ["push", 1, "Push destra"], "editpush2": ["push", 2, "Push alto"], "editpush3": ["push", 3, "Push basso"], "editwhip0": ["whip", 0, "Whip sinistra"], "editwhip1": ["whip", 1, "Whip destra"], "editwhip2": ["whip", 2, "Whip alto"], "editwhip3": ["whip", 3, "Whip basso"], "editwipe0": ["wipe", 0, "Reveal sinistra"], "editwipe1": ["wipe", 1, "Reveal destra"], "editwipe2": ["wipe", 2, "Reveal alto"], "editwipe3": ["wipe", 3, "Reveal basso"], "editzoom0": ["zoom", 0, "Zoom punch"], "editzoom1": ["zoom", 1, "Zoom pull"], "editzoom2": ["zoom", 2, "Zoom bounce"], "editzoom3": ["zoom", 3, "Zoom smooth"], "editspin0": ["spin", 0, "Spin orario"], "editspin1": ["spin", 1, "Spin antiorario"], "editsplit0": ["split", 0, "Split verticale"], "editsplit1": ["split", 1, "Split orizzontale"]};

const modelPreviewMode=new URLSearchParams(location.search).get('previewModel');
const $=id=>document.getElementById(id),canvas=$('preview'),ctx=canvas.getContext('2d'),dbName='kore-studio-v1';
let px=70;
const desktopWorkspace=window.matchMedia('(min-width: 760px)');
let project={tracks:[{id:'v1',name:'Video 1'},{id:'v2',name:'Overlay'}],clips:[],ratio:'9:16'},media=new Map(),selected=null,time=0,playing=false,lastTick=0,history=[],future=[],db=null,renderBusy=false,exporting=false,dragState=null,playbackSource=null,importingMedia=false,previewFrameAt=0,previewUiAt=0;
const effectFilters={"filmGold":"sepia(.4) saturate(1.35) contrast(1.18)","filmBlue":"hue-rotate(22deg) saturate(.78) contrast(1.25)","filmGreen":"hue-rotate(65deg) saturate(.9) contrast(1.15)","filmRose":"hue-rotate(310deg) saturate(1.4) brightness(1.05)","filmAmber":"sepia(.7) saturate(1.6) hue-rotate(-15deg)","filmTeal":"hue-rotate(155deg) saturate(1.3) contrast(1.15)","filmViolet":"hue-rotate(250deg) saturate(1.35) contrast(1.12)","filmCopper":"sepia(.55) saturate(1.7) hue-rotate(-35deg)","filmIce":"hue-rotate(190deg) saturate(.7) brightness(1.15)","filmDusk":"sepia(.4) hue-rotate(-22deg) saturate(1.3) brightness(.9)","filmDawn":"sepia(.22) brightness(1.22) saturate(1.12)","filmNoir":"grayscale(1) contrast(1.8) brightness(.82)","filmSilver":"grayscale(1) contrast(1.12) brightness(1.12)","filmFade":"contrast(.72) saturate(.7) brightness(1.1)","filmPunch":"contrast(1.55) saturate(1.65)","filmMatte":"contrast(.78) saturate(.85)","filmGrainTone":"sepia(.16) contrast(.92) saturate(.82)","filmNightBlue":"brightness(.68) hue-rotate(32deg) saturate(1.25)","filmNightRed":"brightness(.62) sepia(.8) hue-rotate(-35deg)","filmHighKey":"brightness(1.4) contrast(.82)","filmLowKey":"brightness(.68) contrast(1.5)","filmPastel":"saturate(.6) contrast(.82) brightness(1.18)","filmCandy":"saturate(2.2) hue-rotate(330deg) brightness(1.12)","filmCyber":"saturate(2.7) contrast(1.45) hue-rotate(215deg)","filmAcid":"hue-rotate(95deg) saturate(2.6) contrast(1.2)","filmInfra":"hue-rotate(145deg) invert(.45) saturate(2)","filmNegative":"invert(1)","filmXray":"invert(1) grayscale(1) contrast(1.6)","filmDuotone":"grayscale(1) sepia(.9) hue-rotate(220deg) saturate(2)","filmAqua":"hue-rotate(160deg) saturate(1.75)","filmLime":"hue-rotate(80deg) saturate(1.8)","filmCherry":"hue-rotate(295deg) saturate(1.8)","filmPeach":"sepia(.3) hue-rotate(-15deg) brightness(1.12)","filmSand":"sepia(.55) saturate(.7) contrast(.9)","filmForest":"hue-rotate(70deg) brightness(.9) saturate(1.25)","filmOcean":"hue-rotate(175deg) contrast(1.25) brightness(.88)","filmStorm":"grayscale(.7) contrast(1.4) brightness(.72)","filmFog":"blur(2px) contrast(.8) brightness(1.18)","filmGlow":"blur(.7px) brightness(1.3) saturate(1.35)","filmSharp":"contrast(1.32) saturate(1.12)","filmSunset":"sepia(.48) saturate(1.35) brightness(1.16)","filmPolaroid":"sepia(.3) contrast(.86) saturate(.78)","filmBleach":"grayscale(.55) contrast(1.5) saturate(.7)","filmAnalog":"sepia(.2) contrast(1.08) saturate(.8)","filmPurpleHaze":"hue-rotate(275deg) blur(.8px) saturate(1.4)","filmRedAlert":"sepia(1) hue-rotate(-55deg) saturate(3) contrast(1.3)","original":"none","warm":"sepia(.28) saturate(1.22) contrast(1.12)","cool":"saturate(.9) hue-rotate(18deg) contrast(1.12)","mono":"grayscale(1) contrast(1.12)","vintage":"sepia(.48) contrast(.88) saturate(.75)","sepia":"sepia(.92)","neon":"saturate(2.4) contrast(1.28)","dream":"brightness(1.14) saturate(1.1) blur(1.2px)","contrast":"contrast(1.65)","desat":"saturate(.35)","night":"brightness(.65) contrast(1.25) hue-rotate(12deg)","soft":"contrast(.88) brightness(1.08)","retro":"sepia(.25) saturate(1.4) hue-rotate(-12deg)","bright":"brightness(1.35) contrast(1.05)"};
const KORE_LOOKS={"koreFuchsia": "Fuchsia Crush", "koreRose": "Rose Glass", "korePeach": "Peach Soda", "koreLilac": "Lilac Haze", "koreChrome": "Chrome Night", "koreMint": "Mint Fresh", "koreAmber": "Amber Hour", "koreIce": "Ice Pop", "koreVelvet": "Velvet Noir", "koreCandy": "Candy Club"};
Object.assign(effectFilters,{"koreFuchsia": "contrast(1.12) saturate(1.35) sepia(.16) hue-rotate(305deg)", "koreRose": "brightness(1.06) contrast(.94) sepia(.18) saturate(1.14) hue-rotate(320deg)", "korePeach": "sepia(.23) saturate(1.28) brightness(1.08) hue-rotate(345deg)", "koreLilac": "contrast(.9) saturate(.85) sepia(.2) hue-rotate(235deg)", "koreChrome": "grayscale(.6) contrast(1.28) brightness(.92) saturate(.8)", "koreMint": "sepia(.12) hue-rotate(100deg) saturate(1.15) brightness(1.07)", "koreAmber": "sepia(.38) saturate(1.2) contrast(1.08) brightness(1.04)", "koreIce": "contrast(1.13) saturate(.8) brightness(1.1) hue-rotate(12deg)", "koreVelvet": "grayscale(.85) contrast(1.35) brightness(.88)", "koreCandy": "saturate(1.65) contrast(1.08) brightness(1.04) hue-rotate(325deg)"});
const stillEffects=new Set(['fxPixel','fxVignette','fxHolo','fxEditPrism','fxEditGradient','fxEditFrame','fxEditCinema']);
let effectMode='palette';
function isAnimatedEffect(value){
 return value.startsWith('motion')||(value.startsWith('fx')&&!stillEffects.has(value));
}
function updateEffectSelection(){const effect=project.clips.find(c=>c.id===selected)?.effect||'original';for(const card of document.querySelectorAll('[data-drag-kind="effect"]'))card.setAttribute('aria-pressed',String(card.dataset.dragValue===effect))}
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36),clone=x=>JSON.parse(JSON.stringify(x)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const audioFileTypes={mp3:'audio/mpeg',m4a:'audio/mp4',m4b:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',flac:'audio/flac',aiff:'audio/aiff',aif:'audio/aiff',caf:'audio/x-caf'};
const audioAccept=['audio/*',...Object.keys(audioFileTypes).map(ext=>'.'+ext)].join(',');
function audioTypeFor(name){return audioFileTypes[String(name||'').split('.').pop().toLowerCase()]}
function mediaKind(file){
 const type=String(file?.type||'').toLowerCase();
 if(type.startsWith('audio/')||audioTypeFor(file?.name))return 'audio';
 if(type.startsWith('video/'))return 'video';
 if(type.startsWith('image/'))return 'image';
 const ext=String(file?.name||'').split('.').pop().toLowerCase();
 if(['mp4','mov','m4v','webm'].includes(ext))return 'video';
 if(['jpg','jpeg','png','webp','gif','avif','heic','heif'].includes(ext))return 'image';
 return null;
}
const duration=c=>(c.out-c.in)/c.speed,trackClips=id=>project.clips.filter(c=>c.track===id).sort((a,b)=>a.start-b.start),endTime=()=>Math.max(0,...project.clips.map(c=>c.start+duration(c))),fmt=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function status(s){$('status').textContent=s}
let exitCheckpoint=null,exitCheckpointKey=null;
function snapshot(){if(!exitCheckpoint||exitCheckpointKey!==activeProjectKey){exitCheckpoint=clone(project);exitCheckpointKey=activeProjectKey}history.push(clone(project));if(history.length>70)history.shift();future=[]}
function mutate(fn){if(exporting)return;snapshot();fn();syncVideoPlayback(true);refresh();persist()}
function seek(t){time=clamp(t,0,endTime());syncVideoPlayback(true);draw();refreshClock();renderInspector();document.querySelectorAll('.playhead').forEach(h=>h.style.left=time*px+'px')}
function refreshClock(){document.dispatchEvent(new Event('kore-timechange'));$('clock').textContent=fmt(time)+' / '+fmt(endTime());$('seek').value=endTime()?Math.round(1000*time/endTime()):0;if(document.activeElement!==$('preciseSeek'))$('preciseSeek').value=time.toFixed(1)}
function refresh(){renderTimeline();syncAdvancedControls();renderProjectMedia();renderInspector();refreshClock();draw();$('mobileEmpty').classList.toggle('hidden',project.clips.length>0);$('empty').classList.add('hidden');$('undo').disabled=!history.length;$('redo').disabled=!future.length;window.dispatchEvent(new Event('kore-cap-refresh'))}
let previewResolution=1080;
function frameDimensions(shortEdge,ratio){const [a,b]=ratio.split(':').map(Number);return a>=b?{width:Math.round(shortEdge*a/b/2)*2,height:shortEdge}:{width:shortEdge,height:Math.round(shortEdge*b/a/2)*2}}
function isTimedMedia(m){return m?.kind==='video'||m?.kind==='audio'}
function ensureAudioTrack(){let track=project.tracks.find(t=>t.kind==='audio');if(!track){track={id:uid(),name:'♫ Audio',kind:'audio'};project.tracks.push(track)}return track.id}
function canvasSize(){const size=frameDimensions(previewResolution,project.ratio);canvas.width=size.width;canvas.height=size.height;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';$('fit').textContent=project.ratio;$('ratio').value=project.ratio}
function assetOptionLabel(kind,value){if(kind==='motion')return 'Movimento keyframe';const id=kind==='effect'?'effect':'transitionPreset';return [...$(id).options].find(o=>o.value===value)?.textContent||value}
function clipAssetBadges(c){let html='';for(const [kind,key,none,icon] of [['effect','effect','original','✦'],['transition','transitionPreset','none','⇄']])if(c[key]&&c[key]!==none){const label=assetOptionLabel(kind,c[key]);html+='<button type="button" class="clip-asset-badge '+kind+'" data-clip="'+escapeHTML(c.id)+'" data-kind="'+kind+'" title="'+escapeHTML(label)+' · Seleziona per modificare">'+icon+' '+escapeHTML(label)+'</button>'}if(c.keyframes?.length)html+='<button type="button" class="clip-asset-badge motion" data-clip="'+escapeHTML(c.id)+'" data-kind="motion" title="Movimento keyframe · Seleziona per modificare">◆ Movimento</button>';return html?'<div class="clip-assets" data-clip="'+escapeHTML(c.id)+'" style="left:'+(c.start*px)+'px;width:'+Math.max(24,duration(c)*px-2)+'px">'+html+'</div>':''}
function applyTimelineAsset(c,kind,value){
 if(exporting||!c||!project.clips.includes(c))return false;if(kind==='effect'&&KORE_LOOKS[value]&&c.kind==='title'){return editorInfo('I look Colour Club si applicano a foto e video. Seleziona una clip media.')}const id=kind==='effect'?'effect':kind==='transition'?'transitionPreset':null;if(!id||![...$(id).options].some(o=>o.value===value))return false;
 let previous,span;if(kind==='transition'&&value==='crossfade'){previous=project.clips.filter(p=>p.id!==c.id&&p.track===c.track&&p.start<c.start).sort((a,b)=>b.start-a.start)[0];if(!previous){status('Per una dissolvenza tra clip serve una clip precedente sulla stessa traccia.');return false}span=Math.min(clamp(c.transitionDuration??.7,.1,2),duration(previous)/2,duration(c)/2);if(span<=.05)return false}
 mutate(()=>{selected=c.id;if(kind==='effect')c.effect=value;else{c.transitionPreset=value;c.fadeIn=value==='fade'?.5:value==='soft'?1.2:value==='flash'?.22:0;c.fadeOut=value==='fade'?.5:value==='soft'?1.2:0;if(previous){c.start=Math.max(previous.start+.05,previous.start+duration(previous)-span);c.fadeIn=0;c.fadeOut=0}}});
 if(kind==='transition'||time<c.start||time>=c.start+duration(c))seek(c.start+Math.min(.25,duration(c)/2));else draw();const label=assetOptionLabel(kind,value);status((kind==='effect'?'Effetto':'Transizione')+' applicato: '+label+' · visibile sotto la clip');mobileApplyFeedback('✓ '+label+' applicato');return true;
}
function setupAssetTouch(button,kind,value){
 let gesture=null,suppressClick=false;
 button.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false}},true);
 button.addEventListener('touchstart',e=>{
  if(exporting||!window.matchMedia('(max-width: 759px)').matches||gesture||e.touches.length!==1)return;
  const first=e.touches[0];gesture={id:first.identifier,x:first.clientX,y:first.clientY,active:false,timer:null};
  const find=(touches,id)=>Array.from(touches).find(t=>t.identifier===id);
  const cleanup=()=>{if(!gesture)return;clearTimeout(gesture.timer);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',end);document.removeEventListener('touchcancel',cancel);$('mobileDragHint').classList.add('hidden');clearAssetDrop();gesture=null};
  const move=event=>{if(!gesture)return;const point=find(event.changedTouches,gesture.id);if(!point)return;if(!gesture.active){if(Math.hypot(point.clientX-gesture.x,point.clientY-gesture.y)>10)clearTimeout(gesture.timer);return}event.preventDefault();const target=document.elementFromPoint(point.clientX,point.clientY);const clip=target&&timelineAssetTarget({target,clientX:point.clientX});document.querySelectorAll('.asset-drop-target').forEach(el=>el.classList.remove('asset-drop-target'));if(clip)$('tracks').querySelector('.clip[data-id="'+clip.id+'"]')?.classList.add('asset-drop-target');$('mobileDragHint').textContent=clip?'Rilascia sulla clip':'Trascina sulla clip nella timeline'};
  const end=event=>{if(!gesture)return;const point=find(event.changedTouches,gesture.id);if(!point)return;const active=gesture.active,target=active&&document.elementFromPoint(point.clientX,point.clientY),clip=target&&timelineAssetTarget({target,clientX:point.clientX});cleanup();if(!active)return;suppressClick=true;setTimeout(()=>{suppressClick=false},800);if(clip)applyTimelineAsset(clip,kind,value);else{const toast=$('mobileApplyToast');$('mobileApplyMessage').textContent='Rilascia sopra una clip nella timeline';$('mobileApplyUndo').classList.add('hidden');toast.classList.remove('hidden');clearTimeout(toast.hideTimer);toast.hideTimer=setTimeout(()=>toast.classList.add('hidden'),4000)}};
  const cancel=()=>cleanup();document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',end);document.addEventListener('touchcancel',cancel);
  gesture.timer=setTimeout(()=>{if(!gesture)return;gesture.active=true;document.body.classList.add('mobile-timeline-open');$('mobileTimeline').setAttribute('aria-pressed','true');$('mobileDragHint').textContent='Trascina sulla clip nella timeline';$('mobileDragHint').classList.remove('hidden');$('timeline').classList.add('asset-drag-active')},450);
 },{passive:true});
}
function setupAssetDrag(button,kind,value){button.draggable=true;button.dataset.dragKind=kind;button.dataset.dragValue=value;button.title='Trascina sulla clip nella timeline oppure fai clic per applicare';setupAssetTouch(button,kind,value);button.addEventListener('dragstart',e=>{if(exporting){e.preventDefault();return}e.dataTransfer.setData('application/x-kore-asset',JSON.stringify({kind,value}));e.dataTransfer.effectAllowed='copy';$('timeline').classList.add('asset-drag-active')});button.addEventListener('dragend',clearAssetDrop)}
function clearAssetDrop(){$('timeline').classList.remove('asset-drag-active');document.querySelectorAll('.asset-drop-target').forEach(el=>el.classList.remove('asset-drop-target'))}
function timelineAssetTarget(e){const exact=e.target.closest('.clip[data-id],.clip-assets[data-clip],.clip-asset-badge[data-clip]');if(exact)return project.clips.find(c=>c.id===(exact.dataset.id||exact.dataset.clip));const body=e.target.closest('.trackbody');if(!body)return null;const at=(e.clientX-body.getBoundingClientRect().left)/px;return trackClips(body.dataset.track).find(c=>at>=c.start&&at<c.start+duration(c))||null}
function enableAssetDrops(){const tracks=$('tracks');tracks.addEventListener('dragover',e=>{if(exporting||!Array.from(e.dataTransfer.types).includes('application/x-kore-asset'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';document.querySelectorAll('.asset-drop-target').forEach(el=>el.classList.remove('asset-drop-target'));const c=timelineAssetTarget(e);if(c)tracks.querySelector('.clip[data-id="'+c.id+'"]')?.classList.add('asset-drop-target')});tracks.addEventListener('drop',e=>{const raw=e.dataTransfer.getData('application/x-kore-asset');if(!raw)return;e.preventDefault();const c=timelineAssetTarget(e);clearAssetDrop();if(!c)return status('Rilascia l’effetto o la transizione sopra una clip.');try{const {kind,value}=JSON.parse(raw);applyTimelineAsset(c,kind,value)}catch(error){status('Elemento trascinato non valido.')}});tracks.addEventListener('dragleave',e=>{if(!tracks.contains(e.relatedTarget))document.querySelectorAll('.asset-drop-target').forEach(el=>el.classList.remove('asset-drop-target'))})}
function renderTimeline(){
 const timeline=$('timeline');
 const width=Math.max(400,timeline.clientWidth-64,endTime()*px+120);
 const tick=[.1,.2,.5,1,2,5,10,20,30,60].find(step=>step*px>=58)||60;
 timeline.style.setProperty('--timeline-grid',tick*px+'px');
 $('ruler').innerHTML='<div style="width:64px;flex:none"></div><div style="position:relative;height:25px;width:'+width+'px;flex:none">'+
 Array.from({length:Math.ceil(width/(tick*px))},(_,i)=>'<span style="position:absolute;left:'+(i*tick*px)+'px">'+Number((i*tick).toFixed(1))+'s</span>').join('')+'</div>';
 $('tracks').innerHTML=project.tracks.map(track=>{
  const clips=trackClips(track.id);
  const decorated=clips.some(c=>(c.effect&&c.effect!=='original')||(c.transitionPreset&&c.transitionPreset!=='none')||c.keyframes?.length);
  const clipHtml=clips.map(c=>{
   const name=c.kind==='title'?'T · '+(c.text||'Titolo'):media.get(c.media)?.name||'Media mancante · seleziona per ricollegare';
   const handles=(c.kind==='title'||media.get(c.media)?.ready)?'<span class="clip-trim" data-edge="start" title="Trascina per cambiare l’inizio"></span><span class="clip-trim" data-edge="end" title="Trascina per cambiare la fine"></span>':'';
   return '<button type="button" class="clip '+(c.kind==='title'||c.kind==='image'?'photo ':'')+(c.id===selected?'selected':'')+'" data-kind="'+c.kind+'" '+(c.kind==='audio'?'data-audio ':'')+'data-id="'+escapeHTML(c.id)+'" style="left:'+(c.start*px)+'px;width:'+Math.max(24,duration(c)*px-2)+'px" title="'+escapeHTML(name)+'">'+escapeHTML(name)+'<small>'+duration(c).toFixed(1)+'s</small>'+handles+'</button>'+clipAssetBadges(c);
  }).join('');
  return '<div class="track '+(decorated?'with-assets':'')+'"><div class="tracklabel">'+escapeHTML(track.name)+'</div><div class="trackbody" style="width:'+width+'px" data-track="'+track.id+'"><div class="playhead" style="left:'+(time*px)+'px"></div>'+clipHtml+'</div></div>';
 }).join('');
 if(desktopWorkspace.matches){
  const lane=document.createElement('div');lane.className='desktop-audio-drop';
  const label=document.createElement('span');label.textContent='Trascina qui un audio';
  const button=document.createElement('button');button.type='button';button.textContent='Importa audio';
  button.onclick=()=>document.querySelector('.toolbar .audio-import-button')?.click();
  lane.append(label,button);$('tracks').append(lane);
 }
 renderAdvancedTimeline(width);
 $('tracks').querySelectorAll('.clip-asset-badge').forEach(el=>el.onclick=()=>{
  const c=project.clips.find(c=>c.id===el.dataset.clip);
  if(!c)return;
  selected=c.id;seek(c.start+Math.min(.25,duration(c)/2));refresh();
  status(assetOptionLabel(el.dataset.kind,c[el.dataset.kind==='effect'?'effect':'transitionPreset'])+' · modifica nelle proprietà');
  if(!desktopWorkspace.matches)openMobileTools();
 });
}

function modelDemoSubject(template,type){if(template.subject)return template.subject;const mapping={travel:'travel',memories:'travel',wedding:'travel',realestate:'travel',summer:'travel',fashion:'fashion',beauty:'fashion',fitness:'fashion',sports:'fashion',podcast:'fashion',education:'fashion',food:'food',product:'food',night:'city',gaming:'city',retro90:'city',cinematic:'city'};if(mapping[template.id])return mapping[template.id];const list=type==='graphic'?GRAPHIC_TEMPLATES:SOCIAL_MIX_TEMPLATES;return ['travel','fashion','food','city'][Math.max(0,list.findIndex(t=>t.id===template.id))%4]}
function openModelPreview(template,type,apply){
 if(exporting||document.getElementById('modelPreviewDialog'))return;
 if(playing){playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback()}
 const dialog=document.createElement('div');dialog.id='modelPreviewDialog';dialog.className='model-preview-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Anteprima '+template.name);
 const panel=document.createElement('section');panel.className='model-preview-panel';const title=document.createElement('h2');title.textContent=template.name+(type==='social'?' · '+modelSceneCount(template)+' media':'');const frame=document.createElement('iframe');frame.title='Demo animata '+template.name;frame.allow='autoplay';frame.src='./?previewModel='+encodeURIComponent(type+':'+template.id);const note=document.createElement('p');note.textContent=(type==='social'?'Estratto fotografico animato di 4 scene. '+template.description+' nel montaggio completo.':'Esempio fotografico con la grafica selezionata.')+' Nessuna musica inclusa. I tuoi file non vengono modificati.';const actions=document.createElement('div');const close=document.createElement('button');close.textContent='‹ Indietro';const use=document.createElement('button');use.className='primary';use.textContent='Usa questo modello';const dismiss=()=>{frame.src='about:blank';dialog.remove();document.removeEventListener('keydown',key)};const key=e=>{if(e.key==='Escape')dismiss()};close.onclick=dismiss;use.onclick=()=>{dismiss();apply()};dialog.onclick=e=>{if(e.target===dialog)dismiss()};document.addEventListener('keydown',key);actions.append(close,use);panel.append(title,frame,note,actions);dialog.append(panel);document.body.append(dialog);close.focus();
}
function editorInfo(message){
 status(message);if(!window.matchMedia('(max-width: 759px)').matches)return false;
 const toast=$('mobileApplyToast');$('mobileApplyMessage').textContent=message;$('mobileApplyUndo').classList.add('hidden');toast.classList.remove('hidden');clearTimeout(toast.hideTimer);toast.hideTimer=setTimeout(()=>toast.classList.add('hidden'),6500);return false;
}
function mobileApplyFeedback(message){if(!window.matchMedia('(max-width: 759px)').matches)return;$('assetDock').classList.add('hidden');const toast=$('mobileApplyToast');$('mobileApplyMessage').textContent=message;$('mobileApplyUndo').classList.remove('hidden');toast.classList.remove('hidden');clearTimeout(toast.hideTimer);toast.hideTimer=setTimeout(()=>toast.classList.add('hidden'),6500)}
function selectMobileMedia(){if(!window.matchMedia('(max-width: 759px)').matches)return selectedClip();let c=selectedClip();if(c&&c.kind!=='title'&&media.has(c.media)&&time>=c.start&&time<c.start+duration(c))return c;c=activeClips(time).find(x=>x.kind!=='title'&&media.has(x.media))||project.clips.find(x=>x.kind!=='title'&&media.has(x.media));if(c){selected=c.id;if(time<c.start||time>=c.start+duration(c))seek(c.start+Math.min(.1,duration(c)/2))}return c}
let assetTab='media',libraryImport=false;
function openAssetTab(tab){assetTab=tab;$('assetDock').classList.remove('hidden');for(const name of ['media','effects','transitions','templates']){$('asset'+name[0].toUpperCase()+name.slice(1)).classList.toggle('hidden',tab!==name);document.querySelector('[data-asset-tab="'+name+'"]').classList.toggle('active',tab===name)}for(const [id,name] of [['showMedia','media'],['showEffects','effects'],['showTransitions','transitions'],['showTemplates','templates']])$(id).classList.toggle('active',tab===name);renderAssetLibrary()}
function appendFromLibrary(id,start=time,targetTrack=null){const m=media.get(id);if(!m)return status('Media non disponibile.');const len=m.kind==='image'?3:Math.min(m.el.duration||3,7200);mutate(()=>{const c={id:uid(),kind:m.kind,media:id,track:targetTrack||(m.kind==='audio'?ensureAudioTrack():project.tracks[0].id),start,in:0,out:len,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:0};project.clips.push(c);selected=c.id});status('Aggiunto alla timeline: '+m.name)}
function renderAssetLibrary(){
const box=$('mediaLibrary');box.replaceChildren();
if(!media.size){const empty=document.createElement('div');empty.className='asset-hint';empty.textContent='Nessun media importato. Premi ＋ Importa media.';box.append(empty)}
for(const m of media.values()){const button=document.createElement('button');button.className='asset-card';button.title='Aggiungi '+m.name+' alla timeline';const thumb=document.createElement('div');thumb.className='asset-thumb';if(m.kind==='image'){const img=document.createElement('img');img.className='asset-thumb';img.src=m.url;thumb.replaceWith(img);button.append(img)}else{const icon=document.createElement('span');icon.className='asset-icon';icon.textContent=m.kind==='audio'?'♫':'▶';button.append(icon)}const label=document.createElement('span');label.className='asset-label';label.textContent=m.name;const small=document.createElement('small');small.textContent=(m.kind==='audio'?'Audio':m.kind==='video'?'Video':'Foto')+' · Tocca per aggiungere';label.append(small);button.append(label);button.onclick=()=>appendFromLibrary(m.id);makeMediaDraggable(button,m.id);box.append(button)}
const effects=$('effectLibrary');
effects.replaceChildren();
const query=$('effectSearch').value.trim().toLocaleLowerCase('it');
const animatedMode=effectMode==='animated';
for(const option of $('effect').options){
 if(isAnimatedEffect(option.value)!==animatedMode||!option.textContent.toLocaleLowerCase('it').includes(query))continue;
 const button=document.createElement('button');
 button.className='asset-card';
 const icon=document.createElement('span');
 icon.className='asset-icon';
 icon.setAttribute('aria-hidden','true');
 if(animatedMode){icon.textContent='▶'}
 else{
  icon.classList.add('palette-swatch');
  const img=document.createElement('img');
  img.src='../studio/demo-fashion.jpg';
  img.alt='';
  img.loading='lazy';
  img.style.filter=effectFilters[option.value]||'none';
  icon.append(img);
 }
 const label=document.createElement('span');
 label.className='asset-label';
 label.textContent=option.textContent;
 button.append(icon,label);
 setupAssetDrag(button,'effect',option.value);
 button.onclick=()=>{
  const clip=selectMobileMedia();
  if(!clip)return editorInfo('Carica una foto o un video, poi scegli cosa applicare.');
  applyTimelineAsset(clip,'effect',option.value);
 };
 effects.append(button);
}
if(!effects.childElementCount){
 const empty=document.createElement('p');
 empty.className='asset-hint';
 empty.textContent=animatedMode?'Nessun effetto animato trovato.':'Nessuna palette o filtro trovato.';
 effects.append(empty);
}
const social=$('socialTemplateLibrary');social.replaceChildren();for(const t of SOCIAL_MIX_TEMPLATES){const btn=document.createElement('button');btn.className='template-card social-template-card';btn.style.setProperty('--accent',t.color);const preview=document.createElement('div');preview.className='template-preview';preview.style.backgroundImage='linear-gradient(0deg,#0009,#0001),url(./demo-'+modelDemoSubject(t,'social')+'.jpg)';const name=document.createElement('span');name.textContent=t.preview;preview.append(name);const title=document.createElement('strong');title.textContent=t.name;const subtitle=document.createElement('small');subtitle.textContent=modelSceneCount(t)+' MEDIA · '+t.description+' · ▶ Anteprima';btn.append(preview,title,subtitle);btn.onclick=()=>openModelPreview(t,'social',()=>insertSocialMixTemplate(t));social.append(btn)}
const templates=$('templateLibrary');templates.replaceChildren();for(const t of GRAPHIC_TEMPLATES){const btn=document.createElement('button');btn.className='template-card';btn.dataset.style=t.id;btn.style.setProperty('--accent',t.color);const preview=document.createElement('div');preview.className='template-preview';preview.style.backgroundImage='linear-gradient(0deg,#0009,#0001),url(./demo-'+modelDemoSubject(t,'graphic')+'.jpg)';const name=document.createElement('span');name.textContent=t.preview;preview.append(name);const title=document.createElement('strong');title.textContent=t.name;const subtitle=document.createElement('small');subtitle.textContent=t.description+' · ▶ Anteprima';btn.append(preview,title,subtitle);btn.onclick=()=>openModelPreview(t,'graphic',()=>insertGraphicTemplate(t));templates.append(btn)}
const transitions=$('transitionLibrary');transitions.replaceChildren();for(const option of $('transitionPreset').options){const button=document.createElement('button');button.className='asset-card';const icon=document.createElement('span');icon.className='asset-icon';icon.textContent='⇄';const label=document.createElement('span');label.className='asset-label';label.textContent=option.textContent;button.append(icon,label);setupAssetDrag(button,'transition',option.value);button.onclick=()=>{const c=selectMobileMedia();if(!c)return editorInfo('Carica una foto o un video, poi scegli la transizione.');applyTimelineAsset(c,'transition',option.value)};transitions.append(button)}
updateEffectSelection();
}
for(const name of ['media','effects','transitions','templates'])document.querySelector('[data-asset-tab="'+name+'"]').onclick=()=>openAssetTab(name);
$('showMedia').onclick=()=>openAssetTab('media');$('showEffects').onclick=()=>openAssetTab('effects');$('showTransitions').onclick=()=>openAssetTab('transitions');$('showTemplates').onclick=()=>openAssetTab('templates');$('dockClose').onclick=()=>{$('assetDock').classList.add('hidden');for(const id of ['showMedia','showEffects','showTransitions','showTemplates'])$(id).classList.remove('active')};$('dockImport').onclick=()=>{if(desktopWorkspace.matches)libraryImport=true;$('import').click()};$('youtubeHelp').onclick=()=>$('youtubePanel').classList.toggle('hidden');$('youtubeImport').onclick=()=>$('import').click();$('effectSearch').oninput=renderAssetLibrary;const effectModeButtons=[...document.querySelectorAll('[data-effect-mode]')];
for(const button of effectModeButtons)button.onclick=()=>{
 effectMode=button.dataset.effectMode;
 for(const control of effectModeButtons)control.setAttribute('aria-pressed',String(control===button));
 $('effectSearch').value='';
 $('effectSearch').placeholder=effectMode==='animated'?'Cerca effetti animati…':'Cerca palette e filtri…';
 renderAssetLibrary();
};

function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderInspector(){updateEffectSelection();const c=project.clips.find(c=>c.id===selected),missing=!!c&&c.kind!=='title'&&!media.has(c.media);$('relinkMedia').classList.toggle('hidden',!missing);$('mobileRelink').classList.toggle('hidden',!missing);$('inspector').classList.toggle('hidden',!c);for(const id of ['split','trimStart','trimEnd','duplicate','remove','moveBack','moveForward','crossfade','freezeFrame','reverseClip','speedRamp'])$(id).disabled=!c;$('applyMotion').disabled=!c;$('copyLook').disabled=!c||c.kind==='title';$('pasteLook').disabled=!c||c.kind==='title'||!lookClipboard;if(!c)return;
const kind=media.get(c.media)?.kind||c.kind,onlyAudio=kind==='audio';$('inspector').dataset.mediaKind=kind;for(const id of ['opacity','zoom','rotation','posX','posY','mirror','transitionPreset','transitionDuration','fadeIn','fadeOut'])$(id)?.closest('label')?.classList.toggle('audio-hidden',onlyAudio);$('previewTransition')?.classList.toggle('audio-hidden',onlyAudio);$('inspector').querySelectorAll('.creative-tools,.keyframe-tools').forEach(el=>el.classList.toggle('audio-hidden',onlyAudio));const view=animated(c,time);for(const [id,val] of Object.entries({speed:c.speed,audioFadeIn:c.audioFadeIn||0,audioFadeOut:c.audioFadeOut||0,opacity:view.opacity*100,zoom:view.zoom*100,rotation:view.rotation,posX:view.x*100,posY:view.y*100,fadeIn:c.fadeIn||0,fadeOut:c.fadeOut||0,transitionDuration:c.transitionDuration??.7,volume:(c.volume??1)*100,brightness:(c.brightness??1)*100,contrast:(c.contrast??1)*100,saturation:(c.saturation??1)*100}))$(id).value=val;
$('transitionDurationNumber').value=(c.transitionDuration??.7).toFixed(1);$('effect').value=c.effect||'original';$('fitMode').value=c.fitMode||'cover';$('mirror').value=c.mirror?'on':'off';$('transitionPreset').value=c.transitionPreset||'none';$('fitModeWrap').classList.toggle('hidden',c.kind==='title'||onlyAudio);for(const id of ['brightnessWrap','contrastWrap','saturationWrap'])$(id).classList.toggle('hidden',c.kind==='title'||onlyAudio);$('effect').closest('label').classList.toggle('audio-hidden',onlyAudio);for(const id of ['audioFadeInWrap','audioFadeOutWrap'])$(id).classList.toggle('hidden',!isTimedMedia(media.get(c.media)));$('volumeWrap').classList.toggle('hidden',!isTimedMedia(media.get(c.media)));const volumeLabel=$('volumeWrap').firstChild;if(volumeLabel?.nodeType===3)volumeLabel.textContent=onlyAudio?'Volume audio ':'Volume video ';$('titleTextWrap').classList.toggle('hidden',c.kind!=='title');$('titleSizeWrap').classList.toggle('hidden',c.kind!=='title');$('titleFontWrap').classList.toggle('hidden',c.kind!=='title');$('titleFont').value=c.fontFamily||'bebas';$('titleAnimationWrap').classList.toggle('hidden',c.kind!=='title');$('titleShadowWrap').classList.toggle('hidden',c.kind!=='title');$('titleAnimation').value=c.titleAnimation||'none';$('titleShadow').value=c.titleShadow||'none';$('titleColorWrap').classList.toggle('hidden',c.kind!=='title');$('titleStrokeWrap').classList.toggle('hidden',c.kind!=='title');$('titleColor').value=c.fontColor||'#ffffff';$('titleAccentWrap').classList.toggle('hidden',c.kind!=='title');$('titleAccent').value=c.graphicAccent||'#ff2d92';$('titleStroke').value=c.fontStroke||'#000000';if(c.kind==='title'){$('titleText').value=c.text||'';$('titleSize').value=c.fontSize||56}
$('keyframeEasing').value=c.keyframeEasing||'linear';$('keyframeInfo').textContent=visibleKeyframes(c).length+' keyframe'+((c.keyframes?.length||0)>visibleKeyframes(c).length?' · curva ritagliata':'')+' · testina '+Math.max(0,time-c.start).toFixed(1)+'s';$('removeKeyframe').disabled=!(c.keyframes||[]).some(f=>Math.abs(f.at-(time-c.start))<.12);$('layer').innerHTML=project.tracks.map(t=>'<option value="'+t.id+'">'+escapeHTML(t.name)+'</option>').join('');$('layer').value=c.track;$('clipInfo').textContent=duration(c).toFixed(2)+'s'}
function sourceTime(c,t){return c.in+(t-c.start)*c.speed}
const animatedProps=['x','y','zoom','rotation','opacity'];
function animated(c,t){const frames=(c.keyframes||[]).slice().sort((a,b)=>a.at-b.at);if(!frames.length)return c;const local=clamp(t-c.start,0,duration(c));let a=frames[0],b=frames[frames.length-1];if(local<=a.at)b=a;else if(local>=b.at)a=b;else for(let i=1;i<frames.length;i++)if(frames[i].at>=local){a=frames[i-1];b=frames[i];break}let u=a===b?0:clamp((local-a.at)/(b.at-a.at),0,1);const ease=c.keyframeEasing||'linear';if(ease==='ease')u=u*u*(3-2*u);else if(ease==='easeIn')u=u*u;else if(ease==='easeOut')u=1-(1-u)*(1-u);const out={...c};for(const k of animatedProps)out[k]=(a[k]??c[k])*(1-u)+(b[k]??c[k])*u;return out}
// Keep the interpolation anchors outside a retained segment. Replacing them
// with sampled endpoints would change nonlinear easing after a split or trim.
function slicedKeyframes(c,from,to){
 const frames=(c.keyframes||[]).slice().sort((a,b)=>a.at-b.at);if(!frames.length)return [];
 let before=-1,after=-1;for(let i=0;i<frames.length;i++){if(frames[i].at<=from)before=i;if(after<0&&frames[i].at>=to)after=i}
 return frames.filter((f,i)=>i===before||i===after||(f.at>from&&f.at<to)).map(f=>({...f,at:f.at-from}));
}
function visibleKeyframes(c){return (c.keyframes||[]).filter(f=>f.at>=-.000001&&f.at<=duration(c)+.000001)}
function audioFadeGain(c,t){
 const len=duration(c),local=t-c.start;if(!(len>0)||local<0||local>=len)return 0;
 const fadeIn=Math.min(clamp(Number(c.audioFadeIn)||0,0,5),len/2),fadeOut=Math.min(clamp(Number(c.audioFadeOut)||0,0,5),len/2);
 return Math.min(1,fadeIn>0?local/fadeIn:1,fadeOut>0?(len-local)/fadeOut:1);
}
function clipAlpha(c,t){const elapsed=t-c.start,left=c.start+duration(c)-t;return clamp((c.opacity??1)*Math.min(1,(c.fadeIn||0)>0?elapsed/c.fadeIn:1,(c.fadeOut||0)>0?left/c.fadeOut:1),0,1)}
function activeClips(t){return project.clips.filter(c=>t>=c.start&&t<c.start+duration(c)).sort((a,b)=>project.tracks.findIndex(x=>x.id===a.track)-project.tracks.findIndex(x=>x.id===b.track)||a.start-b.start)}
function overlapAlpha(c,t){if(c.transitionPreset!=='crossfade')return 1;const prev=project.clips.filter(p=>p.id!==c.id&&p.track===c.track&&p.start<c.start&&p.start+duration(p)>c.start).sort((a,b)=>b.start-a.start)[0];if(!prev)return 1;const overlap=Math.min(duration(c),prev.start+duration(prev)-c.start);return overlap>0?clamp((t-c.start)/overlap,0,1):1}
function outgoingOverlapAlpha(c,t){const next=project.clips.filter(p=>p.id!==c.id&&p.track===c.track&&p.transitionPreset==='crossfade'&&p.start>c.start&&p.start<c.start+duration(c)).sort((a,b)=>a.start-b.start)[0];if(!next)return 1;const span=Math.min(duration(next),c.start+duration(c)-next.start);return span>0?clamp((next.start+span-t)/span,0,1):1}
function transitionState(c,t){const kind=c.transitionPreset==='crossfade'?'none':c.transitionPreset||'none';const span=Math.min(clamp(c.transitionDuration??.7,.1,2),duration(c)/2);const elapsed=t-c.start,remaining=c.start+duration(c)-t;const entry=clamp(elapsed/Math.max(.01,span),0,1),exit=clamp(remaining/Math.max(.01,span),0,1);return {kind,progress:Math.min(entry,exit)}}
function applyEditTransition(c,t){const cfg=KORE_EDIT_TRANSITIONS[c.transitionPreset];if(!cfg)return false;const {progress:p}=transitionState(c,t);if(p>=1)return true;const [type,dir]=cfg,w=canvas.width,h=canvas.height,q=1-Math.pow(1-p,3),a=1-q;
if(type==='wipe'||type==='split'){ctx.beginPath();if(type==='split'){if(dir===0)ctx.rect(w*a/2,0,w*q,h);else ctx.rect(0,h*a/2,w,h*q)}else if(dir===0)ctx.rect(0,0,w*q,h);else if(dir===1)ctx.rect(w*a,0,w*q,h);else if(dir===2)ctx.rect(0,0,w,h*q);else ctx.rect(0,h*a,w,h*q);ctx.clip();return true}
ctx.translate(w/2,h/2);if(type==='push'||type==='whip'){const distance=type==='whip'?a*a:a;ctx.translate(dir<2?(dir===0?-1:1)*w*distance:0,dir>1?(dir===2?-1:1)*h*distance:0);if(type==='whip')ctx.rotate((dir%2?1:-1)*a*.04)}else if(type==='spin'){ctx.rotate((dir===0?1:-1)*a*Math.PI*.65);ctx.scale(1+a*.35,1+a*.35);ctx.globalAlpha*=q}else if(type==='zoom'){let z=dir===0?1+a*.65:dir===1?1-a*.45:dir===2?1+Math.sin(p*Math.PI*2)*a*.25:1+a*.15;ctx.scale(z,z);ctx.globalAlpha*=q}ctx.translate(-w/2,-h/2);return true}
function applySpatialTransition(c,t){if(applyEditTransition(c,t))return;const {kind,progress:p}=transitionState(c,t);if(p>=1)return;const w=canvas.width,h=canvas.height;let x=0,y=0,width=w,height=h;if(['modernWhip','modernPush','modernSnap','modernTilt'].includes(kind)){const eased=1-Math.pow(1-p,3);ctx.translate(w/2,h/2);if(kind==='modernWhip')ctx.translate((1-eased)*w,0);if(kind==='modernPush')ctx.translate(0,(1-eased)*h);if(kind==='modernSnap'){const scale=1+.22*(1-eased);ctx.scale(scale,scale);ctx.globalAlpha*=eased}if(kind==='modernTilt'){ctx.rotate((1-eased)*.12);ctx.scale(1+.15*(1-eased),1+.15*(1-eased));ctx.globalAlpha*=eased}ctx.translate(-w/2,-h/2);return}if(kind==='wipeLeft')width=w*p;else if(kind==='wipeRight'){x=w*(1-p);width=w*p}else if(kind==='wipeUp'){y=h*(1-p);height=h*p}else if(kind==='wipeDown')height=h*p;else if(kind==='irisDiamond'){ctx.beginPath();ctx.moveTo(w/2,h/2-h*p);ctx.lineTo(w/2+w*p,h/2);ctx.lineTo(w/2,h/2+h*p);ctx.lineTo(w/2-w*p,h/2);ctx.closePath();ctx.clip();return}
else if(kind==='irisSquare'){const ww=w*p,hh=h*p;ctx.beginPath();ctx.rect((w-ww)/2,(h-hh)/2,ww,hh);ctx.clip();return}
else if(kind==='curtain'){ctx.beginPath();ctx.rect(0,0,w*p/2,h);ctx.rect(w-w*p/2,0,w*p/2,h);ctx.clip();return}
else if(kind==='bars'||kind==='blinds'){const count=kind==='bars'?12:14;ctx.beginPath();for(let i=0;i<count;i++){if(kind==='bars')ctx.rect(w*i/count,0,w*p/count+1,h);else ctx.rect(0,h*i/count,w,h*p/count+1)}ctx.clip();return}
else if(kind==='diagonal'||kind==='sweep'){ctx.beginPath();const k=p*2.5-1.5;if(kind==='diagonal'){ctx.moveTo(0,0);ctx.lineTo(w*clamp(k+1,0,1),0);ctx.lineTo(w*clamp(k,0,1),h);ctx.lineTo(0,h)}else{ctx.moveTo(w,0);ctx.lineTo(w,h);ctx.lineTo(w*clamp(1-k,0,1),h);ctx.lineTo(w*clamp(-k,0,1),0)}ctx.closePath();ctx.clip();return}
else if(kind==='circleZoom'){ctx.beginPath();ctx.arc(w/2,h/2,Math.hypot(w,h)*p,0,Math.PI*2);ctx.clip();return}
else if(kind==='spinReveal'){ctx.translate(w/2,h/2);ctx.rotate((1-p)*Math.PI*1.4);ctx.scale(Math.max(.01,p),Math.max(.01,p));ctx.translate(-w/2,-h/2);return}
else if(kind==='flipX'||kind==='flipY'){ctx.translate(w/2,h/2);if(kind==='flipX')ctx.scale(Math.max(.01,p),1);else ctx.scale(1,Math.max(.01,p));ctx.translate(-w/2,-h/2);return}
else if(kind==='pop'){const s=1+(.35*Math.sin(Math.PI*p*2))*(1-p)-.8*(1-p)*(1-p);ctx.translate(w/2,h/2);ctx.scale(Math.max(.01,s),Math.max(.01,s));ctx.translate(-w/2,-h/2);return}
else if(kind==='iris'){ctx.beginPath();ctx.arc(w/2,h/2,Math.hypot(w,h)*p/2,0,Math.PI*2);ctx.clip();return}else if(kind.startsWith('slide')){const dx=kind==='slideLeft'?-(1-p)*w:kind==='slideRight'?(1-p)*w:0,dy=kind==='slideUp'?(1-p)*h:kind==='slideDown'?-(1-p)*h:0;ctx.translate(dx,dy);return}else if(kind==='zoomIn'||kind==='zoomOut'){const s=kind==='zoomIn'?.25+.75*p:1.8-.8*p;ctx.translate(w/2,h/2);ctx.scale(s,s);ctx.translate(-w/2,-h/2);return}else return;ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip()}
function motionState(c,t){const v=c.effect||'original',s=Math.max(0,t-c.start);let dx=0,dy=0,rot=0,scale=1,alpha=1;if(v==='motionShake'){dx=Math.sin(s*53)*.015*canvas.width;dy=Math.cos(s*47)*.014*canvas.height;rot=Math.sin(s*37)*.018}else if(v==='motionPulse')scale=1+.13*(.5-.5*Math.cos(s*7));else if(v==='motionSpin')rot=s*Math.PI*.7;else if(v==='motionFloat')dy=Math.sin(s*2.5)*canvas.height*.045;else if(v==='motionFlicker')alpha=.72+.28*Math.abs(Math.sin(s*19));else if(v==='motionSway')rot=Math.sin(s*2.4)*.12;else if(v==='motionBounce')dy=-Math.abs(Math.sin(s*4.4))*canvas.height*.075;else if(v==='motionHeartbeat')scale=1+.16*Math.pow(Math.max(0,Math.sin(s*6.3)),6);else if(v==='motionDrift'){dx=Math.sin(s*.9)*canvas.width*.065;dy=Math.cos(s*.7)*canvas.height*.04}else if(v==='motionTilt')rot=Math.sin(s*1.6)*.24;else if(v==='motionTremor'){dx=Math.sin(s*89)*canvas.width*.006;dy=Math.cos(s*97)*canvas.height*.006}else if(v==='motionZoomOut')scale=1.35-.35*Math.min(1,s/2);if(v==='motionEditPush')scale=1+.18*Math.min(1,s/3);else if(v==='motionEditPull')scale=1.18-.18*Math.min(1,s/3);else if(v==='motionEditHandheld'){scale=1.04;dx=Math.sin(s*3.7)*canvas.width*.009;dy=Math.cos(s*4.1)*canvas.height*.007;rot=Math.sin(s*2.3)*.012}else if(v==='motionEditOrbit'){scale=1.08;dx=Math.cos(s)*canvas.width*.025;dy=Math.sin(s)*canvas.height*.025}else if(v==='motionEditBeat')scale=1+.09*Math.pow(Math.max(0,Math.sin(s*8)),4);else if(v==='motionEditSwing'){scale=1.07;rot=Math.sin(s*2)*.045}else if(v==='motionEditBreath')scale=1.04+.04*Math.sin(s*1.7);else if(v==='motionEditJitter'){scale=1.04;dx=Math.sin(s*37)*canvas.width*.004;dy=Math.cos(s*41)*canvas.height*.004}if(v==='motionKorePunch')scale=1+.16*Math.exp(-s*2.4)*Math.sin(s*13)**2;
else if(v==='motionKoreSway'){scale=1.08;dx=Math.sin(s*1.3)*canvas.width*.02;dy=Math.cos(s*1.1)*canvas.height*.013;rot=Math.sin(s*1.2)*.025}
else if(v==='motionKoreReveal')scale=1+.25*(1-clamp(s/.8,0,1))**3;
return{dx,dy,rot,scale,alpha}}
const videoEffectOptions=document.createElement('optgroup');
videoEffectOptions.label='Nuovi effetti video';
for(const [value,label] of [['fxKoreTrail', 'Scia RGB'], ['fxKoreLens', 'Bagliore anamorfico'], ['fxKoreShutter', 'Otturatore cinematico'], ['motionKorePunch', 'Zoom elastico'], ['motionKoreSway', 'Camera fluttuante'], ['motionKoreReveal', 'Zoom di ingresso']]){
 videoEffectOptions.append(new Option(label,value));
}
$('effect').append(videoEffectOptions);
function renderFXOverlay(c,t,w,h){if(c.effect?.startsWith('fxStudio')){drawStudioVideo(ctx,c.effect,Math.max(0,t-c.start),w,h);return}const v=c.effect||'original';if(!v.startsWith('fx'))return;const s=Math.max(0,t-c.start),x=-w/2,y=-h/2,frame=Math.floor(s*24),random=n=>{const z=Math.sin((frame+1)*71+n*127.1)*43758.5453;return z-Math.floor(z)};ctx.save();ctx.filter='none';ctx.globalCompositeOperation='source-over';
if(v==='fxKoreLens'){
 const center=y+h*(.48+.17*Math.sin(s*1.45));
 const glow=ctx.createLinearGradient(0,center-h*.10,0,center+h*.10);
 glow.addColorStop(0,'#ffc8aa00');glow.addColorStop(.48,'#ff95c05f');glow.addColorStop(.51,'#fff2c593');glow.addColorStop(1,'#ffc8aa00');
 ctx.globalCompositeOperation='screen';ctx.fillStyle=glow;ctx.fillRect(x,center-h*.10,w,h*.20);
}
if(v==='fxKoreShutter'){
 const bars=h*.14*(1-clamp(s/.72,0,1))**2;
 ctx.fillStyle='#08070c';ctx.fillRect(x,y,w,bars);ctx.fillRect(x,y+h-bars,w,bars);
}
if(v.startsWith('fxEdit')){if(v==='fxEditPrism'||v==='fxEditGradient'){const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fa59c033');g.addColorStop(.5,'#2cf5ef08');g.addColorStop(1,'#687cff44');ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}
if(v==='fxEditRays'){ctx.globalCompositeOperation='screen';for(let i=0;i<5;i++){const xx=x+w*(i/5+.05*Math.sin(s+i));const g=ctx.createLinearGradient(xx,y,xx+w*.3,y+h);g.addColorStop(0,'#ffe8b04a');g.addColorStop(1,'#ffe8b000');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx+w*.06,y);ctx.lineTo(xx+w*.45,y+h);ctx.lineTo(xx+w*.25,y+h);ctx.fill()}}
if(v==='fxEditSpark'||v==='fxEditDust'){for(let i=0;i<28;i++){const k=Math.sin(i*91.3)*43758.5,xx=x+(k-Math.floor(k))*w,yy=y+((i*.618+s*.025)%1)*h;ctx.globalAlpha*=1;ctx.fillStyle='rgba(255,239,214,'+(.15+.55*Math.pow(.5+.5*Math.sin(s*2+i),3))+')';ctx.beginPath();ctx.arc(xx,yy,w*(v==='fxEditSpark'?.0025:.0015),0,Math.PI*2);ctx.fill();if(v==='fxEditSpark'&&Math.sin(s*2+i)>.92){ctx.fillRect(xx-w*.009,yy,w*.018,h*.001);ctx.fillRect(xx,yy-h*.009,w*.001,h*.018)}}}
if(v==='fxEditFrame'){ctx.strokeStyle='#ed8ddba0';ctx.lineWidth=w*.004;ctx.shadowColor='#de6ccd';ctx.shadowBlur=w*.02;ctx.strokeRect(x+w*.04,y+h*.04,w*.92,h*.92)}
if(v==='fxEditCinema'){ctx.fillStyle='#08080b';ctx.fillRect(x,y,w,h*.09);ctx.fillRect(x,y+h*.91,w,h*.09)}
if(v==='fxEditSlices'){for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#fb66c63a':'#57e8ff33';ctx.fillRect(x,y+((i*.213+s*.12)%1)*h,w,h*.009)}}}
if(['fxVHS','fxHolo','fxFilm'].includes(v)){const step=v==='fxHolo'?9:v==='fxFilm'?14:5;ctx.fillStyle=v==='fxHolo'?'#54faff22':'#00000040';for(let a=0;a<h;a+=step)ctx.fillRect(x,y+a,w,Math.max(1,step*.2));if(v==='fxVHS'){ctx.fillStyle='#ffffff35';ctx.fillRect(x,y+s*140%h,w,Math.max(2,h*.012))}if(v==='fxFilm'){ctx.fillStyle='#ffffff3a';ctx.fillRect(x+w*.035,y,w*.003,h);ctx.fillRect(x+w*.965,y,w*.003,h)}}
if(['fxGrain','fxFilm','fxGlitch'].includes(v)){const count=v==='fxGrain'?190:v==='fxFilm'?85:25;for(let i=0;i<count;i++){ctx.fillStyle=random(i*4)>.5?'#ffffff3a':'#00000058';ctx.fillRect(x+random(i*4+1)*w,y+random(i*4+2)*h,Math.max(1,w*.003),Math.max(1,h*.003))}if(v==='fxGlitch')for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#ff2d9277':'#39f5ff66';ctx.fillRect(x+(random(i+400)-.5)*w*.08,y+random(i+700)*h,w*.8,Math.max(2,h*.01+random(i+800)*h*.025))}}
if(v==='fxVignette'||v==='fxSpot'){const cx=v==='fxSpot'?x+w*(.5+.3*Math.sin(s*.7)):0,cy=v==='fxSpot'?y+h*(.4+.15*Math.cos(s*.8)):0,g=ctx.createRadialGradient(cx,cy,w*.08,cx,cy,Math.hypot(w,h)*.6);g.addColorStop(0,'#00000000');g.addColorStop(.65,'#00000022');g.addColorStop(1,'#000000e0');ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}
if(v==='fxLeak'){const cx=x+w*(.18+.7*(.5+.5*Math.sin(s*.7))),g=ctx.createRadialGradient(cx,y+h*.3,0,cx,y+h*.3,w*.8);g.addColorStop(0,'#ff9d5270');g.addColorStop(.35,'#ff2d922f');g.addColorStop(1,'#ff2d9200');ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}
if(v==='fxStrobe'){ctx.fillStyle=Math.sin(s*23)>.72?'#ff2d9270':'#07000a0b';ctx.fillRect(x,y,w,h)}
if(v==='fxScan'){ctx.fillStyle='#00f5ff13';ctx.fillRect(x,y,w,h);ctx.fillStyle='#58f9ffb0';ctx.fillRect(x,y+(s*.5%1)*h,w,Math.max(2,h*.005))}
if(v==='fxHolo'){ctx.fillStyle='#00fff516';ctx.fillRect(x,y,w,h)}
ctx.restore()}
const SOCIAL_MIX_TEMPLATES=[
{id:'beat',name:'Beat Drop',preview:'BEAT',description:'8 tagli veloci · flash & zoom',color:'#ff2d92',duration:.7,transitions:['flash','zoomIn','spinReveal','wipeLeft'],effects:['motionPulse','fxRGB','fxGlitch','neon'],zoom:1.08},
{id:'travel',name:'Travel Diary',preview:'TRAVEL',description:'6 scene · cinema & panoramiche',color:'#4bdcfa',duration:2.1,transitions:['iris','slideLeft','soft','diagonal'],effects:['filmTeal','filmGold','motionDrift','warm'],zoom:1.12},
{id:'fashion',name:'Fashion Edit',preview:'STYLE',description:'8 scene · glossy & glamour',color:'#f9c2ed',duration:1.05,transitions:['flipX','zoomIn','curtain','pop'],effects:['filmRose','fxLeak','dream','contrast'],zoom:1.14},
{id:'memories',name:'Memories',preview:'LOVE',description:'6 foto · soft & nostalgia',color:'#ffc6a2',duration:2.3,transitions:['soft','irisDiamond','fade','circleZoom'],effects:['vintage','fxFilm','warm','dream'],zoom:1.07},
{id:'sports',name:'Sport Hype',preview:'HYPE',description:'10 tagli · energia & glitch',color:'#fce14e',duration:.55,transitions:['flash','wipeRight','spinReveal','bars'],effects:['fxGlitch','motionShake','fxRGB','contrast'],zoom:1.12},
{id:'food',name:'Food Reel',preview:'TASTE',description:'7 scene · colore & zoom',color:'#ffab68',duration:1.45,transitions:['zoomIn','irisSquare','slideUp','pop'],effects:['warm','filmAmber','bright','fxLeak'],zoom:1.09},
{id:'minimal',name:'Clean Aesthetic',preview:'MOOD',description:'6 scene · minimal & smooth',color:'#e9e2fa',duration:1.85,transitions:['fade','soft','slideRight','iris'],effects:['soft','filmIce','mono','dream'],zoom:1.06},
{id:'night',name:'Night City',preview:'NIGHT',description:'8 scene · neon & cyber',color:'#a56eff',duration:1.0,transitions:['sweep','flipY','flash','diagonal'],effects:['fxHolo','fxVHS','neon','fxScan'],zoom:1.1},
{"id":"podcast","name":"Podcast Clips","preview":"PODCAST","description":"7 tagli · parlato & interviste","color":"#ff749b","duration":2.5,"transitions":["fade","slideUp","pop"],"effects":["contrast","warm","filmMatte"],"zoom":1.06,"count":7},
{"id":"gaming","name":"Gaming Rush","preview":"GG!","description":"10 tagli · gaming & glitch","color":"#a874ff","duration":0.55,"transitions":["flash","spinReveal","bars","zoomIn"],"effects":["fxRGB","fxGlitch","neon"],"zoom":1.13,"count":10},
{"id":"wedding","name":"Wedding Film","preview":"LOVE","description":"7 scene · romantico & cinema","color":"#f8d7d7","duration":2.7,"transitions":["fade","irisDiamond","circleZoom"],"effects":["filmRose","soft","filmGold"],"zoom":1.06,"count":7},
{"id":"realestate","name":"Real Estate Tour","preview":"HOME","description":"8 scene · ambienti & dettagli","color":"#c1f0e7","duration":2.2,"transitions":["slideLeft","fade","irisSquare"],"effects":["bright","filmHighKey","soft"],"zoom":1.05,"count":8},
{"id":"fitness","name":"Fitness Power","preview":"POWER","description":"10 tagli · workout & energia","color":"#ff743a","duration":0.65,"transitions":["flash","wipeRight","pop"],"effects":["filmPunch","motionShake","contrast"],"zoom":1.12,"count":10},
{"id":"beauty","name":"Beauty Glow","preview":"GLOW","description":"8 scene · makeup & beauty","color":"#ff9ed8","duration":1.35,"transitions":["iris","fade","curtain"],"effects":["dream","filmRose","fxLeak"],"zoom":1.08,"count":8},
{"id":"education","name":"Quick Tutorial","preview":"HOW TO","description":"6 scene · tutorial & spiegazioni","color":"#6be7e2","duration":2.4,"transitions":["slideRight","fade","pop"],"effects":["bright","contrast","filmIce"],"zoom":1.04,"count":6},
{"id":"product","name":"Product Launch","preview":"NEW","description":"9 tagli · promo prodotto","color":"#ffe06d","duration":0.9,"transitions":["zoomIn","flash","irisSquare"],"effects":["filmGold","filmPunch","fxSpot"],"zoom":1.14,"count":9},
{"id":"summer","name":"Summer Vibes","preview":"SUMMER","description":"8 scene · mare & sole","color":"#ffd76b","duration":1.2,"transitions":["wipeLeft","slideUp","fade"],"effects":["filmDawn","warm","filmTeal"],"zoom":1.1,"count":8},
{"id":"retro90","name":"Retro 90s","preview":"RETRO","description":"8 tagli · VHS & nostalgia","color":"#fe87f1","duration":0.95,"transitions":["bars","flash","diagonal"],"effects":["fxVHS","retro","fxFilm"],"zoom":1.08,"count":8},
{"id":"motivation","name":"Motivation","preview":"GO!","description":"7 scene · citazioni & impatto","color":"#fff18e","duration":1.15,"transitions":["pop","zoomIn","fade"],"effects":["filmPunch","mono","contrast"],"zoom":1.13,"count":7},
{"id":"cinematic","name":"Cinematic Trailer","preview":"FILM","description":"9 scene · trailer drammatico","color":"#a5c8ff","duration":1.65,"transitions":["iris","fade","diagonal","flash"],"effects":["filmNoir","filmBlue","filmGold"],"zoom":1.08,"count":9}
];
SOCIAL_MIX_TEMPLATES.push(...[{"id": "y2k-pop", "name": "Y2K Pop", "preview": "Y2K", "category": "urban", "isNew": true, "subject": "city", "duration": 0.8, "count": 9, "color": "#c6ff58", "transitions": ["flipX", "pop", "diagonal"], "effects": ["filmCandy", "fxRGB", "retro"], "zoom": 1.12, "description": "9 scene · street & urban"}, {"id": "street-diary", "name": "Street Diary", "preview": "STREET", "category": "urban", "isNew": true, "subject": "city", "duration": 1.15, "count": 8, "color": "#b4d7ff", "transitions": ["slideLeft", "bars", "wipeUp"], "effects": ["filmSilver", "contrast", "fxFilm"], "zoom": 1.12, "description": "8 scene · street & urban"}, {"id": "denim-days", "name": "Denim Days", "preview": "DENIM", "category": "urban", "isNew": true, "subject": "fashion", "duration": 1.5, "count": 7, "color": "#91b9ec", "transitions": ["wipeRight", "slideUp", "fade"], "effects": ["filmBlue", "filmMatte", "desat"], "zoom": 1.08, "description": "7 scene · street & urban"}, {"id": "metro-loop", "name": "Metro Loop", "preview": "NEXT", "category": "urban", "isNew": true, "subject": "city", "duration": 0.95, "count": 10, "color": "#94efb2", "transitions": ["sweep", "blinds", "slideLeft"], "effects": ["filmTeal", "filmSharp", "fxScan"], "zoom": 1.12, "description": "10 scene · street & urban"}, {"id": "after-hours", "name": "After Hours", "preview": "LATE", "category": "urban", "isNew": true, "subject": "city", "duration": 1.3, "count": 8, "color": "#be9aff", "transitions": ["curtain", "irisSquare", "fade"], "effects": ["filmNightBlue", "neon", "fxHolo"], "zoom": 1.12, "description": "8 scene · street & urban"}, {"id": "chrome-core", "name": "Chrome Core", "preview": "CHROME", "category": "urban", "isNew": true, "subject": "city", "duration": 0.75, "count": 10, "color": "#c8d4e6", "transitions": ["flipY", "bars", "irisSquare"], "effects": ["filmSilver", "filmNoir", "fxRGB"], "zoom": 1.12, "description": "10 scene · street & urban"}, {"id": "photo-dump", "name": "Photo Dump", "preview": "DUMP", "category": "trendy", "isNew": true, "subject": "fashion", "duration": 1.1, "count": 10, "color": "#ffabd6", "transitions": ["pop", "slideRight", "wipeLeft"], "effects": ["filmPolaroid", "warm", "filmPastel"], "zoom": 1.12, "description": "10 scene · daily & social"}, {"id": "pov-story", "name": "POV Story", "preview": "POV", "category": "trendy", "isNew": true, "subject": "travel", "duration": 1.8, "count": 6, "color": "#edff97", "transitions": ["slideUp", "fade", "zoomIn"], "effects": ["filmMatte", "bright", "soft"], "zoom": 1.08, "description": "6 scene · daily & social"}, {"id": "fit-check", "name": "Fit Check", "preview": "FIT", "category": "trendy", "isNew": true, "subject": "fashion", "duration": 0.9, "count": 8, "color": "#c5a7ff", "transitions": ["curtain", "flipX", "pop"], "effects": ["contrast", "filmRose", "filmSharp"], "zoom": 1.12, "description": "8 scene · daily & social"}, {"id": "daily-recap", "name": "Daily Recap", "preview": "TODAY", "category": "trendy", "isNew": true, "subject": "food", "duration": 1.4, "count": 9, "color": "#91e7de", "transitions": ["slideLeft", "irisSquare", "fade"], "effects": ["filmDawn", "warm", "filmPeach"], "zoom": 1.08, "description": "9 scene · daily & social"}, {"id": "quick-reveal", "name": "Quick Reveal", "preview": "REVEAL", "category": "trendy", "isNew": true, "subject": "fashion", "duration": 0.85, "count": 7, "color": "#ffe69c", "transitions": ["irisDiamond", "zoomIn", "curtain"], "effects": ["filmPunch", "filmGold", "contrast"], "zoom": 1.12, "description": "7 scene · daily & social"}, {"id": "main-character", "name": "Main Character", "preview": "ME", "category": "trendy", "isNew": true, "subject": "fashion", "duration": 1.65, "count": 7, "color": "#ffa4be", "transitions": ["circleZoom", "slideUp", "fade"], "effects": ["filmGlow", "filmRose", "soft"], "zoom": 1.08, "description": "7 scene · daily & social"}, {"id": "soft-sunday", "name": "Soft Sunday", "preview": "SLOW", "category": "soft", "isNew": true, "subject": "food", "duration": 2.6, "count": 6, "color": "#e4d6c8", "transitions": ["soft", "fade", "iris"], "effects": ["filmSand", "soft", "filmPastel"], "zoom": 1.08, "description": "6 scene · soft & ricordi"}, {"id": "dream-journal", "name": "Dream Journal", "preview": "DREAM", "category": "soft", "isNew": true, "subject": "travel", "duration": 2.2, "count": 7, "color": "#d4bdff", "transitions": ["irisDiamond", "soft", "circleZoom"], "effects": ["dream", "filmPurpleHaze", "filmFade"], "zoom": 1.08, "description": "7 scene · soft & ricordi"}, {"id": "golden-moments", "name": "Golden Moments", "preview": "GOLDEN", "category": "soft", "isNew": true, "subject": "travel", "duration": 2.1, "count": 8, "color": "#f3d18c", "transitions": ["fade", "slideRight", "soft"], "effects": ["filmSunset", "filmGold", "warm"], "zoom": 1.08, "description": "8 scene · soft & ricordi"}, {"id": "pastel-notes", "name": "Pastel Notes", "preview": "NOTES", "category": "soft", "isNew": true, "subject": "fashion", "duration": 1.9, "count": 6, "color": "#f2cbe2", "transitions": ["curtain", "fade", "slideUp"], "effects": ["filmPastel", "filmPeach", "filmMatte"], "zoom": 1.08, "description": "6 scene · soft & ricordi"}, {"id": "slow-morning", "name": "Slow Morning", "preview": "AM", "category": "soft", "isNew": true, "subject": "food", "duration": 2.8, "count": 5, "color": "#eddac1", "transitions": ["soft", "irisSquare", "fade"], "effects": ["filmDawn", "filmHighKey", "soft"], "zoom": 1.08, "description": "5 scene · soft & ricordi"}, {"id": "mono-mood", "name": "Mono Mood", "preview": "MONO", "category": "soft", "isNew": true, "subject": "fashion", "duration": 2.0, "count": 7, "color": "#c7c7ce", "transitions": ["fade", "blinds", "slideLeft"], "effects": ["mono", "filmSilver", "filmNoir"], "zoom": 1.08, "description": "7 scene · soft & ricordi"}, {"id": "weekend-away", "name": "Weekend Away", "preview": "AWAY", "category": "travel", "isNew": true, "subject": "travel", "duration": 1.6, "count": 8, "color": "#89e3ee", "transitions": ["slideLeft", "wipeUp", "iris"], "effects": ["filmOcean", "filmTeal", "warm"], "zoom": 1.08, "description": "8 scene · viaggi & avventure"}, {"id": "coastal-roll", "name": "Coastal Roll", "preview": "COAST", "category": "travel", "isNew": true, "subject": "travel", "duration": 2.0, "count": 7, "color": "#95e6c7", "transitions": ["circleZoom", "soft", "slideRight"], "effects": ["filmAqua", "filmSand", "filmDawn"], "zoom": 1.08, "description": "7 scene · viaggi & avventure"}, {"id": "city-break", "name": "City Break", "preview": "ESCAPE", "category": "travel", "isNew": true, "subject": "city", "duration": 1.25, "count": 9, "color": "#ffbd83", "transitions": ["diagonal", "slideUp", "irisSquare"], "effects": ["filmCopper", "filmSharp", "filmBlue"], "zoom": 1.12, "description": "9 scene · viaggi & avventure"}, {"id": "road-notes", "name": "Road Notes", "preview": "ROAD", "category": "travel", "isNew": true, "subject": "travel", "duration": 1.85, "count": 8, "color": "#e9ca91", "transitions": ["wipeLeft", "fade", "bars"], "effects": ["filmAnalog", "filmGold", "vintage"], "zoom": 1.08, "description": "8 scene · viaggi & avventure"}, {"id": "birthday-spark", "name": "Birthday Spark", "preview": "BDAY", "category": "party", "isNew": true, "subject": "fashion", "duration": 1.0, "count": 9, "color": "#ffa0d3", "transitions": ["pop", "circleZoom", "slideUp"], "effects": ["filmCandy", "filmGlow", "warm"], "zoom": 1.12, "description": "9 scene · amici & feste"}, {"id": "squad-recap", "name": "Squad Recap", "preview": "SQUAD", "category": "party", "isNew": true, "subject": "fashion", "duration": 0.8, "count": 10, "color": "#a1f3d0", "transitions": ["wipeRight", "pop", "flipX"], "effects": ["filmPunch", "filmPeach", "fxRGB"], "zoom": 1.12, "description": "10 scene · amici & feste"}, {"id": "party-lights", "name": "Party Lights", "preview": "PARTY", "category": "party", "isNew": true, "subject": "city", "duration": 0.95, "count": 8, "color": "#e4a2ff", "transitions": ["sweep", "zoomIn", "diagonal"], "effects": ["neon", "fxHolo", "filmCherry"], "zoom": 1.12, "description": "8 scene · amici & feste"}, {"id": "festival-reel", "name": "Festival Reel", "preview": "LIVE", "category": "party", "isNew": true, "subject": "city", "duration": 0.7, "count": 12, "color": "#fbdd6d", "transitions": ["bars", "slideUp", "spinReveal"], "effects": ["filmCyber", "fxRGB", "filmPunch"], "zoom": 1.12, "description": "12 scene · amici & feste"}, {"id": "friday-vibes", "name": "Friday Vibes", "preview": "FRIDAY", "category": "party", "isNew": true, "subject": "city", "duration": 1.2, "count": 8, "color": "#ffab87", "transitions": ["curtain", "slideLeft", "pop"], "effects": ["filmAmber", "neon", "filmRose"], "zoom": 1.12, "description": "8 scene · amici & feste"}, {"id": "besties", "name": "Besties", "preview": "US", "category": "party", "isNew": true, "subject": "fashion", "duration": 1.45, "count": 8, "color": "#ffc5e4", "transitions": ["irisDiamond", "fade", "flipX"], "effects": ["filmRose", "filmPastel", "warm"], "zoom": 1.08, "description": "8 scene · amici & feste"}, {"id": "match-day", "name": "Match Day", "preview": "GAME", "category": "sport", "isNew": true, "subject": "fashion", "duration": 0.65, "count": 12, "color": "#bdff74", "transitions": ["wipeRight", "bars", "zoomIn"], "effects": ["contrast", "filmPunch", "filmSharp"], "zoom": 1.12, "description": "12 scene · sport & azione"}, {"id": "skate-tape", "name": "Skate Tape", "preview": "SKATE", "category": "sport", "isNew": true, "subject": "city", "duration": 0.9, "count": 10, "color": "#ffc977", "transitions": ["diagonal", "wipeLeft", "flipY"], "effects": ["fxVHS", "retro", "filmAnalog"], "zoom": 1.12, "description": "10 scene · sport & azione"}, {"id": "run-club", "name": "Run Club", "preview": "RUN", "category": "sport", "isNew": true, "subject": "travel", "duration": 1.1, "count": 8, "color": "#a2f1df", "transitions": ["slideLeft", "wipeUp", "pop"], "effects": ["filmTeal", "filmSharp", "bright"], "zoom": 1.12, "description": "8 scene · sport & azione"}, {"id": "training-log", "name": "Training Log", "preview": "STRONG", "category": "sport", "isNew": true, "subject": "fashion", "duration": 1.3, "count": 7, "color": "#ffae87", "transitions": ["irisSquare", "slideUp", "bars"], "effects": ["filmMatte", "contrast", "filmCopper"], "zoom": 1.12, "description": "7 scene · sport & azione"}]);
SOCIAL_MIX_TEMPLATES.push(...[{"id": "pink-hour", "name": "Pink Hour", "preview": "PINK", "category": "soft", "isNew": true, "subject": "fashion", "duration": 1.9, "count": 7, "color": "#ff2d92", "effects": ["koreRose", "koreFuchsia", "warm"], "transitions": ["fade", "irisDiamond", "slideUp"], "zoom": 1.1, "description": "7 scene · KORE Colour Club"}, {"id": "glass-diary", "name": "Glass Diary", "preview": "GLASS", "category": "trendy", "isNew": true, "subject": "fashion", "duration": 1.6, "count": 8, "color": "#ff2d92", "effects": ["koreRose", "koreIce", "soft"], "transitions": ["irisSquare", "slideRight", "fade"], "zoom": 1.1, "description": "8 scene · KORE Colour Club"}, {"id": "cherry-weekend", "name": "Cherry Weekend", "preview": "CHERRY", "category": "party", "isNew": true, "subject": "city", "duration": 1.15, "count": 9, "color": "#ff2d92", "effects": ["koreFuchsia", "filmCherry", "koreCandy"], "transitions": ["pop", "slideUp", "diagonal"], "zoom": 1.1, "description": "9 scene · KORE Colour Club"}, {"id": "lilac-dreams", "name": "Lilac Dreams", "preview": "LILAC", "category": "soft", "isNew": true, "subject": "travel", "duration": 2.2, "count": 6, "color": "#ff2d92", "effects": ["koreLilac", "dream", "filmPastel"], "transitions": ["soft", "circleZoom", "iris"], "zoom": 1.1, "description": "6 scene · KORE Colour Club"}, {"id": "peach-days", "name": "Peach Days", "preview": "PEACH", "category": "trendy", "isNew": true, "subject": "food", "duration": 1.7, "count": 7, "color": "#ff2d92", "effects": ["korePeach", "filmDawn", "warm"], "transitions": ["slideLeft", "fade", "pop"], "zoom": 1.1, "description": "7 scene · KORE Colour Club"}, {"id": "mint-escape", "name": "Mint Escape", "preview": "MINT", "category": "travel", "isNew": true, "subject": "travel", "duration": 1.8, "count": 8, "color": "#ff2d92", "effects": ["koreMint", "filmTeal", "koreIce"], "transitions": ["wipeLeft", "slideUp", "irisSquare"], "zoom": 1.1, "description": "8 scene · KORE Colour Club"}, {"id": "chrome-walk", "name": "Chrome Walk", "preview": "CHROME", "category": "urban", "isNew": true, "subject": "city", "duration": 1.1, "count": 9, "color": "#ff2d92", "effects": ["koreChrome", "filmSilver", "contrast"], "transitions": ["bars", "diagonal", "flipX"], "zoom": 1.1, "description": "9 scene · KORE Colour Club"}, {"id": "velvet-story", "name": "Velvet Story", "preview": "VELVET", "category": "soft", "isNew": true, "subject": "fashion", "duration": 2.0, "count": 6, "color": "#ff2d92", "effects": ["koreVelvet", "mono", "filmMatte"], "transitions": ["fade", "curtain", "soft"], "zoom": 1.1, "description": "6 scene · KORE Colour Club"}, {"id": "candy-social", "name": "Candy Social", "preview": "CANDY", "category": "party", "isNew": true, "subject": "fashion", "duration": 0.95, "count": 10, "color": "#ff2d92", "effects": ["koreCandy", "korePeach", "koreFuchsia"], "transitions": ["pop", "flipX", "circleZoom"], "zoom": 1.1, "description": "10 scene · KORE Colour Club"}, {"id": "amber-journey", "name": "Amber Journey", "preview": "AMBER", "category": "travel", "isNew": true, "subject": "travel", "duration": 2.1, "count": 7, "color": "#ff2d92", "effects": ["koreAmber", "filmGold", "filmCopper"], "transitions": ["slideRight", "iris", "fade"], "zoom": 1.1, "description": "7 scene · KORE Colour Club"}, {"id": "ice-energy", "name": "Ice Energy", "preview": "ICE", "category": "sport", "isNew": true, "subject": "city", "duration": 0.85, "count": 10, "color": "#ff2d92", "effects": ["koreIce", "filmSharp", "koreChrome"], "transitions": ["wipeRight", "zoomIn", "bars"], "zoom": 1.1, "description": "10 scene · KORE Colour Club"}, {"id": "fuchsia-club", "name": "Fuchsia Club", "preview": "CLUB", "category": "party", "isNew": true, "subject": "city", "duration": 1.05, "count": 8, "color": "#ff2d92", "effects": ["koreFuchsia", "koreLilac", "neon"], "transitions": ["sweep", "irisSquare", "pop"], "zoom": 1.1, "description": "8 scene · KORE Colour Club"}]);
const MODEL_CATEGORIES=[['all','Tutti'],['new','Novità'],['trendy','Daily & Trend'],['urban','Street & Y2K'],['soft','Soft & Ricordi'],['travel','Viaggi'],['party','Amici & Feste'],['sport','Sport'],['graphic','Titoli & Grafiche']];
function modelCategory(item){if(item.type==='graphic')return 'graphic';const t=item.template;if(t.category)return t.category;return ({beat:'party',travel:'travel',fashion:'trendy',memories:'soft',sports:'sport',food:'trendy',minimal:'soft',night:'urban',podcast:'trendy',gaming:'urban',wedding:'soft',realestate:'travel',fitness:'sport',beauty:'trendy',education:'trendy',product:'trendy',summer:'travel',retro90:'urban',motivation:'sport',cinematic:'urban'})[t.id]||'trendy'}

const KORE_SOUNDS=[
 {id:'pulse',name:'KORE Pulse',bpm:112,notes:[220,277.18,329.63,415.30,329.63,277.18,246.94,369.99]},
 {id:'soft',name:'KORE Soft',bpm:82,notes:[261.63,329.63,392,493.88,440,392,329.63,293.66]},
 {id:'energy',name:'KORE Energy',bpm:132,notes:[164.81,246.94,329.63,369.99,293.66,246.94,220,329.63]}
];
let koreSoundPreview=null,koreSoundPreviewUrl=null,koreSoundGeneration=0,koreEditorReturn='home';const koreModelDrafts=new Map();
function koreSoundFor(t){return ['soft','travel'].includes(t.category)||['memories','wedding','travel','cinematic'].includes(t.id)?'soft':['sport','party','urban'].includes(t.category)||['sports','beat','gaming'].includes(t.id)?'energy':'pulse'}
function makeKoreSound(id,seconds){
 const style=KORE_SOUNDS.find(s=>s.id===id);if(!style)throw Error('Base KORE non disponibile.');
 if(!Number.isFinite(seconds)||seconds<=0||seconds>120)throw Error('La base KORE supporta montaggi fino a 120 secondi.');
 const rate=44100,frames=Math.ceil(seconds*rate),buffer=new ArrayBuffer(44+frames*2),view=new DataView(buffer);
 const str=(at,text)=>{for(let j=0;j<text.length;j++)view.setUint8(at+j,text.charCodeAt(j))};
 str(0,'RIFF');view.setUint32(4,36+frames*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*2,true);
 const beat=60/style.bpm,step=beat/2;let seed=91731;
 for(let i=0;i<frames;i++){
  const t=i/rate,n=Math.floor(t/step),local=t-n*step,f=style.notes[n%style.notes.length],attack=Math.min(1,local/.012),env=attack*Math.exp(-local*(id==='soft'?5:10));
  const lead=(Math.sin(2*Math.PI*f*local)+.24*Math.sin(4*Math.PI*f*local))*.15*env;
  const bassLocal=t%beat,bass=.12*Math.sin(2*Math.PI*(style.notes[Math.floor(n/8)*2%style.notes.length]/2)*t)*Math.min(1,bassLocal/.015)*Math.exp(-bassLocal*5);
  const kickLocal=t%beat,kick=id==='soft'?0:.24*Math.sin(2*Math.PI*(48*kickLocal+6*(1-Math.exp(-kickLocal*28))))*Math.exp(-kickLocal*22);
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const noise=(seed>>>0)/2147483648-1;
  const hat=id==='soft'?0:noise*.035*Math.exp(-(t%step)*90),snare=Math.floor(t/beat)%2===1?noise*.065*Math.exp(-(t%beat)*24):0;
  const fade=Math.min(1,t/.03,(seconds-t)/.16),value=Math.max(-.95,Math.min(.95,(lead+bass+kick+hat+snare)*fade));
  view.setInt16(44+i*2,Math.round(value*32767),true);
 }
 return new File([buffer],style.name+'.wav',{type:'audio/wav'});
}
function stopKoreSound(){
 koreSoundGeneration++;if(koreSoundPreview){koreSoundPreview.pause();koreSoundPreview.removeAttribute('src');koreSoundPreview.load();koreSoundPreview=null}
 if(koreSoundPreviewUrl){URL.revokeObjectURL(koreSoundPreviewUrl);koreSoundPreviewUrl=null}
 document.querySelectorAll('.kore-sound-listen').forEach(b=>{b.textContent='♫ Ascolta base';b.setAttribute('aria-pressed','false')});
}
async function listenKoreSound(id,button){
 const same=koreSoundPreview&&button.getAttribute('aria-pressed')==='true';stopKoreSound();if(same||id==='none')return;
 const generation=koreSoundGeneration;try{const file=id.startsWith('personal:')?media.get(id.slice(9))?.blob:makeKoreSound(id,8);if(!file)throw Error('Audio personale non disponibile');koreSoundPreviewUrl=URL.createObjectURL(file);const el=document.createElement('audio');koreSoundPreview=el;el.src=koreSoundPreviewUrl;el.volume=.65;el.loop=true;await el.play();if(generation!==koreSoundGeneration)return;button.textContent='■ Ferma base';button.setAttribute('aria-pressed','true')}catch(e){stopKoreSound();status('Audio non avviato: tocca Ascolta base per riprovare.')}
}
async function createKoreSoundMedia(id,seconds){
 const file=makeKoreSound(id,seconds),m=await loadMedia(uid(),file,file.name,'audio');m.koreOriginal=true;if(db)queueMediaSave(m,file);else m.saveState='session';return m;
}

function modelSceneCount(t){return t.count||({sports:10,beat:8,fashion:8,night:8,food:7})[t.id]||6}
function filterModelEntries(entries,category,query){const q=String(query||'').trim().toLocaleLowerCase('it');return entries.filter(item=>(category==='all'||(category==='new'?item.template.isNew:modelCategory(item)===category))&&`${item.template.name} ${item.template.description} ${item.template.preview} ${MODEL_CATEGORIES.find(c=>c[0]===modelCategory(item))?.[1]||''}`.toLocaleLowerCase('it').includes(q))}
function modelScenePlan(t){const patterns={soft:[1.12,1,.92,1.05,.9,1.01],party:[1.2,.8,1,.85,1.15],urban:[1,.75,1.25,.9,1.1],sport:[1.15,.7,1,.85,1.3],travel:[1.1,1,1.2,.85,.9],trendy:[1.2,1,1,.9,.8]};const pattern=patterns[t.category]||[1.1,1,1,.9];return Array.from({length:modelSceneCount(t)},(_,i)=>({seconds:Math.round((t.sceneDurations?.[i]||t.duration*pattern[i%pattern.length])*100)/100,effect:t.effects[i%t.effects.length],transition:t.transitions[i%t.transitions.length]}))}
function buildModelScenes(t,ids,assets,start,track,offsets=[],scenePlan=null){
 const plan=scenePlan||modelScenePlan(t);if(ids.length!==plan.length||ids.some(id=>!id))throw Error('Riempi tutte le scene.');let cursor=start;
 return plan.map((scene,i)=>{const m=assets.get(ids[i]);if(!m?.ready)throw Error('Media della scena '+(i+1)+' non disponibile.');const offset=m.kind==='video'?Number(offsets[i]??0):0;if(!Number.isFinite(offset)||offset<0)throw Error('Punto iniziale non valido nella scena '+(i+1));if(m.kind==='video'&&(!Number.isFinite(m.el.duration)||m.el.duration+.001<offset+scene.seconds))throw Error('Il video della scena '+(i+1)+' deve durare almeno '+(offset+scene.seconds).toFixed(2)+' s per questo punto iniziale.');const c={id:uid(),kind:m.kind,media:m.id,track,start:cursor,in:offset,out:offset+scene.seconds,speed:1,opacity:1,zoom:m.kind==='image'?1:t.zoom,rotation:0,x:0,y:0,fitMode:m.kind==='image'?'contain':'cover',sceneBackdrop:true,effect:m.kind==='image'&&['dream','filmFog','filmGlow','filmPurpleHaze','fxPixel'].includes(scene.effect)?'modernClean':scene.effect,transitionPreset:scene.transition,transitionDuration:Math.min(.42,scene.seconds*.3),fadeIn:.05,fadeOut:.05,volume:1};if(m.kind==='image')c.keyframes=[];cursor+=scene.seconds;return c});
}
let sceneDraftWrite=Promise.resolve(),latestSceneDraft=null;
function saveSceneDraft(draft){
 if(!db){status('Bozza modello non salvata: memoria locale non disponibile.');return Promise.resolve(false)}
 const copy=clone(draft);copy.updatedAt=Date.now();const key=copy.draftId||copy.templateId;
 sceneDraftWrite=sceneDraftWrite.catch(()=>{}).then(async()=>{try{await tx('project','readwrite',{type:'put',args:[copy,'sceneDraft:'+key]});await tx('project','readwrite',{type:'put',args:[key,'sceneDraftLatest']});latestSceneDraft=copy;showSceneDraftResume();return true}catch(e){status('Bozza modello non salvata: memoria locale non disponibile o piena.');return false}});return sceneDraftWrite;
}
function showSceneDraftResume(){
 const hosts=[[$('mobileStart')?.querySelector('.mobile-start-actions'),'resumeSceneDraft',true],[$('welcome')?.querySelector('.options'),'desktopProjects',false]];
 for(const [host,id,mobile] of hosts){if(!host||$(id))continue;const button=document.createElement('button');button.id=id;button.type='button';button.className='projects-home-card';button.innerHTML=mobile?'<span class="mobile-action-icon" aria-hidden="true">▣</span><span><strong>I tuoi progetti</strong><small>Ritrova e continua i lavori salvati</small></span>':'I tuoi progetti<small>Ritrova e continua i lavori salvati</small>';button.onclick=openSceneDrafts;host.append(button)}
}
async function loadDraftMedia(draft){
 for(const mediaId of new Set([...(draft.slots||[]),...(draft.sound?.startsWith('personal:')?[draft.sound.slice(9)]:[])].filter(Boolean))){if(media.has(mediaId))continue;const row=await tx('media','readonly',{type:'get',args:[mediaId]});if(row){try{const item=await loadMedia(mediaId,row.blob,row.name,row.kind);item.saveState='saved'}catch(e){}}}
}
async function openSceneDrafts(){
 await storageReady;if(!db){editorInfo('Progetti non disponibili: memoria locale non accessibile.');return}if($('koreDraftsDialog'))return;
 const wrap=document.createElement('div');wrap.id='koreDraftsDialog';wrap.className='kore-caption-dialog kore-drafts';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-label','I tuoi progetti');
 const panel=document.createElement('section');panel.className='kore-caption-panel';const title=document.createElement('h3');title.textContent='I tuoi progetti';const note=document.createElement('p');note.textContent='Salvati su questo dispositivo. Scegli un progetto da riprendere o eliminare.';const list=document.createElement('div');list.className='drafts-list';const close=document.createElement('button');close.type='button';close.textContent='‹ Indietro';close.onclick=()=>wrap.remove();const backupTools=document.createElement('div');backupTools.className='backup-tools';const exportBackup=document.createElement('button');exportBackup.textContent='Scarica backup montaggio aperto';exportBackup.onclick=()=>exportKoreBackup(exportBackup);const importBackup=document.createElement('button');importBackup.textContent='Apri backup .kore';importBackup.onclick=()=>openKoreBackupFile();backupTools.append(exportBackup,importBackup);panel.append(title,note,backupTools,list,close);wrap.append(panel);document.body.append(wrap);
 async function drawDrafts(){list.replaceChildren();await sceneDraftWrite;const keys=await tx('project','readonly',{type:'getAllKeys',args:[]});const entries=[];for(const key of keys.filter(k=>typeof k==='string'&&k.startsWith('sceneDraft:'))){const draft=await tx('project','readonly',{type:'get',args:[key]});if(draft)entries.push({key,draft})}entries.sort((a,b)=>(b.draft.updatedAt||0)-(a.draft.updatedAt||0));
 const editorDrafts=[];
 for(const key of keys.filter(key=>key==='current'||(typeof key==='string'&&key.startsWith('editor:')))){
  const stored=await tx('project','readonly',{type:'get',args:[key]});
  const draft=key==='current'?stored:stored?.project;
  if(draft?.clips?.length)editorDrafts.push({key,draft,updatedAt:stored.updatedAt||0});
 }
 editorDrafts.sort((a,b)=>b.updatedAt-a.updatedAt);
 for(const {key,draft,updatedAt} of editorDrafts){
  const row=document.createElement('div');row.className='draft-row';
  const label=document.createElement('strong');
  const namedClip=draft.clips.find(c=>c.kind!=='title');
  const file=namedClip?await tx('media','readonly',{type:'get',args:[namedClip.media]}):null;
  label.textContent=(file?.name||'Progetto editor')+' · '+draft.clips.length+' clip';
  if(updatedAt){const date=document.createElement('small');date.textContent=new Date(updatedAt).toLocaleString('it-IT');label.append(document.createElement('br'),date)}
  const resume=document.createElement('button');resume.textContent='Apri';
  resume.onclick=async()=>{resume.disabled=true;try{
   await openEditorDraft(key,draft);
   wrap.remove();
   if(document.body.classList.contains('mobile-home-open'))$('mobileStartEditor').click();
   else $('desktopOpenEditor').click();
  }catch(e){resume.disabled=false;note.textContent='Impossibile aprire il progetto: '+e.message}};
  const del=document.createElement('button');del.textContent='Elimina';
  del.onclick=async()=>{if(!confirm('Eliminare questo progetto? I file originali rimangono sul dispositivo.'))return;try{
   await tx('project','readwrite',{type:'delete',args:[key]});
   if(activeProjectKey===key){activeProjectKey=null;project=emptyProject();selected=null;time=0;history=[];future=[];syncVideoPlayback(true);canvasSize();refresh()}
   await drawDrafts();
  }catch(e){note.textContent='Eliminazione non riuscita: '+e.message}};
  row.append(label,resume,del);list.append(row);
 }
 if(!entries.length&&!editorDrafts.length){const empty=document.createElement('p');empty.textContent='Non hai ancora progetti salvati.';list.append(empty)}
 for(const {key,draft} of entries){const t=[...SOCIAL_MIX_TEMPLATES,...GRAPHIC_TEMPLATES].find(x=>x.id===draft.templateId);if(!t)continue;const row=document.createElement('div');row.className='draft-row';const label=document.createElement('strong');label.textContent=t.name+' · '+(draft.slots||[]).filter(Boolean).length+'/'+(draft.indices||draft.slots||[]).length+' media';const resume=document.createElement('button');resume.textContent='Riprendi';resume.onclick=async()=>{resume.disabled=true;try{await loadDraftMedia(draft);wrap.remove();if(document.body.classList.contains('mobile-home-open'))$('mobileStartEditor').click();insertSocialMixTemplate(t,draft)}catch(e){resume.disabled=false;note.textContent='Impossibile aprire la bozza: '+e.message}};const del=document.createElement('button');del.textContent='Elimina';del.setAttribute('aria-label','Elimina bozza '+t.name);del.onclick=async()=>{if(!confirm('Eliminare questa bozza di '+t.name+'? I file originali non saranno eliminati.'))return;try{await tx('project','readwrite',{type:'delete',args:[key]});if((latestSceneDraft?.draftId||latestSceneDraft?.templateId)===key.slice(11)){latestSceneDraft=null;await tx('project','readwrite',{type:'delete',args:['sceneDraftLatest']})}await drawDrafts()}catch(e){note.textContent='Eliminazione non riuscita: '+e.message}};row.append(label,resume,del);list.append(row)}
 }
 try{await drawDrafts()}catch(e){note.textContent='Impossibile leggere i progetti: '+e.message}
}
async function restoreSceneDraft(){if(!db)return;try{const id=await tx('project','readonly',{type:'get',args:['sceneDraftLatest']});if(id)latestSceneDraft=await tx('project','readonly',{type:'get',args:['sceneDraft:'+id]});showSceneDraftResume()}catch(e){status('Impossibile recuperare i progetti: '+e.message)}}
function insertSocialMixTemplate(t,draft=null){
 draft=draft||koreModelDrafts.get(t.id)||null;
 const graphic=!t.effects?t:null;if(graphic)t={...t,count:1,duration:3,effects:['original'],transitions:['none'],zoom:1.03};
 if(exporting||document.getElementById('koreMixDialog'))return;
 const fullPlan=modelScenePlan(t),indices=Array.isArray(draft?.indices)?draft.indices.filter(i=>Number.isInteger(i)&&i>=0&&i<fullPlan.length):fullPlan.map((_,i)=>i);if(!indices.length)indices.push(0);const plan=indices.map(i=>fullPlan[i]),slots=plan.map((_,i)=>draft?.slots?.[i]||null),offsets=plan.map((_,i)=>Number(draft?.offsets?.[i])||0);let active=Math.min(draft?.active||0,plan.length-1),busy=false,pendingSlot=null,created=false,soundChoice=draft?.sound||'pulse';
 const draftId=draft?.draftId||draft?.templateId||uid();let draftRevision=0;const saveDraft=()=>{const revision=++draftRevision,snapshot={draftId,templateId:t.id,indices:[...indices],slots:[...slots],offsets:[...offsets],active,sound:soundChoice};koreModelDrafts.set(t.id,snapshot);const indicator=panel.querySelector('.scene-draft-status');if(indicator)indicator.textContent='Salvataggio bozza…';return saveSceneDraft(snapshot).then(async ok=>{await Promise.all(snapshot.slots.filter(Boolean).map(id=>media.get(id)?.savePromise).filter(Boolean));if(revision!==draftRevision||created)return;const unavailable=snapshot.slots.filter(Boolean).some(id=>media.get(id)?.saveState!=='saved');if(indicator)indicator.textContent=!ok||unavailable?'Bozza non completamente salvata: mantieni aperta la pagina.':'Bozza salvata su questo dispositivo';})};
 const wrap=document.createElement('div');wrap.id='koreMixDialog';wrap.className='kore-caption-dialog scene-picker';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','Scegli media per '+t.name);
 const panel=document.createElement('section');panel.className='kore-caption-panel';panel.innerHTML='<h3></h3><div class="scene-summary"><img alt="Immagine dimostrativa del modello"><div><strong></strong><span></span><small>Riempi un posto per ogni foto o video</small></div></div><p class="scene-instructions"></p><div class="scene-filter-row"><label>Mostra <select id="sceneMediaFilter"><option value="all">Foto e video</option><option value="image">Foto</option><option value="video">Video</option></select></label><label class="scene-import primary" for="sceneImport">＋ Aggiungi media</label><input id="sceneSlotImport" type="file" accept="video/*,image/*,.mov,.mp4" hidden><input id="sceneImport" type="file" accept="video/*,image/*,.mov,.mp4" multiple hidden></div><details class="scene-library-disclosure"><summary>Media già importati</summary><div id="sceneLibrary" class="scene-library"></div></details><h4>Le scene del modello</h4><div id="sceneSlots" class="scene-slots"></div><p id="sceneMessage" role="status" aria-live="polite"></p><p class="scene-draft-status" role="status" aria-live="polite"></p><div class="scene-actions"><button id="sceneCancel" type="button">Annulla</button><button id="sceneCreate" type="button" class="primary">Crea montaggio</button></div>';
 const q=id=>panel.querySelector('#'+id);panel.querySelector('h3').textContent=t.name;panel.querySelector('.scene-summary img').src='./demo-'+modelDemoSubject(t,'social')+'.jpg';panel.querySelector('.scene-summary strong').textContent=plan.length+' MEDIA DA INSERIRE';panel.querySelector('.scene-summary span').textContent=plan.reduce((a,b)=>a+b.seconds,0).toFixed(1)+' secondi · '+plan.length+' scene';panel.querySelector('.scene-instructions').textContent=plan.length+' foto o video · '+plan.reduce((a,b)=>a+b.seconds,0).toFixed(1)+' s. Premi + sulla scena per scegliere una foto o un video. Puoi riusare un file solo scegliendolo esplicitamente. Effetti e transizioni sono già assegnati.';

 const mobilePicker=window.matchMedia('(max-width: 759px)').matches;
 wrap.classList.add('kore-media-flow');
 const head=document.createElement('header');head.className='picker-head';
 const back=document.createElement('button');back.type='button';back.textContent='×';back.setAttribute('aria-label','Torna ai modelli');back.onclick=()=>q('sceneCancel').click();
 const title=document.createElement('strong');title.textContent=t.name;
 const info=document.createElement('button');info.type='button';info.textContent='ⓘ';info.setAttribute('aria-label','Informazioni modello');info.onclick=()=>{const summary=panel.querySelector('.scene-summary');summary.hidden=!summary.hidden};head.append(back,title,info);panel.prepend(head);
 const native=q('sceneImport');native.accept='image/*,video/*,.heic,.heif,.mov,.mp4';native.setAttribute('aria-label','Scegli dalla libreria foto e video');
 const addMedia=document.createElement('label');addMedia.htmlFor='sceneImport';addMedia.className='picker-add';addMedia.textContent='＋ Foto e video';head.after(addMedia);
 const tabs=document.createElement('nav');tabs.className='phone-picker-tabs';tabs.setAttribute('aria-label','Tipo di media');
 q('sceneMediaFilter').append(new Option('Live Photo','live'));
 for(const [value,label] of [['all','Tutto'],['video','Video'],['image','Foto'],['live','Live Photo']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.filter=value;b.onclick=()=>{q('sceneMediaFilter').value=value;render()};tabs.append(b)}
 addMedia.after(tabs);panel.querySelector('.scene-library-disclosure').open=true;
 const bottom=document.createElement('footer');bottom.className='picker-bottom';panel.append(bottom);
 const count=document.createElement('div');count.className='picker-count';count.innerHTML='<strong></strong><span></span>';bottom.append(count,q('sceneSlots'));
 const editScene=document.createElement('details');editScene.className='picker-scene-options';const editSummary=document.createElement('summary');editSummary.textContent='Opzioni scena';const editBody=document.createElement('div');editBody.className='picker-options-body';editScene.append(editSummary,editBody);bottom.append(editScene);
 q('sceneCreate').textContent='Avanti →';q('sceneCancel').textContent='‹ Indietro';
 panel.querySelector('.scene-summary').hidden=true;
 const soundRow=document.createElement('div');soundRow.className='kore-model-sound';
 const soundLabel=document.createElement('label');soundLabel.textContent='Base audio';const soundSelect=document.createElement('select');soundSelect.setAttribute('aria-label','Base audio del modello');
 for(const option of [{id:'none',name:'Senza base audio'},...KORE_SOUNDS]){const el=document.createElement('option');el.value=option.id;el.textContent=option.name;soundSelect.append(el)}
 for(const m of media.values()){if(m.kind!=='audio'||!m.ready||m.koreOriginal)continue;const option=document.createElement('option');option.value='personal:'+m.id;option.textContent=m.name;soundSelect.append(option)}soundSelect.value=soundChoice;if(!soundSelect.value){soundChoice='none';soundSelect.value='none'}soundLabel.append(soundSelect);
 const soundListen=document.createElement('button');soundListen.type='button';soundListen.className='kore-sound-listen';soundListen.textContent='♫ Ascolta base';soundListen.onclick=()=>listenKoreSound(soundChoice,soundListen);
 soundSelect.onchange=()=>{stopKoreSound();soundChoice=soundSelect.value;soundListen.disabled=soundChoice==='none';saveDraft()};
 soundListen.disabled=soundChoice==='none';const rights=document.createElement('small');rights.textContent='Basi originali KORE · uso personale e commerciale consentito. ';const soundInfo=document.createElement('a');soundInfo.href='./audio-info.txt';soundInfo.target='_blank';soundInfo.rel='noopener';soundInfo.textContent='Info audio';rights.append(soundInfo);
 const personalLabel=document.createElement('label');personalLabel.className='model-personal-audio';personalLabel.append(document.createTextNode('＋ Carica audio personale'));const personalInput=document.createElement('input');personalInput.type='file';personalInput.accept=audioAccept;personalInput.setAttribute('aria-label','Carica audio personale');personalLabel.append(personalInput);
 personalInput.onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||busy)return;busy=true;render();personalInput.disabled=true;stopKoreSound();try{const m=await loadMedia(uid(),file,file.name,'audio');if(db)queueMediaSave(m,file);else m.saveState='session';const option=document.createElement('option');option.value='personal:'+m.id;option.textContent=file.name;soundSelect.append(option);soundChoice=option.value;soundSelect.value=soundChoice;soundListen.disabled=false;saveDraft();message('Audio personale caricato: '+file.name)}catch(error){message('Audio non caricato: '+error.message)}finally{busy=false;personalInput.disabled=false;render()}};
 soundRow.append(soundLabel,soundListen,personalLabel,rights);bottom.append(soundRow,q('sceneMessage'),panel.querySelector('.scene-draft-status'),panel.querySelector('.scene-actions'));
 const message=text=>q('sceneMessage').textContent=text;
 let replacing=null;
 const readyAt=i=>sceneReady(media.get(slots[i]),plan[i],offsets[i]);
 const appendThumb=(host,m,cls)=>{const thumb=document.createElement(m.kind==='image'?'img':'video');thumb.src=m.url+(m.kind==='video'?'#t=0.001':'');thumb.className=cls;if(m.kind==='image'){thumb.alt='';thumb.loading='lazy'}else{thumb.muted=true;thumb.playsInline=true;thumb.preload='metadata';thumb.setAttribute('aria-hidden','true')}host.append(thumb)};
 function assign(id){if(busy)return;const target=sceneTarget(slots,replacing);if(target<0)return message('Tocca una scena per sostituire il contenuto.');if(!sceneReady(media.get(id),plan[target],0))return message('Il video è troppo corto: la scena '+(target+1)+' richiede '+plan[target].seconds.toFixed(2)+' s.');slots[target]=id;offsets[target]=0;replacing=null;const next=slots.findIndex(id=>!id);active=next<0?target:next;saveDraft();render()}
 function render(){
  const filter=q('sceneMediaFilter').value,grid=q('sceneLibrary');grid.replaceChildren();
  panel.querySelectorAll('.phone-picker-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  const assets=[...media.values()].filter(m=>m.ready&&mediaMatchesFilter(m,filter));
  if(!assets.length){const empty=document.createElement('div');empty.className='picker-empty';const icon=document.createElement('span');icon.textContent='▧';const note=document.createElement('p');note.textContent=filter==='live'?'Le Live Photo sono disponibili qui solo se il telefono le condivide come file riconoscibili. Per conservare il movimento, esportale come video dalla galleria.':'Scegli foto e video dalla galleria. Li ritrovi qui, pronti per le tue scene.';const pick=document.createElement('label');pick.htmlFor='sceneImport';pick.className='primary picker-empty-import';pick.textContent='＋ Apri galleria';empty.append(icon,note,pick);grid.append(empty)}
  for(const m of assets){const button=document.createElement('button');button.type='button';button.className='scene-media';button.disabled=busy;const target=sceneTarget(slots,replacing);button.setAttribute('aria-label','Usa '+m.name+' nella scena '+(target<0?active+1:target+1));appendThumb(button,m,'picker-media-thumb');const chosen=slots.map((id,i)=>id===m.id?i+1:null).filter(Boolean);button.classList.toggle('media-picked',!!chosen.length);const badge=document.createElement('span');badge.className='picker-check';badge.textContent=chosen.join(',');const kind=document.createElement('span');kind.className='picker-kind';kind.textContent=m.kind==='video'?'▹ '+Math.floor(m.el.duration/60).toString().padStart(2,'0')+':'+Math.floor(m.el.duration%60).toString().padStart(2,'0'):'▧';const filename=document.createElement('small');filename.textContent=m.name;button.append(badge,kind,filename);button.onclick=()=>assign(m.id);grid.append(button)}
  const list=q('sceneSlots');list.replaceChildren();let valid=0;
  plan.forEach((scene,i)=>{const m=media.get(slots[i]),ok=readyAt(i);if(ok)valid++;const row=document.createElement('div');row.className='scene-slot'+(i===active?' active':'')+(m&&!ok?' invalid':'');const pick=document.createElement('button');pick.type='button';pick.disabled=busy;pick.setAttribute('aria-pressed',String(i===active));pick.setAttribute('aria-label','Scena '+(i+1)+' · '+scene.seconds.toFixed(2)+' secondi · '+(m?m.name:'Vuota'));if(m?.ready)appendThumb(pick,m,'scene-assigned-thumb');const number=document.createElement('span');number.className='scene-number';number.textContent=i+1;const timing=document.createElement('strong');timing.className='scene-duration';timing.textContent=scene.seconds.toFixed(2).replace(/0$/,'')+' s';const plus=document.createElement('span');plus.className='scene-plus';plus.textContent=m?'':'＋';pick.append(number,plus,timing);pick.onclick=()=>{active=i;replacing=i;render();message('Scena '+(i+1)+': tocca un contenuto nella griglia per sostituirlo.')};row.append(pick);list.append(row)});
  count.querySelector('strong').textContent='Scene ('+valid+'/'+plan.length+')';count.querySelector('span').textContent='▧ '+plan.reduce((n,p)=>n+p.seconds,0).toFixed(1)+' s';
  editBody.replaceChildren();const m=media.get(slots[active]),scene=plan[active];const note=document.createElement('p');note.textContent='Scena '+(active+1)+' · '+assetOptionLabel('effect',scene.effect)+' · '+assetOptionLabel('transition',scene.transition);editBody.append(note);
  for(const [text,fn,disabled] of [['＋ Sostituisci dalla galleria',()=>{pendingSlot=active;q('sceneSlotImport').click()},false],['Elimina scena dal modello',()=>{if(plan.length<=1)return;plan.splice(active,1);indices.splice(active,1);slots.splice(active,1);offsets.splice(active,1);active=Math.min(active,plan.length-1);replacing=null;saveDraft();render()},plan.length<=1],['Rimuovi contenuto',()=>{slots[active]=null;offsets[active]=0;replacing=null;saveDraft();render()},!m],['← Sposta prima',()=>{[slots[active-1],slots[active]]=[slots[active],slots[active-1]];[offsets[active-1],offsets[active]]=[offsets[active],offsets[active-1]];active--;saveDraft();render()},active===0],['Sposta dopo →',()=>{[slots[active+1],slots[active]]=[slots[active],slots[active+1]];[offsets[active+1],offsets[active]]=[offsets[active],offsets[active+1]];active++;saveDraft();render()},active===plan.length-1]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=busy||disabled;b.onclick=fn;editBody.append(b)}
  if(m?.kind==='video'){const label=document.createElement('label');label.textContent='Secondo iniziale video scena '+(active+1);const input=document.createElement('input');input.type='number';input.min='0';input.max=String(Math.max(0,m.el.duration-scene.seconds));input.step='.01';input.value=offsets[active];input.disabled=busy;input.onchange=()=>{offsets[active]=Math.max(0,Number(input.value)||0);saveDraft();render()};label.append(input);editBody.append(label)}
  q('sceneCreate').disabled=busy||valid!==plan.length;q('sceneCancel').disabled=busy;q('sceneImport').disabled=busy;q('sceneSlotImport').disabled=busy;soundSelect.disabled=busy;soundListen.disabled=busy||soundChoice==='none';personalInput.disabled=busy;back.disabled=busy;addMedia.classList.toggle('is-disabled',busy);
  message(busy?'Importazione in corso…':valid+' / '+plan.length+' scene pronte'+(valid===plan.length?' · Il tuo montaggio è pronto.':replacing!==null?' · Scegli il nuovo contenuto per la scena '+(replacing+1):' · Tocca i contenuti per riempire le scene.'));
 }
 const close=()=>{if(busy)return;stopKoreSound();if(!created)saveDraft();wrap.remove();document.removeEventListener('keydown',key);if(!created&&mobilePicker)$('mobileModels').click()};const key=e=>{if(e.key==='Escape')close()};q('sceneCancel').onclick=close;wrap.onclick=e=>{if(e.target===wrap)close()};q('sceneMediaFilter').onchange=render;
 q('sceneSlotImport').addEventListener('cancel',()=>{pendingSlot=null});
 q('sceneSlotImport').onchange=async e=>{const file=e.target.files?.[0],target=pendingSlot;pendingSlot=null;e.target.value='';if(!file||target===null||busy)return;busy=true;render();let result;try{result=await importFiles([file],{libraryOnly:true});const id=result.ids?.[0];if(id&&media.get(id)?.ready){slots[target]=id;offsets[target]=0;const next=slots.findIndex((id,i)=>!id&&i>target);active=next>=0?next:target}}catch(error){result={error:error.message}}finally{busy=false;if(result?.imported){saveDraft();const item=media.get(slots[target]);item?.savePromise?.then(()=>{if(item.saveState!=='saved')message('Media non salvato sul dispositivo: mantieni aperta la pagina.')})}render();if(result?.error)message('Importazione non riuscita: '+result.error);else if(!result?.imported)message('Media non importato. Riprova dalla casella.')}};
 q('sceneImport').onchange=async e=>{const files=[...e.target.files];e.target.value='';if(!files.length||busy)return;busy=true;render();let result;try{result=await importFiles(files,{libraryOnly:true})}catch(error){result={error:error.message}}finally{busy=false;if(result?.ids){q('sceneMediaFilter').value='all';let rejected=0;for(const id of result.ids){const target=sceneTarget(slots,replacing);if(target<0)break;if(sceneReady(media.get(id),plan[target],0)){slots[target]=id;offsets[target]=0;replacing=null}else rejected++}const next=slots.findIndex(id=>!id);if(next>=0)active=next;saveDraft();render();if(rejected)message(rejected+' video troppo corti per le scene richieste. Puoi sceglierli per una scena più breve.')}else render();if(result?.error)message('Importazione non riuscita: '+result.error);else if(result?.failed)message(result.imported+' media aggiunti; '+result.failed+' file non importati.')}};
 q('sceneCreate').onclick=async()=>{if(busy||exporting)return;stopKoreSound();busy=true;render();soundSelect.disabled=true;soundListen.disabled=true;try{const start=Math.max(time,endTime()),clips=buildModelScenes(t,slots,media,start,project.tracks[0].id,offsets,plan),seconds=plan.reduce((n,p)=>n+p.seconds,0),soundMedia=soundChoice==='none'?null:soundChoice.startsWith('personal:')?media.get(soundChoice.slice(9)):await createKoreSoundMedia(soundChoice,seconds);if(soundChoice.startsWith('personal:')&&!soundMedia?.ready)throw Error('Ricarica il tuo audio personale');;mutate(()=>{project.clips.push(...clips);if(soundMedia)project.clips.push({id:uid(),kind:'audio',media:soundMedia.id,track:ensureAudioTrack(),start,in:0,out:Math.min(seconds,soundMedia.el.duration),speed:1,volume:.65,opacity:1,audioFadeIn:.05,audioFadeOut:.25,koreOriginal:!!soundMedia.koreOriginal});selected=clips[0].id});busy=false;created=true;koreModelDrafts.delete(t.id);sceneDraftWrite=sceneDraftWrite.catch(()=>{}).then(async()=>{await Promise.all([...slots.map(id=>media.get(id)?.savePromise),soundMedia?.savePromise].filter(Boolean));if(!db||soundMedia&&soundMedia.saveState!=='saved'||slots.some(id=>media.get(id)?.saveState!=='saved')||!await persist()){status('Montaggio creato, ma salvataggio non confermato: la bozza è conservata.');return}if(db){await tx('project','readwrite',{type:'delete',args:['sceneDraft:'+draftId]});if((latestSceneDraft?.draftId||latestSceneDraft?.templateId)===draftId){await tx('project','readwrite',{type:'delete',args:['sceneDraftLatest']});latestSceneDraft=null;showSceneDraftResume()}}}).catch(()=>status('Impossibile eliminare la bozza già utilizzata.'));close();seek(start);if(graphic)insertGraphicTemplate(graphic);seek(start+Math.min(.18,plan[0].seconds/2));status(t.name+' creato: '+clips.length+' scene. Premi Riproduci per l’anteprima.');window.dispatchEvent(new CustomEvent('kore-template-created',{detail:{id:t.id}}));mobileApplyFeedback('✓ '+t.name+' · '+clips.length+' scene create')}catch(error){busy=false;render();soundSelect.disabled=false;soundListen.disabled=soundChoice==='none';message(error.message)}};
 wrap.append(panel);document.body.append(wrap);document.addEventListener('keydown',key);render();if(draft)panel.querySelector('.scene-draft-status').textContent=slots.some(id=>id&&!media.has(id))?'Alcuni media non sono disponibili: aggiungili di nuovo.':'Bozza ripristinata su questo dispositivo';back.focus();if(!draft&&mobilePicker&&navigator.userActivation?.isActive){try{q('sceneImport').click()}catch(e){message('Tocca ＋ Foto e video per aprire la galleria.')}}

}

const GRAPHIC_TEMPLATES=[
{id:'neon',name:'Neon Pulse',preview:'KORE',description:'Bagliore rosa',color:'#ff2d92',font:'bebas'},
{id:'lower',name:'Lower Third',preview:'IL TUO NOME',description:'Etichetta in basso',color:'#ff2d92',font:'space'},
{id:'cinema',name:'Cinema Frame',preview:'CINEMA',description:'Bande cinematografiche',color:'#e9c3a5',font:'bebas'},
{id:'badge',name:'Diamond Logo',preview:'NEW',description:'Cornice a diamante',color:'#6cecff',font:'anton'},
{id:'minimal',name:'Editorial Line',preview:'STORY',description:'Linea minimal',color:'#ffffff',font:'playfair'},
{id:'ticker',name:'Social Banner',preview:'TREND',description:'Banner social',color:'#fcce36',font:'anton'},
{id:'countdown',name:'Countdown',preview:'03',description:'Conto alla rovescia',color:'#ff5373',font:'bebas'},
{id:'outline',name:'Outline Tech',preview:'FUTURE',description:'Cornice tecnologica',color:'#76f5d5',font:'space'},
{id:'gradient',name:'Gradient Pop',preview:'WOW',description:'Sfondo sfumato',color:'#ad69ff',font:'anton'},
{id:'spot',name:'Spotlight Title',preview:'LIVE',description:'Cerchio luminoso',color:'#ff6bcb',font:'bebas'},
{"id":"karaoke","name":"Karaoke Pop","preview":"CANTA!","description":"Testo animato pop","color":"#ff2d92","font":"montserrat","animation":"pop","shadow":"neon"},
{"id":"creator","name":"Creator Intro","preview":"FOLLOW","description":"Intro social bold","color":"#ffd25e","font":"righteous","animation":"slide","shadow":"soft"},
{"id":"breaking","name":"Breaking News","preview":"NEWS","description":"Titolo notizia","color":"#ff4646","font":"oswald","animation":"slide","shadow":"soft"},
{"id":"luxury","name":"Luxury Serif","preview":"LUXURY","description":"Editoriale elegante","color":"#e5c78d","font":"playfair","animation":"fade","shadow":"gold"},
{"id":"techno","name":"Techno Pulse","preview":"TECH","description":"Neon futuristico","color":"#6af6ff","font":"space","animation":"pulse","shadow":"cyan"},
{"id":"comic","name":"Comic Impact","preview":"BOOM!","description":"Pop brillante","color":"#ffbc30","font":"anton","animation":"pop","shadow":"gold"},
{"id":"vlog","name":"Daily Vlog","preview":"MY DAY","description":"Vlog pulito","color":"#ffffff","font":"outfit","animation":"typewriter","shadow":"soft"},
{"id":"sportsTitle","name":"Sport Title","preview":"MATCH","description":"Sport dinamico","color":"#faff53","font":"oswald","animation":"rotate","shadow":"gold"}
];
function insertGraphicTemplate(t){const track=project.tracks[1]?.id||project.tracks[0].id;mutate(()=>{const c={id:uid(),kind:'title',media:null,track,start:time,in:0,out:3,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:0,text:t.preview,fontSize:t.id==='lower'?44:68,fontFamily:t.font,fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:t.color,graphicTemplate:t.id,titleAnimation:t.animation||'none',titleShadow:t.shadow||'none',effect:'original',fadeIn:.18,fadeOut:.18};project.clips.push(c);selected=c.id});status('Modello '+t.name+' aggiunto: personalizza testo e colori nell’ispettore');if(globalThis.window?.matchMedia('(max-width: 759px)').matches){seek(time+.25);mobileApplyFeedback('✓ '+t.name+' applicato · Testo in Modifica')}}
function renderGraphicTemplate(c,t){const id=c.graphicTemplate;if(!id)return;const w=canvas.width,h=canvas.height,a=c.graphicAccent||'#ff2d92',s=Math.max(0,t-c.start);ctx.save();ctx.lineWidth=Math.max(2,w*.006);ctx.strokeStyle=a;ctx.fillStyle=a;
if(id==='neon'){ctx.shadowColor=a;ctx.shadowBlur=w*.065;ctx.strokeRect(-w*.4,-h*.105,w*.8,h*.21);ctx.shadowBlur=0}
if(id==='lower'){ctx.fillRect(-w*.47,h*.23,w*.94,h*.13);ctx.fillStyle='#0a0612';ctx.fillRect(-w*.47,h*.355,w*.94,h*.008)}
if(id==='cinema'){ctx.fillStyle='#050407';ctx.fillRect(-w/2,-h/2,w,h*.12);ctx.fillRect(-w/2,h*.38,w,h*.12);ctx.fillStyle=a;ctx.fillRect(-w/2,-h*.385,w,h*.004);ctx.fillRect(-w/2,h*.375,w,h*.004)}
if(id==='badge'){ctx.save();ctx.rotate(Math.PI/4);ctx.strokeRect(-w*.2,-w*.2,w*.4,w*.4);ctx.restore()}
if(id==='minimal'){ctx.fillRect(-w*.32,h*.09,w*.64,h*.003)}
if(id==='ticker'){ctx.fillRect(-w/2,-h*.115,w,h*.23);ctx.fillStyle='#0b0710';ctx.fillRect(-w/2,h*.12,w,h*.014)}
if(id==='countdown'){ctx.beginPath();ctx.arc(0,0,w*.29,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,w*.29,-Math.PI/2,-Math.PI/2+Math.PI*2*(s%3)/3);ctx.lineWidth=w*.025;ctx.stroke()}
if(id==='outline'){const r=w*.39,l=w*.09;for(const x of [-r,r])for(const y of [-h*.13,h*.13]){ctx.beginPath();ctx.moveTo(x+(x<0?l:-l),y);ctx.lineTo(x,y);ctx.lineTo(x,y+(y<0?l:-l));ctx.stroke()}}
if(id==='gradient'){const g=ctx.createLinearGradient(-w*.5,-h*.2,w*.5,h*.2);g.addColorStop(0,a+'bb');g.addColorStop(1,'#ff2d9255');ctx.fillStyle=g;ctx.fillRect(-w*.48,-h*.18,w*.96,h*.36)}
if(id==='spot'){const g=ctx.createRadialGradient(0,0,0,0,0,w*.46);g.addColorStop(0,a+'66');g.addColorStop(1,a+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,w*.46,0,Math.PI*2);ctx.fill()}

if(id==='karaoke'){ctx.fillStyle='#08040bcc';ctx.fillRect(-w*.47,h*.19,w*.94,h*.19);ctx.fillStyle=a;ctx.fillRect(-w*.47,h*.37,w*.32,h*.012)}
if(id==='creator'){ctx.fillStyle=a;ctx.fillRect(-w*.46,-h*.18,w*.018,h*.36);ctx.fillRect(-w*.46,-h*.18,w*.26,h*.014);ctx.fillRect(w*.25,h*.17,w*.21,h*.014)}
if(id==='breaking'){ctx.fillStyle=a;ctx.fillRect(-w*.49,-h*.23,w*.98,h*.09);ctx.fillRect(-w*.49,h*.17,w*.98,h*.06);ctx.fillStyle='#08040bcc';ctx.fillRect(-w*.49,-h*.14,w*.98,h*.31)}
if(id==='luxury'){ctx.strokeStyle=a;ctx.lineWidth=Math.max(1,w*.002);ctx.strokeRect(-w*.45,-h*.19,w*.9,h*.38);ctx.beginPath();ctx.moveTo(-w*.29,h*.23);ctx.lineTo(w*.29,h*.23);ctx.stroke()}
if(id==='techno'){ctx.shadowColor=a;ctx.shadowBlur=w*.04;for(let i=0;i<4;i++){const x=-w*.46+i*w*.31;ctx.strokeRect(x,-h*.21,w*.25,h*.42)}ctx.shadowBlur=0}
if(id==='comic'){ctx.save();ctx.rotate(-.08);ctx.fillStyle=a;ctx.beginPath();for(let i=0;i<20;i++){const r=i%2?w*.31:w*.44,angle=i*Math.PI/10;const x=Math.cos(angle)*r,y=Math.sin(angle)*r*.68;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fill();ctx.restore()}
if(id==='vlog'){ctx.fillStyle=a;ctx.fillRect(-w*.42,h*.14,w*.84,h*.012);ctx.fillRect(-w*.42,-h*.15,w*.13,h*.012);ctx.fillRect(w*.29,-h*.15,w*.13,h*.012)}
if(id==='sportsTitle'){ctx.fillStyle=a;ctx.save();ctx.transform(1,0,-.25,1,0,0);ctx.fillRect(-w*.47,h*.16,w*.94,h*.065);ctx.fillRect(-w*.47,-h*.21,w*.23,h*.03);ctx.restore()}
ctx.restore()}
function titleAnimationState(c,t){const d=Math.max(.1,duration(c)),u=Math.max(0,t-c.start),p=Math.min(1,u/.55),style=c.titleAnimation||'none';let scale=1,dy=0,rotation=0,alpha=1;if(style==='pop')scale=.65+.35*(1-Math.pow(1-p,3))+Math.sin(p*Math.PI*2)*.10*(1-p);if(style==='slide')dy=canvas.height*.23*Math.pow(1-p,2);if(style==='fade')alpha=p;if(style==='pulse')scale=1+.045*Math.sin(u*7);if(style==='rotate')rotation=(1-p)*(-.22);return {scale,dy,rotation,alpha,chars:style==='typewriter'?Math.max(0,Math.floor((u/Math.min(d,.9))*String(c.text||'').length)):null}}
function parseSubtitleTime(s){const m=String(s).trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/);if(!m)return null;return Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3])+Number(m[4].padEnd(3,'0'))/1000}
function parseSubtitleFile(raw){const blocks=String(raw).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split(/\n\s*\n/),cues=[];for(const block of blocks){const lines=block.split('\n').map(s=>s.trim()).filter(Boolean);const idx=lines.findIndex(s=>s.includes('-->'));if(idx<0)continue;const pair=lines[idx].split(/\s*-->\s*/);const start=parseSubtitleTime(pair[0]),end=parseSubtitleTime(pair[1].split(/\s+/)[0]);if(start===null||end===null||end<=start)continue;const words=lines.slice(idx+1).join(' ').replace(/<[^>]*>/g,'').replace(/\{\\[^}]*\}/g,'').trim();if(words)cues.push({start,end,text:words.slice(0,120)})}return cues.slice(0,500)}
async function importSubtitleFile(file){if(!file)return;try{if(file.size>2e6)return status('File sottotitoli troppo grande (max 2 MB).');const raw=await file.text(),cues=parseSubtitleFile(raw);if(!cues.length)return status('Nessun sottotitolo SRT/VTT valido trovato.');const track=project.tracks[1]?.id||project.tracks[0].id;const base=time;mutate(()=>{for(const cue of cues){const c={id:uid(),kind:'title',media:null,track,start:base+cue.start,in:0,out:cue.end-cue.start,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:.34,text:cue.text,fontSize:35,fontFamily:'outfit',fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:'#ff2d92',titleShadow:'soft',karaoke:true,subtitle:true,effect:'original',fadeIn:.06,fadeOut:.06};project.clips.push(c);selected=c.id}});seek(base+cues[0].start);status(cues.length+' sottotitoli sincronizzati importati da '+file.name)}catch(e){status('Errore importazione sottotitoli: '+e.message)}}
function exportCaptionsSrt(){const titles=project.clips.filter(c=>c.kind==='title'&&String(c.text||'').trim()).flatMap(transcriptSrtRows).sort((a,b)=>a.start-b.start);if(!titles.length)return status('Non ci sono titoli o sottotitoli da esportare.');const stamp=t=>{const ms=Math.round(Math.max(0,t)*1000),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000),r=ms%1000;return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':')+','+String(r).padStart(3,'0')};const content=titles.map((c,i)=>String(i+1)+'\n'+stamp(c.start)+' --> '+stamp(c.start+duration(c))+'\n'+String(c.text).replace(/\r/g,'')+'\n').join('\n');const blob=new Blob([content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='KORE_sottotitoli.srt';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);status('SRT esportato: '+titles.length+' titoli')}
function renderKaraokeText(c,t){const words=String(c.text||'').trim().split(/\s+/).filter(Boolean);if(!words.length)return;const local=Math.max(0,t-c.start),durationSec=Math.max(.15,duration(c));const weights=words.map(w=>Math.max(1,w.length)),total=weights.reduce((a,b)=>a+b,0);let elapsed=0;const sizes=words.map((w,i)=>{const d=durationSec*Math.max(1,w.length)/total;const timed=Array.isArray(c.karaokeWords)?c.karaokeWords[i]:null;const result={word:w,start:timed&&Number.isFinite(timed.start)?Math.max(0,timed.start):elapsed,end:timed&&Number.isFinite(timed.end)?Math.min(durationSec,timed.end):elapsed+d};elapsed+=d;return result});const maxWidth=canvas.width*.87;ctx.save();const size=Math.round((c.fontSize||36)*canvas.width/540);ctx.font=(c.fontItalic?'italic ':'')+(c.fontBold===false?'400 ':'800 ')+size+'px '+(({bebas:"'Bebas Neue',Impact,sans-serif",anton:"'Anton',Impact,sans-serif",oswald:"'Oswald',Impact,sans-serif",montserrat:"'Montserrat',system-ui,sans-serif",righteous:"'Righteous',system-ui,sans-serif",outfit:"'Outfit',system-ui,sans-serif",space:"'Space Grotesk',system-ui,sans-serif",playfair:"'Playfair Display',serif",mono:"'Space Mono',monospace"}[c.fontFamily]||"'Outfit',system-ui,sans-serif"));ctx.textBaseline='middle';ctx.textAlign='left';const gap=ctx.measureText(' ').width;const rows=[[]];let rowWidth=0;for(const item of sizes){const width=ctx.measureText(item.word).width;if(rowWidth+width+gap>maxWidth&&rows[rows.length-1].length){if(rows.length>=3)break;rows.push([]);rowWidth=0}rows[rows.length-1].push({...item,width});rowWidth+=width+gap}const lineHeight=size*1.22;rows.slice(0,3).forEach((row,i)=>{const width=row.reduce((sum,w)=>sum+w.width+gap,0)-gap;let x=-width/2;const y=(i-(rows.length-1)/2)*lineHeight;for(const item of row){const done=local>=item.end,progress=Math.max(0,Math.min(1,(local-item.start)/(item.end-item.start)));ctx.lineWidth=Math.max(3,canvas.width/125);ctx.strokeStyle='#000000';ctx.strokeText(item.word,x,y);ctx.fillStyle=done?(c.graphicAccent||'#ff2d92'):'#ffffff';ctx.fillText(item.word,x,y);if(progress>0&&!done){ctx.save();ctx.beginPath();ctx.rect(x-2,y-size*.7,item.width*progress+4,size*1.4);ctx.clip();ctx.fillStyle=c.graphicAccent||'#ff2d92';ctx.fillText(item.word,x,y);ctx.restore()}x+=item.width+gap}});ctx.restore()}

let koreAsrModel=null;
async function koreLoadAsr(progress){if(koreAsrModel)return koreAsrModel;const lib=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');koreAsrModel=await lib.pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{device:'wasm',dtype:'q8',progress_callback:e=>{if(e.status==='progress'&&e.progress!=null)progress('Download modello: '+Math.round(e.progress)+'%')}});return koreAsrModel}
async function koreExtractAudio(file,from=0,limit=90,options={}){const ac=new (window.AudioContext||window.webkitAudioContext)();try{let decoded;try{const header=new Uint8Array(await file.slice(0,12).arrayBuffer());const mp4=String.fromCharCode(...header.slice(4,8));const input=['ftyp','moov','mdat','wide','free'].includes(mp4)?await extractAudioTrack(file,options):file;if(options.signal?.aborted)throw new DOMException('Analisi annullata','AbortError');decoded=await ac.decodeAudioData(await input.arrayBuffer())}catch(e){if(e.name==='AbortError')throw e;throw new Error('Traccia audio non decodificata: '+e.message+'. Puoi importare un audio separato per questa clip.')}const offset=Math.max(0,Math.min(Number(from)||0,decoded.duration)),seconds=Math.min(limit,decoded.duration-offset);if(seconds<.1)throw new Error('La clip selezionata non contiene audio nel segmento richiesto.');const offline=new OfflineAudioContext(1,Math.max(1,Math.floor(seconds*16000)),16000);const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start(0,offset,seconds);const out=await offline.startRendering();return {samples:out.getChannelData(0),seconds,offset}}finally{await ac.close()}}
function koreRecognizedCues(result,seconds){const parts=Array.isArray(result.chunks)?result.chunks.filter(c=>String(c.text||'').trim()):[];const valid=parts.every(c=>Array.isArray(c.timestamp)&&c.timestamp[0]!=null&&c.timestamp[1]!=null&&Number.isFinite(Number(c.timestamp[0]))&&Number.isFinite(Number(c.timestamp[1]))&&Number(c.timestamp[1])>Number(c.timestamp[0]));if(parts.length&&valid)return parts.map(c=>({text:String(c.text).trim(),start:Number(c.timestamp[0]),end:Number(c.timestamp[1])}));const text=String(result.text||parts.map(c=>c.text).join(' ')||'').trim();if(!text)return [];const phrases=text.match(/[^.!?]+[.!?]?/g)||[text];let n=0;return phrases.map(p=>{const start=n/text.length*seconds;n+=p.length;return {text:p.trim(),start,end:n/text.length*seconds}}).filter(c=>c.text)}
function koreGroupAsrCues(cues){if(!Array.isArray(cues)||!cues.length)return [];cues=cues.flatMap(cue=>{const words=String(cue.text||'').trim().split(/\s+/).filter(Boolean);return words.map((text,i)=>({text,start:cue.start+(cue.end-cue.start)*i/words.length,end:cue.start+(cue.end-cue.start)*(i+1)/words.length}))});const result=[];let group=null;for(const cue of cues){const text=String(cue.text||'').trim();if(!text||!(cue.end>cue.start))continue;const tokens=text.split(/\s+/).filter(Boolean);const wordTimes=tokens.map((word,i)=>({word,start:cue.start+(cue.end-cue.start)*i/tokens.length,end:cue.start+(cue.end-cue.start)*(i+1)/tokens.length}));if(!group||cue.start-group.end>.7||group.text.length+text.length+1>46||group.end-group.start>3.3){group={text,start:cue.start,end:cue.end,words:wordTimes};result.push(group)}else{group.text+=' '+text;group.end=Math.max(group.end,cue.end);group.words.push(...wordTimes)}}return result}
function koreAsrClipUnchanged(original,current){return !!current&&['id','media','start','in','out','speed'].every(key=>current[key]===original[key])}
function openVideoTranscriber(){if(document.getElementById('koreVideoAsrDialog'))return;const clip=selectedClip(),m=clip&&media.get(clip.media);if(!clip||!['video','audio'].includes(m?.kind)||!m.blob)return editorInfo('Seleziona nella timeline un video o una traccia audio con parlato da trascrivere.');const wrap=document.createElement('div');wrap.id='koreVideoAsrDialog';wrap.className='kore-caption-dialog';const panel=document.createElement('div');panel.className='kore-caption-panel';wrap.append(panel);document.body.append(wrap);const title=document.createElement('h3');title.textContent='✦ Sottotitoli AI';const info=document.createElement('p');info.textContent='Trascrivi il parlato della clip selezionata, fino a 5 minuti. Il metodo Dal file separa l’audio da MP4/MOV senza riprodurre il video. Mantieni KORE aperto; puoi annullare. Controlla il testo generato.';info.style.color='#d6b9cf';info.style.fontSize='13px';const lang=document.createElement('select');for(const [code,label] of [['italian','Italiano'],['english','English'],['spanish','Español'],['french','Français'],['german','Deutsch'],['auto','Rileva automaticamente']]){const option=document.createElement('option');option.value=code;option.textContent=label;lang.append(option)}const styleRow=document.createElement('div');styleRow.className='kore-speech-actions';const fontSelect=document.createElement('select');for(const [value,label] of [['montserrat','Montserrat Bold'],['anton','Anton Impact'],['bebas','Bebas Neue'],['oswald','Oswald'],['righteous','Righteous Pop'],['outfit','Outfit Modern'],['space','Space Grotesk']]){const op=document.createElement('option');op.value=value;op.textContent=label;fontSelect.append(op)}fontSelect.title='Font sottotitoli';const colorSelect=document.createElement('select');for(const [value,label] of [['#ff2d92','Rosa neon'],['#ffe14e','Giallo pop'],['#6cecff','Ciano elettrico'],['#9bff7b','Verde lime'],['#ffffff','Bianco']]){const op=document.createElement('option');op.value=value;op.textContent=label;colorSelect.append(op)}colorSelect.title='Colore evidenziazione karaoke';styleRow.append(fontSelect,colorSelect);const groupRow=document.createElement('label');groupRow.style.display='flex';groupRow.style.gap='8px';groupRow.style.alignItems='center';const groupWords=document.createElement('input');groupWords.type='hidden';groupWords.checked=true;groupRow.append(groupWords,document.createTextNode('Trascrizione unica · frasi sincronizzate e taglio manuale'));const state=document.createElement('div');state.className='kore-speech-status';state.textContent='Pronto: '+m.name;const output=document.createElement('div');output.className='kore-speech-live';output.textContent='La trascrizione apparirà qui.';const actions=document.createElement('div');actions.className='kore-speech-actions';const run=document.createElement('button');run.className='primary';run.textContent='✦ Genera sottotitoli';const close=document.createElement('button');close.textContent='Chiudi';actions.append(run,close);const extraction=document.createElement('select');extraction.setAttribute('aria-label','Metodo estrazione audio');extraction.innerHTML='<option value="fast">Dal file · separa la traccia audio</option><option value="compatible">Alternativa · riproduzione in tempo reale</option>';const quality=document.createElement('select');quality.setAttribute('aria-label','Precisione riconoscimento');quality.innerHTML='<option value="base">Accurata · consigliata per il parlato</option><option value="tiny">Leggera · meno precisa</option><option value="small">Molto accurata · più lenta, download grande</option>';lang.setAttribute('aria-label','Lingua del parlato');const cancel=document.createElement('button');cancel.textContent='Annulla analisi';cancel.hidden=true;actions.prepend(cancel);panel.append(title,info,lang,extraction,quality,styleRow,groupRow,state,output,actions);addCaptionPreview(fontSelect,colorSelect,styleRow);let busy=false,controller=null,job=0,allowRepetitions=false,allowEstimated=false,asrCreated=null;const acceptTiming=document.createElement('button');acceptTiming.textContent='Usa tempi stimati (da verificare)';acceptTiming.hidden=true;actions.append(acceptTiming);acceptTiming.onclick=()=>{allowEstimated=true;acceptTiming.hidden=true;run.onclick()};for(const setting of [lang,quality,extraction])setting.addEventListener('change',()=>{allowEstimated=false;allowRepetitions=false;acceptTiming.hidden=true;acceptRepeated.hidden=true});const acceptRepeated=document.createElement('button');acceptRepeated.textContent='Ho verificato: usa comunque il testo';acceptRepeated.hidden=true;actions.append(acceptRepeated);acceptRepeated.onclick=()=>{allowRepetitions=true;acceptRepeated.hidden=true;run.onclick()};const fix=document.createElement('button');fix.textContent='✎ Correggi parole · elimina doppioni';fix.hidden=true;actions.append(fix);fix.onclick=()=>{job++;controller?.abort();wrap.remove();window.koreOpenTranscriptEditor?.()};const improve=document.createElement('button');improve.textContent='✦ Migliora con precisione massima (più lenta)';improve.hidden=true;actions.append(improve);improve.onclick=()=>{quality.value='small';improve.hidden=true;run.disabled=false;allowEstimated=false;allowRepetitions=false;run.onclick()};cancel.onclick=()=>{job++;controller?.abort();state.textContent='Analisi annullata. Nessun sottotitolo aggiunto.'};close.onclick=()=>{job++;controller?.abort();wrap.remove()};run.onclick=async()=>{if(busy)return;improve.hidden=true;const sourceClip={...clip},token=++job;controller=new AbortController();cancel.hidden=false;quality.disabled=true;busy=true;run.disabled=true;lang.disabled=true;fontSelect.disabled=true;colorSelect.disabled=true;groupWords.disabled=true;try{state.textContent='Decodifica audio…';const {samples,seconds,offset}=await (extraction.value==='compatible'?captureCompatibleAudio(m.blob,Number(sourceClip.in||0),Math.min(300,Math.max(.1,Number(sourceClip.out||300)-Number(sourceClip.in||0))),{signal:controller.signal,onProgress:text=>state.textContent=text}):koreExtractAudio(m.blob,Number(sourceClip.in||0),Math.min(300,Math.max(.1,Number(sourceClip.out||300)-Number(sourceClip.in||0))),{signal:controller.signal,onProgress:text=>state.textContent=text}));if(token!==job)throw new DOMException('Analisi annullata','AbortError');const silenceRanges=detectSilences(samples).map(s=>({start:s.start+offset,end:s.end+offset}));const result=await transcribeInWorker(prepareSpeech(samples),{language:lang.value,model:quality.value,wordTimestamps:true,progress:s=>state.textContent=s,onPartial:r=>{if(token===job)output.textContent=(r.chunks||[]).map(c=>c.text).join(' ')},signal:controller.signal});if(token!==job)throw new DOMException('Analisi annullata','AbortError');const timing=normalizeAsrTiming(result,seconds);const cues=result.phraseTiming?timing.cues:snapWordsToSpeech(timing.cues,findPauses(samples));output.textContent=cues.map(c=>c.text).join(' ');if(!allowRepetitions&&suspiciousRepetition(output.textContent)){acceptRepeated.hidden=false;throw Error('Rilevate molte ripetizioni: nessun sottotitolo inserito. Controlla il testo, riprova con Più precisa oppure conferma solo se il parlato è davvero ripetuto.')}if(!cues.length)throw new Error('Nessuna parola riconosciuta.');if(timing.estimated&&!allowEstimated){acceptTiming.hidden=false;throw Object.assign(Error('Testo riconosciuto, ma alcuni tempi sono incompleti. Il testo è visibile qui sotto. Riprova con Accurata oppure usa i tempi stimati e correggili nella timeline.'),{name:'TimingReview'});}const begin=offset,finish=Math.min(Number(sourceClip.out||offset+seconds),offset+seconds),speed=sourceClip.speed||1,track=project.tracks[1]?.id||project.tracks[0].id;const rawCues=cues.map(c=>({...c,start:Math.max(begin,c.start+offset),end:Math.min(finish,c.end+offset)})).filter(c=>c.end>c.start&&c.start<finish).sort((a,b)=>a.start-b.start);const valid=(result.phraseTiming?rawCues:groupWords.checked?koreGroupAsrCues(rawCues):rawCues).slice(0,450);if(!valid.length)throw new Error('Nessuna parola nella parte selezionata.');if(exporting||!koreAsrClipUnchanged(sourceClip,project.clips.find(c=>c.id===sourceClip.id)))throw new Error('La clip è cambiata o non è disponibile: ripeti la trascrizione sulla clip aggiornata.');mutate(()=>{if(asrCreated)project.clips=project.clips.filter(q=>q.id!==asrCreated);const c={id:uid(),kind:'title',media:null,track,start:sourceClip.start,in:begin,out:finish,speed,opacity:1,zoom:1,rotation:0,x:0,y:.34,text:valid.map(c=>c.text).join(' '),transcriptCues:valid,transcriptSilences:silenceRanges,transcriptPhraseTiming:!!result.phraseTiming,transcriptSource:sourceClip.id,fontSize:39,fontFamily:fontSelect.value,fontColor:result.phraseTiming?colorSelect.value:'#ffffff',fontStroke:'#000000',graphicAccent:colorSelect.value,titleShadow:'soft',karaoke:true,subtitle:true,effect:'original',fadeIn:0,fadeOut:0};project.clips.push(c);selected=c.id;asrCreated=c.id});state.textContent=timing.estimated?'✓ Trascrizione unica creata con alcuni tempi stimati: verifica la sincronizzazione.':'✓ Trascrizione unica creata con tempi del parlato. Selezionala nella timeline e usa Dividi per tagliarla.';status('Trascrizione unica sincronizzata: '+valid.length+' frasi.');run.textContent='Completato';run.hidden=true;close.textContent='✓ Fatto';close.classList.add('primary');fix.hidden=false;improve.hidden=quality.value==='small'||!!window.koreAsrSafe}catch(e){state.textContent=e.name==='AbortError'?'Analisi annullata. Nessun sottotitolo aggiunto.':(e.name==='TimingReview'?'Da verificare: ':'Errore: ')+e.message;run.disabled=false;run.textContent='Riprova'}finally{cancel.hidden=true;quality.disabled=false;busy=false;lang.disabled=false;fontSelect.disabled=false;colorSelect.disabled=false;groupWords.disabled=false}}}
function openSpeechKaraoke(){if(document.getElementById('koreSpeechDialog'))return;const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;const wrap=document.createElement('div');wrap.id='koreSpeechDialog';wrap.className='kore-caption-dialog';const panel=document.createElement('div');panel.className='kore-caption-panel';wrap.append(panel);document.body.append(wrap);const heading=document.createElement('h3');heading.textContent='🎤 Voce → Karaoke';heading.style.margin='0 0 8px';const info=document.createElement('p');info.textContent='Riconoscimento dal microfono del dispositivo. Parla o canta: KORE trasforma le frasi riconosciute in clip karaoke. Non trascrive direttamente la traccia audio di un video importato. I tempi delle singole parole sono stimati.';info.style.fontSize='12px';info.style.color='#d6b9cf';const lang=document.createElement('select');for(const [code,label] of [['it-IT','Italiano'],['en-US','English'],['es-ES','Español'],['fr-FR','Français'],['de-DE','Deutsch']]){const op=document.createElement('option');op.value=code;op.textContent=label;lang.append(op)}const state=document.createElement('div');state.className='kore-speech-status';state.textContent=Speech?'Microfono non attivo. Premi Avvia.':'Riconoscimento vocale non disponibile in questo browser.';const transcript=document.createElement('div');transcript.className='kore-speech-live';transcript.textContent='Il testo riconosciuto apparirà qui…';const actions=document.createElement('div');actions.className='kore-speech-actions';const start=document.createElement('button');start.className='primary';start.textContent='● Avvia microfono';const stop=document.createElement('button');stop.textContent='■ Ferma';const create=document.createElement('button');create.textContent='✦ Crea karaoke';const close=document.createElement('button');close.textContent='Chiudi';actions.append(start,stop,create,close);panel.append(heading,info,lang,state,transcript,actions);let recognition=null,running=false,segments=[],interim='',recordStart=0;const cleanup=()=>{running=false;if(recognition){try{recognition.stop()}catch(e){}recognition=null}};close.onclick=()=>{cleanup();wrap.remove()};wrap.onclick=e=>{if(e.target===wrap){cleanup();wrap.remove()}};start.disabled=!Speech;stop.disabled=!Speech;
start.onclick=()=>{if(running)return;try{recognition=new Speech();recognition.lang=lang.value;recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;recordStart=performance.now();running=true;state.textContent='● In ascolto… Consenti il microfono quando richiesto.';recognition.onresult=e=>{interim='';for(let i=e.resultIndex;i<e.results.length;i++){const result=e.results[i],phrase=result[0]?.transcript?.trim();if(!phrase)continue;if(result.isFinal){const at=Math.max(0,(performance.now()-recordStart)/1000);segments.push({text:phrase,at});}else interim=phrase}transcript.textContent=segments.map(s=>s.text).join(' ')+' '+interim};recognition.onerror=e=>{state.textContent='Microfono: '+e.error+' — controlla permessi e connessione.'};recognition.onend=()=>{running=false;state.textContent='Riconoscimento fermato. Puoi creare il karaoke.'};recognition.start()}catch(e){running=false;state.textContent='Impossibile avviare: '+e.message}};
stop.onclick=()=>{cleanup();state.textContent='Registrazione fermata.'};
create.onclick=()=>{cleanup();if(!segments.length)return status('Nessuna frase riconosciuta. Premi Avvia e parla nel microfono.');const base=time,track=project.tracks[1]?.id||project.tracks[0].id;mutate(()=>{segments.forEach((s,i)=>{const next=segments[i+1],len=next?Math.max(.5,Math.min(6,next.at-s.at)):Math.max(1.4,Math.min(5,s.text.split(/\s+/).length*.38));const c={id:uid(),kind:'title',media:null,track,start:base+s.at,in:0,out:len,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:.34,text:s.text.slice(0,120),fontSize:35,fontFamily:'outfit',fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:'#ff2d92',titleShadow:'soft',karaoke:true,effect:'original',fadeIn:.08,fadeOut:.08};project.clips.push(c);selected=c.id})});wrap.remove();seek(base);status(segments.length+' frasi karaoke create. Allinea le clip alla voce del video se necessario.')} }
const CAPTION_STYLES={
 fuchsia:{name:'Pop Fucsia',fontFamily:'montserrat',fontSize:36,fontColor:'#ffffff',fontStroke:'#09070d',graphicAccent:'#ff2d92',titleShadow:'soft',karaoke:true,titleAnimation:'none'},
 clean:{name:'Clean White',fontFamily:'outfit',fontSize:34,fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:'#ffffff',titleShadow:'soft',karaoke:false,titleAnimation:'none'},
 impact:{name:'Impact Lime',fontFamily:'anton',fontSize:40,fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:'#c4ff5d',titleShadow:'soft',karaoke:true,titleAnimation:'none'},
 cyan:{name:'Electric Cyan',fontFamily:'space',fontSize:35,fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:'#6cecff',titleShadow:'cyan',karaoke:true,titleAnimation:'none'},
 editorial:{name:'Soft Editorial',fontFamily:'playfair',fontSize:36,fontColor:'#ffe4ed',fontStroke:'#25121d',graphicAccent:'#ff8fc4',titleShadow:'soft',karaoke:false,titleAnimation:'fade'},
 gold:{name:'Golden Words',fontFamily:'oswald',fontSize:38,fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:'#ffe14e',titleShadow:'soft',karaoke:true,titleAnimation:'none'}
};
function captionStyleTargets(all){
 const picked=selectedClip(),isText=c=>c.kind==='title'&&!c.graphicTemplate;
 if(!all){const c=picked&&isText(picked)?picked:activeClips(time).find(c=>isText(c)&&(c.subtitle||c.karaoke))||project.clips.find(c=>isText(c)&&(c.subtitle||c.karaoke));return c?[c]:[]}
 return project.clips.filter(c=>isText(c)&&(c.subtitle||c.karaoke||c===picked));
}
function applyCaptionStyle(id,all){
 if(exporting||!CAPTION_STYLES[id])return 0;const targets=captionStyleTargets(all);if(!targets.length){editorInfo('Crea o importa i sottotitoli prima di scegliere uno stile.');return 0}
 const {name,...values}=CAPTION_STYLES[id];mutate(()=>{for(const c of targets)Object.assign(c,values);selected=targets[0].id});
 seek(targets[0].start+Math.min(.3,duration(targets[0])/2));status(name+' applicato a '+targets.length+' frasi. Testo e tempi conservati.');return targets.length;
}
function openCaptionStyles(){
 if(exporting||document.getElementById('captionStylesDialog'))return;
 const dialog=document.createElement('div');dialog.id='captionStylesDialog';dialog.className='kore-caption-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Stili sottotitoli');
 const panel=document.createElement('section');panel.className='kore-caption-panel';
 panel.innerHTML='<h3>Stili sottotitoli</h3><p>Scegli un look per le frasi già nella timeline. Testo e tempi restano invariati; i colori karaoke evidenziano le parole.</p><label for="captionStylePreset">Stile</label><select id="captionStylePreset"></select><div id="captionStyleSample" class="caption-style-sample" aria-label="Esempio tipografico"></div><label class="caption-style-scope"><input id="captionStyleAll" type="checkbox"> Applica a tutti i sottotitoli</label><p id="captionStyleCount" role="status"></p><div class="actions"><button id="captionStyleCancel" type="button">Chiudi</button><button id="captionStyleApply" type="button" class="primary">Applica stile</button></div>';
 const q=id=>panel.querySelector('#'+id);for(const [value,preset] of Object.entries(CAPTION_STYLES)){const opt=document.createElement('option');opt.value=value;opt.textContent=preset.name+(preset.karaoke?' · Karaoke':' · Testo');q('captionStylePreset').append(opt)}
 const update=()=>{const preset=CAPTION_STYLES[q('captionStylePreset').value],sample=q('captionStyleSample');sample.replaceChildren();const first=document.createElement('span');first.textContent='Questo ';first.style.color=preset.karaoke?preset.graphicAccent:preset.fontColor;sample.append(first,document.createTextNode('è il tuo stile'));sample.style.color=preset.fontColor;sample.style.fontFamily=({montserrat:'Montserrat',outfit:'Outfit',anton:'Anton',space:'Space Grotesk',playfair:'Playfair Display',oswald:'Oswald'})[preset.fontFamily]+', sans-serif';const n=captionStyleTargets(q('captionStyleAll').checked).length;q('captionStyleCount').textContent=n?n+(n===1?' frase pronta':' frasi pronte'):'Crea o importa prima i sottotitoli.';q('captionStyleApply').disabled=!n};
 const key=e=>{if(e.key==='Escape')close()};const close=()=>{dialog.remove();document.removeEventListener('keydown',key)};
 q('captionStylePreset').onchange=update;q('captionStyleAll').onchange=update;q('captionStyleCancel').onclick=close;
 q('captionStyleApply').onclick=()=>{if(applyCaptionStyle(q('captionStylePreset').value,q('captionStyleAll').checked))close()};
 dialog.onclick=e=>{if(e.target===dialog)close()};dialog.append(panel);document.body.append(dialog);document.addEventListener('keydown',key);update();q('captionStylePreset').focus();
}

function openMobileCaptionsMenu(){
 if(exporting||document.getElementById('mobileCaptionMenu'))return;
 const dialog=document.createElement('div');dialog.id='mobileCaptionMenu';dialog.className='kore-caption-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Testo e sottotitoli');
 const panel=document.createElement('section');panel.className='kore-caption-panel';const title=document.createElement('h3');title.textContent='Testo e sottotitoli';const note=document.createElement('p');note.textContent='Scegli come creare il testo. Nessun microfono viene attivato.';panel.append(title,note);
 const key=e=>{if(e.key==='Escape')close()};const close=()=>{dialog.remove();document.removeEventListener('keydown',key);$('mobileSubtitles').focus()};
 for(const [label,action] of [['Incolla testo / Karaoke',openCaptionsDialog],['Stili dei sottotitoli',openCaptionStyles],['Trascrivi audio del video',openVideoTranscriber],['Correggi parole · elimina doppioni',()=>window.koreOpenTranscriptEditor?.()],['Importa sottotitoli SRT / VTT',()=>$('subtitleFile').click()],['Chiudi',null]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.className='caption-choice';button.onclick=()=>{close();action?.()};panel.append(button)}
 dialog.append(panel);dialog.onclick=e=>{if(e.target===dialog)close()};document.addEventListener('keydown',key);document.body.append(dialog);panel.querySelector('button').focus();
}
function openCaptionsDialog(){
 if(exporting||document.getElementById('koreCaptionsDialog'))return;
 playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback();
 const wrap=document.createElement('div');wrap.id='koreCaptionsDialog';wrap.className='kore-caption-dialog';
 const panel=document.createElement('div');panel.className='kore-caption-panel';
 panel.innerHTML='<h3>Testo e karaoke</h3><p>Incolla il testo che vuoi usare, una frase per riga (massimo 120 caratteri per riga). I tempi sono stimati: regola ogni frase nella timeline per allinearla alla canzone. Per analizzare un video usa Video → Testo AI; qui non si attiva il microfono.</p><textarea id="koreCaptionText" aria-label="Testo della canzone o sottotitoli" placeholder="Incolla qui il testo…"></textarea><label><input id="koreCaptionKaraoke" type="checkbox" checked> Evidenzia progressivamente le parole (karaoke)</label><p><label>Inizia al secondo <input id="koreCaptionStart" type="number" min="0" step="0.1" value="0"></label><label>Secondi per frase <input id="koreCaptionDuration" type="number" min=".5" max="12" step=".25" value="2"></label></p><p id="koreCaptionError" class="caption-error" role="alert"></p><div class="actions"><button id="koreCaptionCancel">Annulla</button><button id="koreCaptionCreate" class="primary">Crea testo nella timeline</button></div>';
 wrap.append(panel);document.body.append(wrap);const q=id=>panel.querySelector('#'+id);q('koreCaptionStart').value=time.toFixed(1);
 const close=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)close()};q('koreCaptionCancel').onclick=close;
 q('koreCaptionCreate').onclick=()=>{
  const lines=q('koreCaptionText').value.split(/\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length){q('koreCaptionError').textContent='Incolla almeno una frase.';q('koreCaptionText').focus();return}
  if(lines.length>100||lines.some(x=>x.length>120)){q('koreCaptionError').textContent='Usa massimo 100 righe, con non più di 120 caratteri ciascuna. Dividi le frasi lunghe su più righe.';return}
  const len=Math.max(.5,Math.min(12,Number(q('koreCaptionDuration').value)||2)),start=Number(q('koreCaptionStart').value),karaoke=q('koreCaptionKaraoke').checked;
  if(!Number.isFinite(start)||start<0){q('koreCaptionError').textContent='Inserisci un secondo iniziale valido (0 o maggiore).';return}
  const track=project.tracks[1]?.id||project.tracks[0].id;let first;
  mutate(()=>{lines.forEach((line,i)=>{const c={id:uid(),kind:'title',media:null,track,start:start+i*len,in:0,out:len,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:.33,text:line,fontSize:35,fontFamily:'outfit',fontColor:'#ffffff',fontStroke:'#000000',graphicAccent:'#ff2d92',karaoke,subtitle:true,titleAnimation:'none',titleShadow:'soft',effect:'original',fadeIn:.06,fadeOut:.06};project.clips.push(c);if(!first)first=c.id});selected=first});
  close();seek(start+Math.min(.25,len/2));status(lines.length+(karaoke?' frasi karaoke':' sottotitoli')+' creati. Tempi stimati: allinea le clip alla musica.');
 };q('koreCaptionText').focus();
}
const videoPlayers=new Map();let videoPlanSignature='',videoPlan=new Map();
function updateVideoPlan(){
 const clips=project.clips.filter(c=>isTimedMedia(media.get(c.media))).sort((a,b)=>a.start-b.start||String(a.id).localeCompare(String(b.id)));
 const signature=clips.map(c=>[c.id,c.media,media.get(c.media)?.url,c.start,c.in,c.out,c.speed].join(':')).join('|');if(signature===videoPlanSignature)return;videoPlanSignature=signature;videoPlan=new Map();const ends=new Map(),needed=new Set();
 for(const c of clips){const slots=ends.get(c.media)||[];let slot=slots.findIndex(end=>end<=c.start+.000001);if(slot<0)slot=slots.length;slots[slot]=c.start+duration(c);ends.set(c.media,slots);const key=c.media+':'+slot;videoPlan.set(c.id,{slot,key});if(slot)needed.add(key)}
 for(const [key,m] of videoPlayers)if(!needed.has(key)||media.get(m.id)?.url!==m.url){m.el.pause();m.el.removeAttribute('src');m.el.load();m.el.remove();videoPlayers.delete(key)}
}
function getClipMedia(c){
 const original=media.get(c?.media);if(!isTimedMedia(original))return original;updateVideoPlan();const assignment=videoPlan.get(c.id);if(!assignment?.slot)return original;let player=videoPlayers.get(assignment.key);if(player)return player;
 const el=document.createElement(original.kind);el.playsInline=true;el.preload='auto';el.muted=exporting;player={id:original.id,url:original.url,name:original.name,kind:original.kind,ready:true,el};videoPlayers.set(assignment.key,player);const redraw=()=>{if(videoPlayers.get(assignment.key)!==player)return;if(!playing&&!exporting)draw()};el.addEventListener('loadeddata',redraw);el.addEventListener('seeked',redraw);el.addEventListener('error',()=>{player.decodeError='Video non leggibile: '+original.name;player.playbackError=new Error(player.decodeError);renderMediaFeedback()});const pool=$('mediaSources');if(pool)pool.append(el);el.src=original.url;el.load();return player;
}
function allVideoMedia(){return [...media.values(),...videoPlayers.values()]}
function canvasFilter(c){const filters=[],base=effectFilters[c.effect||'original'];if(base&&base!=='none')filters.push(base);for(const [key,filter] of [['brightness','brightness'],['contrast','contrast'],['saturation','saturate']]){const value=clamp(c[key]??1,key==='brightness'?.2:0,key==='brightness'?2:3);if(value!==1)filters.push(filter+'('+value+')')}return filters.join(' ')||'none'}
let suggestedVideoLook=null;
function waitForVideoSample(video,event,prepare){
 return new Promise((resolve,reject)=>{
  const finish=error=>{clearTimeout(timer);video.removeEventListener(event,ready);video.removeEventListener('error',failed);error?reject(error):resolve()};
  const ready=()=>finish();
  const failed=()=>finish(new Error('Video non leggibile.'));
  const timer=setTimeout(()=>finish(new Error('Tempo di analisi scaduto.')),4500);
  video.addEventListener(event,ready,{once:true});video.addEventListener('error',failed,{once:true});
  try{prepare()}catch(error){finish(error)}
 });
}
async function inspectVideoClip(clip,item){
 const video=document.createElement('video');
 video.muted=true;video.playsInline=true;video.preload='auto';
 const sample=document.createElement('canvas');sample.width=40;sample.height=24;
 const context=sample.getContext('2d',{willReadFrequently:true});
 let level=0,delta=0,dark=0,bright=0,previous=null,samples=0;
 try{
  await waitForVideoSample(video,'loadeddata',()=>{video.src=item.url;video.load()});
  const start=clamp(clip.in,0,Math.max(0,video.duration-.04)),end=clamp(clip.out-.04,start,Math.max(start,video.duration-.04));
  for(const portion of [0,.2,.4,.6,.8,1]){
   const at=start+(end-start)*portion;
   if(Math.abs(video.currentTime-at)>.015)await waitForVideoSample(video,'seeked',()=>{video.currentTime=at});
   context.drawImage(video,0,0,sample.width,sample.height);
   const rgba=context.getImageData(0,0,sample.width,sample.height).data;
   const gray=new Float32Array(rgba.length/4);
   for(let i=0;i<gray.length;i++){
    const j=i*4,lum=(.2126*rgba[j]+.7152*rgba[j+1]+.0722*rgba[j+2])/255;
    gray[i]=lum;level+=lum;dark+=Number(lum<.18);bright+=Number(lum>.88);
    if(previous)delta+=Math.abs(lum-previous[i]);
   }
   previous=gray;samples++;
  }
 }finally{video.removeAttribute('src');video.load()}
 const pixels=sample.width*sample.height;
 return {light:level/(pixels*samples),dark:dark/(pixels*samples),bright:bright/(pixels*samples),change:delta/(pixels*(samples-1))};
}
$('analyzeVideo').onclick=async()=>{
 const button=$('analyzeVideo'),output=$('videoAdviceStatus'),apply=$('applyVideoAdvice');
 $('videoAdvice').classList.remove('hidden');
 apply.classList.add('hidden');suggestedVideoLook=null;
 const clip=selectedClip(),item=media.get(clip?.media);
 if(!clip||item?.kind!=='video'||!item.ready){output.textContent='Seleziona una clip video nella timeline.';return}
 const id=clip.id,signature=[clip.media,clip.in,clip.out].join(':');
 button.disabled=true;output.textContent='Analisi di luce e movimento in corso…';
 try{
  const data=await inspectVideoClip(clip,item);
  const lighting=data.light<.31?'Luce bassa':data.light>.68?'Luce forte':'Luce equilibrata';
  const motion=data.change>.16?'variazioni rapide tra i fotogrammi':data.change>.075?'movimento moderato':'pochi cambiamenti tra i fotogrammi';
  const value=data.change>.16?'fxKoreTrail':data.change>.075?'fxKoreLens':'motionKoreReveal';
  const brightness=data.light<.31?1.24:data.light>.68?.91:1;
  const contrast=data.dark>.4||data.bright>.22?.91:1.05;
  suggestedVideoLook={id,signature,value,brightness,contrast};
  output.textContent=lighting+' · '+motion+'. Suggerimento: '+assetOptionLabel('effect',value)+' con correzione di luce.';
  apply.classList.remove('hidden');
 }catch(error){output.textContent='Analisi non riuscita: '+error.message}
 finally{button.disabled=false}
};
$('applyVideoAdvice').onclick=()=>{
 const choice=suggestedVideoLook,clip=selectedClip();
 if(!choice||exporting)return;
 if(clip?.id!==choice.id||[clip.media,clip.in,clip.out].join(':')!==choice.signature){
  $('videoAdviceStatus').textContent='La clip è cambiata. Analizzala di nuovo.';
  $('applyVideoAdvice').classList.add('hidden');return;
 }
 mutate(()=>{clip.effect=choice.value;clip.brightness=choice.brightness;clip.contrast=choice.contrast});
 if(time<clip.start||time>=clip.start+duration(clip))seek(clip.start);
 $('videoAdviceStatus').textContent=assetOptionLabel('effect',choice.value)+' applicato. Puoi annullare dalla timeline.';
 $('applyVideoAdvice').classList.add('hidden');
};
let highlightExportActive=false;
let compareOriginal=false,stackSelection=null,analysisRunning=false;
let faceModel,segmentModel,visionRuntime,maskFailure=null;
const maskFrames=new WeakMap();
const alphaCanvas=document.createElement('canvas');
const maskCanvas=document.createElement('canvas');
const fxCanvas=document.createElement('canvas');
function stackLayers(clip){return clip?.effectLayers||[]}
function fxEntry(clip){return stackLayers(clip).find(layer=>layer.id===stackSelection)}
function timelineToSource(clip,seconds){return clip.in+seconds*clip.speed}
function intensityAt(layer,source){
 const keys=layer.keys||[];
 if(!keys.length)return layer.amount;
 const next=keys.findIndex(key=>key.at>=source);
 if(next===0)return keys[0].amount;
 if(next===-1)return keys.at(-1).amount;
 const a=keys[next-1],b=keys[next];
 return a.amount+(b.amount-a.amount)*(source-a.at)/(b.at-a.at);
}
function visibleLayers(clip,t){
 if(compareOriginal&&!exporting)return [];
 const source=sourceTime(clip,t);
 return stackLayers(clip).filter(layer=>layer.enabled&&source>=layer.from&&source<layer.to)
  .map(layer=>({value:layer.value,amount:clamp(intensityAt(layer,source),0,1),start:clip.start+(layer.from-clip.in)/clip.speed}));
}
function weightedFilter(filter,amount){
 if(amount===1)return filter;
 return filter.replace(/([a-z-]+)\((-?[\d.]+)([a-z%]*)\)/gi,(_,name,n,unit)=>{
  const identity=['brightness','contrast','saturate','opacity'].includes(name)?1:0;
  return name+'('+(identity+(Number(n)-identity)*amount).toFixed(3)+unit+')';
 });
}
function syncAdvancedControls(){
 const clip=selectedClip(),item=media.get(clip?.media),stack=stackLayers(clip);
 const list=$('stackEffectItem');
 if(!list)return;
 if(!stack.some(layer=>layer.id===stackSelection))stackSelection=stack[0]?.id||null;
 list.replaceChildren(...stack.map(layer=>new Option(assetOptionLabel('effect',layer.value),layer.id)));
 list.value=stackSelection||'';
 list.disabled=!stack.length;
 $('addStackEffect').disabled=!item||!['video','image'].includes(item.kind);
 const layer=fxEntry(clip);
 $('stackEffectControls').classList.toggle('hidden',!layer);
 if(layer){
  $('stackEnabled').checked=layer.enabled;
  $('stackStart').value=Math.max(0,(layer.from-clip.in)/clip.speed).toFixed(2);
  $('stackEnd').value=Math.min(duration(clip),(layer.to-clip.in)/clip.speed).toFixed(2);
  $('stackStart').max=$('stackEnd').max=duration(clip).toFixed(2);
  $('stackStrength').value=Math.round(layer.amount*100);
  $('stackStrengthValue').textContent=$('stackStrength').value+'%';
  $('stackKeyList').textContent=(layer.keys||[]).map(key=>Math.max(0,(key.at-clip.in)/clip.speed).toFixed(2)+' s · '+Math.round(key.amount*100)+'%').join(' / ');
 }
 $('backgroundMode').value=clip?.background?.mode||'off';
 $('backgroundColor').value=clip?.background?.color||'#221829';
 $('backgroundEdge').value=clip?.background?.edge||0;
 $('backgroundMode').disabled=!item||item.kind!=='video'||analysisRunning;
 $('followTitle').disabled=!clip?.faceTrack?.length;
 $('toggleFaceBlur').disabled=!clip?.faceTrack?.length;
 $('toggleFaceBlur').textContent=clip?.faceBlur?'Togli sfocatura volto':'Sfoca volto';
 const choice=$('markerChoice'),previous=choice.value;
 const markers=currentMarkers();
 choice.replaceChildren(...markers.map(mark=>new Option((mark.kind==='scene'?'Scena':'Battito')+' · '+mark.time.toFixed(2)+' s',mark.id)));
 if(markers.some(mark=>mark.id===previous))choice.value=previous;
 $('markerReview').classList.toggle('hidden',!markers.length);
}
function addEffectLayer(clip,value,at=clip?.start){
 if(!clip||!['image','video'].includes(media.get(clip.media)?.kind)||!value||exporting)return editorInfo('Seleziona una clip foto o video.');
 const from=timelineToSource(clip,clamp(at-clip.start,0,Math.max(0,duration(clip)-.1)));
 const layer={id:uid(),value,from,to:clip.out,amount:1,enabled:true,keys:[]};
 stackSelection=layer.id;selected=clip.id;
 mutate(()=>{(clip.effectLayers??=[]).push(layer)});
 status(assetOptionLabel('effect',value)+' aggiunto alla traccia effetti.');
}
function renderAdvancedTimeline(width){
 const ruler=$('ruler').lastElementChild;
 for(const mark of currentMarkers()){
  if(mark.time>endTime())continue;
  const button=document.createElement('button');button.type='button';button.className='smart-marker '+mark.kind;
  button.textContent=mark.kind==='scene'?'S':'♫';button.style.left=mark.time*px+'px';
  button.setAttribute('aria-label',(mark.kind==='scene'?'Cambio scena':'Battito')+' a '+mark.time.toFixed(2)+' secondi');
  button.onclick=()=>{$('markerChoice').value=mark.id;seek(mark.time)};
  ruler.append(button);
 }
 const clip=selectedClip();
 if(!clip||!['image','video'].includes(media.get(clip.media)?.kind))return;
 const row=document.createElement('div');row.className='track fx-track';
 const label=document.createElement('div');label.className='tracklabel';label.textContent='✦ Effetti';
 const body=document.createElement('div');body.className='trackbody';body.style.width=width+'px';
 const layers=stackLayers(clip).filter(layer=>layer.to>clip.in&&layer.from<clip.out);
 body.style.height=Math.max(39,layers.length*29+6)+'px';
 for(const [i,layer] of layers.entries()){
  const start=Math.max(clip.in,layer.from),end=Math.min(clip.out,layer.to);
  const block=document.createElement('button');block.type='button';block.className='fx-segment'+(layer.enabled?'':' fx-disabled');
  block.textContent=assetOptionLabel('effect',layer.value);
  block.style.cssText='left:'+((clip.start+(start-clip.in)/clip.speed)*px)+'px;top:'+(i*29+3)+'px;width:'+Math.max(24,(end-start)/clip.speed*px-2)+'px';
  block.setAttribute('aria-pressed',String(layer.id===stackSelection));
  block.onclick=()=>{stackSelection=layer.id;openAssetTab('effects');syncAdvancedControls();renderTimeline()};
  body.append(block);
 }
 body.ondragover=event=>{if(!exporting&&Array.from(event.dataTransfer.types).includes('application/x-kore-asset')){event.preventDefault();event.stopPropagation()}};
 body.ondrop=event=>{
  const raw=event.dataTransfer.getData('application/x-kore-asset');
  if(!raw)return;
  event.preventDefault();event.stopPropagation();clearAssetDrop();
  let asset;try{asset=JSON.parse(raw)}catch{return}
  if(asset.kind==='effect')addEffectLayer(clip,asset.value,(event.clientX-body.getBoundingClientRect().left)/px);
 };
 row.append(label,body);$('tracks').append(row);
}
function setupEffectStack(){
 const types=$('stackEffectType');
 for(const option of $('effect').options)if(option.value!=='original')types.append(new Option(option.textContent,option.value));
 if(types.querySelector('[value="fxKoreLens"]'))types.value='fxKoreLens';
 $('addStackEffect').onclick=()=>addEffectLayer(selectedClip(),types.value);
 $('stackEffectItem').onchange=event=>{stackSelection=event.target.value;syncAdvancedControls();renderTimeline()};
 for(const id of ['stackEnabled','stackStart','stackEnd','stackStrength']){
  $(id).onchange=()=>{
   const clip=selectedClip(),layer=fxEntry(clip);
   if(!layer||exporting)return;
   const span=duration(clip),min=Math.min(.05,span);
   const from=clamp(Number($('stackStart').value)||0,0,span-min);
   const to=clamp(Number($('stackEnd').value)||span,from+min,span);
   mutate(()=>{
    if(id==='stackStart')layer.from=timelineToSource(clip,Math.min(from,to-min));
    if(id==='stackEnd')layer.to=timelineToSource(clip,to);
    if(id==='stackEnabled')layer.enabled=$('stackEnabled').checked;
    if(id==='stackStrength')layer.amount=Number($('stackStrength').value)/100;
   });
  };
 }
 $('stackStrength').oninput=()=>{$('stackStrengthValue').textContent=$('stackStrength').value+'%'};
 $('stackKeyframe').onclick=()=>{
  const clip=selectedClip(),layer=fxEntry(clip);
  if(!layer)return;
  const at=sourceTime(clip,time);
  if(at<Math.max(clip.in,layer.from)||at>Math.min(clip.out,layer.to))return editorInfo('Porta la testina dentro il livello effetto.');
  mutate(()=>{layer.keys=(layer.keys||[]).filter(key=>Math.abs(key.at-at)>.03);layer.keys.push({at,amount:layer.amount});layer.keys.sort((a,b)=>a.at-b.at)});
 };
 $('clearStackKeys').onclick=()=>{const layer=fxEntry(selectedClip());if(layer)mutate(()=>{layer.keys=[]})};
 $('removeStackEffect').onclick=()=>{const clip=selectedClip();if(fxEntry(clip))mutate(()=>{clip.effectLayers=stackLayers(clip).filter(layer=>layer.id!==stackSelection)})};
 $('compareEffects').onclick=()=>{
  compareOriginal=!compareOriginal;
  $('compareEffects').textContent=compareOriginal?'Mostra effetti':'Mostra originale';
  $('compareEffects').setAttribute('aria-pressed',String(compareOriginal));draw();
 };
}
async function withSampledVideo(clip,item,step,limit,read){
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
 try{
  await waitForVideoSample(video,'loadeddata',()=>{video.src=item.url;video.load()});
  const start=clip.in,end=Math.max(start,Math.min(clip.out,video.duration)-.04);
  const count=Math.min(limit,Math.max(2,Math.ceil((end-start)/step)+1));
  for(let i=0;i<count;i++){
   const at=start+(end-start)*i/(count-1);
   if(Math.abs(video.currentTime-at)>.015)await waitForVideoSample(video,'seeked',()=>{video.currentTime=at});
   await read(video,at);
   if(i%6===5){$('advancedVideoStatus').textContent='Analisi in corso · '+Math.round((i+1)/count*100)+'%';await new Promise(requestAnimationFrame)}
  }
 }finally{video.removeAttribute('src');video.load()}
}
function replaceClipMarkers(clip,kind,sourceTimes){
 mutate(()=>{
  project.markers=[...(project.markers||[]).filter(mark=>mark.clipId!==clip.id||mark.kind!==kind),
   ...sourceTimes.map(at=>({id:uid(),clipId:clip.id,kind,source:at,time:clip.start+(at-clip.in)/clip.speed}))].sort((a,b)=>a.time-b.time);
 });
}
function currentMarkers(){
 return (project.markers||[]).flatMap(mark=>{
  const clip=project.clips.find(c=>c.id===mark.clipId);
  return clip&&mark.source>=clip.in&&mark.source<clip.out?[{...mark,time:clip.start+(mark.source-clip.in)/clip.speed}]:[];
 }).sort((a,b)=>a.time-b.time);
}
async function analyzeSelected(kind,operation){
 if(analysisRunning||exporting)return;
 const clip=selectedClip(),item=media.get(clip?.media);
 const message=$('advancedVideoStatus');
 if(!clip||item?.kind!==kind||!item.ready){message.textContent='Seleziona una clip '+kind+' nella timeline.';return}
 analysisRunning=true;message.textContent='Analisi in corso…';
 const projectAtStart=project,signature=[clip.in,clip.out,clip.media].join(':');
 for(const id of ['detectScenes','detectBeats','autoReframe','backgroundMode'])$(id).disabled=true;
 try{
  const result=await operation(clip,item);
  if(projectAtStart!==project||!project.clips.includes(clip)||signature!==[clip.in,clip.out,clip.media].join(':')){
   message.textContent='La clip è cambiata. Avvia di nuovo l’analisi.';return;
  }
  message.textContent=result();
 }catch(error){message.textContent='Operazione non riuscita: '+error.message}
 finally{
  analysisRunning=false;
  for(const id of ['detectScenes','detectBeats','autoReframe'])$(id).disabled=false;
  syncAdvancedControls();
 }
}
async function detectScenesInClip(clip,item){
 const frame=document.createElement('canvas');frame.width=48;frame.height=27;
 const context=frame.getContext('2d',{willReadFrequently:true});
 let previous=null;const cuts=[];
 await withSampledVideo(clip,item,.16,420,(video,at)=>{
  context.drawImage(video,0,0,48,27);
  const data=context.getImageData(0,0,48,27).data;
  if(previous){
   let change=0;
   for(let i=0;i<data.length;i+=4)change+=Math.abs(data[i]-previous[i])+Math.abs(data[i+1]-previous[i+1])+Math.abs(data[i+2]-previous[i+2]);
   if(change/(48*27*3*255)>.24&&at-(cuts.at(-1)??clip.in)>.32)cuts.push(at);
  }
  previous=data;
 });
 return ()=>{replaceClipMarkers(clip,'scene',cuts);return cuts.length?cuts.length+' cambi scena suggeriti. Scegli un marcatore per tagliare.':'Nessun cambio scena netto rilevato.'};
}
async function detectBeatsInClip(clip,item){
 const AudioCtor=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtor)throw Error('Analisi audio non disponibile in questo browser.');
 const context=new AudioCtor();
 let buffer;
 try{buffer=await context.decodeAudioData(await item.blob.arrayBuffer())}
 finally{await context.close()}
 const channel=buffer.getChannelData(0),rate=buffer.sampleRate,hop=Math.max(1,Math.round(rate*.012));
 const start=Math.floor(clip.in*rate),end=Math.min(channel.length,Math.floor(clip.out*rate));
 const flux=[];let previous=0,low=0;
 for(let i=start;i+hop<=end;i+=hop){
  let energy=0;
  for(let j=i;j<i+hop;j+=4){low+=.07*(channel[j]-low);energy+=low*low}
  const rms=Math.sqrt(energy/Math.ceil(hop/4));
  flux.push(Math.max(0,rms-previous));previous=rms;
  if(flux.length%1500===0)await new Promise(requestAnimationFrame);
 }
 const beats=[];
 for(let i=3;i<flux.length-2;i++){
  const window=flux.slice(Math.max(0,i-21),i);
  const baseline=window.reduce((sum,value)=>sum+value,0)/window.length;
  const at=(start+i*hop)/rate;
  if(flux[i]>.012&&flux[i]>baseline*2.4&&flux[i]>=flux[i-1]&&flux[i]>=flux[i+1]&&at-(beats.at(-1)??clip.in)>.2)beats.push(at);
 }
 return ()=>{replaceClipMarkers(clip,'beat',beats);return beats.length?beats.length+' battiti suggeriti. Seleziona il video da tagliare sul ritmo.':'Nessun battito netto rilevato in questa clip.'};
}
const visionBase='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const modelBase='https://storage.googleapis.com/mediapipe-models/';
function loadVisionScript(url){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=url;
  script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Risorsa del modello non raggiungibile.'))};
  document.head.append(script);
 });
}
let cpuVision;
async function getCpuVision(kind){
 cpuVision??=loadVisionScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js')
  .then(async()=>{await window.tf.setBackend('cpu');await window.tf.ready()})
  .catch(error=>{cpuVision=null;throw error});
 await cpuVision;
 if(kind==='face'){
  await loadVisionScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.1.0/dist/blazeface.min.umd.js');
  const model=await window.blazeface.load({maxFaces:3});
  return {async boxes(frame){
   const predictions=await model.estimateFaces(frame,false);
   return predictions.map(face=>({originX:face.topLeft[0],originY:face.topLeft[1],width:face.bottomRight[0]-face.topLeft[0],height:face.bottomRight[1]-face.topLeft[1]}));
  }};
 }
 await loadVisionScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.1/dist/body-pix.min.umd.js');
 const model=await window['body-pix'].load({architecture:'MobileNetV1',outputStride:16,multiplier:.50,quantBytes:2});
 return {async mask(frame,edge){
  const result=await model.segmentPerson(frame,{internalResolution:'medium',segmentationThreshold:.45+edge/125});
  return {width:result.width,height:result.height,values:result.data,binary:true};
 }};
}
async function getVisionModel(kind){
 const gpu=!!document.createElement('canvas').getContext('webgl2');
 if(gpu){
  try{
   visionRuntime??=import(visionBase+'/vision_bundle.mjs').then(async module=>({module,files:await module.FilesetResolver.forVisionTasks(visionBase+'/wasm')}));
   const {module,files}=await visionRuntime;
   if(kind==='face'){
    const model=await module.FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:modelBase+'face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'},runningMode:'IMAGE',minDetectionConfidence:.5});
    return {boxes:frame=>model.detect(frame).detections.map(d=>d.boundingBox).filter(Boolean)};
   }
   const model=await module.ImageSegmenter.createFromOptions(files,{baseOptions:{modelAssetPath:modelBase+'image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite'},runningMode:'IMAGE',outputCategoryMask:false,outputConfidenceMasks:true});
   return {mask(frame){
    let output;
    model.segment(frame,result=>{const mask=result.confidenceMasks?.[1];if(mask)output={width:mask.width,height:mask.height,values:Float32Array.from(mask.getAsFloat32Array())}});
    return output;
   }};
  }catch(error){console.warn('Modello WebGL non disponibile',error)}
 }
 return getCpuVision(kind);
}
async function buildFaceTrack(clip,item){
 $('advancedVideoStatus').textContent='Caricamento del modello di rilevamento volto…';
 faceModel??=getVisionModel('face').catch(error=>{faceModel=null;throw error});
 const detector=await faceModel;
 const frame=document.createElement('canvas');frame.width=320;
 const context=frame.getContext('2d');
 const points=[];
 await withSampledVideo(clip,item,.28,300,async (video,at)=>{
  const height=Math.max(1,Math.round(320*video.videoHeight/video.videoWidth));
  if(frame.height!==height)frame.height=height;
  context.drawImage(video,0,0,frame.width,frame.height);
  const boxes=await detector.boxes(frame);
  const previous=points.at(-1);
  const score=box=>previous?Math.hypot((box.originX+box.width/2)/frame.width-previous.x,(box.originY+box.height/2)/frame.height-previous.y):-box.width*box.height;
  const box=boxes.sort((a,b)=>score(a)-score(b))[0];
  if(!box)return;
  const x=(box.originX+box.width/2)/frame.width,y=(box.originY+box.height/2)/frame.height;
  points.push({at,x:previous?previous.x*.3+x*.7:x,y:previous?previous.y*.3+y*.7:y,w:box.width/frame.width,h:box.height/frame.height});
 });
 return ()=>{
  if(!points.length)return 'Nessun volto rilevato. Prova una clip in cui il volto è visibile.';
  mutate(()=>{clip.faceTrack=points;clip.autoReframe=true;project.ratio='9:16';canvasSize()});
  return 'Inquadratura verticale applicata · '+points.length+' punti del volto. Puoi aggiungere titolo o sfocatura.';
 };
}
function faceAt(clip,t){
 const points=clip?.faceTrack;
 if(!points?.length)return null;
 const at=sourceTime(clip,t),index=points.findIndex(point=>point.at>=at);
 if(index<=0){const point=index===0?points[0]:points.at(-1);return Math.abs(point.at-at)<=.8?point:null}
 const a=points[index-1],b=points[index];
 if(b.at-a.at>1.5)return Math.abs(at-a.at)<.6?a:Math.abs(at-b.at)<.6?b:null;
 const mix=(at-a.at)/(b.at-a.at);
 return {x:a.x+(b.x-a.x)*mix,y:a.y+(b.y-a.y)*mix,w:a.w+(b.w-a.w)*mix,h:a.h+(b.h-a.h)*mix};
}
function followClipTitle(clip,t){
 const target=project.clips.find(item=>item.id===clip.followClip);
 const face=target&&t>=target.start&&t<target.start+duration(target)&&faceAt(target,t);
 if(!face)return clip;
 if(target.autoReframe)return {...clip,x:0,y:.24};
 return {...clip,x:clamp(face.x-.5,-.35,.35),y:clamp(face.y-.5+face.h*.9,-.35,.35)};
}
let readySegmenter=null;
async function prepareBackgroundModel(){
 if(!readySegmenter){
  segmentModel??=getVisionModel('segment').catch(error=>{segmentModel=null;throw error});
  readySegmenter=await segmentModel;
 }
 maskFailure=null;
 return readySegmenter;
}
const pendingMasks=new WeakSet();
function updatePersonMask(video,sw,sh,edge){
 const timestamp=video.currentTime;
 const current=maskFrames.get(video);
 if(current&&Math.abs(current.time-timestamp)<=.14&&current.edge===edge)return;
 if(pendingMasks.has(video))return;
 const input=document.createElement('canvas'),ratio=Math.min(1,384/Math.max(sw,sh));
 input.width=Math.max(1,Math.round(sw*ratio));input.height=Math.max(1,Math.round(sh*ratio));
 input.getContext('2d').drawImage(video,0,0,input.width,input.height);
 const store=result=>{
  if(!result)throw Error('Il modello non ha restituito una maschera.');
  const context=maskCanvas.getContext('2d');
  maskCanvas.width=result.width;maskCanvas.height=result.height;
  const pixels=context.createImageData(result.width,result.height);
  for(let i=0;i<result.values.length;i++){
   const value=result.values[i];
   pixels.data[i*4+3]=Math.round((result.binary?value:clamp((value-(.38+edge/125))/.25,0,1))*255);
  }
  context.putImageData(pixels,0,0);
  const copy=document.createElement('canvas');copy.width=result.width;copy.height=result.height;
  copy.getContext('2d').drawImage(maskCanvas,0,0);
  maskFrames.set(video,{time:timestamp,edge,canvas:copy});
 };
 const result=readySegmenter.mask(input,edge);
 if(result?.then){
  pendingMasks.add(video);
  return result.then(store).catch(error=>{maskFailure=error}).finally(()=>{pendingMasks.delete(video);if(!playing&&!exporting)draw()});
 }
 store(result);
}
function drawPersonCutout(clip,video,sw,sh){
 if(!readySegmenter||maskFailure)return null;
 updatePersonMask(video,sw,sh,clip.background.edge||0);
 const cached=maskFrames.get(video);
 if(!cached)return null;
 const scale=Math.min(1,1280/Math.max(sw,sh)),width=Math.round(sw*scale),height=Math.round(sh*scale);
 if(alphaCanvas.width!==width||alphaCanvas.height!==height){alphaCanvas.width=width;alphaCanvas.height=height}
 const alpha=alphaCanvas.getContext('2d');
 alpha.clearRect(0,0,width,height);alpha.drawImage(video,0,0,width,height);
 alpha.globalCompositeOperation='destination-in';alpha.drawImage(cached.canvas,0,0,width,height);
 alpha.globalCompositeOperation='source-over';
 return alphaCanvas;
}
function setupSmartTools(){
 $('detectScenes').onclick=()=>analyzeSelected('video',detectScenesInClip);
 $('detectBeats').onclick=()=>analyzeSelected('audio',detectBeatsInClip);
 $('autoReframe').onclick=()=>analyzeSelected('video',buildFaceTrack);
 $('followTitle').onclick=()=>{
  const clip=selectedClip();if(!clip?.faceTrack?.length||exporting)return;
  mutate(()=>{
   const title={id:uid(),kind:'title',track:project.tracks[1]?.id||project.tracks[0].id,start:clip.start,in:0,out:duration(clip),speed:1,opacity:1,zoom:1,rotation:0,x:0,y:.24,text:'Il mio titolo',fontSize:64,fontFamily:'bebas',fontColor:'#ffffff',fontStroke:'#000000',effect:'original',followClip:clip.id};
   project.clips.push(title);selected=title.id;
  });
  $('advancedVideoStatus').textContent='Titolo aggiunto. Modifica il testo nelle proprietà.';
 };
 $('toggleFaceBlur').onclick=()=>{const clip=selectedClip();if(clip?.faceTrack?.length)mutate(()=>{clip.faceBlur=!clip.faceBlur})};
 $('seekMarker').onclick=()=>{const mark=currentMarkers().find(item=>item.id===$('markerChoice').value);if(mark)seek(mark.time)};
 $('splitMarker').onclick=()=>{
  const mark=currentMarkers().find(item=>item.id===$('markerChoice').value),clip=selectedClip();
  if(!mark||!clip||mark.time<=clip.start+.05||mark.time>=clip.start+duration(clip)-.05)return editorInfo('Seleziona una clip che contiene il marcatore.');
  seek(mark.time);split();
 };
 $('clearMarkers').onclick=()=>mutate(()=>{project.markers=[]});
 $('backgroundMode').onchange=async event=>{
  const mode=event.target.value,clip=selectedClip();
  if(media.get(clip?.media)?.kind!=='video'||exporting)return;
  if(mode==='off'){mutate(()=>{delete clip.background});return}
  await analyzeSelected('video',async()=>{
   $('advancedVideoStatus').textContent='Caricamento del modello per separare persona e sfondo…';
   await prepareBackgroundModel();
   return ()=>{mutate(()=>{clip.background={mode,color:clip.background?.color||'#221829',edge:clip.background?.edge||0}});return 'Sfondo aggiornato. Il modello separa le persone dallo sfondo.'};
  });
 };
 $('backgroundColor').onchange=event=>{const clip=selectedClip();if(clip?.background)mutate(()=>{clip.background.color=event.target.value})};
 $('backgroundEdge').onchange=event=>{const clip=selectedClip();if(clip?.background)mutate(()=>{clip.background.edge=Number(event.target.value)})};
}
function addLayerMotion(motion,layers,clip,t){
 for(const layer of layers){
  if(!layer.value.startsWith('motion')||!layer.amount)continue;
  const extra=motionState({...clip,effect:layer.value,start:layer.start},t);
  motion.dx+=extra.dx*layer.amount;motion.dy+=extra.dy*layer.amount;
  motion.rot+=extra.rot*layer.amount;motion.scale*=1+(extra.scale-1)*layer.amount;
  motion.alpha*=1+(extra.alpha-1)*layer.amount;
 }
}
function drawFaceBlur(image,face,sw,sh,scale){
 const w=face.w*sw*scale*1.6,h=face.h*sh*scale*1.6;
 const x=(face.x-.5)*sw*scale,y=(face.y-.5)*sh*scale;
 ctx.save();ctx.beginPath();ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);ctx.clip();
 ctx.filter='blur('+Math.max(12,Math.round(w*.12))+'px)';
 ctx.drawImage(image,-sw*scale/2,-sh*scale/2,sw*scale,sh*scale);ctx.restore();
}
function drawClipFx(clip,value,amount,start,el,sw,sh,scale){
 if(!amount||!value?.startsWith('fx'))return;
 const w=sw*scale,h=sh*scale;
 ctx.save();ctx.globalAlpha*=amount;
 if(value==='fxPixel'){
  fxCanvas.width=Math.max(8,Math.round(sw/32));fxCanvas.height=Math.max(8,Math.round(sh/32));
  fxCanvas.getContext('2d').drawImage(el,0,0,fxCanvas.width,fxCanvas.height);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(fxCanvas,-w/2,-h/2,w,h);
 }
 if(value==='fxRGB'||value==='fxKoreTrail'){
  const trail=value==='fxKoreTrail',dx=Math.sin((time-start)*(trail?4:13))*canvas.width*(trail?.035:.012);
  ctx.globalAlpha*=trail?.34:.25;ctx.globalCompositeOperation='screen';
  ctx.filter='sepia(1) saturate(8) hue-rotate(285deg)';ctx.drawImage(el,-w/2+dx,-h/2,w,h);
  ctx.filter='sepia(1) saturate(8) hue-rotate(130deg)';ctx.drawImage(el,-w/2-dx,-h/2,w,h);
 }
 {
  const t=time-start,q=Math.floor(t*9),rnd=n=>{const k=Math.sin(n*127.1+q*311.7)*43758.5;return k-Math.floor(k)};
  const strip=(sy,sh2,dx)=>{const y0=sy*sh,h0=sh2*sh;ctx.drawImage(el,0,y0,sw,h0,-w/2+dx,-h/2+sy*h,w,sh2*h)};
  if(value==='fxGlitchPro'){
   for(let i=0;i<7;i++){const sy=rnd(i+1)*.9,sh2=.02+rnd(i+9)*.09;if(rnd(i+20)>.35)strip(sy,sh2,(rnd(i+30)-.5)*w*.18)}
   ctx.globalAlpha*=.5;ctx.globalCompositeOperation='screen';ctx.filter='sepia(1) saturate(8) hue-rotate(285deg)';ctx.drawImage(el,-w/2+w*.012,-h/2,w,h);ctx.filter='sepia(1) saturate(8) hue-rotate(130deg)';ctx.drawImage(el,-w/2-w*.012,-h/2,w,h);
  }
  if(value==='fxChroma'){const d=w*.018;ctx.globalAlpha*=.55;ctx.globalCompositeOperation='screen';ctx.filter='sepia(1) saturate(9) hue-rotate(320deg)';ctx.drawImage(el,-w/2+d,-h/2,w,h);ctx.filter='sepia(1) saturate(9) hue-rotate(170deg)';ctx.drawImage(el,-w/2-d,-h/2,w,h)}
  if(value==='fxShake'){const a=w*.012;ctx.drawImage(el,-w/2+(rnd(1)-.5)*a*2,-h/2+(rnd(2)-.5)*a*2,w,h)}
  if(value==='fxWave'){const n=28;for(let i=0;i<n;i++){const sy=i/n;strip(sy,1/n+.002,Math.sin(t*5+i*.45)*w*.025)}}
  if(value==='fxPulse'){const p=Math.pow(.5+.5*Math.sin(t*7),3),k=1+.07*p;ctx.globalAlpha*=.7;ctx.drawImage(el,-w*k/2,-h*k/2,w*k,h*k)}
  if(value==='fxFlash'){const f=Math.pow(Math.max(0,Math.sin(t*5.5)),14);ctx.globalAlpha=Math.min(1,f*.9*amount);ctx.fillStyle='#fff';ctx.fillRect(-w/2,-h/2,w,h)}
  if(value==='fxInvert'){if(Math.sin(t*9)>.82){ctx.filter='invert(1)';ctx.drawImage(el,-w/2,-h/2,w,h)}}
  if(value==='fxMosaic'){const px=Math.max(6,Math.round(sw/(10+Math.floor(18*rnd(3)))));fxCanvas.width=Math.max(6,Math.round(sw/px*3));fxCanvas.height=Math.max(6,Math.round(sh/px*3));fxCanvas.getContext('2d').drawImage(el,0,0,fxCanvas.width,fxCanvas.height);ctx.imageSmoothingEnabled=false;if(Math.sin(t*6)>.2)ctx.drawImage(fxCanvas,-w/2,-h/2,w,h)}
  if(value==='fxZoomBurst'){const k=1+.18*((t*1.6)%1);ctx.globalAlpha*=.55;ctx.drawImage(el,-w*k/2,-h*k/2,w*k,h*k)}
 }
 renderFXOverlay({...clip,effect:value,start},time,w,h);
 ctx.restore();
}

let renderingFormatPreview=false;
function canUseNativePreview(clips,at=time){if(renderingFormatPreview||exporting||!window.matchMedia('(max-width: 759px)').matches||clips.length!==1)return false;const c=clips[0],m=getClipMedia(c);return !c.background&&!c.autoReframe&&!c.faceBlur&&!visibleLayers(c,at).length&&!!m&&m.kind==='video'&&m.ready&&!m.decodeError&&(!c.fitMode||c.fitMode==='cover')&&canvasFilter(c)==='none'&&(c.effect||'original')==='original'&&!(c.keyframes?.length)&&(c.opacity??1)===1&&(c.zoom??1)===1&&!(c.rotation||c.x||c.y||c.mirror||c.fadeIn||c.fadeOut)&&(!c.transitionPreset||c.transitionPreset==='none')}
function renderNativePreview(clips,at=time){const host=$('nativePreview');if(!host)return false;if(!canUseNativePreview(clips,at)){if(!host.classList.contains('hidden')){host.classList.add('hidden');const pool=$('mediaSources');if(pool)while(host.firstElementChild)pool.append(host.firstElementChild);else host.replaceChildren()}canvas.style.visibility='';return false}const c=clips[0],m=getClipMedia(c),el=m.el;if(el.preload!=='auto')el.preload='auto';if(host.firstElementChild!==el){const pool=$('mediaSources');if(pool)while(host.firstElementChild)pool.append(host.firstElementChild);el.controls=false;el.classList.add('kore-native-video');host.replaceChildren(el)}if(host.classList.contains('hidden'))host.classList.remove('hidden');if(canvas.style.visibility!=='hidden')canvas.style.visibility='hidden';const target=clamp(sourceTime(c,at),c.in,c.out);if(!playing&&!el.seeking&&Math.abs((el.currentTime||0)-target)>.04)try{el.currentTime=target}catch(e){}return true}
function renderMediaFeedback(at=previewRenderTime()){const badge=$('mobilePreviewBadge'),progress=$('mobileImportProgress');if(!badge||!progress)return;const active=activeClips(at),c=active.find(c=>c.kind!=='title')||selectedClip(),m=c&&getClipMedia(c);if(!m){badge.textContent=project.clips.length?'Anteprima progetto':'Nessun media importato';badge.dataset.state='empty';if(!importingMedia)progress.classList.add('hidden');return}if(m.decodeError){badge.textContent='Video non leggibile · '+m.name;badge.dataset.state='error';if(!importingMedia){progress.textContent=m.decodeError;progress.classList.remove('hidden')}return}const ready=m.ready&&(m.kind!=='video'||(m.el.readyState>=2&&!m.el.seeking)),saveState=media.get(c.media)?.saveState,save=saveState==='queued'?' · da salvare':saveState==='saving'?' · salvataggio…':saveState==='saved'?' · salvato':saveState==='session'?' · solo sessione':'';const text=(ready?(m.kind==='audio'?'Audio pronto':m.kind==='video'?'Video pronto':'Foto pronta'):'Video importato')+' · '+m.name+(m.kind==='video'?' · '+(Number(c.speed)||1)+'×':'')+save;if(badge.textContent!==text)badge.textContent=text;badge.title=text;badge.dataset.state=ready?'ready':'preparing';if(!importingMedia){if(ready)progress.classList.add('hidden');else{progress.textContent='Video importato: '+m.name+'\nPreparazione del primo fotogramma…';progress.classList.remove('hidden')}}}
function drawBlurBackground(c,el,sw,sh){
 if(c.fitMode!=='blur')return;
 const w=canvas.width,h=canvas.height,scale=Math.max(w/sw,h/sh)*1.15;
 ctx.save();ctx.filter='blur('+Math.max(8,Math.round(Math.min(w,h)*.035))+'px) brightness(.65)';
 ctx.drawImage(el,(w-sw*scale)/2,(h-sh*scale)/2,sw*scale,sh*scale);ctx.restore();
}
function previewRenderTime(){const end=endTime();return !exporting&&end>0?Math.min(time,Math.max(0,end-.001)):time}
function draw(){const time=previewRenderTime();const active=uniqueVisibleCaptions(activeClips(time).filter(c=>media.get(c.media)?.kind!=='audio'),selected);if(renderNativePreview(active,time)){renderMediaFeedback();return}if(!exporting&&document.body.dataset.look==='light')ctx.clearRect(0,0,canvas.width,canvas.height);
else{ctx.fillStyle='#050407';ctx.fillRect(0,0,canvas.width,canvas.height)}
renderMediaFeedback();for(const baseClip of active){const timed=transcriptAt(baseClip,time);if(!timed)continue;const raw=animated(timed,time);const original=compareOriginal&&!exporting;const c=followClipTitle(original?{...raw,effect:'original',brightness:1,contrast:1,saturation:1,background:null,faceBlur:false,autoReframe:false}:raw,time);const layers=visibleLayers(c,time);const motion=motionState(c,time);addLayerMotion(motion,layers,c,time);const m=getClipMedia(c);if(c.kind==='title'){ctx.save();ctx.globalAlpha=clipAlpha(c,time)*motion.alpha*overlapAlpha(c,time);applySpatialTransition(c,time);ctx.translate(canvas.width*(.5+c.x)+motion.dx,canvas.height*(.5+c.y)+motion.dy);ctx.rotate(c.rotation*Math.PI/180+motion.rot);ctx.scale(motion.scale,motion.scale);if(c.transitionPreset==='flash'&&time-c.start<.22){ctx.globalAlpha*=Math.min(1,(time-c.start)/.22);}ctx.scale(c.zoom*(c.mirror?-1:1),c.zoom);const ta=titleAnimationState(c,time);ctx.globalAlpha*=ta.alpha;ctx.translate(0,ta.dy);ctx.rotate(ta.rotation);ctx.scale(ta.scale,ta.scale);renderGraphicTemplate(c,time);ctx.textAlign='center';ctx.textBaseline='middle';const fonts={outfit:"'Outfit',system-ui,sans-serif",bebas:"'Bebas Neue',Impact,sans-serif",anton:"'Anton',Impact,sans-serif",space:"'Space Grotesk',system-ui,sans-serif",oswald:"'Oswald',Impact,sans-serif",montserrat:"'Montserrat',system-ui,sans-serif",righteous:"'Righteous',system-ui,sans-serif",playfair:"'Playfair Display',Georgia,serif",mono:"'Space Mono',monospace"};ctx.font=(c.fontItalic?'italic ':'')+(c.fontBold===false?'400 ':'800 ')+Math.round((c.fontSize||56)*canvas.width/540)+'px '+(fonts[c.fontFamily||'bebas']||fonts.bebas);ctx.lineWidth=Math.max(3,canvas.width/120);ctx.strokeStyle=c.fontStroke||'#000000';ctx.fillStyle=c.fontColor||'#ffffff';const displayText=ta.chars===null?String(c.text||'Titolo'):String(c.text||'Titolo').slice(0,ta.chars);const lines=displayText.split('\n').slice(0,4);const lh=(c.fontSize||56)*canvas.width/540*1.32;if(c.karaoke){renderKaraokeText(c,time)}else lines.forEach((line,i)=>{let y=(i-(lines.length-1)/2)*lh;if(c.graphicTemplate==='lower')y+=canvas.height*.295;if(c.graphicTemplate==='lower')ctx.fillStyle='#ffffff';if(c.graphicTemplate==='neon'){ctx.shadowColor=c.graphicAccent||'#ff2d92';ctx.shadowBlur=canvas.width*.04}const sh=c.titleShadow||'none';if(sh!=='none'){ctx.shadowColor=sh==='cyan'?'#32dafa':sh==='gold'?'#ffd66e':sh==='neon'?'#ff2d92':'#000000';ctx.shadowBlur=(c.fontSize||36)*canvas.width/540*(sh==='soft'?.12:.16);ctx.shadowOffsetY=sh==='soft'?canvas.height*.006:0}const glow=ctx.shadowBlur;ctx.shadowBlur=0;ctx.strokeText(line,0,y,canvas.width*.88);ctx.shadowBlur=glow;ctx.fillText(line,0,y,canvas.width*.88);ctx.shadowBlur=0;ctx.shadowOffsetY=0});renderFXOverlay(c,time,canvas.width*.85,canvas.height*.75);ctx.restore();continue}if(!m||!m.ready||m.kind==='audio')continue;const el=m.el;if(m.kind==='video'){if(el.preload!=='auto')el.preload='auto';const st=sourceTime(c,time);if(!playing&&!exporting&&!el.seeking&&Math.abs((el.currentTime||0)-st)>.04)try{el.currentTime=st}catch(e){}if(el.readyState<2)continue}
const sw=m.kind==='image'?el.naturalWidth:el.videoWidth,sh=m.kind==='image'?el.naturalHeight:el.videoHeight;if(!sw||!sh)continue;
let image=el;
 if(c.background&&m.kind==='video'&&readySegmenter){
  try{image=drawPersonCutout(c,el,sw,sh)||el}
  catch(error){maskFailure=error;if(!exporting)$('advancedVideoStatus').textContent='Maschera non disponibile: '+error.message}
 }
 const cutout=image!==el;
 if(!cutout&&c.sceneBackdrop){ctx.save();ctx.globalAlpha=clamp(c.opacity??1,0,1);drawBlurBackground({...c,fitMode:'blur'},el,sw,sh);ctx.restore()}
 ctx.save();
 try{
  ctx.globalAlpha=clipAlpha(c,time)*motion.alpha*overlapAlpha(c,time);
  applySpatialTransition(c,time);
  if(cutout&&c.background.mode==='solid'){ctx.fillStyle=c.background.color;ctx.fillRect(0,0,canvas.width,canvas.height)}
  if((cutout&&c.background.mode==='blur')||(!cutout&&c.fitMode==='blur'))drawBlurBackground({...c,fitMode:'blur'},el,sw,sh);
  const face=(c.autoReframe||c.faceBlur)&&faceAt(c,time);
  const cover=c.autoReframe||!['contain','blur'].includes(c.fitMode);
  const scale=(cover?Math.max(canvas.width/sw,canvas.height/sh):Math.min(canvas.width/sw,canvas.height/sh))*c.zoom;
  const mx=c.mirror?-1:1;
  const centerX=c.autoReframe&&face?clamp((.5-face.x)*sw*scale*mx,-Math.max(0,(sw*scale-canvas.width)/2),Math.max(0,(sw*scale-canvas.width)/2)):0;
  const centerY=c.autoReframe&&face?clamp((.40-face.y)*sh*scale,-Math.max(0,(sh*scale-canvas.height)/2),Math.max(0,(sh*scale-canvas.height)/2)):0;
  ctx.translate(canvas.width*(.5+c.x)+motion.dx+centerX,canvas.height*(.5+c.y)+motion.dy+centerY);
  ctx.rotate(c.rotation*Math.PI/180+motion.rot);ctx.scale(motion.scale*mx,motion.scale);
  const filters=[canvasFilter(c),...layers.flatMap(layer=>effectFilters[layer.value]&&layer.amount?[weightedFilter(effectFilters[layer.value],layer.amount)]:[])].filter(value=>value!=='none');
  ctx.filter=filters.join(' ')||'none';
  ctx.drawImage(image,-sw*scale/2,-sh*scale/2,sw*scale,sh*scale);
  if(c.faceBlur&&face)drawFaceBlur(image,face,sw,sh,scale);
  drawClipFx(c,c.effect,1,c.start,image,sw,sh,scale);
  for(const layer of layers)drawClipFx(c,layer.value,layer.amount,layer.start,image,sw,sh,scale);
 }finally{ctx.restore()}
 }}

document.addEventListener('kore-theme-change',()=>{if(!exporting)draw()});
function previewTimelineTime(delta){const c=activeClips(time).find(c=>getClipMedia(c)?.kind==='video');if(!c)return time+delta;const m=getClipMedia(c),el=m.el,rate=Number(c.speed)||1,end=c.start+duration(c);if(m.previewClip!==c.id||el.seeking||m.playPending)return time;if(el.ended||el.currentTime>=c.out)return end;if(el.paused||el.readyState<2)return time;const position=c.start+(el.currentTime-c.in)/rate;return Math.min(end,Math.max(time,position))}
let previewAudioContext=null;const previewAudioNodes=new WeakMap();
function unlockPreviewAudio(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;if(!previewAudioContext)previewAudioContext=new C();if(previewAudioContext.state!=='running'&&previewAudioContext.state!=='closed')previewAudioContext.resume().catch(()=>{});}catch(error){status('Controllo volume avanzato non disponibile: usa il volume del dispositivo.')}}
function previewAudioLevel(m,level){
 if(!previewAudioContext||previewAudioContext.state!=='running'){m.el.volume=level;return}
 let node=previewAudioNodes.get(m.el);if(!node){try{const source=previewAudioContext.createMediaElementSource(m.el),gain=previewAudioContext.createGain();source.connect(gain).connect(previewAudioContext.destination);node={source,gain};previewAudioNodes.set(m.el,node)}catch(error){m.el.volume=level;return}}
 m.el.volume=1;node.gain.gain.setTargetAtTime(level,previewAudioContext.currentTime,.012);
}
function syncVideoPlayback(force=false){const active=activeClips(time).filter(c=>isTimedMedia(getClipMedia(c))),primary=active[0];const chosen=new Map();for(const c of active){const m=getClipMedia(c);if(m)chosen.set(m,c)}for(const m of allVideoMedia()){if(!isTimedMedia(m))continue;const c=chosen.get(m);if(c&&m.el.preload!=='auto')m.el.preload='auto';if(!c||(!playing&&!exporting)){if(!m.el.paused)m.el.pause();continue}const target=sourceTime(c,time),changed=m.previewClip!==c.id,drift=Math.abs(m.el.currentTime-target);if(force||changed)m.playbackError=null;const resync=force||changed||(exporting?drift>.28:c!==primary&&drift>.5);if(resync&&!m.el.seeking&&drift>.02){try{m.el.currentTime=target;m.previewSeekCount=(m.previewSeekCount||0)+1}catch(e){}}m.previewClip=c.id;const rate=Number(c.speed)||1;if(m.el.playbackRate!==rate)m.el.playbackRate=rate;m.el.muted=exporting||!!modelPreviewMode;previewAudioLevel(m,clamp((c.volume??1)*((c.audioFadeIn||c.audioFadeOut)?audioFadeGain(c,time):1)*clipAlpha(c,time)*overlapAlpha(c,time)*outgoingOverlapAlpha(c,time),0,1));if(m.el.paused&&!m.playPending){m.playPending=true;Promise.resolve(m.el.play()).catch(e=>{if(!activeClips(time).some(x=>x.id===c.id&&getClipMedia(x)===m))return;m.playbackError=e;if(playing&&!exporting){playing=false;$('play').textContent='▶';updateMobilePlayback();for(const other of allVideoMedia())if(isTimedMedia(other))other.el.pause();status('Riproduzione non avviata. Tocca Riproduci per riprovare.')}}).finally(()=>{m.playPending=false})}}}
function loop(ts){if(playing&&!exporting){const delta=lastTick?Math.max(0,(ts-lastTick)/1000):0;time=Math.min(endTime(),previewTimelineTime(delta));const ended=time>=endTime(),mobile=window.matchMedia('(max-width: 759px)').matches;if(ended||!mobile||ts-previewFrameAt>=1000/30){previewFrameAt=ts;syncVideoPlayback();draw()}if(ended){playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback();if(modelPreviewMode){time=0;playing=true;syncVideoPlayback(true)}}if(ended||ts-previewUiAt>=100){previewUiAt=ts;refreshClock();document.querySelectorAll('.playhead').forEach(h=>h.style.left=time*px+'px')}}lastTick=ts;requestAnimationFrame(loop)}requestAnimationFrame(loop);
function updateMobilePlayback(){const button=$('mobilePlay');if(!button)return;const icon=button.querySelector('span');if(icon)icon.textContent=playing?'❚❚':'▶';button.setAttribute('aria-label',playing?'Pausa':'Riproduci')}
function togglePlay(){if(!project.clips.length)return;unlockPreviewAudio();playing=!playing;if(playing&&time>=endTime())time=0;$('play').textContent=playing?'❚❚':'▶';updateMobilePlayback();lastTick=0;syncVideoPlayback(true)}
async function openDB(){return new Promise((res,rej)=>{const req=indexedDB.open(dbName,1);req.onupgradeneeded=()=>{req.result.createObjectStore('media');req.result.createObjectStore('project')};req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function tx(store,mode,action){return new Promise((res,rej)=>{let transaction,req;try{transaction=db.transaction(store,mode);req=transaction.objectStore(store)[action.type](...action.args)}catch(e){rej(e);return}transaction.oncomplete=()=>res(req.result);transaction.onabort=()=>rej(transaction.error||req.error||new Error('Salvataggio annullato dal browser'));transaction.onerror=()=>rej(transaction.error||req.error||new Error('Errore memoria locale'));req.onerror=()=>rej(req.error||new Error('Errore memoria locale'))})}
let activeProjectKey=null;
let storageReady=Promise.resolve();
function emptyProject(){return {tracks:[{id:'v1',name:'Video 1'},{id:'v2',name:'Overlay'}],clips:[],ratio:'9:16'}}
async function persist(){
 if(modelPreviewMode||(!activeProjectKey&&!project.clips.length))return false;
 if(!activeProjectKey){activeProjectKey='editor:'+uid();if(exitCheckpoint&&exitCheckpointKey===null)exitCheckpointKey=activeProjectKey;}
 const key=activeProjectKey, snapshot=clone(project);
 await storageReady;
 if(!db||activeProjectKey!==key)return false;
 try{
  const value=key==='current'?snapshot:{project:snapshot,updatedAt:Date.now()};
  await tx('project','readwrite',{type:'put',args:[value,key]});
  try{localStorage.setItem('kore-last-editor',JSON.stringify({key,time,updatedAt:Date.now()}))}catch{}
  return true;
 }catch(e){status('Salvataggio non riuscito: spazio insufficiente o accesso negato.');return false}
}
async function saveProject(){status('Salvataggio del progetto e dei media…');await Promise.all([...media.values()].map(m=>m.savePromise).filter(Boolean));const saved=await persist();if(!saved)return status('Progetto non salvato: memoria locale non disponibile o scrittura fallita.');exitCheckpoint=clone(project);exitCheckpointKey=activeProjectKey;const unsaved=[...new Set(project.clips.filter(c=>c.kind!=="title").map(c=>c.media))].filter(id=>media.get(id)?.saveState!=="saved");status(unsaved.length?'Bozza salvata, ma '+unsaved.length+' media non sono confermati sul dispositivo. Mantieni aperto il progetto.':'Progetto e media salvati sul dispositivo')}
let mediaSaveQueue=Promise.resolve();
function waitForPreviewFrame(m){if(m.kind!=='video'||m.el.readyState>=2)return Promise.resolve();return new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);m.el.removeEventListener('loadeddata',done);m.el.removeEventListener('error',done);resolve()};m.el.addEventListener('loadeddata',done,{once:true});m.el.addEventListener('error',done,{once:true});timer=setTimeout(done,1500)})}
function waitForIdleSave(){return new Promise(resolve=>{if(window.requestIdleCallback)window.requestIdleCallback(()=>resolve(),{timeout:2000});else setTimeout(resolve,250)})}
function queueMediaSave(m,file){m.saveState='queued';const job=mediaSaveQueue.then(async()=>{if(m.kind!=='audio'){await waitForPreviewFrame(m);await waitForIdleSave();}if(media.get(m.id)!==m)return;m.saveState='saving';renderMediaFeedback();await tx('media','readwrite',{type:'put',args:[{blob:file,name:m.name,kind:m.kind},m.id]});m.saveState='saved';renderMediaFeedback()}).catch(()=>{m.saveState='session';renderMediaFeedback();status('Media importato, ma non salvato sul dispositivo. Mantieni aperto il progetto.')});mediaSaveQueue=job;m.savePromise=job;return job}
async function loadMedia(id,blob,name,kind){const audioType=kind==='audio'&&audioTypeFor(name);const source=audioType&&!blob.type.startsWith('audio/')?blob.slice(0,blob.size,audioType):blob;const url=URL.createObjectURL(source),el=document.createElement(kind==='image'?'img':kind);if(kind!=='image'){el.muted=false;el.playsInline=true;el.preload='auto'}const entry={id,blob,url,el,name,kind,ready:false};media.set(id,entry);
try{await new Promise((res,rej)=>{const event=kind==='image'?'load':'loadedmetadata';let timer;const clean=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad)};const ok=()=>{clean();res()};const bad=()=>{clean();rej(new Error('Formato non leggibile: '+name))};el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});timer=setTimeout(()=>{clean();rej(new Error('Caricamento scaduto: '+name+'. Verifica che il file sia scaricato sul dispositivo.'))},20000);el.src=url;if(kind!=='image'){const pool=$('mediaSources');if(pool)pool.append(el);el.load()}});if(kind!=='image'&&(!Number.isFinite(el.duration)||el.duration<=0))throw new Error('Durata del file non valida: '+name)}catch(e){media.delete(id);el.removeAttribute('src');if(kind!=='image')el.load();el.remove();URL.revokeObjectURL(url);throw e}entry.ready=true;if(kind!=='image'){const redraw=()=>{if(media.get(id)!==entry)return;renderMediaFeedback();if(!playing&&!exporting)draw()};el.addEventListener('seeked',redraw);el.addEventListener('loadeddata',redraw);el.addEventListener('canplay',redraw);el.addEventListener('error',()=>{if(media.get(id)!==entry)return;entry.decodeError='Il browser non riesce a riprodurre '+name+(kind==='audio'?'. Prova un MP3, M4A/AAC o WAV.':'. Prova un MP4 H.264/AAC.');renderMediaFeedback();status(entry.decodeError)})}return entry}
async function importFiles(files,{libraryOnly=false,dropAt=null,dropTrack=null}={}){const targetTrack=window.koreImportTarget||null;window.koreImportTarget=null;const importDefaults=window.koreImportDefaults||null;window.koreImportDefaults=null;await storageReady;importingMedia=true;const progress=$('mobileImportProgress');let imported=0,failed=0,lastClip=null;const importedIds=[];for(let i=0;i<files.length;i++){const file=files[i],kind=mediaKind(file);if(!kind){failed++;status('File non supportato: '+file.name);continue}const message='Caricamento '+(i+1)+' di '+files.length+': '+file.name;status(message);if(progress){progress.textContent=message;progress.classList.remove('hidden')}try{const id=uid(),m=await loadMedia(id,file,file.name,kind);let track=kind==='audio'?ensureAudioTrack():(targetTrack||project.tracks[0].id);imported++;importedIds.push(id);if(!libraryOnly)mutate(()=>{if(dropTrack&&(dropTrack.kind==='audio')===(kind==='audio'))track=dropTrack.id;else if(kind==='audio')track=ensureAudioTrack();const start=dropAt??(targetTrack||kind==='audio'?time:Math.max(0,...trackClips(track).map(c=>c.start+duration(c))));const len=kind==='image'?3:Math.min(m.el.duration||3,7200);lastClip={id:uid(),kind,media:id,track,start,in:0,out:len,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:0};if(importDefaults&&kind!=='audio'){Object.assign(lastClip,importDefaults.props||{});if(kind==='image'&&importDefaults.imageSeconds)lastClip.out=importDefaults.imageSeconds}project.clips.push(lastClip);selected=lastClip.id});renderAssetLibrary();if(!libraryOnly&&lastClip)seek(lastClip.start);if(db){queueMediaSave(m,file)}else{m.saveState='session';status('Media importato per questa sessione; salvataggio locale non disponibile.')}renderMediaFeedback()}catch(e){failed++;status('Importazione fallita: '+e.message)}}importingMedia=false;renderMediaFeedback();if(imported&&failed)status(imported+' media importati; '+failed+' non disponibili.');else if(imported&&db)status(imported+' media importati nella libreria e disponibili per il montaggio.');return {imported,failed,ids:importedIds}}
function selectedClip(){return project.clips.find(c=>c.id===selected)}
let koreRelinkId=null;
function beginRelink(){const c=selectedClip();if(!c||c.kind==='title'||media.has(c.media))return status('Seleziona una clip con media mancante.');koreRelinkId=c.media;$('relinkFile').click()}
async function relinkMissingMedia(id,file){if(!id||!file)return;const clips=project.clips.filter(c=>c.kind!=='title'&&c.media===id);if(!clips.length||media.has(id))return status('La clip non richiede più il ricollegamento.');const kind=mediaKind(file);if(!kind)return status('Scegli un file video o immagine valido.');if(clips.some(c=>(c.kind==='video'||c.kind==='image'||c.kind==='audio')&&c.kind!==kind))return status('Il tipo di file non corrisponde alla clip originale.');let m;try{m=await loadMedia(id,file,file.name,kind);const currentClips=project.clips.filter(c=>c.kind!=='title'&&c.media===id);if(!currentClips.length)throw Error('La clip non è più presente nel progetto.');if(currentClips.some(c=>(c.kind==='video'||c.kind==='image'||c.kind==='audio')&&c.kind!==kind))throw Error('Il tipo di media richiesto è cambiato.');if((kind==='video'||kind==='audio')&&(!Number.isFinite(m.el.duration)||m.el.duration<Math.max(...currentClips.map(c=>Number(c.out)||0))-.05))throw Error('Il media scelto è più corto del segmento usato nella timeline.');let saved=false;if(db)try{await tx('media','readwrite',{type:'put',args:[{blob:file,name:file.name,kind},id]});saved=true}catch(e){}m.saveState=saved?'saved':'session';renderAssetLibrary();refresh();status(saved?'Media ricollegato: '+file.name:'Media ricollegato per questa sessione; salvataggio locale non disponibile.')}catch(e){if(m){media.delete(id);if(kind==='video')m.el.pause();m.el.removeAttribute('src');if(kind==='video')m.el.load();URL.revokeObjectURL(m.url)}status('Ricollegamento non riuscito: '+e.message);refresh()}}
$('relinkMedia').onclick=beginRelink;$('mobileRelink').onclick=beginRelink;$('relinkFile').addEventListener('cancel',()=>{koreRelinkId=null});$('relinkFile').onchange=e=>{const id=koreRelinkId,file=e.target.files?.[0];koreRelinkId=null;e.target.value='';if(id&&file)relinkMissingMedia(id,file)};
function freezeFrame(){const c=selectedClip();if(!c)return status('Seleziona una clip.');if(c.kind==='title')return status('Freeze frame disponibile per foto e video.');const m=media.get(c.media);if(!m?.ready)return status('Media non pronto.');const stamp=time;const temp=document.createElement('canvas');temp.width=canvas.width;temp.height=canvas.height;const cx=temp.getContext('2d');if(!cx)return status('Canvas non disponibile.');const source=getClipMedia(c).el;try{cx.drawImage(source,0,0,temp.width,temp.height)}catch(e){return status('Impossibile catturare il fotogramma. Riprova durante la riproduzione.')}temp.toBlob(async blob=>{if(!blob)return status('Cattura non riuscita.');try{const file=new File([blob],'KORE_freeze_'+Date.now()+'.png',{type:'image/png'});const id=uid();const img=new Image(),url=URL.createObjectURL(blob);img.src=url;await img.decode();const frozen={id,name:file.name,kind:'image',el:img,ready:true,url,blob};media.set(id,frozen);if(db)queueMediaSave(frozen,blob);mutate(()=>{const clip={id:uid(),kind:'image',media:id,track:c.track,start:stamp,in:0,out:1.5,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:0,fitMode:'cover',effect:'original'};project.clips.push(clip);selected=clip.id});status('Fermo immagine creato: 1,5 s')}catch(e){status('Errore fermo immagine: '+e.message)}},'image/png')}
function reverseMotion(){const c=selectedClip();if(!c)return status('Seleziona una clip.');if(media.get(c.media)?.kind==='video')return status('Reverse video reale non ancora disponibile; usa Reverse motion su foto o titoli.');const d=duration(c);mutate(()=>{const frames=(c.keyframes||[]).map(f=>({...f,at:d-f.at})).reverse();if(frames.length){c.keyframes=frames;c.keyframeEasing=c.keyframeEasing==='easeIn'?'easeOut':c.keyframeEasing==='easeOut'?'easeIn':c.keyframeEasing}else{const z=c.zoom||1;c.keyframes=[{at:0,x:c.x||0,y:c.y||0,zoom:z+.16,rotation:c.rotation||0,opacity:c.opacity??1},{at:d,x:c.x||0,y:c.y||0,zoom:z,rotation:c.rotation||0,opacity:c.opacity??1}]}});status('Movimento invertito sulla clip')}
function dynamicZoom(){const c=selectedClip();if(!c)return status('Seleziona una clip.');const d=duration(c),z=c.zoom||1;mutate(()=>{c.keyframes=[{at:0,x:c.x||0,y:c.y||0,zoom:z,rotation:c.rotation||0,opacity:c.opacity??1},{at:d*.45,x:c.x||0,y:c.y||0,zoom:z*1.24,rotation:c.rotation||0,opacity:c.opacity??1},{at:d,x:c.x||0,y:c.y||0,zoom:z,rotation:c.rotation||0,opacity:c.opacity??1}];c.keyframeEasing='ease'});status('Zoom dinamico applicato: 3 keyframe')}
// Reusable editing shortcuts use the same keyframes and filters as preview/export.
let lookClipboard=null;
function motionPresetFrames(c,preset){
 const d=duration(c);if(!Number.isFinite(d)||d<=0)return null;
 const base={x:c.x??0,y:c.y??0,zoom:c.zoom??1,rotation:c.rotation??0,opacity:c.opacity??1};
 const frame=(at,values={})=>({at,...base,...values});
 if(preset==='none')return [];
 if(preset==='push')return [frame(0),frame(d,{zoom:base.zoom*1.18})];
 if(preset==='pull')return [frame(0,{zoom:base.zoom*1.18}),frame(d)];
 if(preset==='panLeft'||preset==='panRight'){const sign=preset==='panLeft'?1:-1,z=base.zoom*1.2;return [frame(0,{x:base.x+sign*.04,zoom:z}),frame(d,{x:base.x-sign*.04,zoom:z})]}
 if(preset==='punch')return [frame(0),frame(d*.4,{zoom:base.zoom*1.24}),frame(d*.65,{zoom:base.zoom*1.24}),frame(d)];
 return null;
}
function applyMotionPreset(){
 if(exporting)return;const c=selectedClip();if(!c)return status('Seleziona una clip.');
 const preset=$('motionPreset').value,frames=motionPresetFrames(c,preset);if(!frames)return;
 mutate(()=>{c.keyframes=frames;c.keyframeEasing='ease'});
 seek(c.start+Math.min(duration(c)*.5,1));
 if(window.matchMedia('(max-width: 759px)').matches){if(!$('mobileTools').classList.contains('hidden'))closeMobileTools();mobileApplyFeedback(frames.length?'✓ Movimento applicato · premi ▶':'✓ Movimento keyframe rimosso')}
 status(frames.length?'Movimento applicato. Premi Riproduci per vederlo; Annulla ripristina i keyframe precedenti.':'Movimento keyframe rimosso.');
}
function copyClipLook(){
 const c=selectedClip();if(!c||c.kind==='title')return status('Seleziona una foto o un video per copiare il look.');
 lookClipboard={effect:c.effect||'original',brightness:c.brightness??1,contrast:c.contrast??1,saturation:c.saturation??1};
 $('pasteLook').disabled=false;$('lookClipboardInfo').textContent='Look copiato. Seleziona una foto o un video e premi Incolla look.';status('Look copiato: effetto e regolazioni colore.');
}
function pasteClipLook(){
 if(exporting)return;const c=selectedClip();if(!c||c.kind==='title'||!lookClipboard)return status('Copia un look e seleziona una foto o un video.');
 mutate(()=>Object.assign(c,lookClipboard));if(time<c.start||time>=c.start+duration(c))seek(c.start);else draw();status('Look incollato. Puoi annullare la modifica.');
}
function rippleDelete(){const c=selectedClip();if(!c)return status('Seleziona una clip da eliminare.');const start=c.start,end=start+duration(c),span=duration(c),track=c.track;const conflict=project.clips.some(x=>x.id!==c.id&&x.track===track&&x.start<end&&x.start+duration(x)>start);if(conflict)return status('Clip sovrapposte: usa Elimina per conservare gli allineamenti.');mutate(()=>{project.clips=project.clips.filter(x=>x.id!==c.id);for(const x of project.clips)if(x.track===track&&x.start>=end-.001)x.start=Math.max(0,x.start-span);selected=null;time=Math.min(time,endTime())});status('Clip eliminata e spazio chiuso sulla sua traccia')}
function openMobileTools(){
 if(exporting)return;
 const dialog=$('mobileTools'),inspector=$('inspector');
 if(!selectedClip()){const c=activeClips(time).find(c=>media.has(c.media))||activeClips(time)[0];if(c)selected=c.id}
 playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback();refresh();
 if(!inspector._home){inspector._home=inspector.parentNode;inspector._next=inspector.nextSibling}
 $('mobileToolProperties').append(inspector);dialog.classList.remove('hidden');$('mobileToolsClose').focus();
}
function closeMobileTools(){const inspector=$('inspector');if(inspector._home){inspector._home.insertBefore(inspector,inspector._next);inspector._home=null} $('mobileTools').classList.add('hidden');(document.body.classList.contains('phone-polished')?$('phoneMoreOpen'):$('mobileAdvanced')).focus()}
$('mobileToolsClose').onclick=closeMobileTools;
$('mobileTools').onclick=e=>{if(e.target===$('mobileTools'))closeMobileTools()};
$('mobileTools').addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileTools();if(e.key==='Tab'){const nodes=[...$('mobileTools').querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled&&x.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('mobileTools').querySelectorAll('[data-edit-action]').forEach(button=>button.onclick=()=>{const action=button.dataset.editAction;if(action==='ripple')rippleDelete();else $(action).click();if(['remove','ripple'].includes(action))closeMobileTools()});
function split(){let c=selectedClip();if(window.matchMedia('(max-width: 759px)').matches&&(!c||(c.kind==='title'&&!c.transcriptCues)||time<=c.start+.05||time>=c.start+duration(c)-.05)){const video=activeClips(time).find(x=>media.get(x.media)?.kind==='video'&&time>x.start+.05&&time<x.start+duration(x)-.05);if(video){c=video;selected=c.id}}if(!c||time<=c.start+.05||time>=c.start+duration(c)-.05)return status('Posiziona la testina dentro la clip per dividerla.');mutate(()=>{const original=clone(c),local=time-c.start,cut=sourceTime(c,time),right={...clone(c),id:uid(),start:time,in:cut};c.out=cut;if(original.keyframes?.length){c.keyframes=slicedKeyframes(original,0,local);right.keyframes=slicedKeyframes(original,local,duration(original))}for(const mark of project.markers||[])if(mark.clipId===c.id&&mark.source>=cut)mark.clipId=right.id;project.clips.push(right);selected=right.id});status('Clip divisa')}
function trimStart(){const c=selectedClip();if(!c||time<=c.start||time>=c.start+duration(c)-.1)return status('Porta la testina dentro la clip.');mutate(()=>{if(c.keyframes?.length)c.keyframes=slicedKeyframes(c,time-c.start,duration(c));c.in=sourceTime(c,time);c.start=time});status('Inizio aggiornato')}
function trimEnd(){const c=selectedClip();if(!c||time<=c.start+.1||time>=c.start+duration(c))return status('Porta la testina dentro la clip.');mutate(()=>{if(c.keyframes?.length)c.keyframes=slicedKeyframes(c,0,time-c.start);c.out=sourceTime(c,time)});status('Fine aggiornata')}
function duplicate(){const c=selectedClip();if(!c)return;mutate(()=>{const copy={...clone(c),id:uid(),start:c.start+duration(c)};project.clips.push(copy);selected=copy.id});status('Clip duplicata')}
function move(dir){const c=selectedClip();if(!c)return;mutate(()=>{c.start=Math.max(0,c.start+dir*.5)});status('Clip spostata di 0,5 secondi')}
function setProp(key,value){if(key==='audioFadeIn'||key==='audioFadeOut')value=clamp(Number(value)||0,0,5);const c=selectedClip();if(!c)return;mutate(()=>{const at=time-c.start;const frame=(c.keyframes||[]).find(f=>Math.abs(f.at-at)<.12);if(frame&&animatedProps.includes(key))frame[key]=value;else {c[key]=value;if(key==='text'&&c.transcriptCues)delete c.transcriptCues}});status('Modifica applicata')}
async function reset(){
 if(!confirm('Creare un nuovo progetto? Il progetto precedente rimane in I tuoi progetti.'))return;
 await persist();
 activeProjectKey=null;project=emptyProject();selected=null;time=0;history=[];future=[];playing=false;
 syncVideoPlayback(true);$('play').textContent='▶';updateMobilePlayback();canvasSize();refresh();status('Nuovo progetto');
}
async function initProjectStorage(){
 showSceneDraftResume();
 try{db=await openDB();await restoreSceneDraft()}
 catch(e){status('Salvataggio locale non disponibile: '+e.message)}
}
async function openEditorDraft(key,draft){
 const missing=[];
 for(const id of new Set(draft.clips.filter(c=>c.kind!=='title').map(c=>c.media))){
  if(media.has(id))continue;
  const row=await tx('media','readonly',{type:'get',args:[id]});
  if(!row){missing.push(id);continue}
  try{const restored=await loadMedia(id,row.blob,row.name,row.kind);restored.saveState='saved'}
  catch(e){missing.push(id)}
 }
 activeProjectKey=key;project=clone(draft);
 if(project.clips.some(clip=>clip.background))prepareBackgroundModel().then(()=>{if(!exporting)draw()}).catch(error=>{$('advancedVideoStatus').textContent='Sfondo non disponibile: '+error.message});selected=null;time=0;history=[];future=[];playing=false;
 syncVideoPlayback(true);$('play').textContent='▶';updateMobilePlayback();
 canvasSize();refresh();renderAssetLibrary();
 status(missing.length?'Progetto aperto: '+missing.length+' media da ricollegare.':'Progetto aperto');
}
function selectExportMime(){if(!window.MediaRecorder)return null;return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))||null}

async function prepareExportAudio(audioCtx){
 const destination=audioCtx.createMediaStreamDestination(),nodes=[],warnings=[];
 const clips=project.clips.filter(c=>c.kind!=='title'&&isTimedMedia(media.get(c.media))&&(c.volume??1)>0);
 for(const c of clips){let el;try{
  const m=media.get(c.media);el=document.createElement('audio');
  el.src=m.url;el.preload='auto';el.playbackRate=c.speed;el.load();
  await new Promise((resolve,reject)=>{if(el.readyState>=1)return resolve();let finished=false;const clear=()=>{el.removeEventListener('loadedmetadata',ok);el.removeEventListener('error',bad);clearTimeout(timer)};const ok=()=>{if(!finished){finished=true;clear();resolve()}};const bad=()=>{if(!finished){finished=true;clear();reject(new Error('Audio non leggibile'))}};const timer=setTimeout(()=>{if(!finished){finished=true;clear();reject(new Error('Caricamento audio scaduto'))}},8000);el.addEventListener('loadedmetadata',ok);el.addEventListener('error',bad)});
  const source=audioCtx.createMediaElementSource(el),gain=audioCtx.createGain();gain.gain.value=0;
  source.connect(gain).connect(destination);nodes.push({el,source,gain,c,started:false,failed:false});
 }catch(e){el?.pause();el?.removeAttribute('src');el?.load();warnings.push((media.get(c.media)?.name||'Video')+': '+e.message)}}
 return{destination,nodes,warnings,expected:clips.length}
}
function syncExportAudio(plan,t){
 for(const n of plan.nodes){const c=n.c,local=t-c.start,len=duration(c),active=local>=0&&local<len;
  if(!active){n.gain.gain.value=0;if(n.started){n.el.pause();n.started=false}continue}
  const target=clamp(c.in+local*c.speed,c.in,c.out);
  n.el.playbackRate=c.speed;
  if(!n.started||Math.abs(n.el.currentTime-target)>.45){try{n.el.currentTime=target}catch(e){}}
  n.gain.gain.value=clamp(c.volume??1,0,1)*((c.audioFadeIn||c.audioFadeOut)?audioFadeGain(c,t):1)*clipAlpha(c,t)*overlapAlpha(c,t)*outgoingOverlapAlpha(c,t);
  if(!n.started){n.started=true;n.el.play().catch(e=>{n.started=false;n.failed=true;n.gain.gain.value=0})}
 }
}
async function prepareExportVideo(){
 const first=new Map();for(const c of [...project.clips].sort((a,b)=>a.start-b.start)){const m=getClipMedia(c);if(m?.kind==='video'&&!first.has(m))first.set(m,c)}
 await Promise.all([...first.values()].map(c=>new Promise((resolve,reject)=>{const m=getClipMedia(c),el=m.el;let timer,done=false;const clean=()=>{clearTimeout(timer);for(const name of ['loadeddata','canplay','seeked'])el.removeEventListener(name,check);el.removeEventListener('error',bad)};const finish=error=>{if(done)return;done=true;clean();error?reject(error):resolve()};const check=()=>{if(!el.seeking&&el.readyState>=2&&Math.abs(el.currentTime-c.in)<.1)finish()};const bad=()=>finish(new Error('Fotogramma video non leggibile: '+m.name));for(const name of ['loadeddata','canplay','seeked'])el.addEventListener(name,check);el.addEventListener('error',bad);timer=setTimeout(()=>finish(new Error('Preparazione video scaduta: '+m.name)),12000);el.pause();el.muted=true;el.preload='auto';try{if(Math.abs(el.currentTime-c.in)>.02)el.currentTime=c.in;check()}catch(e){finish(e)}})));
}
const titleFontFamilies={outfit:"'Outfit',system-ui,sans-serif",bebas:"'Bebas Neue',Impact,sans-serif",anton:"'Anton',Impact,sans-serif",space:"'Space Grotesk',system-ui,sans-serif",oswald:"'Oswald',Impact,sans-serif",montserrat:"'Montserrat',system-ui,sans-serif",righteous:"'Righteous',system-ui,sans-serif",playfair:"'Playfair Display',Georgia,serif",mono:"'Space Mono',monospace"};
async function prepareTitleFonts(){if(!document.fonts)return;const titles=project.clips.filter(c=>c.kind==='title');if(!titles.length)return;let timer;try{await Promise.race([Promise.all(titles.map(c=>document.fonts.load('800 68px '+(titleFontFamilies[c.fontFamily||'bebas']||titleFontFamilies.bebas),String(c.text||'Titolo')))),new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Caricamento font scaduto. Riprova prima di esportare.')),10000)})])}catch(e){throw new Error('Font dei titoli non pronto: '+e.message)}finally{clearTimeout(timer)}}
function refreshLoadedFonts(){if(!exporting)draw()}
if(document.fonts){document.fonts.ready.then(refreshLoadedFonts);document.fonts.addEventListener?.('loadingdone',refreshLoadedFonts)}

function createExportPanel(size){
 const dialog=document.createElement('dialog');dialog.id='koreExportDialog';dialog.setAttribute('aria-labelledby','koreExportTitle');
 dialog.innerHTML='<div class="export-heading"><h2 id="koreExportTitle">Esportazione Full HD</h2><button type="button" id="exportBack" aria-label="Indietro">‹ Indietro</button></div><p id="exportDetail" role="status" aria-live="polite">Preparazione del video…</p><progress id="exportProgress" max="100" value="0"></progress><p id="exportKeepOpen">Mantieni KORE in primo piano. Puoi annullare senza perdere il progetto.</p><video id="exportResultVideo" controls playsinline hidden></video><p id="exportResultInfo" hidden></p><div class="export-actions"><button type="button" id="exportCancel">Annulla esportazione</button><button type="button" id="exportDownload" class="primary" hidden>Salva video</button><button type="button" id="exportShare" hidden>Condividi / salva su telefono</button></div>';
 dialog.querySelector('#koreExportTitle').textContent='Esportazione '+size.width+' × '+size.height;document.body.append(dialog);dialog.showModal();
 const get=id=>dialog.querySelector('#'+id),controller=new AbortController();let url=null,file=null,busy=true;
 const close=()=>{get('exportResultVideo').pause();get('exportResultVideo').removeAttribute('src');get('exportResultVideo').load();if(url)URL.revokeObjectURL(url);dialog.remove()};
 const cancel=()=>{if(!busy)return close();controller.abort();get('exportCancel').disabled=true;get('exportDetail').textContent='Annullamento in corso…'};
 get('exportBack').onclick=cancel;get('exportCancel').onclick=cancel;
 dialog.addEventListener('cancel',e=>{e.preventDefault();cancel()});
 const report=text=>{if(!controller.signal.aborted)get('exportDetail').textContent=text;const match=text.match(/(\d+)%/);if(match)get('exportProgress').value=Number(match[1]);else get('exportProgress').removeAttribute('value')};
 return {signal:controller.signal,report,
  complete(result,size,withAudio){busy=false;url=URL.createObjectURL(result.blob);file=new File([result.blob],'KORE-Studio-'+Date.now()+'.'+result.extension,{type:result.blob.type});get('koreExportTitle').textContent='Il tuo video è pronto';get('exportDetail').textContent='Esportazione completata. Guarda il risultato prima di condividerlo.';get('exportProgress').hidden=true;get('exportKeepOpen').hidden=true;get('exportCancel').hidden=true;get('exportResultVideo').hidden=false;get('exportResultVideo').src=url;get('exportResultInfo').hidden=false;get('exportResultInfo').textContent=size.width+' × '+size.height+' · '+(file.size/1048576).toFixed(1)+' MB · '+(withAudio?'con traccia audio':'senza traccia audio');get('exportDownload').hidden=false;get('exportDownload').onclick=()=>saveHighlightFile(result.blob,file.name);
   let canShare=false;try{canShare=!!navigator.canShare?.({files:[file]})}catch(e){}if(canShare){get('exportShare').hidden=false;get('exportShare').onclick=async()=>{try{await navigator.share({files:[file],title:'Video KORE Studio'})}catch(e){if(e.name!=='AbortError')get('exportDetail').textContent='Condivisione non disponibile. Usa Salva video.'}}}
  },
  failed(error){busy=false;if(controller.signal.aborted){close();return}get('koreExportTitle').textContent='Esportazione da riprovare';get('exportDetail').textContent=error.message;get('exportProgress').hidden=true;get('exportKeepOpen').textContent='Il progetto è rimasto intatto. Torna all’editor per riprovare.';get('exportCancel').textContent='Torna all’editor';get('exportCancel').disabled=false;get('exportCancel').onclick=close}
 };
}

async function exportVideo({download=true,onProgress=status,signal=null}={}){
 if(exporting||!project.clips.length)return;
 if(project.clips.some(c=>c.kind!=='title'&&!media.get(c.media)?.ready))return status('Impossibile esportare: seleziona e ricollega i media mancanti nella timeline.');
 const mime=selectExportMime();
 if(!mime||!canvas.captureStream)return status('Esportazione non supportata da questo browser.');
 playing=false;syncVideoPlayback(true);$('play').textContent='▶';updateMobilePlayback();exporting=true;$('export').disabled=true;
 const prev=time,prevW=canvas.width,prevH=canvas.height,base=Number($('resolution').value),size=frameDimensions(base,project.ratio);
 canvas.width=size.width;canvas.height=size.height;
 let stream,rec,audioCtx,plan,screenLock;const panel=download?createExportPanel(size):null;const exportSignal=panel?.signal||signal;const report=text=>{onProgress(text);panel?.report(text)};const checkCancelled=()=>{if(exportSignal?.aborted)throw new DOMException('Esportazione annullata.','AbortError')};const cancelRecorder=()=>{if(rec?.state==='recording')try{rec.stop()}catch(e){}};exportSignal?.addEventListener('abort',cancelRecorder,{once:true});
 try{checkCancelled();try{screenLock=await navigator.wakeLock?.request('screen')}catch(e){}
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtor)throw Error('Web Audio non supportato: impossibile esportare audio.');
  audioCtx=new AudioCtor();await audioCtx.resume();
  report('Preparazione di audio e video…');
  if(project.clips.some(clip=>clip.background))await prepareBackgroundModel();
  await prepareTitleFonts();checkCancelled();
  plan=await prepareExportAudio(audioCtx);checkCancelled();
  const withAudio=plan.nodes.length>0;
  if(plan.warnings.length)throw Error('Impossibile preparare '+plan.warnings.length+' sorgenti audio: '+plan.warnings[0]+'. Esportazione interrotta per evitare audio mancante.');if(plan.expected&&!plan.nodes.length)throw Error('Impossibile caricare l’audio dei video. Esportazione interrotta per evitare un file silenzioso.');
  stream=canvas.captureStream(0);
  let videoTrack=stream.getVideoTracks()[0];
  if(!videoTrack?.requestFrame){stream.getTracks().forEach(track=>track.stop());stream=canvas.captureStream(30);videoTrack=stream.getVideoTracks()[0]}
  if(withAudio){for(const track of plan.destination.stream.getAudioTracks())stream.addTrack(track)}
  rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:base>=1080?16000000:base>=720?8000000:4000000,audioBitsPerSecond:192000});
  const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  let recorderError=null;const done=new Promise((resolve,reject)=>{rec.onerror=e=>{recorderError=e.error||new Error('Encoding fallito');reject(recorderError)};rec.onstop=resolve});done.catch(()=>{});
  const total=endTime();if(!Number.isFinite(total)||total<=0)throw Error('La timeline non contiene una durata esportabile.');
  if(withAudio){for(const n of plan.nodes){try{n.el.currentTime=n.c.in}catch(e){}}}
  await prepareExportVideo();checkCancelled();time=0;
  for(const clip of project.clips.filter(clip=>clip.background)){
   const player=getClipMedia(clip)?.el;
   if(player?.readyState>=2)await updatePersonMask(player,player.videoWidth,player.videoHeight,clip.background.edge||0);
  }
  if(maskFailure)throw maskFailure;
  draw();
  rec.start(500);
  videoTrack?.requestFrame?.();
  const started=performance.now();
  const frameInterval=1000/30;
  const maxFrameGap=2000;
  let nextFrameAt=started+frameInterval,lastFrameAt=started,lastProgressAt=started;
  syncVideoPlayback(true);
  if(withAudio)syncExportAudio(plan,0);
  report('0% · Mantieni KORE aperto');
  await new Promise((resolve,reject)=>{
   function frame(){
    try{
     checkCancelled();if(recorderError)throw recorderError;
     const sourceError=activeClips(time).map(c=>getClipMedia(c)?.playbackError).find(Boolean);
     if(sourceError)throw new Error('Riproduzione della sorgente video non riuscita: '+sourceError.message);
     if(rec.state==='inactive')throw new Error('La registrazione si è interrotta prima della fine.');
     if(document.hidden)throw new Error('KORE è passato in secondo piano. Mantieni la pagina visibile durante l’esportazione.');
     const now=performance.now(),elapsed=(now-started)/1000,finished=elapsed>=total;
     if(now-lastFrameAt>maxFrameGap)throw new Error('Rendering interrotto per oltre 2 secondi. Riprova mantenendo KORE in primo piano.');
     if(finished||now>=nextFrameAt){
      lastFrameAt=now;
      nextFrameAt=started+(Math.floor((now-started)/frameInterval)+1)*frameInterval;
      time=Math.min(Math.max(0,total-1/60),elapsed);
      syncVideoPlayback();
      if(withAudio)syncExportAudio(plan,time);
      draw();
      if(maskFailure)throw maskFailure;
      videoTrack?.requestFrame?.();
     }
     if(now-lastProgressAt>=250||finished){
      lastProgressAt=now;
      report(Math.min(100,Math.round(100*elapsed/total))+'% · Mantieni KORE aperto');
     }
     if(finished)resolve();
     else setTimeout(frame,Math.max(0,Math.min(nextFrameAt,started+total*1000)-performance.now()));
    }catch(e){reject(e)}
   }
   setTimeout(frame,frameInterval);
  });
  checkCancelled();syncVideoPlayback(true);if(rec.state==='recording')rec.stop();await done;checkCancelled();
  const audioFailures=plan.nodes.filter(n=>n.failed).length;if(audioFailures)throw Error('Riproduzione di '+audioFailures+' sorgenti audio non riuscita. Esportazione interrotta per evitare audio mancante.');
  const blob=new Blob(chunks,{type:mime});if(blob.size<1024)throw Error('Il file esportato è vuoto o incompleto: prova un formato o browser diverso.');
  const extension=mime.includes('mp4')?'mp4':'webm';
  if(download)saveHighlightFile(blob,'KORE-Studio-'+Date.now()+'.'+extension);panel?.complete({blob,extension},size,withAudio);
  status(withAudio?'Esportazione completata con traccia audio collegata. Verifica la sincronizzazione nel file scaricato.':'Video esportato: nessuna clip con audio presente.');
  return {blob,extension};
 }catch(e){status(e.name==='AbortError'?'Esportazione annullata. Il progetto è rimasto intatto.':'Esportazione non riuscita: '+e.message);panel?.failed(e);if(rec?.state==='recording'){try{rec.stop()}catch(_){}}}
 finally{exportSignal?.removeEventListener('abort',cancelRecorder);try{await screenLock?.release()}catch(e){}try{plan?.nodes.forEach(n=>{try{n.el.pause();n.el.removeAttribute('src');n.el.load();n.source.disconnect();n.gain.disconnect()}catch(e){}});await audioCtx?.close()}catch(e){}stream?.getTracks().forEach(t=>t.stop());canvas.width=prevW;canvas.height=prevH;time=prev;exporting=false;syncVideoPlayback(true);$('export').disabled=false;refresh()}
}
$('add').onclick=()=>{window.koreImportTarget=null;$('import').click()};$('import').onchange=e=>{const libraryOnly=libraryImport;libraryImport=false;importFiles([...e.target.files],{libraryOnly});e.target.value=''};$('import').addEventListener('cancel',()=>{libraryImport=false});$('play').onclick=togglePlay;$('seek').oninput=e=>{playing=false;$('play').textContent='▶';updateMobilePlayback();seek(Number(e.target.value)/1000*endTime())};
$('undo').onclick=()=>{if(!history.length)return;future.push(clone(project));project=history.pop();selected=null;canvasSize();syncVideoPlayback(true);refresh();persist();status('Modifica annullata')};
$('redo').onclick=()=>{if(!future.length)return;history.push(clone(project));project=future.pop();selected=null;canvasSize();syncVideoPlayback(true);refresh();persist();status('Modifica ripristinata')};
$('split').onclick=split;$('trimStart').onclick=trimStart;$('trimEnd').onclick=trimEnd;$('duplicate').onclick=duplicate;$('crossfade').onclick=()=>{const c=selectedClip();if(!c)return;const prev=project.clips.filter(p=>p.id!==c.id&&p.track===c.track&&p.start<c.start).sort((a,b)=>b.start-a.start)[0];if(!prev)return status('Serve una clip precedente sulla stessa traccia.');const span=Math.min(clamp(c.transitionDuration??.7,.1,2),duration(prev)/2,duration(c)/2);if(span<=.05)return status('Clip troppo corta per la dissolvenza.');mutate(()=>{c.start=Math.max(prev.start+.05,prev.start+duration(prev)-span);c.transitionPreset='crossfade';c.fadeIn=0;c.fadeOut=0});status('Dissolvenza tra clip: sovrapposizione '+span.toFixed(2)+'s')};$('remove').onclick=()=>{if(!selectedClip())return;mutate(()=>{project.clips=project.clips.filter(c=>c.id!==selected);selected=null})};
$('moveBack').onclick=()=>move(-1);$('moveForward').onclick=()=>move(1);$('addText').onclick=()=>{const name='Il mio titolo';mutate(()=>{const track=project.tracks[1]?.id||project.tracks[0].id;const c={id:uid(),kind:'title',media:null,track,start:time,in:0,out:3,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:0,text:name,fontSize:68,fontFamily:'bebas',fontColor:'#ffffff',fontStroke:'#000000',effect:'original'};project.clips.push(c);selected=c.id});status('Titolo aggiunto: selezionalo e modifica il testo nel pannello a destra (o sotto su telefono)')};
$('applyMotion').onclick=applyMotionPreset;$('copyLook').onclick=copyClipLook;$('pasteLook').onclick=pasteClipLook;
$('freezeFrame').onclick=freezeFrame;$('reverseClip').onclick=reverseMotion;$('speedRamp').onclick=dynamicZoom;
$('addKeyframe').onclick=()=>{const c=selectedClip();if(!c||time<c.start||time>c.start+duration(c))return status('Porta la testina dentro la clip per aggiungere un keyframe.');const at=Math.round((time-c.start)*100)/100;const view=animated(c,time);mutate(()=>{c.keyframes=(c.keyframes||[]).filter(f=>Math.abs(f.at-at)>.1);c.keyframes.push({at,...Object.fromEntries(animatedProps.map(k=>[k,view[k]]))});c.keyframes.sort((a,b)=>a.at-b.at)});status('Keyframe salvato a '+at.toFixed(2)+'s')};
function seekPrecisely(input){
 const seconds=input.valueAsNumber;
 if(!Number.isFinite(seconds)){input.value=time.toFixed(1);return}
 playing=false;$('play').textContent='▶';updateMobilePlayback();
 seek(seconds);input.value=time.toFixed(1);
}
$('preciseSeek').onchange=e=>seekPrecisely(e.currentTarget);
$('preciseSeek').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();seekPrecisely(e.currentTarget);e.currentTarget.blur()}};
$('prevKeyframe').onclick=()=>{const c=selectedClip();if(!c)return;const prev=visibleKeyframes(c).filter(f=>f.at<time-c.start-.01).sort((a,b)=>a.at-b.at).at(-1);if(prev)seek(c.start+prev.at);else status('Nessun keyframe precedente')};
$('nextKeyframe').onclick=()=>{const c=selectedClip();if(!c)return;const next=visibleKeyframes(c).slice().sort((a,b)=>a.at-b.at).find(f=>f.at>time-c.start+.01);if(next)seek(c.start+next.at);else status('Nessun keyframe successivo')};
$('keyframeEasing').onchange=e=>setProp('keyframeEasing',e.target.value);
$('removeKeyframe').onclick=()=>{const c=selectedClip();if(!c)return;const at=time-c.start;mutate(()=>{c.keyframes=(c.keyframes||[]).filter(f=>Math.abs(f.at-at)>.12)});status('Keyframe rimosso')};
$('effect').onchange=e=>setProp('effect',e.target.value);
$('fitMode').onchange=e=>setProp('fitMode',e.target.value);
$('mirror').onchange=e=>setProp('mirror',e.target.value==='on');
$('previewTransition').onclick=()=>{const c=selectedClip();if(!c)return;const prev=project.clips.filter(p=>p.id!==c.id&&p.track===c.track&&p.start<c.start).sort((a,b)=>b.start-a.start)[0];const begin=c.transitionPreset==='crossfade'&&prev?Math.max(prev.start,c.start-.15):c.start;seek(begin);playing=false;togglePlay();status('Anteprima transizione in riproduzione')};
$('transitionPreset').onchange=e=>{const value=e.target.value;const c=selectedClip();if(!c)return;mutate(()=>{c.transitionPreset=value;c.fadeIn=value==='fade'?.5:value==='soft'?1.2:value==='flash'?.22:0;c.fadeOut=value==='fade'?.5:value==='soft'?1.2:0});status('Transizione applicata alla clip')};
$('titleAccent').oninput=e=>setProp('graphicAccent',e.target.value);$('titleAnimation').onchange=e=>setProp('titleAnimation',e.target.value);$('titleShadow').onchange=e=>setProp('titleShadow',e.target.value);$('addCaptions').onclick=openCaptionsDialog;$('captionStyles').onclick=openCaptionStyles;$('speechKaraoke').onclick=openSpeechKaraoke;$('videoTranscribe').onclick=openVideoTranscriber;$('importSrt').onclick=()=>$('subtitleFile').click();$('subtitleFile').onchange=e=>{const f=e.target.files?.[0];if(f)importSubtitleFile(f);e.target.value=''};$('exportSrt').onclick=exportCaptionsSrt;$('titleColor').oninput=e=>setProp('fontColor',e.target.value);$('titleStroke').oninput=e=>setProp('fontStroke',e.target.value);$('titleFont').onchange=e=>{setProp('fontFamily',e.target.value);document.fonts.ready.then(()=>draw())};$('titleText').onchange=e=>setProp('text',e.target.value.slice(0,120));$('titleSize').onchange=e=>setProp('fontSize',Number(e.target.value));
$('addtrack').onclick=()=>mutate(()=>{const n=project.tracks.length+1;project.tracks.push({id:uid(),name:'Traccia '+n})});$('new').onclick=reset;$('save').onclick=saveProject;
for(const [id,key,factor] of [['speed','speed',1],['opacity','opacity',.01],['zoom','zoom',.01],['rotation','rotation',1],['posX','x',.01],['posY','y',.01],['fadeIn','fadeIn',1],['fadeOut','fadeOut',1],['audioFadeIn','audioFadeIn',1],['audioFadeOut','audioFadeOut',1],['volume','volume',.01],['brightness','brightness',.01],['contrast','contrast',.01],['saturation','saturation',.01],['transitionDuration','transitionDuration',1]])$(id).onchange=e=>setProp(key,Number(e.target.value)*factor);
$('transitionDuration').oninput=e=>{$('transitionDurationNumber').value=Number(e.target.value).toFixed(1)};
$('transitionDurationNumber').onchange=e=>{const parsed=Number(String(e.target.value).replace(',','.'));const value=clamp(Number.isFinite(parsed)&&parsed>0?parsed:.7,.1,2);setProp('transitionDuration',value);$('transitionDuration').value=value;$('transitionDurationNumber').value=value.toFixed(1)};
$('layer').onchange=e=>setProp('track',e.target.value);$('ratio').onchange=e=>mutate(()=>{project.ratio=e.target.value;canvasSize()});$('fit').onclick=()=>{const options=['9:16','16:9','1:1'];mutate(()=>{project.ratio=options[(options.indexOf(project.ratio)+1)%3];canvasSize()})};
$('full').onclick=()=>{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>status('Schermo intero non disponibile in Safari.'));else if(document.fullscreenElement)document.exitFullscreen()};
$('export').onclick=()=>exportVideo();$('desktopStartModels').onclick=()=>{$('welcome').classList.add('hidden');openAssetTab('templates')};$('desktopOpenEditor').onclick=()=>{$('welcome').classList.add('hidden');openAssetTab('media')};

function renderProjectMedia(){
 const list=$('projectMedia');
 if(!list)return;
 list.replaceChildren();
 const counts=new Map();
 for(const clip of project.clips)if(clip.media)counts.set(clip.media,(counts.get(clip.media)||0)+1);
 if(!counts.size){const empty=document.createElement('p');empty.className='asset-hint';empty.textContent='I media della timeline appariranno qui.';list.append(empty)}
 for(const [id,count] of counts){
  const item=media.get(id);
  const card=document.createElement('button');card.type='button';card.className='asset-card';
  const label=document.createElement('span');label.className='asset-label';label.textContent=item?.name||'Media da ricollegare';
  const details=document.createElement('small');details.textContent=(item?.kind==='audio'?'Audio':item?.kind==='image'?'Foto':item?.kind==='video'?'Video':'Media')+' · '+count+' clip';
  label.append(details);card.append(label);
  card.onclick=()=>{const clip=project.clips.find(c=>c.media===id);selected=clip.id;seek(clip.start);refresh();$('tracks').querySelector('.clip.selected')?.scrollIntoView({block:'nearest',inline:'nearest'})};
  if(item?.ready)makeMediaDraggable(card,id);
  list.append(card);
 }
}
function makeMediaDraggable(button,id){
 button.draggable=true;button.dataset.mediaId=id;
 button.title='Trascina sulla timeline per aggiungere il media';
 button.addEventListener('dragstart',event=>{
  if(exporting){event.preventDefault();return}
  event.dataTransfer.setData('application/x-kore-media',id);
  event.dataTransfer.effectAllowed='copy';
 });
}
function enableMediaDrops(){
 const timeline=$('timeline');
 const clear=()=>timeline.querySelectorAll('.media-drop-active,.desktop-audio-drop.active').forEach(el=>el.classList.remove('media-drop-active','active'));
 const supported=event=>desktopWorkspace.matches&&!exporting&&Array.from(event.dataTransfer.types).some(type=>type==='Files'||type==='application/x-kore-media');
 timeline.addEventListener('dragover',event=>{
  if(!supported(event))return;
  event.preventDefault();event.dataTransfer.dropEffect='copy';clear();
  event.target.closest('.trackbody,.desktop-audio-drop')?.classList.add('media-drop-active','active');
 });
 timeline.addEventListener('dragleave',event=>{if(!timeline.contains(event.relatedTarget))clear()});
 timeline.addEventListener('drop',async event=>{
  if(!supported(event))return;
  event.preventDefault();clear();
  const body=event.target.closest('.trackbody');
  const track=project.tracks.find(t=>t.id===body?.dataset.track);
  const start=Math.max(0,Math.round((event.clientX-(body?.getBoundingClientRect().left??timeline.getBoundingClientRect().left+64-timeline.scrollLeft))/px*100)/100);
  const id=event.dataTransfer.getData('application/x-kore-media');
  if(id){
   const item=media.get(id);
   if(item?.ready)appendFromLibrary(id,start,track&&(track.kind==='audio')===(item.kind==='audio')?track.id:null);
   return;
  }
  const files=Array.from(event.dataTransfer.files);
  if(!files.length)return;
  await importFiles(files,{dropAt:start,dropTrack:track});
 });
}
function enableClipDragging(){
 const container=$('tracks'),timeline=$('timeline');
 function changeForDrag(clip,state,delta){
  if(!state.edge)return {start:Math.max(0,Math.round((clip.start+delta)*100)/100)};
  const speed=clip.speed,min=.1*speed;
  if(state.edge==='end'){
   const item=media.get(clip.media);
   const limit=clip.kind==='image'||clip.kind==='title'?Math.max(7200,clip.out):item?.el.duration||clip.out;
   return {out:clamp(clip.out+delta*speed,clip.in+min,limit)};
  }
  const still=clip.kind==='image'||clip.kind==='title';
  const shift=clamp(delta,still?-clip.start:-Math.min(clip.start,clip.in/speed),Math.max(0,duration(clip)-.1));
  return still?{start:clip.start+shift,out:clip.out-shift*speed}:{start:clip.start+shift,in:clip.in+shift*speed};
 }
 container.addEventListener('pointerdown',e=>{
  const el=e.target.closest('.clip'),clip=project.clips.find(c=>c.id===el?.dataset.id);
  if(!clip||exporting||e.button!==0)return;
  dragState={id:clip.id,pointer:e.pointerId,x:e.clientX,scroll:timeline.scrollLeft,edge:e.target.closest('.clip-trim')?.dataset.edge||null,moved:false};
  el.setPointerCapture(e.pointerId);
 });
 container.addEventListener('pointermove',e=>{
  const state=dragState;
  if(!state||state.pointer!==e.pointerId)return;
  const delta=e.clientX-state.x+timeline.scrollLeft-state.scroll;
  if(Math.abs(delta)>(state.edge?2:5))state.moved=true;
  if(!state.moved)return;
  const clip=project.clips.find(c=>c.id===state.id),el=container.querySelector('.clip[data-id="'+state.id+'"]');
  if(!clip||!el)return;
  const preview={...clip,...changeForDrag(clip,state,delta/px)};
  el.style.left=preview.start*px+'px';
  el.style.width=Math.max(24,duration(preview)*px-2)+'px';
  el.querySelector('small').textContent=duration(preview).toFixed(1)+'s';
  el.classList.toggle('trimming',!!state.edge);
 });
 container.addEventListener('pointerup',e=>{
  const state=dragState;
  if(!state||state.pointer!==e.pointerId)return;
  dragState=null;
  const clip=project.clips.find(c=>c.id===state.id);
  if(!clip)return;
  if(!state.moved){if(!state.edge)selectTimelineClip(clip,e);return}
  const delta=(e.clientX-state.x+timeline.scrollLeft-state.scroll)/px;
  const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('.trackbody');
  const track=project.tracks.find(t=>t.id===row?.dataset.track);
  mutate(()=>{
   const before={...clip},change=changeForDrag(clip,state,delta);
   Object.assign(clip,change);
   if(state.edge&&before.keyframes?.length){
    const offset=clip.start-before.start;
    clip.keyframes=offset<0?before.keyframes.map(frame=>({...frame,at:frame.at-offset})):slicedKeyframes(before,offset,offset+duration(clip));
   }
   if(!state.edge&&track&&(track.kind==='audio')===(clip.kind==='audio'))clip.track=track.id;
   selected=clip.id;
  });
  status(state.edge?'Durata clip: '+duration(clip).toFixed(2)+' s':'Clip spostata sulla timeline');
 });
 container.addEventListener('pointercancel',()=>{dragState=null;refresh()});
 container.addEventListener('click',e=>{
  const el=e.target.closest('.clip');
  if(el&&e.detail===0){const clip=project.clips.find(c=>c.id===el.dataset.id);if(clip)selectTimelineClip(clip)}
  else if(e.target.matches('.trackbody'))seek((e.clientX-e.target.getBoundingClientRect().left)/px);
 });
}
function selectTimelineClip(clip,event){
 selected=clip.id;playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback();
 const body=event?.target.closest('.trackbody');
 const offset=body?(event.clientX-body.getBoundingClientRect().left)/px-clip.start:0;
 seek(clip.start+clamp(offset,0,Math.max(0,duration(clip)-.001)));refresh();
}
function setupDesktopTimeline(){
 if(modelPreviewMode)return;
 const inspector=$('inspector'),bottom=inspector.parentElement,anchor=inspector.nextSibling;
 const empty=document.createElement('div');empty.className='desktop-inspector-empty';
 empty.innerHTML='<h3>Proprietà clip</h3><p class="small">Seleziona una clip nella timeline.</p>';
 inspector.prepend(empty);
 const slider=$('timelineZoom'),timeline=$('timeline');
 const min=8,max=480;
 let desktopScale=70;
 function applyZoom(value,anchorX=timeline.clientWidth/2){
  const seconds=(timeline.scrollLeft+anchorX-64)/px;
  px=desktopScale=clamp(value,min,max);
  slider.value=Math.round(100*Math.log(px/min)/Math.log(max/min));
  slider.setAttribute('aria-valuetext',Math.round(px/70*100)+'%');
  renderTimeline();
  timeline.scrollLeft=Math.max(0,seconds*px-anchorX+64);
 }
 slider.oninput=()=>applyZoom(min*(max/min)**(Number(slider.value)/100));
 $('timelineZoomOut').onclick=()=>applyZoom(px/1.4);
 $('timelineZoomIn').onclick=()=>applyZoom(px*1.4);
 $('timelineFit').onclick=()=>{applyZoom((timeline.clientWidth-140)/Math.max(3,endTime()),64);timeline.scrollLeft=0};
 timeline.addEventListener('wheel',e=>{
  if(!desktopWorkspace.matches||(!e.ctrlKey&&!e.metaKey))return;
  e.preventDefault();applyZoom(px*Math.exp(-e.deltaY*.006),e.clientX-timeline.getBoundingClientRect().left);
 },{passive:false});
 function layout(){
  if(desktopWorkspace.matches){document.querySelector('.stage').append(inspector);applyZoom(desktopScale)}
  else{bottom.insertBefore(inspector,anchor);px=70;renderTimeline()}
 }
 desktopWorkspace.addEventListener('change',layout);layout();
}
enableClipDragging();enableAssetDrops();enableMediaDrops();setupDesktopTimeline();

$('moreSections').onclick=()=>{const p=$('sectionTools');const open=p.classList.toggle('hidden')===false;$('moreSections').setAttribute('aria-expanded',String(open));$('moreSections').textContent=open?'− Sezioni':'＋ Sezioni'};
$('addOverlay').onclick=()=>{const track=project.tracks[1]?.id||project.tracks[0].id;window.koreImportTarget=track;$('import').click();status('Seleziona un file per aggiungerlo come sovrapposizione.')};
$('addImageLayer').onclick=()=>{const track=project.tracks.at(-1)?.id||project.tracks[0].id;window.koreImportTarget=track;$('import').click();status('Seleziona un video o una foto da inserire sul livello.')};
$('addTitleLayer').onclick=()=>$('addText').click();
// API per la schermata semplice da telefono (fila di scene, Sostituisci, Ritaglia).
window.koreSimple={
 clips(){const t=project.tracks[0].id;return project.clips.filter(c=>c.track===t&&(c.kind==='video'||c.kind==='image')).sort((a,b)=>a.start-b.start).map(c=>{const m=media.get(c.media);return {id:c.id,kind:c.kind,start:c.start,dur:duration(c),in:c.in,out:c.out,url:m?.url||null,image:m?.kind==='image'?m.el:null,mediaDur:m?.kind==='video'?m.el.duration:null}})},
 selected:()=>selected,
 async sourceFile(id){const c=project.clips.find(q=>q.id===id);const m=c&&media.get(c.media);if(!m||m.kind!=='image')return null;try{const b=m.blob||await (await fetch(m.url)).blob();return new File([b],(m.name||'immagine')+'.png',{type:b.type||'image/png'})}catch(e){return null}},
 select(id){const c=project.clips.find(q=>q.id===id);if(!c)return;selected=id;refresh();seek(c.start+.05)},
 setIn(id,value){const c=project.clips.find(q=>q.id===id);if(!c||c.kind!=='video'||exporting)return;const m=media.get(c.media),len=c.out-c.in,max=Math.max(0,(m?.el?.duration||c.out)-len);mutate(()=>{c.in=Math.max(0,Math.min(max,Number(value)||0));c.out=c.in+len});seek(c.start+.05)},
 async replace(id,file){const c=project.clips.find(q=>q.id===id);if(!c||exporting||importingMedia)return false;const r=await importFiles([file],{libraryOnly:true});if(!r.imported)return false;const m=media.get(r.ids[0]);if(!m)return false;const len=c.out-c.in;mutate(()=>{c.media=r.ids[0];c.kind=m.kind;c.in=0;c.out=m.kind==='video'?Math.min(len,m.el.duration||len):len});refresh();seek(c.start+.05);return true}
};
// API per la schermata stile CapCut da telefono (timeline con cursore fisso).
window.koreCap={
 rows(){return project.tracks.map((t,i)=>({id:t.id,index:i,clips:trackClips(t.id).map(c=>{const m=media.get(c.media);return {id:c.id,kind:c.kind,start:c.start,dur:duration(c),in:c.in,out:c.out,label:c.kind==='title'?String(c.text||'Testo').split('\n')[0]:(m?.name||''),url:m?.kind==='video'?m.url:null,image:m?.kind==='image'?m.el:null,key:c.media||c.id,tr:!!c.transcriptCues}})}))},
 end:()=>endTime(),time:()=>time,playing:()=>playing,seek:t=>seek(t),toggle:()=>togglePlay(),
 selected:()=>selected,select(id){selected=id;refresh()},
 atPlayhead(){const c=project.clips.filter(c=>c.kind!=='audio'&&c.start<=time+.01&&time<c.start+duration(c)).sort((a,b)=>b.start-a.start)[0];return c?.id||null},
 async addFiles(files){if(exporting||importingMedia)return;window.koreImportTarget=null;window.koreImportDefaults=null;return importFiles(files)}
};
// Maniglie sul video (X, ruota, ridimensiona) e correzione parole dei sottotitoli, da telefono.
window.koreHandles={
 box(id){const c=project.clips.find(q=>q.id===id);if(!c||c.kind==='title'||c.autoReframe)return null;if(!(c.start<=time+.001&&time<c.start+duration(c)))return null;const m=media.get(c.media),el=m?.el,sw=m?.kind==='image'?el?.naturalWidth:el?.videoWidth,sh=m?.kind==='image'?el?.naturalHeight:el?.videoHeight;if(!sw||!sh)return null;const cv=$('preview'),cw=cv.width,ch=cv.height,cover=!['contain','blur'].includes(c.fitMode),k=(cover?Math.max:Math.min)(cw/sw,ch/sh)*(c.zoom||1);return {cx:.5+(c.x||0),cy:.5+(c.y||0),w:sw*k/cw,h:sh*k/ch,rot:c.rotation||0,kind:c.kind,zoom:c.zoom||1,rotation:c.rotation||0,canvas:cv}},
 begin(){if(!exporting)snapshot()},
 set(id,props){const c=project.clips.find(q=>q.id===id);if(!c||exporting)return;Object.assign(c,props);draw()},
 end(){persist();refresh()},
 remove(id){const c=project.clips.find(q=>q.id===id);if(!c||exporting)return;selected=id;$('remove').click()}
};
// Taglio col dito sui bordi, velocità, volume e "Togli pause" per la timeline da telefono.
{
 let trim=null;
 Object.assign(window.koreCap,{
  trimBegin(id){const c=project.clips.find(q=>q.id===id);if(!c||exporting)return null;snapshot();const m=media.get(c.media),src=m?.kind==='video'||m?.kind==='audio'||(c.kind==='title'&&!!c.transcriptCues),main=project.tracks[0]?.id===c.track;trim={id,base:{start:c.start,in:c.in,out:c.out},main,src,maxOut:(m?.kind==='video'||m?.kind==='audio')?(m.el?.duration||m.duration||Infinity):Infinity,later:main?project.clips.filter(q=>q.track===c.track&&q.id!==c.id&&q.start>=c.start+duration(c)-.001).map(q=>[q.id,q.start]):[]};return {speed:c.speed||1}},
  trimTo(side,dt){const t=trim,c=t&&project.clips.find(q=>q.id===t.id);if(!c)return null;const sp=c.speed||1,b=t.base,minD=.2,shift=d=>{for(const [id,st] of t.later){const q=project.clips.find(x=>x.id===id);if(q)q.start=Math.max(0,st+d)}};
   if(side==='r'){const out=Math.max(b.in+minD*sp,Math.min(t.maxOut,b.out+dt*sp));c.out=out;shift((out-b.out)/sp)}
   else{let d=Math.min(dt,(b.out-b.in)/sp-minD);if(t.src)d=Math.max(d,-b.in/sp);if(t.src)c.in=b.in+d*sp;else c.out=b.out-d*sp;if(t.main)shift(-d);else c.start=Math.max(0,b.start+d)}
   draw();return {start:c.start,dur:duration(c)}},
  trimEnd(){if(!trim)return;trim=null;persist();refresh()},
  info(id){const c=project.clips.find(q=>q.id===id);const m=c&&media.get(c.media);return c?{speed:c.speed||1,volume:c.volume??1,audio:m?.kind==='video'||m?.kind==='audio'}:null},
  setSpeed(id,v){const c=project.clips.find(q=>q.id===id);if(!c||exporting)return;const old=duration(c),main=project.tracks[0]?.id===c.track;mutate(()=>{c.speed=v;if(main){const d=duration(c)-old;for(const q of project.clips)if(q.track===c.track&&q.id!==c.id&&q.start>=c.start+old-.001)q.start=Math.max(0,q.start+d)}})},
  setVolume(id,v){const c=project.clips.find(q=>q.id===id);if(!c||exporting)return;mutate(()=>{c.volume=Math.max(0,Math.min(2,v))})},
  async removeSilences(id,onProgress){
   const c=project.clips.find(q=>q.id===id),m=c&&media.get(c.media);
   if(!c||!m||!['video','audio'].includes(m.kind)||!m.blob||exporting)return {error:'Seleziona un video con parlato.'};
   const limit=Math.min(300,c.out-c.in),before={in:c.in,out:c.out};
   const {samples,offset}=await koreExtractAudio(m.blob,c.in,limit,{onProgress});
   const cuts=detectSilences(samples).map(x=>({start:x.start+offset+.12,end:x.end+offset-.12})).filter(x=>x.end-x.start>=.3);
   if(!cuts.length)return {removed:0,cuts:0};
   const keeps=[];let pos=c.in;for(const x of cuts){if(x.start>pos+.3)keeps.push([pos,x.start]);pos=x.end}if(c.out-pos>.3)keeps.push([pos,c.out]);
   const cur=project.clips.find(q=>q.id===id);if(!cur||cur.in!==before.in||cur.out!==before.out)return {error:'La clip è cambiata durante l\'analisi. Riprova.'};
   const sp=c.speed||1,oldDur=duration(c),main=project.tracks[0]?.id===c.track;let removed=0;
   mutate(()=>{let at=c.start;const copies=keeps.map((k,i)=>{const copy={...clone(c),id:uid(),in:k[0],out:k[1],start:at};delete copy.keyframes;if(i>0){copy.fadeIn=0;copy.transitionDuration=0}if(i<keeps.length-1)copy.fadeOut=0;at+=(k[1]-k[0])/sp;return copy});
    const delta=at-c.start-oldDur;removed=-delta;project.clips=project.clips.filter(q=>q.id!==id);
    if(main)for(const q of project.clips)if(q.track===c.track&&q.start>=c.start+oldDur-.001)q.start=Math.max(0,q.start+delta);
    project.clips.push(...copies);selected=copies[0].id});
   return {removed,cuts:cuts.length,parts:keeps.length};
  }
 });
}
window.koreTranscript={
 find(){const c=selectedClip();const t=c&&c.transcriptCues?c:project.clips.find(q=>q.transcriptCues);return t?{id:t.id,speed:t.speed||1,start:t.start,in:t.in,cues:clone(t.transcriptCues)}:null},
 apply(id,cues){const c=project.clips.find(q=>q.id===id);if(!c||exporting)return false;mutate(()=>{c.transcriptCues=cues;c.text=cues.map(q=>q.text).join(' ')});return true},
 seek(id,src){const c=project.clips.find(q=>q.id===id);if(c)seek(c.start+Math.max(0,src-c.in)/(c.speed||1)+.02)}
};
// Sovrapposizione da telefono: sceglie (o crea) una traccia libera sopra il video e aggiunge il file ridotto e centrato, in un solo passo di cronologia.
window.koreOverlayImport=async(files,{zoom=.45,imageSeconds=4}={})=>{if(exporting||importingMedia)return {imported:0,failed:0,ids:[]};const from=time,until=time+imageSeconds;let track=project.tracks.slice(1).find(t=>!trackClips(t.id).some(c=>c.start<until&&c.start+duration(c)>from));if(!track){track={id:uid(),name:'Sovrapposizione '+project.tracks.length};project.tracks.push(track)}window.koreImportTarget=track.id;window.koreImportDefaults={props:{fitMode:'contain',zoom},imageSeconds};const result=await importFiles(files);const clip=selectedClip();return {...result,clipId:clip?.id||null}};

$('addVideoTrack').onclick=()=>$('addtrack').click();

window.addEventListener('keydown',e=>{if(e.target?.matches('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();togglePlay()}else if(e.key==='Delete'&&selectedClip()){$('remove').click()}else if(e.key.toLowerCase()==='s'&&selectedClip()){e.preventDefault();split()}else if(e.key==='ArrowLeft'){e.preventDefault();seek(time-(e.shiftKey?1:.1))}else if(e.key==='ArrowRight'){e.preventDefault();seek(time+(e.shiftKey?1:.1))}});
window.addEventListener('pagehide',()=>{if(!highlightExportActive)persist()});canvasSize();refresh();renderAssetLibrary();if(!modelPreviewMode)storageReady=initProjectStorage();
$('welcomeImport').onclick=()=>$('import').click();
$('workspaceFocus').onclick=()=>{document.body.classList.toggle('kore-focus');const active=document.body.classList.contains('kore-focus');$('workspaceFocus').textContent=active?'◩ Standard':'◩ Focus';try{localStorage.setItem('kore-focus-mode',active?'1':'0')}catch(e){}};
try{if(localStorage.getItem('kore-focus-mode')==='1'){$('workspaceFocus').click()}}catch(e){}
$('workspaceHelp').onclick=()=>$('shortcutModal').classList.remove('hidden');$('closeShortcuts').onclick=()=>$('shortcutModal').classList.add('hidden');$('shortcutModal').onclick=e=>{if(e.target===$('shortcutModal'))$('shortcutModal').classList.add('hidden')};

// Mobile: navigazione dei modelli e accesso allo stesso editor desktop.
function setupMobileHome(){
 if(modelPreviewMode)return;
 const mobile=window.matchMedia('(max-width: 759px)');
 const entries=[...SOCIAL_MIX_TEMPLATES.map(template=>({type:'social',template})),...GRAPHIC_TEMPLATES.map(template=>({type:'graphic',template}))];
 entries.sort((a,b)=>Number(!!b.template.isNew)-Number(!!a.template.isNew));
 let category='all',filtered=entries,pending=null,pendingStart=false,modelFeedReturnAt=0;
 const categorySelect=$('mobileModelCategory');for(const [value,name] of MODEL_CATEGORIES){const opt=document.createElement('option');opt.value=value;opt.textContent=name;categorySelect.append(opt)}
 function updateFilter(){modelFeedReturnAt=0;filtered=filterModelEntries(entries,category,$('mobileSearch').value);render();$('mobileModelStrip').scrollTop=0}
 categorySelect.onchange=e=>{category=e.target.value;updateFilter()};
 $('mobileModelClear').onclick=()=>{category='all';categorySelect.value='all';$('mobileSearch').value='';updateFilter()};
 const openStart=()=>{if(!mobile.matches)return;stopKoreSound();$('mobileModelStrip').querySelectorAll('iframe').forEach(f=>f.src='about:blank');document.body.classList.add('mobile-home-open');$('welcome').classList.add('hidden');$('mobileHome').classList.add('hidden');$('mobileStart').classList.remove('hidden')};
 const openHome=()=>{if(!mobile.matches)return;stopKoreSound();document.body.classList.add('mobile-home-open');$('welcome').classList.add('hidden');$('mobileStart').classList.add('hidden');$('mobileHome').classList.remove('hidden');render();requestAnimationFrame(()=>$('mobileModelStrip').scrollTo({top:modelFeedReturnAt,behavior:'instant'}))};
 const openEditor=(origin='home')=>{koreEditorReturn=origin==='models'?'models':'home';stopKoreSound();$('mobileModelStrip').querySelectorAll('iframe').forEach(f=>f.src='about:blank');document.body.classList.remove('mobile-home-open');$('welcome').classList.add('hidden');$('assetDock').classList.add('hidden')};
 function applyModel(item){modelFeedReturnAt=$('mobileModelStrip').scrollTop;openEditor('models');insertSocialMixTemplate(item.template)}
 function useModel(item){openModelPreview(item.template,item.type,()=>applyModel(item))}

 let feedObserver=null;
 function render(){
  stopKoreSound();const strip=$('mobileModelStrip');if(strip.parentElement!==$('mobileHome'))$('mobileHome').insertBefore(strip,$('mobileHome').querySelector('.mobile-nav'));feedObserver?.disconnect();strip.querySelectorAll('iframe').forEach(f=>f.src='about:blank');strip.replaceChildren();
  $('mobileModelCount').textContent=filtered.length+' modelli';
  if(!filtered.length){const empty=document.createElement('p');empty.className='mobile-model-empty';empty.textContent='Nessun modello trovato. Prova un’altra ricerca.';strip.append(empty);return}
  feedObserver=new IntersectionObserver(items=>{for(const entry of items){const card=entry.target,frame=card.querySelector('iframe');if(entry.isIntersecting&&entry.intersectionRatio>.55&&!$('mobileHome').classList.contains('hidden')){if(!frame.getAttribute('src')||frame.getAttribute('src')==='about:blank')frame.src=frame.dataset.demo}else if(frame.getAttribute('src')&&frame.getAttribute('src')!=='about:blank'){frame.src='about:blank';stopKoreSound()}}},{root:strip,threshold:[0,.55]});
  for(const [index,item] of filtered.entries()){
   const t=item.template,card=document.createElement('article');card.className='model-feed-card';card.setAttribute('aria-label','Modello '+t.name);
   card.style.backgroundImage='url(./demo-'+modelDemoSubject(t,item.type)+'.jpg)';
   const frame=document.createElement('iframe');frame.title='Anteprima animata '+t.name;frame.allow='autoplay';frame.tabIndex=-1;frame.dataset.demo='./?previewModel='+encodeURIComponent(item.type+':'+t.id);
   const info=document.createElement('div');info.className='model-feed-info';const number=document.createElement('span');number.className='model-feed-number';number.textContent=(index+1)+' / '+filtered.length;
   const title=document.createElement('h2');title.textContent=t.name;const description=document.createElement('p');description.textContent=t.description;
   const detail=document.createElement('small');detail.textContent=item.type==='social'?modelSceneCount(t)+' foto o video · '+modelScenePlan(t).reduce((sum,p)=>sum+p.seconds,0).toFixed(1)+' s':'1 foto o video · Titolo animato';
   const use=document.createElement('button');use.className='primary';use.textContent='Usa modello';use.onclick=()=>{strip.querySelectorAll('iframe').forEach(f=>f.src='about:blank');applyModel(item)};
   const hint=document.createElement('span');hint.className='model-feed-hint';hint.textContent='Scorri verso l’alto per altri modelli ↑';
   const sound=document.createElement('button');sound.type='button';sound.className='kore-sound-listen';sound.textContent='♫ Ascolta base';sound.setAttribute('aria-pressed','false');sound.onclick=()=>listenKoreSound(koreSoundFor(t),sound);const rights=document.createElement('small');rights.className='kore-sound-rights';rights.textContent='Base originale KORE · senza brani di terzi';info.append(number,title,description,detail,sound,rights,use,hint);card.append(frame,info);strip.append(card);feedObserver.observe(card);
  }
 }

 $('mobileSearch').addEventListener('input',updateFilter);
 $('mobileExportTop').onclick=()=>$('export').click();$('mobilePlay').onclick=togglePlay;$('mobileAdd').onclick=()=>{pending=null;pendingStart=false;window.koreImportTarget=null};$('mobileTimeline').onclick=()=>{const open=document.body.classList.toggle('mobile-timeline-open');$('mobileTimeline').setAttribute('aria-pressed',String(open))};$('mobileSplit').onclick=()=>{document.body.classList.add('mobile-timeline-open');$('mobileTimeline').setAttribute('aria-pressed','true');split()};$('mobileText').onclick=()=>{$('addText').click();openMobileTools()};$('mobileEffects').onclick=()=>openAssetTab('effects');$('mobileSubtitles').onclick=openMobileCaptionsMenu;$('mobileModels').onclick=openHome;$('mobileAdvanced').onclick=openMobileTools;
 $('mobileEdit').onclick=()=>openEditor('models');$('mobileHomeButton').onclick=openStart;$('mobileModelBack').textContent='‹ Indietro';$('mobileModelBack').setAttribute('aria-label','Indietro alla Home');$('mobileModelBack').onclick=openStart;$('mobileStartModels').onclick=openHome;$('mobileStartEditor').onclick=openEditor;$('mobileStartImport').onclick=()=>{pending=null;pendingStart=true;window.koreImportTarget=null};$('mobilePickCancel').onclick=()=>{pending=null;$('mobilePickDialog').classList.add('hidden')};
 const input=$('import');input.addEventListener('cancel',()=>{pending=null;pendingStart=false;$('mobilePickDialog').classList.add('hidden')});input.onchange=async e=>{$('mobilePickDialog').classList.add('hidden');const files=[...e.target.files];e.target.value='';if(files.length)$('welcome').classList.add('hidden');if(pendingStart&&files.length)openEditor();pendingStart=false;await importFiles(files,{libraryOnly:!!pending});const template=pending;pending=null;if(template&&files.length&&Array.from(media.values()).some(m=>m.ready&&(m.kind==='image'||(m.kind==='video'&&Number.isFinite(m.el?.duration)&&m.el.duration>0))))insertSocialMixTemplate(template)};
 mobile.addEventListener?.('change',e=>{if(!e.matches)document.body.classList.remove('mobile-home-open')});if(mobile.matches){render();openStart()}
}

Object.assign(effectFilters,{modernClean:'contrast(1.04) saturate(1.06)',modernEditorial:'contrast(1.1) saturate(.92)',modernWarm:'sepia(.08) saturate(1.08) contrast(1.04)',modernCool:'saturate(.95) contrast(1.06) hue-rotate(4deg)'});
for(const [id,items] of [['effect',[['modernClean','Clean Detail'],['modernEditorial','Editorial Contrast'],['modernWarm','Golden Natural'],['modernCool','Cool Studio']]],['transitionPreset',[['modernWhip','Whip fluido'],['modernPush','Push verticale'],['modernSnap','Snap zoom'],['modernTilt','Tilt reveal']]]]){const group=document.createElement('optgroup');group.label='Modern Studio';for(const [value,label] of items){const option=document.createElement('option');option.value=value;option.textContent=label;group.append(option)}$(id).append(group)}
SOCIAL_MIX_TEMPLATES.unshift({id:'modern-studio',name:'Modern Studio',preview:'MODERN',description:'6 scene · foto nitide e movimenti fluidi',category:'trendy',isNew:true,color:'#f6a6d6',duration:1.8,count:6,zoom:1,transitions:['modernWhip','modernSnap','modernPush','modernTilt'],effects:['modernClean','modernEditorial','modernWarm','modernCool']});


// Expanded original media effects and transitions.
Object.assign(effectFilters,{"filmEditClean": "contrast(1.12) saturate(1.18)", "filmEditMocha": "sepia(.25) saturate(.85) contrast(1.08)", "filmEditEmerald": "sepia(.15) hue-rotate(25deg) saturate(1.1) contrast(1.15)", "filmEditArctic": "saturate(.8) hue-rotate(15deg) brightness(1.06)", "filmEditRose": "sepia(.12) hue-rotate(315deg) saturate(1.14)", "filmEditBronze": "sepia(.38) saturate(1.2) contrast(1.12)", "filmEditChalk": "grayscale(.2) contrast(.86) brightness(1.1)", "filmEditInk": "grayscale(1) contrast(1.5) brightness(.92)", "filmEditElectric": "saturate(1.65) contrast(1.2)", "filmEditMilk": "saturate(.72) contrast(.9) brightness(1.12)", "filmEditCopper": "sepia(.3) saturate(1.3) brightness(.85)", "filmEditMint": "sepia(.1) hue-rotate(45deg) saturate(.85)", "filmEditHoney": "sepia(.22) saturate(1.12) brightness(1.1)", "filmEditSteel": "grayscale(.45) contrast(1.24)", "filmEditBerry": "hue-rotate(330deg) saturate(1.3) contrast(1.08)", "filmEditSilver": "grayscale(.8) contrast(1.2) brightness(1.05)"});
for(const [id,items] of [["effect", [["filmEditClean", "Clean Pop"], ["filmEditMocha", "Mocha Film"], ["filmEditEmerald", "Emerald Cinema"], ["filmEditArctic", "Arctic Blue"], ["filmEditRose", "Rose Editorial"], ["filmEditBronze", "Bronze Hour"], ["filmEditChalk", "Chalk Matte"], ["filmEditInk", "Ink Noir"], ["filmEditElectric", "Electric Pop"], ["filmEditMilk", "Milky Pastel"], ["filmEditCopper", "Copper Night"], ["filmEditMint", "Mint Editorial"], ["filmEditHoney", "Honey Light"], ["filmEditSteel", "Steel Urban"], ["filmEditBerry", "Berry Pop"], ["filmEditSilver", "Silver Screen"], ["motionEditPush", "Slow Push"], ["motionEditPull", "Slow Pull"], ["motionEditHandheld", "Handheld Cinema"], ["motionEditOrbit", "Orbit Soft"], ["motionEditBeat", "Beat Zoom"], ["motionEditSwing", "Swing Flow"], ["motionEditBreath", "Breathing Zoom"], ["motionEditJitter", "Micro Jitter"], ["fxEditPrism", "Prism Light"], ["fxEditRays", "Light Rays"], ["fxEditSpark", "Sparkle"], ["fxEditDust", "Floating Dust"], ["fxEditFrame", "Neon Frame"], ["fxEditCinema", "Cinema Bars"], ["fxEditSlices", "Digital Slices"], ["fxEditGradient", "Aurora Wash"]]], ["transitionPreset", [["editpush0", "Push sinistra"], ["editpush1", "Push destra"], ["editpush2", "Push alto"], ["editpush3", "Push basso"], ["editwhip0", "Whip sinistra"], ["editwhip1", "Whip destra"], ["editwhip2", "Whip alto"], ["editwhip3", "Whip basso"], ["editwipe0", "Reveal sinistra"], ["editwipe1", "Reveal destra"], ["editwipe2", "Reveal alto"], ["editwipe3", "Reveal basso"], ["editzoom0", "Zoom punch"], ["editzoom1", "Zoom pull"], ["editzoom2", "Zoom bounce"], ["editzoom3", "Zoom smooth"], ["editspin0", "Spin orario"], ["editspin1", "Spin antiorario"], ["editsplit0", "Split verticale"], ["editsplit1", "Split orizzontale"]]]]){const group=document.createElement("optgroup");group.label="KORE Edit Lab · Nuovi";for(const [value,label] of items){const option=document.createElement("option");option.value=value;option.textContent=label;group.append(option)}$(id).append(group)}
const studioGroup=document.createElement('optgroup');studioGroup.label='KORE Studio · Nuovi effetti';for(const [value,label] of STUDIO_VIDEO_EFFECTS)studioGroup.append(new Option(label,value));const studioLooks={filmStudioPearl:['Pearl White','brightness(1.08) contrast(.94) saturate(.88)'],filmStudioTeal:['Teal Editorial','sepia(.16) hue-rotate(145deg) saturate(.85) contrast(1.12)'],filmStudioCherry:['Cherry Film','sepia(.12) hue-rotate(320deg) saturate(1.3) contrast(1.08)'],filmStudioChampagne:['Champagne','sepia(.25) saturate(.9) brightness(1.06)'],filmStudioFrost:['Frost Silver','grayscale(.35) contrast(1.12) brightness(1.06)'],filmStudioOlive:['Olive Mood','sepia(.22) hue-rotate(22deg) saturate(.8) contrast(1.06)']};for(const [value,[label,filter]] of Object.entries(studioLooks)){effectFilters[value]=filter;studioGroup.append(new Option(label,value))}$('effect').append(studioGroup);renderAssetLibrary();
setupMobileHome();

document.addEventListener('visibilitychange',()=>{if(document.hidden)stopKoreSound();if(modelPreviewMode){playing=!document.hidden;lastTick=0;return}if(document.hidden&&playing&&!exporting){playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback();status('Riproduzione in pausa: torna a KORE e tocca Riproduci.')}});

$('mobileApplyUndo').onclick=()=>{$('undo').click();$('mobileApplyToast').classList.add('hidden')};

async function runModelDemo(){
 if(!modelPreviewMode)return;document.body.classList.add('model-demo-mode');
 const [type,id]=modelPreviewMode.split(':'),template=(type==='social'?SOCIAL_MIX_TEMPLATES:GRAPHIC_TEMPLATES).find(t=>t.id===id);if(!template)return;
 project={tracks:[{id:'v1',name:'Video'},{id:'v2',name:'Titoli'}],clips:[],ratio:'9:16'};time=0;
 try{const subject=modelDemoSubject(template,type);const response=await fetch('./demo-'+subject+'.jpg');if(!response.ok)throw Error('Immagine demo non disponibile');await loadMedia('demo0',await response.blob(),'Esempio '+subject,'image');
 if(type==='graphic'){project.clips.push({id:'background',media:'demo0',track:'v1',start:0,in:0,out:4,speed:1,zoom:1.05,opacity:1,x:0,y:0,rotation:0,sceneBackdrop:true});insertGraphicTemplate(template);project.clips.find(c=>c.kind==='title').out=4}else{let cursor=0;for(let i=0;i<4;i++){const length=modelScenePlan(template)[i%modelSceneCount(template)].seconds;const c={id:'scene'+i,media:'demo0',track:'v1',start:cursor,in:0,out:length,speed:1,zoom:template.zoom,opacity:1,x:0,y:0,rotation:0,volume:0,sceneBackdrop:true,effect:template.effects[i%template.effects.length],transitionPreset:template.transitions[i%template.transitions.length],transitionDuration:Math.min(.42,length*.3),fadeIn:.05,fadeOut:.05,keyframes:[{at:0,x:-.018,y:0,zoom:template.zoom,rotation:0,opacity:1},{at:length,x:.018,y:0,zoom:template.zoom+.08,rotation:0,opacity:1}],keyframeEasing:'smooth'};project.clips.push(c);cursor+=length}}

 canvasSize();time=.18;refresh();playing=true;lastTick=0;syncVideoPlayback(true);
 }catch(e){const message=document.createElement('p');message.className='demo-error';message.textContent='Anteprima non disponibile. Chiudi e riprova.';document.body.append(message)}
}
runModelDemo();


function setupAudioAndQuality(){
 document.addEventListener('pointerdown',()=>{if(!exporting)unlockPreviewAudio()},{once:true});
 const input=document.createElement('input');
 input.type='file';input.id='audioImport';input.accept=audioAccept;input.multiple=true;
 input.tabIndex=-1;input.setAttribute('aria-label','File audio');
 input.style.cssText='position:fixed;width:1px;height:1px;opacity:0;overflow:hidden;clip-path:inset(50%);pointer-events:none';
 document.body.append(input);
 let stageAudio=false;
 input.onchange=async()=>{
  const files=[...input.files];input.value='';
  if(!files.length)return;
  if(files.some(file=>mediaKind(file)!=='audio'))return editorInfo('Scegli un file audio, per esempio MP3, M4A/AAC o WAV.');
  $('welcome').classList.add('hidden');
  if(document.body.classList.contains('mobile-home-open'))$('mobileStartEditor').click();
  const result=await importFiles(files,{libraryOnly:stageAudio});
  if(result.imported)status(result.imported+' audio aggiunti alla timeline. Premi Riproduci per ascoltare; seleziona la clip per volume e dissolvenze.');
  if(!result.imported)editorInfo('Impossibile leggere l’audio scelto. Verifica che sia scaricato sul dispositivo e prova un MP3, M4A/AAC o WAV.');
  else if(window.matchMedia('(max-width: 759px)').matches&&!$('mobileTimeline').matches('[aria-pressed=true]'))$('mobileTimeline').click();
 };
 for(const host of [$('showMedia')?.parentElement,$('mobileEditorBar'),$('dockImport')?.parentElement]){
  if(!host)continue;
  const button=document.createElement('button');
  button.type='button';button.className='audio-import-button';button.textContent='♫ Importa audio';
  button.onclick=()=>{
   if(exporting||importingMedia)return;
   window.koreImportTarget=null;
   stageAudio=false;
   input.click();
  };
  if(host===$('mobileEditorBar'))$('mobileAdd').after(button);
  else if(host===$('dockImport')?.parentElement)$('dockImport').after(button);
  else $('add').after(button);
 }
 for(const host of [$('showMedia')?.parentElement,$('mobileEditorBar')]){
  if(!host)continue;
  const quality=document.createElement('button');quality.type='button';quality.className='preview-quality';quality.textContent='Anteprima Full HD';
  quality.title='720p HD / 1080p Full HD. Una risoluzione maggiore richiede più potenza.';
  quality.onclick=()=>{if(exporting)return;previewResolution=previewResolution===720?1080:720;canvasSize();draw();document.querySelectorAll('.preview-quality').forEach(b=>b.textContent=previewResolution===1080?'Anteprima Full HD':'Anteprima HD');status('Anteprima '+canvas.width+' × '+canvas.height+' · Export indipendente dalla qualità anteprima')};
  host.append(quality);
 }
}
setupAudioAndQuality();

function setupKoreBack(){
 if(modelPreviewMode)return;
 const back=document.createElement('button');back.id='koreEditorBack';back.type='button';back.textContent='‹ Indietro';back.setAttribute('aria-label','Torna alla schermata precedente');
 back.onclick=()=>{if(exporting)return status('Attendi la fine dell’esportazione.');stopKoreSound();if(!$('mobileTools').classList.contains('hidden')){closeMobileTools();return}if(!$('assetDock').classList.contains('hidden')){$('dockClose').click();return}if(playing){playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback()}if(window.matchMedia('(max-width: 759px)').matches){$(koreEditorReturn==='models'?'mobileModels':'mobileHomeButton').click()}else{$('welcome').classList.remove('hidden')}};
 document.querySelector('header').prepend(back);
 // Keep existing close handlers, including cancellation/cleanup, behind a visible back action.
 const observer=new MutationObserver(()=>{for(const dialog of document.querySelectorAll('.kore-caption-dialog:not(.hidden),.model-preview-dialog')){if(dialog.querySelector('.kore-dialog-back,.phone-picker-head,.picker-head'))continue;const candidates=[...dialog.querySelectorAll('button')];const close=candidates.find(b=>/^(Chiudi|Annulla|Indietro|‹ Indietro|← Indietro)$/.test(b.textContent.trim()));if(!close)continue;const b=document.createElement('button');b.type='button';b.className='kore-dialog-back';b.textContent='‹ Indietro';b.onclick=()=>{stopKoreSound();close.click()};(dialog.querySelector('.kore-caption-panel,.model-preview-panel')||dialog).prepend(b)}});
 observer.observe(document.body,{childList:true,subtree:true});
}
setupKoreBack();

setupEffectStack();setupSmartTools();syncAdvancedControls();

function highlightWindows(samples,duration,requested,length){
 const span=Math.min(length,duration);
 const candidates=samples.map(({at,score})=>{
  const start=clamp(at-span*.4,0,duration-span);
  return {start,end:start+span,score};
 }).sort((a,b)=>b.score-a.score||a.start-b.start);
 const result=[];
 for(const candidate of candidates){
  if(result.some(item=>Math.min(item.end,candidate.end)-Math.max(item.start,candidate.start)>.2))continue;
  result.push(candidate);
  if(result.length===requested)break;
 }
 return result.sort((a,b)=>a.start-b.start);
}
async function highlightAudio(blob,duration){
 if(blob.size>80*1024*1024||duration>1200)return null;
 const AudioCtor=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!AudioCtor)return null;
 try{
  const audio=await new AudioCtor(1,1,16000).decodeAudioData(await blob.arrayBuffer());
  const channel=audio.getChannelData(0),rate=audio.sampleRate;
  return at=>{
   const from=Math.max(0,Math.floor((at-.35)*rate)),to=Math.min(channel.length,Math.ceil((at+.35)*rate));
   let total=0,count=0;
   for(let i=from;i<to;i+=16){total+=channel[i]**2;count++}
   return count?Math.sqrt(total/count):0;
  };
 }catch{return null}
}
async function scanHighlights(item,requested,length,report,signal){
 const source=document.createElement('video');
 source.muted=true;source.playsInline=true;source.preload='auto';
 const frame=document.createElement('canvas');frame.width=48;frame.height=27;
 const read=frame.getContext('2d',{willReadFrequently:true});
 try{
  await waitForVideoSample(source,'loadeddata',()=>{source.src=item.url;source.load()});
  const duration=source.duration;
  if(!Number.isFinite(duration)||duration<.4)throw Error('Il video deve durare almeno 0,4 secondi.');
  const audio=await highlightAudio(item.blob,duration);
  const samples=[],count=Math.min(440,Math.max(2,Math.ceil(duration/.6)));
  const last=Math.max(0,duration-.08);
  for(let index=0;index<count;index++){
   signal.throwIfAborted();
   const at=index*last/(count-1);
   if(Math.abs(source.currentTime-at)>.015)await waitForVideoSample(source,'seeked',()=>{source.currentTime=at});
   read.drawImage(source,0,0,48,27);
   const data=read.getImageData(0,0,48,27).data;
   const gray=new Float32Array(data.length/4);
   const previous=samples.at(-1)?.gray;
   let change=0;
   for(let i=0;i<gray.length;i++){
    const j=i*4;
    gray[i]=.21*data[j]+.72*data[j+1]+.07*data[j+2];
    if(previous)change+=Math.abs(gray[i]-previous[i]);
   }
   if(previous)delete samples.at(-1).gray;
   samples.push({at,gray,motion:change/(gray.length*255),sound:audio?.(at)||0});
   if(index%8===0){report(Math.round(100*(index+1)/count));await new Promise(requestAnimationFrame)}
  }
  const peaks=key=>[...samples].sort((a,b)=>a[key]-b[key])[Math.floor((samples.length-1)*.9)][key];
  const motionPeak=Math.max(.035,peaks('motion')),soundPeak=Math.max(.025,peaks('sound'));
  for(const [i,sample] of samples.entries()){
   const nearby=samples.slice(Math.max(0,i-1),i+2);
   sample.score=nearby.reduce((sum,point)=>sum+Math.min(2,point.motion/motionPeak)*.72+Math.min(2,point.sound/soundPeak)*.28,0)/nearby.length;
  }
  return {windows:highlightWindows(samples,duration,requested,length),audio:!!audio,duration,step:last/(count-1)};
 }finally{source.removeAttribute('src');source.load()}
}
function saveHighlightFile(blob,name){
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
const highlightCrcTable=Uint32Array.from({length:256},(_,index)=>{
 let crc=index;
 for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 return crc>>>0;
});
async function zipHighlightFiles(files){
 const parts=[],central=[];let offset=0,centralSize=0;
 const encoder=new TextEncoder();
 for(const {name,blob} of files){
  const filename=encoder.encode(name),reader=blob.stream().getReader();let crc=0xffffffff;
  for(;;){const {done,value}=await reader.read();if(done)break;for(const byte of value)crc=(crc>>>8)^highlightCrcTable[(crc^byte)&255]}
  crc=(crc^0xffffffff)>>>0;
  const record=(size,signature)=>{const bytes=new Uint8Array(size+filename.length),view=new DataView(bytes.buffer);view.setUint32(0,signature,true);bytes.set(filename,size);return [bytes,view]};
  const [local,a]=record(30,0x04034b50);
  a.setUint16(4,20,true);a.setUint16(12,33,true);a.setUint32(14,crc,true);a.setUint32(18,blob.size,true);a.setUint32(22,blob.size,true);a.setUint16(26,filename.length,true);
  const [directory,b]=record(46,0x02014b50);
  b.setUint16(4,20,true);b.setUint16(6,20,true);b.setUint16(14,33,true);b.setUint32(16,crc,true);b.setUint32(20,blob.size,true);b.setUint32(24,blob.size,true);b.setUint16(28,filename.length,true);b.setUint32(42,offset,true);
  offset+=local.length+blob.size;centralSize+=directory.length;
  if(offset+centralSize>0xffffffff)throw Error('Archivio troppo grande. Esporta meno estratti alla volta.');
  parts.push(local,blob);central.push(directory);
 }
 const tail=new DataView(new ArrayBuffer(22));
 tail.setUint32(0,0x06054b50,true);tail.setUint16(8,files.length,true);tail.setUint16(10,files.length,true);
 tail.setUint32(12,centralSize,true);tail.setUint32(16,offset,true);
 return new Blob([...parts,...central,tail.buffer],{type:'application/zip'});
}
function openHighlights(reelMode=false){
 if(exporting||$('highlightsDialog'))return;
 playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback();
 const dialog=document.createElement('dialog');dialog.id='highlightsDialog';if(reelMode)dialog.className='reel-mode';dialog.setAttribute('aria-labelledby','highlightsTitle');
 dialog.innerHTML=`<div class="highlight-header"><h2 id="highlightsTitle">${reelMode?'Crea Reel':'Trova i momenti migliori'}</h2><button type="button" id="highlightClose" aria-label="Chiudi">✕</button></div>
 <div class="highlight-settings"><label>Video del progetto <select id="highlightSource"></select></label><label>Oppure scegli un video <input id="highlightFile" type="file" accept="video/*,.mp4,.mov,.webm,.m4v"></label>
 <label>Numero di estratti <input id="highlightCount" type="number" min="1" max="12" value="5"></label><label>Durata indicativa (s) <input id="highlightLength" type="number" min="2" max="60" value="12"></label></div>
 <button type="button" id="highlightAnalyze" class="primary">Cerca estratti</button>
 <p id="highlightStatus" role="status" aria-live="polite">Suggerimenti basati sull’attività del video e, quando disponibile, sull’audio.</p>
 <div id="reelStage" class="${reelMode?'reel-stage hidden':''}"><video id="highlightPreview" class="hidden" controls playsinline preload="metadata"></video><div id="reelOverlay" class="hidden" aria-hidden="true"></div><div id="reelGuide" class="reel-guide hidden" aria-hidden="true"></div></div>
 <div id="reelReview" class="reel-review hidden"><div class="reel-tabs" role="group" aria-label="Versioni Reel"><button type="button" data-reel="0">Azione</button><button type="button" data-reel="1">Recap</button><button type="button" data-reel="2">Storia</button></div><button type="button" id="reelPlay">Riproduci Reel</button><label>Titolo <input id="reelTitle" type="text" maxlength="64" placeholder="Scrivi un titolo"></label><label><input id="reelSafe" type="checkbox"> Mostra area sicura social</label></div>
 <div id="highlightList"></div>
 <div class="highlight-actions hidden" id="highlightActions"><label>Formato <select id="highlightRatio"><option value="source">Come il video</option><option value="9:16">Verticale 9:16</option><option value="16:9">Orizzontale 16:9</option><option value="1:1">Quadrato</option></select></label><button type="button" id="highlightMontage">Scarica montaggio</button><button type="button" id="highlightZip">Scarica clip (ZIP)</button></div>`;
 document.body.append(dialog);dialog.showModal();
 const get=id=>dialog.querySelector('#'+id),source=get('highlightSource'),file=get('highlightFile'),preview=get('highlightPreview'),list=get('highlightList'),message=get('highlightStatus');
 const controller=new AbortController();
 let importedUrl=null,item=null,results=[],busy=false,exportBusy=false,previewEnd=null;
 let variants=[],pool=[],reelIndex=0,sequenceIndex=-1,scanDuration=0,touchStart=null;
 if(reelMode){
  get('highlightCount').closest('label').hidden=true;
  get('highlightLength').closest('label').hidden=true;
  get('highlightAnalyze').textContent='Crea tre proposte';
  get('highlightMontage').textContent='Scarica Reel';
  get('highlightRatio').value='9:16';
  get('highlightRatio').closest('label').hidden=true;
  get('highlightZip').hidden=true;
  get('reelTitle').oninput=()=>{
   const title=get('reelTitle').value.trim();
   variants[reelIndex].title=title;
   get('reelOverlay').textContent=title;
   get('reelOverlay').classList.toggle('hidden',!title);
  };
  get('reelSafe').onchange=event=>get('reelGuide').classList.toggle('hidden',!event.target.checked);
  for(const tab of dialog.querySelectorAll('[data-reel]'))tab.onclick=()=>chooseReel(Number(tab.dataset.reel),true);
  get('reelPlay').onclick=()=>{sequenceIndex=0;startPreview(results[0],true)};
  const stage=get('reelStage');
  stage.addEventListener('touchstart',event=>{
   const point=event.changedTouches[0];touchStart={x:point.clientX,y:point.clientY};
  },{passive:true});
  stage.addEventListener('touchend',event=>{
   if(!touchStart||!variants.length||busy)return;
   const point=event.changedTouches[0],dx=point.clientX-touchStart.x,dy=point.clientY-touchStart.y;
   touchStart=null;
   if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.35)chooseReel((reelIndex+(dx<0?1:2))%3,true);
  },{passive:true});
 }
 function buildReels(windows,duration){
  pool=windows;
  const make=(length,limit,mode)=>{
   const ranked=[...windows].sort((a,b)=>b.score-a.score||a.start-b.start);
   const available=(mode==='story'?[windows[0],windows.at(-1),...ranked]:ranked).filter(Boolean);
   const chosen=[];
   for(const row of available){
    if(chosen.includes(row))continue;
    chosen.push(row);if(chosen.length===limit)break;
   }
   if(mode!=='action')chosen.sort((a,b)=>a.start-b.start);
   return chosen.map(row=>reelRow(row,length,duration));
  };
  return [{title:'Azione',rows:make(3,5,'action')},{title:'Recap',rows:make(5,4,'recap')},{title:'Storia',rows:make(8,3,'story')}];
 }
 function reelRow(row,length,duration){
  const span=Math.min(length,duration);
  const start=clamp((row.start+row.end-span)/2,0,duration-span);
  return {start,end:start+span,approved:true,sourceStart:row.start};
 }
 function chooseReel(index,autoplay){
  if(!variants[index]||busy&&results.length)return;
  reelIndex=index;results=variants[index].rows;preview.pause();previewEnd=null;sequenceIndex=-1;
  for(const tab of dialog.querySelectorAll('[data-reel]'))tab.setAttribute('aria-pressed',String(Number(tab.dataset.reel)===index));
  get('reelTitle').value=variants[index].title;get('reelTitle').oninput();
  showResults(scanDuration);
  if(autoplay&&results.length){sequenceIndex=0;startPreview(results[0],true)}
  else if(results.length)preview.currentTime=results[0].start;
 }
 source.append(new Option('Seleziona un video',''));
 for(const entry of media.values())if(entry.kind==='video'&&entry.ready)source.append(new Option(entry.name,entry.id));
 if(media.get(selectedClip()?.media)?.kind==='video')source.value=selectedClip().media;
 function release(){controller.abort();preview.pause();preview.removeAttribute('src');preview.load();if(importedUrl)URL.revokeObjectURL(importedUrl);dialog.remove()}
 get('highlightClose').onclick=()=>{if(!exportBusy)dialog.close()};
 dialog.oncancel=event=>{if(exportBusy)event.preventDefault()};
 dialog.onclose=release;
 preview.ontimeupdate=()=>{
  if(previewEnd===null||preview.currentTime<previewEnd)return;
  previewEnd=null;
  if(sequenceIndex>=0&&results[sequenceIndex+1]){sequenceIndex++;startPreview(results[sequenceIndex],true)}
  else{sequenceIndex=-1;preview.pause()}
 };
 function startPreview(row,inSequence=false){
  if(!row)return;
  if(!inSequence)sequenceIndex=-1;
  preview.currentTime=row.start;previewEnd=row.end;
  preview.play().catch(()=>{message.textContent='Premi Riproduci nel lettore per vedere l’estratto.'});
 }
 function refreshExportButtons(){
  const selected=results.filter(row=>row.approved&&row.end-row.start>=.25);
  get('highlightMontage').disabled=get('highlightZip').disabled=busy||!selected.length;
 }
 function showResults(duration){
  list.replaceChildren();
  results.forEach((row,index)=>{
   const entry=document.createElement('fieldset');entry.className='highlight-entry';
   if(reelMode){
    const legend=document.createElement('legend');legend.textContent='Clip '+(index+1);
    const range=document.createElement('span');range.textContent=row.start.toFixed(1)+'–'+row.end.toFixed(1)+' s';
    const replace=document.createElement('button');replace.type='button';replace.textContent='Sostituisci';
    const candidates=pool.filter(other=>!results.some((entry,i)=>i!==index&&entry.sourceStart===other.start));
    replace.disabled=candidates.length<2;
    replace.onclick=()=>{
     const next=(candidates.findIndex(candidate=>candidate.start===row.sourceStart)+1)%candidates.length;
     results[index]=reelRow(candidates[next],[3,5,8][reelIndex],duration);
     showResults(duration);startPreview(results[index]);
    };
    entry.append(legend,range,replace);list.append(entry);return;
   }
   entry.innerHTML=`<legend>Estratto ${index+1}</legend><label><input type="checkbox" checked> Includi</label><label>Inizio (s) <input type="number" min="0" step=".01"></label><label>Fine (s) <input type="number" min="0" step=".01"></label><button type="button">Riproduci</button><button type="button">Scarica</button>`;
   const [approved,start,end]=entry.querySelectorAll('input'),[play,download]=entry.querySelectorAll('button');
   start.value=row.start.toFixed(2);end.value=row.end.toFixed(2);start.max=end.max=duration.toFixed(2);
   approved.onchange=()=>{row.approved=approved.checked;refreshExportButtons()};
   const update=()=>{
    row.start=clamp(start.valueAsNumber||0,0,duration-.25);
    row.end=clamp(end.valueAsNumber||duration,row.start+.25,duration);
    start.value=row.start.toFixed(2);end.value=row.end.toFixed(2);
   };
   start.onchange=end.onchange=update;
   play.onclick=()=>{update();startPreview(row)};
   download.onclick=()=>{update();exportRows([row],'single',index+1)};
   list.append(entry);
  });
  get('highlightActions').classList.toggle('hidden',!results.length);refreshExportButtons();
 }
 source.onchange=()=>{if(source.value)file.value=''};
 file.onchange=()=>{if(file.files.length)source.value=''};
 get('highlightAnalyze').onclick=async()=>{
  if(busy||exporting)return;
  const selectedFile=file.files[0];
  if(!selectedFile&&!source.value){message.textContent='Scegli un video da analizzare.';return}
  if(selectedFile&&mediaKind(selectedFile)!=='video'){message.textContent='Scegli un file video leggibile, per esempio MP4.';return}
  busy=true;get('highlightAnalyze').disabled=true;preview.pause();preview.removeAttribute('src');preview.load();preview.classList.add('hidden');list.replaceChildren();results=[];get('highlightActions').classList.add('hidden');previewEnd=null;
  if(importedUrl){URL.revokeObjectURL(importedUrl);importedUrl=null}
  item=selectedFile?{id:uid(),name:selectedFile.name,blob:selectedFile,url:importedUrl=URL.createObjectURL(selectedFile)}:media.get(source.value);
  get('reelStage').classList.toggle('hidden',reelMode);get('reelReview').classList.add('hidden');
  message.textContent='Preparazione del video…';
  try{
   const scan=await scanHighlights(item,reelMode?12:clamp(Math.round(Number(get('highlightCount').value)||5),1,12),reelMode?3:clamp(Number(get('highlightLength').value)||12,2,60),progress=>{message.textContent='Analisi del video · '+progress+'%'},controller.signal);
   if(controller.signal.aborted)return;
   scanDuration=scan.duration;results=reelMode?[]:scan.windows.map(row=>({...row,approved:true}));
   preview.src=item.url;preview.classList.remove('hidden');
   message.textContent=results.length+' estratti suggeriti · '+(scan.audio?'movimento e audio':'movimento')+'. Rivedi i tagli prima di scaricare.'+(scan.step>2?' Il video lungo è stato campionato ogni '+scan.step.toFixed(1)+' s.':'');
   if(reelMode){
    variants=buildReels(scan.windows,scan.duration);
    get('reelStage').classList.remove('hidden');get('reelReview').classList.remove('hidden');
    message.textContent='Scorri sull’anteprima o tocca una versione. Puoi sostituire ogni clip.';
    chooseReel(0,false);
   }else showResults(scan.duration);
  }catch(error){if(!controller.signal.aborted)message.textContent='Analisi non riuscita: '+error.message}
  finally{busy=false;get('highlightAnalyze').disabled=false;refreshExportButtons()}
 };
 function exportProjectFor(rows){
  let cursor=0;
  const chosen=get('highlightRatio').value;
  const clips=rows.map(row=>{
   const clip={id:uid(),kind:'video',media:item.id,track:'v1',start:cursor,in:row.start,out:row.end,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:0,effect:'original'};
   cursor+=row.end-row.start;return clip;
  });
  const tracks=[{id:'v1',name:'Video'}];
  const title=reelMode?variants[reelIndex].title:'';
  if(title&&cursor){
   tracks.push({id:'v2',name:'Titolo'});
   clips.push({id:uid(),kind:'title',track:'v2',start:0,in:0,out:cursor,speed:1,opacity:1,zoom:1,rotation:0,x:0,y:-.31,text:title,fontSize:48,fontFamily:'outfit',fontColor:'#ffffff',fontStroke:'#161018',effect:'original'});
  }
  return {tracks,clips,ratio:reelMode?'9:16':chosen==='source'?preview.videoWidth+':'+preview.videoHeight:chosen};
 }
 async function exportRows(rows,mode,index=1){
  if(busy||exporting||!rows.length||!item)return;
  if(!preview.videoWidth){message.textContent='Attendi che il lettore abbia caricato il video.';return}
  busy=exportBusy=highlightExportActive=true;preview.pause();
  const controls=[...dialog.querySelectorAll('button,input,select')].filter(control=>!control.disabled);
  controls.forEach(control=>control.disabled=true);
  const savedProject=project,savedSelection=selected,savedTime=time;
  const temporary=!media.has(item.id),files=[];
  try{
   if(temporary)await loadMedia(item.id,item.blob,item.name,'video');
   const batches=mode==='zip'?rows.map(row=>[row]):[rows];
   for(const [position,batch] of batches.entries()){
    const label=mode==='zip'?'Estratto '+(position+1)+'/'+batches.length:'Esportazione';
    project=exportProjectFor(batch);selected=null;
    const result=await exportVideo({download:false,onProgress:text=>{message.textContent=label+' · '+text}});
    if(!result)throw Error($('status').textContent.replace(/^Esportazione non riuscita: /,''));
    const name=mode==='montage'?(reelMode?'KORE-Reel.':'KORE-Momenti-migliori.')+result.extension:'KORE-Estratto-'+String(mode==='zip'?position+1:index).padStart(2,'0')+'.'+result.extension;
    files.push({name,blob:result.blob});
   }
   if(mode==='zip'){message.textContent='Preparazione archivio…';saveHighlightFile(await zipHighlightFiles(files),'KORE-Estratti.zip')}
   else saveHighlightFile(files[0].blob,files[0].name);
   message.textContent=mode==='zip'?files.length+' estratti pronti nel file ZIP.':'Video scaricato.';
  }catch(error){message.textContent='Esportazione non riuscita: '+error.message}
  finally{
   project=savedProject;selected=savedSelection;time=savedTime;
   if(temporary){const loaded=media.get(item.id);if(loaded){loaded.el.pause();loaded.el.remove();URL.revokeObjectURL(loaded.url);media.delete(item.id)}}
   syncVideoPlayback(true);canvasSize();refresh();busy=exportBusy=highlightExportActive=false;
   controls.forEach(control=>control.disabled=false);refreshExportButtons();
  }
 }
 get('highlightMontage').onclick=()=>exportRows(results.filter(row=>row.approved),'montage');
 get('highlightZip').onclick=()=>exportRows(results.filter(row=>row.approved),'zip');
}
$('openHighlights').onclick=()=>openHighlights();
$('startHighlights').onclick=()=>openHighlights();
$('mobileHighlights').onclick=()=>openHighlights();
$('startPhotoEditor').onclick=()=>{stopKoreSound();if(playing){playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback()}openPhotoEditor()};
$('mobilePhotoEditor').onclick=()=>$('startPhotoEditor').click();

installMobileExperience({openProjects:openSceneDrafts,modelCount:SOCIAL_MIX_TEMPLATES.length+GRAPHIC_TEMPLATES.length});

const normalizeButton=document.createElement('button');normalizeButton.type='button';normalizeButton.id='normalizeAudio';normalizeButton.textContent='Uniforma volume audio';$('volumeWrap').after(normalizeButton);
normalizeButton.onclick=async()=>{const clip=selectedClip(),item=clip&&media.get(clip.media);if(!clip||item?.kind!=='audio'||!item.blob)return status('Seleziona una traccia audio per uniformarne il volume.');if(exporting)return;const original={id:clip.id,media:clip.media,in:clip.in,out:clip.out};normalizeButton.disabled=true;let context;try{status('Analisi e uniformazione audio sul dispositivo…');const C=window.AudioContext||window.webkitAudioContext;context=new C();const buffer=await context.decodeAudioData(await item.blob.arrayBuffer());if(buffer.duration>300)throw Error('Per questa funzione usa file audio fino a 5 minuti.');const processed=encodeNormalizedWav(buffer);const current=project.clips.find(c=>c.id===original.id);if(exporting||!current||current.media!==original.media||current.in!==original.in||current.out!==original.out)throw Error('La clip è cambiata: ripeti l’operazione.');const file=new File([processed.blob],item.name.replace(/\.[^.]+$/,'')+'-volume-KORE.wav',{type:'audio/wav'}),result=await importFiles([file],{libraryOnly:true});if(!result.imported)throw Error('Audio elaborato non importabile.');const target=project.clips.find(c=>c.id===original.id);if(exporting||!target||target.media!==original.media)throw Error('Clip cambiata: trovi l’audio elaborato nella libreria.');mutate(()=>{target.media=result.ids[0];target.volume=1;selected=target.id});status('Volume uniformato. L’audio originale resta disponibile e puoi annullare.')}catch(error){status('Uniformazione non riuscita: '+error.message)}finally{await context?.close();normalizeButton.disabled=false}};

installEntryMenu();

const phoneAsrShortcut=document.createElement('button');phoneAsrShortcut.type='button';phoneAsrShortcut.id='phoneAsrShortcut';phoneAsrShortcut.textContent='✦ Sottotitoli AI';phoneAsrShortcut.onclick=openVideoTranscriber;$('phoneMoreGrid').prepend(phoneAsrShortcut);

let koreBackupBusy=false;
async function exportKoreBackup(button){if(exporting||koreBackupBusy)return;const current=clone(project);if(!current.clips.length)return status('Apri un montaggio con almeno una clip prima di creare il backup.');koreBackupBusy=true;if(button)button.disabled=true;try{status('Preparazione backup con media originali…');const assets=new Map(),meta=[];for(const id of new Set(current.clips.filter(c=>c.kind!=='title').map(c=>c.media))){let item=media.get(id);if(!item?.blob&&db)item=await tx('media','readonly',{type:'get',args:[id]});if(!item?.blob)throw Error('Media mancante: ricollegalo prima di creare il backup');assets.set(id,item.blob);meta.push({id,name:item.name,kind:item.kind})}const blob=await packProject('video',{project:current,media:meta},assets);downloadBackup(blob,'KORE-montaggio-'+new Date().toISOString().slice(0,10));status('Backup pronto: contiene montaggio e '+assets.size+' media. Conserva il file .kore.')}catch(e){status('Backup non creato: '+e.message)}finally{koreBackupBusy=false;if(button)button.disabled=false}}
const koreBackupInput=document.createElement('input');koreBackupInput.type='file';koreBackupInput.accept='.kore';koreBackupInput.hidden=true;koreBackupInput.id='koreBackupInput';document.body.append(koreBackupInput);
function openKoreBackupFile(){if(!exporting&&!koreBackupBusy)koreBackupInput.click()}
koreBackupInput.onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||exporting||koreBackupBusy)return;koreBackupBusy=true;const initialSnapshot=JSON.stringify(project);let committed=false;const added=[];try{status('Controllo backup KORE…');const archive=await unpackProject(file);if(archive.type!=='video')throw Error('È un progetto foto: aprilo da Foto e progetti nell’editor fotografico');const next=validateVideoProject(archive.payload?.project,archive.assets);if(!Array.isArray(archive.payload.media)||archive.payload.media.length!==archive.assets.size)throw Error('Elenco media non valido');const mapping=new Map();for(const row of archive.payload.media){if(mapping.has(row.id)||typeof row.name!=='string'||!['video','audio','image'].includes(row.kind)||!archive.assets.has(row.id))throw Error('Media non valido');const id=uid(),blob=archive.assets.get(row.id),m=await loadMedia(id,blob,row.name,row.kind);added.push(id);mapping.set(row.id,id);if(db)queueMediaSave(m,blob)}for(const c of next.clips){c.id=uid();if(c.kind!=='title'){const m=media.get(mapping.get(c.media));if(m.kind!==c.kind)throw Error('Tipo media non coerente');if(c.kind!=='image'&&c.out>m.el.duration+.05)throw Error('Media più corto della clip');c.media=m.id}}if(exporting)throw Error('Attendi la fine dell’esportazione');if(JSON.stringify(project)!==initialSnapshot)throw Error('Il montaggio è cambiato durante la lettura: ripeti l’apertura del backup');activeProjectKey=null;mutate(()=>{project=next;selected=next.clips[0]?.id||null});committed=true;canvasSize();seek(0);$('koreDraftsDialog')?.remove();if(window.matchMedia('(max-width:759px)').matches)$('mobileStartEditor').click();else $('welcome').classList.add('hidden');await Promise.all(added.map(id=>media.get(id)?.savePromise).filter(Boolean));const saved=await persist();status('Backup riaperto: '+next.clips.length+' clip. '+(saved?'Salvato come nuovo progetto.':'Mantieni il backup: salvataggio locale non confermato.'))}catch(error){if(!committed)for(const id of added){const m=media.get(id);if(m){m.el.pause?.();m.el.remove();URL.revokeObjectURL(m.url);media.delete(id)}}status('Backup non aperto: '+error.message)}finally{koreBackupBusy=false}};
for(const [id,label,action] of [['koreExportBackup','Scarica backup .kore',exportKoreBackup],['koreImportBackup','Apri backup .kore',openKoreBackupFile]]){const button=document.createElement('button');button.type='button';button.id=id;button.textContent=label;button.onclick=()=>action(button);$('phoneMoreGrid').append(button)}

const discardVideoForExit=async()=>{if(exitCheckpoint&&exitCheckpointKey===activeProjectKey){await mediaSaveQueue;const working=project;project=clone(exitCheckpoint);try{if(activeProjectKey&&!await persist())throw Error('Impossibile ripristinare il progetto precedente. Resta nell’editor e riprova.')}catch(e){project=working;refresh();throw e}selected=null;time=0;history=[];future=[];canvasSize();syncVideoPlayback(true);refresh()}};
const saveVideoForExit=async()=>{await Promise.all([...media.values()].map(m=>m.savePromise).filter(Boolean));if(!await persist())throw Error('Memoria locale non disponibile. Scarica prima un backup .kore.');if(project.clips.some(c=>c.kind!=='title'&&media.get(c.media)?.saveState!=='saved'))throw Error('Alcuni media non sono salvati. Attendi il caricamento o scarica un backup.');exitCheckpoint=clone(project);exitCheckpointKey=activeProjectKey;};
let koreExitApproved=false;
for(const id of ['koreEditorBack','mobileHomeButton','mobileModels']){const el=$(id);if(!el?.onclick)continue;const action=el.onclick;el.onclick=event=>{if(id==='koreEditorBack'&&(!$('assetDock').classList.contains('hidden')||!$('mobileTools').classList.contains('hidden')))return action.call(el,event);if(!koreExitApproved&&project.clips.length&&!$('korePhotoEditor')&&!exporting)askSaveBeforeExit({save:saveVideoForExit,onDiscard:discardVideoForExit,onExit:()=>{koreExitApproved=true;try{action.call(el,event)}finally{koreExitApproved=false}}});else action.call(el,event)}}
window.addEventListener('beforeunload',e=>{if(project.clips.length||document.querySelector('#korePhotoEditor.photo-has-image')){e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&project.clips.length){persist();try{localStorage.setItem('kore-last-editor',JSON.stringify({key:activeProjectKey,time,updatedAt:Date.now()}))}catch{}}else if(!document.hidden){lastTick=0;draw();refreshClock();status('Progetto ripreso. Se una trascrizione si è interrotta, riavviala: recupera i tratti già analizzati.')}});

const photoClipTool=document.createElement('button');photoClipTool.id='photoClipAI';photoClipTool.type='button';photoClipTool.textContent='Foto / fotogramma · Scontorno AI';photoClipTool.onclick=async()=>{if(playing){playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback()}const clip=selectedClip(),m=clip&&media.get(clip.media);if(!clip||!['image','video'].includes(m?.kind))return status('Seleziona una foto o un video nella timeline.');if(exporting)return;const captured={...clip};try{let file;if(m.kind==='image')file=new File([m.blob],m.name,{type:m.blob.type});else{await waitForPreviewFrame(m);const at=Math.max(clip.in,Math.min(clip.out-.04,clip.in+Math.max(0,time-clip.start)*(clip.speed||1)));m.el.pause();if(Math.abs(m.el.currentTime-at)>.03){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{m.el.removeEventListener('seeked',ready);reject(Error('Fotogramma non disponibile'))},10000);const ready=()=>{clearTimeout(timer);resolve()};m.el.addEventListener('seeked',ready,{once:true});m.el.currentTime=at})}const frame=document.createElement('canvas');frame.width=m.el.videoWidth;frame.height=m.el.videoHeight;if(!frame.width)throw Error('Attendi che il video sia caricato');frame.getContext('2d').drawImage(m.el,0,0);const blob=await new Promise(r=>frame.toBlob(r,'image/png'));file=new File([blob],'Fotogramma-KORE.png',{type:'image/png'});frame.width=frame.height=1}const insertion=Math.max(captured.start,Math.min(time,captured.start+duration(captured)-.1));openPhotoEditor({file,onApply:async edited=>{if(exporting)throw Error('Attendi la fine dell’esportazione');const current=project.clips.find(c=>c.id===captured.id);if(!koreAsrClipUnchanged(captured,current))throw Error('La clip è cambiata: riapri lo strumento');const result=await importFiles([edited],{libraryOnly:true});if(!result.ids?.length)throw Error('Foto modificata non importata');mutate(()=>{if(captured.kind==='image'){current.media=result.ids[0]}else{project.clips.push({id:uid(),kind:'image',media:result.ids[0],track:project.tracks[1]?.id||project.tracks[0].id,start:insertion,in:0,out:Math.max(.1,Math.min(3,captured.start+duration(captured)-insertion)),speed:1,opacity:1,zoom:1,rotation:0,x:0,y:0,fitMode:'contain'})}});status(captured.kind==='image'?'Foto modificata nella timeline.':'Fotogramma aggiunto come foto sovrapposta. Il video originale resta disponibile.')}})}catch(error){status('Foto AI: '+error.message)}};$('phoneMoreGrid').append(photoClipTool);const desktopPhotoClip=document.createElement('button');desktopPhotoClip.type='button';desktopPhotoClip.textContent='✦ Foto / fotogramma AI';desktopPhotoClip.onclick=()=>photoClipTool.click();$('freezeFrame').after(desktopPhotoClip);
const originalImportFiles=importFiles;
importFiles=async function(files,options={}){if(options.libraryOnly)return originalImportFiles(files,options);const note=document.createElement('div');note.id='koreImportFeedback';note.setAttribute('role','status');note.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:4900;padding:16px;border:1px solid #ef8dc077;border-radius:18px;background:#28172ef2;color:white;font:14px system-ui;box-shadow:0 5px 30px #0006';note.textContent='Caricamento di '+files.length+' file. Attendi le anteprime…';document.body.append(note);try{const result=await originalImportFiles(files,options);note.textContent=result.imported+' file pronti nella timeline'+(result.failed?' · '+result.failed+' non leggibili. Riprova con altri file.':' · Ora puoi tagliare, aggiungere musica o sottotitoli.');setTimeout(()=>note.remove(),6500);return result}catch(error){note.textContent='Caricamento non riuscito: '+error.message;setTimeout(()=>note.remove(),10000);throw error}};

installCaptionLayout({getProject:()=>project,canvas,draw,refresh,persist,snapshot,isExporting:()=>exporting,status,pause:()=>{playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback()}});

const previewLayout=installPreviewLayout(canvas);
function renderFormatPreview(ratio,target){const original=project.ratio;try{renderingFormatPreview=true;project.ratio=ratio;canvasSize();draw();target.width=canvas.width;target.height=canvas.height;target.getContext('2d').drawImage(canvas,0,0)}finally{project.ratio=original;renderingFormatPreview=false;canvasSize();draw();previewLayout.update()}}
installTouchEditor({seek,previewLayout,renderFormatPreview,canvas,getProject:()=>project,getTime:()=>time,getActive:()=>activeClips(time),getMedia:c=>media.get(c.media),select:id=>{selected=id;refresh()},getSelected:selectedClip,mutate,snapshot,draw,refresh,persist,isExporting:()=>exporting,displayCaption:transcriptAt,status,setRatio:ratio=>mutate(()=>{project.ratio=ratio;canvasSize()}),pause:()=>{playing=false;syncVideoPlayback();$('play').textContent='▶';updateMobilePlayback()}});

for(const parent of [$('mobileStartEditor')?.parentElement,$('desktopOpenEditor')?.parentElement].filter(Boolean)){const resume=document.createElement('button');resume.type='button';resume.className='entry-card';resume.innerHTML='<span class="entry-icon">↺</span><span class="entry-card-copy"><strong>Riprendi ultimo montaggio</strong><small>Riapri il progetto e il punto del video salvati.</small></span>';resume.onclick=async()=>{try{await storageReady;const last=JSON.parse(localStorage.getItem('kore-last-editor')||'null');if(!last?.key)throw Error('Nessun montaggio recente salvato');const row=await tx('project','readonly',{type:'get',args:[last.key]});const draft=row?.project||row;if(!draft?.clips?.length)throw Error('Nessun montaggio recente da riprendere');await openEditorDraft(last.key,draft);if(matchMedia('(max-width:759px)').matches)$('mobileStartEditor').click();else $('desktopOpenEditor').click();seek(Math.min(Number(last.time)||0,endTime()));status('Montaggio recuperato. Puoi riprendere una trascrizione interrotta dagli stessi Sottotitoli AI.')}catch(e){editorInfo(e.message)}};parent.append(resume)}
