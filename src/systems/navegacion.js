// Flow field (BFS multi-fuente) para la persecución de enemigos --
// sustituye la línea recta "hacia el jugador más cercano" por una
// dirección que rodea muros (G.muros) y pilares (G.pilares) con una
// ruta real. Ver core/loop.js: calcularRumboEnjambre, que combina esto
// con separación entre enemigos y un ángulo de flanqueo por enemigo.
//
// Una única rejilla cubre TODA la sala (SALA_W×SALA_H son constantes
// fijas, no cambian por sala) y se recalcula con un BFS 8-conexo desde
// la celda de cada jugador vivo a la vez: así cada celda queda con la
// distancia de CAMINO (no en línea recta) al jugador alcanzable más
// cercano, y basta mirar los vecinos de la propia celda para saber
// hacia dónde avanzar -- ningún enemigo necesita buscar su propia ruta.
import { SALA_H, SALA_W } from "../core/constants.js";
import { G } from "../core/state.js";
import { clamp } from "../utils/helpers.js";
import { vivos } from "./combat.js";

const CELDA = 20;
const COLS = SALA_W / CELDA; // 80
const FILAS = SALA_H / CELDA; // 50
const N = COLS * FILAS;

// Margen de inflado de obstáculo: el hueco intencional más estrecho del
// generador de salas es 52-60px (formas "partida"/"pasilloDoble", ver
// systems/floorgen.js) -- 8px por lado deja siempre ≥1 celda libre para
// cruzarlo sin dejar de detectar el obstáculo con margen razonable.
const MARGEN = 8;

const bloqueado = new Uint8Array(N);
const dist = new Int32Array(N);
const cola = new Int32Array(N);

// Vecinos 0-3: ortogonales (E,O,S,N). 4-7: diagonales -- el corte de
// esquina se evita exigiendo que AMBOS vecinos ortogonales de la
// diagonal estén libres (si no, un enemigo podría "atravesar" la
// esquina de un muro/pilar en diagonal).
const VX = [1, -1, 0, 0, 1, 1, -1, -1];
const VY = [0, 0, 1, -1, 1, -1, 1, -1];

let cacheMurosRef = null;
let cacheNMuros = -1;
let cacheNPilares = -1;

function marcarRect(x, y, w, h) {
  const cx0 = clamp(Math.floor(x / CELDA), 0, COLS - 1);
  const cx1 = clamp(Math.floor((x + w) / CELDA), 0, COLS - 1);
  const cy0 = clamp(Math.floor(y / CELDA), 0, FILAS - 1);
  const cy1 = clamp(Math.floor((y + h) / CELDA), 0, FILAS - 1);
  for (let cy = cy0; cy <= cy1; cy++)
    for (let cx = cx0; cx <= cx1; cx++) bloqueado[cy * COLS + cx] = 1;
}

function marcarCirculo(x, y, r) {
  const cx0 = clamp(Math.floor((x - r) / CELDA), 0, COLS - 1);
  const cx1 = clamp(Math.floor((x + r) / CELDA), 0, COLS - 1);
  const cy0 = clamp(Math.floor((y - r) / CELDA), 0, FILAS - 1);
  const cy1 = clamp(Math.floor((y + r) / CELDA), 0, FILAS - 1);
  const r2 = r * r;
  for (let cy = cy0; cy <= cy1; cy++) {
    const py = cy * CELDA + CELDA / 2;
    for (let cx = cx0; cx <= cx1; cx++) {
      const px = cx * CELDA + CELDA / 2;
      const dx = px - x,
        dy = py - y;
      if (dx * dx + dy * dy < r2) bloqueado[cy * COLS + cx] = 1;
    }
  }
}

function rejillaDesactualizada() {
  const muros = G.muros || [];
  const pilares = G.pilares || [];
  return (
    muros !== cacheMurosRef ||
    muros.length !== cacheNMuros ||
    pilares.length !== cacheNPilares
  );
}

