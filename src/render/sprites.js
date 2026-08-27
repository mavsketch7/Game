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
        // Hoguera real (30 frames de 32x32 en 960x32) -- misma hoja que ya
        // anima por CSS en la pantalla de selección (.icono-fogata en
        // styles/main.css). Vive en public/assets/ui/seleccion/, no en
        // assets/sprites/, así que no usa assetUrl() (que asume esa ruta).
        // Pedido expreso del usuario: usarla para TODAS las hogueras del
        // juego (el descanso de G.fogata y las de alivio de la sala del
        // Guardián de Hielo, ver G.hoguerasJefe en systems/floorgen.js).
        campfire_sheet: `${import.meta.env.BASE_URL}assets/ui/seleccion/campfire-sheet.png`,
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

// Frame actual de campfire_sheet (30 frames de 32x32, bucle de 1.8s -- ver
// ASSET_SRC arriba): por tiempo REAL, no por animGlobal (que otras hojas
// usan a un ritmo distinto), así que cualquier hoguera dibujada en
// cualquier sala respira exactamente igual que el icono CSS de selección.
export const CAMPFIRE_FRAMES = 30;
export const CAMPFIRE_CELDA = 32;
export function campfireFrame() {
  return Math.floor((performance.now() / 1800) * CAMPFIRE_FRAMES) % CAMPFIRE_FRAMES;
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

// Iconos de drop por slot (ver core/constants.js: SLOTS), teñidos por rareza --
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

// Slots añadidos al pasar de 3 a 7 en la ficha de personaje (ver
// core/constants.js: SLOTS) -- mismo DSL de filas que los de arriba,
// "escudo" (mano izquierda) reutiliza directamente ESCUDO_ROWS (ya es un
// icono de escudo, encaja tal cual con el nuevo slot de offhand).
const CASCO_ROWS = [
  "..KKKK..",
  ".KXXXXK.",
  "KXXXXXXK",
  "KXXKKXXK",
  "KXXKKXXK",
  ".KKKKKK.",
];
const PETO_ROWS = [
  "K.KKKK.K",
  "KXXXXXXK",
  "KXXKKXXK",
  "KXXXXXXK",
  "KXXXXXXK",
  ".KKKKKK.",
];
const PIERNAS_ROWS = [
  "KXK.KXK",
  "KXK.KXK",
  "KXK.KXK",
  "KXKKKXK",
  "KKK.KKK",
];
const COLLAR_ROWS = [
  "K.....K",
  ".K...K.",
  "..K.K..",
  "..KXK..",
  "..XXX..",
];

const ICONO_DROP_ROWS = {
  arma: ESPADA_ROWS,
  escudo: ESCUDO_ROWS,
  casco: CASCO_ROWS,
  peto: PETO_ROWS,
  piernas: PIERNAS_ROWS,
  collar: COLLAR_ROWS,
  anillo: ANILLO_ROWS,
};
const iconoDropCache = {};

// Perezoso y cacheado por slot+rareza: así una futura rareza por encima de
// legendario (índice 4+) funciona sola, sin tocar este código ni añadir
// más variantes a mano -- el color sale siempre de RAREZAS[rareza].col.
// Icono real por id fijo (piezas del set de Frhor, ver systems/combat.js:
// matarEnemigo -- reutiliza el frame de idle-abajo ya cargado para la
// armadura en capas del guerrero, ver CASCO_IDLE/PETO_IDLE/PIERNAS_IDLE más
// abajo, en vez de recortar un icono nuevo aparte). Mismo criterio que
// MARTILLO_FRHOR_IMG: id concreto -> imagen concreta, sin pasar por rareza.
// El frame de origen es un lienzo TAM_HEROE x TAM_HEROE (68x68) con mucho
// margen transparente alrededor (pensado para alinearse con el cuerpo, no
// para servir de icono) -- sin recortar por su propia bbox de alfa
// (bboxAlfa, ver más abajo) el icono se veía como un punto minúsculo en la
// esquina del hueco de equipo. Recorte perezoso y cacheado por id, mismo
// criterio que iconoDropCache.
const iconoFrhorCache = {};
function iconoFrhor(item) {
  let frame = null;
  if (item.id === "casco_frhor") frame = CASCO_IDLE.down[0];
  else if (item.id === "peto_frhor") frame = PETO_IDLE.down[0];
  else if (item.id === "grebas_frhor") frame = PIERNAS_IDLE.down[0];
  if (!frame) return null;
  if (!iconoFrhorCache[item.id]) {
    const b = bboxAlfa(frame.getContext("2d"), frame.width, frame.height) ||
      { x: 0, y: 0, w: frame.width, h: frame.height };
    const c = document.createElement("canvas");
    c.width = b.w;
    c.height = b.h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(frame, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    iconoFrhorCache[item.id] = c;
  }
  return iconoFrhorCache[item.id];
}

export function iconoDrop(item) {
        // Martillo de Frhor: icono real (azul zafiro, ver MARTILLO_FRHOR_IMG
        // más abajo) en vez del icono procedural genérico de "arma" -- si
        // todavía no cargó, cae al procedural de siempre por esta vez.
        if (item.id === "martillo_frhor" && MARTILLO_FRHOR_IMG) return MARTILLO_FRHOR_IMG;
        const imgFrhor = iconoFrhor(item);
        if (imgFrhor) return imgFrhor;
        // Arma con arte real por variante (pack "iron-weapons", ver
        // WEAPON_ART_POOL más abajo y genItem() en systems/loot.js, que
        // asigna `arteIdx` de forma ESTABLE al generarse) -- se muestra tal
        // cual, sin recolorear por rareza: esa señal ya la da el rayo de luz
        // del drop (render/world.js) y el halo del arma en mano
        // (render/character.js), no un tinte del propio icono.
        if (item.slot === "arma" && item.arteIdx !== undefined) {
          const pool = WEAPON_ART_POOL[item.clase];
          const imgArma = pool && pool.length ? pool[item.arteIdx % pool.length] : null;
          if (imgArma) return imgArma;
        }
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
// ×3 (igual que el resto de KENNEY_ICON) daba un cofre de 96px -- más alto
// que el propio héroe (~58-60px de cuerpo real, ver TAM_HEROE). ×1.5 (48px)
// lo deja del tamaño de un objeto a la altura de la cintura/pecho, no un
// mueble más grande que el personaje (reportado: "el cofre está
// sobredimensionado").
const COFRE_ESCALA = 1.5;
const COFRE_FRAME_SRC = { cofre: "cofre_f0", cofreAb: "cofre_f4" };
for (const key in COFRE_FRAME_SRC) {
  const im = new Image();
  im.onload = () => {
    SPR[key] = upscaleNN(im, COFRE_ESCALA);
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

// Mercader del lobby: sprite real (torre-vespero-assets/lobby-sprites/
// merchant.aseprite), sustituye el icono Kenney genérico de antes. Un solo
// fotograma estático, ya a 48x48 (mismo tamaño en pantalla que el icono
// anterior -- 16x16 Kenney ×3 -- así que factor 1, sin necesidad de
// recalibrar la posición del NPC en world.js).
const imMercader = new Image();
imMercader.onload = () => {
  SPR.mercader = upscaleNN(imMercader, 1);
};
imMercader.src = assetUrl("merchant");

// Flecha real del arquero (ver render/world.js, proyectil tipo "flecha"):
// recortada de "basic-arrow- flying and impacting.PNG" y volteada en
// horizontal para que la punta quede a la DERECHA en reposo -- world.js
// rota el sprite con Math.atan2(vy,vx), mismo criterio que usaba el
// triángulo dibujado a mano de antes (apex en +x). "cargada" es la
// variante roja para el disparo con carga (ver dispararFlechaCargada en
// systems/abilities.js); la básica se queda con la gris de siempre.
const imFlecha = new Image();
imFlecha.onload = () => {
  SPR.flecha = imFlecha;
};
imFlecha.src = assetUrl("fx/arrow_fly");
const imFlechaCargada = new Image();
imFlechaCargada.onload = () => {
  SPR.flechaCargada = imFlechaCargada;
};
imFlechaCargada.src = assetUrl("fx/arrow_fly_crit");

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

// Bbox real (no transparente) de un frame ya volcado en un canvas -- para
// anclar el personaje por los PIES, no por el centro geométrico del cuadro
// de origen. Las hojas del pack dejan un margen vacío por encima/debajo del
// personaje que NO es simétrico (más aire arriba que abajo, o al revés según
// la pose); centrar el cuadro completo (como se hacía antes) desplaza el
// punto de apoyo real unos píxeles arriba o abajo del suelo -- de ahí que el
// personaje se viera "flotando". Devuelve null si el frame está vacío.
function bboxAlfa(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Recorta una hoja de animación horizontal (pack "Pixel Crawler": frames
// cuadrados, ancho = alto x N -- confirmado leyendo cabeceras PNG en varias
// hojas del pack, tanto del héroe como de los mobs) en un array de canvases
// ya redimensionados a `destSize`. Cada frame se recoloca por su bbox real
// (ver bboxAlfa) para que los PIES queden siempre justo en el borde inferior
// del cuadro -- así drawSpriteBottom() (world.js) puede anclar por ahí sin
// adivinar un desplazamiento a ojo. Una sola escala para toda la hoja
// (a partir del bbox más alto de todos los frames) para que el personaje no
// cambie de tamaño entre frames de una misma animación al alternar poses.
function cargarHojaFrames(url, destSize, onListo, sinAmpliar) {
  const im = new Image();
  im.onload = () => {
    const frameSize = im.naturalHeight;
    const frameCount = Math.max(1, Math.round(im.naturalWidth / frameSize));
    const tmp = document.createElement("canvas");
    tmp.width = frameSize;
    tmp.height = frameSize;
    const tg = tmp.getContext("2d");
    tg.imageSmoothingEnabled = false;
    const bboxes = [];
    for (let i = 0; i < frameCount; i++) {
      tg.clearRect(0, 0, frameSize, frameSize);
      tg.drawImage(im, i * frameSize, 0, frameSize, frameSize, 0, 0, frameSize, frameSize);
      bboxes.push(bboxAlfa(tg, frameSize, frameSize) || { x: 0, y: 0, w: frameSize, h: frameSize });
    }
    const altoMax = Math.max(...bboxes.map((b) => b.h));
    // sinAmpliar (pack heroB): el arte ya viene dibujado a su tamaño real
    // (32x32) a propósito -- si destSize es mayor no hay que ampliarlo (se
    // vería borroso/a bloques más grandes de lo que pintó el artista), solo
    // reducirlo si hiciera falta. Sin este tope, MOB_RUN (Pixel Crawler,
    // arte más pequeño en origen) sigue ampliándose como hasta ahora.
    const escala = sinAmpliar
      ? Math.min(1, (destSize * 0.86) / altoMax)
      : (destSize * 0.86) / altoMax; // 0.86: deja un margen inferior para la sombra de contacto
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const b = bboxes[i];
      const c = document.createElement("canvas");
      c.width = destSize;
      c.height = destSize;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      const w = b.w * escala, h = b.h * escala;
      g.drawImage(im, i * frameSize + b.x, b.y, b.w, b.h, (destSize - w) / 2, destSize - h, w, h);
      frames.push(c);
    }
    onListo(frames);
  };
  im.onerror = () => console.warn("No se pudo cargar hoja de animación: " + url);
  im.src = url;
}

// Cuerpo + capas de armadura (casco/peto/piernas, ver public/assets/sprites/
// characters/armor/) de una misma animación, recortados TODOS con la MISMA
// bbox por frame -- la UNIÓN de las bbox de alfa del cuerpo y de cada capa
// presente, no solo la del cuerpo. Un casco o un peto pueden sobresalir un
// poco más ancho/alto que la silueta del cuerpo solo (un penacho, una
// hombrera) -- recortar esas capas con la bbox (más estrecha) del cuerpo
// las cercenaba por los lados ("el casco se ve recortado", reportado).
// `armorUrls` = { casco, peto, piernas }, cualquiera puede ser null/
// undefined si esa animación no tiene esa capa todavía -- se omite sin más.
// onListo(bodyFrames, anclas, { casco, peto, piernas })
function cargarHojaConArmadura(bodyUrl, armorUrls, destSize, sinAmpliar, onListo) {
  const jsonUrl = bodyUrl.replace(/\.png(\?.*)?$/, ".json$1");
  const piezas = ["casco", "peto", "piernas"];
  const imgs = { body: null, casco: null, peto: null, piernas: null };
  let restantes = 1 + piezas.filter((p) => armorUrls[p]).length;
  function cargarUna(key, url) {
    const im = new Image();
    im.onload = () => { imgs[key] = im; if (--restantes === 0) procesar(); };
    im.onerror = () => { console.warn("No se pudo cargar: " + url); if (--restantes === 0) procesar(); };
    im.src = url;
  }
  cargarUna("body", bodyUrl);
  for (const p of piezas) if (armorUrls[p]) cargarUna(p, armorUrls[p]);

  function procesar() {
    fetch(jsonUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((meta) => {
        const bodyImg = imgs.body;
        const frameSize = bodyImg.naturalHeight;
        const frameCount = Math.max(1, Math.round(bodyImg.naturalWidth / frameSize));
        const tmp = document.createElement("canvas");
        tmp.width = frameSize;
        tmp.height = frameSize;
        const tg = tmp.getContext("2d");
        tg.imageSmoothingEnabled = false;

        function bboxDeFrame(im, i) {
          if (!im) return null;
          tg.clearRect(0, 0, frameSize, frameSize);
          tg.drawImage(im, i * frameSize, 0, frameSize, frameSize, 0, 0, frameSize, frameSize);
          return bboxAlfa(tg, frameSize, frameSize);
        }

        const bboxesUnion = [];
        for (let i = 0; i < frameCount; i++) {
          const candidatos = [imgs.body, imgs.casco, imgs.peto, imgs.piernas]
            .map((im) => bboxDeFrame(im, i))
            .filter(Boolean);
          if (!candidatos.length) {
            bboxesUnion.push({ x: 0, y: 0, w: frameSize, h: frameSize });
            continue;
          }
          const minX = Math.min(...candidatos.map((b) => b.x));
          const minY = Math.min(...candidatos.map((b) => b.y));
          const maxX = Math.max(...candidatos.map((b) => b.x + b.w));
          const maxY = Math.max(...candidatos.map((b) => b.y + b.h));
          bboxesUnion.push({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
        }
        const altoMax = Math.max(...bboxesUnion.map((b) => b.h));
        const escala = sinAmpliar
          ? Math.min(1, (destSize * 0.86) / altoMax)
          : (destSize * 0.86) / altoMax;

        function recortarSerie(im) {
          if (!im) return [];
          const frames = [];
          for (let i = 0; i < frameCount; i++) {
            const b = bboxesUnion[i];
            const c = document.createElement("canvas");
            c.width = destSize;
            c.height = destSize;
            const g = c.getContext("2d");
            g.imageSmoothingEnabled = false;
            const w = b.w * escala, h = b.h * escala;
            g.drawImage(im, i * frameSize + b.x, b.y, b.w, b.h, (destSize - w) / 2, destSize - h, w, h);
            frames.push(c);
          }
          return frames;
        }

        const bodyFrames = recortarSerie(imgs.body);
        const capas = {
          casco: recortarSerie(imgs.casco),
          peto: recortarSerie(imgs.peto),
          piernas: recortarSerie(imgs.piernas),
        };

        // Ancla de mano (ver puntosPorFrameDesdeHitbox arriba) con la misma
        // bbox/escala ya unificada -- mismo cálculo que cargarHojaFramesConAncla.
        let puntosGlobales = null;
        for (const nombre of NOMBRES_HITBOX_ARMA) {
          const candidato = puntosPorFrameDesdeHitbox(meta, nombre);
          if (candidato && Object.keys(candidato).length) {
            puntosGlobales = candidato;
            break;
          }
        }
        const anclas = new Array(frameCount).fill(null);
        if (puntosGlobales) {
          for (let i = 0; i < frameCount; i++) {
            const bounds = puntosGlobales[i];
            if (!bounds) continue;
            const b = bboxesUnion[i];
            const sx = bounds.x + bounds.width / 2;
            const sy = bounds.y + bounds.height / 2;
            const w = b.w * escala, h = b.h * escala;
            anclas[i] = {
              x: (destSize - w) / 2 + (sx - b.x) * escala,
              y: destSize - h + (sy - b.y) * escala,
            };
          }
        }

        onListo(bodyFrames, anclas, capas);
      });
  }
}

// Como cargarHojaFrames(), pero para una hoja en REJILLA (cols x rows,
// celdas no necesariamente cuadradas) en vez de una sola fila de cuadros
// -- caso de las fases de rotura del pilar de hielo (4x2: pilar intacto ->
// grietas -> se parte -> escombro). Mismo criterio de recorte por bbox
// alfa y una única escala compartida (del bbox más alto, normalmente el
// primer fotograma intacto) que cargarHojaFrames(): así cada fase se ve
// más PEQUEÑA que la anterior a medida que se rompe (el efecto deseado,
// no un artefacto a corregir) pero SIEMPRE con los pies en el mismo borde
// inferior del cuadro de destino, para que drawSpriteBottom()/el dibujo
// manual con ancla inferior no la haga "flotar" al cambiar de fase.
function cargarHojaFramesGrid(url, cols, rows, destSize, onListo) {
  const im = new Image();
  im.onload = () => {
    const cellW = im.naturalWidth / cols;
    const cellH = im.naturalHeight / rows;
    const tmp = document.createElement("canvas");
    tmp.width = cellW;
    tmp.height = cellH;
    const tg = tmp.getContext("2d");
    tg.imageSmoothingEnabled = false;
    const frameCount = cols * rows;
    const bboxes = [];
    for (let i = 0; i < frameCount; i++) {
      const fx = i % cols, fy = Math.floor(i / cols);
      tg.clearRect(0, 0, cellW, cellH);
      tg.drawImage(im, fx * cellW, fy * cellH, cellW, cellH, 0, 0, cellW, cellH);
      bboxes.push(bboxAlfa(tg, cellW, cellH) || { x: 0, y: 0, w: cellW, h: cellH });
    }
    const altoMax = Math.max(...bboxes.map((b) => b.h));
    const escala = (destSize * 0.86) / altoMax;
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const fx = i % cols, fy = Math.floor(i / cols);
      const b = bboxes[i];
      const c = document.createElement("canvas");
      c.width = destSize;
      c.height = destSize;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      const w = b.w * escala, h = b.h * escala;
      g.drawImage(im, fx * cellW + b.x, fy * cellH + b.y, b.w, b.h, (destSize - w) / 2, destSize - h, w, h);
      frames.push(c);
    }
    onListo(frames);
  };
  im.onerror = () => console.warn("No se pudo cargar hoja de animación (rejilla): " + url);
  im.src = url;
}

// Como cargarHojaFrames(), pero para packs que entregan UN archivo PNG
// suelto por fotograma (en vez de una única hoja horizontal) -- caso del
// Frost Guardian: idle_1..6.png, walk_1..10.png, etc. A diferencia de
// cargarHojaFrames(), aquí NO se recorta cada frame por su bbox alfa:
// medido a mano (comparando varios frames de idle/walk/atk/hit), este
// pack ya viene con el personaje alineado en un "escenario" de tamaño
// fijo -- los pies caen SIEMPRE en el mismo píxel relativo, sea cual sea
// la animación (excepto la muerte, que se hunde progresivamente, normal).
// Recortar por bbox como con el héroe destruiría esa alineación y metería
// jitter entre animaciones -- en vez de eso se escala el escenario entero
// UNA sola vez (misma escala para todos los frames, tomada del bbox más
// alto) y se ancla por el borde INFERIOR dentro de un lienzo cuadrado
// destSize x destSize -- mismo criterio que cargarHojaFrames(), aplicado a
// un pack con un PNG suelto por fotograma en vez de una sola hoja. Antes
// (cargarFramesSueltos, "escenario fijo") asumía que el pack venía
// pre-alineado a mano en un lienzo constante -- dejó de valer en cuanto el
// usuario recortó los PNG del Frost Guardian cada uno a su propio
// contenido (dimensiones ya no uniformes entre frames, comprobado por
// archivo: idle_1 79x92, walk_6 93x92, etc.), así que ahora se mide el
// bbox alfa de CADA frame por separado, igual que ya hace cargarHojaFrames
// con el héroe -- funciona tanto con frames ya recortados a mano como con
// los que todavía traigan el lienzo 192x128 sin recortar (bboxAlfa lo
// encuentra solo), así que sirve aunque el recorte del pack esté a medias.
function cargarFramesSueltosTrim(urls, destSize, onListo) {
  const imgs = new Array(urls.length);
  let restantes = urls.length;
  const onUna = () => {
    if (--restantes === 0) componer();
  };
  urls.forEach((url, i) => {
    const im = new Image();
    im.onload = () => {
      imgs[i] = im;
      onUna();
    };
    im.onerror = () => {
      console.warn("No se pudo cargar frame suelto: " + url);
      onUna();
    };
    im.src = url;
  });
  function componer() {
    const bboxes = imgs.map((im) => {
      if (!im) return null;
      const w = im.naturalWidth, h = im.naturalHeight;
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tg = tmp.getContext("2d");
      tg.imageSmoothingEnabled = false;
      tg.drawImage(im, 0, 0);
      return bboxAlfa(tg, w, h) || { x: 0, y: 0, w, h };
    });
    const altoMax = Math.max(...bboxes.filter(Boolean).map((b) => b.h), 1);
    const escala = (destSize * 0.86) / altoMax;
    const frames = imgs.map((im, i) => {
      if (!im) return null;
      const b = bboxes[i];
      const c = document.createElement("canvas");
      c.width = destSize;
      c.height = destSize;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      const w = b.w * escala, h = b.h * escala;
      g.drawImage(im, b.x, b.y, b.w, b.h, (destSize - w) / 2, destSize - h, w, h);
      return c;
    });
    onListo(frames);
  }
}

// Nombres de hitbox (herramienta de marcado del plugin de Aseprite que se
// está usando -- exporta un JSON con un hitbox con nombre por punto
// marcado, agrupado por tag de animación, ver puntosPorFrameDesdeHitbox
// más abajo) que sirven como ancla del arma, en orden de preferencia --
// el arma usa el PRIMERO que tenga datos en el archivo cargado. Distinto
// nombre según qué sostiene el personaje: "m-d" (mano derecha) para las
// clases que empuñan directamente (guerrero, confirmado en
// Hero-Sword-atack-right-left.aseprite -- es la mano que se mueve
// durante el ataque, "m-i"/mano izquierda no tenía datos ahí), "b-pl"
// (posición del arco) para el arquero (confirmado en su hoja de ataque,
// 12 frames repartidos en idle/charge/throw/rest que cuadran con los 12
// frames reales de heroB_attack_arquero_side). Si algún personaje nuevo
// necesita otro nombre, basta con añadirlo a esta lista.
// "sword-position": marcador del golpe de dash del guerrero mirando hacia
// arriba (su "m-d" solo trae 1 de 5 frames marcados; "sword-position" trae
// los 5, ver hands-sword-position-dash.json) -- va primero para ganarle a
// "m-d" cuando ambos existen en el mismo archivo. "bow-ps"/"bw-pl": arquero
// abajo/arriba (nombres distintos a "b-pl" en esos dos archivos de origen,
// ver bow-shotdown-position.json/bow-up-atack.json).
const NOMBRES_HITBOX_ARMA = ["sword-position", "m-d", "b-pl", "bow-ps", "bw-pl"];

// El JSON de este plugin no es plano por frame: es un array de hitboxes
// con nombre, cada uno con sus datos agrupados por TAG de animación
// (idle/Atack/...) tal como están definidos en el timeline de Aseprite.
// `frameIndex` es LOCAL a cada tag (0, 1, 2... dentro de ese tramo), no
// global a toda la hoja exportada -- así que hay que reconstruir el
// índice global sumando cuántos frames llevan los tags anteriores, en
// el mismo orden en que aparecen (el orden real del timeline). Devuelve
// un objeto { [frameGlobal]: {x,y,width,height} } o null si no se
// encuentra el hitbox pedido.
function puntosPorFrameDesdeHitbox(meta, nombreHitbox) {
  if (!Array.isArray(meta)) return null;
  const entry = meta.find((h) => h.hitBoxName === nombreHitbox);
  if (!entry || !Array.isArray(entry.tagData)) return null;
  const porFrameGlobal = {};
  let offset = 0;
  for (const tag of entry.tagData) {
    for (const f of tag.frames || []) {
      porFrameGlobal[offset + f.frameIndex] = f.bounds;
    }
    offset += (tag.frames || []).length;
  }
  return porFrameGlobal;
}

// Como cargarHojaFrames(), pero además intenta leer un JSON de metadatos
// (mismo nombre que la hoja, .json en vez de .png -- exportado desde
// Aseprite con el plugin de marcado de manos, ver
// puntosPorFrameDesdeHitbox) y de ahí el hitbox NOMBRE_HITBOX_MANO_ARMA
// para devolver, junto a los frames de siempre, un array paralelo de
// puntos de anclaje (mismo índice que `frames`, `null` en los frames sin
// dato o si el JSON no existe todavía -- es aditivo, no hace falta
// tenerlo en todas las hojas). El punto se pasa por la MISMA
// transformación de recorte+escala que ya sufre cada frame (bboxAlfa +
// `escala`), así queda en el mismo espacio de coordenadas en el que se
// dibuja el sprite final -- sin mantener la matemática de encaje en dos
// sitios distintos.
// onListo(frames, anclas)
function cargarHojaFramesConAncla(url, destSize, onListo, sinAmpliar) {
  const jsonUrl = url.replace(/\.png(\?.*)?$/, ".json$1");
  const im = new Image();
  im.onload = () => {
    // no-store: este JSON no lleva hash de contenido en el nombre de
    // archivo (a diferencia de los bundles de Vite) -- sin esto, un
    // navegador (o el propio servidor de Vite en dev, que en la práctica
    // devuelve 200 con el index.html de siempre para rutas que no
    // reconoce en vez de un 404 limpio) puede servir una versión cacheada
    // vieja del ancla después de que el usuario actualice el archivo.
    fetch(jsonUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((meta) => {
        const frameSize = im.naturalHeight;
        const frameCount = Math.max(1, Math.round(im.naturalWidth / frameSize));
        const tmp = document.createElement("canvas");
        tmp.width = frameSize;
        tmp.height = frameSize;
        const tg = tmp.getContext("2d");
        tg.imageSmoothingEnabled = false;
        const bboxes = [];
        for (let i = 0; i < frameCount; i++) {
          tg.clearRect(0, 0, frameSize, frameSize);
          tg.drawImage(im, i * frameSize, 0, frameSize, frameSize, 0, 0, frameSize, frameSize);
          bboxes.push(bboxAlfa(tg, frameSize, frameSize) || { x: 0, y: 0, w: frameSize, h: frameSize });
        }
        const altoMax = Math.max(...bboxes.map((b) => b.h));
        const escala = sinAmpliar
          ? Math.min(1, (destSize * 0.86) / altoMax)
          : (destSize * 0.86) / altoMax;
        const frames = [];
        for (let i = 0; i < frameCount; i++) {
          const b = bboxes[i];
          const c = document.createElement("canvas");
          c.width = destSize;
          c.height = destSize;
          const g = c.getContext("2d");
          g.imageSmoothingEnabled = false;
          const w = b.w * escala, h = b.h * escala;
          g.drawImage(im, i * frameSize + b.x, b.y, b.w, b.h, (destSize - w) / 2, destSize - h, w, h);
          frames.push(c);
        }

        // Punto por frame del arma (ver puntosPorFrameDesdeHitbox más
        // arriba) -- ya viene en índice GLOBAL de frame, uno por cada
        // frame que el usuario haya marcado en Aseprite (puede haber menos
        // frames marcados que `frameCount` si algún tramo no se marcó
        // todavía; esos quedan en `null` y caen al pivote fijo de siempre).
        // Se prueba cada nombre de NOMBRES_HITBOX_ARMA en orden y se usa
        // el primero que tenga datos -- distintas clases usan distinto
        // nombre según qué sostienen (mano vs arco).
        let puntosGlobales = null;
        for (const nombre of NOMBRES_HITBOX_ARMA) {
          const candidato = puntosPorFrameDesdeHitbox(meta, nombre);
          // tagData puede existir pero venir vacío (nada marcado todavía,
          // ver hands-walkdown.json antes de marcarlo) -- eso no cuenta
          // como "encontrado", si no el candidato siguiente (con datos de
          // verdad) nunca se llegaría a probar.
          if (candidato && Object.keys(candidato).length) {
            puntosGlobales = candidato;
            break;
          }
        }
        const anclas = new Array(frameCount).fill(null);
        if (puntosGlobales) {
          for (let i = 0; i < frameCount; i++) {
            const bounds = puntosGlobales[i];
            if (!bounds) continue;
            const b = bboxes[i];
            const sx = bounds.x + bounds.width / 2;
            const sy = bounds.y + bounds.height / 2;
            const w = b.w * escala, h = b.h * escala;
            anclas[i] = {
              x: (destSize - w) / 2 + (sx - b.x) * escala,
              y: destSize - h + (sy - b.y) * escala,
            };
          }
        }

        onListo(frames, anclas);
      });
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

// Héroe: p.r = 17 fijo para las 6 clases (ver core/gameflow.js). Exportado
// porque render/character.js lo necesita para convertir el ancla de mano
// (ver REAL_ATTACK_ANCLA/cargarHojaFramesConAncla) de espacio local del
// canvas a coordenadas de mundo, con la misma cuenta que ya hace
// drawSpriteBottom().
export const TAM_HEROE = 17 * FACTOR_SPRITE_HITBOX;

// Calibración del arma dibujada por código (ver render/character.js, bloque
// "arma apuntando") -- centralizado aquí en vez de números sueltos
// repartidos por ese archivo, para que la próxima recalibración (nuevo
// pack de arte, nueva clase...) tenga un único sitio que tocar.
export const CONFIG_ARMA = {
  // Escala general del dibujo esquemático (imagen real o trazos
  // vectoriales de fallback) contra el cuerpo heroB a tamaño real
  // (sinAmpliar, más arriba). Sin ancla real (ver REAL_ATTACK_ANCLA) es
  // el único punto de ajuste si el arma se ve grande/pequeña de más.
  escala: 0.75,
  // Pivote mano→punta del dibujo esquemático: GRIP ~ empuñadura (offset
  // desde el hombro/mano), REACH ~ alcance total hasta la punta de la
  // hoja. Solo se usa cuando no hay ancla real de Aseprite para el frame
  // (ver REAL_ATTACK_ANCLA) -- con ancla real, el punto ya viene dado.
  grip: 6,
  reach: 30,
  // Tamaño del icono de mano secundaria (escudo/libro, ver OFFHAND_IMG).
  offTam: 16,
  // Bamboleo de swing (giro extra tipo "espadazo" durante el golpe, solo
  // fallback sin ancla real): multiplicador de la curva y duración por
  // defecto si la clase no tiene ATTACK_DUR propio. `sinBamboleo` son las
  // clases que no deben recibir este giro -- apuntan y disparan/tensan en
  // vez de "espadear" (arquero tensa la cuerda con su propio mecanismo,
  // ARQUERO_BOW; mago apunta el cetro quieto, como el arco).
  bamboleo: {
    multiplicador: 1.6,
    // Con ancla real (mano de verdad, ver REAL_ATTACK_ANCLA en
    // character.js) la hoja se quedaba clavada en el ángulo de puntería
    // durante todo el golpe -- sin ningún giro propio se notaba rígida,
    // "sin peso". Este multiplicador (menor que el de arriba: la propia
    // mano ya aporta parte del movimiento del frame) añade un arco de
    // seguimiento suave encima de la puntería en vez de dejar la hoja
    // fija todo el golpe.
    multiplicadorAncla: 0.7,
    duracionPorDefecto: 0.18,
    // pícaro se suma aquí (además de arquero/mago): una daga apuñala en
    // línea recta, no "espadea" en arco -- ver `estocada` justo abajo, el
    // desplazamiento que sustituye a este giro para esa clase.
    sinBamboleo: new Set(["arquero", "mago", "picaro"]),
  },
  // Estocada: en vez del giro de "espadazo" (bamboleo, arriba) algunas
  // clases desplazan el arma hacia delante y la retraen -- una puñalada de
  // verdad, no un swing. Curva sin(prog·π): 0 al empezar el golpe, máximo
  // a mitad, vuelta a 0 al terminar (empuja y recoge, no se queda fuera).
  estocada: {
    clases: new Set(["picaro"]),
    // 8 -> 16 se notaba, pero combinado con el FX de la puñalada (ver
    // fxEstocada en abilities.js) se leía como si la daga saliera
    // disparada del cuerpo en vez de una puñalada corta -- 11 es un punto
    // medio: sigue notándose el empuje sin perder el anclaje a la mano.
    distancia: 11,
  },
};

// Cuerpo "heroB" (pack propio en torre-vespero-assets/Hero-sprites, estilo
// silueta monocromo) como personaje estándar y único para las 4 clases
// activas -- la diferencia visual entre clases la da el arma en mano (ver
// WEAPON_IMG más abajo) y el color de piel/ropa vía el sistema de skins
// existente, no un cuerpo distinto por clase. El cuerpo no varía por clase,
// solo por DIRECCIÓN (lateral/abajo/arriba, ver direccionDesdeAim() en
// world.js) -- de ahí que REAL_IDLE/REAL_RUN estén indexados por dirección
// y no por rol, a diferencia de REAL_ATTACK (más abajo), que sí es por
// clase porque cada arma anima distinto.
const REAL_IDLE_SRC = {
  side: assetUrl("characters/heroB_idle_side"),
  down: assetUrl("characters/heroB_idle_down"),
  up: assetUrl("characters/heroB_idle_up"),
};
const REAL_RUN_SRC = {
  side: assetUrl("characters/heroB_run_side"),
  down: assetUrl("characters/heroB_run_down"),
  up: assetUrl("characters/heroB_run_up"),
};

export const REAL_IDLE = { side: [], down: [], up: [] };
export const REAL_RUN = { side: [], down: [], up: [] };
// Ancla de mano por frame de idle/correr (mismo mecanismo que
// REAL_ATTACK_ANCLA más abajo, ver cargarHojaFramesConAncla) -- el cuerpo
// heroB es compartido entre clases, así que el ancla también lo es, no
// hay que repetirla por clase.
export const REAL_IDLE_ANCLA = { side: [], down: [], up: [] };
export const REAL_RUN_ANCLA = { side: [], down: [], up: [] };

// Capas de armadura equipable (casco/peto/piernas -- primer set del juego,
// drop real del Guardián de Hielo, ver systems/loot.js): exportadas por
// capa desde los .aseprite en
// torre-vespero-assets/Hero-sprites/right-left/armadura (`aseprite -b
// --layer <capa> archivo.aseprite --sheet salida.png`, la MISMA rejilla de
// frames que el cuerpo, solo cambia qué layer quedó visible) a
// public/assets/sprites/characters/armor/. Cubren idle/correr (cuerpo
// compartido, 3 direcciones) y el ataque básico del guerrero (3
// direcciones) + herido -- especial/dash/muerte no tienen arte de
// armadura todavía (el .aseprite de origen no trae esas capas nombradas o
// su nº de frames no encaja con el sprite ya cargado en el juego, ver
// conversación), así que esas animaciones simplemente no dibujan la capa
// (queda `null`, ver calcularPoseHeroe en render/character.js), no es un
// bug -- solo falta exportarlas el día que haya arte para ellas.
const ARMOR_BASE_IDLE = { side: "heroB_idle_side", down: "heroB_idle_down", up: "heroB_idle_up" };
const ARMOR_BASE_RUN = { side: "heroB_run_side", down: "heroB_run_down", up: "heroB_run_up" };
const ARMOR_BASE_ATTACK_GUERRERO = {
  side: "heroB_attack_guerrero_side",
  down: "heroB_attack_guerrero_down",
  up: "heroB_attack_guerrero_up",
};
const ARMOR_BASE_HURT = "heroB_hurt_down";

export const CASCO_IDLE = { side: [], down: [], up: [] };
export const PETO_IDLE = { side: [], down: [], up: [] };
export const PIERNAS_IDLE = { side: [], down: [], up: [] };
export const CASCO_RUN = { side: [], down: [], up: [] };
export const PETO_RUN = { side: [], down: [], up: [] };
export const PIERNAS_RUN = { side: [], down: [], up: [] };
export const CASCO_ATTACK = { guerrero: {} };
export const PETO_ATTACK = { guerrero: {} };
export const PIERNAS_ATTACK = { guerrero: {} };
export const CASCO_HURT = [];
export const PETO_HURT = [];
export const PIERNAS_HURT = [];

// URLs de las 3 capas de armadura para un `baseName` (ver ARMOR_BASE_* arriba).
function armorUrlsDe(baseName) {
  return {
    casco: assetUrl(`characters/armor/${baseName}_casco`),
    peto: assetUrl(`characters/armor/${baseName}_peto`),
    piernas: assetUrl(`characters/armor/${baseName}_piernas`),
  };
}

for (const dirIdle in REAL_IDLE_SRC) {
  cargarHojaConArmadura(REAL_IDLE_SRC[dirIdle], armorUrlsDe(ARMOR_BASE_IDLE[dirIdle]), TAM_HEROE, true, (frames, anclas, capas) => {
    REAL_IDLE[dirIdle] = frames;
    REAL_IDLE_ANCLA[dirIdle] = anclas;
    CASCO_IDLE[dirIdle] = capas.casco;
    PETO_IDLE[dirIdle] = capas.peto;
    PIERNAS_IDLE[dirIdle] = capas.piernas;
  });
}
for (const dirRun in REAL_RUN_SRC) {
  cargarHojaConArmadura(REAL_RUN_SRC[dirRun], armorUrlsDe(ARMOR_BASE_RUN[dirRun]), TAM_HEROE, true, (frames, anclas, capas) => {
    REAL_RUN[dirRun] = frames;
    REAL_RUN_ANCLA[dirRun] = anclas;
    CASCO_RUN[dirRun] = capas.casco;
    PETO_RUN[dirRun] = capas.peto;
    PIERNAS_RUN[dirRun] = capas.piernas;
  });
}

// Herido (flinch al recibir daño, ver p.golpeT en systems/combat.js) y
// muerte (colapso al llegar a 0 HP, ver p.ko) -- cuerpo compartido, igual
// que idle/correr. El pack de origen SOLO trae la dirección "abajo" para
// estos dos estados todavía (sin lateral/arriba) -- se usa esa misma
// animación sin importar hacia dónde mira el personaje en ese instante,
// mejor que no mostrar nada (mismo criterio de "usar lo que hay" que el
// resto del pack). Un único "hero" layer sin marcar en el .aseprite de
// origen -- sin datos de ancla de mano, así que el arma (si se dibuja
// durante estos estados) cae al pivote fijo de siempre.
const REAL_HURT_SRC = assetUrl("characters/heroB_hurt_down");
const REAL_MUERTE_SRC = assetUrl("characters/heroB_dead_down");

export const REAL_HURT = [];
export const REAL_MUERTE = [];

cargarHojaConArmadura(REAL_HURT_SRC, armorUrlsDe(ARMOR_BASE_HURT), TAM_HEROE, true, (frames, anclas, capas) => {
  REAL_HURT.push(...frames);
  CASCO_HURT.push(...capas.casco);
  PETO_HURT.push(...capas.peto);
  PIERNAS_HURT.push(...capas.piernas);
});
cargarHojaFrames(REAL_MUERTE_SRC, TAM_HEROE, (frames) => { REAL_MUERTE.push(...frames); }, true);

// Duración del colapso hasta quedarse tumbado del todo -- después se
// mantiene fijo en el último fotograma (ver p.koAnimT en core/loop.js y
// el bloque `if (p.ko)` en render/character.js) mientras dura el K.O., no
// vuelve a jugarse en bucle.
export const MUERTE_DUR = 0.6;

// Ataque básico: cada clase usa el fotograma "ataque básico" real del pack
// heroB (torre-vespero-assets/Hero-sprites) que mejor encaja con su arma,
// por cada dirección de la que haya arte -- guerrero y arquero tienen las
// 3 (lateral/abajo/arriba); mago y pícaro por ahora solo lateral (world.js
// cae al frame de idle de esa dirección si no existe REAL_ATTACK[rol][dir],
// igual que clérigo/druida caían al idle cuando no tenían REAL_ATTACK en
// absoluto). El pack trae también variantes "especial"/"dash"/"aereo" por
// clase (Guerrero ataque especial 2, Mago ataque especial 2/3 invoca
// circulo...) sin usar todavía -- no hay mecánica de ataque especial en el
// juego, solo un REAL_ATTACK por clase/dirección.
const REAL_ATTACK_SRC = {
  guerrero: {
    side: assetUrl("characters/heroB_attack_guerrero_side"),
    down: assetUrl("characters/heroB_attack_guerrero_down"),
    up: assetUrl("characters/heroB_attack_guerrero_up"),
  },
  picaro: {
    side: assetUrl("characters/heroB_attack_picaro_side"),
  },
  mago: {
    side: assetUrl("characters/heroB_attack_mago_side"),
  },
  arquero: {
    side: assetUrl("characters/heroB_attack_arquero_side"),
    down: assetUrl("characters/heroB_attack_arquero_down"),
    up: assetUrl("characters/heroB_attack_arquero_up"),
  },
};

export const REAL_ATTACK = { guerrero: {}, arquero: {}, picaro: {}, mago: {} };
// Punto de anclaje de la mano por frame (ver cargarHojaFramesConAncla() y
// SLICE_ANCLA_MANO más arriba) -- mismo índice que REAL_ATTACK[rol][dir],
// `null` en los frames/hojas sin slice todavía (fallback al pivote fijo
// en world.js). Aditivo: no hace falta que todas las hojas lo tengan.
export const REAL_ATTACK_ANCLA = { guerrero: {}, arquero: {}, picaro: {}, mago: {} };

for (const rolAtk in REAL_ATTACK_SRC) {
  for (const dirAtk in REAL_ATTACK_SRC[rolAtk]) {
    // Solo el guerrero tiene arte de armadura para el ataque básico todavía
    // (ver ARMOR_BASE_ATTACK_GUERRERO arriba) -- el resto de clases usa el
    // loader simple de siempre, sin capas.
    if (rolAtk === "guerrero") {
      cargarHojaConArmadura(REAL_ATTACK_SRC[rolAtk][dirAtk], armorUrlsDe(ARMOR_BASE_ATTACK_GUERRERO[dirAtk]), TAM_HEROE, true, (frames, anclas, capas) => {
        REAL_ATTACK[rolAtk][dirAtk] = frames;
        REAL_ATTACK_ANCLA[rolAtk][dirAtk] = anclas;
        CASCO_ATTACK.guerrero[dirAtk] = capas.casco;
        PETO_ATTACK.guerrero[dirAtk] = capas.peto;
        PIERNAS_ATTACK.guerrero[dirAtk] = capas.piernas;
      });
    } else {
      cargarHojaFramesConAncla(REAL_ATTACK_SRC[rolAtk][dirAtk], TAM_HEROE, (frames, anclas) => {
        REAL_ATTACK[rolAtk][dirAtk] = frames;
        REAL_ATTACK_ANCLA[rolAtk][dirAtk] = anclas;
      }, true);
    }
  }
}

export const ATTACK_DUR = { guerrero: 0.22, arquero: 0.3, picaro: 0.1, mago: 0.25 };

// Golpe Colosal (combo de 4 pips, ver abilities.js: atacar()) y Estocada
// (dash-ataque nuevo, ver abilities.js: dashAtaque()): mismas 3 direcciones
// que el ataque básico del guerrero, hojas propias (no reutilizan
// REAL_ATTACK). p.swingT/p.dashAtkT se fijan a estos mismos valores en
// abilities.js -- si se recalibra la duración aquí, hay que tocar también
// esos números (comentario cruzado en abilities.js).
const REAL_SPECIAL_SRC = {
  guerrero: {
    side: assetUrl("characters/heroB_special_guerrero_side"),
    down: assetUrl("characters/heroB_special_guerrero_down"),
    up: assetUrl("characters/heroB_special_guerrero_up"),
  },
};
const REAL_DASH_SRC = {
  guerrero: {
    side: assetUrl("characters/heroB_dash_guerrero_side"),
    down: assetUrl("characters/heroB_dash_guerrero_down"),
    up: assetUrl("characters/heroB_dash_guerrero_up"),
  },
};

export const REAL_SPECIAL = { guerrero: {} };
export const REAL_SPECIAL_ANCLA = { guerrero: {} };
export const REAL_DASH = { guerrero: {} };
export const REAL_DASH_ANCLA = { guerrero: {} };

for (const rolEsp in REAL_SPECIAL_SRC) {
  for (const dirEsp in REAL_SPECIAL_SRC[rolEsp]) {
    cargarHojaFramesConAncla(REAL_SPECIAL_SRC[rolEsp][dirEsp], TAM_HEROE, (frames, anclas) => {
      REAL_SPECIAL[rolEsp][dirEsp] = frames;
      REAL_SPECIAL_ANCLA[rolEsp][dirEsp] = anclas;
    }, true);
  }
}
for (const rolDash in REAL_DASH_SRC) {
  for (const dirDash in REAL_DASH_SRC[rolDash]) {
    cargarHojaFramesConAncla(REAL_DASH_SRC[rolDash][dirDash], TAM_HEROE, (frames, anclas) => {
      REAL_DASH[rolDash][dirDash] = frames;
      REAL_DASH_ANCLA[rolDash][dirDash] = anclas;
    }, true);
  }
}

export const SPECIAL_ATTACK_DUR = { guerrero: 0.26 };
export const DASH_ATTACK_DUR = { guerrero: 0.28 };

// true = el arte de origen de esta clase mira a la IZQUIERDA por defecto,
// hay que invertir la fórmula de espejo normal (world.js) para ella.
// Confirmado a ojo exportando cada hoja lateral: guerrero/pícaro miran a
// la derecha (Hero-Sword-atack-right-left, puñalada), arquero/mago a la
// izquierda (Arquero-ataque lateral basico 01 -- se llamaba literalmente
// "HeroBowLeftAttack01" antes de que el usuario renombrara la carpeta de
// origen -- y Mago ataque basico 1, el fogonazo sale por la izquierda del
// cuerpo). El cuerpo compartido (idle/correr) no necesita esta tabla: su
// convención coincide con guerrero/pícaro.
export const MIRA_IZQUIERDA_POR_DEFECTO = { arquero: true, mago: true };

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

// Guardián de Hielo (primer jefe real del juego, planta 5 -- ver
// core/loop.js: rama `arq === "hielo"`, systems/floorgen.js). Pack de
// sprites reales entregado como PNG sueltos (uno por fotograma, no una
// hoja), cada uno ya recortado a su propio contenido (dimensiones NO
// uniformes entre frames) -- ver cargarFramesSueltosTrim() más arriba.
// r=46 (TIPOS.jefe normal usa r=28, ver systems/combat.js): imponente a
// propósito, es el primer jefe real del juego.
const FROST_ALTO = 46 * FACTOR_SPRITE_HITBOX;
const FROST_ANIM = { idle: 6, walk: 10, atk: 14, hit: 7, death: 16 };
const FROST_CARPETA = { idle: "idle", walk: "walk", atk: "1_atk", hit: "take_hit", death: "death" };

export const FROST_GUARDIAN = { idle: [], walk: [], atk: [], hit: [], death: [] };

for (const anim in FROST_ANIM) {
  const n = FROST_ANIM[anim];
  const carpeta = FROST_CARPETA[anim];
  const urls = Array.from({ length: n }, (_, i) => assetUrl(`enemies/frost_guardian/${carpeta}_${i + 1}`));
  cargarFramesSueltosTrim(urls, FROST_ALTO, (frames) => {
    FROST_GUARDIAN[anim] = frames;
  });
}

// Muñeco de pruebas (torre-vespero-assets/Dummy, ver core/gameflow.js: los
// 3 dummy que aparecen en el lobby, r=15): 4 PNG sueltos (mismo criterio que
// el Guardián de Hielo, ver cargarFramesSueltosTrim arriba) -- es la
// reacción de "golpeado" del propio pack, no una animación de reposo/golpe
// separada, así que el frame 0 hace de pose de reposo y el resto se juega
// en secuencia mientras dura `e.hurtT` (ver render/character.js).
const DUMMY_ALTO = 15 * FACTOR_SPRITE_HITBOX;
export const DUMMY_HIT = [];
cargarFramesSueltosTrim(
  Array.from({ length: 4 }, (_, i) => assetUrl(`dummy/hit_${i + 1}`)),
  DUMMY_ALTO,
  (frames) => { DUMMY_HIT.push(...frames); },
);

// Destello de impacto (torre-vespero-assets/Dummy/Impact-Vfx, misma entrega
// que el muñeco de pruebas de arriba): chispazo genérico al golpear un
// objeto del escenario (barriles, pilares destructibles -- ver fxImpacto en
// render/effects.js, llamado desde golpeObjeto/danoPilar en
// systems/abilities.js), no solo al romperlo. 4 PNG ya a tamaño uniforme
// (20x26, confirmado por archivo) y pre-centrados por el propio artista --
// a diferencia de DUMMY_HIT/FROST_GUARDIAN (que anclan por los pies), aquí
// no hace falta recorte/reposicionado: se cargan tal cual y se dibujan
// centrados en el punto de impacto (mismo criterio que SANGRE_ANIM).
export const IMPACT_VFX = [];
for (let iImpact = 1; iImpact <= 4; iImpact++) {
  const imImpact = new Image();
  const idxImpact = iImpact - 1;
  imImpact.onload = () => { IMPACT_VFX[idxImpact] = imImpact; };
  imImpact.src = assetUrl(`fx/impact_${iImpact}`);
}
export const IMPACT_VFX_DUR = 4 / 15; // mismo ritmo que SANGRE_FPS (~15fps)

// Fases de rotura del pilar de hielo del Guardián (ver render/world.js,
// bucle de G.pilares, rama pl.hielo): hoja en rejilla 4x2 -- fila 1 intacto
// -> grietas, fila 2 se parte -> escombro en el suelo (8 fases en total).
// world.js elige la fase por fracción de vida perdida (pl.hp/pl.hpMax), no
// por tiempo. destSize=160: resolución de horneado generosa, luego
// world.js la reescala al tamaño real del pilar (pl.r*2.6) al dibujar.
export const PILAR_HIELO_FRAMES = [];
cargarHojaFramesGrid(assetUrl("pilar-hielo-frames"), 4, 2, 160, (frames) => {
  PILAR_HIELO_FRAMES.push(...frames);
});

// Imagen/escala BASE de un enemigo por tipo (sin la animación de correr de
// MOB_RUN, que sustituye el frame según el reloj de animación -- eso es
// dinámico por fotograma y se queda en renderEnemigo, ver render/character.js).
// Centralizado aquí para que renderEnemigo() y fxDesintegrarEnemigo() (ver
// render/effects.js, la nube de píxeles al morir) usen SIEMPRE el mismo
// sprite -- antes esta cadena de if/else solo vivía en renderEnemigo, y
// duplicarla a mano en otro sitio se habría desincronizado tarde o temprano.
// Devuelve null para los enemigos con su propio pipeline de dibujo aparte
// (dummy, clonRol, cerdo/jefe secreto, portal) -- no aplica el criterio de
// "sprite + escala" de un mob normal.
export function seleccionarImgEnemigo(e) {
  if (e.dummy) return { img: SPR.dummy, esc: 1, mobKey: null };
  if (e.clonRol) return { img: SPR[e.clonRol], esc: 1, mobKey: null };
  if (e.cerdo || e.portalT > 0 || e.arquetipo === "hielo") return null;
  if (e.jefe) return { img: SPR.brutoB, esc: G.planta >= 90 ? 2.4 : 2, mobKey: null };
  if (e.mini) return { img: SPR.slime, esc: 1.7, mobKey: null };
  if (e.tipo === "tank") return { img: SPR.golem, esc: e.elite ? 1.5 : 1.25, mobKey: "golem" };
  if (e.tipo === "runner") return { img: SPR.acechador, esc: e.elite ? 1.1 : 0.85, mobKey: "acechador" };
  if (e.tipo === "bomber") return { img: SPR.bomber, esc: e.elite ? 1.3 : 1, mobKey: null };
  if (e.tipo === "caster") return { img: SPR.hechicero, esc: e.elite ? 1.2 : 0.95, mobKey: "hechicero" };
  if (e.elite) return { img: SPR.bruto, esc: 1.35, mobKey: "bruto" };
  if (e.ranged) return { img: SPR.ojo, esc: 1, mobKey: "ojo" };
  return { img: SPR.esqueleto, esc: 1, mobKey: "esqueleto" };
}

// Arma en mano: sprite real (recorte individual y limpio, no una hoja
// compartida) en vez del dibujo esquemático de siempre (ver world.js,
// bloque "arma apuntando"). Solo existe la pieza de madera -- en vez de
// necesitar un set de piezas distinto por material/rareza (hueso, etc.), se
// generan las 5 variantes de RAREZAS recoloreando esta misma pieza por
// código (ver teñirSprite() más abajo): mismo sombreado del pixel art
// original, solo cambia el tono, más un halo de color para rareza alta.
// arquero no está aquí: usa ARQUERO_BOW más abajo (3 frames animados, no un
// sprite fijo) en vez de este mecanismo de imagen única.
const WEAPON_SRC = {
  guerrero: assetUrl("weapons/wood-weapons/sword-wood"),
  picaro: assetUrl("weapons/wood-weapons/dagger-wood"),
  mago: assetUrl("weapons/wood-weapons/magic-wood"),
  clerigo: assetUrl("weapons/wood-weapons/hammer-wood"),
  druida: assetUrl("weapons/wood-weapons/staff-wood"),
};

// Mano secundaria (no gira con la puntería, se lleva más estática): libro
// para clérigo -- el resto de clases no lleva nada aquí. Escudo de guerrero
// quitado de momento (a petición del usuario) mientras se verifica el
// encaje del pack heroB nuevo sin ese elemento de por medio.
const OFFHAND_SRC = {
  clerigo: assetUrl("weapons/wood-weapons/book-w"),
};

// Recolorea `img` al tono de `color` conservando su sombreado (blend "hue":
// toma el matiz del color de relleno pero conserva luminosidad/saturación
// de cada píxel original) y lo vuelve a recortar exactamente a su silueta
// original (si no, el relleno del blend deja opaco todo el rectángulo,
// incluidas las zonas transparentes). Devuelve un <canvas>, no un <img>.
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

// Martillo de Frhor (drop garantizado del Guardián de Hielo, ver
// systems/combat.js: matarEnemigo()) -- "azul zafiro" pedido a propósito
// distinto del morado normal de Épico (RAREZAS[2].col), así que se tiñe
// aparte en vez de tirar de WEAPON_IMG_RAREZA.clerigo[2]. Carga su propia
// copia de la base hammer-wood (en vez de esperar a WEAPON_IMG.clerigo,
// que se rellena de forma asíncrona más arriba y podría no estar listo
// todavía) para no depender de orden de carga entre los dos.
export let MARTILLO_FRHOR_IMG = null;
(() => {
  const im = new Image();
  im.onload = () => {
    MARTILLO_FRHOR_IMG = teñirSprite(im, "#2f5fd6");
  };
  im.src = WEAPON_SRC.clerigo;
})();

// Arco del arquero: 3 frames (relajado / medio tensado / tensado del todo,
// recortados de Weapons/Wood/Wood.png -- animación real "Bow", no un giro de
// hoja) en vez de un sprite fijo. ARQUERO_BOW[tier][frame] -- cada uno de los
// 3 frames se recolorea igual que el resto de armas por tier de rareza.
export const ARQUERO_BOW = RAREZAS.map(() => []);

cargarHojaFrames(assetUrl("weapons/wood-weapons/bow-tension"), 32, (frames) => {
  frames.forEach((frame, i) => {
    RAREZAS.forEach((r, tier) => {
      ARQUERO_BOW[tier][i] = tier === 0 ? frame : teñirSprite(frame, r.col);
    });
  });
});

export const ARQUERO_BOW_DUR = 0.35; // duración del gesto de tensar el arco al atacar

// Pool de arte real por variante para el arma (pack "iron-weapons", ver
// public/assets/sprites/weapons/iron-weapons/ y ARMA_ARTE_VARIANTES en
// core/constants.js) -- cambia la mecánica de icono: en vez de UN sprite
// base reteñido por rareza (WEAPON_IMG_RAREZA, arriba), cada objeto
// generado guarda su propio `arteIdx` ESTABLE (ver genItem() en
// systems/loot.js) y siempre muestra ESA imagen concreta, sin recolorear --
// la rareza se transmite con el halo/brillo (ver character.js/world.js), no
// tiñendo el sprite. "picaro" (daga) tiene huecos reales en la numeración
// de archivo (no hay daga (2)/(3)) -- de ahí la lista explícita en vez de
// un rango 1..N como guerrero/arquero.
const IRON_WEAPON_NUMS = {
  guerrero: [1, 2, 3, 4, 5, 6],
  arquero: Array.from({ length: 16 }, (_, i) => i + 1),
  picaro: [1, 4, 5, 6, 7],
};
const IRON_WEAPON_PREFIX = { guerrero: "sword", arquero: "arco", picaro: "daga" };
export const WEAPON_ART_POOL = { guerrero: [], arquero: [], picaro: [] };
for (const rolIron in IRON_WEAPON_NUMS) {
  IRON_WEAPON_NUMS[rolIron].forEach((n, idx) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.drawImage(im, 0, 0);
      WEAPON_ART_POOL[rolIron][idx] = c;
    };
    im.onerror = () => console.warn("No se pudo cargar arte de arma: " + im.src);
    im.src = `${import.meta.env.BASE_URL}assets/sprites/weapons/iron-weapons/${IRON_WEAPON_PREFIX[rolIron]} (${n}).png`;
  });
}

// Punto de mango y de punta (píxeles del PNG de 32x32 origen, medidos a
// mano en Aseprite) por variante -- para orientar el arma en mano según su
// propio dibujo real en vez de un ángulo fijo adivinado (ver render/
// character.js: rotación = -atan2(punta-mango), confirmado con un barrido
// numérico de ángulos, no solo a ojo). guerrero: las 6 variantes de
// "sword" (incluye una hoz y un látigo, pero comparten la MISMA plantilla
// de mango abajo-derecha / punta arriba-izquierda, confirmado comparando
// las 6 en rejilla) usan el mismo punto. picaro: mismo criterio con
// "daga", plantilla más corta. arquero no tiene entrada aquí a propósito
// -- el arco en mano usa su propia animación de tensado (ARQUERO_BOW más
// arriba), nunca pasa por este camino; el arco de iron-weapons solo se ve
// en el suelo/inventario (iconoDrop), sin rotación que calibrar.
const ARMA_HILT_TIP = {
  guerrero: Array(6).fill({ hilt: [25, 25], tip: [4, 4] }),
  picaro: Array(5).fill({ hilt: [24, 24], tip: [7, 7] }),
};
export function armaHiltTip(clase, arteIdx) {
  const arr = ARMA_HILT_TIP[clase];
  return arr ? arr[arteIdx % arr.length] : null;
}

// Sangre de impacto (torre-vespero-assets/BloodFX Batch 1): sustituye el
// simple estallido de píxeles cuadrados de fxParticulas por una salpicadura
// real dibujada a mano, con su propia animación de crecimiento -> goteo.
// La hoja de origen ("VFX Blood Batch 1_SpriteSheetRows.png", ya exportada
// así desde Aseprite) es una REJILLA de 14 columnas x 9 filas a 110x93 por
// celda -- cada fila es una animación de salpicadura distinta, pero con
// menos fotogramas reales que las 14 columnas (el resto de la fila queda
// transparente de relleno, por eso hace falta el recuento manual de abajo
// en vez de asumir 14 en todas). Solo se cargan 3 de las 9 filas (variedad
// de sobra sin tener 9 animaciones en memoria) -- fila 0 (salpicadura
// simétrica hacia arriba), fila 6 (la más grande y dramática, con un
// barrido lateral) y fila 8 (un estallido denso y compacto). El resto
// (filas 1,2,3,4,5,7) se puede sumar más adelante sin volver a exportar
// nada, ya están en la misma hoja.
const SANGRE_CELDA = { w: 110, h: 93 };
const SANGRE_FILAS = [
  { fila: 0, frames: 11 },
  { fila: 6, frames: 14 },
  { fila: 8, frames: 12 },
];
const SANGRE_FPS = 15; // ~66ms/fotograma, el mismo ritmo que trae la hoja de origen

export const SANGRE_ANIM = []; // SANGRE_ANIM[variante] = array de canvases
export const SANGRE_DUR = []; // SANGRE_DUR[variante] = duración total en segundos

(function cargarSangre() {
  const im = new Image();
  im.onload = () => {
    for (const { fila, frames } of SANGRE_FILAS) {
      const variante = [];
      for (let i = 0; i < frames; i++) {
        const c = document.createElement("canvas");
        c.width = SANGRE_CELDA.w;
        c.height = SANGRE_CELDA.h;
        const g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.drawImage(
          im,
          i * SANGRE_CELDA.w, fila * SANGRE_CELDA.h, SANGRE_CELDA.w, SANGRE_CELDA.h,
          0, 0, SANGRE_CELDA.w, SANGRE_CELDA.h,
        );
        variante.push(c);
      }
      SANGRE_ANIM.push(variante);
      SANGRE_DUR.push(frames / SANGRE_FPS);
    }
  };
  im.onerror = () => console.warn("No se pudo cargar hoja de sangre: " + im.src);
  im.src = assetUrl("fx/blood_batch1");
})();

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
        const armR = p.equipo.peto ? p.equipo.peto.rareza : -1;
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
