/**
 * Aetheria — animazione del rig: clip a keyframe, espressioni, battito, sguardo,
 * inclinazione della testa e moto secondario (capelli, accessori).
 *
 * Nessun DOM: `Animator.update(dtMs)` restituisce { pose, slots } da passare al renderer.
 */
import { composePoses, mixPoses, clampPose, resolveSlots, worldRotation, normalizeBonePose } from './rig-core.mjs';

const PROPS = ['x', 'y', 'rotation', 'scaleX', 'scaleY'];
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export const EASINGS = Object.freeze({
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t)
});

/** Campiona una traccia (lista di chiavi ordinate per `at`) al tempo t in millisecondi. */
export function sampleTrack(keys, t) {
  if (!Array.isArray(keys) || !keys.length) return normalizeBonePose();
  if (t <= keys[0].at) return normalizeBonePose(keys[0]);
  const last = keys[keys.length - 1];
  if (t >= last.at) return normalizeBonePose(last);
  for (let i = 1; i < keys.length; i++) {
    if (t > keys[i].at) continue;
    const a = keys[i - 1], b = keys[i];
    const span = Math.max(1e-6, b.at - a.at);
    const ease = EASINGS[b.ease] ?? EASINGS.smooth;
    const k = ease(clamp((t - a.at) / span, 0, 1));
    const pa = normalizeBonePose(a), pb = normalizeBonePose(b);
    const out = {};
    for (const key of PROPS) out[key] = pa[key] + (pb[key] - pa[key]) * k;
    return out;
  }
  return normalizeBonePose(last);
}

/** Campiona un clip intero: restituisce una posa parziale { osso: {x, y, rotation, scaleX, scaleY} }. */
export function sampleClip(clip, timeMs) {
  const duration = Math.max(1, clip?.duration ?? 1);
  const t = clip?.loop ? ((timeMs % duration) + duration) % duration : clamp(timeMs, 0, duration);
  const pose = {};
  for (const [bone, keys] of Object.entries(clip?.tracks ?? {})) pose[bone] = sampleTrack(keys, t);
  return pose;
}

/** Controlla che i clip usino ossa esistenti e chiavi ordinate entro la durata. */
export function validateClips(prepared, clips) {
  const errors = [];
  for (const [name, clip] of Object.entries(clips ?? {})) {
    if (!(finite(clip?.duration) && clip.duration > 0)) errors.push('Clip ' + name + ': duration non valida.');
    for (const [bone, keys] of Object.entries(clip?.tracks ?? {})) {
      if (!prepared.boneByName.has(bone)) errors.push('Clip ' + name + ': osso inesistente ' + bone);
      if (!Array.isArray(keys) || !keys.length) { errors.push('Clip ' + name + ': traccia vuota per ' + bone); continue; }
      keys.forEach((key, i) => {
        if (!finite(key?.at) || key.at < 0 || key.at > clip.duration) errors.push('Clip ' + name + ': chiave fuori durata su ' + bone);
        if (i && key.at < keys[i - 1].at) errors.push('Clip ' + name + ': chiavi non ordinate su ' + bone);
        if (key.ease !== undefined && !EASINGS[key.ease]) errors.push('Clip ' + name + ': easing sconosciuto ' + key.ease);
      });
    }
  }
  return errors;
}

export class Animator {
  /**
   * @param prepared rig preparato con prepareRig
   * @param clips    contenuto di animations.json (campo `clips`)
   * @param options  { rng } generatore casuale iniettabile per i test
   */
  constructor(prepared, clips = {}, { rng = Math.random } = {}) {
    this.prepared = prepared;
    this.clips = clips;
    this.rng = rng;
    this.active = new Map();
    this.manual = {};
    this.physicsEnabled = true;
    this.blinkEnabled = true;
    this.tilt = 0;
    this.tiltTarget = 0;
    this.gaze = { x: 0, y: 0 };
    this.gazeTarget = { x: 0, y: 0 };
    this.physicsState = new Map();
    this.expression = { name: 'neutral', from: this.#expression('neutral'), to: this.#expression('neutral'), progress: 1, duration: 1 };
    this.blink = { wait: this.#blinkInterval(), step: -1, elapsed: 0 };
  }

  #expression(name) {
    const e = this.prepared.rig.expressions?.[name];
    return { slots: e?.slots ?? {}, pose: e?.pose ?? {} };
  }

  #blinkInterval() {
    const [min, max] = this.prepared.rig.blink?.interval ?? [2500, 6000];
    return min + (max - min) * this.rng();
  }

  /** Avvia un clip dall'inizio. I clip non in loop si fermano da soli. */
  play(name) {
    if (!this.clips[name]) return false;
    this.active.set(name, 0);
    return true;
  }

  stop(name) { this.active.delete(name); }
  isPlaying(name) { return this.active.has(name); }

