// Correzione dei sottotitoli generati: tocca una parola per eliminarla, "Correggi" per cambiarla,
// "Togli doppioni" e "Togli ehm" in un tocco. Si applica alla trascrizione senza toccare i tempi delle altre parole.
const FILLERS=new Set(['ehm','eh','ehh','ehhm','em','emm','uhm','uh','uhh','mm','mmm','mh','mhh','hmm','hm','um','ah','ahh']);
const norm=w=>String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9']/g,'');
export function wordsOf(cue){return String(cue.text||'').split(/\s+/).filter(Boolean)}
// Segna le parole da togliere: ripetizioni consecutive ("che che"), frasi ripetute di due parole ("che cosa che cosa") e riempitivi.
export function findRemovals(cues,{duplicates=true,fillers=true}={}){
 const flat=[];cues.forEach((c,ci)=>wordsOf(c).forEach((w,wi)=>flat.push({ci,wi,n:norm(w)})));
 const out=new Set(),key=x=>x.ci+':'+x.wi;
 if(fillers)for(const x of flat)if(x.n&&FILLERS.has(x.n))out.add(key(x));
 if(duplicates){
  const live=flat.filter(x=>x.n&&!out.has(key(x)));
  for(let i=1;i<live.length;i++){
   if(live[i].n===live[i-1].n&&live[i].n.length>0)out.add(key(live[i]));
   else if(i>=3&&live[i].n===live[i-2].n&&live[i-1].n===live[i-3].n&&!(live[i].n===live[i-1].n)){out.add(key(live[i-1]));out.add(key(live[i]))}
  }
 }
 return out;
}
// Applica: restituisce nuove cue senza le parole tolte (e con le parole corrette).
export function buildCues(cues,removed,edits){
 const result=[];
 cues.forEach((cue,ci)=>{
  const words=wordsOf(cue),timed=Array.isArray(cue.words)&&cue.words.length===words.length?cue.words:null;
  const keep=[];words.forEach((w,wi)=>{if(!removed.has(ci+':'+wi))keep.push({w:edits.get(ci+':'+wi)??w,t:timed?timed[wi]:null})});
  if(!keep.length)return;
  const next={...cue,text:keep.map(k=>k.w).join(' ')};
  if(timed){next.words=keep.map(k=>({...k.t,word:k.w}));next.start=Math.min(...keep.map(k=>k.t.start));next.end=Math.max(...keep.map(k=>k.t.end))}
  result.push(next);
 });
 return result;
}
const mmss=s=>{s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};

