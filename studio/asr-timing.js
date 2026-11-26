// Preserve usable model times. Infer only missing boundaries and report every repair.
// Word-aligned results (phraseTiming===false) tolerate the small overlaps and zero-length words the model produces.
export function normalizeAsrTiming(result,seconds){
 const parts=(Array.isArray(result?.chunks)?result.chunks:[]).filter(c=>String(c.text||'').trim());
 const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
 const wordLevel=result?.phraseTiming===false,tolerance=wordLevel?.3:0;
 const limit=Math.max(.01,Number(seconds)||0);let estimated=!!result?.timingEstimated,previous=0;
 if(!parts.length){const words=String(result?.text||'').trim().split(/\s+/).filter(Boolean);return {estimated:!!words.length,cues:words.map((text,i)=>({text,start:limit*i/words.length,end:limit*(i+1)/words.length}))}}
 const cues=[];
 for(let i=0;i<parts.length;i++){
  const part=parts[i],ts=part.timestamp||[];let start=finite(ts[0])?Number(ts[0]):previous;
  let end=finite(ts[1])?Number(ts[1]):null;
  if(!finite(ts[0])||end===null)estimated=true;
  if(end===null){const next=parts.slice(i+1).find(c=>finite(c.timestamp?.[0])&&Number(c.timestamp[0])>start);end=next?Number(next.timestamp[0]):limit}
  if(start<previous-tolerance||start<0||end>limit+tolerance)estimated=true;
  start=Math.max(previous,Math.min(limit,start));end=Math.min(limit,end);
  if(wordLevel&&end<=start&&finite(ts[0])&&finite(ts[1]))end=Math.min(limit,start+.08);
  if(end<=start){estimated=true;if(cues.length){cues[cues.length-1].text+=' '+String(part.text).trim();continue}const next=parts.slice(i+1).find(c=>finite(c.timestamp?.[0])&&Number(c.timestamp[0])>start);end=next?Math.min(limit,Number(next.timestamp[0])):limit;if(end<=start)continue}
  cues.push({text:String(part.text).trim(),start,end});previous=end;
 }
 return {cues,estimated};
}

// Pause nel parlato: tratti silenziosi lunghi almeno minLength, con soglia relativa al livello della voce
// (non fissa), così funziona anche con rumore di fondo. Senza un livello di voce credibile restituisce [].
export function findPauses(samples,rate=16000,{frame=.05,minLength=.25,ratio=.12}={}){
 const size=Math.round(rate*frame),rms=[];
 for(let i=0;i+size<=samples.length;i+=size){let e=0;for(let j=i;j<i+size;j++)e+=samples[j]*samples[j];rms.push(Math.sqrt(e/size))}
 if(rms.length<10)return [];
 const speech=[...rms].sort((a,b)=>a-b)[Math.floor(rms.length*.75)];
 if(!(speech>=.005))return [];
 const limit=speech*ratio,out=[];let start=null;
 rms.forEach((v,i)=>{if(v<limit){if(start===null)start=i}else{if(start!==null&&(i-start)*frame>=minLength)out.push([start*frame,i*frame]);start=null}});
 if(start!==null&&(rms.length-start)*frame>=minLength)out.push([start*frame,rms.length*frame]);
 return out;
}
// Whisper attribuisce spesso la pausa alla parola dopo (o prima): ogni parola viene ristretta alla parte
// più lunga fuori dalle pause. Se la parola cade tutta in una pausa, o ne resterebbe meno di 60 ms, resta com'è.
export function snapWordsToSpeech(cues,pauses){
 if(!Array.isArray(cues)||!cues.length||!Array.isArray(pauses)||!pauses.length)return cues;
 return cues.map(cue=>{
  let parts=[[cue.start,cue.end]];
  for(const [a,b] of pauses){const next=[];for(const [s,e] of parts){if(b<=s||a>=e){next.push([s,e]);continue}if(a>s)next.push([s,a]);if(b<e)next.push([b,e])}parts=next}
  const best=parts.sort((x,y)=>(y[1]-y[0])-(x[1]-x[0]))[0];
  return best&&best[1]-best[0]>=.06?{...cue,start:best[0],end:best[1]}:cue;
 });
}
