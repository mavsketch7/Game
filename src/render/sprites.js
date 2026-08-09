// Auto-generated during the modularization refactor (2026-07-23).
import { H, W, cx } from "../core/canvas.js";
import { RAREZAS } from "../core/constants.js";
import { META, SKINS } from "../core/save.js";
import { G } from "../core/state.js";
import { M, keys } from "../systems/input.js";
import { construirMenu } from "../ui/menu.js";

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
        // "pilar" quitado: el archivo que usaba (pilar.png) resultó ser en
        // realidad un fragmento de pared, no una columna independiente --
        // ver conversación. assetOK("pilar") en world.js sigue devolviendo
        // false con seguridad (sin este archivo no hay nada que cargar),
        // así que los pilares caen de vuelta al procedural de siempre sin
        // romper nada; en cuanto haya un sprite de columna real se puede
        // volver a añadir aquí.
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
        ".....AA..AA.....",
        "................",
        "....AAAAAAAA....",
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

// Iconos de drop por slot (arma/armadura/accesorio), teñidos por rareza --
// para que se vea de un vistazo QUÉ ha caído, no solo su rareza (antes
// todos los objetos caían con el mismo icono de gema, ver iconoDrop()).
const ESPADA_ROWS = [
        "..K..",
        ".KXK.",
        ".KXK.",
        ".KXK.",
        "KKXKK",
        "..K..",
        "..K..",
      ];
const ESCUDO_ROWS = [
        ".KKKK.",
        "KXXXXK",
        "KXXXXK",
        "KXXXXK",
        ".KXXK.",
        "..KK..",
      ];
const ANILLO_ROWS = ["..KK..", ".K..K.", "K.XX.K", ".K..K.", "..KK.."];

const ICONO_DROP_ROWS = { arma: ESPADA_ROWS, armadura: ESCUDO_ROWS, accesorio: ANILLO_ROWS };
const iconoDropCache = {};

// Perezoso y cacheado por slot+rareza: así una futura rareza por encima de
// legendario (índice 4+) funciona sola, sin tocar este código ni añadir
// más variantes a mano -- el color sale siempre de RAREZAS[rareza].col.
export function iconoDrop(item) {
        const rows = ICONO_DROP_ROWS[item.slot];
        if (!rows) return SPR.gema[Math.min(item.rareza, SPR.gema.length - 1)];
        const clave = item.slot + "|" + item.rareza;
        if (!iconoDropCache[clave]) {
          const col = RAREZAS[item.rareza] ? RAREZAS[item.rareza].col : "#e9b45c";
          iconoDropCache[clave] = buildSprite(rows, { K, X: col }, 3);
        }
        return iconoDropCache[clave];
      }

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
          return () => {
            SPR[kk] = upscaleNN(imIcon, KENNEY_ICON_SCALE[kk] || 3);
            // el menú de selección de personaje dibuja SPR[rol] en un
            // <canvas> una sola vez al construirse; como este icono carga
            // async, la primera vez casi siempre se adelanta y se queda
            // enseñando el sprite procedural de relleno. Si el que acaba
            // de cargar es una de las 6 clases, se reconstruye el menú
            // para que recoja ya el icono definitivo.
            if (kk in PALS) construirMenu();
          };
        })();
        imIcon.src = KENNEY_ICON_SRC[kIcon];
      }

// Sprites del cofre: solo cerrado y abierto. La hoja de origen trae 5
// fotogramas "intermedios" pero ninguno sirve para animar entre ellos --
// el 2º/3er son más estrechos que el resto dentro de su celda y el 4º
// (cofre_f3) en realidad contiene DOS medias-ilustraciones del cofre una a
// cada lado de la celda (visible como el cofre "partiéndose en dos" al
// pasar por ese fotograma). En vez de perseguir más recortes de esa hoja,
// la transición de cerrado→abierto se resuelve en render/world.js con un
// efecto de "pop" (escala) puramente de código, sin fotogramas intermedios.
const COFRE_FRAME_SRC = { cofre: "cofre_f0", cofreAb: "cofre_f4" };
for (const key in COFRE_FRAME_SRC) {
  const im = new Image();
  im.onload = () => {
    SPR[key] = upscaleNN(im, 3);
  };
  im.src = assetUrl(COFRE_FRAME_SRC[key]);
}

