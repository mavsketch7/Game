// --- CONFIGURACIÓN BASE Y CARGA DE ASSETS ---
// CELL bajado de 40 a 20px (COLS/ROWS duplicados a la par: 80x50, mismo
// lienzo de 1600x1000 de siempre) -- pedido expreso del usuario tras ver
// un plano de mazmorra con salas de forma orgánica (circulares/diagonales
// hechas de bloques pequeños, "al final son píxeles"): a 40px por celda un
// círculo razonable salía como un diamante de 3-4 escalones; a 20px salen
// 2x más escalones por eje (4x más resolución de borde) y se lee como
// curva de verdad. 20px además coincide EXACTO con CELDA en
// systems/navegacion.js (el flow field del motor), cero desalineación con
// el pathfinding real del juego.
export const COLS = 80, ROWS = 50, CELL = 20;
export const MARGEN = 28;

// Rutas absolutas (sirven desde public/, ver vite.config.js) a los sprites REALES del
// juego -- a diferencia de la versión standalone de este editor (mazmorra assets/PNG),
// aquí no hay spritesheets: cada archivo es un sprite suelto completo (ver dibujarTile()
// en render.js: sw/sh en 0 => se usa el tamaño natural de la imagen, sin recorte).
export const ASSETS_PATHS = {
  // Suelo/pared: el tileset real del rework de mazmorra (antes apuntaban a
  // suelo1/suelo2/wall.png, los sprites VIEJOS -- por eso el editor nunca
  // llegó a mostrar el tileset nuevo, aunque el juego en vivo ya lo usa
  // bien desde ese rework, ver wallPatron()/patronSuelo() en
  // render/world.js). Mismos archivos que KENNEY_TILE en render/sprites.js.
  suelo1: "/assets/sprites/dungeon/floor_fill.png",
  suelo2: "/assets/sprites/dungeon/floor_fill2.png",
  wall: "/assets/sprites/dungeon/wall_fill.png",
  wallRemate: "/assets/sprites/dungeon/wall_top.png",
  paredIntermedia: "/assets/sprites/Pared-intermedia.png",
  door1: "/assets/sprites/door1.png",
  door2: "/assets/sprites/door2.png",
  escaleras: "/assets/sprites/escaleras.png",
  cofre: "/assets/sprites/cofre_f0.png",
  barril: "/assets/sprites/barril.png",
  // Props nuevos del rework de mazmorra (ver G.objetos en render/world.js
  // y pl.disenio en systems/floorgen.js: ponPilares()) -- mismos archivos
  // que ASSET_SRC en render/sprites.js, para que lo pintado aquí sea
  // exactamente lo que aparece en el juego.
  torchPie: "/assets/sprites/dungeon/torch_pie.png",
  barrilRacimo: "/assets/sprites/dungeon/barril_racimo.png",
  escombros: "/assets/sprites/dungeon/escombros.png",
  estandarteAzul: "/assets/sprites/dungeon/estandarte_azul.png",
  estandarteRojo: "/assets/sprites/dungeon/estandarte_rojo.png",
  cadena: "/assets/sprites/dungeon/cadena.png",
  llave: "/assets/sprites/dungeon/llave.png",
  pilarLiso: "/assets/sprites/dungeon/pillar_liso.png",
  pilarRostro: "/assets/sprites/dungeon/pillar_rostro.png",
  pilarEstriado: "/assets/sprites/dungeon/pillar_estriado.png",
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
  // brasero (motorTipo "brasero") ahora dibuja la antorcha real del
  // rework de mazmorra en el juego (ver world.js) -- el icono del editor
  // usa el mismo sprite para que sea WYSIWYG.
  { id: "brasero", ch: "F", color: "#ff7f50", label: "Antorcha",         tecla: "", img: ASSETS.torchPie, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "brasero" },
  // --- Props nuevos del rework de mazmorra (mismo motorTipo que ya
  // entiende el render de G.objetos en render/world.js) ---
  { id: "escombros",       ch: "R", color: "#8a7ba0", label: "Escombros",              tecla: "", img: ASSETS.escombros,      sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "escombros" },
  { id: "barril_racimo",   ch: "K", color: "#a9782f", label: "Racimo de barriles",     tecla: "", img: ASSETS.barrilRacimo,   sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "barrilRacimo" },
  { id: "llave",           ch: "L", color: "#e9b45c", label: "Llave",                  tecla: "", img: ASSETS.llave,          sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "llave" },
  // estandarte/cadena: pensados para colocarse PEGADOS a un muro (mismo
  // criterio "con sentido" que decorarMuros() en floorgen.js, no al
  // azar) -- x,y caen en el centro de la celda igual que cualquier otro
  // punto, así que hay que colocarlos a mano justo sobre el tramo de
  // muro deseado.
  { id: "estandarte_azul", ch: "N", color: "#5470c0", label: "Estandarte azul (muro)", tecla: "", img: ASSETS.estandarteAzul, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "estandarte", variante: 0 },
  { id: "estandarte_rojo", ch: "M", color: "#c0505a", label: "Estandarte rojo (muro)", tecla: "", img: ASSETS.estandarteRojo, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "estandarte", variante: 1 },
  { id: "cadena",          ch: "H", color: "#7a8290", label: "Cadena (muro)",          tecla: "", img: ASSETS.cadena,         sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo: "cadena" },

  // --- Pilares (floorgen.js: ponPilares / G.pilares) -- 3 diseños reales
  // (pl.disenio: 0 liso / 1 rostro / 2 estriado, ver render/world.js) ---
  { id: "pilar",          ch: "O", color: "#576574", label: "Pilar (liso)",     tecla: "", img: ASSETS.pilarLiso,     sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "pilar", motorTipo: "pilar", disenio: 0 },
  { id: "pilar_rostro",   ch: "Q", color: "#576574", label: "Pilar (rostro)",   tecla: "", img: ASSETS.pilarRostro,   sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "pilar", motorTipo: "pilar", disenio: 1 },
  { id: "pilar_estriado", ch: "W", color: "#576574", label: "Pilar (estriado)", tecla: "", img: ASSETS.pilarEstriado, sx: 0, sy: 0, sw: 0, sh: 0, capa: "elemento", capaExport: "punto", categoria: "pilar", motorTipo: "pilar", disenio: 2 },
];

