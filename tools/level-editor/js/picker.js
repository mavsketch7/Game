// --- Selector Visual de Tiles (Picker Modal) ---
// Clic normal: selecciona una celda alineada a la grid configurada (comportamiento clásico).
// Alt + arrastrar: selección libre pixel a pixel, sin alinear a la grid, con un tamaño
// máximo de TAM_MAX_RECORTE x TAM_MAX_RECORTE (el tamaño con el que se dibuja cada tile).
import { ASSETS, TAM_MAX_RECORTE } from "./config.js";
import { construirPaleta } from "./ui.js";
import { abrirPixelArt, cerrarPixelArt, setOnUsar as setOnUsarPixelArt } from "./pixelart.js";

let onCambio = () => {};
export function setOnCambio(fn) { onCambio = fn; }

const pickerUI = document.getElementById("picker-modal");
const canvasPicker = document.getElementById("picker-canvas");
const ctxPicker = canvasPicker.getContext("2d");
const inputGridSize = document.getElementById("picker-grid-size");
const selectImage = document.getElementById("picker-img-select");
const btnCargar = document.getElementById("btn-picker-cargar");
const inputArchivo = document.getElementById("picker-file-input");
const btnAjustar = document.getElementById("btn-picker-ajustar");
const inputResizeW = document.getElementById("picker-resize-w");
const inputResizeH = document.getElementById("picker-resize-h");
const btnPixelArt = document.getElementById("btn-picker-pixelart");
const btnAnimModo = document.getElementById("btn-picker-animacion");
const panelAnim = document.getElementById("animacion-panel");
const contFrames = document.getElementById("animacion-frames");
const inputFps = document.getElementById("animacion-fps");
const btnAnimVaciar = document.getElementById("btn-animacion-vaciar");
const btnAnimGuardar = document.getElementById("btn-animacion-guardar");

let tipoEditando = null;
let activePickerImg = null;
let arrastreLibre = null; // {x0, y0, x1, y1} en px de imagen, en cuanto el gesto se reconoce como arrastre
let clicInicio = null; // pos (px de imagen) del pointerdown, hasta que se sepa si es clic o arrastre

// A partir de este desplazamiento (px de imagen) un gesto deja de considerarse
// "clic" (celda alineada a rejilla) y pasa a "arrastre" (selección libre).
const UMBRAL_ARRASTRE = 3;

// Modo animación: mientras está activo, un clic en la rejilla o confirmar un arrastre
// libre AÑADE un frame a esta lista (normalizado a TAM_MAX_RECORTE x TAM_MAX_RECORTE,
// igual que el resto de recortes) en vez de asignar el pincel y cerrar el modal. Solo
// para el editor -- no se exporta al JSON del motor, ver docs/LEVEL_FORMAT.md.
let modoAnimacion = false;
let framesAnimacion = [];

// Imágenes cargadas por el usuario (PNG/JPG/WebP propios), aparte de las de ASSETS.
// Clave -> HTMLImageElement. Se guardan aquí (no en ASSETS/ASSETS_PATHS) porque no
// tienen una ruta fija en el proyecto: viven como data URL en memoria/localStorage.
export const imagenesCustom = {};

function obtenerImagen(key) {
  return ASSETS[key] || imagenesCustom[key];
}

function agregarImagenCustom(key, label, img) {
  imagenesCustom[key] = img;
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = label;
  selectImage.appendChild(opt);
  selectImage.value = key;
  activePickerImg = img;
  dibujarCanvasPicker();
}

// Permite registrar de antemano (p. ej. al restaurar el autoguardado) una imagen
// custom para que aparezca en el desplegable sin tener que volver a cargarla.
export function registrarImagenCustom(key, label, img) {
  if (imagenesCustom[key]) return;
  imagenesCustom[key] = img;
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = label;
  selectImage.appendChild(opt);
}

