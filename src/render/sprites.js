// Auto-generated during the modularization refactor (2026-07-23).
import { H, W, cx } from "../core/canvas.js";
import { RAREZAS } from "../core/constants.js";
import { META, SKINS } from "../core/save.js";
import { G } from "../core/state.js";
import { M, keys } from "../systems/input.js";

// Real PNG files (extracted from the original inline base64 blobs) live in
// public/assets/sprites/. BASE_URL respects vite.config.js's `base: "./"`,
// so these resolve correctly both in dev and once wrapped for Electron/Capacitor.
function assetUrl(name) {
  return `${import.meta.env.BASE_URL}assets/sprites/${name}.png`;
}

const ASSET_SRC = {
        jefe_cerdo: assetUrl("jefe_cerdo"),
        suelo1: assetUrl("suelo1"),
        suelo2: assetUrl("suelo2"),
        pilar: assetUrl("pilar"),
      };

export const SHEETS = {};

let assetsListos = 0;

const assetsTotal = Object.keys(ASSET_SRC).length;

for (const k in ASSET_SRC) {
        const im = new Image();
        im.onload = () => {
          assetsListos++;
          window._sueloDirty = true;
        };
        im.src = ASSET_SRC[k];
        SHEETS[k] = im;
      }

export function assetOK(k) {
        return SHEETS[k] && SHEETS[k].complete && SHEETS[k].naturalWidth > 0;
      }

export function buildSprite(rows, pal, esc) {
        esc = esc || 3;
        const w = rows[0].length,
          h = rows.length;
        const c = document.createElement("canvas");
        c.width = w * esc;
        c.height = h * esc;
        const g = c.getContext("2d");
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const col = pal[rows[y][x]];
            if (col) {
              g.fillStyle = col;
              g.fillRect(x * esc, y * esc, esc, esc);
            }
          }
        return c;
      }

export const HERO_ROWS = [
        "....KKKK....",
        "...KHHHHK...",
        "..KHHHHHHK..",
        "..KHHHHHHK..",
        "..KSSSSSSK..",
        "..KSESSESK..",
        "..KSSSSSSK..",
        "...KBBBBK...",
        "..KBBBBBBK..",
        ".KSBBBBBBSK.",
        ".KSBGGGGBSK.",
        "..KBBBBBBK..",
        "..KLLKKLLK..",
        "..KLL..LLK..",
      ];

const ARMOR_ROWS = [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        ".....AA..AA.....", // hombreras
        "....AAAAAAAA....", // pechera alta
        "....A......A....", // deja ver el emblema del centro
        "....AAAAAAAA....", // pechera baja
        "................",
        "....AAAAAAAA....", // cinturon
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
      ];

// Arma equipada dibujada al bies sobre la espalda/torso (como una espada
// enfundada) en vez de "en la mano" — así cabe siempre dentro de la misma
// rejilla de 16x20 sin necesitar espacio extra a los lados del cuerpo.
const WEAPON_ROWS = [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "...W............", // pomo, hombro izq.
        "...WW...........",
        "..WWWW..........", // guarda cruzada
        "....WW..........",
        ".....WW.........",
        "......WW........",
        ".......WW.......", // punta hacia la cadera dcha.
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
      ];

// Accesorio equipado: un pequeño dije/gema brillando en el cuello.
const ACCESSORY_ROWS = [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "......NN........",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
      ];

const SOMBRA_ROWS = [
        "...KKKKKK...",
        "..KDDDDDDK..",
        ".KDDDDDDDDK.",
        ".KDWDDDDWDK.",
        ".KDDDDDDDDK.",
        ".KDDDKKDDDK.",
        ".KDDDDDDDDK.",
        ".KDDDDDDDDK.",
        ".KDDDDDDDDK.",
        ".KDDKDDKDDK.",
        "..K..KK..K..",
      ];

const OJO_ROWS = [
        "...KKKK...",
        "..KVVVVK..",
        ".KVVWWVVK.",
        ".KVWIIWVK.",
        ".KVWIIWVK.",
        ".KVVWWVVK.",
        "..KVVVVK..",
        "...KKKK...",
        "..K.KK.K..",
      ];

const BRUTO_ROWS = [
        "...KKKKKK...",
        "..KMMMMMMK..",
        "..KMWMMWMK..",
        "..KMMMMMMK..",
        ".KMMMMMMMMK.",
        ".KMMGMMGMMK.",
        ".KMMMMMMMMK.",
        ".KMMMMMMMMK.",
        ".KMKMMMMKMK.",
        "..KMMMMMMK..",
        "..KMMKKMMK..",
        "..KMM..MMK..",
      ];

