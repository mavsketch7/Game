// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W, animGlobal, avanzarAnimGlobal, cx } from "../core/canvas.js";
import { ELEMENTOS, ETQ, MAX_PLANTA, PILAR_ROTO_DUR, RAREZAS, SALA_H, SALA_W, SLOT_LABEL, SUPS } from "../core/constants.js";
import { G } from "../core/state.js";
import { renderHUD } from "./hud.js";
import { CAMPFIRE_CELDA, FIRE_COLUMN, FIREBALL_FH, FIREBALL_FRAMES, FIREBALL_FW, FIREBALL_SHEET, FIRE_EXPLOSION_FH, FIRE_EXPLOSION_FRAMES, FIRE_EXPLOSION_FW, FIRE_EXPLOSION_INICIO, FIRE_EXPLOSION_SHEET, FROST_GUARDIAN, ICE_BURST, IMPACT_VFX, KENNEY_TILE, PILAR_HIELO_FRAMES, SANGRE_ANIM, SANGRE_DUR, SHEETS, SPR, assetOK, campfireFrame, iconoDrop, muroBordeBasePatron, muroBordeLateralPatron, muroBordeSuperiorPatron, muroEsquinaImg, remateMuroPatron, wallPatron } from "./sprites.js";
import { drawSprite, drawSpriteBottom } from "./spriteDraw.js";
import { renderEnemigo, renderJugador, renderMira } from "./character.js";
import { EXPLOSION_BURST_DUR, EXPLOSION_FADE_DUR } from "../systems/abilities.js";
import { mouse } from "../systems/input.js";
import { clamp, hexRgba, ri, rnd } from "../utils/helpers.js";

// Icono estático (frame 0, reposo) del mismo sprite del yunque animado
// que usa ui/forjaFusion.js (ver .herreria-yunque en styles/main.css --
// tira horizontal de 17 fotogramas NATIVOS de 32x32 -- 544x32 en total;
// el CSS lo escala x3.75 con background-size:2040px, pero el archivo en
// sí sigue siendo 32x32 por frame, 0,0 es el fotograma de reposo) --
// pedido expreso: el marcador de Mesa de Trabajo debe mostrar el yunque
// de verdad, no el emoji ⚒.
const imYunqueIco = new Image();
let yunqueIcoListo = false;
imYunqueIco.onload = () => {
  yunqueIcoListo = true;
};
imYunqueIco.src = `${import.meta.env.BASE_URL}assets/ui/ui-ingame/anvil-forja-strip.png`;

// Marcador de estación con menú propio (Mesa de Trabajo, Fragua, Arena
// PvP...): banderín de dos puntas (en vez del anillo pulsante genérico
// de antes) con el icono de la estación dentro -- pedido expreso, "para
// facilitar saber qué menú estamos abriendo". Common a las 3 (mercader/
// sastre YA tienen su propio sprite de personaje distintivo, se quedan
// como estaban). `icono` es un emoji de reserva si `sprite` (imagen +
// recorte) no está listo o no se pasa.
function dibujarMarcadorBanderin(m, { color, colorClaro, icono, etiqueta, sprite }) {
  const bob = Math.sin(animGlobal * 2.2) * 3;
  const bx = m.x,
    by = m.y - 40 + bob;
  const w = 32,
    h = 24;
  // resplandor suave detrás, sustituye a los 3 anillos concéntricos de antes
  const pulso = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(animGlobal * 3));
  const grad = cx.createRadialGradient(bx, by, 2, bx, by, 26);
  grad.addColorStop(0, hexRgba(color, pulso));
  grad.addColorStop(1, hexRgba(color, 0));
  cx.fillStyle = grad;
  cx.beginPath();
  cx.arc(bx, by, 26, 0, TAU);
  cx.fill();
  // sombra en el suelo, en el punto real de interacción
  cx.fillStyle = "rgba(0,0,0,.32)";
  cx.beginPath();
  cx.ellipse(m.x, m.y + 16, 12, 4, 0, 0, TAU);
  cx.fill();
  // cuerpo del banderín: techo redondeado, dos puntas abajo (una V hacia
  // dentro en el centro reparte el borde inferior en dos picos)
  cx.save();
  cx.translate(bx, by);
  cx.beginPath();
  cx.moveTo(-w / 2, -h / 2 + 6);
  cx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + 6, -h / 2);
  cx.lineTo(w / 2 - 6, -h / 2);
  cx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + 6);
  cx.lineTo(w / 2, h / 2 - 6);
  cx.lineTo(2, h / 2 - 3);
  cx.lineTo(0, h / 2 + 5);
  cx.lineTo(-2, h / 2 - 3);
  cx.lineTo(-w / 2, h / 2 - 6);
  cx.closePath();
  cx.fillStyle = "rgba(18,13,8,.88)";
  cx.fill();
  cx.strokeStyle = color;
  cx.lineWidth = 2;
  cx.stroke();
  if (sprite && sprite.img && sprite.ready) {
    const s = 18;
    cx.drawImage(
      sprite.img,
      sprite.sx,
      sprite.sy,
      sprite.sw,
      sprite.sh,
      -s / 2,
      -h / 2 + 3,
      s,
      s,
    );
  } else {
    cx.fillStyle = colorClaro || color;
    cx.font = "700 13px Alegreya Sans";
    cx.textAlign = "center";
    cx.fillText(icono, 0, -1);
  }
  cx.restore();
  cx.fillStyle = colorClaro || color;
  cx.font = "700 10px Alegreya Sans";
  cx.textAlign = "center";
  cx.fillText(etiqueta, m.x, m.y + 34);
}

export let sueloPat = null,
        sueloClave = "";

// Fondo horneado de una sala diseñada en el Telar de Mazmorras (G.fondo,
// ver customRooms/*.json + generarMapa() en floorgen.js) -- una imagen
// EXACTA de suelo+pared+decoración que sustituye al suelo uniforme + muros
// auto-rematados de siempre, para libertad total de forma. Caché por ruta
// (no por sala: la misma imagen puede reutilizarse si dos salas comparten
// forma) -- nunca se limpia, son pocas y pesan poco frente al resto de
// assets del juego.
const fondoImgs = {};
function fondoImg(ruta) {
        if (!ruta) return null;
        let im = fondoImgs[ruta];
        if (!im) {
          im = new Image();
          im.src = ruta;
          fondoImgs[ruta] = im;
        }
        return im.complete && im.naturalWidth ? im : null;
      }

// tema de suelo preferido por forma de sala -- así al cruzar una puerta
// entre dos salas de formas distintas la textura cambia con ellas, en vez
// de depender solo del número de planta (ver claveSuelo en render())
const TEMA_SUELO_FORMA = {
        sala: "floorA",
        cruz: "floorB",
        partida: "floorB",
        foso: "floorA",
        columnas: "floorA",
        pasilloL: "floorB",
        nicho: "floorA",
        u: "floorB",
        pasilloDoble: "floorA",
        antesala: "floorB",
        herradura: "floorA",
        escalonada: "floorB",
      };

function patronSuelo(f, forma, tipo) {
        // prueba: tile real de Kenney Tiny Dungeon (misma familia visual que
        // enemigos/PNJs/props ya sustituidos), con prioridad sobre la textura
        // suelo1/suelo2 anterior para lograr coherencia visual.
        const kenneyKey =
          tipo === "reto_parry"
            ? "floorB"
            : TEMA_SUELO_FORMA[forma] || (f % 10 < 5 ? "floorA" : "floorB");
        if (KENNEY_TILE[kenneyKey]) return cx.createPattern(KENNEY_TILE[kenneyKey], "repeat");
        // usar baldosa de mazmorra tileable (espejada, sin costuras)
        const tileKey = kenneyKey === "floorA" ? "suelo1" : "suelo2";
        if (assetOK(tileKey)) {
          const src = SHEETS[tileKey];
          // dibujar la baldosa a un tamaño múltiplo entero para que encaje limpia
          const TS = 128;
          const c = document.createElement("canvas");
          c.width = TS;
          c.height = TS;
          const g = c.getContext("2d");
          g.imageSmoothingEnabled = true;
          g.drawImage(
            src,
            0,
            0,
            src.naturalWidth,
            src.naturalHeight,
            0,
            0,
            TS,
            TS,
          );
          // viñeteado sutil para que los sprites resalten
          g.fillStyle = "rgba(10,8,17,.22)";
          g.fillRect(0, 0, TS, TS);
          return cx.createPattern(c, "repeat");
        }
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        const g = c.getContext("2d");
        const t = f / MAX_PLANTA;
        const base =
          t > 0.9
            ? "#2a1520"
            : t > 0.7
              ? "#221a2e"
              : t > 0.5
                ? "#1f1a30"
                : t > 0.3
                  ? "#1b1728"
                  : "#181524";
        const alt =
          t > 0.9
            ? "#341820"
            : t > 0.7
              ? "#271e33"
              : t > 0.5
                ? "#241e36"
                : t > 0.3
                  ? "#201b2e"
                  : "#1c1929";
        g.fillStyle = base;
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = alt;
        g.fillRect(0, 0, 32, 32);
        g.fillRect(32, 32, 32, 32);
        g.fillStyle = "rgba(0,0,0,.25)";
        for (let i = 0; i < 5; i++)
          g.fillRect(ri(0, 60), ri(0, 60), ri(2, 5), 1);
        return cx.createPattern(c, "repeat");
      }

// Aviso de "pulsa esta tecla" sobre un objeto interactivo (ver cofre): un
// cuadrado imitando un keycap de teclado, con un pequeño rebote para que
// llame la atención -- mismo estilo visual que los <kbd> del HUD (main.css).
function dibujarAvisoTecla(x, y, letra) {
        const bob = Math.sin(animGlobal * 4) * 2;
        const s = 20;
        cx.save();
        cx.translate(x, y + bob);
        cx.fillStyle = "#0d0b15";
        cx.strokeStyle = "#3a3453";
        cx.lineWidth = 2;
        cx.beginPath();
        cx.roundRect(-s / 2, -s / 2, s, s, 4);
        cx.fill();
        cx.stroke();
        cx.fillStyle = "#e9e3d5";
        cx.font = "700 12px Alegreya Sans";
        cx.textAlign = "center";
        cx.textBaseline = "middle";
        cx.fillText(letra, 0, 1);
        cx.restore();
      }

// Tooltip completo al pasar el cursor por encima de un drop ya asentado
// -- para CUALQUIER rareza, no solo épico+ como la etiqueta flotante de
// más abajo (que solo lleva el nombre): pedido expreso, "las armaduras
// no se previsualizan al caer". Antes solo había un rayo de luz de color
// + (épico+) un nombre flotante, sin stats ni efecto -- acercar el
// cursor ahora muestra lo mismo que ya se ve en el tooltip del
// inventario (nombre/tipo/rareza/efecto/stats). Solo funciona con
// ratón real (mouse.x/y de systems/input.js no se actualiza con mando
// ni táctil, igual que el resto de mecánicas basadas en cursor).
function dibujarTooltipDropHover(it, x, y, col, rareza) {
        const rar = RAREZAS[rareza];
        const lineas = [
          { t: it.nombre, col: rar.col, font: "800 12px Alegreya Sans" },
          {
            t: (SLOT_LABEL[it.slot] || it.slot) + " · " + rar.n,
            col: "#b9ada0",
            font: "600 10px Alegreya Sans",
          },
        ];
        if (it.efectoDesc)
          lineas.push({ t: "✦ " + it.efectoDesc, col: "#ff9a5a", font: "600 10px Alegreya Sans" });
        const statTxt = Object.entries(it.stats || {})
          .map(([k, v]) => "+" + v + " " + (ETQ[k] || k))
          .join("  ·  ");
        if (statTxt) lineas.push({ t: statTxt, col: "#e8dfce", font: "600 10px Alegreya Sans" });
        cx.save();
        cx.textAlign = "center";
        let maxW = 0;
        for (const l of lineas) {
          cx.font = l.font;
          maxW = Math.max(maxW, cx.measureText(l.t).width);
        }
        const padX = 12,
          padY = 8,
          lh = 15;
        const boxW = maxW + padX * 2;
        const boxH = lineas.length * lh + padY * 2;
        const bx = x,
          by = y - 46 - boxH;
        cx.fillStyle = "rgba(10,8,17,.92)";
        cx.beginPath();
        cx.roundRect(bx - boxW / 2, by, boxW, boxH, 8);
        cx.fill();
        cx.strokeStyle = hexRgba(col, 0.85);
        cx.lineWidth = 1.5;
        cx.stroke();
        lineas.forEach((l, i) => {
          cx.font = l.font;
          cx.fillStyle = l.col;
          cx.fillText(l.t, x, by + padY + lh * (i + 0.72));
        });
        cx.restore();
      }

// Hoguera real (campfire_sheet, ver render/sprites.js) centrada en (x,y) a
// tamaño `tam` -- usada por TODAS las hogueras del juego (descanso y
// alivio de la sala del jefe). Si el asset aún no cargó, cae a un dibujo
// procedural sencillo (llama triangular) en vez de dejar un hueco vacío.
function dibujarHogueraReal(x, y, tam) {
        if (assetOK("campfire_sheet")) {
          const frame = campfireFrame();
          cx.imageSmoothingEnabled = false;
          cx.drawImage(
            SHEETS.campfire_sheet,
            frame * CAMPFIRE_CELDA,
            0,
            CAMPFIRE_CELDA,
            CAMPFIRE_CELDA,
            x - tam / 2,
            y - tam / 2,
            tam,
            tam,
          );
        } else {
          const fl = Math.sin(animGlobal * 14) * 2;
          cx.fillStyle = "#ff7d4d";
          cx.beginPath();
          cx.moveTo(x - tam * 0.35, y + tam * 0.4);
          cx.lineTo(x, y - tam * 0.5 - fl);
          cx.lineTo(x + tam * 0.35, y + tam * 0.4);
          cx.closePath();
          cx.fill();
        }
      }

