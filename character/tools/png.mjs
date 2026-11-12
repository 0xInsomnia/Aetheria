/**
 * Lettura e scrittura PNG senza dipendenze (solo node:zlib).
 * Scrive RGBA a 8 bit. Legge PNG a 8 bit non interlacciati: grigi, RGB, palette,
 * grigi+alfa e RGBA; restituisce sempre RGBA.
 */
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

/** @param {{width:number,height:number,data:Uint8Array}} image RGBA, 4 byte per pixel */
export function encodePng({ width, height, data }) {
  if (data.length !== width * height * 4) throw new Error('Dimensioni e dati RGBA non coerenti.');
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // profondità
  header[9] = 6; // RGBA
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** @returns {{width:number,height:number,data:Uint8Array,colorType:number,hasAlpha:boolean}} */
export function decodePng(buffer) {
  if (buffer.length < 8 || !SIGNATURE.equals(buffer.subarray(0, 8))) throw new Error('Non è un file PNG.');
  let offset = 8, width = 0, height = 0, depth = 0, colorType = 0, interlace = 0, palette = null, transparency = null;
  const idat = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') transparency = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (!width || !height) throw new Error('PNG senza intestazione valida.');
  if (depth !== 8) throw new Error('Sono supportati solo PNG a 8 bit per canale (trovati ' + depth + ').');
  if (interlace) throw new Error('I PNG interlacciati non sono supportati.');
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error('Tipo di colore PNG non supportato: ' + colorType);
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * height) throw new Error('Dati PNG incompleti.');
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[out + x - channels] : 0;
      const up = y ? pixels[out + x - stride] : 0;
      const upLeft = y && x >= channels ? pixels[out + x - stride - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) throw new Error('Filtro PNG sconosciuto: ' + filter);
      pixels[out + x] = (raw[line + x] + predicted) & 0xff;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0, count = width * height; i < count; i++) {
    const s = i * channels, d = i * 4;
    if (colorType === 6) { data[d] = pixels[s]; data[d + 1] = pixels[s + 1]; data[d + 2] = pixels[s + 2]; data[d + 3] = pixels[s + 3]; }
    else if (colorType === 2) { data[d] = pixels[s]; data[d + 1] = pixels[s + 1]; data[d + 2] = pixels[s + 2]; data[d + 3] = 255; }
    else if (colorType === 0) { data[d] = data[d + 1] = data[d + 2] = pixels[s]; data[d + 3] = 255; }
    else if (colorType === 4) { data[d] = data[d + 1] = data[d + 2] = pixels[s]; data[d + 3] = pixels[s + 1]; }
    else {
      const index = pixels[s];
      if (!palette || index * 3 + 2 >= palette.length) throw new Error('Indice di palette non valido.');
      data[d] = palette[index * 3]; data[d + 1] = palette[index * 3 + 1]; data[d + 2] = palette[index * 3 + 2];
      data[d + 3] = transparency && index < transparency.length ? transparency[index] : 255;
    }
  }
  const hasAlpha = colorType === 6 || colorType === 4 || (colorType === 3 && !!transparency);
  return { width, height, data, colorType, hasAlpha };
}

/** Rettangolo minimo che contiene i pixel con alfa > soglia, oppure null se l'immagine è vuota. */
export function alphaBounds({ width, height, data }, threshold = 0) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Ritaglia una regione, anche parzialmente esterna all'immagine (riempita di trasparente). */
export function cropImage(image, x, y, width, height) {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const sy = y + row;
    if (sy < 0 || sy >= image.height) continue;
    const from = Math.max(0, x), to = Math.min(image.width, x + width);
    if (to <= from) continue;
    data.set(image.data.subarray((sy * image.width + from) * 4, (sy * image.width + to) * 4), (row * width + from - x) * 4);
  }
  return { width, height, data };
}
