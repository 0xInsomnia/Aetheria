/**
 * Aetheria — renderer Canvas 2D per il rig a livelli.
 *
 * Disegna i PNG trasparenti con la matrice del loro osso, colora i livelli in scala
 * di grigi (`tint`) con il colore del gruppo e applica i ritagli (`clip`), per esempio
 * l'iride dentro il bianco dell'occhio. Richiede un ambiente con Canvas (browser).
 */
import { visibleLayers, transformPoint } from './rig-core.mjs';

/** Carica rig, clip, set di sprite e immagini a partire dalla cartella `character/`. */
export async function loadCharacter(baseUrl, setName = 'placeholder') {
  const json = async (path) => {
    const response = await fetch(new URL(path, baseUrl));
    if (!response.ok) throw new Error('Impossibile caricare ' + path + ' (' + response.status + ')');
    return response.json();
  };
  const [rig, animations, spriteSet] = await Promise.all([
    json('rig/aetheria.rig.json'), json('rig/animations.json'), json('sprites/' + setName + '/layers.json')
  ]);
  const images = new Map();
  const failed = [];
  await Promise.all(Object.entries(spriteSet.layers ?? {}).map(([name, entry]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { images.set(name, image); resolve(); };
    image.onerror = () => { failed.push(entry.image); resolve(); };
    image.src = new URL('sprites/' + setName + '/' + entry.image, baseUrl).href;
  })));
  return { rig, clips: animations.clips, spriteSet, images, failed };
}

export class CanvasRigRenderer {
  /**
   * @param prepared  rig preparato con prepareRig
   * @param spriteSet contenuto di layers.json
   * @param images    Map nomeLivello → immagine disegnabile
   */
  constructor(prepared, spriteSet, images, { createCanvas } = {}) {
    this.prepared = prepared;
    this.spriteSet = spriteSet;
    this.images = images;
    this.createCanvas = createCanvas ?? ((width, height) => Object.assign(document.createElement('canvas'), { width, height }));
    this.tintCache = new Map();
    this.scratch = null;
  }

  /** Versione colorata di un livello in scala di grigi: grigio × colore, limitato all'alfa del livello. */
  #tinted(name, image, color) {
    const key = name + '|' + color;
    let canvas = this.tintCache.get(key);
    if (canvas) return canvas;
    const width = image.naturalWidth ?? image.width, height = image.naturalHeight ?? image.height;
    canvas = this.createCanvas(width, height);
    const c = canvas.getContext('2d');
    c.drawImage(image, 0, 0);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = color;
    c.fillRect(0, 0, width, height);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(image, 0, 0);
    if (this.tintCache.size > 64) this.tintCache.clear();
    this.tintCache.set(key, canvas);
    return canvas;
  }

  #place(ctx, layer, world, view, source) {
    const g = this.spriteSet.layers[layer.name];
    const m = world[layer.bone];
    const s = view.scale;
    ctx.setTransform(s * m[0], s * m[1], s * m[2], s * m[3], s * m[4] + view.x, s * m[5] + view.y);
    ctx.drawImage(source, g.x, g.y, g.width, g.height);
  }

  /**
   * @param ctx     contesto 2D di destinazione
   * @param world   matrici da computeWorld
   * @param slots   varianti attive
   * @param options colors: {gruppo: colore}; view: {scale, x, y}; only: 'tint' per mostrare solo i livelli colorabili
   */
  draw(ctx, world, slots, { colors = {}, view = { scale: 1, x: 0, y: 0 }, only = null } = {}) {
    ctx.save();
    for (const layer of visibleLayers(this.prepared, slots)) {
      const image = this.images.get(layer.name);
      if (!image || !this.spriteSet.layers?.[layer.name]) continue;
      if (only === 'tint' && !layer.tint) continue;
      const source = layer.tint && colors[layer.tint] ? this.#tinted(layer.name, image, colors[layer.tint]) : image;
      const mask = layer.clip ? this.prepared.layerByName.get(layer.clip) : null;
      const maskImage = mask && this.images.get(mask.name);
      if (!mask || !maskImage || !this.spriteSet.layers?.[mask.name]) {
        this.#place(ctx, layer, world, view, source);
        continue;
      }
      const { width, height } = ctx.canvas;
      if (!this.scratch || this.scratch.width !== width || this.scratch.height !== height) this.scratch = this.createCanvas(width, height);
      const s = this.scratch.getContext('2d');
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-over';
      s.clearRect(0, 0, width, height);
      this.#place(s, layer, world, view, source);
      s.globalCompositeOperation = 'destination-in';
      this.#place(s, mask, world, view, maskImage);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.scratch, 0, 0);
    }
    ctx.restore();
  }
}

