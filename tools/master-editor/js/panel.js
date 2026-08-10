// --- UI principal de la pestaña "Sprites" ---
import { REGISTRO_ASSETS } from "./registro-assets.js";
import {
  CAPAS_CON_TIER, ANCLAS_CUERPO, estado, personajeActivo, crearPersonaje, borrarPersonaje,
  asignarCapa, ajustarTransformCapa, resetearTransformCapa, establecerAncla, establecerAnclaCuerpo,
  piezaParaTier, cargarLocal, exportarJSON,
} from "./personajes.js";
import { cargarImagenPicker, limpiarPicker, onSeleccion, setModoAncla, mostrarAncla } from "./picker.js";
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
const notaTier = document.getElementById("nota-tier-me");
const btnExportarJSON = document.getElementById("btn-exportar-json-me");
const btnBorrarPersonaje = document.getElementById("btn-borrar-personaje-me");
const btnEscalaMenos = document.getElementById("btn-escala-menos-me");
const btnEscalaMas = document.getElementById("btn-escala-mas-me");
const btnEscalaReset = document.getElementById("btn-escala-reset-me");
const btnMarcarAncla = document.getElementById("btn-marcar-ancla-me");
const selectAnclaCuerpo = document.getElementById("select-ancla-cuerpo-me");

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
    // Precarga cuerpo/arma (tier Común) tal cual desde el registro -- el
    // usuario puede recortar/repintar encima después, es solo un punto de
    // partida.
    if (r.cuerpoSrc) precargarCapaDesdeUrl(p.id, "cuerpo", 0, r.cuerpoSrc);
    if (r.armaSrc) precargarCapaDesdeUrl(p.id, "arma", 0, r.armaSrc);
    refrescarTodo();
  });
}

function precargarCapaDesdeUrl(idPersonaje, capa, tier, url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    asignarCapa(idPersonaje, capa, tier, { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight });
    refrescarTodo();
  };
  img.onerror = () => console.warn("No se pudo precargar " + url + " (¿el editor no se está sirviendo desde el mismo origen que el juego?)");
  img.src = url;
}

// --- Capa activa ---
function construirTabsCapa() {
  filaCapas.querySelectorAll(".tab-capa").forEach((btn) => {
    btn.classList.toggle("activa", btn.dataset.capa === estado.capaActiva);
    btn.onclick = () => { estado.capaActiva = btn.dataset.capa; refrescarEditorCapa(); refrescarComposicion(); };
  });
}

function refrescarEditorCapa() {
  const p = personajeActivo();
  cerrarPixelArt();
  setModoAncla(false);
  const esCuerpo = estado.capaActiva === "cuerpo";
  const conTier = CAPAS_CON_TIER.includes(estado.capaActiva);
  selectRareza.disabled = !conTier;
  selectAnclaCuerpo.classList.toggle("oculto", !esCuerpo);
  if (!p) { limpiarPicker(); notaTier.textContent = ""; return; }
  const { pieza, esFallback } = piezaParaTier(p, estado.capaActiva, estado.tierActivo);
  if (pieza) {
    cargarImagenPicker(pieza.src);
    const ancla = esCuerpo ? p.capas.cuerpo.anclas[selectAnclaCuerpo.value] : p.capas[estado.capaActiva].ancla;
    // mostrarAncla() dibuja sobre el picker en cuanto la imagen cargue; como
    // cargarImagenPicker es async, este valor puede llegar antes de que haya
    // canvas -- picker.js simplemente lo recuerda para el próximo dibujar().
    mostrarAncla(ancla || null);
  } else {
    limpiarPicker();
  }
  notaTier.textContent = esCuerpo
    ? "El cuerpo no tiene tiers: es la referencia fija. Marca aquí los 4 puntos de enganche (cabeza/torso/cadera/mano)."
    : esFallback
      ? `Este tier no tiene pieza propia: se ve el recoloreado automático de "Común". Usa el picker o pinta a mano para asignarle una pieza propia.`
      : `Editando la pieza propia de "${RAREZAS[estado.tierActivo].n}".`;
}

onSeleccion((region) => {
  const p = personajeActivo();
  if (!p) return;
  asignarCapa(p.id, estado.capaActiva, estado.tierActivo, region);
  refrescarEditorCapa();
  refrescarComposicion();
  construirListas();
});

