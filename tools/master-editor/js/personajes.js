// --- Modelo de datos de "Personaje" + autoguardado (localStorage) + export ---
// Ver plan de la sesión: herramienta de diseño, no conectada al juego real
// todavía -- lo que se guarda aquí es independiente de src/render/sprites.js.
export const CAPAS = ["cuerpo", "arma", "casco", "peto", "piernas"];
// Todas menos "cuerpo": el cuerpo es la referencia fija, sin tiers ni offset
// propio (ver compositor.js). Coincide en longitud/orden con RAREZAS
// (compositor.js): índice 0 = Común, 4 = Mítico.
export const CAPAS_CON_TIER = ["arma", "casco", "peto", "piernas"];
export const N_TIERS = 5;

const CLAVE = "vespero-master-editor-personajes-v2"; // v2: capas con tier -- ver nota más abajo
const RETARDO_MS = 600;
let temporizador = null;

export const estado = {
  personajes: [], // creados en el editor; cada uno editable
  activoId: null,
  capaActiva: "cuerpo",
  tierActivo: 0, // qué tier se ve/edita para la capa activa (Común..Mítico)
};

function crearCapaConTierVacia() {
  return {
    offset: { x: 0, y: 0 }, // desplazamiento manual sobre la escala común (ver compositor.js)
    escala: 1, // multiplicador manual sobre la escala común
    tiers: new Array(N_TIERS).fill(null), // { src, sx, sy, sw, sh } | null, uno por RAREZA
  };
}

function crearPersonajeVacio(nombre, tipo) {
  const capas = { cuerpo: null }; // cuerpo: { src, sx, sy, sw, sh } | null, sin tiers
  for (const c of CAPAS_CON_TIER) capas[c] = crearCapaConTierVacia();
  return { id: "custom_" + Date.now(), nombre, tipo: tipo || "heroe", capas };
}

export function crearPersonaje(nombre, tipo) {
  const p = crearPersonajeVacio(nombre, tipo);
  estado.personajes.push(p);
  estado.activoId = p.id;
  estado.capaActiva = "cuerpo";
  estado.tierActivo = 0;
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

function recortarARegion(region) {
  // Se guarda como data URL propio (recorte ya aplicado), no una referencia a
  // la imagen de origen -- así el JSON exportado es autocontenido.
  const c = document.createElement("canvas");
  c.width = region.sw;
  c.height = region.sh;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(region.img, region.sx, region.sy, region.sw, region.sh, 0, 0, region.sw, region.sh);
  return { src: c.toDataURL("image/png"), sx: 0, sy: 0, sw: region.sw, sh: region.sh };
}

// region: { img: HTMLImageElement, sx, sy, sw, sh } | null (null = quitar)
// tier: índice 0..4, ignorado para capa === "cuerpo" (no tiene tiers).
export function asignarCapa(idPersonaje, capa, tier, region) {
  const p = estado.personajes.find((x) => x.id === idPersonaje);
  if (!p || !CAPAS.includes(capa)) return;
  const pieza = region ? recortarARegion(region) : null;
  if (capa === "cuerpo") {
    p.capas.cuerpo = pieza;
  } else {
    p.capas[capa].tiers[tier] = pieza;
  }
  programarGuardado();
}

export function ajustarTransformCapa(idPersonaje, capa, cambios) {
  const p = estado.personajes.find((x) => x.id === idPersonaje);
  if (!p || capa === "cuerpo" || !p.capas[capa]) return;
  Object.assign(p.capas[capa].offset, cambios.offset || {});
  if (cambios.escala != null) p.capas[capa].escala = cambios.escala;
  programarGuardado();
}

export function resetearTransformCapa(idPersonaje, capa) {
  ajustarTransformCapa(idPersonaje, capa, { offset: { x: 0, y: 0 }, escala: 1 });
}

// Pieza a dibujar/editar para una capa+tier concreto -- true si es la pieza
// propia de ese tier, o la de Común como fallback (ver compositor.js, que
// además la recolorea cuando es fallback). Devuelve { pieza, esFallback }.
export function piezaParaTier(personaje, capa, tier) {
  if (capa === "cuerpo") return { pieza: personaje.capas.cuerpo, esFallback: false };
  const c = personaje.capas[capa];
  if (!c) return { pieza: null, esFallback: false };
  if (c.tiers[tier]) return { pieza: c.tiers[tier], esFallback: false };
  return { pieza: c.tiers[0], esFallback: tier !== 0 };
}

export function programarGuardado() {
  clearTimeout(temporizador);
  temporizador = setTimeout(guardarLocal, RETARDO_MS);
}

export function guardarLocal() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      version: 2,
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
