// --- Autoguardado en localStorage ---
// Persiste salas (grid + notas) y pinceles personalizados (incl. imágenes propias
// como data URL) para no perder el trabajo al recargar la página. No persiste el
// historial de deshacer/rehacer: se reinicia en cada carga.
import { estado, clonarGrid } from "./state.js";
import { TIPOS, actualizarDiccionarios } from "./config.js";
import { registrarImagenCustom } from "./picker.js";

const CLAVE = "vespero-level-editor-autosave-v1";
const RETARDO_MS = 600;
let temporizador = null;

// Los pinceles creados en el editor (a diferencia de los base de config.js) llevan
// id "custom_<timestamp>" (Nuevo Pincel, io.js) o "import_<char>" (importados desde
// texto con leyenda, io.js:registrarTipoImportado) -- NO se distinguen ya por
// `categoria`, porque desde que "Nuevo Pincel" deja elegir la categoría real
// (suelo/muro/enemigo/...) esa categoría puede ser cualquiera de las del motor.
function esTipoCustom(t) {
  return t.id.startsWith("custom_") || t.id.startsWith("import_");
}

function serializar() {
  const tiposCustom = TIPOS
    .filter(esTipoCustom)
    .map(t => ({
      id: t.id, ch: t.ch, color: t.color, label: t.label, tecla: t.tecla,
      imgSrc: t.img && t.img.complete ? t.img.src : null,
      sx: t.sx, sy: t.sy, sw: t.sw, sh: t.sh,
      capa: t.capa, capaExport: t.capaExport, categoria: t.categoria,
      ...(t.motorTipo ? { motorTipo: t.motorTipo } : {}),
    }));

  return {
    version: 1,
    salaActual: estado.salaActual,
    salas: estado.salas.map(s => ({ nombre: s.nombre, nota: s.nota, grid: s.grid })),
    tiposCustom,
  };
}

export function guardarLocal() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(serializar()));
  } catch (e) {
    console.warn("Autoguardado falló (¿localStorage lleno o deshabilitado?):", e);
  }
}

// Debounce: evita escribir en cada pixel pintado durante un arrastre.
export function programarGuardado() {
  clearTimeout(temporizador);
  temporizador = setTimeout(guardarLocal, RETARDO_MS);
}

// Aplica el autoguardado (si existe) a `estado` y `TIPOS`. Devuelve true si había datos.
export function cargarLocal() {
  let datos;
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return false;
    datos = JSON.parse(raw);
  } catch (e) {
    console.warn("No se pudo leer el autoguardado:", e);
    return false;
  }
  if (!datos || !Array.isArray(datos.salas) || !datos.salas.length) return false;

  // Restaurar primero los pinceles personalizados para que sus ids existan
  // cuando se restauren las grids de las salas que los usan.
  for (const t of datos.tiposCustom || []) {
    if (TIPOS.some(x => x.id === t.id)) continue;
    let img = null;
    if (t.imgSrc) {
      img = new Image();
      img.src = t.imgSrc;
      registrarImagenCustom(t.id, "📁 " + t.label, img);
    }
    TIPOS.push({ ...t, img });
  }
  actualizarDiccionarios();

  estado.salas = datos.salas.map(s => ({
    nombre: s.nombre, nota: s.nota || "", grid: s.grid,
    historial: [clonarGrid(s.grid)], indiceHistoria: 0,
  }));
  estado.salaActual = Math.min(Math.max(0, datos.salaActual || 0), estado.salas.length - 1);
  return true;
}

export function borrarLocal() {
  clearTimeout(temporizador);
  localStorage.removeItem(CLAVE);
}
