import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRig } from '../src/rig-core.mjs';
import { encodePng, decodePng, alphaBounds, cropImage } from '../tools/png.mjs';
import { buildPlaceholderSet, rasterize } from '../tools/generate-placeholders.mjs';
import { checkSprites, discCoverage } from '../tools/sprite-checks.mjs';
import { importLayers } from '../tools/import-layers.mjs';
import { validateAll } from '../tools/validate-rig.mjs';

const rig = JSON.parse(readFileSync(new URL('../rig/aetheria.rig.json', import.meta.url), 'utf8'));
const prepared = prepareRig(rig);
const built = buildPlaceholderSet(rig);

test('PNG: codifica e decodifica senza perdite', () => {
  const data = new Uint8Array(5 * 3 * 4).map((_, i) => (i * 37) % 256);
  const decoded = decodePng(encodePng({ width: 5, height: 3, data }));
  assert.equal(decoded.width, 5);
  assert.equal(decoded.height, 3);
  assert.equal(decoded.hasAlpha, true);
  assert.deepEqual([...decoded.data], [...data]);
  assert.throws(() => decodePng(Buffer.from('non un png')), /PNG/);
});

test('ritaglio sui pixel visibili', () => {
  const image = { width: 6, height: 6, data: new Uint8Array(6 * 6 * 4) };
  for (const [x, y] of [[2, 1], [4, 3]]) image.data.set([9, 9, 9, 255], (y * 6 + x) * 4);
  assert.deepEqual(alphaBounds(image), { x: 2, y: 1, width: 3, height: 3 });
  assert.equal(alphaBounds({ width: 2, height: 2, data: new Uint8Array(16) }), null);
  const crop = cropImage(image, 1, 0, 5, 5);
  assert.equal(crop.data[(1 * 5 + 1) * 4 + 3], 255);
  assert.equal(cropImage(image, -2, -2, 4, 4).data.length, 64);
});

test('gli sprite segnaposto pubblicati corrispondono al generatore', () => {
  const published = JSON.parse(readFileSync(new URL('../sprites/placeholder/layers.json', import.meta.url), 'utf8'));
  assert.deepEqual(published, built.set);
  for (const [name, image] of built.images) {
    const file = decodePng(readFileSync(new URL('../sprites/placeholder/' + name + '.png', import.meta.url)));
    assert.equal(file.width, image.width, name);
    assert.equal(Buffer.compare(Buffer.from(file.data), Buffer.from(image.data)), 0, name);
  }
});

test('il set pubblicato supera tutti i controlli', () => {
  const report = validateAll('placeholder');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.joints.length, rig.bones.filter((b) => b.joint).length);
  assert.ok(validateAll('inesistente').errors.length > 0);
});

test('una parte nascosta non ricostruita viene segnalata come errore di giunzione', () => {
  const images = new Map(built.images);
  const g = built.set.layers.hand_R;
  const original = images.get('hand_R');
  // Simula una mano tagliata di netto al polso, come in un'illustrazione affettata senza ricostruzione.
  const cut = { ...original, data: new Uint8Array(original.data) };
  const wristRow = Math.round(prepared.boneByName.get('handR').pivot[1] - g.y);
  cut.data.fill(0, 0, wristRow * cut.width * 4);
  images.set('hand_R', cut);
  const report = checkSprites(prepared, built.set, images);
  assert.ok(report.errors.some((e) => e.startsWith('Giunzione handR')), report.errors.join('\n'));
  const joint = report.joints.find((j) => j.bone === 'handR');
  assert.ok(joint.child > 0.4 && joint.child < 0.6);
  assert.equal(joint.parentCoverage, 1);
});

test('i livelli colorabili devono essere in scala di grigi e avere contenuto', () => {
  const images = new Map(built.images);
  const top = images.get('top');
  const tinted = { ...top, data: new Uint8Array(top.data) };
  for (let i = 0; i < tinted.data.length; i += 4) tinted.data[i] = 255;
  images.set('top', tinted);
  images.set('belt', { ...images.get('belt'), data: new Uint8Array(images.get('belt').data.length) });
  const { errors } = checkSprites(prepared, built.set, images);
  assert.ok(errors.some((e) => e.startsWith('top:') && e.includes('grigi')));
  assert.ok(errors.some((e) => e.startsWith('belt:') && e.includes('trasparente')));
});

test('copertura del disco e rasterizzazione', () => {
  const disc = rasterize([{ kind: 'ellipse', c: [50, 50], rx: 20, ry: 20, color: [1, 2, 3] }]);
  const entry = [{ geometry: disc, image: disc }];
  assert.equal(discCoverage([50, 50], 18, entry), 1);
  assert.ok(discCoverage([70, 50], 18, entry) < 0.6);
  assert.equal(discCoverage([200, 200], 5, entry), 0);
});

test('importazione di livelli a tutto canvas, anche ad alta risoluzione', () => {
  const scale = 2;
  const width = rig.canvas.width * scale, height = rig.canvas.height * scale;
  const full = (x, y, w, h) => {
    const data = new Uint8Array(width * height * 4);
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) data.set([200, 200, 200, 255], (row * width + col) * 4);
    return { width, height, data };
  };
  const sources = new Map([['head', full(800, 240, 400, 480)], ['neck', full(940, 660, 120, 200)]]);
  const strict = importLayers(rig, sources, { name: 'prova' });
  assert.ok(strict.errors.some((e) => e.includes('Livelli mancanti')));
  const result = importLayers(rig, sources, { name: 'prova', partial: true });
  assert.deepEqual(result.errors, []);
  assert.equal(result.set.partial, true);
  assert.equal(result.set.pixelScale, 2);
  assert.deepEqual(result.set.layers.head, { image: 'head.png', x: 399, y: 119, width: 202, height: 242 });
  assert.equal(result.images.get('head').width, 404);
  assert.equal(result.missing.length, rig.layers.length - 2);
  const wrong = importLayers(rig, new Map([['head', { width: 10, height: 10, data: new Uint8Array(400).fill(255) }]]), { partial: true });
  assert.ok(wrong.errors.some((e) => e.includes('proporzioni')));
});
