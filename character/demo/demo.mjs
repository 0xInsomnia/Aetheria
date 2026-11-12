/**
 * Banco prova indipendente del rig 2D. Non tocca l'applicazione principale.
 * Parametri URL: ?set=<nomeSet> per caricare un set di sprite diverso da "placeholder".
 */
import { prepareRig, validateRig, validateSpriteSet, computeWorld, clampPose, composePoses, resolveSlots, resolvePalette, transformPoint } from '../src/rig-core.mjs';
import { Animator, sampleClip, validateClips } from '../src/animation.mjs';
import { CanvasRigRenderer, drawDebug, fitView, loadCharacter } from '../src/renderer-canvas.mjs';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const setName = /^[a-z0-9][a-z0-9_-]*$/i.test(params.get('set') ?? '') ? params.get('set') : 'placeholder';
const canvas = $('stage');
const ctx = canvas.getContext('2d');

let resolveReady;
const api = { ready: new Promise((resolve) => { resolveReady = resolve; }) };
window.aetheriaDemo = api;

function explodedPose(prepared, distance = 46) {
  const [rx, ry] = prepared.root.pivot;
  const pose = {};
  for (const bone of prepared.bones) {
    if (!bone.joint) continue;
    const dx = bone.pivot[0] - rx, dy = bone.pivot[1] - ry;
    const length = Math.hypot(dx, dy) || 1;
    pose[bone.name] = { x: (dx / length) * distance, y: (dy / length) * distance };
  }
  return pose;
}