function dibujarCanvasPicker() {
  if (!activePickerImg || !activePickerImg.complete) return;

  canvasPicker.width = activePickerImg.naturalWidth;
  canvasPicker.height = activePickerImg.naturalHeight;
  ctxPicker.drawImage(activePickerImg, 0, 0);

  const gridSize = parseInt(inputGridSize.value) || 32;
  ctxPicker.strokeStyle = "rgba(255, 255, 0, 0.4)";
  ctxPicker.lineWidth = 1;

  for (let x = 0; x <= canvasPicker.width; x += gridSize) {
    ctxPicker.beginPath(); ctxPicker.moveTo(x, 0); ctxPicker.lineTo(x, canvasPicker.height); ctxPicker.stroke();
  }
  for (let y = 0; y <= canvasPicker.height; y += gridSize) {
    ctxPicker.beginPath(); ctxPicker.moveTo(0, y); ctxPicker.lineTo(canvasPicker.width, y); ctxPicker.stroke();
  }

  if (arrastreLibre) {
    const { rx, ry, rw, rh } = rectoDeArrastre(arrastreLibre);
    ctxPicker.strokeStyle = "#e9b45c";
    ctxPicker.lineWidth = 2;
    ctxPicker.strokeRect(rx, ry, rw, rh);
    ctxPicker.fillStyle = "rgba(233,180,92,0.2)";
    ctxPicker.fillRect(rx, ry, rw, rh);
  }
}

// Convierte el arrastre libre en un rectángulo {rx, ry, rw, rh}. Sin límite de tamaño
// aquí (el rango de selección es libre): el reencuadre a TAM_MAX_RECORTE se aplica al
// soltar el ratón (ver el listener de "mouseup" más abajo), no durante el arrastre.
function rectoDeArrastre(a) {
  const x0 = Math.min(a.x0, a.x1), y0 = Math.min(a.y0, a.y1);
  const rw = Math.max(1, Math.abs(a.x1 - a.x0));
  const rh = Math.max(1, Math.abs(a.y1 - a.y0));
  return { rx: x0, ry: y0, rw, rh };
}

function posicionEnImagen(e) {
  const rect = canvasPicker.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / (rect.width / canvasPicker.width));
  const y = Math.floor((e.clientY - rect.top) / (rect.height / canvasPicker.height));
  return {
    x: Math.max(0, Math.min(canvasPicker.width - 1, x)),
    y: Math.max(0, Math.min(canvasPicker.height - 1, y)),
  };
}

export function abrirPicker(tipo) {
  tipoEditando = tipo;
  arrastreLibre = null;
  cerrarPixelArt();
  modoAnimacion = false;
  framesAnimacion = [];
  btnAnimModo.classList.remove("activa-tool");
  panelAnim.classList.add("oculto");
  contFrames.innerHTML = "";
  pickerUI.classList.remove("oculto");

  // Auto-seleccionar el select basado en la imagen actual del tipo (si existe),
  // buscando primero entre los assets base y luego entre los custom cargados.
  let foundKey = null;
  if (tipo.img) {
    for (const [key, img] of Object.entries(ASSETS)) {
      if (img === tipo.img) { foundKey = key; break; }
    }
    if (!foundKey) {
      for (const [key, img] of Object.entries(imagenesCustom)) {
        if (img === tipo.img) { foundKey = key; break; }
      }
    }
  }
  foundKey = foundKey || "suelo1";

  if (selectImage.querySelector(`option[value="${foundKey}"]`)) {
    selectImage.value = foundKey;
  }
  activePickerImg = obtenerImagen(foundKey) || obtenerImagen("suelo1");

  dibujarCanvasPicker();
}

selectImage.onchange = (e) => {
  activePickerImg = obtenerImagen(e.target.value);
  dibujarCanvasPicker();
};
inputGridSize.onchange = dibujarCanvasPicker;

// --- Cargar imagen propia ---
btnCargar.onclick = () => inputArchivo.click();

