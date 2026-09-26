// Quita el fondo claro (gris/blanco con sombra suave) de un logo generado y
// lo guarda como PNG con alfa. Se procesa dentro de Chromium (Playwright)
// porque no hay decodificador de JPEG en Node.
// Uso: node tools/quitarFondoLogo.mjs <entrada.jpg> <salida.png> [anchoMax]
import { chromium } from "playwright";
import fs from "fs";

const [, , entrada, salida, anchoMaxArg] = process.argv;
const anchoMax = Number(anchoMaxArg) || 0;
const b64 = fs.readFileSync(entrada).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage();
const url = await page.evaluate(async ([b64, anchoMax]) => {
  const img = new Image();
  img.src = "data:image/jpeg;base64," + b64;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const cx = cv.getContext("2d");
  cx.drawImage(img, 0, 0);
  const id = cx.getImageData(0, 0, W, H);
  const d = id.data;
  // "parecido al fondo": poco croma y claro (gris/blanco, sombra suave incluida)
  const esFondo = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 26 && mx > 120) esFondo[i] = 1;
  }
  // componentes conexas de "fondo": las que tocan el borde se quitan siempre;
  // las encerradas (huecos de O, R, G...) solo si son grandes -- así se
  // conservan los brillos claros pequeños dentro de las letras.
  const comp = new Int32Array(W * H).fill(-1);
  const quitar = new Uint8Array(W * H);
  const cola = new Int32Array(W * H);
  let nComp = 0;
  for (let s = 0; s < W * H; s++) {
    if (!esFondo[s] || comp[s] >= 0) continue;
    let ini = 0, fin = 0, area = 0, tocaBorde = false;
    cola[fin++] = s; comp[s] = nComp;
    while (ini < fin) {
      const p = cola[ini++]; area++;
      const x = p % W, y = (p / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) tocaBorde = true;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q >= 0 && esFondo[q] && comp[q] < 0) { comp[q] = nComp; cola[fin++] = q; }
      }
    }
    if (tocaBorde || area > 120) for (let k = 0; k < fin; k++) quitar[cola[k]] = 1;
    nComp++;
  }
  // alfa: 0 en lo quitado; borde antialias suavizado según croma
  const alfa = new Uint8Array(W * H).fill(255);
  for (let i = 0; i < W * H; i++) if (quitar[i]) alfa[i] = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (quitar[p]) continue;
    if (quitar[p - 1] || quitar[p + 1] || quitar[p - W] || quitar[p + W]) {
      const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
      const ch = Math.max(r, g, b) - Math.min(r, g, b);
      const luz = Math.max(r, g, b);
      // píxel de borde mezclado con el fondo claro: cuanto más gris/claro, más transparente
      alfa[p] = Math.max(0, Math.min(255, Math.round(((ch - 20) / 40) * 255 + (luz < 110 ? 255 : 0))));
    }
  }
  for (let i = 0; i < W * H; i++) d[i * 4 + 3] = alfa[i];
  cx.putImageData(id, 0, 0);
  // recorte al contenido
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alfa[y * W + x] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const m = 6;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  if (anchoMax && out.width > anchoMax) {
    const esc = anchoMax / out.width;
    const red = document.createElement("canvas");
    red.width = anchoMax; red.height = Math.round(out.height * esc);
    const rc = red.getContext("2d");
    rc.imageSmoothingQuality = "high";
    rc.drawImage(out, 0, 0, red.width, red.height);
    return red.toDataURL("image/png");
  }
  return out.toDataURL("image/png");
}, [b64, anchoMax]);
fs.writeFileSync(salida, Buffer.from(url.split(",")[1], "base64"));
console.log("guardado", salida);
await browser.close();
