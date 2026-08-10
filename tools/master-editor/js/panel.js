// --- UI principal de la pestaña "Sprites" ---
import { REGISTRO_ASSETS } from "./registro-assets.js";
import { CAPAS, estado, personajeActivo, crearPersonaje, borrarPersonaje, asignarCapa, cargarLocal, exportarJSON } from "./personajes.js";
import { cargarImagenPicker, limpiarPicker, onSeleccion } from "./picker.js";
import { abrirPixelArt, cerrarPixelArt, setOnUsar } from "./pixelart.js";
import { dibujarComposicion, RAREZAS } from "./compositor.js";

const listaRegistro = document.getElementById("lista-registro");
const listaCreados = document.getElementById("lista-creados");
const btnNuevoPersonaje = document.getElementById("btn-nuevo-personaje");
const nombrePersonajeActivo = document.getElementById("nombre-personaje-activo");
const filaCapas = document.getElementById("fila-capas");
const btnCargarCapa = document.getElementById("btn-cargar-capa");
const inputCargarCapa = document.getElementById("input-cargar-capa");
const btnPixelartCapa = document.getElementById("btn-pixelart-capa");
const btnQuitarCapa = document.getElementById("btn-quitar-capa");
const canvasCompositor = document.getElementById("canvas-compositor");
const selectRareza = document.getElementById("select-rareza-me");
const btnExportarJSON = document.getElementById("btn-exportar-json-me");
const btnBorrarPersonaje = document.getElementById("btn-borrar-personaje-me");

// --- Modal genérico (nombre de personaje nuevo) ---
const modal = document.getElementById("dialog-modal-me");
const modalTitle = document.getElementById("dialog-title-me");
const modalMsg = document.getElementById("dialog-message-me");
const modalInput = document.getElementById("dialog-input-me");
const modalOk = document.getElementById("dialog-ok-me");
const modalCancel = document.getElementById("dialog-cancel-me");

function pedirTexto(titulo, mensaje, valorInicial, cb) {
  modalTitle.textContent = titulo;
  modalMsg.textContent = mensaje || "";
  modalInput.style.display = "block";
  modalInput.value = valorInicial || "";
  modal.classList.remove("oculto");
  modalInput.focus();
  modalInput.select();
  const limpiar = () => { modal.classList.add("oculto"); modalOk.onclick = null; modalCancel.onclick = null; };
  modalOk.onclick = () => { const v = modalInput.value.trim(); limpiar(); if (v) cb(v); };
  modalCancel.onclick = () => limpiar();
}

function confirmar(titulo, mensaje, cb) {
  modalTitle.textContent = titulo;
  modalMsg.textContent = mensaje || "";
  modalInput.style.display = "none";
  modal.classList.remove("oculto");
  const limpiar = () => { modal.classList.add("oculto"); modalOk.onclick = null; modalCancel.onclick = null; };
  modalOk.onclick = () => { limpiar(); cb(true); };
  modalCancel.onclick = () => limpiar();
}

// --- Lista de personajes ---
function construirListas() {
  listaRegistro.innerHTML = "";
  for (const r of REGISTRO_ASSETS) {
    const div = document.createElement("div");
    div.className = "item-personaje";
    div.innerHTML = `<span class="icono-tipo">${r.tipo === "heroe" ? "🧙" : "👹"}</span><span>${r.nombre}</span>`;
    div.title = "Clic: crea una copia editable a partir de este (el registro es de solo lectura)";
    div.onclick = () => clonarDesdeRegistro(r);
    listaRegistro.appendChild(div);
  }

  listaCreados.innerHTML = "";
  for (const p of estado.personajes) {
    const div = document.createElement("div");
    div.className = "item-personaje" + (p.id === estado.activoId ? " activo" : "");
    div.innerHTML = `<span class="icono-tipo">${p.tipo === "heroe" ? "🧙" : p.tipo === "mob" ? "👹" : "🧑"}</span><span>${p.nombre}</span>`;
    div.onclick = () => { estado.activoId = p.id; refrescarTodo(); };
    listaCreados.appendChild(div);
  }
}