/**
 * Sovrimpressione di verifica: ossa, pivot, dischi delle giunzioni, riquadri dei livelli.
 * options: { bones, pivots, joints, boxes, names, selected }
 */
export function drawDebug(ctx, prepared, spriteSet, world, slots, view, options = {}) {
  const toScreen = (matrix, point) => {
    const [x, y] = transformPoint(matrix, point);
    return [x * view.scale + view.x, y * view.scale + view.y];
  };
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineJoin = 'round';
  const unit = Math.max(1, view.scale * 2.2);

  if (options.boxes) {
    ctx.lineWidth = Math.max(1, unit * 0.45);
    for (const layer of visibleLayers(prepared, slots)) {
      const g = spriteSet.layers?.[layer.name];
      if (!g) continue;
      const corners = [[g.x, g.y], [g.x + g.width, g.y], [g.x + g.width, g.y + g.height], [g.x, g.y + g.height]].map((p) => toScreen(world[layer.bone], p));
      ctx.strokeStyle = layer.tint ? 'rgba(56,189,248,.75)' : layer.slot ? 'rgba(250,204,21,.75)' : 'rgba(255,255,255,.4)';
      ctx.beginPath();
      corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
    }
  }
  if (options.joints) {
    ctx.lineWidth = Math.max(1, unit * 0.5);
    ctx.strokeStyle = 'rgba(52,211,153,.95)';
    ctx.fillStyle = 'rgba(52,211,153,.18)';
    for (const bone of prepared.bones) {
      if (!bone.joint) continue;
      const [x, y] = toScreen(world[bone.name], bone.pivot);
      ctx.beginPath();
      ctx.arc(x, y, bone.joint.radius * view.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (options.bones) {
    ctx.lineWidth = Math.max(1.5, unit * 0.8);
    ctx.strokeStyle = 'rgba(251,113,133,.95)';
    for (const bone of prepared.bones) {
      if (bone.parent == null) continue;
      const parent = prepared.boneByName.get(bone.parent);
      const [x0, y0] = toScreen(world[parent.name], parent.pivot);
      const [x1, y1] = toScreen(world[bone.name], bone.pivot);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
  if (options.pivots || options.names) {
    ctx.font = Math.max(9, Math.round(view.scale * 22)) + 'px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    for (const bone of prepared.bones) {
      const [x, y] = toScreen(world[bone.name], bone.pivot);
      const selected = bone.name === options.selected;
      if (options.pivots || selected) {
        const r = selected ? unit * 3 : unit * 1.8;
        ctx.fillStyle = selected ? '#facc15' : '#fff';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = Math.max(1, unit * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (options.names || selected) {
        ctx.lineWidth = Math.max(2, unit);
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.fillStyle = selected ? '#facc15' : '#fff';
        ctx.strokeText(bone.name, x + unit * 3.5, y);
        ctx.fillText(bone.name, x + unit * 3.5, y);
      }
    }
  }
  ctx.restore();
}

/** Vista che inquadra un rettangolo del rig [x, y, w, h] dentro una cella dello schermo. */
export function fitView(focus, cellX, cellY, cellWidth, cellHeight, margin = 0.04) {
  const [fx, fy, fw, fh] = focus;
  const scale = Math.min(cellWidth / fw, cellHeight / fh) * (1 - margin * 2);
  return {
    scale,
    x: cellX + (cellWidth - fw * scale) / 2 - fx * scale,
    y: cellY + (cellHeight - fh * scale) / 2 - fy * scale
  };
}
