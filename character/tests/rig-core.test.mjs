import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  multiply, localMatrix, transformPoint, composePoses, mixPoses, validateRig, prepareRig,
  clampPose, computeWorld, worldRotation, resolveSlots, visibleLayers, resolvePalette, validateSpriteSet, IDENTITY
} from '../src/rig-core.mjs';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const rig = load('../rig/aetheria.rig.json');
const prepared = prepareRig(rig);
const near = (actual, expected, eps = 1e-6) => {
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < eps, actual + ' ≠ ' + expected));
};
const pivot = (name) => prepared.boneByName.get(name).pivot;

test('la matrice locale ruota attorno al pivot', () => {
  const m = localMatrix([100, 100], { rotation: 90 });
  near(transformPoint(m, [100, 100]), [100, 100]);
  near(transformPoint(m, [100, 200]), [0, 100]); // un punto sotto il pivot va a sinistra: orario sullo schermo
  near(multiply(IDENTITY, m), m);
});

test('pose additive e interpolazione', () => {
  const sum = composePoses({ a: { rotation: 10, scaleY: 1.1 } }, { a: { rotation: 5, x: 2, scaleY: 2 } }, null);
  assert.equal(sum.a.rotation, 15);
  assert.equal(sum.a.x, 2);
  assert.ok(Math.abs(sum.a.scaleY - 2.2) < 1e-9);
  assert.equal(mixPoses({ a: { rotation: 0 } }, { a: { rotation: 40 } }, 0.25).a.rotation, 10);
  assert.equal(mixPoses({}, { a: { scaleX: 3 } }, 0.5).a.scaleX, 2);
});

test('il rig pubblicato è valido', () => {
  const report = validateRig(rig);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(prepared.root.name, 'root');
  assert.equal(prepared.bones.length, rig.bones.length);
});

test('ordine topologico: ogni genitore precede i figli', () => {
  const seen = new Set();
  for (const bone of prepared.bones) {
    if (bone.parent != null) assert.ok(seen.has(bone.parent), bone.name);
    seen.add(bone.name);
  }
});

test('in posa di riposo tutte le matrici sono identità', () => {
  for (const m of Object.values(computeWorld(prepared, {}))) near(m, IDENTITY);
});

test('ruotare la spalla trascina gomito e polso, non il braccio opposto', () => {
  const world = computeWorld(prepared, { upperArmR: { rotation: 90 } });
  near(transformPoint(world.upperArmR, pivot('upperArmR')), pivot('upperArmR'));
  const elbow = transformPoint(world.upperArmR, pivot('forearmR'));
  const dx = pivot('forearmR')[0] - pivot('upperArmR')[0], dy = pivot('forearmR')[1] - pivot('upperArmR')[1];
  near(elbow, [pivot('upperArmR')[0] - dy, pivot('upperArmR')[1] + dx]);
  // Il pivot del polso, visto dall'avambraccio (catena completa), segue la stessa rotazione rigida.
  const wrist = transformPoint(world.forearmR, pivot('handR'));
  const before = Math.hypot(pivot('handR')[0] - pivot('upperArmR')[0], pivot('handR')[1] - pivot('upperArmR')[1]);
  const after = Math.hypot(wrist[0] - pivot('upperArmR')[0], wrist[1] - pivot('upperArmR')[1]);
  assert.ok(Math.abs(before - after) < 1e-6);
  near(world.upperArmL, IDENTITY);
  near(world.head, IDENTITY);
});

test('le articolazioni restano unite: il pivot del figlio coincide nel genitore e nel figlio', () => {
  const pose = { torso: { rotation: 8 }, upperArmR: { rotation: 120 }, forearmR: { rotation: -70 }, handR: { rotation: 30 }, thighL: { rotation: -30 }, shinL: { rotation: 60 } };
  const world = computeWorld(prepared, pose);
  for (const bone of prepared.bones) {
    if (bone.parent == null) continue;
    const local = pose[bone.name] ?? {};
    if (local.x || local.y) continue;
    near(transformPoint(world[bone.name], bone.pivot), transformPoint(world[bone.parent], bone.pivot), 1e-6);
  }
});

test('limiti articolari e rotazione complessiva', () => {
  const clamped = clampPose(prepared, { head: { rotation: 80 }, eyeR: { x: -50, y: 50 }, sconosciuto: { rotation: 1 } });
  assert.equal(clamped.head.rotation, 20);
  assert.equal(clamped.eyeR.x, -10);
  assert.equal(clamped.eyeR.y, 6);
  assert.equal(clamped.sconosciuto, undefined);
  assert.equal(worldRotation(prepared, { torso: { rotation: 5 }, neck: { rotation: 3 }, head: { rotation: 2 } }, 'head'), 10);
});

test('slot, varianti e palette', () => {
  assert.deepEqual(resolveSlots(prepared, { mouth: 'smile', eyelidR: 'inesistente' }), { mouth: 'smile', eyelidR: 'open', eyelidL: 'open' });
  const names = visibleLayers(prepared, { mouth: 'surprised', eyelidL: 'closed' }).map((l) => l.name);
  assert.ok(names.includes('mouth_surprised') && !names.includes('mouth_neutral'));
  assert.ok(names.includes('eyelid_L_closed') && names.includes('eyelid_R_open') && !names.includes('eyelid_L_open'));
  assert.equal(resolvePalette(prepared, 'nero-rosso').outfitAccent, '#e11d48');
  assert.equal(resolvePalette(prepared, 'nessuna').outfitAccent, rig.tintGroups.outfitAccent.default);
  assert.equal(resolvePalette(prepared, 'nero-viola', { outfitPrimary: '#ffffff', altro: '#000' }).outfitPrimary, '#ffffff');
});

test('la validazione individua errori strutturali', () => {
  const broken = structuredClone(rig);
  broken.bones.find((b) => b.name === 'head').parent = 'fantasma';
  broken.bones.push({ name: 'root2', parent: null, pivot: [0, 0] });
  broken.layers.push({ name: 'head', bone: 'nessuno', tint: 'ignoto' });
  broken.layers.find((l) => l.name === 'iris_R').clip = 'mancante';
  broken.expressions.smile.slots.mouth = 'ghigno';
  delete broken.palettes['nero-rosso'].outfitAccent;
  const { errors } = validateRig(broken);
  for (const fragment of ['fantasma', 'radice', 'duplicato: head', 'osso inesistente: nessuno', 'ignoto', 'mancante', 'ghigno', 'nero-rosso']) {
    assert.ok(errors.some((e) => e.includes(fragment)), 'manca errore per ' + fragment + '\n' + errors.join('\n'));
  }
  assert.throws(() => prepareRig(broken), /Rig non valido/);

  const cyclic = structuredClone(rig);
  cyclic.bones.find((b) => b.name === 'neck').parent = 'head';
  assert.ok(validateRig(cyclic).errors.some((e) => e.includes('Ciclo')));
});

test('il set di sprite deve coprire tutti i livelli', () => {
  const set = { layers: { head: { image: 'head.png', x: 0, y: 0, width: 10, height: 10 }, extra: { image: 'x.png', x: 0, y: 0, width: 1, height: 1 } } };
  const strict = validateSpriteSet(prepared, set);
  assert.equal(strict.errors.length, rig.layers.length - 1);
  assert.ok(strict.warnings.some((w) => w.includes('extra')));
  assert.equal(validateSpriteSet(prepared, { ...set, partial: true }).errors.length, 0);
});
