// --- CONFIGURACIÓN BASE Y CARGA DE ASSETS ---
export const COLS = 40, ROWS = 25, CELL = 40;
export const MARGEN = 28;

// Rutas absolutas (sirven desde public/, ver vite.config.js) a los sprites REALES del
// juego -- a diferencia de la versión standalone de este editor (mazmorra assets/PNG),
// aquí no hay spritesheets: cada archivo es un sprite suelto completo (ver dibujarTile()
// en render.js: sw/sh en 0 => se usa el tamaño natural de la imagen, sin recorte).
export const ASSETS_PATHS = {
  suelo1: "/assets/sprites/suelo1.png",
  suelo2: "/assets/sprites/suelo2.png",
  wall: "/assets/sprites/wall.png",
  wallRemate: "/assets/sprites/wallRemate.png",
  paredIntermedia: "/assets/sprites/Pared-intermedia.png",
  door1: "/assets/sprites/door1.png",
  door2: "/assets/sprites/door2.png",
  escaleras: "/assets/sprites/escaleras.png",
  cofre: "/assets/sprites/cofre_f0.png",
  barril: "/assets/sprites/barril.png",
};

export const ASSETS = {};

// Las Image() se crean aquí (de forma síncrona) para que TIPOS, más abajo, pueda
// guardar la referencia al objeto Image en su campo `img` desde ya -- la carga en sí
// es asíncrona, pero el objeto (y por tanto la referencia) ya existe.
for (const key of Object.keys(ASSETS_PATHS)) {
  ASSETS[key] = new Image();
}

export function cargarAssets(onListo) {
  let assetsCargados = 0;
  const totalAssets = Object.keys(ASSETS_PATHS).length;

  for (const [key, path] of Object.entries(ASSETS_PATHS)) {
    const img = ASSETS[key];
    img.onload = () => {
      assetsCargados++;
      if (assetsCargados === totalAssets) onListo();
    };
    img.onerror = () => {
      console.warn("No se pudo cargar: " + path);
      assetsCargados++;
      if (assetsCargados === totalAssets) onListo();
    };
    img.src = path;
  }

  // Salvaguarda: si alguna imagen no dispara evento, forzar inicio tras un corto retardo
  setTimeout(() => { if (assetsCargados < totalAssets) onListo(); }, 1000);
}

