// Reescala píxel-art con nearest-neighbor (sin difuminar) -- para tiles de
// baja resolución (16px nativos del tileset de mazmorra) que se muestran
// más grandes en el lienzo real. Compartido entre render/sprites.js (el
// juego) y el Telar de Mazmorras (tools/level-editor/), para que ambos
// muestren el mismo tileset al mismo tamaño real -- antes el editor usaba
// las imágenes en su resolución nativa sin reescalar, así que el patrón de
// pared se veía más fino/denso en el editor que en el juego (cada
// repetición del patrón, 16px en vez de 48px).
export function upscaleNN(img, factor) {
  const c = document.createElement("canvas");
  c.width = img.width * factor;
  c.height = img.height * factor;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
