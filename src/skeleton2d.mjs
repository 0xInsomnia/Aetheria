/**
 * Aetheria — core del rig 2D, indipendente da asset e motore grafico.
 * Non è un personaggio già riggato: ogni livello deve essere preparato
 * separatamente con l'origine/pivot corretta.
 */
const KEYS = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity'];
const NEUTRAL = Object.freeze({ x:0, y:0, rotation:0, scaleX:1, scaleY:1, opacity:1 });

export function clamp01(n) {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}

export function smoothstep(n) {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
}

export function normalizeBone(input = {}) {
  const b = {};
  for (const key of KEYS) b[key] = Number.isFinite(input?.[key]) ? input[key] : NEUTRAL[key];
  b.scaleX = Math.max(.05, b.scaleX);
  b.scaleY = Math.max(.05, b.scaleY);
  b.opacity = clamp01(b.opacity);
  return b;
}

export function interpolatePose(from = {}, to = {}, fraction = 0) {
  const t = smoothstep(fraction);
  const output = {};
  for (const name of new Set([...Object.keys(from), ...Object.keys(to)])) {
    const a = normalizeBone(from[name]);
    const b = normalizeBone(to[name]);
    output[name] = {};
    for (const key of KEYS) output[name][key] = a[key] + (b[key] - a[key]) * t;
  }
  return output;
}

export class Skeleton2D {
  constructor(layers = {}) {
    this.layers = new Map(Object.entries(layers));
  }
  setPose(pose = {}) {
    for (const [name, element] of this.layers) {
      if (!element?.style || !Object.hasOwn(pose, name)) continue;
      const b = normalizeBone(pose[name]);
      element.style.transform =
        'translate(' + b.x + 'px, ' + b.y + 'px) rotate(' + b.rotation +
        'deg) scale(' + b.scaleX + ', ' + b.scaleY + ')';
      element.style.opacity = String(b.opacity);
    }
  }
}

export function sampleKeyframes(keyframes, timeMs, loop = false) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].pose ?? {};
  const frames = [...keyframes].sort((a, b) => a.at - b.at);
  const duration = Math.max(1, frames[frames.length - 1].at);
  const time = loop ? (((timeMs % duration) + duration) % duration) : Math.max(0, Math.min(duration, timeMs));
  for (let i = 1; i < frames.length; i++) {
    if (time <= frames[i].at) {
      const previous = frames[i - 1];
      const next = frames[i];
      const distance = Math.max(1, next.at - previous.at);
      return interpolatePose(previous.pose ?? {}, next.pose ?? {}, (time - previous.at) / distance);
    }
  }
  return frames[frames.length - 1].pose ?? {};
}

export const POSES = Object.freeze({
  neutral: Object.freeze({ torso:{y:0,scaleY:1},head:{rotation:0},hair:{rotation:0},armRight:{rotation:0} }),
  breathe: Object.freeze({ torso:{y:-2,scaleY:1.008},head:{rotation:-.8},hair:{rotation:1.2},armRight:{rotation:0} }),
  wave: Object.freeze({ torso:{y:-1},head:{rotation:-3},hair:{rotation:2},armRight:{rotation:-35} })
});
