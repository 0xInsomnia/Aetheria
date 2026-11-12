/* Aetheria Alpha 0.6 visual prototype — a separate composited figure, NOT a walking rig. */
(() => {
 'use strict';
 const scene=document.getElementById('scene');
 const stage=document.getElementById('room-v04');
 const panel=document.querySelector('[data-panel="room"]');
 if(!scene||!stage||!panel) return;
 const bg=stage.querySelector(':scope > img');
 if(!bg)return;
 const storageKey='aetheria.avatar-preview-v06';
 const locations={
   centro:{x:'49%',bottom:'3%',scale:'1'},
   letto:{x:'31%',bottom:'5%',scale:'.95'},
   scrivania:{x:'71%',bottom:'5%',scale:'.79'},
   divano:{x:'76%',bottom:'4%',scale:'.83'}
 };
 const zoneMap={bed:'letto',desk:'scrivania',sofa:'divano',window:'centro',lamp:'letto'};
 let state={visible:true,position:'centro'};
 try {const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved==='object')state={...state,...saved};}catch{}
 if(!Object.hasOwn(locations,state.position))state.position='centro';
 state.visible=state.visible!==false;
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{}};
 const figure=document.createElement('div');figure.className='room-avatar-anchor';figure.id='room-avatar-preview';
 figure.setAttribute('aria-hidden','true');
 const shadow=document.createElement('span');shadow.className='room-avatar-floor-shadow';shadow.setAttribute('aria-hidden','true');
 const art=document.createElement('img');art.className='room-avatar-art';art.src='./assets/aetheria-character-concept-v06.webp';art.alt='';art.decoding='async';art.loading='eager';
 figure.append(shadow,art);bg.insertAdjacentElement('afterend',figure);
 const group=document.createElement('section');group.className='avatar-preview-controls';group.setAttribute('aria-label','Anteprima personaggio nella stanza');
 const row=document.createElement('div');row.className='avatar-preview-row';
 const label=document.createElement('label');const toggle=document.createElement('input');toggle.type='checkbox';toggle.id='avatar-room-toggle';
 label.append(toggle,document.createTextNode('Mostra Aetheria nella stanza'));row.append(label);
 const presets=document.createElement('div');presets.className='avatar-preview-preset';
 for(const [id,name] of Object.entries({centro:'Centro',letto:'Letto',scrivania:'Scrivania',divano:'Divano'})){
   const button=document.createElement('button');button.type='button';button.dataset.avatarPlace=id;button.textContent=name;
   button.addEventListener('click',()=>place(id));presets.append(button);
 }
 const detail=document.createElement('p');detail.className='avatar-preview-detail';detail.id='avatar-room-note';
 detail.textContent='Figura 2D separata dal fondale, ancora statica. Lo spostamento è una transizione di posizione, non una camminata.';
 group.append(row,presets,detail);
 panel.append(group);
 function render(){
   const cfg=locations[state.position];figure.style.setProperty('--room-avatar-x',cfg.x);
   figure.style.setProperty('--room-avatar-bottom',cfg.bottom);
   figure.style.setProperty('--room-avatar-scale',cfg.scale);
   figure.hidden=!state.visible;toggle.checked=state.visible;
   presets.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatarPlace===state.position)));
   persist();
 }
 function place(where){if(!Object.hasOwn(locations,where))return;state.position=where;render();}
 toggle.addEventListener('change',()=>{state.visible=toggle.checked;render();});
 // The existing room hotspots remain authoritative for interaction state.
 document.addEventListener('click',event=>{
   const b=event.target.closest('[data-zone],[data-photo-zone]');
   if(!b)return;
   const zone=b.dataset.zone||b.dataset.photoZone;
   if(zoneMap[zone])place(zoneMap[zone]);
 });
 render();
 const tag=document.querySelector('.tag'); if(tag)tag.textContent='ALPHA 0.7';
 Object.defineProperty(window,'AetheriaCharacterPreview',{
   configurable:false,
   value:Object.freeze({version:'0.6.0',getState:()=>({...state}),place})
 });
})();
