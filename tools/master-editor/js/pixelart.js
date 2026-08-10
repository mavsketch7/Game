// --- Mini editor de píxel a píxel para pintar una capa a mano ---
// Reimplementado a partir de tools/level-editor/js/pixelart.js (mismo patrón),
// no compartido a propósito -- ver plan de la sesión.
const ZOOM = 10;

const panel = document.getElementById("pixelart-panel-me");
const canvas = document.getElementById("pixelart-canvas-me");
const ctx = canvas.getContext("2d");
const inputColor = document.getElementById("pixelart-color-me");
const inputSize = document.getElementById("pixelart-size-me");
const btnBorrador = document.getElementById("pixelart-borrador-me");
const btnLimpiar = document.getElementById("btn-pixelart-limpiar-me");
const btnUsar = document.getElementById("btn-pixelart-usar-me");

let tam = parseInt(inputSize.value) || 32;
let pixeles = crearGrid(tam);
let borrando = false;
let pintando = false;
let onUsarCb = () => {};

export function setOnUsar(cb) { onUsarCb = cb; }

function crearGrid(n) {
  return Array.from({ length: n }, () => new Array(n).fill(null));
}

function redimensionar() {
  tam = Math.max(4, Math.min(64, parseInt(inputSize.value) || 32));
  inputSize.value = tam;
  canvas.width = tam * ZOOM;
  canvas.height = tam * ZOOM;
  pixeles = crearGrid(tam);
  dibujar();
}

function dibujar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      ctx.fillStyle = pixeles[y][x] || (((x + y) % 2 === 0) ? "#1d1929" : "#26213a");
      ctx.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= tam; i++) {
    ctx.beginPath(); ctx.moveTo(i * ZOOM, 0); ctx.lineTo(i * ZOOM, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * ZOOM); ctx.lineTo(canvas.width, i * ZOOM); ctx.stroke();
  }
}

function celdaDesde(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / (rect.width / tam));
  const y = Math.floor((e.clientY - rect.top) / (rect.height / tam));
  if (x < 0 || x >= tam || y < 0 || y >= tam) return null;
  return { x, y };
}

function pintarEn(e) {
  const c = celdaDesde(e);
  if (!c) return;
  pixeles[c.y][c.x] = borrando ? null : inputColor.value;
  dibujar();
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pintando = true;
  pintarEn(e);
});
canvas.addEventListener("pointermove", (e) => { if (pintando) pintarEn(e); });
canvas.addEventListener("pointerup", () => { pintando = false; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

btnBorrador.onclick = () => {
  borrando = !borrando;
  btnBorrador.classList.toggle("activa-tool", borrando);
};
inputSize.onchange = redimensionar;
btnLimpiar.onclick = () => { pixeles = crearGrid(tam); dibujar(); };

btnUsar.onclick = () => {
  const out = document.createElement("canvas");
  out.width = tam;
  out.height = tam;
  const octx = out.getContext("2d");
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      if (pixeles[y][x]) { octx.fillStyle = pixeles[y][x]; octx.fillRect(x, y, 1, 1); }
    }
  }
  const img = new Image();
  img.onload = () => onUsarCb(img);
  img.src = out.toDataURL("image/png");
};

export function abrirPixelArt() {
  panel.classList.remove("oculto");
  redimensionar();
}
export function cerrarPixelArt() {
  panel.classList.add("oculto");
}
