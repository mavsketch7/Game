// Sistema de Fragmentos de Alma: se obtienen desmantelando armas en la Mesa
// de Trabajo (ver ui/workbench.js) y se colocan en una rejilla 7x7 (pestaña
// "Alma" de la ficha, ver ui/inventory.js) tipo puzzle -- cada fragmento
// ocupa 1-3 casillas con una forma fija y puede tener una entrada y/o una
// salida en una dirección concreta. Cuando la salida de un fragmento
// colocado encaja con la entrada de otro fragmento vecino (misma pareja de
// celdas, direcciones opuestas), se activa la bonificación de conexión de
// ese fragmento además de su bonificación base.
//
// Es progreso de CUENTA, no de partida ni de personaje concreto (como
// META.mejoras): las bonificaciones activas se suman igual para todo el
// grupo en cualquier personaje/partida -- ver aplicarBonusAlma() y su uso en
// systems/combat.js (statsTot).
import { META, guardarMeta } from "../core/save.js";
import { az, clamp, ri } from "../utils/helpers.js";

export const ALMA_COLS = 7;
export const ALMA_FILAS = 7;
export const ALMA_TOTAL = ALMA_COLS * ALMA_FILAS;

const DIR_DELTA = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const DIR_OPUESTA = { N: "S", S: "N", E: "W", W: "E" };

// Catálogo curado a mano (como OBJETOS_MITICOS en systems/objetosMiticos.js)
// -- 10 fragmentos, formas de 1 a 3 casillas, mezclando emisores puros
// (solo salida), receptores puros (solo entrada) y piezas de paso (ambas)
// para que las cadenas más largas requieran planificar el hueco.
export const FRAGMENTOS_CATALOGO = [
  {
    id: "astilla_viento",
    nombre: "Astilla de Viento",
    ico: "💨",
    rareza: 0,
    forma: [[0, 0]],
    stat: { vel: 2 },
    salida: { x: 0, y: 0, dir: "E" },
    entrada: null,
    bonusConexion: { armor: 2 },
  },
  {
    id: "brasa_menor",
    nombre: "Brasa Menor",
    ico: "🔥",
    rareza: 0,
    forma: [[0, 0]],
    stat: { atk: 2 },
    salida: { x: 0, y: 0, dir: "S" },
    entrada: null,
    bonusConexion: { crit: 2 },
  },
  {
    id: "latido",
    nombre: "Latido",
    ico: "❤️",
    rareza: 0,
    forma: [[0, 0]],
    stat: { hp: 12 },
    salida: null,
    entrada: { x: 0, y: 0, dir: "N" },
    bonusConexion: null,
  },
  {
    id: "escama",
    nombre: "Escama",
    ico: "🛡️",
    rareza: 0,
    forma: [[0, 0]],
    stat: { armor: 1 },
    salida: null,
    entrada: { x: 0, y: 0, dir: "W" },
    bonusConexion: null,
  },
  {
    id: "vena_cuarzo",
    nombre: "Vena de Cuarzo",
    ico: "💎",
    rareza: 1,
    forma: [
      [0, 0],
      [1, 0],
    ],
    stat: { atk: 3, crit: 2 },
    entrada: { x: 0, y: 0, dir: "W" },
    salida: { x: 1, y: 0, dir: "E" },
    bonusConexion: { cdr: 3 },
  },
  {
    id: "raiz_profunda",
    nombre: "Raíz Profunda",
    ico: "🌿",
    rareza: 1,
    forma: [
      [0, 0],
      [0, 1],
    ],
    stat: { hp: 20 },
    entrada: { x: 0, y: 0, dir: "N" },
    salida: { x: 0, y: 1, dir: "S" },
    bonusConexion: { vel: 4 },
  },
  {
    id: "fragmento_l",
    nombre: "Fragmento en L",
    ico: "⚡",
    rareza: 2,
    forma: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    stat: { atk: 5, vel: 3 },
    entrada: { x: 0, y: 0, dir: "W" },
    salida: { x: 1, y: 1, dir: "S" },
    bonusConexion: { cdr: 5 },
  },
  {
    id: "columna_ambar",
    nombre: "Columna de Ámbar",
    ico: "✨",
    rareza: 2,
    forma: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    stat: { hp: 30, armor: 3 },
    entrada: { x: 0, y: 0, dir: "N" },
    salida: { x: 0, y: 2, dir: "S" },
    bonusConexion: { crit: 4 },
  },
  {
    id: "trebol",
    nombre: "Fragmento Trébol",
    ico: "🌀",
    rareza: 3,
    forma: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    stat: { atk: 7, crit: 5, cdr: 3 },
    entrada: { x: 1, y: 0, dir: "E" },
    salida: { x: 0, y: 1, dir: "S" },
    bonusConexion: { atk: 6 },
  },
  {
    id: "nucleo_vespero",
    nombre: "Núcleo de Véspero",
    ico: "⭐",
    rareza: 3,
    forma: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    stat: { hp: 40, vel: 5, armor: 4 },
    entrada: { x: 0, y: 0, dir: "W" },
    salida: { x: 2, y: 0, dir: "E" },
    bonusConexion: { hp: 25 },
  },
];

