// --- GESTIÓN DEL ESTADO ---
// Cada celda tiene dos capas: { base: idTipo, elem: idTipo|null }.
// "base" siempre está ocupada (por defecto "vacio"); "elem" es opcional y se dibuja encima.
import { COLS, ROWS, POR_ID } from "./config.js";

export function celdaVacia() {
  return { base: "vacio", elem: null };
}

export function crearGridVacia() {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, celdaVacia));
}

export function clonarGrid(g) {
  return g.map(fila => fila.map(celda => ({ ...celda })));
}

export function capaDe(idTipo) {
  const t = POR_ID[idTipo];
  return t ? t.capa : "elemento";
}

export function crearSalaVacia(nombre) {
  return { nombre, nota: "", grid: crearGridVacia(), historial: [], indiceHistoria: -1 };
}

export const estado = {
  salas: [crearSalaVacia("Sala Inicial")],
  salaActual: 0,
  tipoActivo: "muro",
  toolActiva: "pincel", // pincel, rect, cubo
  pintando: false,
  inicioRect: null, // {r, c}
  fantasma: { r: -1, c: -1 },
  // Suple el clic derecho (que no existe en pantallas táctiles): con esto activo,
  // pintar borra en vez de dibujar, igual que mantener pulsado el botón derecho.
  modoBorrar: false,
};

export function salaActiva() {
  return estado.salas[estado.salaActual];
}

// --- Sistema de Historial (Deshacer/Rehacer) ---
export function guardarEstado() {
  const s = salaActiva();
  // Borrar futuros rehechos si se hace un cambio nuevo
  s.historial = s.historial.slice(0, s.indiceHistoria + 1);
  // Clonar matriz
  s.historial.push(clonarGrid(s.grid));
  if (s.historial.length > 30) s.historial.shift(); // Limite 30 pasos
  else s.indiceHistoria++;
}

export function deshacer() {
  const s = salaActiva();
  if (s.indiceHistoria > 0) {
    s.indiceHistoria--;
    s.grid = clonarGrid(s.historial[s.indiceHistoria]);
    return true;
  }
  return false;
}

export function rehacer() {
  const s = salaActiva();
  if (s.indiceHistoria < s.historial.length - 1) {
    s.indiceHistoria++;
    s.grid = clonarGrid(s.historial[s.indiceHistoria]);
    return true;
  }
  return false;
}
