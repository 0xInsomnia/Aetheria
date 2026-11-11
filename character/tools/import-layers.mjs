#!/usr/bin/env node
/**
 * Importa illustrazioni definitive in un nuovo set di sprite.
 *
 * Sorgente: una cartella con un PNG trasparente per livello, chiamato come il livello
 * del rig (es. upper_arm_R.png) ed esportato A TUTTO CANVAS, cioè con le stesse
 * proporzioni del canvas del rig e il contenuto già nella posizione di riposo.
 * La risoluzione può essere qualsiasi multiplo (es. 2000×4000 per un rig 1000×2000).
 *
 * Lo strumento ritaglia ogni livello sui pixel visibili, scrive i PNG ritagliati in
 * character/sprites/<set>/ e genera layers.json con posizioni e dimensioni in unità del rig.
 *
 * Uso: node character/tools/import-layers.mjs <cartellaSorgente> <nomeSet> [--partial]
 *   --partial  accetta livelli mancanti (il renderer li salta)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, alphaBounds, cropImage } from './png.mjs';

/**
 * @param rig     contenuto di aetheria.rig.json
 * @param sources Map nomeLivello → immagine RGBA a tutto canvas
 */
export function importLayers(rig, sources, { name = 'custom', partial = false, pad = 2 } = {}) {
  const errors = [];
  const missing = [];
  const images = new Map();
  const layers = {};
  let reference = null;
  for (const layer of rig.layers) {
    const source = sources.get(layer.name);
    if (!source) { missing.push(layer.name); continue; }
    if (!reference) reference = source;
    if (source.width !== reference.width || source.height !== reference.height) {
      errors.push(layer.name + ': dimensioni ' + source.width + '×' + source.height + ' diverse dagli altri livelli (' + reference.width + '×' + reference.height + ').');
      continue;
    }
    const box = alphaBounds(source, 0);
    if (!box) { errors.push(layer.name + ': livello completamente trasparente.'); continue; }
    const scale = source.width / rig.canvas.width;
    const x = box.x - pad, y = box.y - pad, width = box.width + pad * 2, height = box.height + pad * 2;
    images.set(layer.name, cropImage(source, x, y, width, height));
    const round = (n) => Math.round((n / scale) * 1000) / 1000;
    layers[layer.name] = { image: layer.name + '.png', x: round(x), y: round(y), width: round(width), height: round(height) };
  }
  if (reference && Math.abs(reference.width / reference.height - rig.canvas.width / rig.canvas.height) > 0.001) {
    errors.push('Le immagini sorgente (' + reference.width + '×' + reference.height + ') non hanno le proporzioni del canvas del rig (' + rig.canvas.width + '×' + rig.canvas.height + ').');
  }
  if (!reference) errors.push('Nessun livello trovato nella cartella sorgente.');
  if (missing.length && !partial) errors.push('Livelli mancanti: ' + missing.join(', ') + ' (usa --partial per accettarli).');
  const set = {
    format: 'aetheria-sprites',
    version: 1,
    name,
    canvas: { ...rig.canvas },
    pixelScale: reference ? reference.width / rig.canvas.width : 1,
    ...(missing.length ? { partial: true } : {}),
    layers
  };
  return { set, images, missing, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const partial = args.includes('--partial');
  const [sourceDir, setName] = args.filter((a) => !a.startsWith('--'));
  if (!sourceDir || !setName || !/^[a-z0-9][a-z0-9_-]*$/i.test(setName)) {
    console.error('Uso: node character/tools/import-layers.mjs <cartellaSorgente> <nomeSet> [--partial]');
    process.exit(2);
  }
  if (setName === 'placeholder') {
    console.error('Il set "placeholder" è generato da generate-placeholders.mjs: scegli un altro nome.');
    process.exit(2);
  }
  const rig = JSON.parse(readFileSync(new URL('../rig/aetheria.rig.json', import.meta.url), 'utf8'));
  const sources = new Map();
  const failures = [];
  for (const layer of rig.layers) {
    const file = join(sourceDir, layer.name + '.png');
    if (!existsSync(file)) continue;
    try { sources.set(layer.name, decodePng(readFileSync(file))); }
    catch (error) { failures.push(layer.name + '.png: ' + error.message); }
  }
  const result = importLayers(rig, sources, { name: setName, partial });
  const errors = [...failures, ...result.errors];
  if (errors.length) {
    for (const e of errors) console.error('ERRORE  ' + e);
    process.exit(1);
  }
  const dir = new URL('../sprites/' + setName + '/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const [name, image] of result.images) writeFileSync(new URL(name + '.png', dir), encodePng(image));
  writeFileSync(new URL('layers.json', dir), JSON.stringify(result.set, null, 2) + '\n');
  console.log('Importati ' + result.images.size + ' livelli in character/sprites/' + setName + '/' + (result.missing.length ? ' — mancanti: ' + result.missing.join(', ') : ''));
  console.log('Ora esegui: node character/tools/validate-rig.mjs ' + setName);
}