inputArchivo.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const lector = new FileReader();
  lector.onload = () => {
    const img = new Image();
    img.onload = () => agregarImagenCustom("custom_" + Date.now(), "📁 " + file.name, img);
    img.onerror = () => console.warn("No se pudo leer la imagen: " + file.name);
    img.src = lector.result;
  };
  lector.readAsDataURL(file);
  inputArchivo.value = ""; // permite volver a elegir el mismo archivo si se cancela
};

// Reencuadra `origen` (imagen completa o una región rx,ry,rw,rh de ella) dentro de un
// lienzo de anchoDestino×altoDestino conservando proporción ("contain", con márgenes
// transparentes si no encaja exacto). Devuelve un <canvas>.
function reencuadrar(origen, anchoDestino, altoDestino, region) {
  const rx = region ? region.rx : 0, ry = region ? region.ry : 0;
  const rw = region ? region.rw : origen.naturalWidth, rh = region ? region.rh : origen.naturalHeight;

  const tmp = document.createElement("canvas");
  tmp.width = anchoDestino;
  tmp.height = altoDestino;
  const tctx = tmp.getContext("2d");
  const escala = Math.min(anchoDestino / rw, altoDestino / rh);
  const w = rw * escala, h = rh * escala;
  tctx.drawImage(origen, rx, ry, rw, rh, (anchoDestino - w) / 2, (altoDestino - h) / 2, w, h);
  return tmp;
}

// --- Redimensionar la imagen actual al ancho/alto que el usuario escriba a mano ---
btnAjustar.onclick = () => {
  if (!activePickerImg || !activePickerImg.complete) return;
  const w = Math.max(1, Math.min(256, parseInt(inputResizeW.value) || 32));
  const h = Math.max(1, Math.min(256, parseInt(inputResizeH.value) || 32));
  inputResizeW.value = w; inputResizeH.value = h;

  const img = new Image();
  img.onload = () => agregarImagenCustom("custom_" + Date.now(), `📐 Ajustada ${w}×${h}`, img);
  img.src = reencuadrar(activePickerImg, w, h).toDataURL("image/png");
};

// --- Editor de píxel a píxel ---
btnPixelArt.onclick = () => abrirPixelArt();
setOnUsarPixelArt((img, tam) => {
  agregarImagenCustom("custom_" + Date.now(), `🖍️ Dibujo ${tam}×${tam}`, img);
  cerrarPixelArt();
});

// --- Modo animación ---
btnAnimModo.onclick = () => {
  modoAnimacion = !modoAnimacion;
  btnAnimModo.classList.toggle("activa-tool", modoAnimacion);
  panelAnim.classList.toggle("oculto", !modoAnimacion);
};

function dibujarFramesAnimacion() {
  contFrames.innerHTML = "";
  framesAnimacion.forEach((img, i) => {
    const div = document.createElement("div");
    div.className = "frame-thumb";
    div.style.backgroundImage = `url('${img.src}')`;
    div.innerHTML = `<span class="frame-num">${i + 1}</span><button class="frame-quitar" title="Quitar frame">✕</button>`;
    div.querySelector(".frame-quitar").onclick = () => {
      framesAnimacion.splice(i, 1);
      dibujarFramesAnimacion();
    };
    contFrames.appendChild(div);
  });
}

// Recorta `origen` (imagen completa o región) y lo añade como un frame más de la
// animación en curso -- reutiliza reencuadrar() para que todos los frames midan
// exactamente TAM_MAX_RECORTE x TAM_MAX_RECORTE, igual que un recorte normal.
function agregarFrameAnimacion(origen, region) {
  const img = new Image();
  img.onload = () => {
    framesAnimacion.push(img);
    dibujarFramesAnimacion();
  };
  img.src = reencuadrar(origen, TAM_MAX_RECORTE, TAM_MAX_RECORTE, region).toDataURL("image/png");
}

btnAnimVaciar.onclick = () => { framesAnimacion = []; dibujarFramesAnimacion(); };

