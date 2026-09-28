// Decisión de "esquina real" vs remate liso para un tramo de muro --
// extraído de render/world.js para que la vista previa del Telar de
// Mazmorras (tools/level-editor/) use EXACTAMENTE el mismo criterio que
// el motor al renderizar: antes cada uno tenía su propia lógica (el
// editor solo pintaba un remate liso por celda) y una sala diseñada a
// mano podía verse distinta en el juego real de lo que el diseñador vio
// al exportarla (reportado: "cambia formas que se han aplicado
// manualmente... rompe la estética"). Módulo puro, sin canvas ni estado
// del juego, para que ambos lados (motor real y editor standalone) lo
// puedan importar sin arrastrar dependencias.
export const UMBRAL_LARGO_BORDE = 80;
// Tolerancia en px para decidir si dos rectángulos de muro "se tocan" en
// una esquina -- los rectángulos no guardan ninguna relación de vecindad,
// así que la única forma de saber si el extremo de un muro horizontal es
// una esquina real (y no un hueco de puerta) es comprobar si hay un muro
// VERTICAL pegado justo ahí.
export const TOQUE_BORDE_TOL = 4;
// Alto en pantalla de cada hilada (hilada superior / zócalo) al dibujar un
// muro con esquina real -- piezas de 16px nativos, ×3 con upscaleNN (ver
// render/pixelArt.js), igual en el motor y en el editor.
export const ALTO_HILADA_BORDE = 48;

// Devuelve un Map rect -> { horizontal, esqIzq?, esqDer? }. `muros` debe
// incluir TODOS los rectángulos que se tocan entre sí en la sala (en el
// motor real, esto es G.muros completo, incluyendo los muros secretos --
// ver systems/floorgen.js -- porque un muro secreto cuenta igual como
// vecino aunque se dibuje distinto).
export function calcularMetaBordes(muros) {
  const meta = new Map();
  for (const m of muros) {
    const horizontal = m.w >= m.h;
    if (!horizontal) { meta.set(m, { horizontal }); continue; }
    let esqIzq = false, esqDer = false;
    for (const o of muros) {
      if (o === m || o.w >= o.h) continue; // solo cuenta un muro vertical
      // Solape/contacto en Y en CUALQUIER punto de la altura de m, no solo
      // en su fila superior: un muro horizontal que hace de borde INFERIOR
      // de una sala se junta con su vertical por la fila de ARRIBA de m
      // (m.y), pero uno que hace de borde SUPERIOR se junta por la fila de
      // ABAJO (m.y+m.h) -- sin saber cuál es cuál, comprobar el rango
      // completo cubre los dos casos.
      if (o.y > m.y + m.h + TOQUE_BORDE_TOL || o.y + o.h < m.y - TOQUE_BORDE_TOL) continue;
      // El vertical no siempre está pegado por fuera (abutment puro, sin
      // solape) -- lo normal en las formas de este juego es que el bloque
      // en L comparta la esquina (el vertical arranca en la MISMA x que
      // el borde de m, no justo después). Así que basta con que el rango
      // en X del vertical CUBRA la columna del borde de m, no que termine
      // exactamente ahí.
      if (o.x <= m.x + TOQUE_BORDE_TOL && o.x + o.w >= m.x + TOQUE_BORDE_TOL) esqIzq = true;
      if (o.x <= m.x + m.w - TOQUE_BORDE_TOL && o.x + o.w >= m.x + m.w - TOQUE_BORDE_TOL) esqDer = true;
    }
    meta.set(m, { horizontal, esqIzq, esqDer });
  }
  return meta;
}
