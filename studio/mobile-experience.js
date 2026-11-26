const $=id=>document.getElementById(id);
const icon=(shape,label)=>'<span aria-hidden="true">'+shape+'</span><small>'+label+'</small>';
export function installMobileExperience({openProjects,modelCount}={}){
 if(document.body.classList.contains('model-demo-mode')||new URLSearchParams(location.search).has('previewModel'))return;
 const mobile=matchMedia('(max-width:759px)'),bar=$('mobileEditorBar'),start=$('mobileStart');if(!bar||!start)return;
 if(modelCount)$('mobileStartModels').querySelector('small').textContent=modelCount+' modelli · anteprime animate';
 const body=document.body,stage=document.querySelector('.stage'),bottom=document.querySelector('.bottom'),originals=[];
 function button(id,shape,label,action){const b=document.createElement('button');b.id=id;b.type='button';b.innerHTML=icon(shape,label);b.onclick=action;return b}
 const homeNav=document.createElement('nav');homeNav.id='phoneHomeNav';homeNav.setAttribute('aria-label','Navigazione KORE');
 homeNav.append(button('phoneHomeTab','⌂','Home',()=>{start.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'})}),button('phonePhotoTab','✎','Foto',()=>$('mobilePhotoEditor').click()),button('phoneModelTab','▧','Modelli',()=>$('mobileStartModels').click()),button('phoneProjectTab','▣','Progetti',()=>{if(openProjects)openProjects();else $('resumeSceneDraft')?.click()}));start.append(homeNav);$('phoneHomeTab').setAttribute('aria-current','page');
 const modelNav=$('mobileHome').querySelector('.mobile-nav');modelNav.prepend(button('phoneModelHome','⌂','Home',()=>$('mobileModelBack').click()),button('phoneModelPhotos','✎','Foto',()=>$('mobilePhotoEditor').click()),button('phoneModelProjects','▣','Progetti',()=>{if(openProjects)openProjects();else $('resumeSceneDraft')?.click()}));
 const transport=document.createElement('div');transport.id='phoneTransport';transport.setAttribute('aria-label','Riproduzione e cronologia');
 const clock=document.createElement('time');clock.id='phoneClock';clock.textContent=$('clock').textContent;
 const undo=button('phoneUndo','↶','Annulla',()=>$('undo').click()),redo=button('phoneRedo','↷','Ripeti',()=>$('redo').click());undo.setAttribute('aria-label','Annulla modifica');redo.setAttribute('aria-label','Ripeti modifica');
 transport.append(undo,redo,clock);
 bottom.insertBefore(transport,bar);
 const more=document.createElement('dialog');more.id='phoneMoreDialog';more.setAttribute('aria-labelledby','phoneMoreTitle');more.innerHTML='<div class="phone-sheet-handle" aria-hidden="true"></div><div class="phone-sheet-head"><div><small>IL TUO MONTAGGIO</small><h2 id="phoneMoreTitle">Tutti gli strumenti</h2></div><button id="phoneMoreClose" type="button" aria-label="Chiudi tutti gli strumenti">✕</button></div><p>Per tagli e proprietà, seleziona prima una clip nella timeline.</p><div id="phoneMoreGrid"></div>';
 body.append(more);$('phoneMoreClose').onclick=()=>more.close();more.addEventListener('click',event=>{if(event.target===more)more.close();else if(event.target.closest('#phoneMoreGrid button'))more.close()},{capture:true});
 const openMore=button('phoneMoreOpen','•••','Altro',()=>{more.showModal();$('phoneMoreClose').focus()});openMore.setAttribute('aria-haspopup','dialog');bar.append(openMore);
 const library=button('phoneLibraryOpen','▣','Libreria',()=>{$('showMedia').click()});library.setAttribute('aria-label','Apri libreria dei media');$('phoneMoreGrid').append(library,button('phonePhotoFromEditor','✎','Modifica foto',()=>$('mobilePhotoEditor').click()),button('phoneSaveProject','◈','Salva progetto',()=>$('save').click()));
 function move(node,host,first=false){if(!node)return;const anchor=document.createComment('phone-home:'+node.id);node.before(anchor);originals.push({node,anchor});first?host.prepend(node):host.append(node)}
 const audio=bar.querySelector('.audio-import-button'),quality=bar.querySelector('.preview-quality');
 const labels=[['mobileSplit','✂','Dividi clip'],['mobileSubtitles','▤','Sottotitoli'],['mobileModels','▧','Modelli'],['mobileAdvanced','☷','Modifica clip']];
 for(const [id,shape,label] of labels)$(id).innerHTML=icon(shape,label);
 $('mobilePlay').innerHTML=icon('▶','Riproduci');$('mobileTimeline').innerHTML=icon('▥','Timeline');$('mobileTimeline').setAttribute('aria-label','Mostra o nascondi timeline');
 if(audio){audio.innerHTML=icon('♫','Audio');audio.setAttribute('aria-label','Importa audio')}
 const empty=document.createElement('div');empty.id='phoneEmptyPrompt';empty.innerHTML='<div class="phone-empty-art" aria-hidden="true">▧<i>✦</i></div><h2>La tua prossima storia.</h2><p>Scegli un video o una foto.<br>Al ritmo ci pensiamo dopo.</p><button type="button" id="phoneEmptyImport">＋ Scegli foto o video</button>';stage.append(empty);$('phoneEmptyImport').onclick=()=>$('mobileAdd').click();
 for(const id of ['mobileAdd','mobileStartImport']){const label=$(id);label.tabIndex=0;label.setAttribute('role','button');label.setAttribute('aria-label','Importa foto o video');label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();label.click()}})}
 const selection=document.createElement('p');selection.id='phoneSelectionHint';selection.textContent='Tocca una clip per modificarla';transport.after(selection);
 const selectedObserver=new MutationObserver(()=>{const clip=document.querySelector('#tracks .clip.selected');selection.textContent=clip?'Clip selezionata · Modifica o Dividi per continuare':'Tocca una clip nella timeline per modificarla';selection.hidden=!body.classList.contains('mobile-timeline-open')||!document.querySelector('#tracks .clip');empty.hidden=!!document.querySelector('#tracks .clip')});selectedObserver.observe($('tracks'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 function sync(){clock.textContent=$('clock').textContent;undo.disabled=$('undo').disabled;redo.disabled=$('redo').disabled;const play=$('play').textContent.includes('❚❚');$('mobilePlay').dataset.playing=String(play);$('mobilePlay').setAttribute('aria-label',play?'Pausa':'Riproduci');$('mobilePlay').querySelector('small').textContent=play?'Pausa':'Riproduci';selection.hidden=!body.classList.contains('mobile-timeline-open')||!document.querySelector('#tracks .clip');empty.hidden=!!document.querySelector('#tracks .clip');$('mobilePlay').querySelector('span').textContent=play?'Ⅱ':'▶︎';homeNav.hidden=!mobile.matches}
 const observer=new MutationObserver(sync);for(const el of [$('clock'),$('play'),$('undo'),$('redo')])observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled']});
 function layout(){
  if(more.open)more.close();
  if(mobile.matches){body.classList.add('phone-polished');move($('mobilePlay'),transport,true);move($('mobileTimeline'),transport);for(const [id] of labels)move($(id),$('phoneMoreGrid'));if(quality)move(quality,$('phoneMoreGrid'));move($('mobileRelink'),$('phoneMoreGrid'));if(audio){audio.style.order='2'}$('mobileAdd').style.order='1';$('mobileText').style.order='3';$('mobileEffects').style.order='4';openMore.style.order='5'}
  else{body.classList.remove('phone-polished');while(originals.length){const {node,anchor}=originals.pop();anchor.replaceWith(node)}}sync();
 }
 mobile.addEventListener('change',layout);layout();
 const sourceState=new MutationObserver(()=>{sync();if(!mobile.matches)return;const home=body.classList.contains('mobile-home-open');if(home&&more.open)more.close()});sourceState.observe(body,{attributes:true,attributeFilter:['class']});
 // Keep the current photo tab in view after taps and keyboard navigation.
 document.addEventListener('click',event=>{const tab=event.target.closest('#korePhotoEditor [data-photo-tab]');if(tab&&mobile.matches)tab.scrollIntoView({block:'nearest',inline:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'})});
}
