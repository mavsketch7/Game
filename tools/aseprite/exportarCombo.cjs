// Exporta un .aseprite de combo de ataque (ver COMBOS abajo) a las hojas que
// carga el juego, sin necesitar Aseprite instalado:
//   characters/<base>.png            cuerpo (capa "hero")
//   characters/<base>.json           anclas de mano "m-d"/"m-i" (formato del
//                                    plugin de hitboxes, un solo tag "todo")
//   characters/<base>_tiempos.json   golpes (tags que no son "idle"),
//                                    duración por frame y frame de impacto
//   characters/armor/<base>_{casco,peto,piernas}.png
//   characters/fx/<base>_fx.png      capas de fx del tajo
// Uso: node tools/aseprite/exportarCombo.cjs guerrero "C:\ruta\archivo.aseprite"
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { leerAse, componer } = require("./aseLeer.cjs");

const COMBOS = {
  guerrero: {
    base: "heroB_combo_guerrero_side",
    cuerpo: ["hero"],
    armadura: { casco: "helmet", peto: "armour-top", piernas: "armour-bott" },
    fx: ["Layer 3", "fx-espada"],
  },
  picaro: {
    base: "heroB_combo_picaro_side",
    cuerpo: ["hero"],
    armadura: { casco: "casco6", peto: "peto6", piernas: "piernas6" },
    fx: ["fx-dagas"],
  },
};

const [, , rol, ruta] = process.argv;
const cfg = COMBOS[rol];
if (!cfg || !ruta) {
  console.error("Uso: node exportarCombo.cjs <" + Object.keys(COMBOS).join("|") + "> <archivo.aseprite>");
  process.exit(1);
}
const ase = leerAse(ruta);
const idx = (nombres) => nombres.map((n) => {
  const i = ase.capas.findIndex((c) => c.nombre === n);
  if (i < 0) throw new Error(`Capa "${n}" no existe en ${ruta}`);
  return i;
});
const F = ase.frames.length;
const dirChars = path.join(__dirname, "../../public/assets/sprites/characters");
fs.mkdirSync(path.join(dirChars, "armor"), { recursive: true });
fs.mkdirSync(path.join(dirChars, "fx"), { recursive: true });

function tira(capas) {
  const img = new PNG({ width: ase.w * F, height: ase.h });
  for (let f = 0; f < F; f++) componer(ase, f, capas, img, f * ase.w);
  return img;
}
function hayPixeles(capas, f) {
  const t = new PNG({ width: ase.w, height: ase.h });
  componer(ase, f, capas, t);
  for (let i = 3; i < t.data.length; i += 4) if (t.data[i]) return true;
  return false;
}
// Caja de los píxeles opacos de una capa marcador en un frame (null si vacía).
function cajaMarcador(capa, f) {
  const t = new PNG({ width: ase.w, height: ase.h });
  componer(ase, f, [capa], t);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < ase.h; y++) for (let x = 0; x < ase.w; x++) {
    if (!t.data[(y * ase.w + x) * 4 + 3]) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
const guardar = (img, rel) => {
  fs.writeFileSync(path.join(dirChars, rel), PNG.sync.write(img));
  console.log("  " + rel);
};

guardar(tira(idx(cfg.cuerpo)), cfg.base + ".png");
for (const [pieza, capa] of Object.entries(cfg.armadura)) guardar(tira(idx([capa])), `armor/${cfg.base}_${pieza}.png`);
const capasFx = idx(cfg.fx);
guardar(tira(capasFx), `fx/${cfg.base}_fx.png`);

const hitboxes = ["m-d", "m-i"].map((nombre) => {
  const [capa] = idx([nombre]);
  const frames = [];
  for (let f = 0; f < F; f++) {
    const bounds = cajaMarcador(capa, f);
    if (bounds) frames.push({ frameIndex: f, bounds });
  }
  return { hitBoxName: nombre, tagData: [{ animationName: "todo", frames }] };
});
fs.writeFileSync(path.join(dirChars, cfg.base + ".json"), JSON.stringify(hitboxes));
console.log("  " + cfg.base + ".json");

// Golpes = tags que no son "idle", en orden de timeline. Impacto = primer
// frame del golpe con píxeles de fx (el momento en que se ve el tajo).
const golpes = ase.tags
  .filter((t) => t.nombre.toLowerCase() !== "idle")
  .map((t) => {
    let impacto = t.desde;
    while (impacto <= t.hasta && !hayPixeles(capasFx, impacto)) impacto++;
    if (impacto > t.hasta) impacto = Math.floor((t.desde + t.hasta) / 2);
    return { nombre: t.nombre, desde: t.desde, hasta: t.hasta, impacto };
  });
const tiempos = { durs: ase.frames.map((f) => f.dur), golpes };
fs.writeFileSync(path.join(dirChars, cfg.base + "_tiempos.json"), JSON.stringify(tiempos, null, 1));
console.log("  " + cfg.base + "_tiempos.json");
for (const g of golpes) {
  const ms = tiempos.durs.slice(g.desde, g.hasta + 1).reduce((a, b) => a + b, 0);
  console.log(`  golpe ${g.nombre}: frames ${g.desde}-${g.hasta}, impacto ${g.impacto}, ${ms}ms`);
}