// Escalera (sube/baja de planta, ver systems/floorgen.js): un sprite
// único, no un patrón repetible -- mismo patrón que COFRE_FRAME_SRC de
// arriba. Solo hay un sprite "hacia arriba"; el de bajar se genera
// volteándolo verticalmente en un canvas aparte, sin pedir un archivo
// nuevo (cambiar por un sprite dedicado más adelante es trivial: solo
// hay que sustituir la entrada de abajo).
const im3 = new Image();
im3.onload = () => {
  // Este sprite ya viene a una resolución "grande" (121x85, no un icono de
  // 16px) -- a diferencia del resto de KENNEY_TILE/COFRE_FRAME_SRC, aquí
  // NO hace falta el ×3 habitual (salía gigantesco, casi 1/3 del ancho de
  // la sala). Factor 1 = tamaño nativo; el ajuste de tamaño en el juego se
  // hace con el parámetro `esc` de drawSprite() en render/world.js.
  SPR.escaleras = upscaleNN(im3, 1);
  const c = document.createElement("canvas");
  c.width = SPR.escaleras.width;
  c.height = SPR.escaleras.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.translate(0, c.height);
  g.scale(1, -1);
  g.drawImage(SPR.escaleras, 0, 0);
  SPR.escalerasAbajo = c;
};
im3.src = assetUrl("escaleras");

const KENNEY_TILE_SRC = {
        wall: assetUrl("wall"),
        wallRemate: assetUrl("wallRemate"),
        door2: assetUrl("door2"),
        door1: assetUrl("door1"),
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

// Franja de remate (almenas) para el borde superior de un rectángulo de
// muro grande -- ver dibujado en render/world.js. El pack de sprites no
// trae piezas de esquina/borde por bitmask (investigado a fondo), así que
// en vez de un autotiling de 4/8 vecinos esto da a los muros un acabado
// "coronado" reutilizando la única tira decorativa reaprovechable del set.
let remateMuroPatternKenney = null;

export function remateMuroPatron() {
        if (KENNEY_TILE.wallRemate) {
          if (!remateMuroPatternKenney)
            remateMuroPatternKenney = cx.createPattern(KENNEY_TILE.wallRemate, "repeat");
          return remateMuroPatternKenney;
        }
        return null;
      }

// Puerta real entre salas (ver render/world.js: dibuja KENNEY_TILE.door2
// directamente con drawImage, no como patrón repetible -- es una imagen
// única, no una textura). "door1" se deja cargado en KENNEY_TILE como
// variante sin usar todavía, por si hace falta más adelante.

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

// Recorta una hoja de animación horizontal (pack "Pixel Crawler": frames
// cuadrados, ancho = alto x N -- confirmado leyendo cabeceras PNG en varias
// hojas del pack, tanto del héroe como de los mobs) en un array de canvases
// ya redimensionados a `destSize`. Se redimensiona aquí, al cargar, en vez
// de dejarlo al `esc` de drawSprite() en world.js, porque ese `esc` es
// compartido con el sprite estático (idle) de la misma entidad -- si no se
// iguala el tamaño de antemano, el idle se encogería/agrandaría en cuanto
// hubiera frames de correr/atacar cargados.
function cargarHojaFrames(url, destSize, onListo) {
  const im = new Image();
  im.onload = () => {
    const frameSize = im.naturalHeight;
    const frameCount = Math.max(1, Math.round(im.naturalWidth / frameSize));
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const c = document.createElement("canvas");
      c.width = destSize;
      c.height = destSize;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.drawImage(im, i * frameSize, 0, frameSize, frameSize, 0, 0, destSize, destSize);
      frames.push(c);
    }
    onListo(frames);
  };
  im.onerror = () => console.warn("No se pudo cargar hoja de animación: " + url);
  im.src = url;
}

// Tamaño del sprite = radio de colisión (hitbox) x este factor, en vez de un
// tamaño de icono arbitrario desconectado del gameplay -- así el personaje
// "llena" un hueco visualmente coherente con lo grande que es de verdad para
// golpear/ser golpeado, y quieto/corriendo/atacando miden siempre lo mismo
// (antes el idle usaba el icono KENNEY de 48px y correr/atacar un tamaño
// distinto sacado del pack, de ahí el salto de tamaño al moverse).
const FACTOR_SPRITE_HITBOX = 4;