const CORONA_ROWS = ["G.G.G.G", "GGGGGGG", ".GGGGG."];

const VIAL_ROWS = [
        "..KK..",
        "..KK..",
        ".KRRK.",
        "KRRRRK",
        "KRRRRK",
        ".KKKK.",
      ];

const GEMA_ROWS = ["..KK..", ".KXXK.", "KXXXXK", ".KXXK.", "..KK.."];

const GOLEM_ROWS = [
        "..KKKKKKKK..",
        ".KMMMMMMMMK.",
        ".KMWMMMMWMK.",
        ".KMMMMMMMMK.",
        "KMMMMMMMMMMK",
        "KMMKMMMMKMMK",
        "KMMMMMMMMMMK",
        "KMMMMMMMMMMK",
        ".KMMMKKMMMK.",
        ".KMMK..KMMK.",
        ".KKK....KKK.",
      ];

const BOMBER_ROWS = [
        "....FF....",
        "...KKKK...",
        "..KBBBBK..",
        ".KBBBBBBK.",
        ".KBWBBWBK.",
        ".KBBBBBBK.",
        "..KBBBBK..",
        "...KKKK...",
      ];

const DUMMY_ROWS = [
        "..KKKK..",
        ".KDDDDK.",
        ".KDXDXDK".slice(0, 8),
        ".KDDDDK.",
        "..KKKK..",
        "KKKPPKKK",
        "..KPPK..",
        "..KPPK..",
        "..KPPK..",
        ".KKPPKK.",
        ".KPPPPK.",
      ];

const ESQUELETO_ROWS = [
        "...KWWWWWWK...",
        "....KWWWWK....",
        "K..KWEWWEWK...",
        "MK.KWDDDDWK...",
        "MK..KKKKKK....",
        "MKKKWWWWWWKK..",
        "MKWWWDWDWDWWK.",
        "MKWWWDWDWDWWK.",
        "MKWWWDWDWDWWK.",
        "MKWWWWWWWWWWK.",
        "MKWWWWWWWWKK..",
        "MKKKWWWWWWK...",
        "K..KWWKKWWK...",
        "...KWWKKWWK...",
        "...KWWKKWWK...",
        "...KWWKKWWK...",
        "...KWWKKWWK...",
        "....KK..KK....",
      ];

const SLIME_ROWS = [
        "...KKKKKKKK...",
        ".KKSSSSSSSSKK.",
        "KSSSSSSSSSSSSK",
        "KSHHSSSSSSSSSK",
        "SSHHSSSSSSSSSS",
        "SSSSKKSSKKSSSS",
        "SSSSKKSSKKSSSS",
        "SDDDDDDDDDDDDS",
        "KSSSSSSSSSSSSK",
        ".KKSSSSSSSSKK.",
      ];

const MONEDA_ROWS = [
        ".KKKK.",
        "KGGGGK",
        "KGWGGK",
        "KGGWGK",
        "KGGGGK",
        ".KKKK.",
      ];

const BARRIL_ROWS = [
        ".KKKKKK.",
        "KBBBBBBK",
        "KMMMMMMK",
        "KBBBBBBK",
        "KBBBBBBK",
        "KMMMMMMK",
        "KBBBBBBK",
        ".KKKKKK.",
      ];

const COFRE_ROWS = [
        ".KKKKKKKK.",
        "KGGGGGGGGK",
        "KBBBBBBBBK",
        "KBBBGGBBBK",
        "KBBBBBBBBK",
        ".KKKKKKKK.",
      ];

const COFRE_AB_ROWS = [
        "KGGGGGGGGK",
        "K........K",
        "KBBBBBBBBK",
        "KBBBBBBBBK",
        "KBBBBBBBBK",
        ".KKKKKKKK.",
      ];

const CRISTAL_ROWS = [
        "...K...",
        "..KCK..",
        ".KCCCK.",
        "KCCCCCK",
        "KCCCCCK",
        ".KCCCK.",
        "..KCK..",
        "...K...",
      ];

export const K = "#141020",
        PIEL = "#e8b98c";

