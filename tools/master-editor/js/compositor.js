// --- Vista previa compuesta: cuerpo (referencia) + piernas + peto + casco + arma ---
// Vista de diseño simplificada: no reproduce el pivote exacto de mano/rotación
// del arma ni el anclaje por pies que tiene src/render/world.js (eso es render
// de gameplay real; esto es para colocar las piezas juntas al diseñarlas). El
// orden de dibujado sí es el mismo criterio que usa el juego.
import { piezaParaTier, CAPA_A_ANCLA } from "./personajes.js";

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
export function dibujarComposicion(canvas, personaje, tierActivo, capaActiva) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!personaje) return;

  // El cuerpo fija la escala común (su propio "contain" contra el lienzo) y
  // se dibuja siempre de referencia, sin recolorear ni desplazar. Sus
  // anclajes marcados (cabeza/torso/cadera/mano) se convierten aquí a
  // coordenadas de lienzo para que las demás capas se puedan enganchar.
  let escalaComun = 1, cuerpoRect = null;
  const anclasCuerpoCanvas = {};
  const cuerpo = personaje.capas.cuerpo;
  if (cuerpo && cuerpo.pieza) {
    const b = cuerpo.pieza;
    const img = obtenerImagen(b.src);
    if (img.complete && img.naturalWidth > 0) {
      escalaComun = Math.min(canvas.width / b.sw, canvas.height / b.sh);
      const w = b.sw * escalaComun, h = b.sh * escalaComun;
      cuerpoRect = { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h };
      ctx.drawImage(img, b.sx, b.sy, b.sw, b.sh, cuerpoRect.x, cuerpoRect.y, w, h);
      for (const nombreAncla in cuerpo.anclas) {
        const a = cuerpo.anclas[nombreAncla];
        if (a) anclasCuerpoCanvas[nombreAncla] = { x: cuerpoRect.x + a.x * escalaComun, y: cuerpoRect.y + a.y * escalaComun };
      }
    } else {
      img.onload = () => dibujarComposicion(canvas, personaje, tierActivo, capaActiva);
    }
  }

  let rectActivo = capaActiva === "cuerpo" ? cuerpoRect : null;

  for (const nombreCapa of ORDEN_CAPAS) {
    const capa = personaje.capas[nombreCapa];
    if (!capa) continue;
    const { pieza, esFallback } = piezaParaTier(personaje, nombreCapa, tierActivo);
    if (!pieza) continue;
    const img = obtenerImagen(pieza.src);
    if (!img.complete || img.naturalWidth === 0) {
      img.onload = () => dibujarComposicion(canvas, personaje, tierActivo, capaActiva);
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
