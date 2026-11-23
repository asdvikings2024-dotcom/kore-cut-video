export function installPhotoTouch(dialog){
 const canvas=dialog.querySelector('#photoCanvas'),stage=canvas.parentElement,points=new Map();let zoom=1,x=0,y=0,gesture=null,timer=null,held=false,start=null,view=false;
 const compare=dialog.querySelector('#photoCompare');
 const apply=()=>{const mx=stage.clientWidth*(zoom-1)/2,my=stage.clientHeight*(zoom-1)/2;x=Math.max(-mx,Math.min(mx,x));y=Math.max(-my,Math.min(my,y));canvas.style.transform='translate('+x+'px,'+y+'px) scale('+zoom+')'};
 const distance=()=>{const p=[...points.values()];return p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0};
 const begin=()=>{const p=[...points.values()][0];gesture=p?{distance:distance(),zoom,x,y,point:p}:null};
 const cancel=()=>{clearTimeout(timer);timer=null};
 const releaseCompare=()=>{cancel();if(held){held=false;if(!compare.disabled)compare.click()}};
 const down=e=>{const hidden=dialog.classList.contains('photo-ui-hidden');if(e.target!==canvas||(!hidden&&canvas.style.cursor!=='grab')||compare.disabled)return;start={x:e.clientX,y:e.clientY};points.set(e.pointerId,{x:e.clientX,y:e.clientY});const crop=dialog.querySelector('[data-photo-tab=crop]')?.getAttribute('aria-pressed')==='true';view=hidden||e.pointerType!=='mouse'&&(!crop||dialog.classList.contains('photo-ui-hidden')||points.size>1||zoom>1);if(view){e.stopImmediatePropagation();try{canvas.setPointerCapture(e.pointerId)}catch{}begin()}if(points.size===1&&compare.getAttribute('aria-pressed')!=='true'){cancel();timer=setTimeout(()=>{if(!compare.disabled&&points.size===1){held=true;compare.click()}},400)}else cancel()};
 const move=e=>{if(!points.has(e.pointerId))return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)releaseCompare();if(held){e.stopImmediatePropagation();return}if(points.size>1){cancel();view=true;if(!gesture?.distance){begin();return}}if(view&&gesture){e.stopImmediatePropagation();if(points.size>1)zoom=Math.max(1,Math.min(4,gesture.zoom*distance()/gesture.distance));else{x=gesture.x+e.clientX-gesture.point.x;y=gesture.y+e.clientY-gesture.point.y}apply()}};
 const end=e=>{releaseCompare();points.delete(e.pointerId);if(view)e.stopImmediatePropagation();begin();if(!points.size){start=null;view=false}};
 stage.addEventListener('pointerdown',down,true);stage.addEventListener('pointermove',move,true);stage.addEventListener('pointerup',end,true);stage.addEventListener('pointercancel',end,true);stage.addEventListener('lostpointercapture',end,true);
 const reset=()=>{zoom=1;x=y=0;gesture=null;points.clear();canvas.style.transform='';releaseCompare()};
 const input=dialog.querySelector('#photoInput');input.addEventListener('change',reset);dialog.querySelectorAll('[data-photo-tab]').forEach(b=>b.addEventListener('click',reset));
 return ()=>{releaseCompare();stage.removeEventListener('pointerdown',down,true);stage.removeEventListener('pointermove',move,true);stage.removeEventListener('pointerup',end,true);stage.removeEventListener('pointercancel',end,true);stage.removeEventListener('lostpointercapture',end,true);input.removeEventListener('change',reset)};
}
