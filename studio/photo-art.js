const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function artPixels(data,w,h,style,amount=80,detail=55){
 if(!style||style==='none'||!amount)return;
 const original=data.slice(),src=new Uint8ClampedArray(data.length),luma=new Float32Array(w*h),mix=clamp(amount/100,0,1);
 // Range-aware smoothing keeps strong contours while flattening small textures.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const at=(y*w+x)*4;let r=0,g=0,b=0,total=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const j=(clamp(y+dy,0,h-1)*w+clamp(x+dx,0,w-1))*4;
   const distance=Math.abs(original[j]-original[at])+Math.abs(original[j+1]-original[at+1])+Math.abs(original[j+2]-original[at+2]);
   const weight=(dx||dy?1:3)/(1+distance*distance/1800)*(original[j+3]/255);r+=original[j]*weight;g+=original[j+1]*weight;b+=original[j+2]*weight;total+=weight;
  }
  src[at]=total?r/total:original[at];src[at+1]=total?g/total:original[at+1];src[at+2]=total?b/total:original[at+2];luma[y*w+x]=.2126*src[at]+.7152*src[at+1]+.0722*src[at+2];
 }
 const lum=(x,y)=>luma[clamp(y,0,h-1)*w+clamp(x,0,w-1)];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;if(!original[i+3])continue;
  const gx=-lum(x-1,y-1)+lum(x+1,y-1)-2*lum(x-1,y)+2*lum(x+1,y)-lum(x-1,y+1)+lum(x+1,y+1);
  const gy=-lum(x-1,y-1)-2*lum(x,y-1)-lum(x+1,y-1)+lum(x-1,y+1)+2*lum(x,y+1)+lum(x+1,y+1);
  const edge=clamp((Math.hypot(gx,gy)-(110-detail)) / 180,0,1),v=luma[y*w+x];let r=src[i],g=src[i+1],b=src[i+2];
  if(style==='duotone'){const q=v/255;r=30+q*225;g=15+q*180;b=75+q*130}
  else if(style==='blueprint'){const line=Math.max(edge,(v>210?.2:0));r=14+line*220;g=40+line*205;b=91+line*164}
  else if(style==='halftone'){const radius=(1-v/255)*3.2,dot=Math.hypot(x%6-2.5,y%6-2.5)<radius;r=g=b=dot?24:247}
  else if(style==='comicpop'){const q=v/255;r=q>.6?255:q>.3?235:41;g=q>.6?220:q>.3?56:20;b=q>.6?86:q>.3?151:90;r*=1-edge*.7;g*=1-edge*.7;b*=1-edge*.7}
  else if(style==='thermal'){const q=v/255;r=Math.min(255,q*700);g=Math.max(0,(q-.35)*390);b=Math.max(0,180-q*400)}
  else if(style==='infrared'){r=255-src[i+1]*.75;g=src[i]*.55;b=src[i+2]*.85+30}
  else if(style==='emboss'){r=g=b=128+(gx+gy)*.45}
  else if(style==='solarize'){r=r>128?255-r:r;g=g>128?255-g:g;b=b>128?255-b:b;r*=1.7;g*=1.7;b*=1.7}
  else  if(style==='manga'){let tone=v>190?255:v>120?218:v>65?140:35;if(v>65&&v<190&&((x%5)+(y%5)<3))tone-=85;r=g=b=tone*(1-edge*.96)}
  else if(style==='sketch'){const pencil=clamp(255-edge*245-Math.max(0,150-v)*.33,0,255);r=pencil;g=pencil*.985;b=pencil*.95}
  else {
   const steps=style==='anime'?9:style==='watercolor'?16:6;
   const band=Math.round(v/255*steps)/steps*255,shift=(band-v)*.8;
   // Quantize luminance together, avoiding colored speckles in dark hair/clothes.
   r+=shift;g+=shift;b+=shift;
   if(style==='anime'){r=r*1.045+5;g=g*1.01+3;b=b*.98+9}
   if(style==='watercolor'){r=r*.88+31;g=g*.88+28;b=b*.88+24}
   const outline=edge*(style==='watercolor'?.18:style==='anime'?.68:.85);r*=1-outline;g*=1-outline;b*=1-outline;
  }
  data[i]=original[i]*(1-mix)+r*mix;data[i+1]=original[i+1]*(1-mix)+g*mix;data[i+2]=original[i+2]*(1-mix)+b*mix;
 }
}
export function applyPhotoArt(canvas,state){
 if(!state.artStyle||state.artStyle==='none'||!state.artAmount)return;
 const w=canvas.width,h=canvas.height,scale=Math.min(1,1600/Math.max(w,h)),work=document.createElement('canvas');work.width=Math.max(1,Math.round(w*scale));work.height=Math.max(1,Math.round(h*scale));
 const ctx=work.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,work.width,work.height);const pixels=ctx.getImageData(0,0,work.width,work.height);artPixels(pixels.data,work.width,work.height,state.artStyle,state.artAmount,state.artDetail);ctx.putImageData(pixels,0,0);
 const out=canvas.getContext('2d');out.save();out.globalCompositeOperation='source-atop';out.drawImage(work,0,0,w,h);out.restore();work.width=work.height=1;
}