export const PALS = {
        guerrero: {
          K,
          S: PIEL,
          E: K,
          H: "#8d94a3",
          B: "#7c2f3a",
          G: "#e9b45c",
          L: "#3a3450",
        },
        arquero: {
          K,
          S: PIEL,
          E: K,
          H: "#3f7d4f",
          B: "#5a7c46",
          G: "#c9a35a",
          L: "#4a3b2c",
        },
        mago: {
          K,
          S: PIEL,
          E: K,
          H: "#4a3f7a",
          B: "#5c4d99",
          G: "#c07be0",
          L: "#3a3450",
        },
        clerigo: {
          K,
          S: PIEL,
          E: K,
          H: "#e6e0d0",
          B: "#cfc7b2",
          G: "#e9b45c",
          L: "#8b8474",
        },
        picaro: {
          K,
          S: PIEL,
          E: K,
          H: "#463f5c",
          B: "#4a4460",
          G: "#c0505f",
          L: "#26232f",
        },
        druida: {
          K,
          S: PIEL,
          E: K,
          H: "#3a5a30",
          B: "#4a6a3a",
          G: "#8a6b43",
          L: "#3a3020",
        },
        mercader: {
          K,
          S: PIEL,
          E: K,
          H: "#5a2f6a",
          B: "#6a3f7a",
          G: "#ffd27f",
          L: "#3a2a45",
        },
      };

function sym(l) {
        return l + l.split("").reverse().join("");
      }

const PIERNAS_SEP = [
        sym(".....LLK"),
        sym(".....LLK"),
        sym(".....LLK"),
        sym("....LLLK"),
        sym("....LLLK"),
        sym("....KKK."),
      ];

const TUNICA = [
        sym("KBBBBBBB"),
        sym("KBBBBBBB"),
        sym("KBBBLLBB"),
        sym(".KBBLLBB"),
        sym("...KLLLL"),
        sym("...KKKKK"),
      ];

const GUERRERO_ROWS = [
        sym("......KH"), // penacho
        sym("...KHHHH"), // casco
        sym("..KHHHHH"), // casco ala
        sym("..KHHHHH"), // casco ala
        sym(".KHSSESS"), // cara+ojo
        sym(".KSSSSSS"), // mejilla
        sym("......SS"), // cuello
        sym("KGBBBBBB"), // hombreras (tachon dorado)
        sym(".KBBBBBB"), // torso
        sym(".KBBBBGG"), // emblema
        sym(".KBBBBBB"), // torso
        sym("KSBBBBBB"), // brazos
        sym(".KBBBGGG"), // cinturon
        sym("KBBBBBBB"), // faldar
        ...PIERNAS_SEP,
      ];

const ARQUERO_ROWS = [
        sym(".......H"),
        sym("......HH"),
        sym(".....HHH"),
        sym("....HHHH"),
        sym(".KHSSESS"),
        sym(".KSSSSSS"),
        sym("...KHHHH"),
        sym("..KBBBBB"),
        sym(".KBBBBBB"),
        sym(".KBBGGBB"),
        sym(".KBBBBBB"),
        sym("KSBBBBBB"),
        sym(".KBBBGGG"),
        sym("..KBBBBB"),
        ...PIERNAS_SEP,
      ];

const MAGO_ROWS = [
        sym(".......H"),
        sym(".......H"),
        sym("......HH"),
        sym(".....HHH"),
        sym("..KHHHHH"),
        sym(".KHSSESS"),
        sym(".KSSSSSS"),
        sym("...KHHHH"),
        sym("..KBBBBB"),
        sym(".KBBBBGG"),
        sym(".KBBBBBB"),
        sym("KSBBBBBB"),
        sym(".KBBBGGG"),
        sym("KBBBBBBB"),
        ...TUNICA,
      ];

const CLERIGO_ROWS = [
        sym("......GH"),
        sym(".....HHH"),
        sym("....HHHH"),
        sym("..KHHHHH"),
        sym(".KHSSESS"),
        sym(".KSSSSSS"),
        sym("...KHHHH"),
        sym("..KBBBBB"),
        sym(".KBBBGGB"),
        sym(".KBBBGGB"),
        sym(".KBBBBBB"),
        sym("KSBBBBBB"),
        sym(".KBBBGGG"),
        sym("KBBBBBBB"),
        ...TUNICA,
      ];

const PICARO_ROWS = [
        sym(".......H"),
        sym("......HH"),
        sym(".....HHH"),
        sym("....HHHH"),
        sym("...HHHHH"),
        sym(".KHSSESS"),
        sym("...KHHHH"),
        sym("..KBBBBB"),
        sym(".KBBBBBB"),
        sym(".KBBGGBB"),
        sym(".KBBBBBB"),
        sym("KSBBBBBB"),
        sym(".KBBBGGG"),
        sym("..KBBBBB"),
        ...PIERNAS_SEP,
      ];

