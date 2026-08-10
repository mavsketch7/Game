// --- UI principal de la pestaña "Sprites" ---
import { REGISTRO_ASSETS } from "./registro-assets.js";
import {
  CAPAS_CON_TIER, ANCLAS_CUERPO, ESTADOS_CUERPO, estado, personajeActivo, crearPersonaje, borrarPersonaje,
  asignarCapa, ajustarTransformCapa, resetearTransformCapa, establecerAncla, establecerAnclaCuerpo,
  piezaParaTier, estadoCuerpo, establecerFramesCuerpo, recortarARegion, cargarLocal, exportarJSON,
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
const filaEstadosCuerpo = document.getElementById("fila-estados-cuerpo-me");
const btnAnimModoCuerpo = document.getElementById("btn-anim-modo-me");
const panelAnimCuerpo = document.getElementById("animacion-panel-me");
const contFramesAnim = document.getElementById("animacion-frames-me");
const inputFpsAnim = document.getElementById("animacion-fps-me");
const btnAnimVaciar = document.getElementById("btn-animacion-vaciar-me");
const btnAnimGuardar = document.getElementById("btn-animacion-guardar-me");
const nombreEstadoAnimSpan = document.getElementById("animacion-estado-nombre-me");

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
    // Precarga arma (tier Común) y los estados de cuerpo que tenga el
    // registro -- el usuario puede recortar/repintar encima después, es
    // solo un punto de partida.
    if (r.armaSrc) precargarCapaDesdeUrl(p.id, "arma", 0, r.armaSrc);
    if (r.cuerpoEstados) {
      for (const estadoAnim of ESTADOS_CUERPO) {
        const url = r.cuerpoEstados[estadoAnim];
        if (url) precargarEstadoCuerpoDesdeUrl(p.id, estadoAnim, url);
      }
    }
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

const FPS_PRECARGA = { idle: 6, run: 10, attack: 12 }; // punto de partida aproximado, editable a mano después

// Trocea una hoja de animación horizontal en frames cuadrados -- mismo
// criterio que cargarHojaFrames() en src/render/sprites.js (frameSize =
// alto de la hoja, frameCount = redondeo(ancho/alto)), sin el realineado
// por bbox alfa de esa función: esto es una vista de diseño de referencia,
// no el render de gameplay real.
function trocearHojaEnFrames(img) {
  const frameSize = img.naturalHeight;
  const frameCount = Math.max(1, Math.round(img.naturalWidth / frameSize));
  const out = [];
  for (let i = 0; i < frameCount; i++) {
    out.push(recortarARegion({ img, sx: i * frameSize, sy: 0, sw: frameSize, sh: frameSize }));
  }
  return out;
}

function precargarEstadoCuerpoDesdeUrl(idPersonaje, estadoAnim, url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    establecerFramesCuerpo(idPersonaje, estadoAnim, trocearHojaEnFrames(img), FPS_PRECARGA[estadoAnim] || 8);
    refrescarTodo();
  };
  img.onerror = () => console.warn("No se pudo precargar " + url + " (¿el editor no se está sirviendo desde el mismo origen que el juego?)");
  img.src = url;
}

// --- Capa activa ---
function construirTabsCapa() {
  const botones = filaCapas.querySelectorAll(".tab-capa");
  botones.forEach((btn) => {
    btn.classList.toggle("activa", btn.dataset.capa === estado.capaActiva);
    // El resaltado se reaplica aquí mismo (no solo al construir la lista):
    // sin esto, el clic cambia la capa activa de verdad pero el botón
    // seleccionado visualmente no se mueve -- detectado al verificar la
    // pestaña de estado nueva con capturas de pantalla, mismo patrón lo
    // arrastraba ya esta lista de pestañas.
    btn.onclick = () => {
      estado.capaActiva = btn.dataset.capa;
      botones.forEach((b) => b.classList.toggle("activa", b === btn));
      refrescarEditorCapa();
      refrescarComposicion();
    };
  });
}