export function fragPorId(id) {
  return FRAGMENTOS_CATALOGO.find((f) => f.id === id);
}

export function celdaIdx(x, y) {
  return y * ALMA_COLS + x;
}
export function idxAXY(idx) {
  return { x: idx % ALMA_COLS, y: Math.floor(idx / ALMA_COLS) };
}

// Coste en oro de romper la (n+1)-ésima casilla, n = ya desbloqueadas.
export function costeCasillaAlma(n) {
  return 40 + n * 22;
}

export function puedeDesbloquearCasilla(idx) {
  const a = META.alma;
  return (
    idx >= 0 &&
    idx < ALMA_TOTAL &&
    !a.desbloqueadas.includes(idx) &&
    a.puntos > 0 &&
    META.oro >= costeCasillaAlma(a.desbloqueadas.length)
  );
}

export function desbloquearCasillaAlma(idx) {
  if (!puedeDesbloquearCasilla(idx)) return false;
  const a = META.alma;
  META.oro -= costeCasillaAlma(a.desbloqueadas.length);
  a.puntos--;
  a.desbloqueadas.push(idx);
  guardarMeta();
  return true;
}

// Calidad del fragmento generado al desmantelar: normalmente igual o un
// escalón por debajo de la rareza del arma (nunca por encima) -- un arma
// Legendaria (3) puede soltar fragmentos Épicos o Legendarios, nunca Común.
function calidadFragmento(rarezaArma) {
  return clamp(rarezaArma - ri(0, 1), 0, 3);
}

// Desmantela un arma (item de p.bolsa, slot === "arma") en varios
// fragmentos: cantidad y calidad escalan con la rareza del arma -- cuanto
// mejor el arma, más y mejores fragmentos. El "nivel de uso" descrito en el
// diseño original (cuánto se ha usado el arma) no se rastrea todavía en el
// modelo de item actual (ver systems/loot.js: genItem() no lleva contador
// de golpes/kills) -- queda como mejora futura; de momento solo pesa la
// rareza, igual que el resto de fórmulas de loot del juego.
export function desmantelarArma(item) {
  if (!item || item.slot !== "arma") return [];
  const n = 1 + item.rareza;
  const nuevos = [];
  for (let i = 0; i < n; i++) {
    const cal = calidadFragmento(item.rareza);
    const candidatos = FRAGMENTOS_CATALOGO.filter((f) => f.rareza === cal);
    const frag = az(candidatos.length ? candidatos : FRAGMENTOS_CATALOGO);
    const uid = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + i;
    nuevos.push({ uid, fragId: frag.id });
  }
  META.alma.inventario.push(...nuevos);
  guardarMeta();
  return nuevos;
}

// Celdas absolutas (rejilla) que ocupa un fragmento colocado con ancla en
// (x,y) -- forma[0] es siempre [0,0], así que la propia ancla ya está
// incluida en forma.
export function celdasOcupadas(frag, x, y) {
  return frag.forma.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
}

function dentroDeRejilla(x, y) {
  return x >= 0 && x < ALMA_COLS && y >= 0 && y < ALMA_FILAS;
}

