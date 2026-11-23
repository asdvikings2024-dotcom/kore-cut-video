import {recognizeSegments} from './asr-segments.js?v=nav-22';
import {suspiciousRepetition} from './asr-quality.js?v=speed-13';
let model=null,modelKey=null;
self.onmessage=async({data})=>{try{
 const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;const send=text=>self.postMessage({type:'progress',text});
 async function load(key){if(model&&modelKey===key){send('AI già pronta · riutilizzo del modello');return}await model?.dispose();model=null;send('Caricamento AI sul dispositivo…');model=await pipeline('automatic-speech-recognition',key,{device:'wasm',dtype:'q8',progress_callback:e=>{if(e.status==='progress')send('Download '+(e.file||'modello')+' · '+Math.round(e.progress||0)+'%')}});modelKey=key}
 const tiny=data.model==='tiny';const resume=data.resume;await load(['Xenova/whisper-tiny','Xenova/whisper-base'].includes(resume?.modelKey)?resume.modelKey:tiny?'Xenova/whisper-tiny':'Xenova/whisper-base');const checkpoint=result=>self.postMessage({type:'checkpoint',result:{...result,modelKey}});let result=await recognizeSegments(model,data.samples,{language:data.language,progress:send,resume,checkpoint});
 if(tiny&&suspiciousRepetition(result.text)){send('Risultato ripetuto: riprovo automaticamente con il modello accurato');await load('Xenova/whisper-base');result=await recognizeSegments(model,data.samples,{language:data.language,progress:send,checkpoint});result.upgradedModel=true}
 self.postMessage({type:'result',result})
}catch(e){self.postMessage({type:'error',text:e.message||String(e)})}};
