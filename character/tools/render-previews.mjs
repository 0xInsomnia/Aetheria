#!/usr/bin/env node
/**
 * Genera le immagini di verifica in character/preview/ usando il renderer reale
 * della demo dentro Chromium. È l'unico strumento che richiede Playwright
 * (`npm i -D playwright` oppure un'installazione globale); gli altri sono senza dipendenze.
 *
 * Uso: node character/tools/render-previews.mjs [nomeSet]
 * Con Playwright globale: NODE_PATH=$(npm root -g) node character/tools/render-previews.mjs
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../../', import.meta.url));
const setName = process.argv[2] ?? 'placeholder';
const outDir = new URL(setName === 'placeholder' ? '../preview/' : '../preview/' + setName + '/', import.meta.url);
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };

const server = createServer((request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname)));
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

// require() trova anche un Playwright installato globalmente (NODE_PATH), a differenza di import().
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:' + server.address().port + '/character/demo/index.html?set=' + encodeURIComponent(setName));
  const ready = await page.evaluate(() => window.aetheriaDemo.ready);
  if (!ready) throw new Error('La demo non si è avviata: ' + (await page.evaluate(() => window.aetheriaDemo.error)));

  const sheets = await page.evaluate(() => {
    const demo = window.aetheriaDemo;
    const { prepared } = demo;
    const all = { bones: true, pivots: true, joints: true };
    const face = [330, 90, 340, 300];
    const jointed = prepared.bones.filter((b) => b.joint);
    const palettes = Object.keys(prepared.rig.palettes ?? {});
    const out = {};

    out['01-ricomposto'] = demo.sheet([
      { label: 'Posa di riposo ricomposta' },
      { label: 'Ossa, pivot e dischi delle giunzioni', debug: all },
      { label: 'Riquadri dei livelli', debug: { boxes: true } },
      { label: 'Vista esplosa: estremità ricostruite', pose: demo.explodedPose(46), unclamped: true }
    ], { columns: 4, cellWidth: 300, cellHeight: 600 });

    out['02-articolazioni'] = demo.sheet(jointed.flatMap((bone) => {
      const [min, max] = bone.limits?.rotation ?? [-45, 45];
      return [
        { label: bone.name + ' ' + min + '°', pose: { [bone.name]: { rotation: min } }, debug: { joints: true } },
        { label: bone.name + ' +' + max + '°', pose: { [bone.name]: { rotation: max } }, debug: { joints: true } }
      ];
    }), { columns: 7, cellWidth: 200, cellHeight: 400 });

    out['03-espressioni'] = demo.sheet(Object.entries(prepared.rig.expressions ?? {}).map(([name, e]) => (
      { label: e.label ?? name, pose: e.pose, slots: e.slots, focus: face }
    )), { columns: 4, cellWidth: 300, cellHeight: 290 });

    out['04-occhi'] = demo.sheet([
      { label: 'Sguardo a sinistra', pose: { eyeR: { x: -9 }, eyeL: { x: -9 } }, focus: face },
      { label: 'Sguardo a destra', pose: { eyeR: { x: 9 }, eyeL: { x: 9 } }, focus: face },
      { label: 'Sguardo in alto', pose: { eyeR: { y: -5 }, eyeL: { y: -5 } }, focus: face },
      { label: 'Sguardo in basso', pose: { eyeR: { y: 5 }, eyeL: { y: 5 } }, focus: face },
      { label: 'Palpebre a metà', slots: { eyelidR: 'half', eyelidL: 'half' }, focus: face },
      { label: 'Palpebre chiuse', slots: { eyelidR: 'closed', eyelidL: 'closed' }, focus: face },
      { label: 'Testa inclinata -20°', pose: { head: { rotation: -14 }, neck: { rotation: -6 } }, focus: face },
      { label: 'Testa inclinata +20°', pose: { head: { rotation: 14 }, neck: { rotation: 6 } }, focus: face }
    ], { columns: 4, cellWidth: 300, cellHeight: 290 });

    out['05-saluto'] = demo.sheet([0, 240, 480, 760, 1040, 2150, 2450, 2700].map((time) => (
      { label: 'Saluto · ' + time + ' ms', pose: demo.sampleClip('wave', time) }
    )), { columns: 8, cellWidth: 190, cellHeight: 380 });

    out['06-respirazione-capelli'] = demo.sheet([
      { label: 'Respiro · espirazione', pose: demo.sampleClip('breathe', 0) },
      { label: 'Respiro · inspirazione', pose: demo.sampleClip('breathe', 1900), debug: { bones: true } },
      { label: 'Capelli · oscillazione −', pose: { hairSideR: { rotation: -20 }, hairSideL: { rotation: -20 }, ponytail: { rotation: -25 }, ponytailTip: { rotation: -30 }, strap: { rotation: -30 } } },
      { label: 'Capelli · oscillazione +', pose: { hairSideR: { rotation: 20 }, hairSideL: { rotation: 20 }, ponytail: { rotation: 25 }, ponytailTip: { rotation: 30 }, strap: { rotation: 30 } } }
    ], { columns: 4, cellWidth: 260, cellHeight: 520 });

    out['07-palette'] = demo.sheet([
      ...palettes.map((palette) => ({ label: 'Palette ' + palette, palette })),
      { label: 'Solo livelli colorabili', palette: palettes[0], only: 'tint' }
    ], { columns: 4, cellWidth: 260, cellHeight: 520 });
    return out;
  });

  mkdirSync(outDir, { recursive: true });
  for (const [name, dataUrl] of Object.entries(sheets)) {
    const file = new URL(name + '.png', outDir);
    writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('Scritto ' + fileURLToPath(file).replace(root, ''));
  }
  await page.screenshot({ path: fileURLToPath(new URL('00-demo-desktop.png', outDir)) });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: fileURLToPath(new URL('00-demo-mobile.png', outDir)) });
  if (errors.length) {
    failed = true;
    console.error('Errori nella pagina:\n- ' + errors.join('\n- '));
  } else console.log('Nessun errore JavaScript nella demo.');
} catch (error) {
  failed = true;
  console.error(error.message);
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