// --- Estado de animación activo (solo aplica a la capa "cuerpo") ---
function construirTabsEstadoCuerpo() {
  const botones = filaEstadosCuerpo.querySelectorAll(".tab-estado");
  botones.forEach((btn) => {
    btn.classList.toggle("activa", btn.dataset.estado === estado.estadoAnimActivo);
    btn.onclick = () => {
      estado.estadoAnimActivo = btn.dataset.estado;
      botones.forEach((b) => b.classList.toggle("activa", b === btn));
      refrescarEditorCapa();
      refrescarComposicion();
    };
  });
}

// --- Modo animación del cuerpo: acumula frames en curso (nunca persistidos
// hasta "Guardar") -- mismo patrón que tools/level-editor/js/picker.js. ---
let modoAnimacionCuerpo = false;
let framesEnCurso = []; // { src, sx, sy, sw, sh }, mismo shape que produce recortarARegion()

function dibujarFramesEnCurso() {
  contFramesAnim.innerHTML = "";
  framesEnCurso.forEach((frame, i) => {
    const div = document.createElement("div");
    div.className = "frame-thumb";
    div.style.backgroundImage = `url('${frame.src}')`;
    div.innerHTML = `<span class="frame-num">${i + 1}</span><button class="frame-quitar" title="Quitar frame">✕</button>`;
    div.querySelector(".frame-quitar").onclick = () => { framesEnCurso.splice(i, 1); dibujarFramesEnCurso(); };
    contFramesAnim.appendChild(div);
  });
}

function agregarFrameEnCurso(region) {
  framesEnCurso.push(recortarARegion(region));
  dibujarFramesEnCurso();
}

function cerrarModoAnimacionCuerpo() {
  modoAnimacionCuerpo = false;
  framesEnCurso = [];
  btnAnimModoCuerpo.classList.remove("activa-tool");
  panelAnimCuerpo.classList.add("oculto");
  dibujarFramesEnCurso();
}

btnAnimModoCuerpo.onclick = () => {
  modoAnimacionCuerpo = !modoAnimacionCuerpo;
  framesEnCurso = [];
  dibujarFramesEnCurso();
  btnAnimModoCuerpo.classList.toggle("activa-tool", modoAnimacionCuerpo);
  panelAnimCuerpo.classList.toggle("oculto", !modoAnimacionCuerpo);
  if (modoAnimacionCuerpo) {
    nombreEstadoAnimSpan.textContent = estado.estadoAnimActivo;
    const p = personajeActivo();
    inputFpsAnim.value = p ? estadoCuerpo(p, estado.estadoAnimActivo).fps : 8;
  }
};

btnAnimVaciar.onclick = () => { framesEnCurso = []; dibujarFramesEnCurso(); };

btnAnimGuardar.onclick = () => {
  const p = personajeActivo();
  if (!p || framesEnCurso.length < 1) return;
  const fps = Math.max(1, Math.min(30, parseInt(inputFpsAnim.value) || 8));
  establecerFramesCuerpo(p.id, estado.estadoAnimActivo, framesEnCurso, fps);
  cerrarModoAnimacionCuerpo();
  refrescarEditorCapa();
  refrescarComposicion();
  construirListas();
};

