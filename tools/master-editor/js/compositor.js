// --- Vista previa compuesta: cuerpo + piernas + peto + casco + arma ---
// Vista de diseño simplificada: cada capa se centra y ajusta ("contain") al
// lienzo de forma independiente -- no reproduce el pivote exacto de mano/
// rotación del arma ni el anclaje por pies que tiene src/render/world.js
// (eso es render de gameplay real; esto es para ver las piezas juntas al
// diseñarlas). El orden de dibujado sí es el mismo criterio que usa el juego.
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

const cacheImagenes = new Map(); // dataURL -> HTMLImageElement (evita recrear en cada frame)

function obtenerImagen(src) {
  if (cacheImagenes.has(src)) return cacheImagenes.get(src);
  const img = new Image();
  img.src = src;
  cacheImagenes.set(src, img);
  return img;
}

const ORDEN_CAPAS = ["cuerpo", "piernas", "peto", "casco", "arma"];
const CAPAS_TEÑIBLES = new Set(["arma", "casco", "peto", "piernas"]); // el cuerpo no cambia con la rareza

function dibujarCapaContain(ctx, img, sx, sy, sw, sh, cw, ch) {
  const escala = Math.min(cw / sw, ch / sh);
  const w = sw * escala, h = sh * escala;
  ctx.drawImage(img, sx, sy, sw, sh, (cw - w) / 2, (ch - h) / 2, w, h);
}

export function dibujarComposicion(canvas, personaje, rarezaIdx) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!personaje) return;

  for (const capa of ORDEN_CAPAS) {
    const datos = personaje.capas[capa];
    if (!datos) continue;
    const img = obtenerImagen(datos.src);
    if (!img.complete || img.naturalWidth === 0) {
      img.onload = () => dibujarComposicion(canvas, personaje, rarezaIdx); // reintenta cuando cargue
      continue;
    }
    const rareza = RAREZAS[rarezaIdx] || RAREZAS[0];
    const fuente = (CAPAS_TEÑIBLES.has(capa) && rarezaIdx > 0) ? teñirSprite(img, rareza.col) : img;
    dibujarCapaContain(ctx, fuente, datos.sx, datos.sy, datos.sw, datos.sh, canvas.width, canvas.height);
  }
}
