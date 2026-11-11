#!/usr/bin/env node
/**
 * Genera il set di sprite SEGNAPOSTO: un manichino schematico, non il personaggio.
 *
 * Serve soltanto a provare la pipeline (gerarchia, pivot, giunzioni, maschere colore)
 * in attesa delle illustrazioni definitive. Le forme derivano dai pivot del rig e sono
 * disegnate con funzioni di distanza: il risultato è deterministico e non richiede
 * dipendenze.
 *
 * Uso: node character/tools/generate-placeholders.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.mjs';

const SKIN = [205, 176, 160], SKIN_SHADE = [181, 150, 136];
const HAIR = [203, 206, 216], HAIR_DARK = [166, 170, 186];
const WHITE = [244, 242, 247], IRIS = [139, 92, 246], DARK = [58, 50, 72];
const MOUTH = [138, 74, 85], TATTOO = [70, 52, 110];
// I livelli colorabili sono in scala di grigi: chiaro = tessuto in luce, scuro = ombra dipinta.
const LIGHT = [232, 232, 232], SHADE = [150, 150, 150];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const capsule = (a, b, ra, rb = ra, color = SKIN, extra = {}) => ({ kind: 'capsule', a, b, ra, rb, color, ...extra });
const ellipse = (c, rx, ry, color = SKIN, extra = {}) => ({ kind: 'ellipse', c, rx, ry, color, ...extra });
const box = (c, hx, hy, radius, color = SKIN, extra = {}) => ({ kind: 'box', c, hx, hy, radius, color, ...extra });
const ring = (c, r, w, color = DARK, extra = {}) => ({ kind: 'ring', c, r, w, color, ...extra });

function distance(shape, x, y) {
  if (shape.kind === 'capsule') {
    const pax = x - shape.a[0], pay = y - shape.a[1];
    const bax = shape.b[0] - shape.a[0], bay = shape.b[1] - shape.a[1];
    const len = bax * bax + bay * bay;
    const h = len ? clamp((pax * bax + pay * bay) / len, 0, 1) : 0;
    return Math.hypot(pax - bax * h, pay - bay * h) - (shape.ra + (shape.rb - shape.ra) * h);
  }
  if (shape.kind === 'ellipse') {
    const px = x - shape.c[0], py = y - shape.c[1];
    const k0 = Math.hypot(px / shape.rx, py / shape.ry);
    const k1 = Math.hypot(px / (shape.rx * shape.rx), py / (shape.ry * shape.ry));
    return k1 === 0 ? -Math.min(shape.rx, shape.ry) : (k0 * (k0 - 1)) / k1;
  }
  if (shape.kind === 'box') {
    const qx = Math.abs(x - shape.c[0]) - shape.hx + shape.radius;
    const qy = Math.abs(y - shape.c[1]) - shape.hy + shape.radius;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - shape.radius;
  }
  return Math.abs(Math.hypot(x - shape.c[0], y - shape.c[1]) - shape.r) - shape.w;
}

function bounds(shape) {
  let b;
  if (shape.kind === 'capsule') {
    b = [
      Math.min(shape.a[0] - shape.ra, shape.b[0] - shape.rb), Math.min(shape.a[1] - shape.ra, shape.b[1] - shape.rb),
      Math.max(shape.a[0] + shape.ra, shape.b[0] + shape.rb), Math.max(shape.a[1] + shape.ra, shape.b[1] + shape.rb)
    ];
  } else if (shape.kind === 'ellipse') b = [shape.c[0] - shape.rx, shape.c[1] - shape.ry, shape.c[0] + shape.rx, shape.c[1] + shape.ry];
  else if (shape.kind === 'box') b = [shape.c[0] - shape.hx, shape.c[1] - shape.hy, shape.c[0] + shape.hx, shape.c[1] + shape.hy];
  else b = [shape.c[0] - shape.r - shape.w, shape.c[1] - shape.r - shape.w, shape.c[0] + shape.r + shape.w, shape.c[1] + shape.r + shape.w];
  return [
    Math.max(b[0], shape.minX ?? -Infinity), Math.max(b[1], shape.minY ?? -Infinity),
    Math.min(b[2], shape.maxX ?? Infinity), Math.min(b[3], shape.maxY ?? Infinity)
  ];
}

function coverage(shape, x, y) {
  let k = clamp(0.5 - distance(shape, x, y), 0, 1);
  if (shape.minX !== undefined) k *= clamp(x - shape.minX + 0.5, 0, 1);
  if (shape.maxX !== undefined) k *= clamp(shape.maxX - x + 0.5, 0, 1);
  if (shape.minY !== undefined) k *= clamp(y - shape.minY + 0.5, 0, 1);
  if (shape.maxY !== undefined) k *= clamp(shape.maxY - y + 0.5, 0, 1);
  return k * (shape.alpha ?? 1);
}

/** Disegna le forme in ordine e restituisce immagine RGBA e posizione nel canvas. */
export function rasterize(shapes, pad = 2) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const shape of shapes) {
    const b = bounds(shape);
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  const x = Math.floor(x0) - pad, y = Math.floor(y0) - pad;
  const width = Math.ceil(x1) + pad - x, height = Math.ceil(y1) + pad - y;
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (const shape of shapes) {
        const k = coverage(shape, x + col + 0.5, y + row + 0.5);
        if (k <= 0) continue;
        const outA = k + a * (1 - k);
        r = (shape.color[0] * k + r * a * (1 - k)) / outA;
        g = (shape.color[1] * k + g * a * (1 - k)) / outA;
        b = (shape.color[2] * k + b * a * (1 - k)) / outA;
        a = outA;
      }
      const i = (row * width + col) * 4;
      data[i] = Math.round(r); data[i + 1] = Math.round(g); data[i + 2] = Math.round(b); data[i + 3] = Math.round(a * 255);
    }
  }
  return { x, y, width, height, data };
}

