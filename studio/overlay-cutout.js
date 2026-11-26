// Scontorno per sovrapposizioni (foto e loghi). Funzioni pure su pixel RGBA: testabili senza browser.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

// Colore dominante del bordo (mediana per canale). Restituisce null se il bordo è già trasparente.
export function borderColor(data,w,h){
 const r=[],g=[],b=[];let transparent=0,count=0;
 const take=(x,y)=>{const i=(y*w+x)*4;count++;if(data[i+3]<200){transparent++;return}r.push(data[i]);g.push(data[i+1]);b.push(data[i+2])};
 const step=Math.max(1,Math.floor(Math.max(w,h)/400));
 for(let x=0;x<w;x+=step){take(x,0);take(x,h-1)}for(let y=0;y<h;y+=step){take(0,y);take(w-1,y)}
 if(!r.length||transparent>count*.5)return null;
 const med=a=>{a.sort((p,q)=>p-q);return a[a.length>>1]};
 return [med(r),med(g),med(b)];
}

// Toglie il colore di sfondo collegato ai bordi (logo su sfondo uniforme). Le zone interne dello stesso colore
// (es. l'interno di una lettera) restano, perché il riempimento parte solo dai bordi.
export function removeBackgroundColor(src,w,h,tolerance=28){
 const out=new Uint8ClampedArray(src),bg=borderColor(src,w,h);
 if(!bg)return {data:out,removed:0,background:null};
 const dist=i=>Math.hypot(src[i]-bg[0],src[i+1]-bg[1],src[i+2]-bg[2])/1.732;
 const mark=new Uint8Array(w*h),stack=new Int32Array(w*h);let top=0;
 const push=p=>{if(!mark[p]&&dist(p*4)<=tolerance){mark[p]=1;stack[top++]=p}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(top){const p=stack[--top],x=p%w,y=(p/w)|0;if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w)}
 let removed=0;
 for(let p=0;p<w*h;p++){
  if(mark[p]){out[p*4+3]=0;removed++;continue}
  const x=p%w,y=(p/w)|0;
  const near=(x>0&&mark[p-1])||(x<w-1&&mark[p+1])||(y>0&&mark[p-w])||(y<h-1&&mark[p+w]);
  if(near){const d=dist(p*4);if(d<tolerance*2)out[p*4+3]=Math.round(out[p*4+3]*smooth(tolerance,tolerance*2,d))}
 }
 return {data:out,removed:removed/(w*h),background:bg};
}

// Applica la maschera dell'AI (valori 0-255, mw×mh, riferita a tutta l'immagine) con ingrandimento morbido e bordi netti.
export function applyMask(src,w,h,mask,mw,mh){
 const out=new Uint8ClampedArray(src);let kept=0;
 for(let y=0;y<h;y++){
  const fy=clamp((y+.5)/h*mh-.5,0,mh-1),y0=Math.floor(fy),y1=Math.min(mh-1,y0+1),ty=fy-y0;
  for(let x=0;x<w;x++){
   const fx=clamp((x+.5)/w*mw-.5,0,mw-1),x0=Math.floor(fx),x1=Math.min(mw-1,x0+1),tx=fx-x0;
   const m=((mask[y0*mw+x0]*(1-tx)+mask[y0*mw+x1]*tx)*(1-ty)+(mask[y1*mw+x0]*(1-tx)+mask[y1*mw+x1]*tx)*ty)/255;
   const a=smooth(.3,.7,m),i=(y*w+x)*4;out[i+3]=Math.round(out[i+3]*a);kept+=a;
  }
 }
 return {data:out,kept:kept/(w*h)};
}

// Rettangolo che contiene i pixel visibili (alpha>8), con un piccolo margine; null se l'immagine è vuota.
export function visibleBounds(data,w,h,margin=.02){
 let l=w,t=h,r=-1,b=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>8){if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y}
 if(r<l)return null;
 const mx=Math.round((r-l+1)*margin),my=Math.round((b-t+1)*margin);
 l=Math.max(0,l-mx);t=Math.max(0,t-my);r=Math.min(w-1,r+mx);b=Math.min(h-1,b+my);
 return {x:l,y:t,w:r-l+1,h:b-t+1};
}
