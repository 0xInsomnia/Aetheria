/**
 * Controlli sulle immagini di un set di sprite, indipendenti dal file system:
 * ricevono immagini RGBA già decodificate. Usati da validate-rig.mjs e dai test.
 */

/**
 * Frazione del disco (centro e raggio in unità del rig) coperta da pixel opachi
 * dell'unione dei livelli indicati.
 */
export function discCoverage(center, radius, entries, alphaThreshold = 250) {
  let total = 0, covered = 0;
  const step = Math.max(0.5, radius / 24);
  for (let dy = -radius; dy <= radius; dy += step) {
    for (let dx = -radius; dx <= radius; dx += step) {
      if (dx * dx + dy * dy > radius * radius) continue;
      total++;
      const x = center[0] + dx, y = center[1] + dy;
      for (const { geometry: g, image } of entries) {
        const px = Math.floor(((x - g.x) / g.width) * image.width);
        const py = Math.floor(((y - g.y) / g.height) * image.height);
        if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
        if (image.data[(py * image.width + px) * 4 + 3] >= alphaThreshold) { covered++; break; }
      }
    }
  }
  return total ? covered / total : 0;
}

function edgeOpacity(image) {
  const { width, height, data } = image;
  let opaque = 0, count = 0;
  const probe = (x, y) => { count++; if (data[(y * width + x) * 4 + 3] > 8) opaque++; };
  for (let x = 0; x < width; x++) { probe(x, 0); probe(x, height - 1); }
  for (let y = 0; y < height; y++) { probe(0, y); probe(width - 1, y); }
  return count ? opaque / count : 0;
}

function colorStats(image) {
  const { data } = image;
  let visible = 0, colored = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    visible++;
    if (Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 6) colored++;
  }
  return { visible, colored };
}

/**
 * @param prepared  rig preparato
 * @param spriteSet contenuto di layers.json
 * @param images    Map nomeLivello → {width, height, data, hasAlpha?}
 * @returns {{errors: string[], warnings: string[], joints: object[]}}
 */
export function checkSprites(prepared, spriteSet, images) {
  const errors = [];
  const warnings = [];
  const scales = [];

  for (const layer of prepared.layers) {
    const g = spriteSet.layers?.[layer.name];
    const image = images.get(layer.name);
    if (!g || !image) continue;
    const sx = image.width / g.width, sy = image.height / g.height;
    if (Math.abs(sx - sy) / sx > 0.02) errors.push(layer.name + ': proporzioni dell\'immagine (' + image.width + '×' + image.height + ') diverse dalla geometria dichiarata (' + g.width + '×' + g.height + ').');
    scales.push([layer.name, sx]);
    if (image.hasAlpha === false) errors.push(layer.name + ': il PNG non ha canale alfa.');
    const stats = colorStats(image);
    if (!stats.visible) errors.push(layer.name + ': immagine completamente trasparente.');
    if (layer.tint && stats.colored / Math.max(1, stats.visible) > 0.02) {
      errors.push(layer.name + ': un livello colorabile deve essere in scala di grigi (trovati pixel colorati).');
    }
    if (edgeOpacity(image) > 0.05) warnings.push(layer.name + ': pixel opachi sul bordo dell\'immagine, il ritaglio potrebbe essere troppo stretto.');
  }
  if (scales.length) {
    const reference = scales[0][1];
    const odd = scales.filter(([, s]) => Math.abs(s - reference) / reference > 0.02).map(([name]) => name);
    if (odd.length) warnings.push('Risoluzione non uniforme rispetto a ' + scales[0][0] + ': ' + odd.join(', '));
  }

  // Giunzioni: genitore e figlio devono coprire entrambi, da soli, il disco attorno al pivot.
  // Se è così, ruotare il figlio non può aprire buchi nell'articolazione.
  const fixedLayers = (boneName) => prepared.layers
    .filter((layer) => layer.bone === boneName && !layer.slot && !layer.clip && spriteSet.layers?.[layer.name] && images.get(layer.name))
    .map((layer) => ({ geometry: spriteSet.layers[layer.name], image: images.get(layer.name) }));
  const joints = [];
  for (const bone of prepared.bones) {
    if (!bone.joint) continue;
    const child = discCoverage(bone.pivot, bone.joint.radius, fixedLayers(bone.name));
    const parent = discCoverage(bone.pivot, bone.joint.radius, fixedLayers(bone.parent));
    joints.push({ bone: bone.name, parent: bone.parent, radius: bone.joint.radius, child, parentCoverage: parent });
    const percent = (n) => (n * 100).toFixed(1) + '%';
    if (child < 0.995) errors.push('Giunzione ' + bone.name + ': gli sprite di ' + bone.name + ' coprono solo ' + percent(child) + ' del disco di raggio ' + bone.joint.radius + ' attorno al pivot (parte nascosta non ricostruita).');
    if (parent < 0.995) errors.push('Giunzione ' + bone.name + ': gli sprite di ' + bone.parent + ' coprono solo ' + percent(parent) + ' del disco di raggio ' + bone.joint.radius + ' attorno al pivot.');
  }
  return { errors, warnings, joints };
}
