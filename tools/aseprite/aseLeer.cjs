// Lector mínimo de .aseprite (RGBA 32bpp): capas, tags, duraciones y cels.
// Sin Aseprite instalado -- formato documentado en
// https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
const fs = require("fs");
const zlib = require("zlib");

function leerAse(ruta) {
  const b = fs.readFileSync(ruta);
  let o = 0;
  const u8 = () => b[o++];
  const u16 = () => { const v = b.readUInt16LE(o); o += 2; return v; };
  const i16 = () => { const v = b.readInt16LE(o); o += 2; return v; };
  const u32 = () => { const v = b.readUInt32LE(o); o += 4; return v; };
  const str = () => { const n = u16(); const s = b.toString("utf8", o, o + n); o += n; return s; };
  u32();
  if (u16() !== 0xa5e0) throw new Error("no es un .aseprite: " + ruta);
  const nFrames = u16(), w = u16(), h = u16(), depth = u16();
  if (depth !== 32) throw new Error("solo RGBA 32bpp soportado: " + ruta);
  o = 128;
  const capas = [], tags = [], frames = [];
  for (let fi = 0; fi < nFrames; fi++) {
    const ini = o;
    const tam = u32(); u16();
    const nViejo = u16(); const dur = u16(); o += 2; const nNuevo = u32();
    const n = nNuevo || nViejo;
    const cels = [];
    for (let c = 0; c < n; c++) {
      const cIni = o; const cTam = u32(); const tipo = u16();
      if (tipo === 0x2004) {
        const flags = u16(), tipoCapa = u16(), hijo = u16();
        o += 4; const blend = u16(); const opac = u8(); o += 3;
        capas.push({ nombre: str(), visible: !!(flags & 1), tipo: tipoCapa, hijo, blend, opac });
      } else if (tipo === 0x2018) {
        const nt = u16(); o += 8;
        for (let t = 0; t < nt; t++) { const desde = u16(), hasta = u16(); o += 13; tags.push({ nombre: str(), desde, hasta }); }
      } else if (tipo === 0x2005) {
        const capa = u16(), x = i16(), y = i16(), opac = u8(), tipoCel = u16(); o += 2 + 5;
        if (tipoCel === 1) cels.push({ capa, x, y, opac, enlace: u16() });
        else {
          const cw = u16(), ch = u16();
          let px = b.subarray(o, cIni + cTam);
          if (tipoCel === 2) px = zlib.inflateSync(px);
          cels.push({ capa, x, y, opac, w: cw, h: ch, px: Buffer.from(px) });
        }
      }
      o = cIni + cTam;
    }
    frames.push({ dur, cels });
    o = ini + tam;
  }
  // resolver cels enlazados
  frames.forEach((f) => f.cels.forEach((c, k) => {
    if (c.enlace !== undefined) {
      const orig = frames[c.enlace].cels.find((d) => d.capa === c.capa);
      f.cels[k] = { ...orig, x: c.x, y: c.y, opac: c.opac };
    }
  }));
  return { w, h, capas, tags, frames };
}

// Compone en `dst` (RGBA w*h) las capas pedidas del frame fi, en orden de capa.
function componer(ase, fi, capasIdx, dst, dx = 0) {
  const W = dst.width;
  const cels = ase.frames[fi].cels.filter((c) => capasIdx.includes(c.capa)).sort((a, b) => a.capa - b.capa);
  for (const c of cels) {
    const opCapa = ase.capas[c.capa].opac / 255, opCel = c.opac / 255;
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const X = c.x + x, Y = c.y + y;
      if (X < 0 || Y < 0 || X >= ase.w || Y >= ase.h) continue;
      const s = (y * c.w + x) * 4;
      const a = (c.px[s + 3] / 255) * opCapa * opCel;
      if (a <= 0) continue;
      const d = (Y * W + dx + X) * 4;
      const da = dst.data[d + 3] / 255;
      const oa = a + da * (1 - a);
      for (let k = 0; k < 3; k++) dst.data[d + k] = Math.round((c.px[s + k] * a + dst.data[d + k] * da * (1 - a)) / oa);
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
}

module.exports = { leerAse, componer };