btnAnimGuardar.onclick = () => {
  if (!tipoEditando || framesAnimacion.length < 1) return;

  tipoEditando.frames = framesAnimacion.slice();
  tipoEditando.fps = Math.max(1, Math.min(30, parseInt(inputFps.value) || 6));
  tipoEditando.img = framesAnimacion[0];
  tipoEditando.sx = 0;
  tipoEditando.sy = 0;
  tipoEditando.sw = TAM_MAX_RECORTE;
  tipoEditando.sh = TAM_MAX_RECORTE;

  framesAnimacion = [];
  dibujarFramesAnimacion();
  modoAnimacion = false;
  btnAnimModo.classList.remove("activa-tool");
  panelAnim.classList.add("oculto");

  pickerUI.classList.add("oculto");
  construirPaleta();
  onCambio();
};

// Asigna (o, en modo animación, añade como frame) una región exacta de la imagen
// activa -- sx/sy/sw/sh se guardan tal cual, en su tamaño real de píxeles, SIN
// normalizar a un cuadrado: el que un recorte sea alto/estrecho o ancho/bajo
// (un arma, una puerta, un enemigo grande...) es información real que hay que
// conservar, no un defecto a corregir -- dibujarConProporcion() en render.js se
// encarga de encajarlo en la celda sin deformarlo.
function aplicarRegion(region) {
  if (modoAnimacion) {
    agregarFrameAnimacion(activePickerImg, region);
    return;
  }
  tipoEditando.img = activePickerImg;
  tipoEditando.sx = region.rx;
  tipoEditando.sy = region.ry;
  tipoEditando.sw = region.rw;
  tipoEditando.sh = region.rh;

  pickerUI.classList.add("oculto");
  construirPaleta();
  onCambio();
}

canvasPicker.addEventListener("pointerdown", (e) => {
  if (!tipoEditando || !activePickerImg) return;
  canvasPicker.setPointerCapture(e.pointerId);
  // No se decide todavía si es un clic (celda de rejilla) o un arrastre
  // (selección libre píxel a píxel) -- eso se sabe en el primer pointermove
  // que supere UMBRAL_ARRASTRE, o en pointerup si nunca lo superó.
  clicInicio = posicionEnImagen(e);
  arrastreLibre = null;
});

canvasPicker.addEventListener("pointermove", (e) => {
  if (!clicInicio) return;
  const pos = posicionEnImagen(e);
  if (!arrastreLibre) {
    if (Math.hypot(pos.x - clicInicio.x, pos.y - clicInicio.y) < UMBRAL_ARRASTRE) return;
    arrastreLibre = { x0: clicInicio.x, y0: clicInicio.y, x1: pos.x, y1: pos.y };
  } else {
    arrastreLibre.x1 = pos.x;
    arrastreLibre.y1 = pos.y;
  }
  dibujarCanvasPicker();
});

canvasPicker.addEventListener("pointerup", () => {
  if (!tipoEditando || !clicInicio) { clicInicio = null; arrastreLibre = null; return; }

  if (arrastreLibre) {
    // Arrastre: selección libre, tamaño real conservado (ver aplicarRegion arriba).
    aplicarRegion(rectoDeArrastre(arrastreLibre));
  } else {
    // Sin arrastre: clic simple = una celda alineada a la rejilla configurada,
    // el atajo rápido de siempre para spritesheets con grid regular.
    const gridSize = parseInt(inputGridSize.value) || 32;
    const sx = Math.floor(clicInicio.x / gridSize) * gridSize;
    const sy = Math.floor(clicInicio.y / gridSize) * gridSize;
    aplicarRegion({ rx: sx, ry: sy, rw: gridSize, rh: gridSize });
  }
  clicInicio = null;
  arrastreLibre = null;
});

document.getElementById("btn-cerrar-picker").onclick = () => {
  arrastreLibre = null;
  pickerUI.classList.add("oculto");
  cerrarPixelArt();
};
