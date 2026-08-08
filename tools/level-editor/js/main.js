// --- Punto de entrada: inicialización y wiring de módulos ---
import { cargarAssets } from "./config.js";
import { dibujar } from "./render.js";
import { construirPaleta, construirListaSalas, setOnCambio as setOnCambioUI } from "./ui.js";
import { setOnCambio as setOnCambioPicker } from "./picker.js";
import { inicializarInteracciones } from "./canvas-interactions.js";
import { inicializarIO } from "./io.js";
import { cargarLocal, programarGuardado } from "./autosave.js";

const cv = document.getElementById("lienzo");
const cx = cv.getContext("2d");

function redibujar() {
  dibujar(cv, cx);
  programarGuardado();
}

// Restaurar autoguardado (si existe) antes de construir la UI, para que la
// primera pintura ya muestre las salas/pinceles recuperados.
const huboAutoguardado = cargarLocal();

setOnCambioUI(redibujar);
setOnCambioPicker(redibujar);

inicializarInteracciones(cv, redibujar);
inicializarIO(redibujar);

// --- Zoom del lienzo (escala visual vía CSS; la resolución interna no cambia) ---
// ZOOM_MIN bajo a propósito: el lienzo mide 1600px de ancho internamente y en un móvil
// en vertical (~360-430px) hace falta poder bajar mucho la escala para verlo entero.
const ZOOM_MIN = 0.2, ZOOM_MAX = 3, ZOOM_PASO = 0.25;
let zoom = 1;

function aplicarZoom() {
  cv.style.width = (cv.width * zoom) + "px";
  cv.style.height = (cv.height * zoom) + "px";
  document.getElementById("btn-zoom-reset").textContent = Math.round(zoom * 100) + "%";
}

document.getElementById("btn-zoom-in").onclick = () => {
  zoom = Math.min(ZOOM_MAX, zoom + ZOOM_PASO);
  aplicarZoom();
};
document.getElementById("btn-zoom-out").onclick = () => {
  zoom = Math.max(ZOOM_MIN, zoom - ZOOM_PASO);
  aplicarZoom();
};
document.getElementById("btn-zoom-reset").onclick = () => {
  zoom = 1;
  aplicarZoom();
};

// Autoajuste inicial: si la ventana es más estrecha que el lienzo, arranca ya escalado
// para que se vea entero de un vistazo (el usuario puede hacer zoom manual después).
zoom = Math.max(ZOOM_MIN, Math.min(1, (window.innerWidth - 40) / cv.width));
aplicarZoom();

cargarAssets(() => { redibujar(); construirPaleta(); });

construirListaSalas();
construirPaleta();
redibujar();

if (huboAutoguardado) {
  document.getElementById("copiaEstado").textContent = "♻️ Sesión recuperada desde autoguardado.";
}
