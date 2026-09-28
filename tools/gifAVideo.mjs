// Re-versión de gifAVideo.mjs: decodifica el GIF A MANO (tools/gifDecode.cjs)
// en vez de dejar que el <img> del navegador anime solo -- confirmado que
// canvas.drawImage() de un <img> GIF animado en este Playwright/Chromium
// SIEMPRE devuelve el fotograma 0 congelado (la página SÍ anima visualmente,
// pero drawImage()+getImageData() no lo reflejan), así que el vídeo grabado
// con esa técnica salía casi vacío (~100KB para 20s). Aquí cada fotograma se
// decodifica en Node, se sirve por HTTP y el navegador solo hace
// fetch+drawImage+esperar el delay real -- cero dependencia de que el
// navegador anime nada por su cuenta.
// Uso: node tools/gifAVideo.mjs <entrada.gif> <salida.mp4> <salida-poster.jpg> [bitrateKbps]
import { chromium } from "playwright";
import { decodeFramesRGBA } from "./gifDecode.cjs";
import { PNG } from "pngjs";
import http from "http";
import fs from "fs";
import path from "path";
import os from "os";

const [, , entrada, salidaMp4, salidaPoster, bitrateKbpsArg] = process.argv;
if (!entrada || !salidaMp4 || !salidaPoster) {
  console.error("Uso: node gifAVideo.mjs <entrada.gif> <salida.mp4> <salida-poster.jpg> [bitrateKbps]");
  process.exit(1);
}
const bitrateKbps = Number(bitrateKbpsArg) || 1400;

console.log("decodificando GIF...");
const { w, h, frames } = decodeFramesRGBA(entrada);
console.log(`${frames.length} fotogramas, ${w}x${h}, ${(frames.reduce((s, f) => s + f.delay, 0) / 1000).toFixed(1)}s`);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gif2video-"));
frames.forEach((f, i) => {
  const png = new PNG({ width: w, height: h });
  png.data.set(f.rgba);
  fs.writeFileSync(path.join(tmpDir, `f${i}.png`), PNG.sync.write(png));
});
fs.writeFileSync(path.join(tmpDir, "manifest.json"), JSON.stringify(frames.map((f) => f.delay)));
console.log("fotogramas escritos en", tmpDir);

const server = http.createServer((req, res) => {
  const p = path.join(tmpDir, decodeURIComponent(req.url.slice(1)));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": p.endsWith(".json") ? "application/json" : "image/png" });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
console.log("servidor local en", port);

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/manifest.json`); // solo para tener el origen listo
const { videoB64, posterB64, mimeUsado } = await page.evaluate(
  async ([w, h, bitrateKbps, nFrames]) => {
    const delays = await (await fetch("/manifest.json")).json();
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    document.body.appendChild(cv);
    const cx = cv.getContext("2d");
    cx.imageSmoothingEnabled = false;

    // Todo el fetch+decode ANTES de arrancar a grabar -- si se hace dentro
    // del bucle cronometrado, esa latencia se suma al delay real de cada
    // fotograma y el vídeo sale más lento de lo debido (probado: 23.9s en
    // vez de los 20.0s reales del GIF).
    const bitmaps = [];
    for (let i = 0; i < nFrames; i++) {
      const blob = await (await fetch(`/f${i}.png`)).blob();
      bitmaps.push(await createImageBitmap(blob));
    }
    const dibujar = (i) => { cx.clearRect(0, 0, w, h); cx.drawImage(bitmaps[i], 0, 0); };

    dibujar(0);
    const posterB64 = cv.toDataURL("image/jpeg", 0.9);

    const candidatos = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9"];
    const mime = candidatos.find((t) => MediaRecorder.isTypeSupported(t));
    const stream = cv.captureStream(0); // 0 = solo emite fotogramas cuando cambiamos el canvas
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrateKbps * 1000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const parada = new Promise((res) => { rec.onstop = res; });
    rec.start();
    const t0 = performance.now();
    let acumulado = 0;
    for (let i = 0; i < nFrames; i++) {
      dibujar(i);
      if (track.requestFrame) track.requestFrame();
      acumulado += delays[i];
      // Espera hasta el instante ABSOLUTO que le toca a este fotograma (no
      // solo su delay individual) para que la deriva de setTimeout/rAF no
      // se vaya acumulando fotograma a fotograma.
      const falta = t0 + acumulado - performance.now();
      if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    }
    rec.stop();
    await parada;
    const blob = new Blob(chunks, { type: mime });
    const buf = await blob.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    const chunkSz = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSz) bin += String.fromCharCode(...bytes.subarray(i, i + chunkSz));
    return { videoB64: btoa(bin), posterB64, mimeUsado: mime };
  },
  [w, h, bitrateKbps, frames.length],
);
fs.writeFileSync(salidaMp4, Buffer.from(videoB64, "base64"));
fs.writeFileSync(salidaPoster, Buffer.from(posterB64.split(",")[1], "base64"));
console.log("mime real:", mimeUsado);
console.log("guardado:", salidaMp4, (fs.statSync(salidaMp4).size / 1024 / 1024).toFixed(2) + "MB");
console.log("guardado:", salidaPoster, (fs.statSync(salidaPoster).size / 1024).toFixed(0) + "KB");
await browser.close();
server.close();
fs.rmSync(tmpDir, { recursive: true, force: true });