// Si un fragmento con ancla en (x,y) cabe: todas sus celdas dentro de la
// rejilla, sobre casillas ya desbloqueadas, y libres (sin otro fragmento).
export function fragmentoCabe(frag, x, y, ignorarUid) {
  const ocupadasPorOtros = new Set();
  for (const c of META.alma.colocados) {
    if (c.uid === ignorarUid) continue;
    const f = fragPorId(c.fragId);
    if (!f) continue;
    for (const cc of celdasOcupadas(f, c.x, c.y))
      ocupadasPorOtros.add(celdaIdx(cc.x, cc.y));
  }
  for (const c of celdasOcupadas(frag, x, y)) {
    if (!dentroDeRejilla(c.x, c.y)) return false;
    const idx = celdaIdx(c.x, c.y);
    if (!META.alma.desbloqueadas.includes(idx)) return false;
    if (ocupadasPorOtros.has(idx)) return false;
  }
  return true;
}

export function colocarFragmento(uid, x, y) {
  const inv = META.alma.inventario;
  const i = inv.findIndex((f) => f.uid === uid);
  if (i < 0) return false;
  const frag = fragPorId(inv[i].fragId);
  if (!frag || !fragmentoCabe(frag, x, y)) return false;
  inv.splice(i, 1);
  META.alma.colocados.push({ uid, fragId: frag.id, x, y });
  guardarMeta();
  return true;
}

export function quitarFragmento(uid) {
  const col = META.alma.colocados;
  const i = col.findIndex((c) => c.uid === uid);
  if (i < 0) return false;
  const [c] = col.splice(i, 1);
  META.alma.inventario.push({ uid: c.uid, fragId: c.fragId });
  guardarMeta();
  return true;
}

// Índice de celda -> instancia colocada que la ocupa (o null), para pintar
// la rejilla y resolver clics.
export function mapaOcupacion() {
  const mapa = new Map();
  for (const c of META.alma.colocados) {
    const f = fragPorId(c.fragId);
    if (!f) continue;
    for (const cc of celdasOcupadas(f, c.x, c.y))
      mapa.set(celdaIdx(cc.x, cc.y), c);
  }
  return mapa;
}

// Conexiones activas: para cada fragmento colocado con salida, comprueba si
// la celda vecina en esa dirección pertenece a OTRO fragmento colocado que
// tenga una entrada en esa misma celda mirando en dirección opuesta. Motor
// de "encaja pieza con pieza" del sistema, ver cabecera del archivo.
export function conexionesActivas() {
  const col = META.alma.colocados;
  const activos = new Set();
  for (const c of col) {
    const f = fragPorId(c.fragId);
    if (!f || !f.salida) continue;
    const sx = c.x + f.salida.x,
      sy = c.y + f.salida.y;
    const [ddx, ddy] = DIR_DELTA[f.salida.dir];
    const vx = sx + ddx,
      vy = sy + ddy;
    const objetivo = col.find((c2) => {
      if (c2.uid === c.uid) return false;
      const f2 = fragPorId(c2.fragId);
      if (!f2 || !f2.entrada) return false;
      const ex = c2.x + f2.entrada.x,
        ey = c2.y + f2.entrada.y;
      return (
        ex === vx && ey === vy && f2.entrada.dir === DIR_OPUESTA[f.salida.dir]
      );
    });
    if (objetivo) activos.add(c.uid);
  }
  return activos;
}

// Suma de stats base (todo fragmento colocado) + bonus de conexión (solo
// los que tienen la salida encajada) -- esto es lo que systems/combat.js
// añade a statsTot() para todo el grupo.
export function aplicarBonusAlma(t) {
  const activos = conexionesActivas();
  for (const c of META.alma.colocados) {
    const f = fragPorId(c.fragId);
    if (!f) continue;
    for (const k in f.stat) {
      if (k === "hp") t.hpMax += f.stat[k];
      else t[k] += f.stat[k];
    }
    if (f.bonusConexion && activos.has(c.uid)) {
      for (const k in f.bonusConexion) {
        if (k === "hp") t.hpMax += f.bonusConexion[k];
        else t[k] += f.bonusConexion[k];
      }
    }
  }
}
