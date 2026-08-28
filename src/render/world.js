// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W, animGlobal, avanzarAnimGlobal, cx } from "../core/canvas.js";
import { ELEMENTOS, MAX_PLANTA, PILAR_ROTO_DUR, RAREZAS, SALA_H, SALA_W, SUPS } from "../core/constants.js";
import { G } from "../core/state.js";
import { renderHUD } from "./hud.js";
import { CAMPFIRE_CELDA, FIRE_COLUMN, FIREBALL_FH, FIREBALL_FRAMES, FIREBALL_FW, FIREBALL_SHEET, FROST_GUARDIAN, ICE_BURST, IMPACT_VFX, KENNEY_TILE, PILAR_HIELO_FRAMES, SANGRE_ANIM, SANGRE_DUR, SHEETS, SPR, assetOK, campfireFrame, iconoDrop, remateMuroPatron, wallPatron } from "./sprites.js";
import { drawSprite, drawSpriteBottom } from "./spriteDraw.js";
import { renderEnemigo, renderJugador, renderMira } from "./character.js";
import { clamp, hexRgba, ri, rnd } from "../utils/helpers.js";

export let sueloPat = null,
        sueloClave = "";

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
        cx.fillStyle = sueloPat;
        cx.fillRect(0, 0, SALA_W, SALA_H);
        cx.strokeStyle = "#3a3453";
        cx.lineWidth = 8;
        cx.strokeRect(10, 10, SALA_W - 20, SALA_H - 20);

        const wallPat = wallPatron();
        const rematePat = remateMuroPatron();
        for (const m of G.muros) {
          if (wallPat) {
            cx.fillStyle = wallPat;
            cx.fillRect(m.x, m.y, m.w, m.h);
            // remate (almenas) en el borde superior de los muros grandes:
            // el pack de sprites no trae piezas de esquina/borde por
            // bitmask (ver systems/floorgen.js), así que en vez de un
            // autotiling de 4/8 vecinos esto le da a cada rectángulo un
            // acabado "coronado" en vez de un corte plano. Se omite en
            // obstáculos pequeños (ej. los bloques de "columnas", 22px)
            // porque saturaría visualmente una pieza tan chica.
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
          if (SPR.escaleras) drawSprite(SPR.escaleras, po.x, po.y, false, 0.8);
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
          if (SPR.escalerasAbajo)
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
            const src = SHEETS["pilar"];
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
            if (!o.abierto) {
              cx.globalAlpha = 0.3 + Math.sin(animGlobal * 3) * 0.15;
              cx.fillStyle = "#e9b45c";
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
          const m = G.arenaNpc;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(209,84,92," + (0.9 - k * 0.28) + ")";
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
          cx.fillStyle = "#ff5c5c";
          cx.font = "700 13px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("⚔", m.x, m.y + 5);
          cx.fillStyle = "#d1545c";
          cx.font = "700 10px Alegreya Sans";
          cx.fillText("ARENA PvP — acércate", m.x, m.y + 34);
        }
        // Mesa de Trabajo / Yunque (lobby): desmantelar armas en Fragmentos
        // de Alma -- ver ui/workbench.js.
        if (G.yunqueNpc) {
          const m = G.yunqueNpc;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(201,163,90," + (0.9 - k * 0.28) + ")";
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
          cx.fillStyle = "#e9c98a";
          cx.font = "700 13px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("⚒", m.x, m.y + 5);
          cx.fillStyle = "#c9a35a";
          cx.font = "700 10px Alegreya Sans";
          cx.fillText("MESA DE TRABAJO — acércate", m.x, m.y + 34);
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

        // drops
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
            // ancho y luminoso cuanto mayor la rareza
            cx.shadowColor = col;
            cx.shadowBlur = (5 + rareza * 4) * pulso;
            const gCore = cx.createLinearGradient(dr.x, dr.y - beamH, dr.x, dr.y);
            gCore.addColorStop(0, "rgba(255,255,255,0)");
            gCore.addColorStop(0.6, hexRgba(col, 0.85));
            gCore.addColorStop(1, "#fff");
            cx.fillStyle = gCore;
            const anchoCore = 1.6 + rareza * 0.45; // más finito que antes (3+0.8·rar)
            cx.fillRect(dr.x - anchoCore / 2, dr.y - beamH, anchoCore, beamH);
            cx.restore();

            // hebras onduladas (solo épico+): dos cintas de energía que
            // suben en espiral junto al núcleo, como el vídeo de
            // referencia (Diablo 4, alijos míticos) -- un simple rayo recto
            // se queda corto para transmitir "esto es importante".
            if (rareza >= 2) {
              cx.save();
              for (let hebra = 0; hebra < 2; hebra++) {
                cx.beginPath();
                const nSeg = 14;
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

            cx.globalAlpha = 0.35;
            cx.fillStyle = col;
            cx.beginPath();
            cx.arc(dr.x, dr.y + bob, 14, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            drawSprite(iconoDrop(dr.item), dr.x, dr.y + bob);

            // etiqueta flotante con el nombre (épico+, para no saturar con
            // objetos comunes) -- mismo espíritu que las etiquetas
            // "Nombre (Ancestral)" del vídeo de referencia
            if (rareza >= 2) {
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
              const escBola = 0.45;
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