// Cara de muro con esquina/borde real (piezas del tileset real nombradas
// y ensayadas a mano por el usuario en el Artifact de pruebas -- ver
// dibujarMuroConBorde() más abajo) en vez del remate liso de antes. Solo
// se aplica a rectángulos de G.muros "de verdad largos" (perímetro de
// sala clásico); las salas orgánicas con docenas de rectángulos diminutos
// tipo escalera (torreón circular, diamante, zigzag...) se quedan con el
// remate liso original -- detectar esquina real en esas formas por
// contacto rectángulo-a-rectángulo daría un patchwork, no una mejora.
const UMBRAL_LARGO_BORDE = 80;
// Tolerancia en px para decidir si dos rectángulos de G.muros "se tocan"
// en una esquina -- G.muros no guarda ninguna relación de vecindad (ver
// systems/floorgen.js), así que la única forma de saber si el extremo de
// un muro horizontal es una esquina real (y no un hueco de puerta) es
// comprobar si hay un muro VERTICAL pegado justo ahí.
const TOQUE_BORDE_TOL = 4;
let cacheMurosRefBordes = null;
let metaBordes = new Map();
function calcularMetaBordes(muros) {
        metaBordes = new Map();
        for (const m of muros) {
          const horizontal = m.w >= m.h;
          if (!horizontal) { metaBordes.set(m, { horizontal }); continue; }
          let esqIzq = false, esqDer = false;
          for (const o of muros) {
            if (o === m || o.w >= o.h) continue; // solo cuenta un muro vertical
            // Solape/contacto en Y en CUALQUIER punto de la altura de m, no
            // solo en su fila superior: un muro horizontal que hace de
            // borde INFERIOR de una sala se junta con su vertical por la
            // fila de ARRIBA de m (m.y), pero uno que hace de borde
            // SUPERIOR se junta por la fila de ABAJO (m.y+m.h) -- sin saber
            // cuál es cuál, comprobar el rango completo cubre los dos casos.
            if (o.y > m.y + m.h + TOQUE_BORDE_TOL || o.y + o.h < m.y - TOQUE_BORDE_TOL) continue;
            // El vertical no siempre está pegado por fuera (abutment puro,
            // sin solape) -- lo normal en las formas de este juego es que
            // el bloque en L comparta la esquina (el vertical arranca en la
            // MISMA x que el borde de m, no justo después). Así que basta
            // con que el rango en X del vertical CUBRA la columna del
            // borde de m, no que termine exactamente ahí.
            if (o.x <= m.x + TOQUE_BORDE_TOL && o.x + o.w >= m.x + TOQUE_BORDE_TOL) esqIzq = true;
            if (o.x <= m.x + m.w - TOQUE_BORDE_TOL && o.x + o.w >= m.x + m.w - TOQUE_BORDE_TOL) esqDer = true;
          }
          metaBordes.set(m, { horizontal, esqIzq, esqDer });
        }
        cacheMurosRefBordes = muros;
      }
// Alto en pantalla de cada hilada (hilada superior / zócalo / esquina) --
// las piezas nuevas son de 16px nativos, ×3 igual que el resto de
// KENNEY_TILE (ver sprites.js).
const ALTO_HILADA_BORDE = 48;
function dibujarMuroConBorde(m, meta, wallPat, rematePat) {
        const pTop = muroBordeSuperiorPatron();
        if (!pTop) {
          // piezas nuevas aún sin cargar: cae al remate liso de siempre,
          // sin dejar el muro sin dibujar mientras tanto.
          cx.fillStyle = wallPat;
          cx.fillRect(m.x, m.y, m.w, m.h);
          if (rematePat) {
            cx.fillStyle = rematePat;
            cx.fillRect(m.x, m.y, m.w, 16);
          }
          cx.strokeStyle = "rgba(10,8,17,.6)";
          cx.lineWidth = 2;
          cx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
          return;
        }
        // cuerpo: relleno de siempre para todo el rectángulo, así un
        // bloque mucho más alto que 2 hiladas sigue viéndose como pared
        // por debajo de la hilada superior/zócalo.
        cx.fillStyle = wallPat;
        cx.fillRect(m.x, m.y, m.w, m.h);
        const altoTop = Math.min(ALTO_HILADA_BORDE, m.h);
        cx.fillStyle = pTop;
        cx.fillRect(m.x, m.y, m.w, altoTop);
        const pBase = muroBordeBasePatron();
        if (pBase && m.h >= ALTO_HILADA_BORDE * 2) {
          cx.fillStyle = pBase;
          cx.fillRect(m.x, m.y + ALTO_HILADA_BORDE, m.w, Math.min(ALTO_HILADA_BORDE, m.h - ALTO_HILADA_BORDE));
        }
        // esquinas reales -- solo en los extremos donde de verdad hay otro
        // muro perpendicular tocando (calcularMetaBordes()); si no, el
        // extremo se queda con la hilada superior lisa (hueco de puerta,
        // o final suelto de un tramo).
        const imgIzq = meta.esqIzq ? muroEsquinaImg("izq") : null;
        const imgDer = meta.esqDer ? muroEsquinaImg("der") : null;
        if (imgIzq) {
          const w = Math.min(imgIzq.width, m.w);
          cx.drawImage(imgIzq, m.x, m.y, w, altoTop);
        }
        if (imgDer) {
          const w = Math.min(imgDer.width, m.w);
          cx.drawImage(imgDer, m.x + m.w - w, m.y, w, altoTop);
        }
        cx.strokeStyle = "rgba(10,8,17,.6)";
        cx.lineWidth = 2;
        cx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
      }

