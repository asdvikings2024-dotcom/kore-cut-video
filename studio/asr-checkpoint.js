let database,queue=Promise.resolve();const open=()=>database??=new Promise(resolve=>{try{const r=indexedDB.open('kore-asr-progress',1);r.onupgradeneeded=()=>r.result.createObjectStore('jobs');r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch{resolve(null)}});
async function transaction(mode,action){const db=await open();if(!db)return null;return new Promise(resolve=>{try{const tx=db.transaction('jobs',mode),r=action(tx.objectStore('jobs'));let value;r.onsuccess=()=>value=r.result;tx.oncomplete=()=>resolve(value??true);tx.onerror=tx.onabort=()=>resolve(null)}catch{resolve(null)}})}
export const readCheckpoint=key=>transaction('readonly',s=>s.get(key)).then(v=>v&&Date.now()-v.updatedAt<7*86400000?v:null);
export function saveCheckpoint(key,value){queue=queue.then(()=>transaction('readwrite',s=>s.put({...value,updatedAt:Date.now()},key)));return queue}
export function clearCheckpoint(key){queue=queue.then(()=>transaction('readwrite',s=>s.delete(key)));return queue}