function construirRejilla() {
  bloqueado.fill(0);
  for (const m of G.muros || [])
    marcarRect(m.x - MARGEN, m.y - MARGEN, m.w + MARGEN * 2, m.h + MARGEN * 2);
  for (const pl of G.pilares || []) marcarCirculo(pl.x, pl.y, pl.r + MARGEN);
  cacheMurosRef = G.muros;
  cacheNMuros = (G.muros || []).length;
  cacheNPilares = (G.pilares || []).length;
}

function diagonalLibre(cx, cy, nx, ny) {
  // vecino ortogonal (nx, cy) y (cx, ny) -- ambos tienen que estar
  // libres para permitir el paso en diagonal entre ellos.
  return !bloqueado[cy * COLS + nx] && !bloqueado[ny * COLS + cx];
}

function calcularFlowField() {
  dist.fill(-1);
  let qTail = 0;
  for (const p of vivos()) {
    const cx = clamp(Math.floor(p.x / CELDA), 0, COLS - 1);
    const cy = clamp(Math.floor(p.y / CELDA), 0, FILAS - 1);
    const i = cy * COLS + cx;
    if (bloqueado[i] || dist[i] !== -1) continue;
    dist[i] = 0;
    cola[qTail++] = i;
  }
  let qHead = 0;
  while (qHead < qTail) {
    const cur = cola[qHead++];
    const cx = cur % COLS,
      cy = (cur / COLS) | 0;
    const dCur = dist[cur];
    for (let k = 0; k < 8; k++) {
      const nx = cx + VX[k],
        ny = cy + VY[k];
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= FILAS) continue;
      const ni = ny * COLS + nx;
      if (bloqueado[ni] || dist[ni] !== -1) continue;
      if (k >= 4 && !diagonalLibre(cx, cy, nx, ny)) continue;
      dist[ni] = dCur + 1;
      cola[qTail++] = ni;
    }
  }
}

// Llamar una vez por frame desde core/loop.js, antes del bucle de
// enemigos. Reconstruye la rejilla de obstáculos solo si la sala
// cambió (nueva sala, pilar destruido/invocado, muro secreto revelado)
// y recalcula el flow field siempre (sigue a los jugadores moviéndose).
export function actualizarNavegacion() {
  if (rejillaDesactualizada()) construirRejilla();
  calcularFlowField();
}

// Dirección (ángulo, en radianes) desde (x,y) hacia la celda vecina más
// cercana al jugador alcanzable más próximo, más esa distancia de
// camino en píxeles aproximados. Si la celda está bloqueada o no hay
// ruta conocida, devuelve ang:null -- el llamador debe caer a un
// fallback (línea recta), nunca debe congelarse por esto.
export function obtenerRumbo(x, y) {
  const cx = clamp(Math.floor(x / CELDA), 0, COLS - 1);
  const cy = clamp(Math.floor(y / CELDA), 0, FILAS - 1);
  const i = cy * COLS + cx;
  const dCur = dist[i];
  if (bloqueado[i] || dCur === -1) return { ang: null, dist: Infinity };
  if (dCur === 0) return { ang: null, dist: 0 };
  let mejor = -1,
    mejorD = dCur;
  for (let k = 0; k < 8; k++) {
    const nx = cx + VX[k],
      ny = cy + VY[k];
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= FILAS) continue;
    const ni = ny * COLS + nx;
    if (bloqueado[ni]) continue;
    if (k >= 4 && !diagonalLibre(cx, cy, nx, ny)) continue;
    const dv = dist[ni];
    if (dv !== -1 && dv < mejorD) {
      mejorD = dv;
      mejor = ni;
    }
  }
  if (mejor === -1) return { ang: null, dist: dCur * CELDA };
  const mx = (mejor % COLS) * CELDA + CELDA / 2;
  const my = ((mejor / COLS) | 0) * CELDA + CELDA / 2;
  return { ang: Math.atan2(my - y, mx - x), dist: dCur * CELDA };
}
