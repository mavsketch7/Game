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

let tipoEditando = null;
let activePickerImg = null;
let arrastreLibre = null; // {x0, y0, x1, y1} en px de imagen, mientras se arrastra con Alt

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

canvasPicker.addEventListener("pointerdown", (e) => {
  if (!tipoEditando || !activePickerImg) return;
  canvasPicker.setPointerCapture(e.pointerId);
  const pos = posicionEnImagen(e);

  if (e.altKey) {
    // Inicia selección libre: se confirma al soltar (desktop, con Alt). En táctil no
    // hay tecla Alt, así que en móvil se usa siempre la selección clásica de rejilla.
    arrastreLibre = { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y };
    dibujarCanvasPicker();
    return;
  }

  // Selección clásica alineada a la grid.
  const gridSize = parseInt(inputGridSize.value) || 32;
  tipoEditando.img = activePickerImg;
  tipoEditando.sx = Math.floor(pos.x / gridSize) * gridSize;
  tipoEditando.sy = Math.floor(pos.y / gridSize) * gridSize;
  tipoEditando.sw = TAM_MAX_RECORTE;
  tipoEditando.sh = TAM_MAX_RECORTE;

  pickerUI.classList.add("oculto");
  construirPaleta();
  onCambio();
});

canvasPicker.addEventListener("pointermove", (e) => {
  if (!arrastreLibre) return;
  const pos = posicionEnImagen(e);
  arrastreLibre.x1 = pos.x;
  arrastreLibre.y1 = pos.y;
  dibujarCanvasPicker();
});

canvasPicker.addEventListener("pointerup", () => {
  if (!arrastreLibre || !tipoEditando) { arrastreLibre = null; return; }
  const region = rectoDeArrastre(arrastreLibre);
  arrastreLibre = null;

  // El rango de selección es libre (cualquier tamaño), pero el tile final siempre se
  // reencuadra a TAM_MAX_RECORTE x TAM_MAX_RECORTE conservando proporción, para que
  // el pincel resultante pinte igual de bien que uno recortado con la rejilla clásica.
  const img = new Image();
  img.onload = () => {
    tipoEditando.img = img;
    tipoEditando.sx = 0;
    tipoEditando.sy = 0;
    tipoEditando.sw = TAM_MAX_RECORTE;
    tipoEditando.sh = TAM_MAX_RECORTE;

    pickerUI.classList.add("oculto");
    construirPaleta();
    onCambio();
  };
  img.src = reencuadrar(activePickerImg, TAM_MAX_RECORTE, TAM_MAX_RECORTE, region).toDataURL("image/png");
});

document.getElementById("btn-cerrar-picker").onclick = () => {
  arrastreLibre = null;
  pickerUI.classList.add("oculto");
  cerrarPixelArt();
};
