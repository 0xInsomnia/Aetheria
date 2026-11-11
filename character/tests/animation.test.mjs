import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRig } from '../src/rig-core.mjs';
import { sampleTrack, sampleClip, validateClips, Animator } from '../src/animation.mjs';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const prepared = prepareRig(load('../rig/aetheria.rig.json'));
const { clips } = load('../rig/animations.json');
const run = (animator, ms, step = 16) => {
  let frame;
  for (let t = 0; t < ms; t += step) frame = animator.update(step);
  return frame;
};
const quiet = () => {
  const animator = new Animator(prepared, clips, { rng: () => 0.5 });
  animator.physicsEnabled = false;
  animator.blinkEnabled = false;
  return animator;
};

test('i clip pubblicati sono validi', () => {
  assert.deepEqual(validateClips(prepared, clips), []);
  assert.ok(validateClips(prepared, { x: { duration: 100, tracks: { fantasma: [{ at: 0 }], head: [{ at: 50 }, { at: 10 }, { at: 500 }] } } }).length >= 3);
});

test('campionamento delle tracce', () => {
  const keys = [{ at: 0, rotation: 0 }, { at: 100, rotation: 40, ease: 'linear' }, { at: 200, rotation: 0 }];
  assert.equal(sampleTrack(keys, -5).rotation, 0);
  assert.equal(sampleTrack(keys, 25).rotation, 10);
  assert.equal(sampleTrack(keys, 100).rotation, 40);
  assert.equal(sampleTrack(keys, 150).rotation, 20); // smooth a metà vale 0.5
  assert.equal(sampleTrack(keys, 999).rotation, 0);
  assert.equal(sampleTrack([], 10).scaleX, 1);
});

test('respirazione in loop: il busto si espande e torna a riposo', () => {
  assert.equal(sampleClip(clips.breathe, 0).torso.scaleY, 1);
  assert.ok(sampleClip(clips.breathe, 1900).torso.scaleY > 1.01);
  assert.ok(Math.abs(sampleClip(clips.breathe, 4200 + 1900).torso.scaleY - sampleClip(clips.breathe, 1900).torso.scaleY) < 1e-9);
});

test('il saluto muove davvero spalla, avambraccio e mano e poi termina', () => {
  const animator = quiet();
  assert.equal(animator.play('inesistente'), false);
  assert.ok(animator.play('wave'));
  const mid = run(animator, 1040);
  assert.ok(mid.pose.upperArmR.rotation > 130);
  assert.ok(Math.abs(mid.pose.forearmR.rotation) > 5);
  assert.ok(mid.pose.upperArmL === undefined || mid.pose.upperArmL.rotation === 0);
  const end = run(animator, 2000);
  assert.equal(animator.isPlaying('wave'), false);
  assert.ok(Math.abs(end.pose.upperArmR?.rotation ?? 0) < 1e-6);
});

test('espressioni: transizione di sopracciglia e cambio di bocca', () => {
  const animator = quiet();
  assert.equal(animator.setExpression('ghigno'), false);
  animator.setExpression('surprised', 200);
  const early = animator.update(40);
  assert.equal(early.slots.mouth, 'neutral');
  assert.ok(early.pose.browR.y < 0 && early.pose.browR.y > -12);
  const done = run(animator, 300);
  assert.equal(done.slots.mouth, 'surprised');
  assert.equal(done.pose.browR.y, -12);
  assert.ok(done.pose.eyeR.scaleX < 0.9);
  animator.setExpression('smile', 100);
  assert.equal(run(animator, 200).slots.mouth, 'smile');
});

test('battito: sequenza half → closed → half → open, poi nuova attesa', () => {
  const animator = new Animator(prepared, clips, { rng: () => 0 });
  animator.physicsEnabled = false;
  animator.triggerBlink();
  const seen = [];
  for (let t = 0; t < 260; t += 10) seen.push(animator.update(10).slots.eyelidR);
  const compact = seen.filter((v, i) => v !== seen[i - 1]);
  assert.deepEqual(compact, ['half', 'closed', 'half', 'open']);
  assert.equal(animator.update(10).slots.eyelidL, 'open');
  // Con rng = 0 l'intervallo è il minimo configurato: entro quel tempo deve ripartire un battito.
  const [min] = prepared.rig.blink.interval;
  let blinked = false;
  for (let t = 0; t < min + 200; t += 10) if (animator.update(10).slots.eyelidR !== 'open') blinked = true;
  assert.ok(blinked);
});

test('sguardo e inclinazione della testa restano entro i limiti', () => {
  const animator = quiet();
  animator.setGaze(5, -5);
  animator.setHeadTilt(90);
  const frame = run(animator, 2000);
  assert.ok(Math.abs(frame.pose.eyeR.x - 9) < 0.01 && Math.abs(frame.pose.eyeL.x - 9) < 0.01);
  assert.ok(Math.abs(frame.pose.eyeR.y + 5) < 0.01);
  assert.equal(frame.pose.head.rotation, 20);
  assert.equal(frame.pose.neck.rotation, 15);
});

test('moto secondario: i capelli ritardano e poi si assestano', () => {
  const animator = new Animator(prepared, clips, { rng: () => 0.5 });
  animator.blinkEnabled = false;
  run(animator, 500);
  animator.setManual('head', { rotation: 18 });
  const first = animator.update(16);
  assert.ok(first.pose.hairSideR.rotation < -10, 'appena la testa ruota, la ciocca resta indietro');
  const settled = run(animator, 6000);
  const expected = -18 * prepared.boneByName.get('hairSideR').physics.gravity;
  assert.ok(Math.abs(settled.pose.hairSideR.rotation - expected) < 0.2);
  const again = animator.update(16);
  assert.ok(Math.abs(again.pose.hairSideR.rotation - settled.pose.hairSideR.rotation) < 0.05, 'a regime è stabile');
  for (const value of Object.values(settled.pose)) for (const n of Object.values(value)) assert.ok(Number.isFinite(n));
});

test('banco prova manuale: delta sommati e rimovibili', () => {
  const animator = quiet();
  animator.setManual('forearmL', { rotation: 400 });
  assert.equal(animator.update(16).pose.forearmL.rotation, 150);
  animator.setManual('forearmL', null);
  assert.equal(animator.update(16).pose.forearmL, undefined);
});
