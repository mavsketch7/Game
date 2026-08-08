// --- Renderizado del Lienzo ---
import { COLS, ROWS, CELL, MARGEN, ANCLAS_PUERTA, POR_ID } from "./config.js";
import { estado, salaActiva } from "./state.js";

export function varColor(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// sinFondo: no rellenar el fondo de la celda (se usa para dibujar la capa "elemento"
// encima de la capa "suelo" ya dibujada, sin tapar el suelo bajo ella).
export function dibujarTile(ctx, idTipo, x, y, ancho, alto, sinFondo) {
  const t = POR_ID[idTipo];
  if (!t) return;

  if (!sinFondo) {
    // Relleno de fondo (siempre para tapar huecos)
    ctx.fillStyle = (t.id === "vacio") ? t.color : "#1d1929";
    ctx.fillRect(x, y, ancho, alto);
  }

  // Pincel animado (ver "Modo animación" en picker.js): elige el frame según el reloj
  // real, sin depender de que main.js reprograme redibujados -- solo hace falta que
  // algo repinte el lienzo de vez en cuando mientras haya un frame distinto que mostrar
  // (ver el ticker en main.js). Cada frame ya viene normalizado a TAM_MAX_RECORTE
  // cuadrado, así que se dibuja entero, sin sx/sy/sw/sh.
  if (t.frames && t.frames.length > 1) {
    const idx = Math.floor((Date.now() / 1000) * (t.fps || 6)) % t.frames.length;
    const frame = t.frames[idx];
    if (frame && frame.complete && frame.naturalWidth > 0) {
      ctx.drawImage(frame, x, y, ancho, alto);
      return;
    }
  }

  // Si tiene imagen y está cargada
  if (t.img && t.img.complete && t.img.naturalWidth > 0) {
    // sw/sh en 0 o sin definir => usar el sprite completo (assets sueltos, no spritesheet).
    const sw = t.sw || t.img.naturalWidth, sh = t.sh || t.img.naturalHeight;
    ctx.drawImage(t.img, t.sx || 0, t.sy || 0, sw, sh, x, y, ancho, alto);
  } else if (t.id !== "vacio") {
    // Fallback visual si falla la imagen o no tiene
    ctx.fillStyle = t.color;
    ctx.fillRect(x, y, ancho, alto);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.ch, x + ancho / 2, y + alto / 2);
  }
}

export function dibujar(cv, cx) {
  // Fondo general
  cx.fillStyle = varColor("--noche");
  cx.fillRect(0, 0, cv.width, cv.height);

  const g = salaActiva().grid;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const celda = g[r][c];
      dibujarTile(cx, celda.base, c * CELL, r * CELL, CELL, CELL);
      if (celda.elem) dibujarTile(cx, celda.elem, c * CELL, r * CELL, CELL, CELL, true);
    }
  }

  // Dibujar previsualización de rectángulo
  if (estado.pintando && estado.toolActiva === "rect" && estado.inicioRect) {
    const rMin = Math.min(estado.inicioRect.r, estado.fantasma.r);
    const rMax = Math.max(estado.inicioRect.r, estado.fantasma.r);
    const cMin = Math.min(estado.inicioRect.c, estado.fantasma.c);
    const cMax = Math.max(estado.inicioRect.c, estado.fantasma.c);

    cx.globalAlpha = 0.6;
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        dibujarTile(cx, estado.tipoActivo, c * CELL, r * CELL, CELL, CELL);
      }
    }
    cx.globalAlpha = 1.0;
    cx.strokeStyle = "#e9b45c";
    cx.lineWidth = 2;
    cx.strokeRect(cMin * CELL, rMin * CELL, (cMax - cMin + 1) * CELL, (rMax - rMin + 1) * CELL);
  }
  // Cursor Fantasma
  else if (!estado.pintando && estado.fantasma.r >= 0 && estado.fantasma.c >= 0) {
    cx.globalAlpha = 0.5;
    dibujarTile(cx, estado.tipoActivo, estado.fantasma.c * CELL, estado.fantasma.r * CELL, CELL, CELL);
    cx.globalAlpha = 1.0;
    cx.strokeStyle = "white";
    cx.lineWidth = 1;
    cx.strokeRect(estado.fantasma.c * CELL, estado.fantasma.r * CELL, CELL, CELL);
  }

  // Rejilla superpuesta
  cx.strokeStyle = "rgba(255,255,255,0.05)";
  cx.lineWidth = 1;
  cx.beginPath();
  for (let c = 0; c <= COLS; c++) { cx.moveTo(c * CELL, 0); cx.lineTo(c * CELL, cv.height); }
  for (let r = 0; r <= ROWS; r++) { cx.moveTo(0, r * CELL); cx.lineTo(cv.width, r * CELL); }
  cx.stroke();

  // Margen seguro (referencia visual)
  cx.strokeStyle = "rgba(233,180,92,0.5)";
  cx.setLineDash([5, 5]);
  cx.lineWidth = 2;
  cx.strokeRect(MARGEN, MARGEN, cv.width - MARGEN * 2, cv.height - MARGEN * 2);
  cx.setLineDash([]);

  // Anclas de Puerta
  cx.strokeStyle = "#e9b45c";
  cx.lineWidth = 3;
  for (const a of ANCLAS_PUERTA) {
    const px = a.c * CELL + CELL / 2, py = a.r * CELL + CELL / 2;
    cx.beginPath();
    cx.moveTo(px - 14, py); cx.lineTo(px + 14, py);
    cx.moveTo(px, py - 14); cx.lineTo(px, py + 14);
    cx.stroke();
  }
}
