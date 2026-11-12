import {W,H,PARTS,validateMasks,updatePoint,getJointPose,deepCopy} from './core.mjs';
const $=id=>document.getElementById(id);
const canvas=$('art'), ctx=canvas.getContext('2d');
const state={mode:'parts',head:0,hair:0,idle:false,part:'head',showPivots:true,drag:-1,source:null,parts:{},masks:null,original:null};
const announce=text=>{$('state').textContent=text;};
function pathFor(polygon){const p=new Path2D();polygon.forEach(([x,y],i)=>{if(i)p.lineTo(x,y);else p.moveTo(x,y);});p.closePath();return p;}
function layer(){const c=document.createElement('canvas');c.width=W;c.height=H;return c;}
function build(){
 if(!state.source||!state.masks)return;
 const img=state.source, parts=state.masks.parts;
 const headPath=pathFor(parts.head.polygon),hairPath=pathFor(parts.hair_back.polygon);
 for(const name of [...PARTS,'body']){
  const target=layer(),c=target.getContext('2d',{willReadFrequently:false});c.drawImage(img,0,0,W,H);
  if(name==='head'){c.globalCompositeOperation='destination-in';c.fill(headPath);}
  else if(name==='hair_back'){c.globalCompositeOperation='destination-in';c.fill(hairPath);c.globalCompositeOperation='destination-out';c.fill(headPath);}
  else{c.globalCompositeOperation='destination-out';c.fill(headPath);c.fill(hairPath);}
  c.globalCompositeOperation='source-over';state.parts[name]=target;
 }
 $('stats').textContent=`Ritagli: 3 livelli\nSorgente: ${W}×${H}\nVertici testa: ${parts.head.polygon.length}\nVertici capelli: ${parts.hair_back.polygon.length}`;
}
function partDraw(image,pivot,angle){if(!image)return;ctx.save();ctx.translate(...pivot);ctx.rotate(angle*Math.PI/180);ctx.translate(-pivot[0],-pivot[1]);ctx.drawImage(image,0,0,W,H);ctx.restore();}
function pointerInfo(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];}
function frame(now){
 requestAnimationFrame(frame);
 if(!state.source)return;
 const m=state.masks,pose=getJointPose({head:state.head,hair:state.hair});
 const t=state.idle?now/1000:0;
 const headAngle=pose.head+(state.idle?Math.sin(t*.72)*1.5:0);
 const hairAngle=pose.hair_back+(state.idle?Math.sin(t*.86+.8)*2:0);
 const pixelW=Math.max(1,Math.round(Math.min(2,devicePixelRatio||1)*canvas.clientWidth));
 const pixelH=Math.round(pixelW*H/W);
 if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
 const s=canvas.width/W;ctx.setTransform(s,0,0,s,0,0);ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#140c23';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#291b3d';ctx.fillRect(0,0,W,H);
 if(state.mode==='original') ctx.drawImage(state.source,0,0,W,H);
 else{
   partDraw(state.parts.body,[0,0],0);
   partDraw(state.parts.hair_back,m.parts.hair_back.pivot,hairAngle);
   partDraw(state.parts.head,m.parts.head.pivot,headAngle);
 }
 if(state.mode==='masks'&&state.showPivots){
  for(const name of PARTS){const p=m.parts[name],selected=state.part===name;
   ctx.save();ctx.strokeStyle=selected?'#d8abff':'#57dacf';ctx.lineWidth=selected?4:2;ctx.setLineDash(selected?[]:[10,9]);ctx.stroke(pathFor(p.polygon));ctx.setLineDash([]);
   if(selected)p.polygon.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,10,0,2*Math.PI);ctx.fillStyle=i===state.drag?'#fff':'#ad75f9';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#130d25';ctx.stroke();});
   ctx.beginPath();ctx.arc(...p.pivot,9,0,2*Math.PI);ctx.fillStyle='#ffca7e';ctx.fill();ctx.restore();
  }
 }
}
const save=()=>{try{localStorage.setItem('aetheria.pose-lab.masks.v1',JSON.stringify(state.masks));}catch{}};
const output=()=>{$('head-value').textContent=state.head+'°';$('hair-value').textContent=state.hair+'°';};
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{state.mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));announce(state.mode==='masks'?'Editor maschere: trascina i punti viola.':'Modalità '+button.textContent);});
$('head').addEventListener('input',e=>{state.head=Number(e.target.value);output();});
$('hair').addEventListener('input',e=>{state.hair=Number(e.target.value);output();});
$('idle').addEventListener('change',e=>{state.idle=e.target.checked;});
$('part').addEventListener('change',e=>{state.part=e.target.value;});
$('pivots').addEventListener('change',e=>{state.showPivots=e.target.checked;});
$('reset-pose').addEventListener('click',()=>{state.head=state.hair=0;state.idle=false;$('head').value=$('hair').value=0;$('idle').checked=false;output();});
$('reset-all').addEventListener('click',()=>{state.masks=deepCopy(state.original);build();save();announce('Maschere ripristinate ai valori originali.');});
canvas.addEventListener('pointerdown',e=>{if(state.mode!=='masks')return;const [x,y]=pointerInfo(e);const points=state.masks.parts[state.part].polygon;let best=-1,dist=Infinity;points.forEach(([px,py],i)=>{const d=Math.hypot(px-x,py-y);if(d<dist){best=i;dist=d;}});if(dist>32)return;state.drag=best;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(state.drag<0)return;const [x,y]=pointerInfo(e);updatePoint(state.masks,state.part,state.drag,[Math.round(Math.max(0,Math.min(W,x))),Math.round(Math.max(0,Math.min(H,y)))]);build();});
function dragDone(){if(state.drag>=0){state.drag=-1;save();announce('Maschera aggiornata e salvata in questo browser.');}}
canvas.addEventListener('pointerup',dragDone);canvas.addEventListener('pointercancel',dragDone);canvas.addEventListener('lostpointercapture',dragDone);
function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
for(const b of document.querySelectorAll('[data-export]'))b.addEventListener('click',()=>{const name=b.dataset.export,c=state.parts[name];if(!c)return; c.toBlob(blob=>{if(blob)download('aetheria-'+name+'-draft.png',blob);},'image/png');});
$('export-json').addEventListener('click',()=>download('aetheria-cut-masks-v1.json',new Blob([JSON.stringify(state.masks,null,2)],{type:'application/json'})));
async function start(){const [maskResp]=await Promise.all([fetch('./masks.json')]);if(!maskResp.ok)throw Error('File delle maschere mancante');state.original=await maskResp.json();
 let masks=state.original;try{const saved=JSON.parse(localStorage.getItem('aetheria.pose-lab.masks.v1')||'null');if(!validateMasks(saved).length)masks=saved;}catch{}
 if(validateMasks(masks).length)throw Error('Maschere errate: '+validateMasks(masks).join(', '));state.masks=deepCopy(masks);
 const img=new Image();img.src=new URL(state.original.source,location.href);await img.decode();state.source=img;
 build();requestAnimationFrame(frame);announce('Primi tre pezzi estratti dal concept: sposta testa e capelli per verificarli.');
 window.AetheriaPoseLab={getState:()=>({mode:state.mode,head:state.head,hair:state.hair,parts:Object.keys(state.parts),ready:!!state.source}),exportMasks:()=>deepCopy(state.masks)};
}
start().catch(e=>announce('Errore: '+e.message));
