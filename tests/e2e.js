// Test end-to-end di KORE Studio (Playwright). Uso: node tests/e2e.js  (serve la cartella con un server locale)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d)})});
let pass=0,fail=0;const check=(name,ok,extra='')=>{ok?pass++:fail++;console.log((ok?'✓ ':'✗ ')+name+(ok?'':'  '+extra))};
(async()=>{
 await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port+'/studio/';
 const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:393,height:766},isMobile:true,hasTouch:true}),p=await ctx.newPage();
 const errors=[];p.on('pageerror',e=>{if(!/prepend/.test(e.message))errors.push(e.message)});
 const wait=ms=>p.waitForTimeout(ms),ev=f=>p.evaluate(f);
 await p.goto(base+'?t='+Date.now());await wait(2500);
 check('la pagina si carica senza errori',errors.length===0,errors.join('|'));
 check('home visibile',await ev(()=>!!document.getElementById('mobileStartModels')));
 // Modelli
 await ev(()=>document.getElementById('mobileStartModels').click());await wait(1200);
 await ev(()=>{const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value==='wow'));s.value='wow';s.dispatchEvent(new Event('change',{bubbles:true}))});await wait(600);
 const wow=await ev(()=>{const m=document.body.innerText.match(/\d+ \/ (\d+)/g)||[];return Number((m.pop()||'0').split('/')[1])});
 check('almeno 50 modelli WOW',wow>=50,String(wow));
 await p.goto(base+'?t='+Date.now());await wait(2500);
 // Editor + video
 await ev(()=>document.getElementById('mobileStartEditor').click());await wait(800);
 await p.setInputFiles('#import',path.join(__dirname,'fixtures/clip.webm'));await wait(3500);
 const rows=()=>ev(()=>window.koreCap.rows().map(r=>r.clips.map(c=>({k:c.kind,s:c.start,d:c.dur}))));
 let r=await rows();check('video importato in timeline',r[0]?.length===1&&r[0][0].k==='video');
 await p.setInputFiles('#import',path.join(__dirname,'fixtures/clip.webm'));await wait(3500);
 r=await rows();check('secondo clip in coda',r[0].length===2);
 // Effetti con anteprima reale
 await ev(()=>[...document.querySelectorAll('#koreRail button')].find(x=>x.textContent.includes('Effetti')).click());await wait(700);
 const th=await ev(()=>[...document.querySelectorAll('.kfx-th')].filter(e=>/url\(/.test(e.style.backgroundImage)).length);
 check('anteprime effetti con il fotogramma del video',th>5,String(th));
 await ev(()=>[...document.querySelectorAll('.kfx-c')].find(x=>x.textContent.includes('Glitch forte')).click());await wait(400);
 check('effetto applicato',(await ev(()=>document.getElementById('effect').value))!=='original');
 await ev(()=>document.querySelector('.kfx button')?.click());
 // Musica
 await ev(()=>[...document.querySelectorAll('#koreRail button')].find(x=>x.textContent.includes('Audio')).click());await wait(500);
 await ev(()=>document.querySelectorAll('.kfx-add')[3].click());await wait(2500);
 r=await rows();check('musica KORE aggiunta',r.some(x=>x.some(c=>c.k==='audio')));
 // Taglia a tempo
 await ev(()=>[...document.querySelectorAll('#koreRail button')].find(x=>x.textContent.includes('Audio')).click());await wait(500);
 await ev(()=>document.querySelector('.kfx-beat-go').click());await wait(1500);
 r=await rows();const v=r[0];check('taglia a tempo: clip di un battito',v.every(c=>c.d<0.6&&c.d>0.3),JSON.stringify(v));
 check('taglia a tempo: clip consecutivi',Math.abs(v[1].s-(v[0].s+v[0].d))<0.01);
 // Magia
 await ev(()=>[...document.querySelectorAll('#koreRail button')].find(x=>x.textContent.includes('Magia')).click());await wait(500);
 await ev(()=>document.querySelectorAll('.kfx-song .kfx-add')[1].click());await wait(3000);
 r=await rows();check('Magia KORE: clip a tempo + musica',r[0].every(c=>c.d<2.5)&&r.some(x=>x.some(c=>c.k==='audio')),JSON.stringify(r));
 // Sottotitoli: apostrofi, aggiunta, cambio
 const t=await ev(async()=>{const m=await import('./transcript-editor.js?v=kt-3');
  const cues=[{start:0,end:2,text:"ciao l ’ amico dell' anno",words:[{start:0,end:.4},{start:.4,end:.7},{start:.7,end:.8},{start:.8,end:1.2},{start:1.2,end:1.5},{start:1.5,end:2}]}];
  const f=m.fixApostrophes(cues);const o=m.buildCues(f.cues,new Set(),new Map([['0:0','buon giorno']]),new Map([['0:1','davvero bello']]));
  return {fixed:f.cues[0].text,out:o[0].text,words:o[0].words.length,mono:o[0].words.every((w,i,a)=>i===0||w.start>=a[i-1].start-1e-6)}});
 check('apostrofi uniti',t.fixed==="ciao l'amico dell'anno",t.fixed);
 check('parole aggiunte e cambio multi-parola',t.out==="buon giorno l'amico davvero bello dell'anno",t.out);
 check('tempi sottotitoli sempre in ordine',t.mono&&t.words===6);
 // Foto
 await p.goto(base+'?t='+Date.now());await wait(2500);
 await ev(()=>document.getElementById('mobilePhotoEditor').click());await wait(1500);
 await p.setInputFiles('#photoInput',path.join(__dirname,'fixtures/photo.jpg'));await wait(3000);
 await ev(()=>[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Effetti'&&x.offsetParent).click());await wait(800);
 check('foto: 23 look con anteprima',(await ev(()=>document.querySelectorAll('#photoLooks .has-th').length))>=23);
 for(const m of ['aurea-dark','aurea-light']){await p.evaluate(m=>window.koreTheme.set(m),m);await wait(300);check('tema '+m,(await ev(()=>document.getElementById('koreAurea')?.textContent.length||0))>5000)}
 await ev(()=>window.koreTheme.set('orig'));check('tema originale ripristinato',await ev(()=>!document.getElementById('koreAurea')));
 check('selettore tema nella home',await p.evaluate(()=>[...document.querySelectorAll('.k-themes')].every(k=>k.querySelectorAll('button').length===4)));
 check('nessun errore JavaScript durante i test',errors.length===0,errors.join('|'));
 await b.close();server.close();
 console.log('\n'+pass+' ok, '+fail+' falliti');process.exit(fail?1:0);
})();
