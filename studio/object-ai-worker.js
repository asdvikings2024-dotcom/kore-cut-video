import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.wasm.min.mjs';
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
const modelUrl='https://huggingface.co/edgetools/u2netp/resolve/main/u2netp.onnx';
const expectedHash='309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
let session;
const status=text=>self.postMessage({status:text});
async function load(){
 if(session)return session;status('Download modello oggetti · circa 4,6 MB…');
 let response,cache;try{cache=await caches.open('kore-object-u2netp-v1');response=await cache.match(modelUrl)}catch(e){}
 if(!response){response=await fetch(modelUrl,{cache:'force-cache'});if(!response.ok)throw Error('Download del modello non riuscito. Controlla la connessione.');if(cache)try{await cache.put(modelUrl,response.clone())}catch(e){}}
 const bytes=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==expectedHash){if(cache)await cache.delete(modelUrl);throw Error('Modello non valido: download interrotto o versione inattesa.')}
 status('Preparazione del modello sul dispositivo…');session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});return session;
}
self.onmessage=async event=>{
 try{const model=await load(),input=new ort.Tensor('float32',event.data.tensor,[1,3,320,320]);status('Analisi dell’oggetto principale…');const result=await model.run({[model.inputNames[0]]:input}),output=result[model.outputNames[0]],raw=output.data;let min=Infinity,max=-Infinity;for(let i=0;i<320*320;i++){min=Math.min(min,raw[i]);max=Math.max(max,raw[i])}if(!Number.isFinite(min)||max-min<.00001)throw Error('Nessun soggetto separabile trovato. Prova un oggetto ben distinto dallo sfondo.');const mask=new Uint8ClampedArray(320*320);for(let i=0;i<mask.length;i++)mask[i]=Math.round(Math.max(0,Math.min(1,(raw[i]-min)/(max-min)))*255);input.dispose();for(const value of Object.values(result))value.dispose();self.postMessage({done:true,mask,width:320,height:320},[mask.buffer]);}
 catch(error){self.postMessage({error:error.message||String(error)})}
};