setOnUsar((img) => {
  const p = personajeActivo();
  if (!p) return;
  asignarCapa(p.id, estado.capaActiva, estado.tierActivo, { img, sx: 0, sy: 0, sw: img.width, sh: img.height });
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
  asignarCapa(p.id, estado.capaActiva, estado.tierActivo, null);
  refrescarEditorCapa();
  refrescarComposicion();
  construirListas();
};

// --- Marcar anclaje: el siguiente clic en el picker coloca el punto ---
for (const a of ANCLAS_CUERPO) {
  // Las <option> ya están fijas en el HTML (mismo orden que ANCLAS_CUERPO);
  // esto solo confirma que no se han desincronizado si alguien las toca.
  if (!selectAnclaCuerpo.querySelector(`option[value="${a}"]`)) {
    console.warn("Falta <option> para el anclaje de cuerpo: " + a);
  }
}
selectAnclaCuerpo.onchange = refrescarEditorCapa;

btnMarcarAncla.onclick = () => {
  const p = personajeActivo();
  if (!p) return;
  const esCuerpo = estado.capaActiva === "cuerpo";
  setModoAncla(true, (punto) => {
    if (esCuerpo) establecerAnclaCuerpo(p.id, selectAnclaCuerpo.value, punto);
    else establecerAncla(p.id, estado.capaActiva, punto);
    refrescarComposicion();
  });
};

// --- Selector de tier (vista previa Y objetivo de edición para picker/pixelart) ---
for (const r of RAREZAS) {
  const opt = document.createElement("option");
  opt.value = RAREZAS.indexOf(r);
  opt.textContent = r.n;
  selectRareza.appendChild(opt);
}
selectRareza.onchange = () => {
  estado.tierActivo = parseInt(selectRareza.value) || 0;
  refrescarEditorCapa();
  refrescarComposicion();
};

// --- Vista previa: arrastrar mueve, rueda/botones escalan la capa seleccionada ---
function refrescarComposicion() {
  dibujarComposicion(canvasCompositor, personajeActivo(), estado.tierActivo, estado.capaActiva);
}

let arrastreCompositor = null; // {x0,y0, offsetInicial}

function capaTransformable() {
  const p = personajeActivo();
  if (!p || estado.capaActiva === "cuerpo") return null;
  return p.capas[estado.capaActiva];
}

canvasCompositor.addEventListener("pointerdown", (e) => {
  const capa = capaTransformable();
  if (!capa) return;
  canvasCompositor.setPointerCapture(e.pointerId);
  const rect = canvasCompositor.getBoundingClientRect();
  arrastreCompositor = {
    x0: (e.clientX - rect.left) * (canvasCompositor.width / rect.width),
    y0: (e.clientY - rect.top) * (canvasCompositor.height / rect.height),
    offsetInicial: { ...capa.offset },
  };
});

canvasCompositor.addEventListener("pointermove", (e) => {
  if (!arrastreCompositor) return;
  const p = personajeActivo();
  const rect = canvasCompositor.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvasCompositor.width / rect.width);
  const y = (e.clientY - rect.top) * (canvasCompositor.height / rect.height);
  const dx = x - arrastreCompositor.x0, dy = y - arrastreCompositor.y0;
  ajustarTransformCapa(p.id, estado.capaActiva, {
    offset: { x: arrastreCompositor.offsetInicial.x + dx, y: arrastreCompositor.offsetInicial.y + dy },
  });
  refrescarComposicion();
});

canvasCompositor.addEventListener("pointerup", () => { arrastreCompositor = null; });

canvasCompositor.addEventListener("wheel", (e) => {
  const capa = capaTransformable();
  if (!capa) return;
  e.preventDefault();
  cambiarEscala(e.deltaY < 0 ? 0.1 : -0.1);
}, { passive: false });

function cambiarEscala(delta) {
  const p = personajeActivo();
  const capa = capaTransformable();
  if (!p || !capa) return;
  const nueva = Math.max(0.2, Math.min(4, capa.escala + delta));
  ajustarTransformCapa(p.id, estado.capaActiva, { escala: nueva });
  refrescarComposicion();
}

btnEscalaMas.onclick = () => cambiarEscala(0.1);
btnEscalaMenos.onclick = () => cambiarEscala(-0.1);
btnEscalaReset.onclick = () => {
  const p = personajeActivo();
  if (!p || estado.capaActiva === "cuerpo") return;
  resetearTransformCapa(p.id, estado.capaActiva);
  refrescarComposicion();
};

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
