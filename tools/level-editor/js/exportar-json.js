// --- Exportación al formato JSON que consume el motor del juego ---
// Convierte la grid de celdas (40x25) del editor en las mismas estructuras que
// src/systems/floorgen.js construye a mano hoy para la sala "arsenal":
// rectángulos de muro en píxeles + listas de puntos (enemigos/objetos/pilares).
import { COLS, ROWS, CELL, POR_ID } from "./config.js";
import { anclasBloqueadas } from "./validacion.js";

// Agrupa las celdas contiguas (capa "elemento") cuyo id esté en idsObjetivo en el
// menor número de rectángulos posible: primero runs horizontales por fila, luego
// fusión vertical de runs con el mismo rango de columnas. Es el mismo enfoque que
// se usa para convertir un tilemap en rectángulos de colisión.
function fusionarCeldas(grid, idsObjetivo) {
  const idsSet = new Set(idsObjetivo);
  const visitado = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const rects = [];

  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      if (visitado[r][c] || !idsSet.has(grid[r][c].elem)) { c++; continue; }

      let c2 = c;
      while (c2 < COLS && !visitado[r][c2] && idsSet.has(grid[r][c2].elem)) c2++;

      let r2 = r + 1;
      filas:
      while (r2 < ROWS) {
        for (let cc = c; cc < c2; cc++) {
          if (visitado[r2][cc] || !idsSet.has(grid[r2][cc].elem)) break filas;
        }
        r2++;
      }

      for (let rr = r; rr < r2; rr++) for (let cc = c; cc < c2; cc++) visitado[rr][cc] = true;
      rects.push({ x: c * CELL, y: r * CELL, w: (c2 - c) * CELL, h: (r2 - r) * CELL });
      c = c2;
    }
  }
  return rects;
}

// Recorre la grid y devuelve los puntos de contenido (enemigos/objetos/pilares)
// agrupados por categoría, usando el centro de cada celda como posición.
function puntosDeContenido(grid) {
  const puntos = { enemigos: [], objetos: [], pilares: [] };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idElem = grid[r][c].elem;
      if (!idElem) continue;
      const t = POR_ID[idElem];
      if (!t || t.capaExport !== "punto") continue;

      const punto = { tipo: t.motorTipo, x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
      if (t.categoria === "enemigo") puntos.enemigos.push(punto);
      else if (t.categoria === "pilar") puntos.pilares.push({ x: punto.x, y: punto.y, destructible: true });
      else puntos.objetos.push(punto);
    }
  }
  return puntos;
}

// Construye el JSON de una sala para el motor. Devuelve también `avisos` con las
// direcciones cuya ancla de puerta queda bloqueada por muros (ver validacion.js).
export function exportarSalaJSON(sala) {
  const muros = fusionarCeldas(sala.grid, ["muro"]);
  const secretos = fusionarCeldas(sala.grid, ["secreta"]).map(m => ({ ...m, secreto: true }));
  const todosMuros = [...muros, ...secretos];
  const { enemigos, objetos, pilares } = puntosDeContenido(sala.grid);

  const json = {
    id: sala.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "sala",
    nombre: sala.nombre,
    muros: todosMuros,
    objetos,
    enemigos,
    pilares,
  };

  return { json, avisos: anclasBloqueadas(todosMuros) };
}

export function exportarSalasJSON(salas) {
  return salas.map(exportarSalaJSON);
}
