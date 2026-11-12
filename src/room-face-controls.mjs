/** Alpha 0.9 — facial controls using the existing animated 2D rig, no fake sprite promises. */
(() => {
  'use strict';
  const start = () => {
    const rig = window.AetheriaRoomRig;
    const stage = document.getElementById('room-v04');
    const room = document.querySelector('[data-panel="room"]');
    const controls = room?.querySelector('.room-rig-controls');
    if (!rig || !stage || !controls || document.getElementById('aetheria-face-controls')) return;
    const shell = document.createElement('section');
    shell.className = 'face-controls';
    shell.id = 'aetheria-face-controls';
    shell.setAttribute('aria-label', 'Espressioni e movimenti del rig 2D');
    shell.innerHTML = `
      <strong>Volto, espressioni e sguardo</strong>
      <p>Prova i movimenti veri del manichino 2D. Il modello semi-realistico dipinto è ancora in preparazione.</p>
      <div class="face-controls-buttons" role="group" aria-label="Espressioni">
        <button type="button" data-face-expression="neutral">Neutra</button>
        <button type="button" data-face-expression="smile">Sorriso</button>
        <button type="button" data-face-expression="curious">Curiosa</button>
        <button type="button" data-face-expression="surprised">Sorpresa</button>
      </div>
      <div class="face-controls-buttons">
        <button type="button" data-face-command="blink">◉ Battito</button>
        <button type="button" data-face-command="wave">👋 Saluto</button>
        <button type="button" data-face-command="reset">↺ Ripristina</button>
      </div>
      <label class="face-tilt" for="face-head-tilt">Inclinazione testa <output id="face-head-tilt-value">0°</output></label>
      <input type="range" id="face-head-tilt" min="-20" max="20" value="0" step="1">
      <label class="face-follow"><input type="checkbox" id="face-follow-pointer"> Gli occhi seguono il dito</label>
      <div class="face-preview"><canvas id="face-preview-canvas" width="280" height="160" role="img" aria-label="Anteprima ravvicinata del rig 2D"></canvas><span>RIG REALE · ZOOM VOLTO</span></div>
      <p class="face-status" id="face-control-status" role="status">Seleziona un comando per attivare il rig.</p>`;
    controls.insertAdjacentElement('afterend', shell);
    const status = shell.querySelector('#face-control-status');
    const expressionButtons = [...shell.querySelectorAll('[data-face-expression]')];
    const tilt = shell.querySelector('#face-head-tilt');
    const tiltOutput = shell.querySelector('#face-head-tilt-value');
    const follow = shell.querySelector('#face-follow-pointer');
    const preview = shell.querySelector('#face-preview-canvas');
    const c = preview.getContext('2d');
    let requestId = 0;
    async function run(label, callback) {
      const id = ++requestId;
      if (rig.getState().mode !== 'rig') {
        status.textContent = 'Attivazione manichino articolato…';
        await rig.setMode('rig');
      }
      if (id !== requestId) return;
      if (rig.getState().mode !== 'rig' || !rig.getState().ready) {
        status.textContent = 'Rig non disponibile. La modalità illustrata resta utilizzabile.';
        return;
      }
      callback();
      status.textContent = label + ' · movimento del manichino 2D';
    }
    const expressionLabels = {neutral:'Neutra', smile:'Sorridente', curious:'Curiosa', surprised:'Sorpresa'};
    expressionButtons.forEach(button => button.addEventListener('click', () => void run(expressionLabels[button.dataset.faceExpression], () => {
      rig.setExpression(button.dataset.faceExpression);
      expressionButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    })));
    shell.querySelector('[data-face-command=blink]').addEventListener('click', () => void run('Battito palpebre', () => rig.blink()));
    shell.querySelector('[data-face-command=wave]').addEventListener('click', () => void run('Saluto', () => rig.wave()));
    shell.querySelector('[data-face-command=reset]').addEventListener('click', () => void run('Posa neutra', () => {
      rig.setExpression('neutral'); rig.setGaze(0,0); rig.setTilt(0);
      tilt.value = 0; tiltOutput.textContent = '0°';
      expressionButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.faceExpression === 'neutral')));
    }));
    tilt.addEventListener('input', () => {
      const value = Number(tilt.value);
      tiltOutput.textContent = value + '°';
      void run('Testa ' + value + '°', () => rig.setTilt(value));
    });
    stage.addEventListener('pointermove', event => {
      if (!follow.checked || rig.getState().mode !== 'rig') return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .4) * 2));
      rig.setGaze(x, y);
    });
    stage.addEventListener('pointerleave', () => { if (follow.checked) rig.setGaze(0,0); });
    follow.addEventListener('change', () => {
      if (!follow.checked) rig.setGaze(0,0);
      else void run('Sguardo attivato', () => {});
    });
    // Live enlargement of actual rig canvas, not a separate static mockup.
    let previous = 0;
    const frame = now => {
      requestAnimationFrame(frame);
      if (now - previous < 110 || document.hidden || room.hidden || !c) return;
      previous = now;
      const source = document.querySelector('#room-avatar-preview canvas.room-rig-canvas');
      c.clearRect(0,0,preview.width,preview.height);
      if (!source || source.hidden || !source.width || !rig.getState().ready) return;
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(source, source.width*.17, source.height*.01, source.width*.66, source.height*.37, 0,0,preview.width,preview.height);
    };
    requestAnimationFrame(frame);
    // The main Actions buttons affect the articulated rig when that mode is selected.
    document.querySelector('#actions')?.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action || rig.getState().mode !== 'rig') return;
      if (action === 'wave') rig.wave();
      if (action === 'think') rig.setExpression('curious');
      if (action === 'relax') rig.setExpression('smile');
      if (action === 'idle') {rig.setExpression('neutral');rig.setTilt(0);rig.setGaze(0,0);}
      status.textContent = 'Azione ' + action + ' applicata al rig.';
    });
    Object.defineProperty(window,'AetheriaFaceControls',{configurable:false,value:Object.freeze({version:'0.9.0',getStatus:()=>status.textContent})});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();