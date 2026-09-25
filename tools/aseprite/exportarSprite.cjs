// Exporta un .aseprite simple (sin separar armadura/fx) a una tira
// horizontal PNG a tamaño nativo, componiendo TODAS las capas visibles.
// Uso: node tools/aseprite/exportarSprite.cjs <archivo.aseprite> <salida.png>
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { leerAse, componer } = require("./aseLeer.cjs");

const [, , ruta, salida] = process.argv;
if (!ruta || !salida) {
  console.error("Uso: node exportarSprite.cjs <archivo.aseprite> <salida.png>");
  process.exit(1);
}
const ase = leerAse(ruta);
const capas = ase.capas.map((c, i) => i).filter((i) => ase.capas[i].visible);
const F = ase.frames.length;
const img = new PNG({ width: ase.w * F, height: ase.h });
for (let f = 0; f < F; f++) componer(ase, f, capas, img, f * ase.w);
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, PNG.sync.write(img));
console.log(`${salida}: ${ase.w}x${ase.h} x${F} frames -> ${img.width}x${img.height}`);
console.log(" tags:", ase.tags.map((t) => `${t.nombre}[${t.desde}-${t.hasta}]`).join(" "));
