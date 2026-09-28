// Decodificador GIF89a mínimo (LZW + tabla de color global + transparencia +
// disposal "no disponer"/"restaurar a fondo") -- hace falta porque Chromium
// vía Playwright no refresca canvas.drawImage() de un <img> GIF animado en
// este entorno (confirmado: la página SÍ anima visualmente, pero
// drawImage()+getImageData() siempre devuelve el fotograma 0 congelado), así
// que no se puede capturar el vídeo dejando que el navegador anime solo --
// hay que decodificar cada fotograma a mano y dibujarlo explícitamente.
// Sin interlace (no hace falta soportarlo, los GIF de origen no lo usan).
const fs = require("fs");

function leerGif(ruta) {
  const b = fs.readFileSync(ruta);
  let o = 6;
  const w = b.readUInt16LE(o); const h = b.readUInt16LE(o + 2); o += 4;
  const packed = b[o]; o++;
  const gctFlag = (packed & 0x80) !== 0;
  const gctSize = 2 << (packed & 7);
  o += 2; // bg color index + pixel aspect
  let gct = null;
  if (gctFlag) {
    gct = [];
    for (let i = 0; i < gctSize; i++) { gct.push([b[o], b[o + 1], b[o + 2]]); o += 3; }
  }
  const frames = [];
  let gce = null;
  while (o < b.length) {
    const sep = b[o];
    if (sep === 0x21) {
      const label = b[o + 1];
      if (label === 0xf9) {
        const blockSize = b[o + 2];
        const flags = b[o + 3];
        gce = { disposal: (flags >> 2) & 7, transp: (flags & 1) !== 0, delay: b.readUInt16LE(o + 4) * 10, transIdx: b[o + 6] };
        o += 2 + blockSize + 1;
      } else {
        o += 2;
        while (b[o] !== 0) o += 1 + b[o];
        o += 1;
      }
    } else if (sep === 0x2c) {
      const lx = b.readUInt16LE(o + 1), ly = b.readUInt16LE(o + 3);
      const lw = b.readUInt16LE(o + 5), lh = b.readUInt16LE(o + 7);
      const lPacked = b[o + 9];
      const lctFlag = (lPacked & 0x80) !== 0;
      const lctSize = 2 << (lPacked & 7);
      o += 10;
      let lct = null;
      if (lctFlag) { lct = []; for (let i = 0; i < lctSize; i++) { lct.push([b[o], b[o + 1], b[o + 2]]); o += 3; } }
      const minCode = b[o]; o += 1;
      const chunks = [];
      while (b[o] !== 0) { const n = b[o]; chunks.push(b.subarray(o + 1, o + 1 + n)); o += 1 + n; }
      o += 1;
      const data = Buffer.concat(chunks);
      frames.push({ lx, ly, lw, lh, minCode, data, gce: gce || { disposal: 0, transp: false, delay: 100, transIdx: -1 }, palette: lct || gct });
      gce = null;
    } else if (sep === 0x3b) break;
    else o++;
  }
  return { w, h, frames };
}

// LZW-GIF: variante TIFF de Welch, códigos de ancho variable LSB-first.
function decodeLZW(data, minCodeSize, nPixels) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dict, next;
  const reset = () => {
    dict = new Array(clearCode);
    for (let i = 0; i < clearCode; i++) dict[i] = [i];
    dict.push(null, null); // clear, end
    next = endCode + 1;
    codeSize = minCodeSize + 1;
  };
  reset();
  const out = new Uint8Array(nPixels);
  let outPos = 0;
  let bitBuf = 0, bitCount = 0, bytePos = 0;
  const readCode = () => {
    while (bitCount < codeSize) {
      if (bytePos >= data.length) return endCode;
      bitBuf |= data[bytePos++] << bitCount;
      bitCount += 8;
    }
    const code = bitBuf & ((1 << codeSize) - 1);
    bitBuf >>= codeSize;
    bitCount -= codeSize;
    return code;
  };
  let prev = null;
  while (outPos < nPixels) {
    const code = readCode();
    if (code === clearCode) { reset(); prev = null; continue; }
    if (code === endCode) break;
    let entry;
    if (code < next && dict[code]) entry = dict[code];
    else if (code === next && prev) entry = prev.concat(prev[0]);
    else break; // código inválido: parar en vez de corromper el resto
    for (let i = 0; i < entry.length && outPos < nPixels; i++) out[outPos++] = entry[i];
    if (prev) { dict[next++] = prev.concat(entry[0]); if (next === (1 << codeSize) && codeSize < 12) codeSize++; }
    prev = entry;
  }
  return out;
}

// Decodifica TODOS los fotogramas a RGBA compuestos sobre un lienzo
// persistente (aplicando disposal/transparencia) -- devuelve
// [{ rgba: Uint8ClampedArray(w*h*4), delay }].
function decodeFramesRGBA(ruta) {
  const gif = leerGif(ruta);
  const { w, h } = gif;
  const canvas = new Uint8ClampedArray(w * h * 4);
  const out = [];
  for (const f of gif.frames) {
    const idx = decodeLZW(f.data, f.minCode, f.lw * f.lh);
    const pal = f.palette;
    let disposeRestore = null;
    if (f.gce.disposal === 3) disposeRestore = canvas.slice();
    for (let y = 0; y < f.lh; y++) {
      for (let x = 0; x < f.lw; x++) {
        const ci = idx[y * f.lw + x];
        if (f.gce.transp && ci === f.gce.transIdx) continue; // deja el píxel de debajo
        const [r, g, b] = pal[ci] || [0, 0, 0];
        const p = ((f.ly + y) * w + (f.lx + x)) * 4;
        canvas[p] = r; canvas[p + 1] = g; canvas[p + 2] = b; canvas[p + 3] = 255;
      }
    }
    out.push({ rgba: canvas.slice(), delay: f.gce.delay || 100 });
    if (f.gce.disposal === 2) {
      // restaurar a fondo (transparente) el rectángulo de este fotograma
      for (let y = 0; y < f.lh; y++) for (let x = 0; x < f.lw; x++) {
        const p = ((f.ly + y) * w + (f.lx + x)) * 4;
        canvas[p] = canvas[p + 1] = canvas[p + 2] = canvas[p + 3] = 0;
      }
    } else if (f.gce.disposal === 3 && disposeRestore) {
      canvas.set(disposeRestore);
    }
    // disposal 0/1: no hacer nada, se queda como base del siguiente fotograma
  }
  return { w, h, frames: out };
}

module.exports = { leerGif, decodeFramesRGBA };
