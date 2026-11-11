/**
 * Aetheria — nucleo del rig 2D gerarchico.
 *
 * Solo matematica e validazione: nessun DOM, nessun asset. Funziona in Node e nel browser.
 *
 * Convenzioni
 * - Tutte le coordinate (pivot, livelli) sono espresse nello spazio del canvas in posa
 *   di riposo ("bind pose"), origine in alto a sinistra, asse Y verso il basso.
 * - Le rotazioni sono in gradi; positivo = senso orario sullo schermo (come in CSS).
 * - Una matrice affine è [a, b, c, d, e, f] come in Canvas 2D:
 *   x' = a·x + c·y + e,  y' = b·x + d·y + f.
 * - La posa di un osso è un delta rispetto al riposo: x, y, rotation si sommano,
 *   scaleX e scaleY si moltiplicano.
 */

export const NEUTRAL = Object.freeze({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
export const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
const ADDITIVE = ['x', 'y', 'rotation'];
const MULTIPLICATIVE = ['scaleX', 'scaleY'];
const DEG = Math.PI / 180;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** m ∘ n: applica prima n, poi m. */
export function multiply(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}

export function transformPoint(m, point) {
  const [x, y] = point;
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function normalizeBonePose(input) {
  const pose = {};
  for (const key of ADDITIVE) pose[key] = finite(input?.[key]) ? input[key] : 0;
  for (const key of MULTIPLICATIVE) pose[key] = finite(input?.[key]) ? Math.max(0.01, input[key]) : 1;
  return pose;
}

/** Matrice locale: rotazione e scala attorno al pivot, poi traslazione. */
export function localMatrix(pivot, bonePose) {
  const p = normalizeBonePose(bonePose);
  const cos = Math.cos(p.rotation * DEG);
  const sin = Math.sin(p.rotation * DEG);
  const a = cos * p.scaleX, b = sin * p.scaleX, c = -sin * p.scaleY, d = cos * p.scaleY;
  const [px, py] = pivot;
  return [a, b, c, d, px + p.x - (a * px + c * py), py + p.y - (b * px + d * py)];
}

/** Somma più pose parziali (x, y, rotation additivi; scale moltiplicative). */
export function composePoses(...poses) {
  const out = {};
  for (const pose of poses) {
    if (!pose) continue;
    for (const [bone, value] of Object.entries(pose)) {
      const target = out[bone] ?? (out[bone] = { ...NEUTRAL });
      const p = normalizeBonePose(value);
      for (const key of ADDITIVE) target[key] += p[key];
      for (const key of MULTIPLICATIVE) target[key] *= p[key];
    }
  }
  return out;
}

/** Interpola due pose parziali; t fra 0 e 1 (nessun easing applicato qui). */
export function mixPoses(from = {}, to = {}, t = 0) {
  const k = clamp(finite(t) ? t : 0, 0, 1);
  const out = {};
  for (const bone of new Set([...Object.keys(from), ...Object.keys(to)])) {
    const a = normalizeBonePose(from[bone]);
    const b = normalizeBonePose(to[bone]);
    out[bone] = {};
    for (const key of [...ADDITIVE, ...MULTIPLICATIVE]) out[bone][key] = a[key] + (b[key] - a[key]) * k;
  }
  return out;
}

function isPoint(value) {
  return Array.isArray(value) && value.length === 2 && value.every(finite);
}

function isRange(value) {
  return Array.isArray(value) && value.length === 2 && value.every(finite) && value[0] <= value[1];
}

/**
 * Controlla la coerenza strutturale del rig. Non legge immagini.
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateRig(rig) {
  const errors = [];
  const warnings = [];
  if (!rig || typeof rig !== 'object') return { errors: ['Il rig non è un oggetto.'], warnings };
  if (rig.format !== 'aetheria-rig') errors.push('format deve essere "aetheria-rig".');
  const width = rig.canvas?.width, height = rig.canvas?.height;
  if (!(finite(width) && width > 0 && finite(height) && height > 0)) errors.push('canvas.width e canvas.height devono essere positivi.');

  const bones = Array.isArray(rig.bones) ? rig.bones : [];
  if (!bones.length) errors.push('Nessun osso definito.');
  const boneNames = new Map();
  for (const bone of bones) {
    if (typeof bone?.name !== 'string' || !bone.name) { errors.push('Osso senza nome.'); continue; }
    if (boneNames.has(bone.name)) errors.push('Osso duplicato: ' + bone.name);
    boneNames.set(bone.name, bone);
    if (!isPoint(bone.pivot)) errors.push('Pivot non valido per ' + bone.name);
    else if (finite(width) && finite(height) && (bone.pivot[0] < 0 || bone.pivot[1] < 0 || bone.pivot[0] > width || bone.pivot[1] > height)) {
      warnings.push('Pivot fuori dal canvas: ' + bone.name);
    }
    for (const [key, range] of Object.entries(bone.limits ?? {})) {
      if (!ADDITIVE.includes(key) && !MULTIPLICATIVE.includes(key)) errors.push('Limite sconosciuto "' + key + '" su ' + bone.name);
      else if (!isRange(range)) errors.push('Limite ' + key + ' non valido su ' + bone.name);
    }
    if (bone.joint !== undefined) {
      if (!(finite(bone.joint?.radius) && bone.joint.radius > 0)) errors.push('joint.radius non valido su ' + bone.name);
      if (!bone.parent) errors.push('joint definito su un osso senza genitore: ' + bone.name);
    }
  }
  const roots = bones.filter((b) => b?.parent === null || b?.parent === undefined);
  if (bones.length && roots.length !== 1) errors.push('Serve esattamente un osso radice (parent: null); trovati ' + roots.length + '.');
  for (const bone of bones) {
    if (bone?.parent != null && !boneNames.has(bone.parent)) errors.push('Genitore inesistente "' + bone.parent + '" per ' + bone.name);
  }
  for (const bone of bones) {
    const seen = new Set();
    let cursor = bone;
    while (cursor?.parent != null && boneNames.has(cursor.parent)) {
      if (seen.has(cursor.name)) { errors.push('Ciclo nella gerarchia a partire da ' + bone.name); break; }
      seen.add(cursor.name);
      cursor = boneNames.get(cursor.parent);
    }
  }

  const slots = rig.slots ?? {};
  const tintGroups = rig.tintGroups ?? {};
  const layers = Array.isArray(rig.layers) ? rig.layers : [];
  if (!layers.length) errors.push('Nessun livello definito.');
  const layerNames = new Map();
  const variants = {};
  layers.forEach((layer, index) => {
    if (typeof layer?.name !== 'string' || !layer.name) { errors.push('Livello senza nome (indice ' + index + ').'); return; }
    if (layerNames.has(layer.name)) errors.push('Livello duplicato: ' + layer.name);
    layerNames.set(layer.name, index);
    if (!boneNames.has(layer.bone)) errors.push('Il livello ' + layer.name + ' usa un osso inesistente: ' + layer.bone);
    if (layer.slot !== undefined) {
      if (!slots[layer.slot]) errors.push('Slot non dichiarato "' + layer.slot + '" nel livello ' + layer.name);
      if (typeof layer.variant !== 'string') errors.push('Il livello ' + layer.name + ' ha uno slot ma nessuna variant.');
      (variants[layer.slot] ??= new Set()).add(layer.variant);
    }
    if (layer.tint !== undefined && !tintGroups[layer.tint]) errors.push('Gruppo colore inesistente "' + layer.tint + '" nel livello ' + layer.name);
  });
  for (const layer of layers) {
    if (layer?.clip === undefined) continue;
    if (!layerNames.has(layer.clip)) errors.push('Il livello ' + layer.name + ' usa come clip un livello inesistente: ' + layer.clip);
    else if (layer.clip === layer.name) errors.push('Il livello ' + layer.name + ' non può ritagliare se stesso.');
  }
  for (const [slot, config] of Object.entries(slots)) {
    if (!variants[slot]) errors.push('Lo slot ' + slot + ' non ha livelli.');
    else if (!variants[slot].has(config?.default)) errors.push('Variante predefinita mancante per lo slot ' + slot + ': ' + config?.default);
  }
  const checkSlots = (where, map) => {
    for (const [slot, variant] of Object.entries(map ?? {})) {
      if (!variants[slot]) errors.push(where + ': slot inesistente ' + slot);
      else if (!variants[slot].has(variant)) errors.push(where + ': variante inesistente ' + slot + '=' + variant);
    }
  };
  const checkBones = (where, pose) => {
    for (const bone of Object.keys(pose ?? {})) if (!boneNames.has(bone)) errors.push(where + ': osso inesistente ' + bone);
  };
  for (const [name, expression] of Object.entries(rig.expressions ?? {})) {
    checkSlots('Espressione ' + name, expression?.slots);
    checkBones('Espressione ' + name, expression?.pose);
  }
  for (const [name, colors] of Object.entries(rig.palettes ?? {})) {
    for (const group of Object.keys(tintGroups)) {
      if (typeof colors?.[group] !== 'string') errors.push('La palette ' + name + ' non definisce ' + group);
    }
    for (const group of Object.keys(colors ?? {})) {
      if (!tintGroups[group]) warnings.push('La palette ' + name + ' definisce un gruppo sconosciuto: ' + group);
    }
  }
  if (rig.blink) {
    for (const slot of rig.blink.slots ?? []) {
      if (!variants[slot]) { errors.push('blink: slot inesistente ' + slot); continue; }
      for (const [variant] of rig.blink.sequence ?? []) {
        if (!variants[slot].has(variant)) errors.push('blink: variante inesistente ' + slot + '=' + variant);
      }
    }
  }
  if (rig.gaze) checkBones('gaze', Object.fromEntries((rig.gaze.bones ?? []).map((b) => [b, 1])));
  for (const bone of bones) {
    if (bone?.physics && !bone.parent) errors.push('physics definita su un osso senza genitore: ' + bone.name);
  }
  return { errors, warnings };
}

/** Valida il rig e costruisce gli indici usati a runtime. Lancia un errore se il rig non è valido. */
export function prepareRig(rig) {
  const { errors } = validateRig(rig);
  if (errors.length) throw new Error('Rig non valido:\n- ' + errors.join('\n- '));
  const boneByName = new Map(rig.bones.map((bone) => [bone.name, bone]));
  const children = new Map(rig.bones.map((bone) => [bone.name, []]));
  let root = null;
  for (const bone of rig.bones) {
    if (bone.parent == null) root = bone;
    else children.get(bone.parent).push(bone.name);
  }
  const bones = [];
  const queue = [root];
  while (queue.length) {
    const bone = queue.shift();
    bones.push(bone);
    for (const name of children.get(bone.name)) queue.push(boneByName.get(name));
  }
  const slotVariants = {};
  for (const layer of rig.layers) if (layer.slot) (slotVariants[layer.slot] ??= []).push(layer.variant);
  return {
    rig,
    canvas: rig.canvas,
    bones,
    boneByName,
    children,
    root,
    layers: rig.layers,
    layerByName: new Map(rig.layers.map((layer) => [layer.name, layer])),
    slotVariants
  };
}

/** Applica i limiti dichiarati sulle ossa. Restituisce una nuova posa. */
export function clampPose(prepared, pose = {}) {
  const out = {};
  for (const [name, value] of Object.entries(pose)) {
    const bone = prepared.boneByName.get(name);
    if (!bone) continue;
    const p = normalizeBonePose(value);
    for (const [key, [min, max]] of Object.entries(bone.limits ?? {})) p[key] = clamp(p[key], min, max);
    out[name] = p;
  }
  return out;
}

/**
 * Matrici mondo di tutte le ossa: ognuna porta un punto dalla posa di riposo
 * alla sua posizione nella posa richiesta (sempre in unità del canvas del rig).
 */
export function computeWorld(prepared, pose = {}) {
  const world = {};
  for (const bone of prepared.bones) {
    const local = localMatrix(bone.pivot, pose[bone.name]);
    world[bone.name] = bone.parent == null ? local : multiply(world[bone.parent], local);
  }
  return world;
}

/** Rotazione complessiva (gradi) di un osso: somma delle rotazioni locali lungo la catena. */
export function worldRotation(prepared, pose, boneName) {
  let total = 0;
  let bone = prepared.boneByName.get(boneName);
  while (bone) {
    total += finite(pose?.[bone.name]?.rotation) ? pose[bone.name].rotation : 0;
    bone = bone.parent == null ? null : prepared.boneByName.get(bone.parent);
  }
  return total;
}

/** Completa una scelta parziale di varianti con i valori predefiniti; ignora valori sconosciuti. */
export function resolveSlots(prepared, overrides = {}) {
  const out = {};
  for (const [slot, config] of Object.entries(prepared.rig.slots ?? {})) {
    const wanted = overrides?.[slot];
    out[slot] = prepared.slotVariants[slot]?.includes(wanted) ? wanted : config.default;
  }
  return out;
}

/** Livelli da disegnare, nell'ordine di disegno, per una data scelta di varianti. */
export function visibleLayers(prepared, slots = {}) {
  const resolved = resolveSlots(prepared, slots);
  return prepared.layers.filter((layer) => !layer.slot || resolved[layer.slot] === layer.variant);
}

/** Colori effettivi dei gruppi: valori predefiniti, poi palette, poi eventuali sostituzioni. */
export function resolvePalette(prepared, paletteName, overrides = {}) {
  const colors = {};
  for (const [group, config] of Object.entries(prepared.rig.tintGroups ?? {})) colors[group] = config.default;
  Object.assign(colors, prepared.rig.palettes?.[paletteName] ?? {});
  for (const [group, color] of Object.entries(overrides ?? {})) if (group in colors && typeof color === 'string') colors[group] = color;
  return colors;
}

/** Controlla che un set di sprite descriva tutti i livelli del rig. */
export function validateSpriteSet(prepared, spriteSet) {
  const errors = [];
  const warnings = [];
  const entries = spriteSet?.layers ?? {};
  const { width, height } = prepared.canvas;
  for (const layer of prepared.layers) {
    const g = entries[layer.name];
    if (!g) { (spriteSet?.partial ? warnings : errors).push('Sprite mancante per il livello ' + layer.name); continue; }
    if (typeof g.image !== 'string' || ![g.x, g.y, g.width, g.height].every(finite) || g.width <= 0 || g.height <= 0) {
      errors.push('Geometria non valida per il livello ' + layer.name);
      continue;
    }
    if (g.x < 0 || g.y < 0 || g.x + g.width > width || g.y + g.height > height) warnings.push('Il livello ' + layer.name + ' esce dal canvas.');
  }
  for (const name of Object.keys(entries)) {
    if (!prepared.layerByName.has(name)) warnings.push('Sprite senza livello nel rig: ' + name);
  }
  return { errors, warnings };
}