function clonarDesdeRegistro(r) {
  pedirTexto("Nuevo personaje desde el registro", `Nombre para la copia editable de "${r.nombre}":`, r.nombre, (nombre) => {
    const p = crearPersonaje(nombre, r.tipo);
    // Precarga cuerpo/arma tal cual desde el registro -- el usuario puede
    // recortar/repintar encima después, es solo un punto de partida.
    if (r.cuerpoSrc) precargarCapaDesdeUrl(p.id, "cuerpo", r.cuerpoSrc);
    if (r.armaSrc) precargarCapaDesdeUrl(p.id, "arma", r.armaSrc);
    refrescarTodo();
  });
}

function precargarCapaDesdeUrl(idPersonaje, capa, url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    asignarCapa(idPersonaje, capa, { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight });
    refrescarTodo();
  };
  img.onerror = () => console.warn("No se pudo precargar " + url + " (¿el editor no se está sirviendo desde el mismo origen que el juego?)");
  img.src = url;
}

// --- Capa activa ---
function construirTabsCapa() {
  filaCapas.querySelectorAll(".tab-capa").forEach((btn) => {
    btn.classList.toggle("activa", btn.dataset.capa === estado.capaActiva);
    btn.onclick = () => { estado.capaActiva = btn.dataset.capa; refrescarEditorCapa(); };
  });
}

function refrescarEditorCapa() {
  const p = personajeActivo();
  cerrarPixelArt();
  if (!p) { limpiarPicker(); return; }
  const datos = p.capas[estado.capaActiva];
  if (datos) cargarImagenPicker(datos.src);
  else limpiarPicker();
}

onSeleccion((region) => {
  const p = personajeActivo();
  if (!p) return;
  asignarCapa(p.id, estado.capaActiva, region);
  refrescarComposicion();
  construirListas();
});

setOnUsar((img) => {
  const p = personajeActivo();
  if (!p) return;
  asignarCapa(p.id, estado.capaActiva, { img, sx: 0, sy: 0, sw: img.width, sh: img.height });
  cerrarPixelArt();
  refrescarEditorCapa();
  refrescarComposicion();
  construirListas();
});

btnCargarCapa.onclick = () => inputCargarCapa.click();
inputCargarCapa.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const lector = new FileReader();
  lector.onload = () => cargarImagenPicker(lector.result);
  lector.readAsDataURL(file);
  inputCargarCapa.value = "";
};

btnPixelartCapa.onclick = () => abrirPixelArt();

btnQuitarCapa.onclick = () => {
  const p = personajeActivo();
  if (!p) return;
  asignarCapa(p.id, estado.capaActiva, null);
  refrescarEditorCapa();
  refrescarComposicion();
  construirListas();
};

// --- Vista previa compuesta ---
for (const r of RAREZAS) {
  const opt = document.createElement("option");
  opt.value = RAREZAS.indexOf(r);
  opt.textContent = r.n;
  selectRareza.appendChild(opt);
}
selectRareza.onchange = refrescarComposicion;

function refrescarComposicion() {
  dibujarComposicion(canvasCompositor, personajeActivo(), parseInt(selectRareza.value) || 0);
}

btnExportarJSON.onclick = () => {
  const p = personajeActivo();
  if (p) exportarJSON(p);
};

btnBorrarPersonaje.onclick = () => {
  const p = personajeActivo();
  if (!p) return;
  confirmar("Borrar personaje", `¿Seguro que quieres borrar "${p.nombre}"? No se puede deshacer.`, () => {
    borrarPersonaje(p.id);
    refrescarTodo();
  });
};

function refrescarTodo() {
  const p = personajeActivo();
  nombrePersonajeActivo.textContent = p ? p.nombre : "Selecciona un personaje";
  construirListas();
  construirTabsCapa();
  refrescarEditorCapa();
  refrescarComposicion();
}

btnNuevoPersonaje.onclick = () => {
  pedirTexto("Nuevo personaje", "Nombre:", "Personaje " + (estado.personajes.length + 1), (nombre) => {
    crearPersonaje(nombre, "heroe");
    refrescarTodo();
  });
};

export function iniciarPanelSprites() {
  cargarLocal();
  refrescarTodo();
}
