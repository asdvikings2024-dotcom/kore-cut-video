// Libreria di basi musicali ORIGINALI di KORE: sintetizzate al volo nel browser, nessun brano di terzi, nessun diritto da pagare.
(function(){
 const RATE=44100;
 const f=(root,semi)=>root*Math.pow(2,semi/12);
 const saw=(ph)=>2*(ph-Math.floor(ph))-1;
 const sq=(ph)=>(ph-Math.floor(ph))<.5?1:-1;
 const tri=(ph)=>{const x=ph-Math.floor(ph);return 4*Math.abs(x-.5)-1};
 const STYLES={
  synthwave:{name:'Neon Drive',mood:'Synthwave · futuristico',bpm:100,root:110,roots:[0,-4,3,-2],chords:[[0,3,7],[-4,0,3],[3,7,10],[-2,2,5]],kick:'x...x...x...x...',clap:'....x.......x...',hat:'..x...x...x...x.',arp:[0,1,2,1,2,1,0,1,0,2,1,2,1,0,1,2],pad:1,bass:'saw8',arpWave:'saw',echo:.4,duck:.55},
  phonk:{name:'Night Phonk',mood:'Phonk · notte e adrenalina',bpm:130,root:98,roots:[0,-2,-4,-2],chords:[[0,3,7],[-2,2,5],[-4,0,3],[-2,2,5]],kick:'x.....x...x.....',clap:'........x.......',hat:'x.x.x.x.x.x.x.xx',cow:'x..x..x...x.x...',pad:0,bass:'808',arp:null,echo:.2,duck:0,drive:2.2},
  lofi:{name:'Lo-Fi Sunset',mood:'Lo-Fi · rilassante',bpm:78,root:130.81,roots:[0,-3,-7,-5],chords:[[0,4,7,11],[-3,0,4,7],[-7,-3,0,4],[-5,-1,2,5]],kick:'x.....x.....x...',clap:'....x.......x...',hat:'x.x.x.x.x.x.x.x.',pad:0,rhodes:1,bass:'sine',arp:null,echo:.25,duck:0,swing:.18,vinyl:1},
  house:{name:'Future House',mood:'House · energia da party',bpm:124,root:110,roots:[0,-4,3,-2],chords:[[0,3,7],[-4,0,3],[3,7,10],[-2,2,5]],kick:'x...x...x...x...',clap:'....x.......x...',hat:'..x...x...x...x.',stab:'.x..x..x.x..x...',pad:0,bass:'pump',arp:null,echo:.15,duck:.6},
  trap:{name:'Cyber Trap',mood:'Trap · cupo e moderno',bpm:70,root:55,roots:[0,0,-4,-2],chords:[[0,3,7],[0,3,7],[-4,0,3],[-2,2,5]],kick:'x......x..x.....',clap:'........x.......',hat:'xxxxxxxxxxxxxxxx',pad:0,bass:'808',arp:[0,2,1,2,0,2,1,2,0,2,1,2,2,1,0,1],arpWave:'bell',echo:.3,duck:0,drive:1.8},
  cinema:{name:'Cinematic Rise',mood:'Cinematico · epico',bpm:84,root:98,roots:[0,-4,-2,-5],chords:[[0,3,7,12],[-4,0,3,7],[-2,2,5,9],[-5,-1,2,7]],kick:'x...............',clap:'................',hat:'................',pad:1,strings:1,bass:'sine',arp:null,echo:.35,duck:0,timp:1,riser:1},
  hyper:{name:'Hyper Pop',mood:'Hyperpop · luminoso',bpm:150,root:164.81,roots:[0,7,9,5],chords:[[0,4,7],[7,11,14],[9,12,16],[5,9,12]],kick:'x...x...x...x...',clap:'....x.......x...',hat:'xxxxxxxxxxxxxxxx',arp:[0,1,2,1,2,1,0,1,2,1,0,1,2,1,2,1],arpWave:'sq',pad:0,bass:'saw8',echo:.3,duck:.5},
  ambient:{name:'Dream Float',mood:'Ambient · sognante',bpm:70,root:130.81,roots:[0,-3,-5,-7],chords:[[0,7,12,16],[-3,4,9,12],[-5,2,7,11],[-7,0,4,9]],kick:'................',clap:'................',hat:'................',pad:1,strings:0,bass:'sine',arp:[0,1,2,3,2,1,0,1,2,3,2,1,0,1,2,1],arpWave:'bell',arpSlow:1,echo:.5,duck:0}
 };
 const on=(p,i)=>p&&p[i%16]!=='.'&&p[i%16]!==' ';
 function render(id,seconds){
  const S=STYLES[id];if(!S)throw Error('Base musicale non disponibile.');
  if(!Number.isFinite(seconds)||seconds<=0||seconds>180)throw Error('Durata musica non valida.');
  const N=Math.ceil(seconds*RATE),beat=60/S.bpm,step=beat/4,bar=beat*4;
  const drums=new Float32Array(N),mel=new Float32Array(N),bass=new Float32Array(N),pad=new Float32Array(N);
  let seed=48271;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647*2-1};
  const stamp=(buf,t0,dur,amp,fn)=>{const a=Math.max(0,Math.floor(t0*RATE)),b=Math.min(N,Math.floor((t0+dur)*RATE));for(let i=a;i<b;i++)buf[i]+=fn((i-a)/RATE)*amp};
  const kicks=[];
  const nSteps=Math.floor(seconds/step)+1;
  for(let s=0;s<nSteps;s++){
   const t=s*step+((s%2)?(S.swing||0)*step:0),i16=s%16,barIdx=Math.floor(s/16),ch=barIdx%4,root=S.root;
   if(on(S.kick,i16)){kicks.push(t);stamp(drums,t,.35,.9,l=>Math.sin(2*Math.PI*(46*l+9*(1-Math.exp(-l*26))))*Math.exp(-l*(id==='trap'||id==='phonk'?9:15)))}
   if(on(S.clap,i16)){stamp(drums,t,.22,.38,l=>rnd()*Math.exp(-l*(id==='lofi'?16:22))*(1+.2*Math.sin(l*900)))}
   if(on(S.hat,i16)){const acc=(i16%4===2)?1:.55,roll=(id==='trap'&&i16>=14)?2:1;for(let r=0;r<roll;r++)stamp(drums,t+r*step/2,.05,.16*acc,l=>rnd()*Math.exp(-l*95))}
   if(S.cow&&on(S.cow,i16)){stamp(drums,t,.18,.22,l=>(sq(540*l)+sq(800*l))*.5*Math.exp(-l*26))}
   // basso
   const rootHz=f(root,S.roots[ch])/ (id==='trap'||id==='phonk'?1:2);
   if(S.bass==='808'){if(on(S.kick,i16))stamp(bass,t,step*3.6,.9,l=>{const fr=rootHz*(1+.35*Math.exp(-l*18));return Math.tanh((S.drive||1.6)*Math.sin(2*Math.PI*fr*l))*Math.exp(-l*2.6)*Math.min(1,l/.004)})}
   else if(S.bass==='pump'){if(i16%4===2)stamp(bass,t,step*1.8,.55,l=>(saw(rootHz*2*l)*.6+Math.sin(2*Math.PI*rootHz*l)*.6)*Math.exp(-l*6)*Math.min(1,l/.004))}
   else if(S.bass==='saw8'){if(i16%2===0)stamp(bass,t,step*1.9,.38,l=>{const x=saw(rootHz*l)+.5*saw(rootHz*1.005*l);return x*.45*Math.exp(-l*5)*Math.min(1,l/.005)})}
   else {if(i16%8===0)stamp(bass,t,step*7,.55,l=>Math.sin(2*Math.PI*rootHz*l)*Math.exp(-l*1.3)*Math.min(1,l/.01))}
   // arpeggio
   if(S.arp){const idx=S.arp[i16],chord=S.chords[ch],semi=chord[idx%chord.length]+(S.arpSlow?12:12)+(i16>=8&&!S.arpSlow?0:0),fr=f(root,semi),slow=S.arpSlow?(i16%4===0):true;
    if(slow){const w=S.arpWave;stamp(mel,t,S.arpSlow?step*5:step*1.6,.17,l=>{let v;if(w==='bell')v=Math.sin(2*Math.PI*fr*l)+.45*Math.sin(2*Math.PI*fr*2.76*l)*Math.exp(-l*9);else if(w==='sq')v=sq(fr*l)*.6;else v=saw(fr*l)*.7;return v*Math.exp(-l*(S.arpSlow?2.2:9))*Math.min(1,l/.004)})}}
   // stab house
   if(S.stab&&on(S.stab,i16)){const chord=S.chords[ch];stamp(mel,t,step*1.7,.22,l=>{let v=0;for(const n of chord)v+=saw(f(root,n+12)*l)+saw(f(root,n+12)*1.004*l);return v*.18*Math.exp(-l*11)*Math.min(1,l/.003)})}
  }
  // pad / archi / rhodes: un accordo per battuta
  const bars=Math.ceil(seconds/bar);
  for(let b=0;b<bars;b++){
   const t0=b*bar,chord=S.chords[b%4];
   if(S.pad||S.strings!==undefined){const slow=S.strings===0?2.5:1;for(const n of chord){const fr=f(S.root,n+12);stamp(pad,t0,bar*1.04,.11,l=>{const env=Math.min(1,l/(.35*slow))*Math.exp(-Math.max(0,l-bar*.82)*5);return (saw(fr*l)+saw(fr*1.006*l)+saw(fr*.994*l))*.33*env})}}
   if(S.rhodes){for(let k=0;k<chord.length;k++){const fr=f(S.root,chord[k]+12);const tt=t0+k*step*(S.swing?1.3:1)*1.5;stamp(pad,tt,bar*.95,.18,l=>(Math.sin(2*Math.PI*fr*l)+.35*Math.sin(2*Math.PI*fr*2*l)*Math.exp(-l*6))*Math.exp(-l*1.9)*Math.min(1,l/.004))}}
   if(S.timp&&b%2===0){stamp(drums,t0,.9,.8,l=>Math.sin(2*Math.PI*(55*(1+.5*Math.exp(-l*14))*l))*Math.exp(-l*3.4))}
   if(S.riser&&b%8===7){stamp(mel,t0,bar,.3,l=>{const p=l/bar;return rnd()*(.15+.85*p)*p+Math.sin(2*Math.PI*(180+p*p*1400)*l)*.25*p})}
  }
  // echo sul melodico
  if(S.echo){const d=Math.floor(step*3*RATE);for(let i=d;i<N;i++)mel[i]+=mel[i-d]*S.echo}
  // sidechain: i suoni armonici "respirano" sul kick
  if(S.duck){const depth=S.duck;for(const kt of kicks){const a=Math.floor(kt*RATE),b=Math.min(N,a+Math.floor(.3*RATE));for(let i=a;i<b;i++){const l=(i-a)/RATE,g=1-depth*Math.exp(-l*10);mel[i]*=g;pad[i]*=g;bass[i]*=g}}}
  const out=new Int16Array(N);let vinylSeed=1;
  for(let i=0;i<N;i++){
   const t=i/RATE;let v=drums[i]*.85+mel[i]+bass[i]*.8+pad[i];
   if(S.vinyl){vinylSeed=(vinylSeed*48271)%2147483647;const n=vinylSeed/2147483647*2-1;v+=n*.012+((vinylSeed%997)===0?n*.12:0)}
   const fade=Math.min(1,t/.04,(seconds-t)/.35);
   v=Math.tanh(v*1.15)*.9*fade;out[i]=Math.round(v*32767);
  }
  const buffer=new ArrayBuffer(44+N*2),view=new DataView(buffer);
  const str=(at,text)=>{for(let j=0;j<text.length;j++)view.setUint8(at+j,text.charCodeAt(j))};
  str(0,'RIFF');view.setUint32(4,36+N*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,RATE,true);view.setUint32(28,RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,N*2,true);
  new Int16Array(buffer,44).set(out);
  return buffer;
 }
 window.koreMusic={ids:Object.keys(STYLES),has:id=>!!STYLES[id],info:id=>({id,...STYLES[id]}),render};
})();