  setExpression(name, durationMs = 220) {
    if (!this.prepared.rig.expressions?.[name]) return false;
    const current = mixPoses(this.expression.from.pose, this.expression.to.pose, EASINGS.smooth(this.expression.progress));
    const slots = this.expression.progress < 0.5 ? this.expression.from.slots : this.expression.to.slots;
    this.expression = { name, from: { pose: current, slots }, to: this.#expression(name), progress: 0, duration: Math.max(1, durationMs) };
    return true;
  }

  /** Direzione dello sguardo, ogni asse fra -1 e 1 (x positivo = verso destra sullo schermo). */
  setGaze(x, y) { this.gazeTarget = { x: clamp(finite(x) ? x : 0, -1, 1), y: clamp(finite(y) ? y : 0, -1, 1) }; }

  /** Inclinazione della testa in gradi, distribuita fra collo e testa. */
  setHeadTilt(degrees) { this.tiltTarget = finite(degrees) ? degrees : 0; }

  /** Delta manuale su un osso (banco prova delle articolazioni). Passare null per rimuoverlo. */
  setManual(bone, bonePose) {
    if (bonePose == null) delete this.manual[bone];
    else this.manual[bone] = bonePose;
  }

  clearManual() { this.manual = {}; }

  triggerBlink() { if (this.blink.step < 0) this.blink = { wait: 0, step: 0, elapsed: 0 }; }

  #updateBlink(dt) {
    const config = this.prepared.rig.blink;
    if (!config) return {};
    const sequence = config.sequence ?? [];
    if (this.blink.step < 0) {
      // blinkEnabled regola solo il battito automatico: triggerBlink() funziona comunque.
      if (!this.blinkEnabled) return {};
      this.blink.wait -= dt;
      if (this.blink.wait > 0) return {};
      this.blink.step = 0;
      this.blink.elapsed = 0;
    } else {
      this.blink.elapsed += dt;
    }
    while (this.blink.step < sequence.length && this.blink.elapsed >= sequence[this.blink.step][1]) {
      this.blink.elapsed -= sequence[this.blink.step][1];
      this.blink.step++;
    }
    if (this.blink.step >= sequence.length) {
      this.blink = { wait: this.#blinkInterval(), step: -1, elapsed: 0 };
      return {};
    }
    const variant = sequence[this.blink.step][0];
    return Object.fromEntries((config.slots ?? []).map((slot) => [slot, variant]));
  }

  /**
   * Moto secondario: ogni osso con `physics` insegue con una molla smorzata
   * l'orientamento del genitore, ridotto dal fattore `gravity` (0 = segue il genitore,
   * 1 = tende a restare verticale).
   */
  #applyPhysics(pose, dt) {
    const out = { ...pose };
    const seconds = dt / 1000;
    const steps = Math.max(1, Math.ceil(seconds / 0.008));
    const h = seconds / steps;
    for (const bone of this.prepared.bones) {
      const config = bone.physics;
      if (!config) continue;
      const parentRotation = worldRotation(this.prepared, out, bone.parent);
      const target = parentRotation * (1 - (config.gravity ?? 0.5));
      let state = this.physicsState.get(bone.name);
      if (!state) { state = { angle: target, velocity: 0 }; this.physicsState.set(bone.name, state); }
      const stiffness = config.stiffness ?? 60;
      const damping = config.damping ?? 8;
      for (let i = 0; i < steps; i++) {
        state.velocity += (stiffness * (target - state.angle) - damping * state.velocity) * h;
        state.angle += state.velocity * h;
      }
      const current = normalizeBonePose(out[bone.name]);
      out[bone.name] = { ...current, rotation: current.rotation + (state.angle - parentRotation) };
    }
    return out;
  }

  /** Avanza di dt millisecondi e restituisce la posa completa e le varianti attive. */
  update(dtMs) {
    const dt = clamp(finite(dtMs) ? dtMs : 0, 0, 100);
    const parts = [];

    for (const [name, time] of [...this.active]) {
      const clip = this.clips[name];
      const next = time + dt;
      parts.push(sampleClip(clip, next));
      if (!clip.loop && next >= clip.duration) this.active.delete(name);
      else this.active.set(name, next);
    }

    const follow = 1 - Math.exp(-dt / 110);
    this.tilt += (this.tiltTarget - this.tilt) * follow;
    this.gaze.x += (this.gazeTarget.x - this.gaze.x) * follow;
    this.gaze.y += (this.gazeTarget.y - this.gaze.y) * follow;

    const tiltConfig = this.prepared.rig.headTilt;
    if (tiltConfig) {
      const tiltPose = {};
      for (const [bone, share] of Object.entries(tiltConfig.bones ?? {})) tiltPose[bone] = { rotation: this.tilt * share };
      parts.push(tiltPose);
    }
    const gazeConfig = this.prepared.rig.gaze;
    if (gazeConfig) {
      const gazePose = {};
      for (const bone of gazeConfig.bones ?? []) gazePose[bone] = { x: this.gaze.x * gazeConfig.rangeX, y: this.gaze.y * gazeConfig.rangeY };
      parts.push(gazePose);
    }

    const e = this.expression;
    e.progress = clamp(e.progress + dt / e.duration, 0, 1);
    parts.push(mixPoses(e.from.pose, e.to.pose, EASINGS.smooth(e.progress)));
    const expressionSlots = e.progress < 0.5 ? e.from.slots : e.to.slots;

    parts.push(this.manual);
    let pose = composePoses(...parts);
    if (this.physicsEnabled) pose = this.#applyPhysics(pose, dt);
    else this.physicsState.clear();
    pose = clampPose(this.prepared, pose);

    const slots = resolveSlots(this.prepared, { ...expressionSlots, ...this.#updateBlink(dt) });
    return { pose, slots };
  }
}