// Héroe: p.r = 17 fijo para las 6 clases (ver core/gameflow.js).
const TAM_HEROE = 17 * FACTOR_SPRITE_HITBOX;

// Un personaje dedicado por clase (colección "Tiny Questers" de Bobddadoo,
// bobddadoo.itch.io -- licencia libre, ver conversación) en vez del cuerpo
// genérico "Body_A" de antes: guerrero (espada+escudo), pícaro (dagas), mago
// (varita), clérigo (libro en reposo, báculo al andar) y druida (báculo) ya
// tienen su propio arte real, no una silueta reutilizada entre clases.
// arquero usa el sprite de arquera del mismo autor (única pieza disponible).
// Los frames se extrajeron de las hojas de vista previa de cada personaje con
// un detector de componentes conexas (sin asumir un grid, esas hojas no
// tienen celdas uniformes) y se recompusieron en tiras cuadradas -- ver
// conversación de la sesión para el script; no se commitea, es un paso único.
const REAL_IDLE_SRC = {
  guerrero: assetUrl("characters/guerrero_idle"),
  arquero: assetUrl("characters/arquero_idle"),
  mago: assetUrl("characters/mago_idle"),
  clerigo: assetUrl("characters/clerigo_idle"),
  picaro: assetUrl("characters/picaro_idle"),
  druida: assetUrl("characters/druida_idle"),
};
const REAL_RUN_SRC = {
  guerrero: assetUrl("characters/guerrero_walk"),
  arquero: assetUrl("characters/arquero_walk"),
  mago: assetUrl("characters/mago_walk"),
  clerigo: assetUrl("characters/clerigo_walk"),
  picaro: assetUrl("characters/picaro_walk"),
  druida: assetUrl("characters/druida_walk"),
};

export const REAL_IDLE = { guerrero: [], arquero: [], picaro: [], mago: [], clerigo: [], druida: [] };
export const REAL_RUN = { guerrero: [], arquero: [], picaro: [], mago: [], clerigo: [], druida: [] };

for (const rolIdle in REAL_IDLE_SRC) {
  cargarHojaFrames(REAL_IDLE_SRC[rolIdle], TAM_HEROE, (frames) => { REAL_IDLE[rolIdle] = frames; });
}
for (const rolRun in REAL_RUN_SRC) {
  cargarHojaFrames(REAL_RUN_SRC[rolRun], TAM_HEROE, (frames) => { REAL_RUN[rolRun] = frames; });
}

// Ataque: ninguna clase tiene todavía una animación de ataque dedicada
// extraída de este set (las hojas de vista previa no incluyen un swing claro
// por personaje, a diferencia de idle/andar) -- durante el ataque se sigue
// mostrando el frame de idle en vez de forzar una animación que no encajaría.
export const REAL_ATTACK = { guerrero: [], arquero: [], picaro: [], mago: [] };

export const ATTACK_DUR = { guerrero: 0.22, arquero: 0.3, picaro: 0.1, mago: 0.25 };

// Enemigos: mismo criterio de tamaño (radio de colisión x FACTOR_SPRITE_HITBOX)
// en vez del tamaño de icono KENNEY anterior. Radios tomados de la tabla TIPOS
// en systems/combat.js (melee 14, ranged 13, caster 13, runner 11, tank 19;
// "bruto" es el reskin de cualquier elite no-tank/runner/bomber/caster/mini,
// que suele salir de melee o ranged con +4 -- 18 es un término medio
// razonable, no depende de una sola fórmula exacta aquí).
const MOB_R = { esqueleto: 14, ojo: 13, hechicero: 13, acechador: 11, golem: 19, bruto: 18 };

// Correr para enemigos (ver renderEnemigo() en world.js): mismo mecanismo que
// el héroe, indexado por `mobKey` (el mismo nombre de SPR.* que ya se dibuja
// hoy) para no tener que tocar más que un par de líneas por rama en world.js.
// Sin match temático en el pack para bomber/mini/jefe -- se quedan 100%
// procedurales como hasta ahora (MOB_RUN[key] undefined = no-op seguro).
const MOB_RUN_SRC = {
  esqueleto: assetUrl("mobs/skeletonBase_run"),
  ojo: assetUrl("mobs/orcShaman_run"),
  hechicero: assetUrl("mobs/skeletonMage_run"),
  acechador: assetUrl("mobs/orcRogue_run"),
  golem: assetUrl("mobs/orcWarrior_run"),
  bruto: assetUrl("mobs/orc_run"),
};

