// --- Vista previa compuesta: cuerpo (referencia) + piernas + peto + casco + arma ---
// Vista de diseño simplificada: no reproduce el pivote exacto de mano/rotación
// del arma ni el anclaje por pies que tiene src/render/world.js (eso es render
// de gameplay real; esto es para colocar las piezas juntas al diseñarlas). El
// orden de dibujado sí es el mismo criterio que usa el juego.
import { piezaParaTier, CAPA_A_ANCLA, estadoCuerpo } from "./personajes.js";

export const RAREZAS = [
  { n: "Común", col: "#b9b2c6" },
  { n: "Raro", col: "#6fb3e8" },
  { n: "Épico", col: "#c084f0" },
  { n: "Legendario", col: "#e9b45c" },
  { n: "Mítico", col: "#ff5a36" },
];

// Recolorea conservando el sombreado del pixel art (idéntico a teñirSprite()
// en src/render/sprites.js, portado tal cual -- ver ese archivo para el porqué
// de cada paso: blend "hue" + re-recorte con "destination-in").
function teñirSprite(img, color) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "hue";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(img, 0, 0);
  return c;
}

const cacheImagenes = new Map(); // dataURL -> HTMLImageElement
const cacheTeñido = new Map(); // dataURL+color -> canvas

function obtenerImagen(src) {
  if (cacheImagenes.has(src)) return cacheImagenes.get(src);
  const img = new Image();
  img.src = src;
  cacheImagenes.set(src, img);
  return img;
}

function obtenerTeñido(img, src, color) {
  const clave = src + "|" + color;
  if (cacheTeñido.has(clave)) return cacheTeñido.get(clave);
  const t = teñirSprite(img, color);
  cacheTeñido.set(clave, t);
  return t;
}

const ORDEN_CAPAS = ["piernas", "peto", "casco", "arma"]; // cuerpo se dibuja aparte, siempre primero

// Frame a mostrar de un estado del cuerpo en el instante tMs -- sin estado
// persistido (igual que el level-editor: Math.floor((Date.now()/1000)*fps) %
// frames.length en tools/level-editor/js/render.js), así que reproducir no
// requiere guardar "frame actual" en ningún sitio.
function frameCuerpoEnTiempo(est, tMs) {
  if (!est.frames.length) return null;
  if (est.frames.length === 1) return est.frames[0];
  const idx = Math.floor((tMs / 1000) * (est.fps || 8)) % est.frames.length;
  return est.frames[idx];
}

// Devuelve { x, y, w, h } del rectángulo ya transformado donde se dibuja
// `pieza` de `capa` -- se reutiliza tanto para dibujar como para saber, en
// panel.js, sobre qué capa cae un arrastre.
//
// Si `capa.ancla` y `anclaCuerpoCanvas` existen los dos, el punto marcado en
// la pieza (p.ej. la empuñadura del arma) se alinea exactamente sobre el
// punto marcado en el cuerpo (p.ej. la mano) -- offset queda como ajuste fino
// encima de ese anclaje. Si falta cualquiera de los dos, cae al centrado de
// siempre (comportamiento previo, sigue funcionando para piezas sin marcar).
export function rectanguloCapa(canvas, capa, pieza, escalaComun, anclaCuerpoCanvas) {
  const escala = escalaComun * (capa.escala || 1);
  const w = pieza.sw * escala, h = pieza.sh * escala;
  const offX = capa.offset ? capa.offset.x : 0, offY = capa.offset ? capa.offset.y : 0;
  if (capa.ancla && anclaCuerpoCanvas) {
    const x = anclaCuerpoCanvas.x - capa.ancla.x * escala + offX;
    const y = anclaCuerpoCanvas.y - capa.ancla.y * escala + offY;
    return { x, y, w, h };
  }
  const x = (canvas.width - w) / 2 + offX;
  const y = (canvas.height - h) / 2 + offY;
  return { x, y, w, h };
}

