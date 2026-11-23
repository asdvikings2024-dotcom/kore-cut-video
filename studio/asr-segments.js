import {suspiciousRepetition} from './asr-quality.js?v=speed-13';
// Analyze independent windows so one bad decoder continuation cannot contaminate the rest.
export async function recognizeSegments(model,samples,{language,wordTimestamps=true,progress=()=>{},checkpoint=()=>{},resume=null}={}){
 const rate=16000,total=samples.length/rate,validResume=resume?.totalSamples===samples.length&&Array.isArray(resume.chunks)&&resume.nextStart>=0&&resume.nextStart<=total,chunks=validResume?resume.chunks.slice():[];let estimated=validResume?!!resume.timingEstimated:false,retries=0;
 async function window(from,to,depth=0){
  const left=Math.max(0,from-.8),right=Math.min(total,to+.8),audio=samples.slice(Math.floor(left*rate),Math.ceil(right*rate));
  let energy=0;for(const v of audio)energy+=v*v;if(Math.sqrt(energy/Math.max(1,audio.length))<.0001)return;
  const result=await model(audio,{...(language&&language!=='auto'?{language}:{}),task:'transcribe',return_timestamps:true,chunk_length_s:0,max_new_tokens:256});
  if(suspiciousRepetition(result.text)&&depth<1){retries++;const middle=(from+to)/2;progress('Rianalisi di un tratto ripetuto…');await window(from,middle,depth+1);await window(middle,to,depth+1);return}
  if(!Array.isArray(result.chunks)||!result.chunks.length){estimated=true;const text=String(result.text||'').trim();if(text)chunks.push({text,timestamp:[from,to]});return}
  const before=chunks.length;for(const part of result.chunks){if(!String(part.text||'').trim())continue;const stamp=part.timestamp||[],a=stamp[0],b=stamp[1];const validA=a!=null&&Number.isFinite(Number(a)),validB=b!=null&&Number.isFinite(Number(b));if(!validA||!validB)estimated=true;const start=validA?left+Number(a):from,end=validB?left+Number(b):to;const midpoint=(start+end)/2;if(midpoint<from||midpoint>=to)continue;chunks.push({text:String(part.text).trim(),timestamp:[Math.max(from,start),Math.min(to,end)]})}
  if(chunks.length===before&&String(result.text||'').trim()){estimated=true;chunks.push({text:String(result.text).trim(),timestamp:[from,to]})}
 }
 for(let start=validResume?resume.nextStart:0;start<total;start+=20){progress('Trascrizione '+Math.round(start)+'–'+Math.round(Math.min(total,start+20))+' s / '+Math.round(total)+' s');await window(start,Math.min(total,start+20));checkpoint({chunks:chunks.slice(),timingEstimated:estimated,nextStart:Math.min(total,start+20),totalSamples:samples.length})}
 chunks.sort((a,b)=>a.timestamp[0]-b.timestamp[0]);return {text:chunks.map(c=>c.text).join(' '),chunks,timingEstimated:estimated,phraseTiming:true,retries};
}
