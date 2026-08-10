// --- Mini editor de píxel a píxel para pintar una capa a mano ---
// Reimplementado a partir de tools/level-editor/js/pixelart.js, ampliado con
// más herramientas al estilo Aseprite (relleno, formas, cuentagotas,
// deshacer/rehacer, simetría) -- sigue sin compartir código con el
// level-editor a propósito, ver plan de la sesión.
const ZOOM = 10;

const panel = document.getElementById("pixelart-panel-me");
const canvas = document.getElementById("pixelart-canvas-me");
const ctx = canvas.getContext("2d");
const inputColor = document.getElementById("pixelart-color-me");
const inputSize = document.getElementById("pixelart-size-me");
const btnLimpiar = document.getElementById("btn-pixelart-limpiar-me");
const btnUsar = document.getElementById("btn-pixelart-usar-me");
const chkRelleno = document.getElementById("pixelart-relleno-me");
const chkSimetria = document.getElementById("pixelart-simetria-me");
const btnDeshacer = document.getElementById("btn-pixelart-deshacer-me");
const btnRehacer = document.getElementById("btn-pixelart-rehacer-me");
const botonesHerramienta = document.querySelectorAll(".herramienta-pixelart");

let tam = parseInt(inputSize.value) || 32;
let pixeles = crearGrid(tam);
let herramienta = "lapiz"; // lapiz | borrador | cubo | linea | rectangulo | elipse | cuentagotas
let pintando = false;
let inicioForma = null; // {x,y} -- ancla de línea/rectángulo/elipse mientras se arrastra
let previaForma = null; // grid temporal (mismo tamaño que `pixeles`) con la forma en curso, o null
let onUsarCb = () => {};

const historial = [];
let indiceHistorial = -1;
const HISTORIAL_MAX = 40;

export function setOnUsar(cb) { onUsarCb = cb; }

function crearGrid(n) {
  return Array.from({ length: n }, () => new Array(n).fill(null));
}

function clonarGrid(g) {
  return g.map((fila) => fila.slice());
}

// --- Herramientas ---
botonesHerramienta.forEach((btn) => {
  btn.onclick = () => {
    herramienta = btn.dataset.herramienta;
    botonesHerramienta.forEach((b) => b.classList.toggle("activa-tool", b === btn));
  };
});

function redimensionar() {
  tam = Math.max(4, Math.min(64, parseInt(inputSize.value) || 32));
  inputSize.value = tam;
  canvas.width = tam * ZOOM;
  canvas.height = tam * ZOOM;
  pixeles = crearGrid(tam);
  historial.length = 0;
  indiceHistorial = -1;
  guardarHistorial();
  dibujar();
}

function dibujar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const origen = previaForma || pixeles;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      ctx.fillStyle = origen[y][x] || (((x + y) % 2 === 0) ? "#1d1929" : "#26213a");
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
  return { x: Math.max(0, Math.min(tam - 1, x)), y: Math.max(0, Math.min(tam - 1, y)) };
}

// --- Deshacer/rehacer ---
function guardarHistorial() {
  historial.splice(indiceHistorial + 1); // corta el futuro si veníamos de deshacer
  historial.push(clonarGrid(pixeles));
  if (historial.length > HISTORIAL_MAX) historial.shift();
  else indiceHistorial++;
  actualizarBotonesHistorial();
}

function deshacer() {
  if (indiceHistorial <= 0) return;
  indiceHistorial--;
  pixeles = clonarGrid(historial[indiceHistorial]);
  dibujar();
  actualizarBotonesHistorial();
}

function rehacer() {
  if (indiceHistorial >= historial.length - 1) return;
  indiceHistorial++;
  pixeles = clonarGrid(historial[indiceHistorial]);
  dibujar();
  actualizarBotonesHistorial();
}

function actualizarBotonesHistorial() {
  btnDeshacer.disabled = indiceHistorial <= 0;
  btnRehacer.disabled = indiceHistorial >= historial.length - 1;
}

// --- Trazado de formas (Bresenham / punto medio, sin dependencias) ---
function puntosLinea(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  while (true) {
    pts.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return pts;
}

function puntosRectangulo(x0, y0, x1, y1, relleno) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  const pts = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (relleno || x === minX || x === maxX || y === minY || y === maxY) pts.push({ x, y });
    }
  }
  return pts;
}

