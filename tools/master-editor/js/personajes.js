// --- Modelo de datos de "Personaje" + autoguardado (localStorage) + export ---
// Ver plan de la sesión: herramienta de diseño, no conectada al juego real
// todavía -- lo que se guarda aquí es independiente de src/render/sprites.js.
export const CAPAS = ["cuerpo", "arma", "casco", "peto", "piernas"];
// Todas menos "cuerpo": el cuerpo es la referencia fija, sin tiers ni offset
// propio (ver compositor.js). Coincide en longitud/orden con RAREZAS
// (compositor.js): índice 0 = Común, 4 = Mítico.
export const CAPAS_CON_TIER = ["arma", "casco", "peto", "piernas"];
export const N_TIERS = 5;

// Anclajes con nombre en el cuerpo, y a cuál se engancha cada capa -- para
// que el compositor pueda alinear una pieza exactamente en su sitio (la
// empuñadura del arma en la mano, el casco en la cabeza...) en vez de tener
// que centrarla a ojo. Ver picker.js (colocar un ancla con un clic) y
// compositor.js (usarlo para posicionar).
export const ANCLAS_CUERPO = ["cabeza", "torso", "cadera", "mano"];
export const CAPA_A_ANCLA = { casco: "cabeza", peto: "torso", piernas: "cadera", arma: "mano" };

// Estados de animación del cuerpo -- nombres 1:1 con REAL_IDLE_SRC/REAL_RUN_SRC/
// REAL_ATTACK_SRC de src/render/sprites.js, para que un futuro importador pueda
// mapear directo. Solo el cuerpo anima: arma/casco/peto/piernas son siempre una
// imagen estática por tier (el pack de assets real no trae hojas de animación
// para armas/armadura, solo para el cuerpo -- ver Body_A/Animations/*).
export const ESTADOS_CUERPO = ["idle", "run", "attack"];
const FPS_CUERPO_DEFECTO = 8;

const CLAVE = "vespero-master-editor-personajes-v4"; // v4: estados de animación (idle/run/attack) en el cuerpo -- ver nota más abajo
const RETARDO_MS = 600;
let temporizador = null;

export const estado = {
  personajes: [], // creados en el editor; cada uno editable
  activoId: null,
  capaActiva: "cuerpo",
  tierActivo: 0, // qué tier se ve/edita para la capa activa (Común..Mítico)
  anclaCuerpoActiva: "cabeza", // qué anclaje del cuerpo se coloca al marcar (solo aplica con capaActiva==="cuerpo")
  estadoAnimActivo: "idle", // qué estado del cuerpo se edita/previsualiza (Idle/Run/Attack)
};

function crearCapaConTierVacia() {
  return {
    offset: { x: 0, y: 0 }, // desplazamiento manual, fino, encima del anclaje (o del centrado si no hay anclaje)
    escala: 1, // multiplicador manual sobre la escala común
    ancla: null, // {x,y} en píxeles locales de la pieza (0..sw, 0..sh) -- el punto que se alinea al anclaje del cuerpo
    tiers: new Array(N_TIERS).fill(null), // { src, sx, sy, sw, sh } | null, uno por RAREZA
  };
}

function crearEstadoCuerpoVacio() {
  return { frames: [], fps: FPS_CUERPO_DEFECTO }; // frames: [{src,sx,sy,sw,sh}, ...]
}

function crearCuerpoVacio() {
  const estados = {};
  for (const e of ESTADOS_CUERPO) estados[e] = crearEstadoCuerpoVacio();
  return {
    estados, // { idle: {frames,fps}, run: {...}, attack: {...} }
    anclas: { cabeza: null, torso: null, cadera: null, mano: null }, // cada una {x,y} en píxeles locales | null -- se marcan siempre sobre el frame de referencia (idle[0]), independientes del estado/frame en reproducción
  };
}

function crearPersonajeVacio(nombre, tipo) {
  const capas = { cuerpo: crearCuerpoVacio() };
  for (const c of CAPAS_CON_TIER) capas[c] = crearCapaConTierVacia();
  return { id: "custom_" + Date.now(), nombre, tipo: tipo || "heroe", capas };
}

export function crearPersonaje(nombre, tipo) {
  const p = crearPersonajeVacio(nombre, tipo);
  estado.personajes.push(p);
  estado.activoId = p.id;
  estado.capaActiva = "cuerpo";
  estado.tierActivo = 0;
  estado.estadoAnimActivo = "idle";
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

export function recortarARegion(region) {
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
// tier: índice 0..4. Solo para arma/casco/peto/piernas -- el cuerpo ya no se
// asigna aquí (tiene frames por estado, ver establecerFramesCuerpo() abajo).
// Al reasignar la pieza se borra el ancla existente (ver picker.js): un
// recorte nuevo puede tener otra forma/tamaño, así que el punto marcado
// antes ya no es de fiar -- toca volver a marcarlo.
export function asignarCapa(idPersonaje, capa, tier, region) {
  const p = estado.personajes.find((x) => x.id === idPersonaje);
  if (!p || !CAPAS_CON_TIER.includes(capa)) return;
  const pieza = region ? recortarARegion(region) : null;
  p.capas[capa].tiers[tier] = pieza;
  p.capas[capa].ancla = null;
  programarGuardado();
}

// Único punto de escritura de cuerpo.estados[x] -- sirve tanto para guardar
// una animación capturada (frames.length >= 1) como para vaciarla
// (frames: []), sin rama especial en ningún otro sitio del código.
export function establecerFramesCuerpo(idPersonaje, estadoAnim, frames, fps) {
  const p = estado.personajes.find((x) => x.id === idPersonaje);
  if (!p || !ESTADOS_CUERPO.includes(estadoAnim)) return;
  p.capas.cuerpo.estados[estadoAnim] = {
    frames: frames.slice(),
    fps: Math.max(1, Math.min(30, fps || FPS_CUERPO_DEFECTO)),
  };
  programarGuardado();
}

// Accesor null-safe -- análogo en espíritu a piezaParaTier() pero para el
// cuerpo, que no tiene tiers: devuelve siempre {frames,fps}, nunca undefined.
export function estadoCuerpo(personaje, estadoAnim) {
  const est = personaje.capas.cuerpo.estados && personaje.capas.cuerpo.estados[estadoAnim];
  return est || crearEstadoCuerpoVacio();
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

// punto: {x,y} en píxeles locales de la pieza cargada en el picker en ese
// momento (ver picker.js) -- para capas con tier, el ancla es única por
// capa (no por tier: se asume que las variantes de rareza comparten forma).
export function establecerAncla(idPersonaje, capa, punto) {
  const p = estado.personajes.find((x) => x.id === idPersonaje);
  if (!p || capa === "cuerpo" || !p.capas[capa]) return;
  p.capas[capa].ancla = punto;
  programarGuardado();
}

export function establecerAnclaCuerpo(idPersonaje, nombreAncla, punto) {
  const p = estado.personajes.find((x) => x.id === idPersonaje);
  if (!p || !ANCLAS_CUERPO.includes(nombreAncla)) return;
  p.capas.cuerpo.anclas[nombreAncla] = punto;
  programarGuardado();
}

// Pieza a dibujar/editar para una capa+tier concreto -- true si es la pieza
// propia de ese tier, o la de Común como fallback (ver compositor.js, que
// además la recolorea cuando es fallback). Devuelve { pieza, esFallback }.
export function piezaParaTier(personaje, capa, tier) {
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
      version: 4,
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
