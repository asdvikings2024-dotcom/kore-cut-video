import {suspiciousRepetition} from './asr-quality.js?v=speed-13';
// Analyze independent windows so one bad decoder continuation cannot contaminate the rest.
// With wordTimestamps the model returns one chunk per word (real alignment). A window that the model
// cannot align falls back to phrase timestamps and the result reports estimated timing.
const RATE=16000;
// Pick the quietest 100 ms near the ideal cut so a word is not split between two windows.
export function quietestCut(samples,ideal,total,span=3){
 const lo=Math.max(.5,ideal-span),hi=Math.min(total-.5,ideal+span);if(!(hi>lo))return ideal;
 const frame=Math.round(RATE*.1);let best=ideal,bestRms=Infinity;
 for(let t=lo;t<=hi;t+=.1){const a=Math.floor(t*RATE),b=Math.min(samples.length,a+frame);let e=0;for(let i=a;i<b;i++)e+=samples[i]*samples[i];const rms=Math.sqrt(e/Math.max(1,b-a));if(rms<bestRms-1e-9){bestRms=rms;best=t}}
 return best;
}
export async function recognizeSegments(model,samples,{language,wordTimestamps=false,progress=()=>{},checkpoint=()=>{},resume=null}={}){
 const total=samples.length/RATE,validResume=resume?.totalSamples===samples.length&&Array.isArray(resume.chunks)&&resume.nextStart>=0&&resume.nextStart<=total,chunks=validResume?resume.chunks.slice():[];
 let estimated=validResume?!!resume.timingEstimated:false,retries=0,wordWindows=validResume?resume.wordWindows||0:0,phraseWindows=validResume?resume.phraseWindows||0:0,wordBroken=false;
 const base={...(language&&language!=='auto'?{language}:{}),task:'transcribe',chunk_length_s:0,max_new_tokens:256};
 async function transcribe(audio){
  if(wordTimestamps&&!wordBroken){try{const r=await model(audio,{...base,return_timestamps:'word'});if(Array.isArray(r.chunks)&&r.chunks.length)return {result:r,word:true}}catch(e){wordBroken=true}}
  return {result:await model(audio,{...base,return_timestamps:true}),word:false};
 }
 async function window(from,to,depth=0){
  const left=Math.max(0,from-.8),right=Math.min(total,to+.8),audio=samples.slice(Math.floor(left*RATE),Math.ceil(right*RATE));
  let energy=0;for(const v of audio)energy+=v*v;if(Math.sqrt(energy/Math.max(1,audio.length))<.0001)return;
  const {result,word}=await transcribe(audio);
  if(suspiciousRepetition(result.text)&&depth<1){retries++;const middle=(from+to)/2;progress('Rianalisi di un tratto ripetuto…');await window(from,middle,depth+1);await window(middle,to,depth+1);return}
  if(!Array.isArray(result.chunks)||!result.chunks.length){estimated=true;phraseWindows++;const text=String(result.text||'').trim();if(text)chunks.push({text,timestamp:[from,to]});return}
  const before=chunks.length;for(const part of result.chunks){if(!String(part.text||'').trim())continue;const stamp=part.timestamp||[],a=stamp[0],b=stamp[1];const validA=a!=null&&Number.isFinite(Number(a)),validB=b!=null&&Number.isFinite(Number(b));if(!validA||!validB)estimated=true;const start=validA?left+Number(a):from,end=validB?left+Number(b):to;const midpoint=(start+end)/2;if(midpoint<from||midpoint>=to)continue;chunks.push({text:String(part.text).trim(),timestamp:[Math.max(from,start),Math.min(to,end)]})}
  if(chunks.length===before&&String(result.text||'').trim()){estimated=true;phraseWindows++;chunks.push({text:String(result.text).trim(),timestamp:[from,to]});return}
  if(chunks.length>before){if(word)wordWindows++;else{phraseWindows++;if(wordTimestamps)estimated=true}}
 }
 let start=validResume?resume.nextStart:0;
 while(start<total-.01){
  const to=total-start<=23?total:Math.min(total,Math.max(start+8,quietestCut(samples,start+20,total)));
  progress('Trascrizione '+Math.round(start)+'–'+Math.round(to)+' s / '+Math.round(total)+' s');
  await window(start,to);
  checkpoint({chunks:chunks.slice(),timingEstimated:estimated,nextStart:to,totalSamples:samples.length,wordWindows,phraseWindows});
  start=to;
 }
 chunks.sort((a,b)=>a.timestamp[0]-b.timestamp[0]);
 const wordAligned=wordTimestamps&&wordWindows>0;
 return {text:chunks.map(c=>c.text).join(' '),chunks,timingEstimated:estimated,phraseTiming:!wordAligned,wordAligned,retries};
}