function recipes(rig) {
  const W = rig.canvas.width;
  const P = Object.fromEntries(rig.bones.map((bone) => [bone.name, bone.pivot]));
  const out = {};

  for (const side of ['R', 'L']) {
    const m = (point) => (side === 'R' ? point : [W - point[0], point[1]]); // i valori sono scritti per il lato R
    const shoulder = P['upperArm' + side], elbow = P['forearm' + side], wrist = P['hand' + side];
    const outward = side === 'R' ? -1 : 1;
    out['upper_arm_' + side] = [capsule(shoulder, elbow, 40, 34)];
    out['sleeve_upper_' + side] = [capsule(shoulder, elbow, 44, 38, LIGHT), capsule(lerp(shoulder, elbow, 0.72), elbow, 39.4, 38, SHADE)];
    out['forearm_' + side] = [capsule(elbow, wrist, 33, 26)];
    out['sleeve_fore_' + side] = [capsule(elbow, lerp(elbow, wrist, 0.76), 37, 31, LIGHT), capsule(elbow, lerp(elbow, wrist, 0.18), 37, 35.5, SHADE)];
    out['cuff_' + side] = [capsule(lerp(elbow, wrist, 0.7), lerp(elbow, wrist, 0.8), 33, 32, LIGHT)];
    out['hand_' + side] = [
      capsule(wrist, [wrist[0] + outward * 6, wrist[1] + 84], 26, 19),
      capsule([wrist[0] - outward * 16, wrist[1] + 22], [wrist[0] - outward * 24, wrist[1] + 58], 10, 8, SKIN_SHADE)
    ];

    const hip = P['thigh' + side], knee = P['shin' + side], ankle = P['foot' + side];
    const toe = [ankle[0] + outward * 12, ankle[1] + 58];
    out['thigh_' + side] = [capsule(hip, knee, 70, 50)];
    out['shin_' + side] = [capsule(knee, ankle, 50, 34)];
    out['foot_' + side] = [capsule(ankle, ankle, 34), ellipse(toe, 62, 34)];
    out['boot_shin_' + side] = [capsule(lerp(knee, ankle, 0.36), ankle, 49, 38, LIGHT), capsule(lerp(knee, ankle, 0.8), ankle, 40.2, 38, SHADE)];
    out['boot_trim_' + side] = [capsule(lerp(knee, ankle, 0.34), lerp(knee, ankle, 0.38), 50, 50, LIGHT)];
    out['boot_foot_' + side] = [capsule(ankle, ankle, 38, 38, LIGHT), ellipse(toe, 66, 38, LIGHT), ellipse(toe, 66, 38, SHADE, { minY: toe[1] + 16 })];

    out['eye_white_' + side] = [ellipse(m([455, 245]), 24, 13, WHITE)];
    out['iris_' + side] = [
      ellipse(m([455, 245]), 13, 13, IRIS), ellipse(m([455, 245]), 5.5, 5.5, DARK),
      ellipse([m([455, 245])[0] - 5, 240], 3, 3, WHITE)
    ];
    const eyeX = m([455, 245])[0];
    const lash = { minX: eyeX - 25, maxX: eyeX + 25 };
    out['eyelid_' + side + '_open'] = [ring([eyeX, 268], 34, 2.8, DARK, { ...lash, maxY: 244.5 })];
    out['eyelid_' + side + '_half'] = [ellipse([eyeX, 245], 26, 15, SKIN, { maxY: 246 }), capsule([eyeX - 24, 246], [eyeX + 24, 246], 2.6, 2.6, DARK)];
    out['eyelid_' + side + '_closed'] = [ellipse([eyeX, 245], 26, 15, SKIN), ring([eyeX, 222], 34, 2.6, DARK, { ...lash, minY: 245.5 })];
    out['brow_' + side] = [capsule(m([436, 217]), m([474, 211]), 4, 3.4, DARK)];
    out['hair_side_' + side] = [capsule(m([410, 200]), m([396, 470]), 22, 9, HAIR)];
  }

  // Tatuaggio geometrico: livello separato, mai colorato dalle palette degli abiti.
  const t = lerp(P.thighR, P.shinR, 0.5);
  const diamond = [[t[0], t[1] - 50], [t[0] + 26, t[1]], [t[0], t[1] + 50], [t[0] - 26, t[1]]];
  out.tattoo_thigh_R = [
    ...diamond.map((point, i) => capsule(point, diamond[(i + 1) % 4], 2.4, 2.4, TATTOO)),
    capsule(diamond[3], diamond[1], 1.8, 1.8, TATTOO),
    ellipse(t, 6, 6, TATTOO)
  ];

  const body = (grow, color, extra = {}) => [
    ellipse([500, 540], 135 + grow, 120 + grow, color, extra),
    capsule([500, 600], [500, 800], 105 + grow, 92 + grow, color, extra)
  ];
  out.torso = [...body(0, SKIN), capsule([368, 478], [632, 478], 48), capsule([500, 425], [500, 480], 34)];
  out.top = [...body(3, LIGHT, { minY: 500, maxY: 768 }), ...body(3, SHADE, { minY: 700, maxY: 768, alpha: 0.75 })];
  out.top_trim = [box([500, 762], 102, 8, 4, LIGHT)];

  const pelvis = (grow, color, extra = {}) => [
    ellipse([500, 890], 150 + grow, 105 + grow, color, extra),
    capsule(P.thighR, P.thighL, 66 + grow, 66 + grow, color, extra)
  ];
  out.hips = pelvis(0, SKIN);
  out.shorts = [...pelvis(3, LIGHT), ...pelvis(3, SHADE, { minY: 950, alpha: 0.7 })];
  out.belt = [box([500, 838], 127, 12, 6, LIGHT)];
  out.strap = [capsule(P.strap, [P.strap[0] + 12, P.strap[1] + 160], 8, 8, LIGHT), ellipse([P.strap[0] + 12, P.strap[1] + 166], 13, 13, LIGHT)];

  out.neck = [capsule([500, 335], [500, 425], 32, 32, SKIN_SHADE)];
  out.head = [
    ellipse([402, 255], 12, 24, SKIN_SHADE), ellipse([598, 255], 12, 24, SKIN_SHADE), // orecchie umane
    ellipse([500, 240], 98, 120, SKIN),
    capsule([500, 274], [498, 290], 2.6, 2.6, SKIN_SHADE)
  ];
  out.mouth_neutral = [capsule([485, 318], [515, 318], 2.6, 2.6, MOUTH)];
  out.mouth_smile = [ring([500, 296], 26, 2.8, MOUTH, { minY: 309 })];
  out.mouth_curious = [ellipse([505, 319], 7, 6, MOUTH)];
  out.mouth_surprised = [ellipse([500, 323], 13, 17, MOUTH), ellipse([500, 325], 8, 11, DARK)];

  out.hair_back = [ellipse([500, 225], 114, 135, HAIR_DARK), capsule([500, 300], [500, 560], 108, 90, HAIR_DARK)];
  out.ponytail = [capsule(P.ponytail, P.ponytailTip, 46, 40, HAIR)];
  out.ponytail_tip = [capsule(P.ponytailTip, [P.ponytailTip[0] + 30, P.ponytailTip[1] + 460], 40, 16, HAIR)];
  out.hair_front = [
    ellipse([500, 190], 106, 78, HAIR, { maxY: 212 }),
    capsule([450, 200], [440, 236], 14, 6, HAIR), capsule([550, 200], [560, 236], 14, 6, HAIR), capsule([500, 196], [503, 228], 12, 5, HAIR)
  ];
  return out;
}