export function render() {
        avanzarAnimGlobal(0.016);
        if (window._sueloDirty) {
          sueloClave = "";
          window._sueloDirty = false;
        }
        const claveSuelo = G
          ? G.planta + "|" + G.forma + "|" + (G.salaTipo || "normal")
          : "sinG";
        if (sueloClave !== claveSuelo) {
          sueloPat = patronSuelo(G ? G.planta : 1, G ? G.forma : "sala", G ? G.salaTipo : "normal");
          sueloClave = claveSuelo;
        }
        // Cámara de personaje: sigue el centroide de los jugadores vivos,
        // recortada para no enseñar fuera de los límites de la sala (que
        // ahora puede ser más grande que el viewport -- ver SALA_W/SALA_H
        // en core/constants.js). Se recalcula aquí cada frame en vez de
        // sincronizarse por red: tanto el host como el invitado la derivan
        // localmente a partir de G.players (que sí viaja por red), así que
        // ambos ven prácticamente el mismo encuadre sin mandar nada aparte.
        let camX = 0,
          camY = 0;
        if (G && G.players && G.players.length) {
          const vivosCam = G.players.filter((p) => !p.ko);
          const base = vivosCam.length ? vivosCam : G.players;
          const centroX = base.reduce((s, p) => s + p.x, 0) / base.length;
          const centroY = base.reduce((s, p) => s + p.y, 0) / base.length;
          camX = clamp(centroX - W / 2, 0, Math.max(0, SALA_W - W));
          camY = clamp(centroY - H / 2, 0, Math.max(0, SALA_H - H));
        }
        if (G) G.cam = { x: camX, y: camY };

        cx.save();
        if (G && G.shake > 0)
          cx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
        if (!G) {
          cx.fillStyle = sueloPat;
          cx.fillRect(0, 0, W, H);
          cx.strokeStyle = "#3a3453";
          cx.lineWidth = 8;
          cx.strokeRect(10, 10, W - 20, H - 20);
          cx.restore();
          return;
        }
        cx.translate(-camX, -camY);

        // Sala con fondo horneado (G.fondo, ver Telar de Mazmorras/
        // customRooms/*.json): una imagen EXACTA de suelo+pared+decoración
        // sustituye al suelo uniforme + muros auto-rematados de abajo --
        // libertad total de forma. G.muros/G.vacios SIGUEN existiendo y
        // bloqueando el paso (ver floorgen.js) para que la colisión
        // coincida con lo que se ve, solo dejan de DIBUJARSE aquí. Si la
        // imagen aún no ha terminado de cargar, cae al render procedural de
        // siempre en vez de dejar la sala en negro un instante.
        const imgFondo = fondoImg(G.fondo);
        if (imgFondo) {
          cx.drawImage(imgFondo, 0, 0, SALA_W, SALA_H);
          cx.strokeStyle = "#3a3453";
          cx.lineWidth = 8;
          cx.strokeRect(10, 10, SALA_W - 20, SALA_H - 20);
        } else {
          cx.fillStyle = sueloPat;
          cx.fillRect(0, 0, SALA_W, SALA_H);
          cx.strokeStyle = "#3a3453";
          cx.lineWidth = 8;
          cx.strokeRect(10, 10, SALA_W - 20, SALA_H - 20);

          // Huecos vacíos (sala.vacios, ver customRooms/*.json): ni suelo
          // ni pared -- el "~void" del Telar de Mazmorras. Se pintan
          // ENCIMA del suelo uniforme de arriba con el mismo tono oscuro
          // de fondo, sin ningún remate de pared (bloquean el paso igual
          // que un muro, ver colisionaMuro()/aplicarLimites() en
          // systems/floorgen.js, pero no deben LEERSE como pared).
          if (G.vacios && G.vacios.length) {
            cx.fillStyle = "#0a0806";
            for (const v of G.vacios) cx.fillRect(v.x, v.y, v.w, v.h);
          }

          const wallPat = wallPatron();
          const rematePat = remateMuroPatron();
          if (G.muros !== cacheMurosRefBordes) calcularMetaBordes(G.muros);
          for (const m of G.muros) {
            const metaB = metaBordes.get(m);
            if (wallPat && metaB && metaB.horizontal && m.w >= UMBRAL_LARGO_BORDE && m.h >= 26) {
              dibujarMuroConBorde(m, metaB, wallPat, rematePat);
              continue;
            }
            if (wallPat && metaB && !metaB.horizontal && m.h >= UMBRAL_LARGO_BORDE) {
              const pLado = muroBordeLateralPatron();
              if (pLado) {
                cx.fillStyle = pLado;
                cx.fillRect(m.x, m.y, m.w, m.h);
                cx.strokeStyle = "rgba(10,8,17,.6)";
                cx.lineWidth = 2;
                cx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
                continue;
              }
            }
            if (wallPat) {
              cx.fillStyle = wallPat;
              cx.fillRect(m.x, m.y, m.w, m.h);
              // remate (almenas) en el borde superior de los muros grandes:
              // fallback liso para lo que no calificó arriba (obstáculos
              // pequeños, tramos sueltos de las salas orgánicas con muchos
              // rectángulos diminutos tipo "escalera") -- mismo criterio de
              // siempre, sin esquina real.
              if (rematePat && m.h >= 26) {
                cx.fillStyle = rematePat;
                cx.fillRect(m.x, m.y, m.w, 16);
              }
              cx.strokeStyle = "rgba(10,8,17,.6)";
              cx.lineWidth = 2;
              cx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
              continue;
            }
            cx.fillStyle = "#0a0812";
            cx.fillRect(m.x, m.y, m.w, m.h);
            cx.fillStyle = "#221d36";
            cx.fillRect(m.x, m.y, m.w, 6);
            cx.strokeStyle = "#3a3453";
            cx.lineWidth = 2;
            cx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
            cx.strokeStyle = "rgba(58,52,83,.35)";
            cx.lineWidth = 1;
            for (let yy = m.y + 14; yy < m.y + m.h; yy += 14) {
              cx.beginPath();
              cx.moveTo(m.x + 2, yy);
              cx.lineTo(m.x + m.w - 2, yy);
              cx.stroke();
            }
          }
        }

        // aviso de tecla sobre un muro secreto interior (ver forma
        // "arsenal" en floorgen.js): el muro se ve exactamente igual que
        // cualquier otro hasta que un jugador se acerca -- distancia
        // directa, no depende de p.secretoParedObj (solo del host), mismo
        // patrón que el resto de avisos.
        for (const m of G.muros) {
          if (!m.secreto) continue;
          const mcx = m.x + m.w / 2,
            mcy = m.y + m.h / 2;
          const cerca = G.players.some((p) => {
            if (p.ko) return false;
            const dx = Math.max(m.x - p.x, 0, p.x - (m.x + m.w));
            const dy = Math.max(m.y - p.y, 0, p.y - (m.y + m.h));
            return Math.hypot(dx, dy) < 46;
          });
          if (cerca) dibujarAvisoTecla(mcx, m.y - 20, "E");
        }

        // puertas de la mazmorra (ver systems/floorgen.js: cargarSala/cruzarPuerta)
        const ANG_PUERTA = { N: -Math.PI / 2, S: Math.PI / 2, E: 0, O: Math.PI };
        for (const pu of G.puertas || []) {
          const ang = ANG_PUERTA[pu.dir];
          if (pu.oculta) {
            // secreta sin revelar: se confunde con el muro -- solo un
            // tinte muy sutil (perceptible si se mira con atención) y el
            // aviso de tecla al acercarse, igual que un cofre o un drop.
            cx.globalAlpha = 0.12 + Math.sin(animGlobal * 2) * 0.03;
            cx.fillStyle = "#c084f0";
            cx.beginPath();
            cx.arc(pu.x, pu.y, pu.r - 4, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            if (
              G.players.some(
                (p) => !p.ko && Math.hypot(p.x - pu.x, p.y - pu.y) < 46,
              )
            ) {
              dibujarAvisoTecla(pu.x, pu.y - 26, "E");
            }
            continue;
          }
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(143,211,255," + (0.85 - k * 0.25) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              pu.x,
              pu.y,
              pu.r - 6 - k * 5 + Math.sin(animGlobal * 3 + k) * 2,
              ang - 0.9,
              ang + 0.9,
            );
            cx.stroke();
          }
          if (KENNEY_TILE.door2) {
            // door2 (indicación explícita del usuario) es una hoja de
            // ANIMACIÓN de 4 fotogramas (verificado recortando/ampliando
            // la imagen: portón cerrado -> abriéndose -> arco abierto),
            // no una única puerta -- por eso NO se dibuja la imagen
            // entera (salía como una fila de 4 puertas aplastadas). Se
            // recorta solo el último fotograma (arco totalmente abierto,
            // ya que aquí no hay puertas con estado cerrado/abierto) de
            // la hoja ya escalada ×3 (KENNEY_TILE, ver sprites.js).
            const FOTOG_W = 40 * 3,
              FOTOG_H = 29 * 3,
              FOTOG_ULTIMO = 3;
            const anchoDoor = 80,
              altoDoor = anchoDoor * (FOTOG_H / FOTOG_W);
            cx.save();
            cx.translate(pu.x, pu.y);
            if (pu.dir === "O" || pu.dir === "E") cx.rotate(Math.PI / 2);
            cx.drawImage(
              KENNEY_TILE.door2,
              FOTOG_ULTIMO * FOTOG_W,
              0,
              FOTOG_W,
              FOTOG_H,
              -anchoDoor / 2,
              -altoDoor / 2,
              anchoDoor,
              altoDoor,
            );
            cx.restore();
          } else {
            cx.save();
            cx.translate(
              pu.x + Math.cos(ang) * (pu.r + 10),
              pu.y + Math.sin(ang) * (pu.r + 10),
            );
            cx.rotate(ang);
            cx.fillStyle = "#8fd3ff";
            cx.beginPath();
            cx.moveTo(-6, -8);
            cx.lineTo(8, 0);
            cx.lineTo(-6, 8);
            cx.closePath();
            cx.fill();
            cx.restore();
          }
        }

        // fogata (de descanso, un único uso por planta)
        if (G.fogata) {
          const f = G.fogata;
          cx.fillStyle = "#4a3b2c";
          cx.fillRect(f.x - 10, f.y + 2, 20, 5);
          if (!G.fogataUsada) {
            dibujarHogueraReal(f.x, f.y - 2, 16);
            if (G.descansoT > 0) {
              cx.strokeStyle = "#7fd4c1";
              cx.lineWidth = 3;
              cx.beginPath();
              cx.arc(
                f.x,
                f.y - 4,
                18,
                -Math.PI / 2,
                -Math.PI / 2 + TAU * (G.descansoT / 2.2),
              );
              cx.stroke();
            }
          } else {
            cx.fillStyle = "#555";
            cx.fillRect(f.x - 4, f.y - 3, 8, 4);
          }
        }

        // hogueras de alivio de la sala del Guardián de Hielo (contrarrestan
        // el debuff de congelación ambiental por proximidad, ver
        // core/loop.js) -- siempre encendidas, no se "usan" ni se apagan.
        if (G.hoguerasJefe)
          for (const hg of G.hoguerasJefe) {
            cx.fillStyle = "#4a3b2c";
            cx.fillRect(hg.x - 10, hg.y + 2, 20, 5);
            dibujarHogueraReal(hg.x, hg.y - 2, 16);
          }

        // portal / escalera hacia arriba
        if (G.portal) {
          const po = G.portal;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(233,180,92," + (0.9 - k * 0.28) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              po.x,
              po.y,
              po.r - k * 6 + Math.sin(po.t * 3 + k) * 2,
              0,
              TAU,
            );
            cx.stroke();
          }
          // `propio`: la salida la colocó quien diseñó la sala (pieza del
          // Telar de Mazmorras), así que su arte ya viene pintado en el
          // fondo horneado -- encimarle este sprite de escalera, que es de
          // otro estilo (gris suave, no el pixel art del tileset actual),
          // es justo lo que desencajaba. Solo se dibuja en las salas
          // procedurales, que no tienen arte propio para la salida.
          if (!po.propio && SPR.escaleras) drawSprite(SPR.escaleras, po.x, po.y, false, 0.8);
          cx.fillStyle = "#e9b45c";
          cx.font = "700 11px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText(
            "PLANTA " +
              (G.planta + 1) +
              "  (" +
              (po.dentro || 0) +
              "/" +
              (po.total || 1) +
              ")",
            po.x,
            po.y + po.r + 16,
          );
        }

        // escalera hacia abajo (planta anterior, o lobby si esto era la 1)
        if (G.escaleraAbajo) {
          const ea = G.escaleraAbajo;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(143,211,255," + (0.9 - k * 0.28) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              ea.x,
              ea.y,
              ea.r - k * 6 + Math.sin(ea.t * 3 + k) * 2,
              0,
              TAU,
            );
            cx.stroke();
          }
          // mismo criterio que el portal de arriba: si la colocó el diseño
          // de la sala, su arte ya está pintado en el fondo.
          if (!ea.propio && SPR.escalerasAbajo)
            drawSprite(SPR.escalerasAbajo, ea.x, ea.y, false, 0.8);
          cx.fillStyle = "#8fd3ff";
          cx.font = "700 11px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText(
            (G.planta <= 1 ? "VESTÍBULO" : "PLANTA " + (G.planta - 1)) +
              "  (" +
              (ea.dentro || 0) +
              "/" +
              (ea.total || 1) +
              ")",
            ea.x,
            ea.y + ea.r + 16,
          );
        }

        // áreas
        for (const a of G.areas) {
          // Parches de la Senda Elemental de fuego (ver a.senda en
          // systems/abilities.js: crearArea/actualizarSendaElemental): arte
          // real (FIRE_COLUMN, un ciclo completo nace->arde->brasas) en vez
          // del círculo genérico -- anclado por la BASE (a.y), no el
          // centro, para que la llama crezca desde el suelo. Reducida a
          // ~0.45x de su tamaño nativo (90px) para no sacar de escala al
          // personaje. Hielo/arcano (sin pack de sprites todavía) siguen
          // con el círculo de siempre -- ver el `if` de abajo.
          if (a.senda && a.elemento === "fuego" && FIRE_COLUMN.length === 14) {
            const progFuego = clamp(1 - a.ttl / (a.ttlTotal || 1), 0, 0.999);
            const frFuego = FIRE_COLUMN[Math.floor(progFuego * FIRE_COLUMN.length)];
            const escFuego = 0.45;
            const fw = frFuego.width * escFuego, fh = frFuego.height * escFuego;
            cx.globalAlpha = a.ttl < 0.4 ? a.ttl / 0.4 : 1;
            cx.drawImage(frFuego, a.x - fw / 2, a.y - fh, fw, fh);
            cx.globalAlpha = 1;
            continue;
          }
          // Explosión de la ulti de fuego (FIRE_EXPLOSION_SHEET, ver
          // sprites.js) -- arranca en el frame FIRE_EXPLOSION_INICIO
          // (salta el destello/chispa inicial de la hoja de origen, que
          // ya no encaja aquí: el retardo real entre casteo y explosión,
          // ver lanzarUlti() en systems/abilities.js, hace ese papel con
          // sonido+animación de personaje). El área es `explosivo` (mismo
          // archivo: ver crearArea()) y dura justo EXPLOSION_BURST_DUR +
          // EXPLOSION_FADE_DUR en total -- antes se quedaba congelada en
          // el último frame (brasas) el resto de un ttl pensado para un
          // goteo (2.2s), mucho más largo que el estallido real, y eso se
          // veía como "unos píxeles sueltos" persistiendo de más
          // (reportado) -- ahora funde justo al terminar de jugar, sin
          // ese sobrante. Centrada en (a.x,a.y), NO anclada por la base --
          // una explosión estalla en todas direcciones, no "crece desde
          // el suelo" como la columna/rastro de fuego.
          if (a.elemento === "fuego" && !a.senda && FIRE_EXPLOSION_SHEET.complete && FIRE_EXPLOSION_SHEET.naturalWidth) {
            const framesUtiles = FIRE_EXPLOSION_FRAMES - FIRE_EXPLOSION_INICIO;
            const edadExplosion = (a.ttlTotal || 1) - a.ttl;
            const progExplosion = clamp(edadExplosion / EXPLOSION_BURST_DUR, 0, 0.999);
            const frExplosion = FIRE_EXPLOSION_INICIO + Math.floor(progExplosion * framesUtiles);
            const escExplosion = 220 / FIRE_EXPLOSION_FH;
            const fw = FIRE_EXPLOSION_FW * escExplosion, fh = FIRE_EXPLOSION_FH * escExplosion;
            cx.globalAlpha = a.ttl < EXPLOSION_FADE_DUR ? a.ttl / EXPLOSION_FADE_DUR : 1;
            cx.drawImage(FIRE_EXPLOSION_SHEET, frExplosion * FIRE_EXPLOSION_FW, 0, FIRE_EXPLOSION_FW, FIRE_EXPLOSION_FH, a.x - fw / 2, a.y - fh / 2, fw, fh);
            cx.globalAlpha = 1;
            continue;
          }
          // Estallido de hielo (ICE_BURST, ver sprites.js): mismo arte en
          // los dos usos que pidió el usuario, con distinta escala --
          // grande en el círculo de la ulti (a.senda es false ahí, la crea
          // lanzarUlti() en abilities.js sin ese flag), chico en el rastro
          // de la Senda Elemental con elemento hielo (a.senda true), igual
          // que ya hace el fuego arriba. Solo 4 frames (a diferencia de
          // los 14 del fuego) así que el estallido juega rápido (0.5s fijo,
          // no repartido en todo el ttl del área) y se queda quieto en el
          // último frame el resto de la vida del área -- se lee como un
          // estallido que cristaliza y se queda ahí, no como una animación
          // lenta arrastrada durante 2-3s.
          if (a.elemento === "hielo" && ICE_BURST.length === 4) {
            const edadHielo = (a.ttlTotal || 1) - a.ttl;
            const progHielo = clamp(edadHielo / 0.5, 0, 0.999);
            const frHielo = ICE_BURST[Math.floor(progHielo * ICE_BURST.length)];
            const alfaHielo = a.ttl < 0.4 ? a.ttl / 0.4 : 1;
            // Ulti (a.senda false, círculo grande): además del cristal
            // central, unos cuantos más pequeños repartidos por el radio
            // real del hechizo (posiciones cacheadas en la propia área la
            // primera vez que se dibuja, para que no salten de sitio cada
            // frame) más partículas de frío sueltas parpadeando -- pedido
            // expreso de que el efecto "ocupe" el círculo de lanzamiento
            // para ver el alcance de un vistazo, en vez de un único
            // cristal suelto en el medio.
            if (!a.senda) {
              if (!a._iceScatter) {
                a._iceScatter = [];
                for (let k = 0; k < 5; k++) {
                  a._iceScatter.push({
                    ang: Math.random() * TAU,
                    distFrac: 0.35 + Math.random() * 0.55,
                    esc: 0.28 + Math.random() * 0.22,
                  });
                }
                a._frost = [];
                for (let k = 0; k < 16; k++) {
                  a._frost.push({
                    ang: Math.random() * TAU,
                    distFrac: Math.random() * 0.92,
                    ph: Math.random() * TAU,
                  });
                }
              }
              for (const f of a._frost) {
                const r2 = a.r * f.distFrac;
                const fx2 = a.x + Math.cos(f.ang) * r2, fy2 = a.y + Math.sin(f.ang) * r2;
                cx.globalAlpha = alfaHielo * (0.25 + 0.55 * ((Math.sin(animGlobal * 3 + f.ph) + 1) / 2));
                cx.fillStyle = "#cfe4ff";
                cx.fillRect(fx2 - 1.5, fy2 - 1.5, 3, 3);
              }
              const escMini = 160 / 52;
              cx.globalAlpha = alfaHielo;
              for (const s of a._iceScatter) {
                const sx = a.x + Math.cos(s.ang) * a.r * s.distFrac;
                const sy = a.y + Math.sin(s.ang) * a.r * s.distFrac;
                const fw2 = frHielo.width * escMini * s.esc, fh2 = frHielo.height * escMini * s.esc;
                cx.drawImage(frHielo, sx - fw2 / 2, sy - fh2, fw2, fh2);
              }
            }
            const escHielo = a.senda ? 40 / 52 : 160 / 52;
            const fw = frHielo.width * escHielo, fh = frHielo.height * escHielo;
            cx.globalAlpha = alfaHielo;
            cx.drawImage(frHielo, a.x - fw / 2, a.y - fh, fw, fh);
            cx.globalAlpha = 1;
            continue;
          }
          const col =
            a.clase === "elem"
              ? ELEMENTOS[a.elemento].color
              : a.clase === "malArea"
                ? a.color || "#57496f"
                : SUPS[0].color;
          const alfa = a.ttl < 0.4 ? a.ttl / 0.4 : 1;
          const rr = a.nace > 0 ? a.r * (1 - a.nace / 0.15) : a.r;
          cx.globalAlpha = 0.22 * alfa;
          cx.fillStyle = col;
          cx.beginPath();
          cx.arc(a.x, a.y, rr, 0, TAU);
          cx.fill();
          cx.globalAlpha = 0.85 * alfa;
          cx.strokeStyle = col;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(a.x, a.y, rr, 0, TAU);
          cx.stroke();
          for (let k = 0; k < 5; k++) {
            const a2 = animGlobal * 1.6 + (k / 5) * TAU;
            cx.fillRect(
              a.x + Math.cos(a2) * (rr - 7) - 2,
              a.y + Math.sin(a2) * (rr - 7) - 2,
              4,
              4,
            );
          }
          if (a.clase === "sanar") {
            cx.fillRect(a.x - 2, a.y - 7, 4, 14);
            cx.fillRect(a.x - 7, a.y - 2, 14, 4);
          }
          cx.globalAlpha = 1;
        }

        // ---- zonas del suelo ----
        for (const hz of G.hazards) {
          if (hz.tipo === "grieta") {
            if (hz.estado === 2) {
              // agujero
              cx.fillStyle = "#0a0812";
              cx.beginPath();
              cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.7, 0, 0, TAU);
              cx.fill();
              cx.strokeStyle = "#26232f";
              cx.lineWidth = 2;
              cx.beginPath();
              cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.7, 0, 0, TAU);
              cx.stroke();
            } else {
              // grietas visibles (parpadeo si está cediendo)
              cx.strokeStyle = hz.estado === 1 ? "#6a5a94" : "#26232f";
              cx.globalAlpha =
                hz.estado === 1 ? 0.6 + Math.sin(animGlobal * 24) * 0.35 : 0.8;
              cx.lineWidth = 1.5;
              cx.beginPath();
              cx.moveTo(hz.x - hz.r * 0.8, hz.y);
              cx.lineTo(hz.x - hz.r * 0.2, hz.y - hz.r * 0.4);
              cx.lineTo(hz.x + hz.r * 0.3, hz.y + hz.r * 0.2);
              cx.lineTo(hz.x + hz.r * 0.8, hz.y - hz.r * 0.1);
              cx.moveTo(hz.x - hz.r * 0.3, hz.y + hz.r * 0.5);
              cx.lineTo(hz.x + hz.r * 0.1, hz.y - hz.r * 0.1);
              cx.stroke();
              cx.globalAlpha = 1;
            }
          } else if (hz.tipo === "arena") {
            cx.fillStyle = "#8a6b43";
            cx.globalAlpha = 0.55;
            cx.beginPath();
            cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.8, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = 0.9;
            cx.strokeStyle = "#c9a35a";
            cx.lineWidth = 1.5;
            // remolino
            for (let k = 0; k < 3; k++) {
              cx.beginPath();
              cx.arc(
                hz.x,
                hz.y,
                hz.r * 0.3 + k * hz.r * 0.24,
                hz.fase * 0.8 + k,
                hz.fase * 0.8 + k + 4,
              );
              cx.stroke();
            }
            cx.globalAlpha = 1;
          } else if (hz.tipo === "ortiga") {
            cx.fillStyle = "#2f5a2a";
            cx.globalAlpha = 0.45;
            cx.beginPath();
            cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.75, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            cx.fillStyle = "#4a8a3a";
            for (let k = 0; k < 7; k++) {
              const a = (k / 7) * TAU + hz.x;
              const sx = hz.x + Math.cos(a) * hz.r * 0.5,
                sy = hz.y + Math.sin(a) * hz.r * 0.4;
              cx.beginPath();
              cx.moveTo(sx - 3, sy + 3);
              cx.lineTo(sx, sy - 6 - Math.sin(animGlobal * 2 + k) * 1.5);
              cx.lineTo(sx + 3, sy + 3);
              cx.closePath();
              cx.fill();
            }
          } else if (hz.tipo === "telarana") {
            cx.strokeStyle = "#e8e0d0";
            cx.globalAlpha = 0.5;
            cx.lineWidth = 1;
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * TAU;
              cx.beginPath();
              cx.moveTo(hz.x, hz.y);
              cx.lineTo(hz.x + Math.cos(a) * hz.r, hz.y + Math.sin(a) * hz.r);
              cx.stroke();
            }
            for (let k = 1; k <= 2; k++) {
              cx.beginPath();
              cx.arc(hz.x, hz.y, (hz.r * k) / 2.4, 0, TAU);
              cx.stroke();
            }
            cx.globalAlpha = 1;
          } else if (hz.tipo === "fuegoZona") {
            cx.fillStyle = "#ff7d4d";
            cx.globalAlpha = 0.25 + Math.sin(animGlobal * 8 + hz.x) * 0.08;
            cx.beginPath();
            cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.8, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            for (let k = 0; k < 5; k++) {
              const a = (k / 5) * TAU + hz.fase;
              const fx2 = hz.x + Math.cos(a) * hz.r * 0.5,
                fy = hz.y + Math.sin(a) * hz.r * 0.4;
              const fl = Math.sin(animGlobal * 11 + k * 2) * 2;
              cx.fillStyle = k % 2 ? "#ff7d4d" : "#ffd27f";
              cx.beginPath();
              cx.moveTo(fx2 - 3, fy + 2);
              cx.lineTo(fx2, fy - 7 - fl);
              cx.lineTo(fx2 + 3, fy + 2);
              cx.closePath();
              cx.fill();
            }
          } else if (hz.tipo === "escarcha") {
            // Escarcha residual del Guardián de Hielo (ver core/loop.js:
            // rama "hielo") -- mismo hazard que "ortiga"/"telarana"
            // (ralentiza + tick de daño, código compartido más arriba),
            // solo cambia el dibujo: cristales de hielo en vez de espinas.
            cx.fillStyle = "#bfe6f7";
            cx.globalAlpha = 0.3 + Math.sin(animGlobal * 5 + hz.x) * 0.06;
            cx.beginPath();
            cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.72, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * TAU + hz.fase * 0.2;
              const sx = hz.x + Math.cos(a) * hz.r * 0.55,
                sy = hz.y + Math.sin(a) * hz.r * 0.42;
              cx.fillStyle = k % 2 ? "#7fc9e8" : "#eaf6ff";
              cx.beginPath();
              cx.moveTo(sx, sy - 7);
              cx.lineTo(sx + 3, sy);
              cx.lineTo(sx, sy + 4);
              cx.lineTo(sx - 3, sy);
              cx.closePath();
              cx.fill();
            }
          }
        }

        // telegrafiados de rayos y meteoros
        for (const ry of G.rayos) {
          const k = 1 - ry.t / (ry.meteoro ? 1.0 : 0.85);
          // "Lluvia de esquirlas" del Guardián de Hielo (ver core/loop.js:
          // rama "hielo") reutiliza el meteoro de magma/eterno tal cual,
          // solo con `ry.hielo` para pintarlo celeste en vez de anaranjado
          // -- mismo telegrafiado/daño, ningún sistema nuevo.
          cx.strokeStyle = ry.hielo ? "#bfe6f7" : ry.meteoro ? "#ff7d4d" : "#cfe4ff";
          cx.globalAlpha = 0.4 + Math.sin(animGlobal * 18) * 0.25;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(ry.x, ry.y, 46, 0, TAU);
          cx.stroke();
          cx.beginPath();
          cx.arc(ry.x, ry.y, 46 * k, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
          if (ry.meteoro) {
            // el meteoro (o esquirla de hielo) cayendo
            const my = ry.y - 260 * (1 - k);
            cx.fillStyle = ry.hielo ? "#cfe4ff" : "#ff9d3d";
            cx.beginPath();
            cx.arc(ry.x + 30 * (1 - k), my, 6, 0, TAU);
            cx.fill();
            cx.strokeStyle = ry.hielo ? "rgba(191,230,247,.5)" : "rgba(255,125,77,.5)";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.moveTo(ry.x + 30 * (1 - k) + 8, my - 14);
            cx.lineTo(ry.x + 30 * (1 - k), my);
            cx.stroke();
          }
        }

        // escombros de columnas destruidas
        for (const dc of G.decals) {
          cx.fillStyle = "rgba(0,0,0,.3)";
          cx.beginPath();
          cx.ellipse(dc.x, dc.y + 8, 20, 8, 0, 0, TAU);
          cx.fill();
          cx.fillStyle = "#2a2440";
          cx.fillRect(dc.x - 10, dc.y, 7, 5);
          cx.fillRect(dc.x + 2, dc.y + 3, 9, 5);
          cx.fillRect(dc.x - 3, dc.y - 4, 6, 4);
        }

        // pilares (columnas): usa el sprite de columna de mazmorra si está cargado
        //
        // "Doble sombra" del Guardián de Hielo -- causa real (confirmada por
        // Playwright, ver también el filtro de spawn en floorgen.js:
        // G.pilares = G.pilares.filter(...)): la sombra de un pilar cercano
        // (elipse independiente, offset hacia abajo) puede asomar por
        // detrás del Guardián mientras el CUERPO del pilar sí queda oculto
        // tras su sprite -- mucho más ancho que su hitbox real (e.r=58 de
        // colisión, pero el dibujo ocupa bastante más). El filtro de
        // floorgen.js solo corrige esto en el punto de aparición del jefe,
        // UNA vez; con el rodeo de pilares del enjambre (ver
        // core/loop.js: calcularRumboEnjambre) el jefe vuelve a acercarse
        // a pilares durante todo el combate (se pega hasta pl.r+e.r+4, unos
        // 86px con un pilar normal), así que hace falta la MISMA supresión
        // pero dinámica, cada frame -- se oculta solo la sombra (el cuerpo
        // del pilar se sigue dibujando normal: si está delante del jefe se
        // ve bien, si está detrás lo tapa el propio sprite, que es el
        // comportamiento correcto). Radio más ajustado que el filtro de
        // spawn (pensado para garantizar despeje, no para juzgar solape
        // visual frame a frame): el ancho real del sprite del jefe ronda su
        // propio radio (e.r), así que jefeHielo.r+40 cubre el caso de
        // "pegado" con margen sin ocultar la sombra de un pilar que ya
        // quedó claramente al lado, visible.
        const jefeHieloVivo = G.enemigos.find(
          (en) => en.jefe && en.arquetipo === "hielo" && en.hp > 0,
        );
        for (const pl of G.pilares) {
          if (pl.hurtT > 0) pl.hurtT -= 0.016;
          if (pl.rotoT > 0) pl.rotoT -= 0.016;
          const sombraOculta =
            jefeHieloVivo &&
            Math.hypot(pl.x - jefeHieloVivo.x, pl.y - jefeHieloVivo.y) <
              jefeHieloVivo.r + 40;
          if (!sombraOculta) {
            cx.fillStyle = "rgba(0,0,0,.35)";
            cx.beginPath();
            cx.ellipse(pl.x, pl.y + pl.r * 0.55, pl.r, pl.r * 0.4, 0, 0, TAU);
            cx.fill();
          }
          if (pl.hielo && PILAR_HIELO_FRAMES.length) {
            // Pilares de hielo del Guardián (ver core/loop.js: rama "hielo")
            // -- 8 fases de rotura reales (hoja en rejilla, ver
            // PILAR_HIELO_FRAMES en render/sprites.js: intacto -> grietas ->
            // se parte -> escombro). Pedido expreso del usuario: la
            // animación debe REPRODUCIRSE al romperse (golpe final, hp a
            // 0), no ir cambiando de fase golpe a golpe mientras el pilar
            // sigue con vida -- "queda raro". Mientras tenga vida se queda
            // en la fase intacta (0); las grietas/barra de vida de más
            // abajo ya comunican el daño acumulado sin tocar el sprite. Al
            // romperse, pl.rotoT (ver systems/abilities.js) cuenta atrás
            // desde PILAR_ROTO_DUR y aquí se traduce en avanzar por las 8
            // fases en ese mismo tiempo, terminando en el escombro justo
            // cuando toca desaparecer de G.pilares.
            const idxFase =
              pl.rotoT > 0
                ? Math.min(
                    PILAR_HIELO_FRAMES.length - 1,
                    Math.floor((1 - pl.rotoT / PILAR_ROTO_DUR) * PILAR_HIELO_FRAMES.length),
                  )
                : 0;
            const frame = PILAR_HIELO_FRAMES[idxFase];
            const ps = pl.r * 2.6;
            const psY = pl.y + pl.r * 0.5 - ps;
            cx.save();
            cx.imageSmoothingEnabled = false;
            if (pl.hurtT > 0) cx.globalAlpha = 0.85;
            cx.drawImage(frame, pl.x - ps / 2, psY, ps, ps);
            if (pl.hurtT > 0) {
              cx.globalCompositeOperation = "source-atop";
              cx.fillStyle = "rgba(255,255,255,.55)";
              cx.fillRect(pl.x - ps / 2, psY, ps, ps);
              cx.globalCompositeOperation = "source-over";
              cx.globalAlpha = 1;
            }
            cx.restore();
          } else if (assetOK("pilar")) {
            // 3 diseños del pack (ver pl.disenio en floorgen.js:
            // ponPilares()) -- variedad visual dentro de una misma sala
            // de columnas en vez de clonar siempre el mismo pilar.
            const claveDisenio = pl.disenio === 1 ? "pilarRostro" : pl.disenio === 2 ? "pilarEstriado" : "pilar";
            const src = (assetOK(claveDisenio) && SHEETS[claveDisenio]) || SHEETS["pilar"];
            const ph = pl.r * 3.4,
              pw = (ph * src.naturalWidth) / src.naturalHeight;
            cx.save();
            cx.imageSmoothingEnabled = false;
            if (pl.hurtT > 0) {
              cx.globalAlpha = 0.85;
            }
            cx.drawImage(src, pl.x - pw / 2, pl.y - ph * 0.72, pw, ph);
            if (pl.hurtT > 0) {
              cx.globalCompositeOperation = "source-atop";
              cx.fillStyle = "rgba(190,120,220,.5)";
              cx.fillRect(pl.x - pw / 2, pl.y - ph * 0.72, pw, ph);
              cx.globalCompositeOperation = "source-over";
              cx.globalAlpha = 1;
            }
            cx.restore();
          } else if (pl.hielo) {
            // Fallback procedural con paleta helada (celeste/blanco) por si
            // el sprite no cargó -- mismo mecanismo que el fallback morado
            // de abajo, solo cambia la paleta.
            cx.fillStyle = pl.hurtT > 0 ? "#eaf6ff" : "#5f9fc9";
            cx.fillRect(
              pl.x - pl.r * 0.85,
              pl.y - pl.r * 1.5,
              pl.r * 1.7,
              pl.r * 2,
            );
            cx.fillStyle = "#bfe6f7";
            cx.beginPath();
            cx.ellipse(pl.x, pl.y - pl.r * 1.5, pl.r * 0.95, pl.r * 0.35, 0, 0, TAU);
            cx.fill();
            cx.beginPath();
            cx.ellipse(pl.x, pl.y + pl.r * 0.5, pl.r * 0.9, pl.r * 0.32, 0, 0, TAU);
            cx.fill();
          } else {
            const cuerpo = pl.destructible ? "#3d3555" : "#2d2742";
            const tapa = pl.destructible ? "#4d4468" : "#3a3453";
            cx.fillStyle = pl.hurtT > 0 ? "#6a5a94" : cuerpo;
            cx.fillRect(
              pl.x - pl.r * 0.85,
              pl.y - pl.r * 1.5,
              pl.r * 1.7,
              pl.r * 2,
            );
            cx.fillStyle = tapa;
            cx.beginPath();
            cx.ellipse(
              pl.x,
              pl.y - pl.r * 1.5,
              pl.r * 0.95,
              pl.r * 0.35,
              0,
              0,
              TAU,
            );
            cx.fill();
            cx.beginPath();
            cx.ellipse(
              pl.x,
              pl.y + pl.r * 0.5,
              pl.r * 0.9,
              pl.r * 0.32,
              0,
              0,
              TAU,
            );
            cx.fill();
          }
          // grietas / barra de vida según daño -- se salta mientras se
          // reproduce la fase final de rotura (pl.rotoT): el escombro ya
          // comunica "destruido" por sí solo, no hace falta apilar grietas
          // + barra vacía encima.
          if (pl.destructible && pl.hp < pl.hpMax && !(pl.rotoT > 0)) {
            const danio = 1 - pl.hp / pl.hpMax;
            cx.strokeStyle = "rgba(10,8,17,.7)";
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.moveTo(pl.x - 4, pl.y - pl.r * 1.2);
            cx.lineTo(pl.x + 2, pl.y - pl.r * 0.5);
            cx.lineTo(pl.x - 3, pl.y);
            if (danio > 0.5) {
              cx.moveTo(pl.x + 8, pl.y - pl.r);
              cx.lineTo(pl.x + 3, pl.y - pl.r * 0.2);
              cx.lineTo(pl.x + 9, pl.y + pl.r * 0.3);
            }
            cx.stroke();
            cx.fillStyle = "#0d0b15";
            cx.fillRect(pl.x - 14, pl.y - pl.r * 1.9, 28, 4);
            cx.fillStyle = "#9a93ab";
            cx.fillRect(
              pl.x - 14,
              pl.y - pl.r * 1.9,
              (28 * pl.hp) / pl.hpMax,
              4,
            );
          }
        }
        // quita los pilares de hielo que ya terminaron de reproducir su
        // fase de rotura (ver systems/abilities.js: danoPilar) -- fuera del
        // bucle de arriba para no mutar G.pilares mientras se recorre.
        if (G.pilares.some((pl) => pl.rotoT !== undefined && pl.rotoT <= 0))
          G.pilares = G.pilares.filter((pl) => pl.rotoT === undefined || pl.rotoT > 0);

        // objetos del nivel
        for (const o of G.objetos) {
          if (o.tipo === "barril") {
            cx.fillStyle = "rgba(0,0,0,.3)";
            cx.beginPath();
            cx.ellipse(o.x, o.y + 12, 11, 4, 0, 0, TAU);
            cx.fill();
            // Tamaño explícito (antes drawSprite() centrado al tamaño
            // nativo del sprite, 24x24 -- "enorme" según el usuario) en
            // vez de por esc uniforme: así se puede pedir 16x22 (más alto
            // que ancho, como un barril real) sin rediseñar BARRIL_ROWS.
            cx.imageSmoothingEnabled = false;
            cx.drawImage(SPR.barril, o.x - 8, o.y - 11, 16, 22);
          } else if (o.tipo === "cofre") {
            cx.fillStyle = "rgba(0,0,0,.3)";
            cx.beginPath();
            cx.ellipse(o.x, o.y + 10, 14, 5, 0, 0, TAU);
            cx.fill();
            // Solo hay sprite de cerrado y de abierto (ver sprites.js): la
            // hoja de origen no trae fotogramas intermedios utilizables. El
            // "chispazo" de abrirse es puramente de código -- un pop de
            // escala con rebote (ease-out-back) sobre el sprite abierto,
            // en vez de animar entre imágenes.
            const imgCofre = o.abierto ? SPR.cofreAb : SPR.cofre;
            let escCofre = 1;
            if (o.abierto && o.abriendoT > 0) {
              const k = clamp(1 - o.abriendoT / 0.4, 0, 1);
              const c1 = 1.70158, c3 = c1 + 1;
              const backOut = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
              escCofre = 0.3 + 0.7 * backOut;
            }
            drawSprite(imgCofre, o.x, o.y, false, escCofre);
            if (o.qa) {
              cx.fillStyle = "#ff5a36";
              cx.font = "800 11px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText("⚠ COFRE DE PRUEBAS (QA) ⚠", o.x, o.y - 34);
            }
            if (o.qaMago) {
              // Segundo cofre de pruebas, brillo lila (ver el bloque
              // cofre.qaMago en systems/abilities.js: interactuar()) --
              // etiqueta propia para distinguirlo del cofre dorado de
              // arriba a simple vista.
              cx.fillStyle = "#c084f0";
              cx.font = "800 11px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText("⚠ COFRE DE PRUEBAS: ARMADURA MAGO (QA) ⚠", o.x, o.y - 34);
            }
            if (o.qaPicaro) {
              // Tercer cofre de pruebas, brillo verde (ver el bloque
              // cofre.qaPicaro en systems/abilities.js: interactuar()).
              cx.fillStyle = "#4a9d4a";
              cx.font = "800 11px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText("⚠ COFRE DE PRUEBAS: ARMADURA PÍCARO (QA) ⚠", o.x, o.y - 34);
            }
            if (o.qaArquero) {
              // Cuarto cofre de pruebas, brillo naranja (ver el bloque
              // cofre.qaArquero en systems/abilities.js: interactuar()).
              cx.fillStyle = "#e08a3c";
              cx.font = "800 11px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText("⚠ COFRE DE PRUEBAS: ARMADURA ARQUERO (QA) ⚠", o.x, o.y - 34);
            }
            if (!o.abierto) {
              const colorBrillo = o.qaMago ? "#c084f0" : o.qaPicaro ? "#4a9d4a" : o.qaArquero ? "#e08a3c" : "#e9b45c";
              cx.globalAlpha = 0.3 + Math.sin(animGlobal * 3) * 0.15;
              cx.fillStyle = colorBrillo;
              cx.beginPath();
              cx.arc(o.x, o.y, 18, 0, TAU);
              cx.fill();
              cx.globalAlpha = 1;
              // distancia directa (no depende de p.cofreObj, que es estado
              // solo del host -- así el aviso se ve igual en el invitado,
              // que solo recibe la posición de los jugadores y los objetos)
              if (
                G.players.some(
                  (p) => !p.ko && Math.hypot(p.x - o.x, p.y - o.y) < 46,
                )
              ) {
                dibujarAvisoTecla(o.x, o.y - 26, "E");
              }
            }
          } else if (o.tipo === "cristal") {
            const bob = Math.sin(animGlobal * 3 + o.x) * 3;
            cx.globalAlpha = 0.3;
            cx.fillStyle = "#6fb8e8";
            cx.beginPath();
            cx.arc(o.x, o.y + bob, 14, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            drawSprite(SPR.cristal, o.x, o.y + bob);
          } else if (o.tipo === "brasero") {
            if (assetOK("torch_pie")) {
              // Antorcha real del rework del tileset de mazmorra (ver
              // ASSET_SRC en sprites.js) en vez del brasero 100%
              // vectorial de antes -- se conserva el resplandor pulsante
              // (mismo criterio que dibujarMarcadorBanderin) como única
              // parte animada, ya que el sprite trae la llama pintada.
              const pulso = 0.4 + 0.2 * (0.5 + 0.5 * Math.sin(animGlobal * 6 + o.x));
              const grad = cx.createRadialGradient(o.x, o.y - 10, 2, o.x, o.y - 10, 22);
              grad.addColorStop(0, `rgba(255,157,77,${pulso})`);
              grad.addColorStop(1, "rgba(255,157,77,0)");
              cx.fillStyle = grad;
              cx.beginPath();
              cx.arc(o.x, o.y - 10, 22, 0, TAU);
              cx.fill();
              cx.fillStyle = "rgba(0,0,0,.3)";
              cx.beginPath();
              cx.ellipse(o.x, o.y + 9, 9, 3, 0, 0, TAU);
              cx.fill();
              cx.imageSmoothingEnabled = false;
              cx.drawImage(SHEETS.torch_pie, o.x - 20, o.y - 46, 40, 55);
              continue;
            }
            cx.fillStyle = "#3a3453";
            cx.fillRect(o.x - 6, o.y - 2, 12, 8);
            cx.fillStyle = "#2a2440";
            cx.fillRect(o.x - 8, o.y + 5, 16, 3);
            const fl = Math.sin(animGlobal * 11 + o.x) * 2;
            cx.fillStyle = "#ff7d4d";
            cx.beginPath();
            cx.moveTo(o.x - 5, o.y - 1);
            cx.lineTo(o.x, o.y - 12 - fl);
            cx.lineTo(o.x + 5, o.y - 1);
            cx.closePath();
            cx.fill();
            cx.fillStyle = "#ffd27f";
            cx.beginPath();
            cx.moveTo(o.x - 3, o.y - 1);
            cx.lineTo(o.x, o.y - 7 - fl);
            cx.lineTo(o.x + 3, o.y - 1);
            cx.closePath();
            cx.fill();
          } else if (o.tipo === "escombros" && assetOK("escombros")) {
            cx.fillStyle = "rgba(0,0,0,.3)";
            cx.beginPath();
            cx.ellipse(o.x, o.y + 10, 20, 5, 0, 0, TAU);
            cx.fill();
            cx.imageSmoothingEnabled = false;
            cx.drawImage(SHEETS.escombros, o.x - 34, o.y - 38, 68, 48);
          } else if (o.tipo === "barrilRacimo" && assetOK("barril_racimo")) {
            cx.fillStyle = "rgba(0,0,0,.3)";
            cx.beginPath();
            cx.ellipse(o.x, o.y + 22, 26, 6, 0, 0, TAU);
            cx.fill();
            cx.imageSmoothingEnabled = false;
            cx.drawImage(SHEETS.barril_racimo, o.x - 38, o.y - 44, 75, 66);
          } else if (o.tipo === "estandarte") {
            // Colgado del muro (ver decorarMuros() en floorgen.js: o.x/o.y
            // ya vienen centrados en el tramo de muro más ancho de la
            // sala, o.y es el borde SUPERIOR de ese muro) -- nunca un
            // punto suelto de suelo.
            const clave = o.variante === 0 ? "estandarte_azul" : "estandarte_rojo";
            if (assetOK(clave)) {
              cx.imageSmoothingEnabled = false;
              cx.drawImage(SHEETS[clave], o.x - 16, o.y + 2, 32, 40);
            }
          } else if (o.tipo === "cadena" && assetOK("cadena")) {
            cx.imageSmoothingEnabled = false;
            cx.drawImage(SHEETS.cadena, o.x - 13, o.y + 2, 26, 78);
          } else if (o.tipo === "llave" && assetOK("llave")) {
            const bob = Math.sin(animGlobal * 2.5 + o.x) * 2;
            cx.fillStyle = "rgba(0,0,0,.3)";
            cx.beginPath();
            cx.ellipse(o.x, o.y + 6, 8, 3, 0, 0, TAU);
            cx.fill();
            cx.imageSmoothingEnabled = false;
            cx.drawImage(SHEETS.llave, o.x - 9, o.y - 4 + bob, 18, 15);
          }
        }

        // mercader (lobby)
        if (G.mercader) {
          const m = G.mercader;
          cx.fillStyle = "rgba(0,0,0,.35)";
          cx.beginPath();
          cx.ellipse(m.x, m.y + 16, 12, 4, 0, 0, TAU);
          cx.fill();
          drawSprite(
            SPR.mercader,
            m.x,
            m.y - 6 + Math.sin(animGlobal * 2) * 1.5,
          );
          drawSprite(SPR.moneda, m.x, m.y - 38 + Math.sin(animGlobal * 3) * 3);
          cx.fillStyle = "#ffd27f";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("MERCADER — acércate", m.x, m.y + 34);
        }
        // sastre de skins (lobby)
        if (G.skinNpc) {
          const m = G.skinNpc;
          cx.fillStyle = "rgba(0,0,0,.35)";
          cx.beginPath();
          cx.ellipse(m.x, m.y + 16, 12, 4, 0, 0, TAU);
          cx.fill();
          // el sastre luce la skin dorada, por supuesto
          drawSprite(
            SPR.sastre,
            m.x,
            m.y - 6 + Math.sin(animGlobal * 2.3 + 1) * 1.5,
          );
          // aguja de sastre flotante (rombo que rota)
          cx.save();
          cx.translate(m.x, m.y - 38 + Math.sin(animGlobal * 3 + 1) * 3);
          cx.rotate(animGlobal * 2);
          cx.fillStyle = "#c084f0";
          cx.fillRect(-4, -4, 8, 8);
          cx.restore();
          cx.fillStyle = "#c084f0";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("SASTRE — skins", m.x, m.y + 34);
        }
        // portal de la Arena PvP (lobby)
        if (G.arenaNpc) {
          dibujarMarcadorBanderin(G.arenaNpc, {
            color: "#d1545c",
            colorClaro: "#ff5c5c",
            icono: "⚔",
            etiqueta: "ARENA PvP — acércate",
          });
        }
        // Mesa de Trabajo / Yunque (lobby): desmantelar armas en Fragmentos
        // de Alma -- ver ui/workbench.js. Pedido expreso: sin el banderín
        // flotante (bocadillo) que usan Arena/Fragua -- el yunque de
        // verdad, plantado en el suelo, a tamaño bien visible.
        if (G.yunqueNpc) {
          const m = G.yunqueNpc;
          const s = 52;
          cx.fillStyle = "rgba(0,0,0,.35)";
          cx.beginPath();
          cx.ellipse(m.x, m.y + 18, 20, 6, 0, 0, TAU);
          cx.fill();
          if (yunqueIcoListo) {
            cx.drawImage(imYunqueIco, 0, 0, 32, 32, m.x - s / 2, m.y + 18 - s, s, s);
          } else {
            cx.fillStyle = "#e9c98a";
            cx.font = "700 26px Alegreya Sans";
            cx.textAlign = "center";
            cx.fillText("⚒", m.x, m.y + 5);
          }
          cx.fillStyle = "#e9c98a";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("MESA DE TRABAJO — acércate", m.x, m.y + 34);
        }
        // Fragua de fusión: aparece por sorpresa en una sala normal de la
        // planta (ver systems/floorgen.js, sala.fraguaNpc/poblarSala) --
        // mismo marcador de banderín que el resto de estaciones.
        if (G.fraguaNpc) {
          dibujarMarcadorBanderin(G.fraguaNpc, {
            color: "#e0703a",
            colorClaro: "#ffb27f",
            icono: "⚗",
            etiqueta: "FRAGUA — acércate",
          });
        }
        // NPC de pruebas (QA, ?qa=1): sube de nivel al grupo por proximidad
        if (G.nivelNpc) {
          const m = G.nivelNpc;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(233,180,92," + (0.9 - k * 0.28) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              m.x,
              m.y,
              22 - k * 6 + Math.sin(animGlobal * 3 + k) * 2,
              0,
              TAU,
            );
            cx.stroke();
          }
          cx.fillStyle = "#ffd27f";
          cx.font = "700 13px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("★", m.x, m.y + 5);
          cx.fillStyle = "#e9b45c";
          cx.font = "700 10px Alegreya Sans";
          cx.fillText("NPC NIVEL (QA) — acércate", m.x, m.y + 34);
        }
        // Portal de pruebas (QA, ?qa=1): salto directo a la planta 5
        if (G.jefeNpcQA) {
          const mj = G.jefeNpcQA;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(127,201,232," + (0.9 - k * 0.28) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(mj.x, mj.y, 22 - k * 6 + Math.sin(animGlobal * 3 + k) * 2, 0, TAU);
            cx.stroke();
          }
          cx.fillStyle = "#bfe6f7";
          cx.font = "700 13px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("❄", mj.x, mj.y + 5);
          cx.fillStyle = "#7fc9e8";
          cx.font = "700 10px Alegreya Sans";
          cx.fillText("PORTAL AL JEFE (QA) — acércate", mj.x, mj.y + 34);
        }

        // Portal de pruebas (QA, ?qa=1), ROJO: misma planta 5 de arriba,
        // pero para el Caballero Espectral (jefe multi-pieza de prueba,
        // ver systems/combat.js: spawnJefeCaballero()) en vez del
        // Guardián de Hielo -- mismo dibujo que el portal azul de arriba,
        // solo cambia el color/icono.
        if (G.caballeroNpcQA) {
          const mc = G.caballeroNpcQA;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(232,90,90," + (0.9 - k * 0.28) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(mc.x, mc.y, 22 - k * 6 + Math.sin(animGlobal * 3 + k) * 2, 0, TAU);
            cx.stroke();
          }
          cx.fillStyle = "#f7bfbf";
          cx.font = "700 13px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("👻", mc.x, mc.y + 5);
          cx.fillStyle = "#e85a5a";
          cx.font = "700 10px Alegreya Sans";
          cx.fillText("PORTAL AL CABALLERO (QA) — acércate", mc.x, mc.y + 34);
        }

        // drops
        // Posición del ratón en coordenadas de MUNDO (mismo cálculo que
        // leerInput() en systems/input.js: mouse.x/y son de PANTALLA, hay
        // que sumar el desplazamiento de cámara) -- se usa más abajo para
        // el tooltip de hover de cada drop (ver dibujarTooltipDropHover()).
        const camOfDrops = G.cam || { x: 0, y: 0 };
        const mundoXDrops = mouse.x + camOfDrops.x,
          mundoYDrops = mouse.y + camOfDrops.y;
        for (const dr of G.drops) {
          const bob = Math.sin(animGlobal * 4 + dr.x) * 3;
          if (dr.tipo === "vial") drawSprite(SPR.vial, dr.x, dr.y + bob);
          else if (dr.tipo === "moneda") {
            cx.globalAlpha = 0.3;
            cx.fillStyle = "#ffd27f";
            cx.beginPath();
            cx.arc(dr.x, dr.y + bob, 10, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            drawSprite(SPR.moneda, dr.x, dr.y + bob);
          } else {
            const rareza = dr.item.rareza;
            const col = RAREZAS[rareza].col;
            // Salto/giro/caída antes de asentarse (ver dropItem() en
            // systems/loot.js): el objeto aparece en el aire, gira y cae
            // con un arco que se frena (ease-out), y solo al tocar el
            // suelo (sfxAterrizaje en core/loop.js) empieza a contar el
            // rayo de luz -- por eso beamK usa el tiempo DESDE el
            // aterrizaje, no desde que apareció el drop.
            const saltoDur = dr.saltoDur || 0.5;
            const saltoK = clamp((dr.t || 0) / saltoDur, 0, 1);
            const cayendo = saltoK < 1;
            if (cayendo) {
              const altura = (50 + rareza * 6) * (1 - saltoK) * (1 - saltoK);
              const deriva = (dr.saltoDX || 0) * (1 - saltoK);
              const angulo = (dr.anguloSpin0 || 0) + saltoK * TAU * 2.5;
              cx.save();
              cx.translate(dr.x + deriva, dr.y - altura);
              cx.rotate(angulo);
              const img = iconoDrop(dr.item);
              cx.drawImage(img, -img.width / 2, -img.height / 2);
              cx.restore();
              // sombra en el suelo que se marca según se acerca la caída
              cx.globalAlpha = 0.25 * saltoK;
              cx.fillStyle = "#000";
              cx.beginPath();
              cx.ellipse(dr.x, dr.y + 8, 10 * saltoK, 4 * saltoK, 0, 0, TAU);
              cx.fill();
              cx.globalAlpha = 1;
              continue;
            }
            const tPostAterrizaje = Math.max(0, (dr.t || 0) - saltoDur);
            const beamK = clamp(tPostAterrizaje / 0.2, 0, 1);
            const beamH = 100 + rareza * 24; // más largo que antes (64+14·rar)
            const anchoGlow = 10 + rareza * 3.5; // más finito que antes (16+6·rar)
            const pulso = 0.85 + Math.sin(animGlobal * 5 + dr.x) * 0.15;

            cx.save();
            cx.globalAlpha = beamK;
            // resplandor ancho y difuso detrás del núcleo (el shadowBlur del
            // núcleo ya sangra hacia afuera, esto añade cuerpo a la base)
            const gGlow = cx.createLinearGradient(dr.x, dr.y - beamH, dr.x, dr.y);
            gGlow.addColorStop(0, hexRgba(col, 0));
            gGlow.addColorStop(0.55, hexRgba(col, 0.12 * pulso));
            gGlow.addColorStop(1, hexRgba(col, 0.5 * pulso));
            cx.fillStyle = gGlow;
            cx.fillRect(dr.x - anchoGlow / 2, dr.y - beamH, anchoGlow, beamH);
            // núcleo brillante con halo real de canvas (shadowBlur) -- más
            // ancho y luminoso cuanto mayor la rareza. Trazo ONDULADO (más
            // puntos de muestreo, no un cx.fillRect recto de siempre) en
            // vez de una vara perfectamente rígida -- pedido expreso: "más
            // pixeles para que se vea más fluido y curvilíneo". Mismo
            // criterio que las hebras de abajo (solo Épico+) pero con una
            // amplitud mucho más sutil y en CUALQUIER rareza -- antes solo
            // la Épica+ tenía algo de curvatura (las hebras), el núcleo en
            // sí seguía siendo una barra recta a cualquier tier.
            cx.shadowColor = col;
            cx.shadowBlur = (5 + rareza * 4) * pulso;
            const gCore = cx.createLinearGradient(dr.x, dr.y - beamH, dr.x, dr.y);
            gCore.addColorStop(0, "rgba(255,255,255,0)");
            gCore.addColorStop(0.6, hexRgba(col, 0.85));
            gCore.addColorStop(1, "#fff");
            const anchoCore = 1.6 + rareza * 0.45; // más finito que antes (3+0.8·rar)
            cx.strokeStyle = gCore;
            cx.lineWidth = anchoCore;
            cx.lineCap = "round";
            cx.beginPath();
            const nSegCore = 20;
            for (let i = 0; i <= nSegCore; i++) {
              const t2 = i / nSegCore;
              const cy = dr.y - t2 * beamH;
              const onda = Math.sin(t2 * TAU * 1.6 + animGlobal * 2.8) * (0.8 + rareza * 0.35) * (1 - t2 * 0.25);
              const cx2 = dr.x + onda;
              if (i === 0) cx.moveTo(cx2, cy);
              else cx.lineTo(cx2, cy);
            }
            cx.stroke();
            cx.restore();

            // hebras onduladas (Raro+, antes solo Épico+ -- pedido expreso:
            // "en los azules morados dorados y míticos"): dos cintas de
            // energía que suben en espiral junto al núcleo, como el vídeo
            // de referencia (Diablo 4, alijos míticos) -- un simple rayo
            // recto se queda corto para transmitir "esto es importante".
            // Más segmentos que antes (14->22) para una curva más lisa,
            // menos poligonal -- pedido expreso: "añádele curvatura".
            if (rareza >= 1) {
              cx.save();
              for (let hebra = 0; hebra < 2; hebra++) {
                cx.beginPath();
                const nSeg = 22;
                for (let i = 0; i <= nSeg; i++) {
                  const t2 = i / nSeg;
                  const hy = dr.y - t2 * beamH;
                  const ondulacion =
                    Math.sin(t2 * TAU * 2.2 + animGlobal * 2.4 + hebra * Math.PI) *
                    (6 + rareza * 2.2) *
                    (1 - t2 * 0.3);
                  const hx = dr.x + ondulacion + (hebra === 0 ? -1 : 1) * 3;
                  if (i === 0) cx.moveTo(hx, hy);
                  else cx.lineTo(hx, hy);
                }
                const gradHebra = cx.createLinearGradient(dr.x, dr.y - beamH, dr.x, dr.y);
                gradHebra.addColorStop(0, hexRgba(col, 0));
                gradHebra.addColorStop(0.5, hexRgba(col, 0.55 * beamK));
                gradHebra.addColorStop(1, hexRgba(col, 0));
                cx.strokeStyle = gradHebra;
                cx.lineWidth = 2;
                cx.stroke();
              }
              cx.restore();
            }

            // partículas ambiente ascendiendo por el rayo: densidad y
            // brillo suben con la rareza ("brillos ludópatas" -- cuanto
            // mejor el objeto, más refuerzo visual de recompensa). Todo
            // procedural a partir de animGlobal + dr.x, sin estado propio
            // por partícula: cada cliente (host/invitado) lo dibuja igual
            // de bien sin necesitar sincronizarlo por red.
            const nChispas = 3 + rareza * 4;
            cx.save();
            for (let i = 0; i < nChispas; i++) {
              const fase =
                (animGlobal * (0.5 + (i % 3) * 0.15) +
                  i / nChispas +
                  dr.x * 0.013) %
                1;
              const sy = dr.y - fase * beamH;
              const sx = dr.x + Math.sin(fase * TAU * 2 + i) * (1.4 + rareza * 0.7);
              const salpha = Math.sin(fase * Math.PI);
              cx.globalAlpha = beamK * salpha;
              cx.fillStyle = rareza >= 3 ? "#fff" : col;
              const s = rareza >= 4 ? 2.4 : rareza >= 2 ? 1.8 : 1.3;
              cx.beginPath();
              cx.arc(sx, sy, s, 0, TAU);
              cx.fill();
            }
            cx.restore();

            // destello tipo "starburst" para legendario+: un parpadeo breve
            // de cruz brillante sobre el objeto, sensación de premio gordo
            if (rareza >= 3) {
              const flash = Math.max(0, Math.sin(animGlobal * 2.2 + dr.x * 3));
              if (flash > 0.75) {
                const fa = (flash - 0.75) / 0.25;
                cx.save();
                cx.globalAlpha = beamK * fa * 0.9;
                cx.fillStyle = "#fff";
                cx.shadowColor = col;
                cx.shadowBlur = 14;
                const fy = dr.y + bob - 10;
                const largo = 12 + rareza * 2;
                cx.fillRect(dr.x - largo / 2, fy - 1, largo, 2);
                cx.fillRect(dr.x - 1, fy - largo / 2, 2, largo);
                cx.restore();
              }
            }

            // Resplandor de base: antes un círculo plano de color sólido
            // (cx.arc + fill a alpha fijo) -- se veía como un disco pegado
            // debajo del icono, sin relación con el resto del efecto
            // (rayo/hebras/chispas, todo con degradados suaves). Pedido
            // expreso: "el círculo queda raro". Degradado radial (opaco en
            // el centro, se apaga hacia el borde) en vez de un relleno
            // plano -- mismo criterio visual que el núcleo/las hebras.
            const gBase = cx.createRadialGradient(dr.x, dr.y + bob, 0, dr.x, dr.y + bob, 14);
            gBase.addColorStop(0, hexRgba(col, 0.4 * pulso));
            gBase.addColorStop(0.7, hexRgba(col, 0.16 * pulso));
            gBase.addColorStop(1, hexRgba(col, 0));
            cx.fillStyle = gBase;
            cx.beginPath();
            cx.arc(dr.x, dr.y + bob, 14, 0, TAU);
            cx.fill();
            // Llamita ambiental subiendo desde la base (Raro+, mismo
            // umbral que las hebras) -- pedido expreso: "desde el objeto
            // una especie de llama hacia arriba". 3 lenguas cortas que se
            // balancean con un seno propio (fase distinta cada una) y se
            // afinan en punta, MUCHO más corta que el rayo principal (no
            // compite con él, es un acompañamiento a ras de suelo).
            if (rareza >= 1) {
              cx.save();
              const nLlamas = 3;
              for (let li = 0; li < nLlamas; li++) {
                const fase = animGlobal * 3.1 + li * 2.1;
                const alto = 10 + rareza * 2 + Math.sin(fase) * 2.5;
                const balanceo = Math.sin(fase * 1.7 + li) * (2 + rareza * 0.4);
                const bx = dr.x + (li - 1) * 4.5;
                const by = dr.y + bob;
                cx.beginPath();
                cx.moveTo(bx - 2, by);
                cx.quadraticCurveTo(bx + balanceo, by - alto * 0.6, bx + balanceo * 1.3, by - alto);
                cx.quadraticCurveTo(bx + balanceo, by - alto * 0.6, bx + 2, by);
                cx.closePath();
                const gLlama = cx.createLinearGradient(bx, by, bx, by - alto);
                gLlama.addColorStop(0, hexRgba(col, 0.6));
                gLlama.addColorStop(1, hexRgba(col, 0));
                cx.fillStyle = gLlama;
                cx.fill();
              }
              cx.restore();
            }
            cx.globalAlpha = 1;
            drawSprite(iconoDrop(dr.item), dr.x, dr.y + bob);

            // Hover con el ratón: tooltip completo (nombre/tipo/efecto/
            // stats) para CUALQUIER rareza -- ver dibujarTooltipDropHover()
            // más arriba. Si no está en hover, épico+ sigue mostrando su
            // etiqueta compacta de solo-nombre de siempre (para no saturar
            // la pantalla con comunes/mágicos todo el rato); al pasar el
            // cursor por encima, esa etiqueta se sustituye por el tooltip
            // completo en vez de duplicarse con él.
            const enHover =
              Math.hypot(mundoXDrops - dr.x, mundoYDrops - (dr.y + bob)) < 26;
            if (enHover) {
              dibujarTooltipDropHover(dr.item, dr.x, dr.y + bob, col, rareza);
            } else if (rareza >= 2) {
              const etiqueta = dr.item.nombre + " [" + RAREZAS[rareza].n + "]";
              cx.font = "700 11px Alegreya Sans";
              cx.textAlign = "center";
              const anchoEtq = cx.measureText(etiqueta).width + 14;
              const ey = dr.y + bob - 34;
              cx.fillStyle = "rgba(10,8,17,.72)";
              cx.beginPath();
              cx.roundRect(dr.x - anchoEtq / 2, ey - 12, anchoEtq, 18, 8);
              cx.fill();
              cx.strokeStyle = hexRgba(col, 0.7);
              cx.lineWidth = 1;
              cx.stroke();
              cx.fillStyle = col;
              cx.fillText(etiqueta, dr.x, ey + 1);
            }
            // aviso de tecla por distancia directa (no depende de p.dropObj,
            // que es estado solo del host) -- mismo patrón que el cofre.
            if (
              G.players.some(
                (p) => !p.ko && Math.hypot(p.x - dr.x, p.y - dr.y) < 40,
              )
            ) {
              dibujarAvisoTecla(dr.x, dr.y - (rareza >= 2 ? 50 : 26), "E");
            }
          }
        }

        // entidades ordenadas por Y
        const ents = [
          ...G.enemigos.map((e) => ({ t: "e", y: e.y, e })),
          ...G.players.map((p) => ({ t: "p", y: p.y, p })),
        ];
        ents.sort((a, b) => a.y - b.y);
        for (const en of ents) {
          if (en.t === "e") renderEnemigo(en.e);
          else renderJugador(en.p);
        }

        // proyectiles
        for (const pr of G.projs) {
          if (pr.tipo === "flecha") {
            // Sprite real (ver render/sprites.js: SPR.flecha/flechaCargada)
            // en vez del triángulo dibujado a mano de antes -- mismo pivote
            // central y misma rotación por velocidad, así que el cambio no
            // toca ningún otro sitio que calcule la posición/ángulo de la
            // flecha. Si el sprite todavía no cargó (un instante, al
            // arrancar) cae al triángulo de siempre para no dejar un hueco.
            const imgFlecha = pr.cargada ? SPR.flechaCargada : SPR.flecha;
            cx.save();
            cx.translate(pr.x, pr.y);
            cx.rotate(Math.atan2(pr.vy, pr.vx));
            if (imgFlecha) {
              const s = 22;
              cx.drawImage(imgFlecha, -s / 2, -s / 2, s, s);
            } else {
              cx.fillStyle = pr.color;
              cx.fillRect(-8, -1.5, 14, 3);
              cx.beginPath();
              cx.moveTo(6, -4);
              cx.lineTo(12, 0);
              cx.lineTo(6, 4);
              cx.closePath();
              cx.fill();
            }
            cx.restore();
          } else if (pr.tipo === "cuchillo") {
            // Cuchillo arrojado del pícaro (ver lanzarCuchillo en
            // systems/abilities.js): sin sprite propio todavía, gira sobre
            // sí mismo al volar (mismo giro rápido que "rama" más abajo)
            // en vez de orientarse a la trayectoria como la flecha -- así
            // se lee como un cuchillo dando vueltas, no como una flecha
            // más. pr.color ya trae el dorado de la carga (ver
            // lanzarCuchillo), así que el tinte "cargado" sale gratis.
            // El desplazamiento vertical de abajo es SOLO de dibujado --
            // pr.y (el de la colisión real contra enemigos) se queda tal
            // cual, para no desalinear el alcance del lanzamiento; nacía
            // (y volaba) claramente por debajo de la mano que lo lanza,
            // porque pr.y sale del ancla de PIES del personaje (mismo
            // "problema" de siempre en este renderizado 2.5D, ver
            // ALTO_MANO_ESTOCADA en systems/abilities.js -- ahí sí se
            // podía subir el dato real porque esa FX no colisiona).
            cx.save();
            cx.translate(pr.x, pr.y - 34);
            cx.rotate(animGlobal * 22 + pr.x * 0.3);
            cx.fillStyle = "#2c241a";
            cx.fillRect(-7, -1, 4, 2);
            cx.fillStyle = pr.color;
            cx.beginPath();
            cx.moveTo(-3, 0);
            cx.lineTo(4, -2.5);
            cx.lineTo(8, 0);
            cx.lineTo(4, 2.5);
            cx.closePath();
            cx.fill();
            cx.fillStyle = "rgba(255,255,255,.5)";
            cx.beginPath();
            cx.moveTo(-1, -0.6);
            cx.lineTo(4, -1.6);
            cx.lineTo(4, 0);
            cx.closePath();
            cx.fill();
            cx.restore();
          } else if (pr.tipo === "rama") {
            cx.save();
            cx.translate(pr.x, pr.y);
            cx.rotate(animGlobal * 14 + pr.x);
            cx.fillStyle = "#8a6b43";
            cx.fillRect(-7, -1.5, 14, 3);
            cx.fillStyle = "#6b4a2c";
            cx.fillRect(-2, -3, 3, 2);
            cx.fillStyle = "#6ac04a";
            cx.beginPath();
            cx.ellipse(5, -3, 3, 1.8, -0.5, 0, TAU);
            cx.fill();
            cx.restore();
          } else if (pr.tipo === "bola") {
            // Bola de fuego real del ataque básico del mago (sustituye al
            // círculo procedural de antes -- ver FIREBALL_SHEET en
            // sprites.js). Rotada según la dirección de vuelo (la hoja
            // trae la llama apuntando a la derecha con la cola hacia la
            // izquierda) y animada por parpadeo (loop rápido, no atado al
            // progreso del vuelo -- es un flicker de llama, no una carga).
            if (FIREBALL_SHEET.complete && FIREBALL_SHEET.naturalWidth) {
              const frBola = Math.floor(animGlobal * 24) % FIREBALL_FRAMES;
              // 0.45 -> 0.58: pedido expreso, se notaba pequeña para un
              // ataque básico.
              const escBola = 0.58;
              const fwBola = FIREBALL_FW * escBola, fhBola = FIREBALL_FH * escBola;
              cx.save();
              cx.translate(pr.x, pr.y);
              cx.rotate(Math.atan2(pr.vy, pr.vx));
              cx.drawImage(FIREBALL_SHEET, frBola * FIREBALL_FW, 0, FIREBALL_FW, FIREBALL_FH, -fwBola / 2, -fhBola / 2, fwBola, fhBola);
              cx.restore();
            } else {
              // Fallback mientras carga la hoja real (un instante, al arrancar).
              cx.fillStyle = "#ff7d4d";
              cx.beginPath();
              cx.arc(pr.x, pr.y, 5, 0, TAU);
              cx.fill();
            }
          } else if (pr.tipo === "carambano") {
            cx.save();
            cx.translate(pr.x, pr.y);
            cx.rotate(Math.atan2(pr.vy, pr.vx));
            cx.fillStyle = "#7fc9e8";
            cx.beginPath();
            cx.moveTo(8, 0);
            cx.lineTo(-6, -3.5);
            cx.lineTo(-3, 0);
            cx.lineTo(-6, 3.5);
            cx.closePath();
            cx.fill();
            cx.fillStyle = "#cfe4ff";
            cx.beginPath();
            cx.moveTo(7, 0);
            cx.lineTo(-2, -1.5);
            cx.lineTo(-2, 1.5);
            cx.closePath();
            cx.fill();
            cx.restore();
          } else if (pr.tipo === "tuit") {
            // burbuja de "tuit" azul
            cx.fillStyle = "#4a90d9";
            cx.beginPath();
            cx.arc(pr.x, pr.y, 6, 0, TAU);
            cx.fill();
            cx.fillStyle = "#fff";
            cx.font = "700 8px Alegreya Sans";
            cx.textAlign = "center";
            cx.fillText("!", pr.x, pr.y + 3);
            cx.fillStyle = "#4a90d9";
            cx.beginPath();
            cx.moveTo(pr.x - 4, pr.y + 4);
            cx.lineTo(pr.x - 7, pr.y + 9);
            cx.lineTo(pr.x - 1, pr.y + 6);
            cx.closePath();
            cx.fill();
          } else if (pr.tipo === "orbeArc") {
            const rr = pr.r || 4;
            cx.fillStyle = "rgba(192,132,240,.25)";
            cx.beginPath();
            cx.arc(
              pr.x,
              pr.y,
              rr + 4 + Math.sin(animGlobal * 16) * 1.5,
              0,
              TAU,
            );
            cx.fill();
            cx.fillStyle = "#c084f0";
            cx.beginPath();
            cx.arc(pr.x, pr.y, rr, 0, TAU);
            cx.fill();
            cx.fillStyle = "#e8d5ff";
            cx.beginPath();
            cx.arc(pr.x, pr.y, rr * 0.45, 0, TAU);
            cx.fill();
          } else {
            cx.fillStyle = pr.color;
            cx.beginPath();
            cx.arc(pr.x, pr.y, pr.r, 0, TAU);
            cx.fill();
            cx.globalAlpha = 0.3;
            cx.beginPath();
            cx.arc(pr.x, pr.y, pr.r + 4, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
          }
        }

        // flechas clavadas (detalle de impacto, ver agregarFlechaClavada en
        // core/loop.js) -- mismo sprite que la flecha en vuelo, quieta y
        // ya sin rotar sobre sí misma, con un desvanecido en el último
        // tramo de vida en vez de desaparecer de golpe.
        for (const fc of G.flechasClavadas) {
          const fx2 = fc.enemigo ? fc.enemigo.x + fc.ox : fc.x;
          const fy2 = fc.enemigo ? fc.enemigo.y + fc.oy : fc.y;
          const imgFlecha = fc.color === "#ffd27f" ? SPR.flechaCargada : SPR.flecha;
          if (!imgFlecha) continue;
          cx.save();
          cx.globalAlpha = Math.min(1, fc.t / 0.6);
          cx.translate(fx2, fy2);
          cx.rotate(fc.dir);
          const s = 20;
          cx.drawImage(imgFlecha, -s * 0.15, -s / 2, s, s);
          cx.restore();
        }

        // fx
        for (const f of G.fx) {
          const k = f.t / f.t0;
          if (f.tipo === "txt") {
            // Borde oscuro (mismo tono que los paneles de UI, #0d0b15) para
            // que el número se lea de un vistazo contra cualquier fondo --
            // antes era solo relleno de color, se perdía contra el suelo
            // claro o un sprite parecido. "grande" (crítico y anuncios tipo
            // "¡GOLPE COLOSAL!") además hace un pop de entrada: arranca más
            // grande de lo normal y se asienta en los primeros ~150ms, con
            // un resplandor del propio color -- se lee como un golpe fuerte
            // de un vistazo, no solo por el color/tamaño fijo de antes.
            const elapsed = 1 - k;
            const escalaTxt = f.grande ? 1.6 - Math.min(elapsed / 0.15, 1) * 0.6 : 1;
            cx.save();
            cx.translate(f.x, f.y - (1 - k) * (f.grande ? 30 : 22));
            cx.scale(escalaTxt, escalaTxt);
            cx.globalAlpha = k;
            cx.font = (f.grande ? "800 18px" : "700 12px") + " Alegreya Sans";
            cx.textAlign = "center";
            if (f.grande) {
              cx.shadowColor = f.col;
              cx.shadowBlur = 10;
            }
            cx.lineWidth = f.grande ? 3.5 : 2.5;
            cx.strokeStyle = "rgba(13,11,21,.85)";
            cx.strokeText(f.txt, 0, 0);
            cx.shadowBlur = 0;
            cx.fillStyle = f.col;
            cx.fillText(f.txt, 0, 0);
            cx.restore();
            cx.globalAlpha = 1;
          } else if (f.tipo === "onda") {
            cx.globalAlpha = k;
            cx.strokeStyle = f.col;
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(f.x, f.y, f.r * (1 - k * 0.3) + (1 - k) * 18, 0, TAU);
            cx.stroke();
            cx.globalAlpha = 1;
          } else if (f.tipo === "tajo") {
            // filo afilado: una medialuna que se afina en punta en ambos
            // extremos (no un simple trazo de arco), con un destello claro
            // en el borde de ataque para que brille como un corte de hoja.
            // Estela de movimiento (referencia: guadaña de Stardew Valley)
            // -- desenfoque suave + degradado invertido respecto a antes
            // (opaco en el filo de ATAQUE, se apaga hacia el arranque del
            // giro) para que se lea como "la hoja está aquí, esto es su
            // rastro" en vez de un destello centrado sin dirección.
            const sweep = 1.35;
            const nP = 12;
            const grosor = 6 + f.r * 0.026;
            cx.save();
            cx.filter = "blur(1.4px)";
            cx.globalAlpha = k; // antes k*k -- se apaga más despacio, más presencia de estela
            cx.beginPath();
            for (let i = 0; i <= nP; i++) {
              const t2 = i / nP;
              const ang = f.dir - sweep / 2 + t2 * sweep;
              const w = Math.sin(t2 * Math.PI) * grosor;
              const rx = f.x + Math.cos(ang) * (f.r + w * 0.35);
              const ry = f.y + Math.sin(ang) * (f.r + w * 0.35);
              if (i === 0) cx.moveTo(rx, ry);
              else cx.lineTo(rx, ry);
            }
            for (let i = nP; i >= 0; i--) {
              const t2 = i / nP;
              const ang = f.dir - sweep / 2 + t2 * sweep;
              const w = Math.sin(t2 * Math.PI) * grosor;
              const rx = f.x + Math.cos(ang) * (f.r - w * 0.85);
              const ry = f.y + Math.sin(ang) * (f.r - w * 0.85);
              cx.lineTo(rx, ry);
            }
            cx.closePath();
            // Invertido respecto a la versión anterior: opaco en el filo de
            // ATAQUE (f.dir + sweep/2, donde termina el giro) y se disuelve
            // hacia el arranque (f.dir - sweep/2) -- antes era al revés
            // (opaco en medio, transparente en las dos puntas), que no
            // comunicaba ninguna dirección de movimiento.
            const grad = cx.createLinearGradient(
              f.x + Math.cos(f.dir - sweep / 2) * f.r,
              f.y + Math.sin(f.dir - sweep / 2) * f.r,
              f.x + Math.cos(f.dir + sweep / 2) * f.r,
              f.y + Math.sin(f.dir + sweep / 2) * f.r,
            );
            grad.addColorStop(0, "rgba(233,180,92,0)");
            grad.addColorStop(0.45, "rgba(255,247,224,.55)");
            grad.addColorStop(1, "rgba(255,255,255,.95)");
            cx.fillStyle = grad;
            cx.fill();
            // segunda pasada, más translúcida y algo más ancha: dos capas
            // superpuestas leen como una estela con cuerpo en vez de una
            // única forma plana, sin tener que guardar fotogramas pasados.
            cx.globalAlpha = k * 0.4;
            cx.fill();
            // destello nítido justo en el filo exterior (borde de ataque)
            cx.globalAlpha = k;
            cx.strokeStyle = "#fff7e0";
            cx.lineWidth = 1.6;
            cx.beginPath();
            for (let i = 0; i <= nP; i++) {
              const t2 = i / nP;
              const ang = f.dir - sweep / 2 + t2 * sweep;
              const w = Math.sin(t2 * Math.PI) * grosor;
              const rx = f.x + Math.cos(ang) * (f.r + w * 0.35);
              const ry = f.y + Math.sin(ang) * (f.r + w * 0.35);
              if (i === 0) cx.moveTo(rx, ry);
              else cx.lineTo(rx, ry);
            }
            cx.stroke();
            cx.restore();
          } else if (f.tipo === "estocada") {
            // Puñalada (pícaro, ver fxEstocada en render/effects.js): una
            // línea recta que dispara hacia delante y se afina en ambas
            // puntas -- sin el barrido angular de "tajo" (arriba), una
            // estocada no gira alrededor del personaje, avanza en línea
            // recta desde la mano hasta la punta de la hoja.
            const grosorE = 3 + f.r * 0.02;
            cx.save();
            cx.translate(f.x, f.y);
            cx.rotate(f.dir);
            cx.filter = "blur(1px)"; // mismo desenfoque suave que "tajo", más estela que destello
            cx.globalAlpha = k; // antes k*k -- se queda un poco más visible
            cx.beginPath();
            cx.moveTo(f.r * 0.15, 0);
            cx.quadraticCurveTo(f.r * 0.55, -grosorE, f.r, 0);
            cx.quadraticCurveTo(f.r * 0.55, grosorE, f.r * 0.15, 0);
            cx.closePath();
            const gradE = cx.createLinearGradient(f.r * 0.15, 0, f.r, 0);
            gradE.addColorStop(0, "rgba(255,255,255,0)");
            gradE.addColorStop(0.6, "rgba(255,255,255,.95)");
            gradE.addColorStop(1, "rgba(200,80,95,.25)");
            cx.fillStyle = gradE;
            cx.fill();
            // destello nítido justo en la punta (donde clava la hoja)
            cx.strokeStyle = "#fff7e0";
            cx.lineWidth = 1.2;
            cx.beginPath();
            cx.moveTo(f.r * 0.5, 0);
            cx.lineTo(f.r, 0);
            cx.stroke();
            cx.restore();
          } else if (f.tipo === "viento") {
            // Corte de viento (pícaro al fallar, ver fxViento en
            // render/effects.js): misma silueta de hoja que "estocada"
            // pero pálida/fría (sin el tinte rojizo del impacto) y con
            // una segunda estela fina detrás, para que se lea como una
            // ráfaga de aire cortado en vez de una puñalada.
            const grosorV = 2.4 + f.r * 0.015;
            cx.save();
            cx.translate(f.x, f.y);
            cx.rotate(f.dir);
            cx.filter = "blur(1.6px)";
            cx.globalAlpha = k * 0.85;
            for (const off of [0, -5]) {
              cx.beginPath();
              cx.moveTo(f.r * 0.1, off);
              cx.quadraticCurveTo(f.r * 0.55, off - grosorV, f.r, off);
              cx.quadraticCurveTo(f.r * 0.55, off + grosorV, f.r * 0.1, off);
              cx.closePath();
              const gradV = cx.createLinearGradient(f.r * 0.1, 0, f.r, 0);
              gradV.addColorStop(0, "rgba(214,238,255,0)");
              gradV.addColorStop(0.55, "rgba(214,238,255,.65)");
              gradV.addColorStop(1, "rgba(255,255,255,.9)");
              cx.fillStyle = gradV;
              cx.fill();
            }
            cx.globalAlpha = k;
            cx.strokeStyle = "#eaf7ff";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(f.r * 0.5, 0);
            cx.lineTo(f.r, 0);
            cx.stroke();
            cx.restore();
          } else if (f.tipo === "sangre") {
            // Salpicadura de sangre real (ver fxSangre en render/effects.js
            // y SANGRE_ANIM en render/sprites.js) -- fotograma calculado por
            // tiempo transcurrido (f.t0-f.t), no por f.t directamente (que
            // cuenta hacia atrás y es lo que usa el resto de fx para su
            // propio fundido de opacidad, ver `k` arriba).
            const framesSangre = SANGRE_ANIM[f.variante];
            if (framesSangre && framesSangre.length) {
              const transcurrido = f.t0 - f.t;
              const fIdx = Math.min(
                framesSangre.length - 1,
                Math.max(0, Math.floor((transcurrido / f.t0) * framesSangre.length)),
              );
              const imgSangre = framesSangre[fIdx];
              cx.save();
              cx.translate(f.x, f.y);
              // el arte de origen salpica hacia ARRIBA por defecto (eje -Y
              // local) -- +90° alinea ese "arriba" con f.dir (0 = derecha,
              // mismo convenio que direccionDesdeAim en render/character.js).
              cx.rotate(f.dir + Math.PI / 2);
              if (f.flip) cx.scale(-1, 1);
              // se apaga solo en el último 20% de su vida -- el propio
              // splat de origen ya se dispersa en gotas hacia el final,
              // esto solo evita un corte brusco si el último fotograma no
              // queda del todo transparente
              cx.globalAlpha = k < 0.2 ? k / 0.2 : 1;
              const wSangre = imgSangre.width * f.escala, hSangre = imgSangre.height * f.escala;
              cx.drawImage(imgSangre, -wSangre / 2, -hSangre / 2, wSangre, hSangre);
              cx.globalAlpha = 1;
              cx.restore();
            }
          } else if (f.tipo === "impacto") {
            // Chispazo de impacto real (ver fxImpacto en render/effects.js y
            // IMPACT_VFX en render/sprites.js) -- simétrico, sin rotación ni
            // flip (a diferencia de "sangre"), centrado en el punto de golpe.
            const fIdxImpact = Math.min(
              IMPACT_VFX.length - 1,
              Math.max(0, Math.floor(((f.t0 - f.t) / f.t0) * IMPACT_VFX.length)),
            );
            const imgImpact = IMPACT_VFX[fIdxImpact];
            if (imgImpact) {
              cx.globalAlpha = k < 0.2 ? k / 0.2 : 1;
              cx.drawImage(imgImpact, f.x - imgImpact.width / 2, f.y - imgImpact.height / 2);
              cx.globalAlpha = 1;
            }
          } else if (f.tipo === "part") {
            f.x += f.vx * 0.016;
            f.y += f.vy * 0.016;
            cx.globalAlpha = k;
            cx.fillStyle = f.col;
            const tamP = f.tam || 4;
            cx.fillRect(f.x - tamP / 2, f.y - tamP / 2, tamP, tamP);
            cx.globalAlpha = 1;
          } else if (f.tipo === "jefeMuere") {
            // Colapso del Guardián de Hielo: el enemigo ya se quitó de
            // G.enemigos al instante (como cualquier otro, ver matarEnemigo
            // en systems/combat.js) -- este fx de un solo disparo reutiliza
            // sus propios frames de muerte reales (FROST_GUARDIAN.death,
            // ver render/sprites.js) como una animación aparte en vez de
            // retrasar su desaparición/loot.
            const frames = FROST_GUARDIAN.death;
            if (frames.length) {
              const idx = Math.min(frames.length - 1, Math.floor((1 - k) * frames.length));
              const fr = frames[idx];
              if (fr) {
                cx.globalAlpha = k;
                // drawSpriteBottom, no el -fr.height*0.86 de antes: ese
                // offset era del loader "escenario fijo" viejo
                // (cargarFramesSueltos); cargarFramesSueltosTrim ya ancla
                // cada frame por su borde inferior real dentro del lienzo.
                drawSpriteBottom(fr, f.x, f.y);
                cx.globalAlpha = 1;
              }
            }
          } else if (f.tipo === "flechaLluvia") {
            // Lluvia de Flechas (ulti arquero, ver lanzarUlti() en
            // systems/abilities.js): sprite real de la flecha (SPR.flecha,
            // el mismo que el proyectil normal más arriba), cayendo desde
            // f.y0 hasta f.y1 según transcurre su propio tiempo de vida --
            // cada una nace/impacta en su momento propio, programado junto
            // al sonido real en abilities.js; esto solo la dibuja. Una
            // sombra en el punto de aterrizaje que crece según se acerca
            // vende la caída sin necesitar una trayectoria en arco.
            const caida = 1 - k;
            const yNow = f.y0 + (f.y1 - f.y0) * caida;
            cx.globalAlpha = 0.3 * caida;
            cx.fillStyle = "#0a0812";
            cx.beginPath();
            cx.ellipse(f.x, f.y1 + 2, 6 * caida, 2.5 * caida, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = Math.min(1, k * 4);
            if (SPR.flecha) {
              cx.save();
              cx.translate(f.x, yNow);
              cx.rotate(Math.PI / 2 + f.jitter);
              cx.drawImage(SPR.flecha, -11, -11, 22, 22);
              cx.restore();
            }
            cx.globalAlpha = 1;
          }
        }

        // La mira/reticle mezcla posiciones de mundo (p.x/p.y) con el
        // ratón (mouse.x/y, en espacio de pantalla) -- tiene que dibujarse
        // TODAVÍA dentro de la cámara/temblor para que ambas cuadren.
        renderMira();
        // A partir de aquí todo es espacio de pantalla puro: el clima
        // (lluvia/ceniza/niebla), el flash/fundido y el HUD deben quedarse
        // fijos en la pantalla en vez de desplazarse con la cámara -- por
        // eso el clima ya generaba sus partículas en coordenadas de
        // viewport (rnd(0,W) en core/loop.js), no de mundo.
        cx.restore();

        // ---- capa de clima ----
        if (G.escena === "torre") {
          if (G.clima === "lluvia" || G.clima === "tormenta") {
            cx.strokeStyle =
              G.clima === "tormenta"
                ? "rgba(160,190,230,.5)"
                : "rgba(140,170,210,.35)";
            cx.lineWidth = 1;
            cx.beginPath();
            for (const w2 of G.wx)
              if (w2.tipo === "gota") {
                cx.moveTo(w2.x, w2.y);
                cx.lineTo(w2.x + (w2.vx || 0) * 0.03, w2.y + w2.vy * 0.03);
              }
            cx.stroke();
          } else if (G.clima === "ceniza") {
            cx.fillStyle = "rgba(216,140,100,.55)";
            for (const w2 of G.wx)
              if (w2.tipo === "ceniza") {
                const drift = Math.sin(animGlobal * 1.5 + w2.fase) * 8;
                cx.fillRect(w2.x + drift - 1.5, w2.y - 1.5, 3, 3);
              }
            cx.fillStyle = "rgba(90,40,25,.08)";
            cx.fillRect(0, 0, W, H);
          }
          if (G.clima === "niebla") {
            const nb = cx.createRadialGradient(
              W / 2,
              H / 2,
              120,
              W / 2,
              H / 2,
              W * 0.62,
            );
            nb.addColorStop(0, "rgba(150,145,170,0)");
            nb.addColorStop(1, "rgba(150,145,170,.34)");
            cx.fillStyle = nb;
            cx.fillRect(0, 0, W, H);
            cx.fillStyle = "rgba(150,145,170,.1)";
            for (let k = 0; k < 3; k++) {
              const nx = ((animGlobal * 22 * (k + 1)) % (W + 240)) - 120;
              cx.beginPath();
              cx.ellipse(nx, 110 + k * 150, 150, 42, 0, 0, TAU);
              cx.fill();
            }
          }
          if (G.flashT > 0) {
            cx.fillStyle = "rgba(230,240,255," + (G.flashT / 0.14) * 0.5 + ")";
            cx.fillRect(0, 0, W, H);
          }
          if (G.fadeT > 0) {
            cx.fillStyle = "rgba(6,5,10," + clamp(G.fadeT / 0.3, 0, 1) + ")";
            cx.fillRect(0, 0, W, H);
          }
        }

        renderHUD();
      }