function puntosElipse(x0, y0, x1, y1, relleno) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const rx = Math.max(1, Math.abs(x1 - x0) / 2), ry = Math.max(1, Math.abs(y1 - y0) / 2);
  const pts = [];
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (relleno ? v <= 1 : Math.abs(v - 1) < 0.28 || (v <= 1 && (x === minX || x === maxX || y === minY || y === maxY))) {
        pts.push({ x, y });
      }
    }
  }
  return pts;
}

// --- Relleno tipo cubo (flood fill 4-direcciones sobre color igual) ---
function rellenoCubo(x0, y0, color) {
  const objetivo = pixeles[y0][x0];
  if (objetivo === color) return;
  const pila = [{ x: x0, y: y0 }];
  const visitado = new Set();
  while (pila.length) {
    const { x, y } = pila.pop();
    if (x < 0 || x >= tam || y < 0 || y >= tam) continue;
    const clave = x + "," + y;
    if (visitado.has(clave)) continue;
    if (pixeles[y][x] !== objetivo) continue;
    visitado.add(clave);
    pixeles[y][x] = color;
    pila.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
}

function pintarPunto(grid, x, y, color) {
  grid[y][x] = color;
  if (chkSimetria.checked) {
    const xEspejo = tam - 1 - x;
    grid[y][xEspejo] = color;
  }
}

// --- Interacción ---
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const c = celdaDesde(e);
  pintando = true;

  if (herramienta === "cuentagotas") {
    if (pixeles[c.y][c.x]) inputColor.value = pixeles[c.y][c.x];
    pintando = false;
    return;
  }
  if (herramienta === "cubo") {
    rellenoCubo(c.x, c.y, inputColor.value);
    dibujar();
    guardarHistorial();
    pintando = false;
    return;
  }
  if (herramienta === "linea" || herramienta === "rectangulo" || herramienta === "elipse") {
    inicioForma = c;
    previaForma = clonarGrid(pixeles);
    return;
  }
  // lápiz / borrador
  pintarPunto(pixeles, c.x, c.y, herramienta === "borrador" ? null : inputColor.value);
  dibujar();
});

canvas.addEventListener("pointermove", (e) => {
  if (!pintando) return;
  const c = celdaDesde(e);

  if (herramienta === "linea" || herramienta === "rectangulo" || herramienta === "elipse") {
    if (!inicioForma) return;
    previaForma = clonarGrid(pixeles);
    const pts = herramienta === "linea" ? puntosLinea(inicioForma.x, inicioForma.y, c.x, c.y)
      : herramienta === "rectangulo" ? puntosRectangulo(inicioForma.x, inicioForma.y, c.x, c.y, chkRelleno.checked)
        : puntosElipse(inicioForma.x, inicioForma.y, c.x, c.y, chkRelleno.checked);
    for (const p of pts) pintarPunto(previaForma, p.x, p.y, inputColor.value);
    dibujar();
    return;
  }
  if (herramienta === "lapiz" || herramienta === "borrador") {
    pintarPunto(pixeles, c.x, c.y, herramienta === "borrador" ? null : inputColor.value);
    dibujar();
  }
});

canvas.addEventListener("pointerup", (e) => {
  if (!pintando) return;
  pintando = false;

  if ((herramienta === "linea" || herramienta === "rectangulo" || herramienta === "elipse") && inicioForma) {
    const c = celdaDesde(e);
    const pts = herramienta === "linea" ? puntosLinea(inicioForma.x, inicioForma.y, c.x, c.y)
      : herramienta === "rectangulo" ? puntosRectangulo(inicioForma.x, inicioForma.y, c.x, c.y, chkRelleno.checked)
        : puntosElipse(inicioForma.x, inicioForma.y, c.x, c.y, chkRelleno.checked);
    for (const p of pts) pintarPunto(pixeles, p.x, p.y, inputColor.value);
    inicioForma = null;
    previaForma = null;
    dibujar();
  }
  guardarHistorial();
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("keydown", (e) => {
  if (panel.classList.contains("oculto")) return;
  if (document.activeElement && (document.activeElement.tagName === "INPUT")) return;
  if (e.ctrlKey && e.key === "z") { e.preventDefault(); deshacer(); }
  if (e.ctrlKey && e.key === "y") { e.preventDefault(); rehacer(); }
});

inputSize.onchange = redimensionar;
btnLimpiar.onclick = () => { pixeles = crearGrid(tam); dibujar(); guardarHistorial(); };
btnDeshacer.onclick = deshacer;
btnRehacer.onclick = rehacer;

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