function refrescarEditorCapa() {
  const p = personajeActivo();
  cerrarPixelArt();
  setModoAncla(false);
  cerrarModoAnimacionCuerpo();
  const esCuerpo = estado.capaActiva === "cuerpo";
  const conTier = CAPAS_CON_TIER.includes(estado.capaActiva);
  selectRareza.disabled = !conTier;
  selectAnclaCuerpo.classList.toggle("oculto", !esCuerpo);
  filaEstadosCuerpo.classList.toggle("oculto", !esCuerpo);
  if (!p) { limpiarPicker(); notaTier.textContent = ""; return; }

  if (esCuerpo) {
    // El picker de recorte SIEMPRE muestra el frame de referencia de "Idle"
    // (frame 0), sin importar qué pestaña de estado esté seleccionada --
    // así los anclajes se marcan siempre en el mismo espacio de píxeles que
    // usa compositor.js para la escala común (ver plan de la sesión).
    const idleEst = estadoCuerpo(p, "idle");
    if (idleEst.frames.length) {
      cargarImagenPicker(idleEst.frames[0].src);
      mostrarAncla(p.capas.cuerpo.anclas[selectAnclaCuerpo.value] || null);
    } else {
      limpiarPicker();
    }
    const estActivo = estadoCuerpo(p, estado.estadoAnimActivo);
    notaTier.textContent = `El picker de abajo siempre muestra el frame de referencia de "Idle" (para marcar anclajes de forma consistente). Previsualizando "${estado.estadoAnimActivo}": ${estActivo.frames.length} frame(s) a ${estActivo.fps} fps. Usa "🎞️ Modo animación" para (re)capturar los frames de este estado.`;
    return;
  }

  const { pieza, esFallback } = piezaParaTier(p, estado.capaActiva, estado.tierActivo);
  if (pieza) {
    cargarImagenPicker(pieza.src);
    const ancla = p.capas[estado.capaActiva].ancla;
    // mostrarAncla() dibuja sobre el picker en cuanto la imagen cargue; como
    // cargarImagenPicker es async, este valor puede llegar antes de que haya
    // canvas -- picker.js simplemente lo recuerda para el próximo dibujar().
    mostrarAncla(ancla || null);
  } else {
    limpiarPicker();
  }
  notaTier.textContent = esFallback
    ? `Este tier no tiene pieza propia: se ve el recoloreado automático de "Común". Usa el picker o pinta a mano para asignarle una pieza propia.`
    : `Editando la pieza propia de "${RAREZAS[estado.tierActivo].n}".`;
}

onSeleccion((region) => {
  const p = personajeActivo();
  if (!p) return;
  if (estado.capaActiva === "cuerpo") {
    if (modoAnimacionCuerpo) agregarFrameEnCurso(region);
    return;
  }
  asignarCapa(p.id, estado.capaActiva, estado.tierActivo, region);
  refrescarEditorCapa();
  refrescarComposicion();
  construirListas();
});

setOnUsar((img) => {
  const p = personajeActivo();
  if (!p) return;
  const region = { img, sx: 0, sy: 0, sw: img.width, sh: img.height };
  if (estado.capaActiva === "cuerpo") {
    if (modoAnimacionCuerpo) agregarFrameEnCurso(region);
    cerrarPixelArt();
    return;
  }
  asignarCapa(p.id, estado.capaActiva, estado.tierActivo, region);
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
  if (estado.capaActiva === "cuerpo") {
    establecerFramesCuerpo(p.id, estado.estadoAnimActivo, [], estadoCuerpo(p, estado.estadoAnimActivo).fps);
  } else {
    asignarCapa(p.id, estado.capaActiva, estado.tierActivo, null);
  }
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
  dibujarComposicion(canvasCompositor, personajeActivo(), estado.tierActivo, estado.capaActiva, estado.estadoAnimActivo, performance.now());
}

// Reproducción en bucle del estado de cuerpo activo -- mismo patrón que
// tools/level-editor/js/main.js (tickAnimacion): repinta a ~12fps SOLO si
// hay algo animado que mostrar, sin guardar "frame actual" en ningún sitio
// (dibujarComposicion() deriva el frame de performance.now() cada vez).
// refrescarComposicion() no dispara autoguardado (solo lee, no muta
// personajes.js), así que repintar a 12fps es seguro.
const INTERVALO_TICK_ANIM_ME_MS = 1000 / 12;
let ultimoTickAnimMe = 0;
function tickAnimacionCuerpo(ts) {
  if (ts - ultimoTickAnimMe >= INTERVALO_TICK_ANIM_ME_MS) {
    ultimoTickAnimMe = ts;
    const p = personajeActivo();
    const est = p && estadoCuerpo(p, estado.estadoAnimActivo);
    if (est && est.frames.length > 1) refrescarComposicion();
  }
  requestAnimationFrame(tickAnimacionCuerpo);
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
  construirTabsEstadoCuerpo();
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
  requestAnimationFrame(tickAnimacionCuerpo);
}