// --- DEFINICIÓN DE TIPOS (PINCELES) ---
// capa: "suelo" -> ocupa la base de la celda (siempre hay una). "elemento" -> se superpone encima del suelo.
// sw/sh: tamaño (en px del spritesheet) del recorte de sprite. Por defecto 32x32; el picker permite
// seleccionar libremente un recorte más pequeño (máx. 32x32) manteniendo Alt mientras arrastras.
//
// capaExport gobierna cómo trata js/exportar-json.js cada tipo al generar el JSON que consume el motor:
//   "muro"    -> celdas contiguas se fusionan en rectángulos {x,y,w,h} (colección "muros").
//   "secreta" -> igual que "muro" pero cada rectángulo lleva además { secreto: true }.
//   "punto"   -> cada celda se exporta como un punto {tipo: motorTipo, x, y} (enemigos/objetos/pilares).
//   "ninguno" -> no se exporta; el tile es solo referencia visual para quien diseña la sala.
// motorTipo: identificador exacto que espera el motor (ver combat.js:tipoAleatorio y floorgen.js:ponHazardsYObjetos).
// categoria: solo para agrupar visualmente la paleta (ver ui.js).
// Nota sobre img/sx/sy/sw/sh: como los sprites reales del juego son archivos sueltos
// (no spritesheets), se dejan sw:0,sh:0 (=> tamaño natural completo, ver render.js).
// Los enemigos NO tienen aquí un sprite asignado por defecto -- el arte de combate real
// se genera proceduralmente en render/sprites.js (buildSprite), no son PNG sueltos con
// un mapeo 1:1 evidente por tipo; usa el selector (⚙️) si quieres asignarles uno igualmente.
export const TIPOS = [
  // --- Estructurales (capa suelo) ---
  { id: "vacio",    ch: ".", color: "#12101c", label: "Goma de borrar",   tecla: "0", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "suelo", capaExport: "ninguno", categoria: "suelo" },
  { id: "suelo",    ch: ",", color: "#2d283c", label: "Suelo (Base)",     tecla: "1", img: ASSETS.suelo1, sx: 0, sy: 0, sw: 0, sh: 0, capa: "suelo", capaExport: "ninguno", categoria: "suelo" },

  // --- Estructurales (capa elemento): geometría real de la sala ---
  { id: "muro",     ch: "#", color: "#5a5470", label: "Muro de piedra",   tecla: "2", img: ASSETS.wall, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "muro", categoria: "estructura" },
  { id: "secreta",  ch: "S", color: "#c084f0", label: "Muro secreto",     tecla: "4", img: ASSETS.paredIntermedia, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "secreta", categoria: "estructura" },
  { id: "puerta",   ch: "P", color: "#5fb0e0", label: "Puerta (referencia)", tecla: "3", img: ASSETS.door1, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "ninguno", categoria: "estructura" },

  // --- Referencia visual: sin equivalente 1:1 en el motor todavía (ver docs/LEVEL_FORMAT.md) ---
  { id: "escalera", ch: "E", color: "#8fd3ff", label: "Escalera (referencia)", tecla: "5", img: ASSETS.escaleras, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "ninguno", categoria: "referencia" },
  { id: "trampa",   ch: "^", color: "#747d8c", label: "Trampa (referencia)",   tecla: "8", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "ninguno", categoria: "referencia" },

  // --- Enemigos reales (combat.js: TIPOS de spawnEnemigo) ---
  { id: "melee",   ch: "m", color: "#ff4757", label: "Enemigo: Sombra (melee)",    tecla: "6", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo: "melee" },
  { id: "ranged",  ch: "r", color: "#ff6b81", label: "Enemigo: Vigía (ranged)",    tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo: "ranged" },
  { id: "runner",  ch: "u", color: "#ff8fa3", label: "Enemigo: Acechador (runner)", tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo: "runner" },
  { id: "tank",    ch: "t", color: "#c23616", label: "Enemigo: Gólem (tank)",      tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo: "tank" },
  { id: "caster",  ch: "c", color: "#e84393", label: "Enemigo: Hechicero (caster)", tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo: "caster" },
  { id: "bomber",  ch: "b", color: "#eb2f06", label: "Enemigo: Detonante (bomber)", tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo: "bomber" },
  { id: "mini",    ch: "i", color: "#b71540", label: "Enemigo: Minijefe (mini)",   tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo: "mini" },

  // --- Objetos/props reales (floorgen.js: ponHazardsYObjetos) ---
  { id: "cofre",   ch: "C", color: "#ffa502", label: "Cofre del tesoro", tecla: "7", img: ASSETS.cofre, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "cofre" },
  { id: "barril",  ch: "B", color: "#8a6a45", label: "Barril",           tecla: "9", img: ASSETS.barril, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "barril" },
  { id: "cristal", ch: "Y", color: "#70a1ff", label: "Cristal",          tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "cristal" },
  { id: "brasero", ch: "F", color: "#ff7f50", label: "Brasero",         tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "brasero" },

  // --- Pilares (floorgen.js: ponPilares / G.pilares) ---
  { id: "pilar",   ch: "O", color: "#576574", label: "Pilar",           tecla: "", img: null, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "pilar", motorTipo: "pilar" },
];

export const TAM_MAX_RECORTE = 32; // máx. ancho/alto (px) de un recorte de sprite, = tamaño de tile

export let POR_ID = {};
export let POR_CH = {};
export function actualizarDiccionarios() {
  POR_ID = Object.fromEntries(TIPOS.map(t => [t.id, t]));
  POR_CH = Object.fromEntries(TIPOS.map(t => [t.ch, t]));
}
actualizarDiccionarios();

export const ANCLAS_PUERTA = [
  { dir: "N", r: 0, c: Math.floor(COLS / 2) }, { dir: "S", r: ROWS - 1, c: Math.floor(COLS / 2) },
  { dir: "O", r: Math.floor(ROWS / 2), c: 0 }, { dir: "E", r: Math.floor(ROWS / 2), c: COLS - 1 },
];

// --- Constantes del motor real (src/systems/floorgen.js), replicadas aquí para poder
// validar en el editor si un diseño bloqueará una puerta antes de exportarlo. ---
export const HUECO_PUERTA = 140; // ancho del hueco que el motor deja libre en cada puerta

// Posición exacta (px) de cada ancla de puerta según posPuerta() en floorgen.js.
export function posPuertaPx(dir) {
  const W = COLS * CELL, H = ROWS * CELL;
  return dir === "N" ? { x: W / 2, y: 46 }
    : dir === "S" ? { x: W / 2, y: H - 46 }
    : dir === "O" ? { x: 46, y: H / 2 }
    : { x: W - 46, y: H / 2 };
}
