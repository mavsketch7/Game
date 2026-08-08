// --- Validación de reglas de diseño de salas ---
import { ANCLAS_PUERTA, HUECO_PUERTA, posPuertaPx } from "./config.js";

const IDS_PUERTA = new Set(["puerta", "secreta"]);

// Devuelve la lista de anclas (N/S/E/O) que NO tienen un tile de referencia
// "puerta"/"secreta" colocado encima. Es un aviso rápido para quien diseña
// (recordatorio visual); la comprobación que de verdad importa para el motor
// es anclasBloqueadas() más abajo, que mira la geometría real de los muros.
export function puertasFaltantes(sala) {
  return ANCLAS_PUERTA.filter(a => {
    const celda = sala.grid[a.r][a.c];
    return !IDS_PUERTA.has(celda.elem);
  });
}

function solapan(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Comprueba, para cada ancla, si algún rectángulo de muro (ya fusionado, ver
// exportar-json.js) invade la ventana de HUECO_PUERTA px centrada en la
// posición real de la puerta (misma regla que agregarMurosPerimetro() en el
// motor). Si una sala bloquea un ancla, esa dirección nunca podrá usarse
// como puerta en el juego real, aunque el editor la deje pintar sin avisar
// con puertasFaltantes().
export function anclasBloqueadas(muros) {
  const mitad = HUECO_PUERTA / 2;
  return ANCLAS_PUERTA.filter(a => {
    const p = posPuertaPx(a.dir);
    const ventana = { x: p.x - mitad, y: p.y - mitad, w: HUECO_PUERTA, h: HUECO_PUERTA };
    return muros.some(m => solapan(m, ventana));
  });
}