export function openTranscriptEditor(){
 const api=window.koreTranscript;if(!api)return;
 const data=api.find();
 if(!data||!data.cues.length){alert('Prima crea i sottotitoli con "Trascrivi audio del video".');return}
 if(document.getElementById('koreTranscriptEditor'))return;
 let removed=new Set(),edits=new Map(),mode='delete';
 const wrap=el('div','kt');wrap.id='koreTranscriptEditor';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','Correggi i sottotitoli');
 const head=el('header','kt-head');const title=el('h2',null,'Correggi i sottotitoli');const x=el('button','kt-x','✕');x.type='button';x.setAttribute('aria-label','Chiudi senza salvare');
 head.append(title,x);
 const hint=el('p','kt-hint');
 const modeBar=el('div','kt-modes');modeBar.setAttribute('role','group');
 const mDel=el('button',null,'🗑 Elimina parole'),mEdit=el('button',null,'✎ Cambia parola');mDel.type=mEdit.type='button';modeBar.append(mDel,mEdit);
 const quick=el('div','kt-quick');
 const bDup=el('button',null,'Togli doppioni'),bFill=el('button',null,'Togli "ehm"'),bReset=el('button',null,'Annulla modifiche');bDup.type=bFill.type=bReset.type='button';quick.append(bDup,bFill,bReset);
 const list=el('div','kt-list');
 const foot=el('footer','kt-foot');const count=el('span','kt-count');const save=el('button','kt-save','✓ Applica');save.type='button';foot.append(count,save);
 wrap.append(head,hint,modeBar,quick,list,foot);document.body.append(wrap);document.body.classList.add('kt-open');
 const close=()=>{wrap.remove();document.body.classList.remove('kt-open')};
 x.onclick=close;
 const setMode=m=>{mode=m;mDel.setAttribute('aria-pressed',String(m==='delete'));mEdit.setAttribute('aria-pressed',String(m==='edit'));hint.textContent=m==='delete'?'Tocca una parola per toglierla (tocca di nuovo per rimetterla). Tocca l\'orario per sentire quel punto.':'Tocca una parola e scrivi quella giusta.';};
 const total=()=>removed.size+edits.size;
 function render(){
  list.replaceChildren();
  data.cues.forEach((cue,ci)=>{
   const row=el('div','kt-row');const t=el('button','kt-time',mmss(cue.start));t.type='button';t.setAttribute('aria-label','Vai a '+mmss(cue.start));t.onclick=()=>api.seek(data.id,cue.start);
   const words=el('div','kt-words');
   wordsOf(cue).forEach((w,wi)=>{
    const key=ci+':'+wi,b=el('button','kt-w',edits.get(key)??w);b.type='button';b.classList.toggle('off',removed.has(key));b.classList.toggle('chg',edits.has(key));
    b.onclick=()=>{
     if(mode==='delete'){removed.has(key)?removed.delete(key):removed.add(key);render();return}
     const inp=el('input','kt-in');inp.type='text';inp.value=edits.get(key)??w;inp.setAttribute('autocapitalize','off');inp.setAttribute('autocorrect','off');inp.spellcheck=false;
     const fin=()=>{const v=inp.value.trim().replace(/\s+/g,'');if(v&&v!==w)edits.set(key,v);else edits.delete(key);render()};
     inp.onblur=fin;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();inp.blur()}};b.replaceWith(inp);inp.focus();inp.select();
    };
    words.append(b);
   });
   const del=el('button','kt-row-del','🗑');del.type='button';del.setAttribute('aria-label','Elimina tutta la frase');
   del.onclick=()=>{const ws=wordsOf(cue);const all=ws.every((_,wi)=>removed.has(ci+':'+wi));ws.forEach((_,wi)=>all?removed.delete(ci+':'+wi):removed.add(ci+':'+wi));render()};
   row.append(t,words,del);list.append(row);
  });
  count.textContent=total()?total()+' modifiche':'Nessuna modifica';save.disabled=!total();
 }
 mDel.onclick=()=>{setMode('delete');render()};mEdit.onclick=()=>{setMode('edit');render()};
 bDup.onclick=()=>{const f=findRemovals(data.cues,{duplicates:true,fillers:false});let n=0;for(const k of f)if(!removed.has(k)){removed.add(k);n++}hint.textContent=n?n+' parole doppie segnate. Controlla e premi Applica.':'Nessun doppione trovato.';render()};
 bFill.onclick=()=>{const f=findRemovals(data.cues,{duplicates:false,fillers:true});let n=0;for(const k of f)if(!removed.has(k)){removed.add(k);n++}hint.textContent=n?n+' "ehm" segnati. Controlla e premi Applica.':'Nessun "ehm" trovato.';render()};
 bReset.onclick=()=>{removed=new Set();edits=new Map();setMode(mode);render()};
 save.onclick=()=>{const cues=buildCues(data.cues,removed,edits);if(!cues.length){hint.textContent='Così non resterebbe nessuna parola: tienine almeno una.';return}if(api.apply(data.id,cues))close();else hint.textContent='Non sono riuscito ad applicare le modifiche. Riprova.'};
 setMode('delete');render();
}
if(typeof window!=="undefined")window.koreOpenTranscriptEditor=openTranscriptEditor;
