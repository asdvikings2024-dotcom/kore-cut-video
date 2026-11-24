// Libreria musica KORE: basi originali (senza diritti), ascolta e aggiungi al video con un tocco.
const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n};
let sheet=null;
function close(){window.koreMusicApi?.stop();sheet?.remove();sheet=null;document.body.classList.remove('kfx-open')}
export function openMusicSheet(uploadFn){
 const api=window.koreMusicApi;if(!api){uploadFn?.();return}
 close();
 sheet=el('div','kfx kfx-music');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Musica');
 const head=el('div','kfx-h');head.append(el('b',null,'♪ Musica per il tuo video'));const x=el('button',null,'✕');x.type='button';x.onclick=close;head.append(x);
 const note=el('p','kfx-note','Basi originali KORE: nessun diritto d\'autore, usale ovunque.');
 const list=el('div','kfx-music-list');
 for(const s of api.list()){
  const row=el('div','kfx-song');const info=el('div','kfx-song-i');info.append(el('b',null,s.name),el('small',null,s.mood));
  const play=el('button','kfx-play','▶');play.type='button';play.setAttribute('aria-label','Ascolta '+s.name);play.setAttribute('aria-pressed','false');
  play.onclick=async()=>{const was=play.getAttribute('aria-pressed')==='true';for(const b of list.querySelectorAll('.kfx-play')){b.textContent='▶';b.setAttribute('aria-pressed','false')}api.stop();if(was)return;play.textContent='■';play.setAttribute('aria-pressed','true');try{await api.preview(s.id,{textContent:'',setAttribute(){},getAttribute(){return 'false'}})}catch(e){}};
  const add=el('button','kfx-add','＋ Aggiungi');add.type='button';
  add.onclick=async()=>{add.disabled=true;add.textContent='…';try{await api.add(s.id);add.textContent='✓ Aggiunta';setTimeout(close,500)}catch(e){add.textContent='Riprova';add.disabled=false}};
  row.append(info,play,add);list.append(row);
 }
 const up=el('button','kfx-upload','📁 Carica un tuo brano');up.type='button';up.onclick=()=>{close();uploadFn?.()};
 sheet.append(head,note,list,up);document.body.append(sheet);document.body.classList.add('kfx-open');
}
window.koreMusicSheet=openMusicSheet;
