#!/usr/bin/env node
/**
 * Verifica rig, clip e un set di sprite: struttura, file, dimensioni, trasparenza,
 * livelli colorabili in scala di grigi e copertura delle giunzioni.
 *
 * Uso: node character/tools/validate-rig.mjs [nomeSet]   (predefinito: placeholder)
 * Esce con codice 1 se ci sono errori.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateRig, prepareRig, validateSpriteSet } from '../src/rig-core.mjs';
import { validateClips } from '../src/animation.mjs';
import { decodePng } from './png.mjs';
import { checkSprites } from './sprite-checks.mjs';

const json = (url) => JSON.parse(readFileSync(url, 'utf8'));

export function validateAll(setName = 'placeholder', base = new URL('../', import.meta.url)) {
  const errors = [];
  const warnings = [];
  const rig = json(new URL('rig/aetheria.rig.json', base));
  const structure = validateRig(rig);
  errors.push(...structure.errors);
  warnings.push(...structure.warnings);
  if (errors.length) return { errors, warnings, joints: [] };

  const prepared = prepareRig(rig);
  errors.push(...validateClips(prepared, json(new URL('rig/animations.json', base)).clips));

  const setDir = new URL('sprites/' + setName + '/', base);
  if (!existsSync(new URL('layers.json', setDir))) {
    errors.push('Set di sprite non trovato: ' + fileURLToPath(setDir) + 'layers.json');
    return { errors, warnings, joints: [] };
  }
  const spriteSet = json(new URL('layers.json', setDir));
  const { width, height } = spriteSet.canvas ?? {};
  if (width && height && Math.abs(width / height - rig.canvas.width / rig.canvas.height) > 0.001) errors.push('Il canvas del set ha proporzioni diverse da quello del rig.');
  const coverage = validateSpriteSet(prepared, spriteSet);
  errors.push(...coverage.errors);
  warnings.push(...coverage.warnings);

  const images = new Map();
  for (const layer of prepared.layers) {
    const g = spriteSet.layers?.[layer.name];
    if (!g?.image) continue;
    const file = new URL(g.image, setDir);
    if (!existsSync(file)) { errors.push('File mancante: ' + g.image); continue; }
    try { images.set(layer.name, decodePng(readFileSync(file))); }
    catch (error) { errors.push(g.image + ': ' + error.message); }
  }
  const sprites = checkSprites(prepared, spriteSet, images);
  errors.push(...sprites.errors);
  warnings.push(...sprites.warnings);
  return { errors, warnings, joints: sprites.joints, layers: images.size, bones: prepared.bones.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const setName = process.argv[2] ?? 'placeholder';
  const report = validateAll(setName);
  console.log('Set: ' + setName + ' — ossa: ' + (report.bones ?? '?') + ', sprite letti: ' + (report.layers ?? 0));
  for (const j of report.joints) {
    console.log('  giunzione ' + j.bone.padEnd(10) + ' r=' + String(j.radius).padEnd(3) + ' figlio ' + (j.child * 100).toFixed(1) + '%  genitore (' + j.parent + ') ' + (j.parentCoverage * 100).toFixed(1) + '%');
  }
  for (const w of report.warnings) console.log('AVVISO  ' + w);
  for (const e of report.errors) console.log('ERRORE  ' + e);
  console.log(report.errors.length ? 'Non valido: ' + report.errors.length + ' errori.' : 'Valido: nessun errore, ' + report.warnings.length + ' avvisi.');
  process.exit(report.errors.length ? 1 : 0);
}