// tierActivo/capaActiva: para resaltar con un contorno la capa que se movería
// al arrastrar sobre el lienzo (ver panel.js) -- puramente visual.
// estadoAnimActivo/tMs: qué estado del cuerpo se previsualiza y en qué
// instante (para elegir el frame en bucle, ver frameCuerpoEnTiempo arriba).
export function dibujarComposicion(canvas, personaje, tierActivo, capaActiva, estadoAnimActivo = "idle", tMs = 0) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!personaje) return;

  // La escala común y los anclajes SIEMPRE se derivan del frame de
  // referencia de "idle" (frame 0), fijo, aunque se esté reproduciendo Run/
  // Attack en la vista previa -- así el arma/armadura no cambian de tamaño
  // al alternar de estado (un frame de ataque puede tener otra bbox que el
  // idle). El cuerpo se dibuja siempre primero, sin recolorear ni desplazar.
  let escalaComun = 1, cuerpoRectRef = null, cuerpoRectMostrado = null;
  const anclasCuerpoCanvas = {};
  const cuerpo = personaje.capas.cuerpo;
  const frameRef = estadoCuerpo(personaje, "idle").frames[0] || null;
  const estadoMostrado = estadoCuerpo(personaje, estadoAnimActivo);
  // Si el estado que se está previsualizando aún no tiene frames propios,
  // cae al de referencia (idle) -- mismo espíritu que el fallback de tier.
  const frameMostrado = frameCuerpoEnTiempo(estadoMostrado, tMs) || frameRef;
  const frameParaEscala = frameRef || frameMostrado;

  if (cuerpo && frameParaEscala) {
    const imgRef = obtenerImagen(frameParaEscala.src);
    if (imgRef.complete && imgRef.naturalWidth > 0) {
      escalaComun = Math.min(canvas.width / frameParaEscala.sw, canvas.height / frameParaEscala.sh);
      const w = frameParaEscala.sw * escalaComun, h = frameParaEscala.sh * escalaComun;
      cuerpoRectRef = { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h };
      for (const nombreAncla in cuerpo.anclas) {
        const a = cuerpo.anclas[nombreAncla];
        if (a) anclasCuerpoCanvas[nombreAncla] = { x: cuerpoRectRef.x + a.x * escalaComun, y: cuerpoRectRef.y + a.y * escalaComun };
      }
    } else {
      imgRef.onload = () => dibujarComposicion(canvas, personaje, tierActivo, capaActiva, estadoAnimActivo, tMs);
    }
  }

  if (frameMostrado) {
    const img = obtenerImagen(frameMostrado.src);
    if (img.complete && img.naturalWidth > 0) {
      const w = frameMostrado.sw * escalaComun, h = frameMostrado.sh * escalaComun;
      cuerpoRectMostrado = { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h };
      ctx.drawImage(img, frameMostrado.sx, frameMostrado.sy, frameMostrado.sw, frameMostrado.sh, cuerpoRectMostrado.x, cuerpoRectMostrado.y, w, h);
    } else {
      img.onload = () => dibujarComposicion(canvas, personaje, tierActivo, capaActiva, estadoAnimActivo, tMs);
    }
  }

  let rectActivo = capaActiva === "cuerpo" ? cuerpoRectMostrado : null;

  for (const nombreCapa of ORDEN_CAPAS) {
    const capa = personaje.capas[nombreCapa];
    if (!capa) continue;
    const { pieza, esFallback } = piezaParaTier(personaje, nombreCapa, tierActivo);
    if (!pieza) continue;
    const img = obtenerImagen(pieza.src);
    if (!img.complete || img.naturalWidth === 0) {
      img.onload = () => dibujarComposicion(canvas, personaje, tierActivo, capaActiva, estadoAnimActivo, tMs);
      continue;
    }
    const fuente = esFallback ? obtenerTeñido(img, pieza.src, RAREZAS[tierActivo].col) : img;
    const anclaCuerpo = anclasCuerpoCanvas[CAPA_A_ANCLA[nombreCapa]];
    const r = rectanguloCapa(canvas, capa, pieza, escalaComun, anclaCuerpo);
    ctx.drawImage(fuente, pieza.sx, pieza.sy, pieza.sw, pieza.sh, r.x, r.y, r.w, r.h);
    if (nombreCapa === capaActiva) rectActivo = r;
  }

  // Marca visualmente los anclajes del cuerpo ya colocados (puntos pequeños),
  // para ver de un vistazo cuáles faltan mientras se editan las capas.
  if (capaActiva === "cuerpo") {
    ctx.fillStyle = "#ff5a36";
    for (const nombreAncla in anclasCuerpoCanvas) {
      const { x, y } = anclasCuerpoCanvas[nombreAncla];
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (rectActivo) {
    ctx.strokeStyle = "#e9b45c";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(rectActivo.x, rectActivo.y, rectActivo.w, rectActivo.h);
    ctx.setLineDash([]);
  }
}