export const TAM_MAX_RECORTE = 32; // máx. ancho/alto (px) de un recorte de sprite, = tamaño de tile

// --- Categorías de comportamiento para pinceles nuevos (ver "Nuevo Pincel" en io.js) ---
// Un pincel no es solo un dibujo: su capa/capaExport/motorTipo determina si bloquea el
// paso, si se fusiona en muros, si spawnea un enemigo real, etc. -- ver el comentario
// grande de TIPOS más arriba y docs/LEVEL_FORMAT.md para el porqué de cada campo. Antes,
// "Nuevo Pincel" creaba SIEMPRE un tile puramente decorativo (capaExport:"ninguno"); esta
// lista deja elegir la categoría real, incluyendo reskins de enemigos/objetos/pilares
// existentes (mismo motorTipo, arte propio vía el picker ⚙️).
export const CATEGORIAS_PINCEL = [
  {
    value: "suelo", label: "Suelo (capa base)", grupo: "Estructural",
    desc: "Ocupa el fondo de la celda. No bloquea el paso ni se exporta como geometría.",
    capa: "suelo", capaExport: "ninguno", categoria: "suelo",
  },
  {
    value: "muro", label: "Muro", grupo: "Estructural",
    desc: "Bloquea el paso. Las celdas contiguas se fusionan en rectángulos de colisión al exportar.",
    capa: "elemento", capaExport: "muro", categoria: "estructura",
  },
  {
    value: "secreta", label: "Muro secreto", grupo: "Estructural",
    desc: "Como un muro, pero revelable en el juego acercándose y pulsando E.",
    capa: "elemento", capaExport: "secreta", categoria: "estructura",
  },
  {
    value: "puerta", label: "Puerta (solo referencia)", grupo: "Estructural",
    desc: "No bloquea ni se exporta: guía visual. Las puertas reales las coloca el motor en posiciones fijas.",
    capa: "elemento", capaExport: "ninguno", categoria: "estructura",
  },
  {
    value: "referencia", label: "Solo referencia visual (no se exporta)", grupo: "Estructural",
    desc: "No se exporta al JSON del motor; útil para anotar la sala mientras se diseña.",
    capa: "elemento", capaExport: "ninguno", categoria: "referencia",
  },
  ...[
    ["melee", "Sombra (melee)"], ["ranged", "Vigía (ranged)"], ["runner", "Acechador (runner)"],
    ["tank", "Gólem (tank)"], ["caster", "Hechicero (caster)"], ["bomber", "Detonante (bomber)"],
    ["mini", "Minijefe (mini)"],
  ].map(([motorTipo, nombre]) => ({
    value: "enemigo_" + motorTipo, label: "Enemigo: " + nombre, grupo: "Enemigo (reskin, mismo comportamiento)",
    desc: "Spawnea un enemigo real de tipo \"" + motorTipo + "\" -- solo cambia el arte, no las stats ni el comportamiento.",
    capa: "elemento", capaExport: "punto", categoria: "enemigo", motorTipo,
  })),
  ...[
    ["barril", "Barril"], ["cofre", "Cofre del tesoro"], ["cristal", "Cristal"], ["brasero", "Brasero"],
  ].map(([motorTipo, nombre]) => ({
    value: "objeto_" + motorTipo, label: "Objeto: " + nombre, grupo: "Objeto (reskin, mismo comportamiento)",
    desc: "Coloca un objeto real de tipo \"" + motorTipo + "\" -- solo cambia el arte, no la función.",
    capa: "elemento", capaExport: "punto", categoria: "objeto", motorTipo,
  })),
  {
    value: "pilar", label: "Pilar", grupo: "Otros",
    desc: "Columna destructible real del motor -- solo cambia el arte.",
    capa: "elemento", capaExport: "punto", categoria: "pilar",
  },
];

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