const DRUIDA_ROWS = [
        sym(".H.....H"),
        sym(".H....HH"),
        sym("...HHHHH"),
        sym("..KHHHHH"),
        sym(".KHSSESS"),
        sym(".KSSSSSS"),
        sym("...KHHHH"),
        sym("..KBBBBB"),
        sym(".KBBBBGG"),
        sym(".KBBBBBB"),
        sym("KSBBBBBB"),
        sym(".KBBBGGG"),
        sym("KBBBBBBB"),
        sym("KBBBBBBB"),
        ...TUNICA,
      ];

export const ROWS_CLASE = {
        guerrero: GUERRERO_ROWS,
        arquero: ARQUERO_ROWS,
        mago: MAGO_ROWS,
        clerigo: CLERIGO_ROWS,
        picaro: PICARO_ROWS,
        druida: DRUIDA_ROWS,
      };

const ESC_HEROE = 2.5;

export const ESC_FORMA = { aguila: 1.4, lobo: 1.35, oso: 1.6 };

const LOBO_ROWS = [
        "..........KFFKKFFK",
        "..........KFFFFFFK",
        "..........KFFFFEFK",
        "..........KFFFFFFF",
        "..KKKKKKKKKFFFFFFF",
        ".KFFFFFFFFFFFFFFFK",
        "KDFFFFFFFFFFFFFFFK",
        "KDFFFFFFFFFFFFFFFK",
        ".KDDDDDDDDDDDDDDDK",
        "..KKDDKDDKKFFKFFK.",
        "...KDDKDDKKFFKFFK.",
        "...KDDKDDKKFFKFFK.",
        "...KDDKDDKKFFKFFK.",
        "....KK.KK..KK.KK..",
      ];

const OSO_ROWS = [
        "...........KBBKKBB",
        "...KKKKKKK.KBBBBBB",
        "..KBBBBBBBKKBBBBEB",
        ".KKBBBBBBBKKBBBBBB",
        "KBBBBBBBBBBBBBBBBB",
        "KBBBBBBBBGGBBBBBBK",
        "KBBBBBBBBBBBBBBBBK",
        "KBBBBBBBBBBBBBBBBK",
        "KDDDDDDDDDDDDDDDDK",
        ".KKKKKKKKKKKKKKKKK",
        "..KDDDKDDDKBBBKBBB",
        "..KDDDKDDDKBBBKBBB",
        "..KDDDKDDDKBBBKBBB",
        "...KKK.KKK.KKK.KKK",
      ];

const AGUILA_ROWS = [
        ".......KWWWWWWK.......",
        ".....KKKWWWWWWK.......",
        "....KWWWWWKKKK.KKKKK..",
        "..KKKWWWWWKKKKKWWWWWKK",
        ".KWWWWKKKWWWWWWWWEWWPP",
        ".KAAAAKKKWWWWWWWWWWWPK",
        ".KAAAAKAAWWWWWWWWWWWK.",
        "KKKKAAAAKWWWWWWWKKKK..",
        "AAAAAAAAKKKKPKKPK.....",
        "AAAAAKKK...KPKKPK.....",
        "KKKKK.......K..K......",
        "......................",
        "......................",
        "......................",
      ];

export const SPR_FORMAS = {
        lobo: buildSprite(LOBO_ROWS, { K, F: "#9099a8", D: "#6b7382", E: "#ffd27f" }),
        oso: buildSprite(OSO_ROWS, { K, B: "#7a5636", D: "#513c25", G: "#3a3453", E: "#ffb84d" }),
        aguila: buildSprite(AGUILA_ROWS, { K, W: "#f5f0e5", A: "#7a6142", E: "#141020", P: "#e9b45c" }),
      };

