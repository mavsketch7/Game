// --- Modelo de datos de "Personaje" + autoguardado (localStorage) + export ---
// Ver plan de la sesión: herramienta de diseño, no conectada al juego real
// todavía -- lo que se guarda aquí es independiente de src/render/sprites.js.
export const CAPAS = ["cuerpo", "arma", "casco", "peto", "piernas"];

const CLAVE = "vespero-master-editor-personajes-v1";
const RETARDO_MS = 600;
let temporizador = null;

export const estado = {
  personajes: [], // creados en el editor; cada uno editable
  activoId: null,
  capaActiva: "cuerpo",
};

function crearPersonajeVacio(nombre, tipo) {
  return {
    id: "custom_" + Date.now(),
    nombre,
    tipo: tipo || "heroe",
    // cada capa: { src: dataURL, sx, sy, sw, sh } | null -- sx/sy/sw/sh en
    // píxeles reales de `src` (ver picker.js: no se normaliza a un cuadrado).
    capas: { cuerpo: null, arma: null, casco: null, peto: null, piernas: null },
  };
}

export function crearPersonaje(nombre, tipo) {
  const p = crearPersonajeVacio(nombre, tipo);
  estado.personajes.push(p);
  estado.activoId = p.id;
  estado.capaActiva = "cuerpo";
  programarGuardado();
  return p;
}

export function personajeActivo() {
  return estado.personajes.find((p) => p.id === estado.activoId) || null;
}

export function borrarPersonaje(id) {
  const i = estado.personajes.findIndex((p) => p.id === id);
  if (i < 0) return;
  estado.personajes.splice(i, 1);
  if (estado.activoId === id) estado.activoId = estado.personajes[0] ? estado.personajes[0].id : null;
  programarGuardado();
}

// region: { img: HTMLImageElement, sx, sy, sw, sh } (ver picker.js/pixelart.js)
export function asignarCapa(idPersonaje, capa, region) {
  const p = estado.personajes.find((x) => x.id === idPersonaje);
  if (!p || !CAPAS.includes(capa)) return;
  if (!region) {
    p.capas[capa] = null;
  } else {
    // Se guarda como data URL propio (recorte ya aplicado), no una referencia
    // a la imagen de origen -- así el JSON exportado es autocontenido.
    const c = document.createElement("canvas");
    c.width = region.sw;
    c.height = region.sh;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(region.img, region.sx, region.sy, region.sw, region.sh, 0, 0, region.sw, region.sh);
    p.capas[capa] = { src: c.toDataURL("image/png"), sx: 0, sy: 0, sw: region.sw, sh: region.sh };
  }
  programarGuardado();
}

export function programarGuardado() {
  clearTimeout(temporizador);
  temporizador = setTimeout(guardarLocal, RETARDO_MS);
}

export function guardarLocal() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      version: 1,
      personajes: estado.personajes,
      activoId: estado.activoId,
    }));
  } catch (e) {
    console.warn("Autoguardado del master-editor falló:", e);
  }
}

export function cargarLocal() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return false;
    const datos = JSON.parse(raw);
    if (!datos || !Array.isArray(datos.personajes)) return false;
    estado.personajes = datos.personajes;
    estado.activoId = datos.activoId || (datos.personajes[0] && datos.personajes[0].id) || null;
    return true;
  } catch (e) {
    console.warn("No se pudo leer el autoguardado del master-editor:", e);
    return false;
  }
}

export function exportarJSON(personaje) {
  const blob = new Blob([JSON.stringify(personaje, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (personaje.nombre || "personaje").toLowerCase().replace(/[^a-z0-9]+/g, "_") + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
