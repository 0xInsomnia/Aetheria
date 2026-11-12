/**
 * Aetheria Alpha 0.8 — optional Canvas rig in the room.
 * The real illustration remains the default; sprites are schematic placeholders.
 */
import { prepareRig, computeWorld, resolvePalette } from '../character/src/rig-core.mjs';
import { Animator } from '../character/src/animation.mjs';
import { CanvasRigRenderer, fitView, loadCharacter } from '../character/src/renderer-canvas.mjs';

function button(label, click) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.addEventListener('click', click);
  return el;
}
function init() {
  const scene = document.getElementById('scene');
  const figure = document.getElementById('room-avatar-preview');
  const panel = document.querySelector('[data-panel="room"] .avatar-preview-controls');
  if (!scene || !figure || !panel) return;

  const storageKey = 'aetheria.rig-room-v08';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  const palettes = ['nero-viola', 'nero-rosso', 'chiaro-azzurro'];
  const expressionNames = ['neutral', 'smile', 'curious', 'surprised'];
  const state = {
    mode: 'illustration',
    palette: palettes.includes(saved.palette) ? saved.palette : 'nero-viola',
    expression: expressionNames.includes(saved.expression) ? saved.expression : 'neutral',
    ready: false, error: null
  };
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({palette:state.palette,expression:state.expression})); } catch {}
  };

  const wrap = document.createElement('div');
  wrap.className = 'room-rig-controls';
  wrap.setAttribute('aria-label','Anteprima rig articolato');
  const title = document.createElement('strong');
  title.textContent = 'Anteprima animazioni 2D';
  const explanation = document.createElement('p');
  explanation.textContent = 'Scegli fra il concept illustrato e il manichino tecnico realmente articolato. I livelli semi-realistici definitivi non sono ancora pronti.';
  const modes = document.createElement('div');
  modes.className = 'room-rig-options';
  const actions = document.createElement('div');
  actions.className = 'room-rig-options';
  const status = document.createElement('p');
  status.className = 'room-rig-status';
  status.setAttribute('role','status');
  status.textContent = 'Modalità illustrata: immagine statica.';

  const canvas = document.createElement('canvas');
  canvas.className = 'room-rig-canvas';
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Manichino tecnico 2D con parti articolate');
  canvas.width = 200;
  canvas.height = 400;
  canvas.hidden = true;
  figure.append(canvas);
  const artwork = figure.querySelector('.room-avatar-art');
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;

  let rig = null, prepared = null, renderer = null, animator = null, loading = null, previous = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const illustrated = button('Illustrata',()=>{void changeMode('illustration');});
  illustrated.setAttribute('aria-pressed','true');
  const schematic = button('Rig animato · demo',()=>{void changeMode('rig');});
  schematic.setAttribute('aria-pressed','false');
  const wave = button('👋 Saluta',()=>animator?.play('wave'));
  const blink = button('◉ Battito',()=>animator?.triggerBlink());
  const expression = document.createElement('select');
  expression.setAttribute('aria-label','Espressione del rig');
  for (const [id, label] of [['neutral','Neutra'],['smile','Sorridente'],['curious','Curiosa'],['surprised','Sorpresa']]) {
    expression.add(new Option(label,id));
  }
  expression.value = state.expression;
  expression.addEventListener('change',()=>{
    state.expression = expression.value;
    animator?.setExpression(state.expression);
    persist();
  });
  const palette = document.createElement('select');
  palette.setAttribute('aria-label','Palette del rig');
  for (const [id,label] of [['nero-viola','Nero / viola'],['nero-rosso','Nero / rosso'],['chiaro-azzurro','Chiaro / azzurro']]) {
    palette.add(new Option(label,id));
  }
  palette.value = state.palette;
  palette.addEventListener('change',()=>{state.palette=palette.value;persist();});
  modes.append(illustrated,schematic);
  actions.append(wave,blink,expression,palette);
  wrap.append(title,explanation,modes,actions,status);
  panel.append(wrap);

  function sync() {
    const active=state.mode==='rig';
    illustrated.setAttribute('aria-pressed',String(!active));
    schematic.setAttribute('aria-pressed',String(active));
    wave.disabled = blink.disabled = expression.disabled = palette.disabled = !active || !state.ready;
    if (artwork) artwork.hidden=active;
    canvas.hidden=!active;
    figure.classList.toggle('rig-preview-active',active);
  }

  async function changeMode(mode) {
    if (mode!=='rig') {
      state.mode='illustration';
      status.textContent='Modalità illustrata: figura statica, non animata a livelli.';
      sync();
      return;
    }
    status.textContent='Caricamento del manichino articolato…';
    state.mode='illustration';
    sync();
    try {
      if (!loading) {
        const baseUrl=new URL('../character/',import.meta.url);
        loading=loadCharacter(baseUrl,'placeholder').then(data=>{
          if (data.failed.length || data.images.size < 56) throw new Error('Non tutti i 56 sprite sono disponibili.');
          rig=data.rig;
          prepared=prepareRig(rig);
          renderer=new CanvasRigRenderer(prepared,data.spriteSet,data.images);
          animator=new Animator(prepared,data.clips);
          if (!reduced) {
            animator.play('breathe');
            animator.play('hairIdle');
          } else {
            animator.physicsEnabled=false;
            animator.blinkEnabled=false;
          }
          animator.setExpression(state.expression);
          state.ready=true;
        }).catch(error=>{loading=null;throw error;});
      }
      await loading;
      state.mode='rig';
      state.error=null;
      status.textContent='Rig attivo · 28 ossa / 56 livelli (grafica tecnica provvisoria).';
      sync();
      persist();
    } catch (error) {
      state.mode='illustration';
      state.error=String(error?.message||error);
      status.textContent='Rig non disponibile: '+state.error+' La scena illustrata rimane utilizzabile.';
      sync();
    }
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (state.mode!=='rig'||!state.ready||!scene.classList.contains('room-display')||figure.hidden||document.hidden) {
      previous=now;
      return;
    }
    const ratio=Math.min(1.5,window.devicePixelRatio||1);
    const width=Math.max(1,Math.round(canvas.clientWidth*ratio));
    const height=width*2;
    if (canvas.width!==width||canvas.height!==height) { canvas.width=width;canvas.height=height; }
    const dt=previous?Math.min(60,now-previous):0;
    previous=now;
    const {pose,slots}=animator.update(reduced?0:dt);
    const world=computeWorld(prepared,pose);
    const view=fitView([0,0,rig.canvas.width,rig.canvas.height],0,0,width,height,.025);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,width,height);
    renderer.draw(ctx,world,slots,{colors:resolvePalette(prepared,state.palette),view});
  }
  requestAnimationFrame(draw);
  sync();
  Object.defineProperty(window,'AetheriaRoomRig',{value:Object.freeze({
    version:'0.8.0',
    getState:()=>({mode:state.mode,palette:state.palette,expression:state.expression,ready:state.ready,error:state.error}),
    setMode:changeMode,
    wave:()=>animator?.play('wave')
  }),configurable:false});
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