export const SPR = {
        acechador: buildSprite(SOMBRA_ROWS, { K, D: "#2a5a5f", W: "#7ffce8" }),
        esqueleto: buildSprite(ESQUELETO_ROWS, {
          K,
          W: "#e6ded0",
          E: "#ff5c5c",
          D: "#9a9080",
          M: "#b9b2c6",
        }),
        slime: buildSprite(SLIME_ROWS, {
          K,
          S: "#5ac48a",
          D: "#2f8a5c",
          H: "#a8f0c8",
        }),
        ojo: buildSprite(OJO_ROWS, {
          K,
          V: "#6a4b8f",
          W: "#efe8f5",
          I: "#d1545c",
        }),
        hechicero: buildSprite(HERO_ROWS, {
          K,
          S: "#9adba0",
          E: K,
          H: "#4a2258",
          B: "#3a1c48",
          G: "#c07be0",
          L: "#2a1435",
        }),
        bruto: buildSprite(BRUTO_ROWS, {
          K,
          M: "#4c5568",
          W: "#ff5c5c",
          G: "#e9b45c",
        }),
        brutoB: buildSprite(BRUTO_ROWS, {
          K,
          M: "#3a3157",
          W: "#ffd27f",
          G: "#e9b45c",
        }),
        golem: buildSprite(GOLEM_ROWS, { K, M: "#4a5a4c", W: "#ffb84d" }),
        bomber: buildSprite(BOMBER_ROWS, {
          K,
          B: "#2a2430",
          W: "#ff5c5c",
          F: "#ff9d3d",
        }),
        dummy: buildSprite(DUMMY_ROWS, {
          K,
          D: "#c9a778",
          X: "#8a6b43",
          P: "#6b4a2c",
        }),
        corona: buildSprite(CORONA_ROWS, { G: "#e9b45c" }, 4),
        vial: buildSprite(VIAL_ROWS, { K, R: "#e06070" }, 3),
        moneda: buildSprite(MONEDA_ROWS, { K, G: "#e9b45c", W: "#fff0c8" }, 2),
        barril: buildSprite(BARRIL_ROWS, { K, B: "#6b4a2c", M: "#3a3453" }, 3),
        cofre: buildSprite(COFRE_ROWS, { K, B: "#5a3a20", G: "#e9b45c" }, 3),
        cofreAb: buildSprite(
          COFRE_AB_ROWS,
          { K, B: "#5a3a20", G: "#e9b45c" },
          3,
        ),
        cristal: buildSprite(CRISTAL_ROWS, { K, C: "#6fb8e8" }, 3),
        gema: [
          buildSprite(GEMA_ROWS, { K, X: "#b9b2c6" }, 3),
          buildSprite(GEMA_ROWS, { K, X: "#6fb3e8" }, 3),
          buildSprite(GEMA_ROWS, { K, X: "#c084f0" }, 3),
          buildSprite(GEMA_ROWS, { K, X: "#e9b45c" }, 3),
        ],
      };

const imgVialReal = new Image();

imgVialReal.onload = () => { SPR.vial = imgVialReal; };

imgVialReal.src = assetUrl("vial");

function upscaleNN(img, factor) {
        const c = document.createElement("canvas");
        c.width = img.width * factor;
        c.height = img.height * factor;
        const g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.drawImage(img, 0, 0, c.width, c.height);
        return c;
      }

const KENNEY_ICON_SRC = {
        esqueleto: assetUrl("esqueleto"),
        ojo: assetUrl("ojo"),
        acechador: assetUrl("acechador"),
        golem: assetUrl("golem"),
        bomber: assetUrl("bomber"),
        hechicero: assetUrl("hechicero"),
        bruto: assetUrl("bruto"),
        brutoB: assetUrl("brutoB"),
        slime: assetUrl("slime"),
        mercader: assetUrl("mercader"),
        sastre: assetUrl("sastre"),
        cofre: assetUrl("cofre"),
        cofreAb: assetUrl("cofreAb"),
        barril: assetUrl("barril"),
        guerrero: assetUrl("guerrero"),
        arquero: assetUrl("arquero"),
        mago: assetUrl("mago"),
        clerigo: assetUrl("clerigo"),
        picaro: assetUrl("picaro"),
        druida: assetUrl("druida"),
      };

const KENNEY_ICON_SCALE = {
        esqueleto: 3,
        ojo: 3,
        acechador: 3,
        golem: 3.5,
        bomber: 3,
        hechicero: 3,
        bruto: 3,
        brutoB: 3.5,
        slime: 3.5,
        mercader: 3,
        sastre: 3,
        cofre: 3,
        cofreAb: 3,
        barril: 3,
        guerrero: 3,
        arquero: 3,
        mago: 3,
        clerigo: 3,
        picaro: 3,
        druida: 3,
      };

for (const kIcon in KENNEY_ICON_SRC) {
        const imIcon = new Image();
        imIcon.onload = (() => {
          const kk = kIcon;
          return () => { SPR[kk] = upscaleNN(imIcon, KENNEY_ICON_SCALE[kk] || 3); };
        })();
        imIcon.src = KENNEY_ICON_SRC[kIcon];
      }

const KENNEY_TILE_SRC = {
        floorA: assetUrl("floorA"),
        floorB: assetUrl("floorB"),
        wall: assetUrl("wall"),
      };