async function start() {
  const loaded = await loadCharacter(new URL('../', import.meta.url), setName);
  const { rig, clips, spriteSet, images, failed } = loaded;
  const structure = validateRig(rig);
  if (structure.errors.length) throw new Error(structure.errors.join('\n'));
  const prepared = prepareRig(rig);
  const problems = [...validateClips(prepared, clips), ...validateSpriteSet(prepared, spriteSet).errors, ...failed.map((f) => 'Immagine non caricata: ' + f)];
  const renderer = new CanvasRigRenderer(prepared, spriteSet, images);
  const animator = new Animator(prepared, clips);
  const full = [0, 0, rig.canvas.width, rig.canvas.height];

  const state = {
    palette: Object.keys(rig.palettes ?? {})[0] ?? '',
    overrides: {},
    bone: prepared.bones.find((b) => b.joint)?.name ?? prepared.root.name,
    sweep: null,
    pivotEdits: {},
    view: { scale: 1, x: 0, y: 0 },
    last: { world: computeWorld(prepared, {}), slots: resolveSlots(prepared, {}) }
  };

  // ---- Controlli -----------------------------------------------------------
  const syncClips = () => {
    const rest = $('rest').checked;
    for (const [id, clip] of [['breathe', 'breathe'], ['hair', 'hairIdle']]) {
      const wanted = $(id).checked && !rest;
      if (wanted && !animator.isPlaying(clip)) animator.play(clip);
      if (!wanted) animator.stop(clip);
    }
    animator.physicsEnabled = $('hair').checked && !rest;
    animator.blinkEnabled = $('blink').checked && !rest;
  };
  for (const id of ['breathe', 'hair', 'blink', 'rest']) $(id).addEventListener('change', syncClips);
  syncClips();

  $('wave').addEventListener('click', () => { $('rest').checked = false; syncClips(); animator.play('wave'); });
  $('blink-now').addEventListener('click', () => animator.triggerBlink());
  $('tilt').addEventListener('input', (e) => { animator.setHeadTilt(Number(e.target.value)); $('tilt-value').textContent = e.target.value + '°'; });
  $('follow').addEventListener('change', (e) => { if (!e.target.checked) animator.setGaze(0, 0); });

  for (const [name, expression] of Object.entries(rig.expressions ?? {})) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = expression.label ?? name;
    button.dataset.expression = name;
    button.setAttribute('aria-pressed', String(name === 'neutral'));
    button.addEventListener('click', () => {
      animator.setExpression(name);
      for (const b of $('expressions').children) b.setAttribute('aria-pressed', String(b === button));
    });
    $('expressions').append(button);
  }

  const colors = () => resolvePalette(prepared, state.palette, state.overrides);
  const tintInputs = {};
  for (const name of Object.keys(rig.palettes ?? {})) $('palette').append(new Option(name, name));
  for (const [group, config] of Object.entries(rig.tintGroups ?? {})) {
    const label = document.createElement('label');
    const input = Object.assign(document.createElement('input'), { type: 'color', value: colors()[group] });
    input.addEventListener('input', () => { state.overrides[group] = input.value; });
    label.append(input, document.createTextNode(config.label ?? group));
    $('tints').append(label);
    tintInputs[group] = input;
  }
  $('palette').addEventListener('change', (e) => {
    state.palette = e.target.value;
    state.overrides = {};
    for (const [group, input] of Object.entries(tintInputs)) input.value = colors()[group];
  });

  for (const bone of prepared.bones) $('bone').append(new Option(bone.name + (bone.joint ? ' ●' : ''), bone.name));
  $('bone').value = state.bone;
  const syncRotation = () => {
    const [min, max] = prepared.boneByName.get(state.bone).limits?.rotation ?? [-180, 180];
    Object.assign($('rotation'), { min, max });
    const value = animator.manual[state.bone]?.rotation ?? 0;
    $('rotation').value = value;
    $('rotation-value').textContent = Math.round(value) + '°';
  };
  $('bone').addEventListener('change', (e) => { state.bone = e.target.value; syncRotation(); });
  $('rotation').addEventListener('input', (e) => {
    animator.setManual(state.bone, { rotation: Number(e.target.value) });
    $('rotation-value').textContent = e.target.value + '°';
  });
  const stopSweep = () => { state.sweep = null; $('sweep').setAttribute('aria-pressed', 'false'); };
  $('reset-joints').addEventListener('click', () => { stopSweep(); animator.clearManual(); syncRotation(); });
  $('sweep').addEventListener('click', () => {
    if (state.sweep) { stopSweep(); animator.clearManual(); syncRotation(); return; }
    animator.clearManual();
    state.sweep = { bones: prepared.bones.filter((b) => b.joint).map((b) => b.name), index: 0, time: 0 };
    $('sweep').setAttribute('aria-pressed', 'true');
  });
  syncRotation();

  const showPivots = () => { $('pivot-json').value = Object.keys(state.pivotEdits).length ? JSON.stringify(state.pivotEdits, null, 1) : ''; };
  $('copy-pivots').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('pivot-json').value); } catch { $('pivot-json').select(); }
  });
  $('edit-pivot').addEventListener('change', (e) => { if (e.target.checked) { $('rest').checked = true; syncClips(); } });

  const toRig = (event) => {
    const box = canvas.getBoundingClientRect();
    const ratio = canvas.width / box.width;
    return [((event.clientX - box.left) * ratio - state.view.x) / state.view.scale, ((event.clientY - box.top) * ratio - state.view.y) / state.view.scale];
  };
  const movePivot = (event) => {
    const [x, y] = toRig(event).map((n) => Math.round(n));
    prepared.boneByName.get(state.bone).pivot = [x, y];
    state.pivotEdits[state.bone] = [x, y];
    showPivots();
  };
  let dragging = false;
  canvas.addEventListener('pointerdown', (event) => {
    if (!$('edit-pivot').checked) return;
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    movePivot(event);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', (event) => {
    if (dragging) { movePivot(event); return; }
    if (!$('follow').checked) return;
    const [x, y] = toRig(event);
    const eyes = prepared.rig.gaze?.bones ?? [];
    if (!eyes.length) return;
    const centre = eyes.map((name) => transformPoint(state.last.world[name], prepared.boneByName.get(name).pivot))
      .reduce((sum, p) => [sum[0] + p[0] / eyes.length, sum[1] + p[1] / eyes.length], [0, 0]);
    animator.setGaze((x - centre[0]) / 260, (y - centre[1]) / 260);
  });
  canvas.addEventListener('pointerleave', () => animator.setGaze(0, 0));

  $('report').textContent = [
    'Set di sprite: ' + (spriteSet.name ?? setName) + (spriteSet.partial ? ' (parziale)' : ''),
    'Ossa: ' + prepared.bones.length + ' · livelli: ' + prepared.layers.length + ' · immagini caricate: ' + images.size,
    'Clip: ' + Object.keys(clips).join(', '),
    ...(structure.warnings.length ? structure.warnings.map((w) => 'Avviso: ' + w) : []),
    ...(problems.length ? problems.map((p) => 'Errore: ' + p) : ['Nessun errore di struttura.'])
  ].join('\n');
  $('report').classList.toggle('bad', problems.length > 0);

  // ---- Ciclo di disegno ----------------------------------------------------
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(box.width * ratio)), height = Math.max(1, Math.round(box.height * ratio));
    if (canvas.width !== width || canvas.height !== height) Object.assign(canvas, { width, height });
    state.view = fitView(full, 0, 0, canvas.width, canvas.height, 0.03);
  };

  const advanceSweep = (dt) => {
    const sweep = state.sweep;
    if (!sweep) return;
    const duration = 2200;
    sweep.time += dt;
    if (sweep.time >= duration) {
      animator.setManual(sweep.bones[sweep.index], null);
      sweep.index++;
      sweep.time = 0;
      if (sweep.index >= sweep.bones.length) { stopSweep(); syncRotation(); return; }
    }
    const name = sweep.bones[sweep.index];
    const [min, max] = prepared.boneByName.get(name).limits?.rotation ?? [-45, 45];
    const phase = sweep.time / duration;
    const rotation = phase < 0.5 ? max * Math.sin(phase * 2 * Math.PI) : -min * Math.sin(phase * 2 * Math.PI);
    animator.setManual(name, { rotation });
    if (state.bone !== name) { state.bone = name; $('bone').value = name; }
    $('rotation-value').textContent = Math.round(rotation) + '°';
  };

  let previous = performance.now();
  const frame = (now) => {
    const dt = Math.min(100, now - previous);
    previous = now;
    resize();
    advanceSweep(dt);
    let { pose, slots } = animator.update(dt);
    if ($('rest').checked) { pose = clampPose(prepared, animator.manual); slots = resolveSlots(prepared, {}); }
    if ($('explode').checked) pose = composePoses(pose, explodedPose(prepared));
    const world = computeWorld(prepared, pose);
    state.last = { world, slots };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderer.draw(ctx, world, slots, { colors: colors(), view: state.view, only: $('only-tint').checked ? 'tint' : null });
    drawDebug(ctx, prepared, spriteSet, world, slots, state.view, {
      bones: $('dbg-bones').checked, pivots: $('dbg-pivots').checked, joints: $('dbg-joints').checked,
      boxes: $('dbg-boxes').checked, names: $('dbg-names').checked,
      selected: $('edit-pivot').checked || $('dbg-pivots').checked ? state.bone : null
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // ---- API per gli strumenti di anteprima (tools/render-previews.mjs) ----------
  Object.assign(api, {
    prepared, clips, spriteSet,
    sampleClip: (name, time) => sampleClip(clips[name], time),
    explodedPose: (distance) => explodedPose(prepared, distance),
    /**
     * Disegna una griglia di pose su un canvas nuovo e lo restituisce come data URL PNG.
     * cells: [{ label, pose, slots, palette, debug, focus, only }]
     */
    sheet(cells, { columns = 4, cellWidth = 260, cellHeight = 520, background = '#1a1824' } = {}) {
      const rows = Math.ceil(cells.length / columns);
      const out = Object.assign(document.createElement('canvas'), { width: columns * cellWidth, height: rows * cellHeight });
      const c = out.getContext('2d');
      c.fillStyle = background;
      c.fillRect(0, 0, out.width, out.height);
      const sheetRenderer = new CanvasRigRenderer(prepared, spriteSet, images);
      cells.forEach((cell, i) => {
        const x = (i % columns) * cellWidth, y = Math.floor(i / columns) * cellHeight;
        const label = 26;
        const view = fitView(cell.focus ?? full, x, y + label, cellWidth, cellHeight - label, 0.04);
        const pose = clampPose(prepared, cell.pose ?? {});
        const world = computeWorld(prepared, cell.unclamped ? cell.pose : pose);
        const slots = resolveSlots(prepared, cell.slots ?? {});
        c.save();
        c.beginPath();
        c.rect(x, y, cellWidth, cellHeight);
        c.clip();
        sheetRenderer.draw(c, world, slots, { colors: resolvePalette(prepared, cell.palette ?? state.palette, cell.colors), view, only: cell.only ?? null });
        if (cell.debug) drawDebug(c, prepared, spriteSet, world, slots, view, cell.debug);
        c.restore();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.strokeStyle = '#34304a';
        c.strokeRect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1);
        c.fillStyle = '#ece9f5';
        c.font = '14px system-ui, sans-serif';
        c.textBaseline = 'middle';
        c.fillText(cell.label ?? '', x + 8, y + label / 2 + 2);
      });
      return out.toDataURL('image/png');
    }
  });
  resolveReady(true);
}

start().catch((error) => {
  $('report').textContent = 'Errore: ' + error.message + '\n\nApri la pagina tramite un server statico (per esempio: python3 -m http.server 8000) e non come file locale.';
  $('report').classList.add('bad');
  api.error = error.message;
  resolveReady(false);
});