export const MOB_RUN = {};

for (const keyMob in MOB_RUN_SRC) {
  const destSize = (MOB_R[keyMob] || 14) * FACTOR_SPRITE_HITBOX;
  cargarHojaFrames(MOB_RUN_SRC[keyMob], destSize, (frames) => { MOB_RUN[keyMob] = frames; });
}

// Arma en mano: sprite real (recorte individual y limpio, no una hoja
// compartida) en vez del dibujo esquemático de siempre (ver world.js,
// bloque "arma apuntando"). Solo existe la pieza de madera -- en vez de
// necesitar un set de piezas distinto por material/rareza (hueso, etc.), se
// generan las 5 variantes de RAREZAS recoloreando esta misma pieza por
// código (ver teñirSprite() más abajo): mismo sombreado del pixel art
// original, solo cambia el tono, más un halo de color para rareza alta.
const WEAPON_SRC = {
  guerrero: assetUrl("weapons/wood-weapons/sword-wood"),
  picaro: assetUrl("weapons/wood-weapons/dagger-wood"),
  arquero: assetUrl("weapons/wood-weapons/bow-wood"),
  mago: assetUrl("weapons/wood-weapons/magic-wood"),
  clerigo: assetUrl("weapons/wood-weapons/hammer-wood"),
  druida: assetUrl("weapons/wood-weapons/staff-wood"),
};

// Mano secundaria (no gira con la puntería, se lleva más estática): escudo
// para guerrero, libro para clérigo -- el resto de clases no lleva nada aquí.
const OFFHAND_SRC = {
  guerrero: assetUrl("weapons/wood-weapons/shield-md-wood"),
  clerigo: assetUrl("weapons/wood-weapons/book-w"),
};

// Recolorea `img` al tono de `color` conservando su sombreado (blend "hue":
// toma el matiz del color de relleno pero conserva luminosidad/saturación
// de cada píxel original) y lo vuelve a recortar exactamente a su silueta
// original (si no, el relleno del blend deja opaco todo el rectángulo,
// incluidas las zonas transparentes). Devuelve un <canvas>, no un <img>.
function teñirSprite(img, color) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
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

// Carga la pieza base y, en cuanto está lista, pre-genera sus 5 variantes de
// rareza (RAREZAS, ver core/constants.js) -- baratas de calcular (iconos
// pequeños) así que se hacen todas de una vez, no bajo demanda.
function cargarConVariantesRareza(src, onListo) {
  const im = new Image();
  im.onload = () => {
    const variantes = RAREZAS.map((r) => teñirSprite(im, r.col));
    onListo(im, variantes);
  };
  im.onerror = () => console.warn("No se pudo cargar: " + src);
  im.src = src;
}

export const WEAPON_IMG = {}; // WEAPON_IMG[rol] = imagen base (rareza Común, sin recolorear)
export const WEAPON_IMG_RAREZA = {}; // WEAPON_IMG_RAREZA[rol] = [canvas por cada tier de RAREZAS]
export const OFFHAND_IMG = {};
export const OFFHAND_IMG_RAREZA = {};

for (const rolArma in WEAPON_SRC) {
  cargarConVariantesRareza(WEAPON_SRC[rolArma], (im, variantes) => {
    WEAPON_IMG[rolArma] = im;
    WEAPON_IMG_RAREZA[rolArma] = variantes;
  });
}
for (const rolOff in OFFHAND_SRC) {
  cargarConVariantesRareza(OFFHAND_SRC[rolOff], (im, variantes) => {
    OFFHAND_IMG[rolOff] = im;
    OFFHAND_IMG_RAREZA[rolOff] = variantes;
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
        const skinId = META.skins.equipada[p.rol] || "";
        const key = p.rol + "#" + armR + "#" + skinId;
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
        compCache[key] = c;
        return c;
      }