export const KENNEY_TILE = {};

for (const kTile in KENNEY_TILE_SRC) {
        const imTile = new Image();
        imTile.onload = (() => {
          const kk = kTile;
          return () => {
            KENNEY_TILE[kk] = upscaleNN(imTile, 3);
            window._sueloDirty = true;
          };
        })();
        imTile.src = KENNEY_TILE_SRC[kTile];
      }

let wallPatternKenney = null;

export function wallPatron() {
        if (KENNEY_TILE.wall) {
          if (!wallPatternKenney)
            wallPatternKenney = cx.createPattern(KENNEY_TILE.wall, "repeat");
          return wallPatternKenney;
        }
        return null;
      }

for (const r in PALS)
        SPR[r] = buildSprite(
          ROWS_CLASE[r] || HERO_ROWS,
          PALS[r],
          ROWS_CLASE[r] ? ESC_HEROE : 3,
        );

const REAL_SPRITE_SRC = {};

export const REAL_SPRITE_SCALE = {};

export const NO_SCHEMATIC_WEAPON = {};

for (const rolReal in REAL_SPRITE_SRC) {
        const imgReal = new Image();
        imgReal.onload = (() => {
          const rr = rolReal;
          return () => {
            SPR[rr] = imgReal;
            for (const k in compCache)
              if (k.indexOf(rr + "#") === 0) delete compCache[k];
          };
        })();
        imgReal.src = REAL_SPRITE_SRC[rolReal];
      }

const REAL_RUN_SRC = {};

export const REAL_RUN = { guerrero: [], arquero: [], picaro: [], mago: [], clerigo: [], druida: [] };

const REAL_ATTACK_SRC = {};

export const REAL_ATTACK = { guerrero: [], arquero: [], picaro: [] };

for (const rolAtk in REAL_ATTACK_SRC) {
        REAL_ATTACK_SRC[rolAtk].forEach((src, i) => {
          const im = new Image();
          im.onload = (() => {
            const rr = rolAtk, ii = i;
            return () => { REAL_ATTACK[rr][ii] = im; };
          })();
          im.src = src;
        });
      }

export const ATTACK_DUR = { guerrero: 0.22, arquero: 0.3, picaro: 0.1 };

for (const rolRun in REAL_RUN_SRC) {
        REAL_RUN_SRC[rolRun].forEach((src, i) => {
          const im = new Image();
          im.onload = (() => {
            const rr = rolRun, ii = i;
            return () => { REAL_RUN[rr][ii] = im; };
          })();
          im.src = src;
        });
      }

SPR.sastre = buildSprite(HERO_ROWS, {
        K,
        S: PIEL,
        E: K,
        H: "#3a3450",
        B: "#57496f",
        G: "#c084f0",
        L: "#26232f",
      });

const compCache = {};

export function spriteJugador(p) {
        const armR = p.equipo.armadura ? p.equipo.armadura.rareza : -1;
        const armaR = p.equipo.arma ? p.equipo.arma.rareza : -1;
        const accR = p.equipo.accesorio ? p.equipo.accesorio.rareza : -1;
        const skinId = META.skins.equipada[p.rol] || "";
        const key = p.rol + "#" + armR + "#" + armaR + "#" + accR + "#" + skinId;
        if (compCache[key]) return compCache[key];
        let base = SPR[p.rol];
        if (skinId) {
          const sk = SKINS.find((s) => s.id === skinId);
          if (sk)
            base = buildSprite(
              ROWS_CLASE[p.rol] || HERO_ROWS,
              { ...PALS[p.rol], ...sk.pal },
              ROWS_CLASE[p.rol] ? ESC_HEROE : 3,
            );
        }
        const c = document.createElement("canvas");
        c.width = base.width;
        c.height = base.height;
        const g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.drawImage(base, 0, 0);
        if (armR >= 0)
          g.drawImage(
            buildSprite(ARMOR_ROWS, { A: RAREZAS[armR].col }, ESC_HEROE),
            0,
            0,
          );
        if (armaR >= 0)
          g.drawImage(
            buildSprite(WEAPON_ROWS, { W: RAREZAS[armaR].col }, ESC_HEROE),
            0,
            0,
          );
        if (accR >= 0)
          g.drawImage(
            buildSprite(ACCESSORY_ROWS, { N: RAREZAS[accR].col }, ESC_HEROE),
            0,
            0,
          );
        compCache[key] = c;
        return c;
      }