/** Costruisce in memoria il set segnaposto: descrittore + immagini RGBA. */
export function buildPlaceholderSet(rig) {
  const shapes = recipes(rig);
  const images = new Map();
  const layers = {};
  for (const layer of rig.layers) {
    if (!shapes[layer.name]) throw new Error('Nessuna forma segnaposto per il livello ' + layer.name);
    const { x, y, width, height, data } = rasterize(shapes[layer.name]);
    images.set(layer.name, { width, height, data });
    layers[layer.name] = { image: layer.name + '.png', x, y, width, height };
  }
  const set = {
    format: 'aetheria-sprites',
    version: 1,
    name: 'placeholder',
    note: 'Manichino segnaposto generato da tools/generate-placeholders.mjs. Non è il personaggio definitivo.',
    canvas: { ...rig.canvas },
    layers
  };
  return { set, images };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rig = JSON.parse(readFileSync(new URL('../rig/aetheria.rig.json', import.meta.url), 'utf8'));
  const { set, images } = buildPlaceholderSet(rig);
  const dir = new URL('../sprites/placeholder/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (const [name, image] of images) {
    const png = encodePng(image);
    bytes += png.length;
    writeFileSync(new URL(name + '.png', dir), png);
  }
  writeFileSync(new URL('layers.json', dir), JSON.stringify(set, null, 2) + '\n');
  console.log('Scritti ' + images.size + ' sprite segnaposto (' + Math.round(bytes / 1024) + ' kB) in character/sprites/placeholder/');
}
