// --- Selector de recorte para la capa activa (cuerpo/arma/casco/peto/piernas) ---
// Versión reimplementada, no compartida con tools/level-editor/js/picker.js a
// propósito (ver plan de la sesión): evita arriesgar esa herramienta ya en uso.
// Más simple que la del level-editor porque aquí se trabaja sobre UNA imagen
// cargada por capa, no un desplegable de spritesheets fijos del juego:
//   - Clic simple  -> usa la imagen entera tal cual (caso común: ya viene recortada).
//   - Arrastrar     -> selección libre píxel a píxel de una región, tamaño real
//                      conservado (sin forzar a un cuadrado).
const canvas = document.getElementById("picker-canvas-me");
const ctx = canvas.getContext("2d");
const btnZoomIn = document.getElementById("btn-zoom-in-me");
const btnZoomOut = document.getElementById("btn-zoom-out-me");
const btnZoomReset = document.getElementById("btn-zoom-reset-me");

let imagenActual = null;
let onSeleccionCb = () => {};
let clicInicio = null;
let arrastreLibre = null;
let zoom = 1;
const UMBRAL_ARRASTRE = 3;
const ZOOM_MIN = 0.5, ZOOM_MAX = 8, ZOOM_PASO = 0.5;

export function onSeleccion(cb) { onSeleccionCb = cb; }

export function cargarImagenPicker(src) {
  const img = new Image();
  img.onload = () => {
    imagenActual = img;
    zoom = 1;
    dibujar();
  };
  img.onerror = () => console.warn("No se pudo cargar la imagen: " + src);
  img.src = src;
}

export function limpiarPicker() {
  imagenActual = null;
  canvas.width = 0;
  canvas.height = 0;
}

function aplicarZoom() {
  if (!imagenActual) return;
  canvas.style.width = (imagenActual.naturalWidth * zoom) + "px";
  canvas.style.height = (imagenActual.naturalHeight * zoom) + "px";
  btnZoomReset.textContent = Math.round(zoom * 100) + "%";
}
btnZoomIn.onclick = () => { zoom = Math.min(ZOOM_MAX, zoom + ZOOM_PASO); aplicarZoom(); };
btnZoomOut.onclick = () => { zoom = Math.max(ZOOM_MIN, zoom - ZOOM_PASO); aplicarZoom(); };
btnZoomReset.onclick = () => { zoom = 1; aplicarZoom(); };

function dibujar() {
  if (!imagenActual) return;
  canvas.width = imagenActual.naturalWidth;
  canvas.height = imagenActual.naturalHeight;
  aplicarZoom();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imagenActual, 0, 0);
  if (arrastreLibre) {
    const { rx, ry, rw, rh } = rectoDeArrastre(arrastreLibre);
    ctx.strokeStyle = "#e9b45c";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.fillStyle = "rgba(233,180,92,0.2)";
    ctx.fillRect(rx, ry, rw, rh);
  }
}

function rectoDeArrastre(a) {
  const x0 = Math.min(a.x0, a.x1), y0 = Math.min(a.y0, a.y1);
  const rw = Math.max(1, Math.abs(a.x1 - a.x0));
  const rh = Math.max(1, Math.abs(a.y1 - a.y0));
  return { rx: x0, ry: y0, rw, rh };
}

function posicionEnImagen(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / (rect.width / canvas.width));
  const y = Math.floor((e.clientY - rect.top) / (rect.height / canvas.height));
  return {
    x: Math.max(0, Math.min(canvas.width - 1, x)),
    y: Math.max(0, Math.min(canvas.height - 1, y)),
  };
}

canvas.addEventListener("pointerdown", (e) => {
  if (!imagenActual) return;
  canvas.setPointerCapture(e.pointerId);
  clicInicio = posicionEnImagen(e);
  arrastreLibre = null;
});

canvas.addEventListener("pointermove", (e) => {
  if (!clicInicio) return;
  const pos = posicionEnImagen(e);
  if (!arrastreLibre) {
    if (Math.hypot(pos.x - clicInicio.x, pos.y - clicInicio.y) < UMBRAL_ARRASTRE) return;
    arrastreLibre = { x0: clicInicio.x, y0: clicInicio.y, x1: pos.x, y1: pos.y };
  } else {
    arrastreLibre.x1 = pos.x;
    arrastreLibre.y1 = pos.y;
  }
  dibujar();
});

canvas.addEventListener("pointerup", () => {
  if (!imagenActual || !clicInicio) { clicInicio = null; arrastreLibre = null; return; }
  if (arrastreLibre) {
    const { rx, ry, rw, rh } = rectoDeArrastre(arrastreLibre);
    onSeleccionCb({ img: imagenActual, sx: rx, sy: ry, sw: rw, sh: rh });
  } else {
    onSeleccionCb({ img: imagenActual, sx: 0, sy: 0, sw: imagenActual.naturalWidth, sh: imagenActual.naturalHeight });
  }
  clicInicio = null;
  arrastreLibre = null;
  dibujar();
});
