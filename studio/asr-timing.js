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
