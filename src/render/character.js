// Extraído de world.js (2026-08-19): dibujo de jugador/enemigos, separado
// del resto de world.js (suelo/muros/puertas/proyectiles/clima/HUD), que
// es lo que de verdad ha necesitado cambios repetidos en las últimas
// sesiones (sprites direccionales, anclaje de arma, espejo por clase...).
// world.js sigue llamando a renderJugador()/renderEnemigo()/renderMira()
// desde su render() -- son las únicas 3 funciones que necesita de aquí.
import { TAU, animGlobal, cx } from "../core/canvas.js";
import { ELEMENTOS, RAREZAS, SUPS } from "../core/constants.js";
import { G } from "../core/state.js";
import { fxParticulas } from "./effects.js";
import { drawSprite, drawSpriteBottom } from "./spriteDraw.js";
import { ARQUERO_BOW, ARQUERO_BOW_DUR, ATTACK_DUR, CONFIG_ARMA, DASH_ATTACK_DUR, ESC_FORMA, MIRA_IZQUIERDA_POR_DEFECTO, MOB_RUN, OFFHAND_IMG, OFFHAND_IMG_RAREZA, REAL_ATTACK, REAL_ATTACK_ANCLA, REAL_DASH, REAL_DASH_ANCLA, REAL_IDLE, REAL_IDLE_ANCLA, REAL_RUN, REAL_RUN_ANCLA, REAL_SPECIAL, REAL_SPECIAL_ANCLA, REAL_SPRITE_SCALE, SHEETS, SPECIAL_ATTACK_DUR, SPR, SPR_FORMAS, TAM_HEROE, WEAPON_IMG, WEAPON_IMG_RAREZA, assetOK, seleccionarImgEnemigo, spriteJugador } from "./sprites.js";
import { groundTarget } from "../systems/abilities.js";
import { masCercano } from "../systems/combat.js";
import { mouse } from "../systems/input.js";
import { JUICE } from "../systems/juice.js";
import { clamp, rnd } from "../utils/helpers.js";

// Reparte los 360° de puntería en 4 cuadrantes: abajo/arriba (cuando el
// componente vertical del aim domina) o lateral (el resto, espejado por
// izq/derecha como siempre). Mismo ángulo que ya usaba el espejo -- no es
// un valor nuevo, solo una lectura más fina de él.
function direccionDesdeAim(aim) {
  const ax = Math.cos(aim), ay = Math.sin(aim);
  return Math.abs(ay) > Math.abs(ax) ? (ay > 0 ? "down" : "up") : "side";
}

// Destello de impacto (ver systems/juice.js: aplicarFlash()) -- tiñe SOLO
// los píxeles opacos del SPRITE, respetando su silueta exacta. "source-atop"
// solo funciona así en un lienzo que contenga ÚNICAMENTE el sprite (resto
// transparente): aplicado directamente sobre el canvas del juego (`cx`) se
// pinta encima de TODO lo que ya hubiera ahí debajo -- suelo, muros...,
// que a esas alturas del frame ya está dibujado y es opaco en cualquier
// punto -- así que el relleno salía como un cuadro sólido cubriendo toda
// la caja del sprite en vez de recortarse a su forma (bug reportado: "cuadro
// blanco feo"). Se resuelve pintando el sprite + el tinte en un lienzo
// AUXILIAR aparte (transparente salvo el propio sprite) y componiendo SOLO
// ese resultado ya recortado sobre el juego con drawImage normal. Un único
// buffer reutilizado (se redimensiona si hace falta) -- los golpes no se
// solapan entre sí en el mismo frame lo bastante como para necesitar más
// de uno.
let _bufferTinte = null;
function tinteImpacto(img, x, y, flip, esc, col, alpha) {
  if (!img || alpha <= 0) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  if (!_bufferTinte) _bufferTinte = document.createElement("canvas");
  if (_bufferTinte.width !== iw || _bufferTinte.height !== ih) {
    _bufferTinte.width = iw;
    _bufferTinte.height = ih;
  }
  const bufCx = _bufferTinte.getContext("2d");
  bufCx.clearRect(0, 0, iw, ih);
  bufCx.drawImage(img, 0, 0, iw, ih);
  bufCx.globalCompositeOperation = "source-atop";
  bufCx.fillStyle = col;
  bufCx.fillRect(0, 0, iw, ih);
  cx.save();
  cx.translate(Math.round(x), Math.round(y));
  if (flip) cx.scale(-1, 1);
  cx.scale(esc || 1, esc || 1);
  cx.globalAlpha = alpha;
  cx.drawImage(_bufferTinte, -iw / 2, -ih / 2);
  cx.globalAlpha = 1;
  cx.restore();
}

function calcularPoseHeroe(p, x, yPies, mov) {
        const dirAim = direccionDesdeAim(p.aim);
        // Base: frame de idle del cuerpo real (ver REAL_IDLE en sprites.js) si ya
        // cargó; si no (arranque de la página, un instante), cae al icono
        // estático de siempre para no dejar un hueco en blanco.
        const idleFrames = REAL_IDLE[dirAim];
        const idleFrameIdx = (idleFrames && idleFrames.length) ? Math.floor(p.anim * 4) % idleFrames.length : -1;
        let img = idleFrameIdx >= 0 ? idleFrames[idleFrameIdx] : null;
        // Ataque real de esta clase para `dirAim`; si esa clase no tiene arte
        // para arriba/abajo todavía (mago/pícaro, ver REAL_ATTACK_SRC en
        // sprites.js) cae a la hoja lateral antes que no mostrar nada.
        const atkPorClase = REAL_ATTACK[p.rol] || {};
        const atkFrames = atkPorClase[dirAim] || atkPorClase.side;
        // Encarado a usar para ESTE frame: por defecto el de la puntería
        // (idle/ataque -- miras hacia donde apuntas). Correr es la
        // excepción -- encara hacia donde te MUEVES, no hacia donde
        // apuntas: si no, al esquivar/strafear (moverte en una dirección
        // distinta a tu puntería, algo habitual apuntando con el ratón) el
        // personaje "caminaba" mirando siempre al ratón aunque se
        // desplazara al lado contrario (bug reportado -- se nota mucho más
        // ahora que hay pose real por dirección, antes solo era un espejo
        // izq/der sutil).
        let dir = dirAim, anguloFacing = p.aim;
        // Ancla de mano de ESTE frame (ver REAL_IDLE_ANCLA/REAL_RUN_ANCLA/
        // REAL_ATTACK_ANCLA y cargarHojaFramesConAncla en sprites.js) --
        // null si esa hoja todavía no tiene datos para este frame, el
        // bloque "arma apuntando" (más abajo, mismo archivo) cae al pivote
        // fijo de siempre en ese caso. Por defecto la del frame de idle
        // base -- ataque/correr la reemplazan si aplican.
        let anclaLocal = idleFrameIdx >= 0 ? (REAL_IDLE_ANCLA[dirAim]?.[idleFrameIdx] || null) : null;
        // true solo cuando el frame de este tick sale de una hoja
        // ESPECÍFICA de clase (ataque/especial/dash, ver REAL_ATTACK/
        // REAL_SPECIAL/REAL_DASH) -- el cuerpo compartido de idle/correr
        // SIEMPRE mira a la derecha por defecto (convención guerrero/
        // pícaro) sea cual sea la clase, así que MIRA_IZQUIERDA_POR_DEFECTO
        // (pensada solo para el arte de ataque de arquero/mago, que sí mira
        // a la izquierda) no debe aplicarse fuera de estas ramas -- si no,
        // arquero/mago quedan espejados al revés en idle/correr (bug
        // reportado: "al caminar miran al lado opuesto").
        let usaArteClase = false;
        if (p.dashAtkT > 0) {
          // Estocada (dash-ataque nuevo, ver abilities.js: dashAtaque()):
          // hoja propia, encarada a la dirección de la embestida (no a la
          // puntería) -- mismo criterio que ya usa correr más abajo. Máxima
          // prioridad: si está en curso, tapa tanto el golpe normal como
          // correr/idle.
          anguloFacing = Math.atan2(p.dashAtkY, p.dashAtkX);
          dir = direccionDesdeAim(anguloFacing);
          usaArteClase = true;
          const dashFrames = REAL_DASH[p.rol]?.[dir];
          if (dashFrames && dashFrames.length) {
            const dur = DASH_ATTACK_DUR[p.rol] || 0.28;
            const prog = clamp(1 - p.dashAtkT / dur, 0, 0.999);
            const frameIdx = Math.floor(prog * dashFrames.length);
            const fr = dashFrames[frameIdx];
            if (fr) img = fr;
            const anclasDir = REAL_DASH_ANCLA[p.rol]?.[dir];
            anclaLocal = anclasDir ? anclasDir[frameIdx] : null;
          }
        } else if (p.swingT > 0 && atkFrames && atkFrames.length) {
          usaArteClase = true;
          // Golpe Colosal (combo a 4 pips, ver abilities.js: atacar()) usa la
          // hoja de "especial" del guerrero en vez de la básica cuando ya
          // cargó (p.atkEspecial, fijado en abilities.js) -- si todavía no
          // cargó, cae al golpe básico de siempre sin dejar un hueco visual.
          const especial = p.rol === "guerrero" && p.atkEspecial && REAL_SPECIAL.guerrero[dirAim]?.length;
          const framesGolpe = especial ? REAL_SPECIAL.guerrero[dirAim] : atkFrames;
          const dur = (especial && SPECIAL_ATTACK_DUR[p.rol]) || ATTACK_DUR[p.rol] || 0.2;
          const prog = clamp(1 - p.swingT / dur, 0, 0.999);
          const frameIdx = Math.floor(prog * framesGolpe.length);
          const fr = framesGolpe[frameIdx];
          if (fr) img = fr;
          const anclasDir = especial
            ? REAL_SPECIAL_ANCLA.guerrero[dirAim]
            : (REAL_ATTACK_ANCLA[p.rol]?.[dirAim] || REAL_ATTACK_ANCLA[p.rol]?.side);
          anclaLocal = anclasDir ? anclasDir[frameIdx] : null;
        } else if (mov && p.inp) {
          anguloFacing = Math.atan2(p.inp.my, p.inp.mx);
          dir = direccionDesdeAim(anguloFacing);
          const runFrames = REAL_RUN[dir];
          if (runFrames && runFrames.length) {
            const runFrameIdx = Math.floor(p.anim * 10) % runFrames.length;
            const fr = runFrames[runFrameIdx];
            if (fr) img = fr;
            anclaLocal = REAL_RUN_ANCLA[dir]?.[runFrameIdx] || null;
          }
        }
        // Espejo izq/derecha: solo tiene sentido en el bucket lateral (arriba/
        // abajo se dibujan de frente, sin voltear). Dentro de "side", el arte
        // de ATAQUE de arquero/mago mira a la izquierda por defecto (ver
        // MIRA_IZQUIERDA_POR_DEFECTO en sprites.js) -- se invierte la regla
        // normal para esas clases, pero SOLO cuando el frame viene de esa
        // hoja de clase (usaArteClase); el cuerpo compartido de idle/correr
        // no la necesita (ver comentario de usaArteClase más arriba).
        const flip = dir === "side" && (Math.cos(anguloFacing) < 0) !== (usaArteClase && !!MIRA_IZQUIERDA_POR_DEFECTO[p.rol]);
        // Convierte el ancla (espacio local del canvas TAM_HEROE x TAM_HEROE,
        // ver cargarHojaFramesConAncla) a coordenadas de mundo, mismo cálculo
        // que usa drawSpriteBottom() para colocar el propio sprite -- para
        // que el bloque "arma apuntando" (más abajo, mismo archivo) pueda
        // usarlo directamente como pivote sin repetir esta cuenta.
        const centroLocal = TAM_HEROE / 2;
        const ancla = anclaLocal
          ? {
              x: x + (flip ? -(anclaLocal.x - centroLocal) : (anclaLocal.x - centroLocal)),
              y: yPies - TAM_HEROE + anclaLocal.y,
            }
          : null;
        // `dir` sale junto al ancla (no solo ella) porque renderJugador()
        // lo necesita para decidir si el cuerpo se pinta antes o después
        // del arma -- de espaldas ("up") el arma debe quedar tapada por el
        // cuerpo, así que el cuerpo se dibuja el último; de frente/lateral
        // el orden de siempre (cuerpo, luego arma encima) sigue valiendo.
        return { img, flip, dir, ancla };
      }

      function dibujarCuerpoHeroe(p, img, x, yPies, flip) {
        if (img) {
          drawSpriteBottom(img, x, yPies, flip, REAL_SPRITE_SCALE[p.rol] || 1);
        } else {
          // Los assets reales todavía no cargaron (un instante, al arrancar):
          // icono estático de siempre, centrado -- no viene recolocado por
          // pies como los frames de arriba, así que se ancla como antes.
          drawSprite(spriteJugador(p), x, yPies - 6, flip, REAL_SPRITE_SCALE[p.rol] || 1);
        }
      }

export function renderMira() {
        if (!G || !G.activo || !G.players) return;
        for (const p of G.players) {
          if (p.ko) continue;
          if (p.ctrl.tipo === "kbm") {
            // mouse.x/y son coordenadas de PANTALLA; aquí se dibuja en
            // espacio de MUNDO (todavía dentro de la cámara, ver render()),
            // así que hay que sumar el desplazamiento de cámara primero.
            const camOf = G.cam || { x: 0, y: 0 };
            const mx = mouse.x + camOf.x,
              my = mouse.y + camOf.y;
            cx.strokeStyle = p.color;
            cx.globalAlpha = 0.22;
            cx.lineWidth = 1;
            cx.setLineDash([3, 5]);
            cx.beginPath();
            cx.moveTo(p.x, p.y);
            cx.lineTo(mx, my);
            cx.stroke();
            cx.setLineDash([]);
            cx.globalAlpha = 1;
            cx.strokeStyle = p.color;
            cx.lineWidth = 2;
            cx.beginPath();
            cx.moveTo(mx - 9, my);
            cx.lineTo(mx - 4, my);
            cx.moveTo(mx + 4, my);
            cx.lineTo(mx + 9, my);
            cx.moveTo(mx, my - 9);
            cx.lineTo(mx, my - 4);
            cx.moveTo(mx, my + 4);
            cx.lineTo(mx, my + 9);
            cx.stroke();
            const c2 = 6,
              o = 9;
            cx.beginPath();
            cx.moveTo(mx - o, my - o + c2);
            cx.lineTo(mx - o, my - o);
            cx.lineTo(mx - o + c2, my - o);
            cx.moveTo(mx + o - c2, my - o);
            cx.lineTo(mx + o, my - o);
            cx.lineTo(mx + o, my - o + c2);
            cx.moveTo(mx + o, my + o - c2);
            cx.lineTo(mx + o, my + o);
            cx.lineTo(mx + o - c2, my + o);
            cx.moveTo(mx - o + c2, my + o);
            cx.lineTo(mx - o, my + o);
            cx.lineTo(mx - o, my + o - c2);
            cx.lineWidth = 1.5;
            cx.stroke();
            cx.strokeStyle = "rgba(255,255,255,.75)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(mx, my, 3, 0, TAU);
            cx.stroke();
          } else if (p.ctrl.tipo === "pad") {
            const d = 44;
            const ax = p.x + Math.cos(p.aim) * d,
              ay = p.y + Math.sin(p.aim) * d;
            cx.strokeStyle = p.color;
            cx.globalAlpha = 0.18;
            cx.lineWidth = 1;
            cx.setLineDash([3, 5]);
            cx.beginPath();
            cx.moveTo(p.x, p.y);
            cx.lineTo(ax, ay);
            cx.stroke();
            cx.setLineDash([]);
            cx.globalAlpha = 0.9;
            cx.save();
            cx.translate(ax, ay);
            cx.rotate(p.aim);
            cx.fillStyle = p.color;
            cx.beginPath();
            cx.moveTo(6, 0);
            cx.lineTo(-4, -5);
            cx.lineTo(-1, 0);
            cx.lineTo(-4, 5);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "#141020";
            cx.lineWidth = 1;
            cx.stroke();
            cx.restore();
            cx.globalAlpha = 1;
          }
        }
      }

function dibujarCargaMago(p, tx, ty) {
        cx.fillStyle = ELEMENTOS[p.elemento].color;
        cx.beginPath();
        cx.arc(tx, ty, 4, 0, TAU);
        cx.fill();
        cx.fillStyle = "rgba(255,255,255,.55)";
        cx.beginPath();
        cx.arc(tx - 1.3, ty - 1.4, 1.3, 0, TAU);
        cx.fill();
        if (p.cargaT > 0) {
          const c = clamp(p.cargaT / 1.1, 0, 1);
          cx.fillStyle = "rgba(192,132,240,.3)";
          cx.beginPath();
          cx.arc(tx, ty, 4 + c * 11 + Math.sin(animGlobal * 20) * 1.5, 0, TAU);
          cx.fill();
          cx.fillStyle = "#c084f0";
          cx.beginPath();
          cx.arc(tx, ty, 3 + c * 8, 0, TAU);
          cx.fill();
          cx.fillStyle = "#e8d5ff";
          cx.beginPath();
          cx.arc(tx, ty, (3 + c * 8) * 0.45, 0, TAU);
          cx.fill();
          if (c >= 1) {
            cx.strokeStyle = "#fff";
            cx.globalAlpha = 0.5 + Math.sin(animGlobal * 22) * 0.4;
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(tx, ty, 4 + c * 11, 0, TAU);
            cx.stroke();
            cx.globalAlpha = 1;
          }
        }
      }

export function renderJugador(p) {
        const eq = p.equipo;

        if (p.ko) {
          cx.save();
          cx.translate(p.x, p.y);
          cx.rotate(Math.PI / 2);
          cx.globalAlpha = 0.55;
          cx.drawImage(spriteJugador(p), -21, -18);
          cx.restore();
          cx.globalAlpha = 1;
          cx.strokeStyle = "#7fd4c1";
          cx.lineWidth = 3;
          cx.beginPath();
          cx.arc(
            p.x,
            p.y - 26,
            12,
            -Math.PI / 2,
            -Math.PI / 2 + TAU * (p.reviveT / 2),
          );
          cx.stroke();
          cx.fillStyle = "#d1545c";
          cx.font = "800 11px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("✚ reanimar", p.x, p.y - 42);
          return;
        }

        for (const tr of p.trail) {
          cx.globalAlpha = (tr.t / 0.25) * 0.4;
          if (p.rol === "druida" && p.forma && p.forma !== "humano")
            drawSprite(
              SPR_FORMAS[p.forma],
              tr.x,
              tr.y - 4,
              Math.cos(p.aim) < 0,
              ESC_FORMA[p.forma],
            );
          else {
            const poseTr = calcularPoseHeroe(p, tr.x, tr.y, false);
            dibujarCuerpoHeroe(p, poseTr.img, tr.x, tr.y, poseTr.flip);
          }
        }
        cx.globalAlpha = 1;
        // celebración de subida de nivel: aura dorada expansiva + chispas ascendentes
        if (p.lvlT > 0) {
          const k = p.lvlT / 1.5;
          cx.strokeStyle = "#ffd27f";
          cx.globalAlpha = k * 0.9;
          cx.lineWidth = 3;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 22 + (1 - k) * 38, 0, TAU);
          cx.stroke();
          cx.strokeStyle = "#e9b45c";
          cx.globalAlpha = k * 0.5;
          cx.lineWidth = 1.5;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 14 + (1 - k) * 60, 0, TAU);
          cx.stroke();
          cx.globalAlpha = k;
          for (let s = 0; s < 6; s++) {
            const sa = (s / 6) * TAU + animGlobal * 2;
            const sy = p.y - 10 - (1 - k) * 44 - s * 4;
            cx.fillStyle = s % 2 ? "#ffd27f" : "#fff0c8";
            cx.fillRect(p.x + Math.cos(sa) * 16 - 1.5, sy - 1.5, 3, 3);
          }
          cx.globalAlpha = 1;
        }
        // atrapado en arenas: anillo de QTE + progreso de rescate
        if (p.atrapado) {
          cx.strokeStyle = "#c9a35a";
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 24, 0, TAU);
          cx.stroke();
          // ventana verde (0.60–0.85 del ciclo)
          cx.strokeStyle = "#7fd4c1";
          cx.lineWidth = 5;
          cx.beginPath();
          cx.arc(
            p.x,
            p.y - 4,
            24,
            -Math.PI / 2 + TAU * 0.6,
            -Math.PI / 2 + TAU * 0.85,
          );
          cx.stroke();
          // marcador giratorio
          const qa = -Math.PI / 2 + TAU * p.qteT;
          cx.fillStyle = "#e9e3d5";
          cx.beginPath();
          cx.arc(
            p.x + Math.cos(qa) * 24,
            p.y - 4 + Math.sin(qa) * 24,
            4,
            0,
            TAU,
          );
          cx.fill();
          for (let k = 0; k < 3; k++) {
            cx.fillStyle = k < p.qteHits ? "#7fd4c1" : "#3a3453";
            cx.fillRect(p.x - 12 + k * 10, p.y - 44, 7, 7);
          }
          if (p.rescT > 0) {
            cx.strokeStyle = "#e9b45c";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              p.x,
              p.y - 4,
              30,
              -Math.PI / 2,
              -Math.PI / 2 + TAU * (p.rescT / 1.2),
            );
            cx.stroke();
          }
          cx.fillStyle = "#c9a35a";
          cx.font = "800 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("⏳ esquive en verde o pide ayuda", p.x, p.y + 34);
        }
        // enraizado por telaraña
        if (p.rootT > 0) {
          cx.strokeStyle = "#e8e0d0";
          cx.globalAlpha = 0.7;
          cx.lineWidth = 1;
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * TAU + 0.4;
            cx.beginPath();
            cx.moveTo(p.x, p.y + 8);
            cx.lineTo(p.x + Math.cos(a) * 16, p.y + 8 + Math.sin(a) * 7);
            cx.stroke();
          }
          cx.globalAlpha = 1;
          cx.fillStyle = "#e8e0d0";
          cx.font = "700 9px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("esquive para romper", p.x, p.y + 30);
        }
        if (p.escudo > 0) {
          cx.strokeStyle = "rgba(143,184,232,.75)";
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 20, 0, TAU);
          cx.stroke();
        }
        if (p.hasteT > 0) {
          cx.fillStyle = "#e9b45c";
          cx.font = "800 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("»»", p.x + 14, p.y - 22);
        }
        if (p.golpeT > 0 && Math.floor(p.golpeT * 20) % 2 === 0)
          cx.globalAlpha = 0.4;
        const mov =
          Math.hypot(p.inp ? p.inp.mx : 0, p.inp ? p.inp.my : 0) > 0.1;
        const bob = Math.sin(p.anim * 8) * (mov ? 1.5 : 0.5);
        const flip = Math.cos(p.aim) < 0;
        const formaAnimal =
          p.rol === "druida" && p.forma && p.forma !== "humano";
        // Sombra de contacto en el suelo, justo bajo los pies (p.y -- el sprite
        // real ya se ancla exactamente ahí, ver drawSpriteBottom()/dibujarCuerpoHeroe()
        // y cargarHojaFrames() en sprites.js). Sin esto el personaje no tenía
        // ningún ancla visual al suelo y se notaba "flotando". FIJA en el
        // suelo, sin `bob` -- el rebote de idle/correr es del cuerpo, no del
        // suelo; si la sombra/aro también botan, se pierde la referencia fija
        // que hace que el rebote se lea como "el cuerpo sube y baja" en vez
        // de "todo el conjunto flota junto" (bug señalado tras el pase
        // anterior, que sí sumaba `bob` aquí).
        cx.fillStyle = "rgba(0,0,0,.35)";
        cx.beginPath();
        cx.ellipse(p.x, p.y + 2, p.r * 0.8, p.r * 0.3, 0, 0, TAU);
        cx.fill();
        // Anillo de color del jugador (identifica de un vistazo quién es
        // quién en cooperativo): antes vivía al principio de la función,
        // fijo en p.y+16 -- con el cuerpo heroB ya a su tamaño real esos
        // 16px lo dejaban muy por debajo de los pies de verdad, "flotando"
        // igual que le pasaba al arma. Movido aquí para compartir posición
        // exacta (mismo p.y+2, también fijo/sin bob) y tamaño (mismo p.r)
        // con la sombra real.
        cx.strokeStyle = p.color;
        cx.globalAlpha = 0.75;
        cx.lineWidth = 2;
        cx.beginPath();
        cx.ellipse(p.x, p.y + 2, p.r * 0.8 + 2, p.r * 0.3 + 1, 0, 0, TAU);
        cx.stroke();
        cx.globalAlpha = 1;
        // Ancla de mano y pose del frame (null si esa hoja no tiene el
        // slice todavía, o si es una forma animal de druida sin arma) -- las
        // usa el bloque "arma apuntando" más abajo, tanto para el pivote
        // como para decidir si el cuerpo se pinta antes o después del arma
        // (de espaldas el arma debe quedar tapada por el cuerpo -- ver
        // calcularPoseHeroe).
        let anclaMano = null;
        let poseHeroe = null;
        if (formaAnimal) {
          const esc2 = ESC_FORMA[p.forma];
          drawSprite(
            SPR_FORMAS[p.forma],
            p.x,
            p.y -
              4 +
              bob +
              (p.forma === "aguila"
                ? Math.sin(animGlobal * 4 + p.idx) * 3 - 4
                : 0),
            flip,
            esc2,
          );
          cx.strokeStyle = "#6ac04a";
          cx.globalAlpha = 0.35;
          cx.lineWidth = 1.5;
          cx.beginPath();
          cx.arc(p.x, p.y + 2, 17, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        } else {
          poseHeroe = calcularPoseHeroe(p, p.x, p.y + bob, mov);
          anclaMano = poseHeroe.ancla;
          // De espaldas ("up") el cuerpo se dibuja MÁS ABAJO, después del
          // arma (ver el `if (poseHeroe.dir === "up")` tras el bloque "arma
          // apuntando") -- así la silueta del cuerpo tapa la parte del arma
          // que quedaría oculta, en vez de dibujarla siempre encima.
          if (poseHeroe.dir !== "up") {
            dibujarCuerpoHeroe(p, poseHeroe.img, p.x, p.y + bob, poseHeroe.flip);
          }
        }
        cx.globalAlpha = 1;

        // accesorio: gema flotante sobre la cabeza
        if (eq.accesorio && !formaAnimal) {
          const gcol = RAREZAS[eq.accesorio.rareza].col;
          cx.save();
          cx.translate(p.x, p.y - 34 + Math.sin(animGlobal * 3 + p.idx) * 2);
          cx.rotate(animGlobal * 1.5);
          cx.fillStyle = gcol;
          cx.fillRect(-3, -3, 6, 6);
          cx.restore();
        }

        // arma apuntando: dibujo esquemático (pomo/hoja/arco/báculo…) que
        // sigue la puntería continua del jugador -- decisión del usuario:
        // el arma se dibuja 100% por código, en todo momento (idle/correr/
        // golpe), en vez de venir pintada a mano en cada frame de ataque.
        // El "golpe" lo vende el giro extra de más abajo (swingT), no un
        // frame de ataque con el arma incluida -- por eso los .aseprite de
        // ataque nuevos se están dejando sin arma dibujada (ver
        // REAL_ATTACK_SRC en sprites.js). Si algún frame de ataque TODAVÍA
        // trae el arma a mano (caso conocido: guerrero arriba, "Guerrero
        // atque superior"), saldrá duplicada hasta que se limpie ese
        // archivo en origen -- no se intenta ocultar por código.
        const wcol = eq.arma ? RAREZAS[eq.arma.rareza].col : null;
        // Calibración del arma (escala/pivote/bamboleo) centralizada en
        // CONFIG_ARMA (sprites.js) -- sin ancla real (ver más abajo) es el
        // único sitio que tocar para recalibrar. No hay forma de derivar el
        // punto de la mano del arte de origen: los .aseprite de este pack
        // no separan cuerpo/arma en capas limpias (comprobado con
        // --list-layers -- nombres genéricos "Layer 2/3/4", varios
        // aplanados a una sola capa), así que sigue calibrado a ojo contra
        // el cuerpo real hasta que la punta del arma quede pegada a la
        // mano. Compartida con el orbe de carga del mago (más abajo) para
        // que ambos midan igual.
        if (!formaAnimal) {
          cx.save();
          if (anclaMano) {
            // Ancla real de este frame (slice "ancla_mano" en Aseprite, ver
            // REAL_ATTACK_ANCLA/cargarHojaFramesConAncla en sprites.js): la
            // mano ya se mueve por el frame del golpe, pero dejar la hoja
            // clavada en el ángulo de puntería TODO el golpe (sin ningún
            // giro propio) se notaba rígida y "sin peso" -- se le suma un
            // arco de seguimiento más suave que el bamboleo de fallback de
            // abajo (multiplicadorAncla en vez de multiplicador: la propia
            // mano ya aporta parte del movimiento, no hace falta el giro
            // completo). Mismo criterio de duración que el fallback: usa
            // SPECIAL_ATTACK_DUR si el golpe en curso es el Golpe Colosal
            // (p.atkEspecial), si no ATTACK_DUR de la clase -- sin esto el
            // arco iba desacompasado del frame real en los Golpes Colosales
            // (duran 0.26s, no los 0.22s de ATTACK_DUR.guerrero).
            cx.translate(anclaMano.x, anclaMano.y);
            const { multiplicadorAncla, duracionPorDefecto, sinBamboleo } = CONFIG_ARMA.bamboleo;
            const especialActivo = p.rol === "guerrero" && p.atkEspecial && SPECIAL_ATTACK_DUR[p.rol];
            const durAncla = (especialActivo && SPECIAL_ATTACK_DUR[p.rol]) || ATTACK_DUR[p.rol] || duracionPorDefecto;
            const swingAncla = (p.swingT > 0 && !sinBamboleo.has(p.rol))
              ? (p.swingT / durAncla - 0.5) * multiplicadorAncla
              : 0;
            cx.rotate(p.aim + swingAncla);
          } else {
            cx.translate(p.x, p.y + 3);
            // El bamboleo de swing (giro extra tipo "espadazo") no pega con un
            // arco -- el arquero no gira el arma al atacar, tensa la cuerda (ver
            // ARQUERO_BOW más abajo) -- ni con un cetro que apunta y dispara,
            // el mago se queda quieto apuntando igual que el arquero, no
            // "espadea" (ver CONFIG_ARMA.bamboleo.sinBamboleo). Duración del
            // bamboleo tomada de ATTACK_DUR (por clase) en vez de un fijo
            // pensado solo para guerrero -- con picaro (0.1s) o mago (0.25s)
            // un fijo desincronizaba el giro del golpe real, dando un arma
            // que se notaba "flotando"/errática en vez de un giro limpio de
            // principio a fin del golpe. Este pivote fijo + bamboleo es el
            // fallback para hojas sin "ancla_mano" todavía -- ver el
            // `if (anclaMano)` de arriba.
            const { multiplicador, duracionPorDefecto, sinBamboleo } = CONFIG_ARMA.bamboleo;
            const dur = ATTACK_DUR[p.rol] || duracionPorDefecto;
            cx.rotate(p.aim + (p.swingT > 0 && !sinBamboleo.has(p.rol) ? (p.swingT / dur - 0.5) * multiplicador : 0));
          }
          // Estocada (ver CONFIG_ARMA.estocada en sprites.js): pícaro
          // apuñala desplazando el arma hacia delante y recogiéndola, en
          // vez del giro de espadazo (ya desactivado para esta clase vía
          // sinBamboleo, arriba) -- traslada en el eje X LOCAL, que tras el
          // rotate() de arriba ya apunta en la dirección de la puntería,
          // así que funciona igual con ancla real o con el pivote fijo.
          if (p.swingT > 0 && CONFIG_ARMA.estocada.clases.has(p.rol)) {
            const durEst = ATTACK_DUR[p.rol] || CONFIG_ARMA.bamboleo.duracionPorDefecto;
            const progEst = clamp(1 - p.swingT / durEst, 0, 1);
            cx.translate(Math.sin(progEst * Math.PI) * CONFIG_ARMA.estocada.distancia, 0);
          }
          cx.scale(CONFIG_ARMA.escala, CONFIG_ARMA.escala);
          const rarezaArma = eq.arma ? eq.arma.rareza : 0;
          if (rarezaArma >= 1 && wcol) {
            cx.shadowColor = wcol;
            cx.shadowBlur = 3 + rarezaArma * 2;
          }
          if (p.rol === "arquero") {
            // Arco real de 3 frames (relajado/medio tensado/tensado del todo,
            // ver ARQUERO_BOW en sprites.js): en reposo se queda relajado; al
            // atacar (p.swingT cuenta atrás desde ARQUERO_BOW_DUR) avanza por
            // los 3 frames tensando la cuerda, en vez de sprite fijo o del
            // giro de "hoja" que no pega con un arco. Se sostiene con el eje
            // perpendicular a la puntería (igual que el dibujo esquemático de
            // antes, arc(bx,0,br,...) en vertical), sin el giro de 90° ni el
            // desplazamiento hacia delante que sí necesitan las armas de hoja.
            const frames = ARQUERO_BOW[rarezaArma] || ARQUERO_BOW[0];
            if (frames && frames.length) {
              const prog = p.swingT > 0 ? clamp(1 - p.swingT / ARQUERO_BOW_DUR, 0, 0.999) : 0;
              const fr = frames[Math.floor(prog * frames.length)] || frames[0];
              const ww0 = fr.naturalWidth || fr.width, wh0 = fr.naturalHeight || fr.height;
              const s2 = 22 / Math.max(ww0, wh0);
              cx.drawImage(fr, 8 - (ww0 * s2) / 2, -(wh0 * s2) / 2, ww0 * s2, wh0 * s2);
            }
            cx.shadowBlur = 0;
          } else {
            // Sprite real (ver WEAPON_IMG/WEAPON_IMG_RAREZA en sprites.js), recorte
            // individual limpio por clase (espada/dagas/varita/maza/báculo),
            // recoloreado según la rareza del arma equipada (mismo color que
            // RAREZAS[].col usa en el resto de la UI) + un halo a partir de Raro.
            // Reutiliza el pivote mano->punta que ya montaba el dibujo
            // esquemático de abajo (CONFIG_ARMA.grip ~ empuñadura,
            // CONFIG_ARMA.reach ~ alcance de la hoja) para que encaje con
            // puntería/swing.
            const wimg = (WEAPON_IMG_RAREZA[p.rol] && WEAPON_IMG_RAREZA[p.rol][rarezaArma]) || WEAPON_IMG[p.rol];
            if (wimg) {
              const ww0 = wimg.naturalWidth || wimg.width, wh0 = wimg.naturalHeight || wimg.height;
              const { grip: GRIP, reach: REACH } = CONFIG_ARMA;
              // GRIP sigue marcando el tamaño real de la hoja (REACH-GRIP =
              // longitud empuñadura->punta, no cambia según haya ancla o
              // no) -- pero el DESPLAZAMIENTO de dibujo solo hace falta
              // cuando el pivote es el fallback fijo (p.x,p.y+3, que no es
              // la mano de verdad, así que hay que empujar la espada hacia
              // fuera para que se vea sujeta). Con ancla real (anclaMano)
              // el pivote YA ES la mano marcada en Aseprite -- empujar
              // GRIP px más allá dejaba el mango separado de la mano en
              // vez de sujeto desde ahí, que es justo lo que se pidió.
              const s = (REACH - GRIP) / Math.max(ww0, wh0);
              const ww = ww0 * s, wh = wh0 * s;
              const gripDibujo = anclaMano ? 0 : GRIP;
              // El pack "wood-weapons" no es consistente en cómo recortó cada
              // pieza: espada/daga/maza/báculo vienen en vertical (más alto
              // que ancho, punta arriba -- p.ej. sword-wood.png 10x41), pero
              // magic-wood.png (mago) viene ya en horizontal, 29x10, apuntando
              // a la derecha. Con el giro de 90° fijo de antes, el báculo del
              // mago quedaba apuntando hacia abajo en vez de hacia la
              // puntería. Se detecta la orientación de origen por su propio
              // aspect ratio en vez de asumir "todas vienen en vertical".
              cx.translate(gripDibujo, 0);
              if (ww0 >= wh0) {
                cx.drawImage(wimg, 0, -wh / 2, ww, wh);
              } else {
                cx.rotate(Math.PI / 2);
                cx.drawImage(wimg, -ww / 2, -wh, ww, wh);
              }
            } else if (p.rol === "guerrero") {
            // espada larga: pomo, empuñadura, guarda cruzada y hoja biselada con filo
            cx.fillStyle = "#4a3624";
            cx.fillRect(3, -2, 6, 4);
            cx.fillStyle = "#6b4a2b";
            cx.beginPath();
            cx.arc(3, 0, 2.6, 0, TAU);
            cx.fill();
            cx.fillStyle = "#e9b45c";
            cx.fillRect(9, -5, 3, 10);
            const blade = wcol || "#c9ccd6";
            cx.fillStyle = blade;
            cx.beginPath();
            cx.moveTo(12, -2.8);
            cx.lineTo(27, -1.4);
            cx.lineTo(31, 0);
            cx.lineTo(27, 1.4);
            cx.lineTo(12, 2.8);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "rgba(255,255,255,.4)";
            cx.lineWidth = 0.8;
            cx.beginPath();
            cx.moveTo(13, 0);
            cx.lineTo(28, 0);
            cx.stroke();
            cx.strokeStyle = "rgba(0,0,0,.25)";
            cx.lineWidth = 0.6;
            cx.beginPath();
            cx.moveTo(12, -2.6);
            cx.lineTo(27, -1.3);
            cx.moveTo(12, 2.6);
            cx.lineTo(27, 1.3);
            cx.stroke();
          } else if (p.rol === "arquero") {
            // arco recurvo con puños de cuero, muescas y cuerda tensa
            const bx = 11,
              br = 10;
            cx.strokeStyle = wcol || "#8a6b43";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(bx, 0, br, -1.15, 1.15);
            cx.stroke();
            cx.strokeStyle = "rgba(255,255,255,.3)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(bx, 0, br, -1.02, 1.02);
            cx.stroke();
            cx.fillStyle = "#3a2a1a";
            cx.fillRect(bx - 2, -2.4, 3.5, 4.8);
            const tAx = bx + Math.cos(-1.15) * br,
              tAy = Math.sin(-1.15) * br;
            const tBx = bx + Math.cos(1.15) * br,
              tBy = Math.sin(1.15) * br;
            cx.fillStyle = "#2a1f14";
            cx.beginPath();
            cx.arc(tAx, tAy, 1.6, 0, TAU);
            cx.fill();
            cx.beginPath();
            cx.arc(tBx, tBy, 1.6, 0, TAU);
            cx.fill();
            cx.strokeStyle = "#e9e3d5";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(tAx, tAy);
            cx.lineTo(bx + 2, 0);
            cx.lineTo(tBx, tBy);
            cx.stroke();
          } else if (p.rol === "mago") {
            // cetro con bandas de envoltura y garra metálica sosteniendo la gema
            cx.fillStyle = wcol || "#5c4d99";
            cx.beginPath();
            cx.moveTo(8, -1.8);
            cx.lineTo(23, -1.3);
            cx.lineTo(23, 1.3);
            cx.lineTo(8, 1.8);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "rgba(0,0,0,.3)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(13, -1.6);
            cx.lineTo(13, 1.6);
            cx.moveTo(18, -1.4);
            cx.lineTo(18, 1.4);
            cx.stroke();
            cx.strokeStyle = "#3a3453";
            cx.lineWidth = 1.6;
            cx.beginPath();
            cx.moveTo(21, -3);
            cx.quadraticCurveTo(26, -6.5, 29, -2);
            cx.stroke();
            cx.beginPath();
            cx.moveTo(21, 3);
            cx.quadraticCurveTo(26, 6.5, 29, 2);
            cx.stroke();
          } else if (p.rol === "picaro") {
            // par de dagas con guarda, empuñadura envuelta y hoja afilada
            // (poco recorrido vertical: a esta escala, subir demasiado la
            // daga alta choca con la capucha puntiaguda del sprite)
            cx.fillStyle = "#3a2a1a";
            cx.fillRect(6, -4.6, 4, 2.2);
            cx.fillRect(6, 1.6, 4, 2.2);
            cx.fillStyle = "#8a4a5a";
            cx.fillRect(9.5, -5.2, 2, 4);
            cx.fillRect(9.5, 1, 2, 4);
            cx.fillStyle = wcol || "#b8bcc9";
            for (const yo of [-3.9, 2.3]) {
              cx.beginPath();
              cx.moveTo(11.5, yo - 1.5);
              cx.lineTo(19, yo - 0.7);
              cx.lineTo(21.5, yo);
              cx.lineTo(19, yo + 0.7);
              cx.lineTo(11.5, yo + 1.5);
              cx.closePath();
              cx.fill();
            }
            cx.strokeStyle = "rgba(255,255,255,.35)";
            cx.lineWidth = 0.6;
            cx.beginPath();
            cx.moveTo(12, -3.9);
            cx.lineTo(19, -3.9);
            cx.moveTo(12, 2.3);
            cx.lineTo(19, 2.3);
            cx.stroke();
          } else if (p.rol === "druida") {
            // bastón nudoso envuelto en enredadera con racimo de hojas en la punta
            cx.fillStyle = wcol || "#8a6b43";
            cx.beginPath();
            cx.moveTo(8, -1.6);
            cx.lineTo(22, -1.1);
            cx.lineTo(22, 1.1);
            cx.lineTo(8, 1.6);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "#6ac04a";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(11, -1.5);
            cx.quadraticCurveTo(13, 1.7, 15, -1.4);
            cx.quadraticCurveTo(17, 1.7, 19, -1.3);
            cx.stroke();
            cx.fillStyle = "#6ac04a";
            const hojas = [
              [24, -3, -0.6],
              [26.5, 0, 0],
              [24, 3, 0.6],
            ];
            for (let hi = 0; hi < 3; hi++) {
              const lx = hojas[hi][0],
                ly = hojas[hi][1],
                lr = hojas[hi][2];
              cx.save();
              cx.translate(lx, ly);
              cx.rotate(lr);
              cx.beginPath();
              cx.ellipse(0, 0, 4, 2, 0, 0, TAU);
              cx.fill();
              cx.restore();
            }
          } else {
            // clérigo: cetro sagrado con cabeza de cruz radiante
            cx.fillStyle = wcol || "#8b8474";
            cx.beginPath();
            cx.moveTo(8, -1.6);
            cx.lineTo(20, -1.2);
            cx.lineTo(20, 1.2);
            cx.lineTo(8, 1.6);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "rgba(201,163,90,.5)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(26, 0, 7, 0, TAU);
            cx.stroke();
            cx.fillStyle = "#ffe6a3";
            cx.beginPath();
            cx.arc(26, 0, 5, 0, TAU);
            cx.fill();
            cx.strokeStyle = "#c9a35a";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(26, 0, 5, 0, TAU);
            cx.stroke();
            cx.fillStyle = "#fff7e0";
            cx.fillRect(25, -4, 2, 8);
            cx.fillRect(23, -1, 6, 2);
          }
          cx.shadowBlur = 0;
          }
          cx.restore();
        }
        // De espaldas el cuerpo se dibuja aquí, DESPUÉS del arma (en vez de
        // arriba junto al resto del cuerpo) para que la silueta lo tape --
        // ver el comentario en calcularPoseHeroe()/la asignación de
        // anclaMano más arriba.
        if (poseHeroe && poseHeroe.dir === "up") {
          dibujarCuerpoHeroe(p, poseHeroe.img, p.x, p.y + bob, poseHeroe.flip);
        }

        // Orbe de carga del mago: efecto de gameplay (no una hoja física),
        // independiente de si la capa esquemática de arriba está activa --
        // tiene que seguir viéndose durante el golpe (cuando esa capa se
        // apaga porque el báculo ya viene en el frame de REAL_ATTACK) igual
        // que en reposo. Mismo pivote/escala que usaba la capa esquemática
        // para que no salte de sitio al activarse/desactivarse esa capa.
        if (!formaAnimal && p.rol === "mago") {
          cx.save();
          cx.translate(p.x, p.y + 3);
          cx.rotate(p.aim);
          cx.scale(CONFIG_ARMA.escala, CONFIG_ARMA.escala);
          dibujarCargaMago(p, 26, 0);
          cx.restore();
        }

        // Mano secundaria (ver OFFHAND_IMG/OFFHAND_IMG_RAREZA en sprites.js):
        // escudo/libro, no gira con la puntería ni el swing -- se lleva pegada
        // al cuerpo, en el lado contrario a la mano del arma (que sí sigue la
        // puntería), volteándose solo con el mismo flip del propio personaje.
        // Comparte tier de rareza con el arma principal (mismo equipo).
        const oimg = !formaAnimal
          && ((OFFHAND_IMG_RAREZA[p.rol] && OFFHAND_IMG_RAREZA[p.rol][eq.arma ? eq.arma.rareza : 0]) || OFFHAND_IMG[p.rol]);
        if (oimg) {
          const ow0 = oimg.naturalWidth || oimg.width, oh0 = oimg.naturalHeight || oimg.height;
          const so = CONFIG_ARMA.offTam / Math.max(ow0, oh0);
          const ow = ow0 * so, oh = oh0 * so;
          cx.save();
          cx.translate(p.x, p.y - 2);
          if (flip) cx.scale(-1, 1);
          cx.drawImage(oimg, -6 - ow / 2, -oh / 2, ow, oh);
          cx.restore();
        }

        // parry activo: se dibuja por encima del cuerpo y del arma para que
        // nunca quede tapado por el sprite (antes se pintaba antes del
        // cuerpo y el propio personaje lo ocultaba casi por completo)
        if (p.parryT > 0) {
          const parryPulso = 0.75 + Math.sin(animGlobal * 24) * 0.25;
          cx.strokeStyle = "#e9b45c";
          cx.lineWidth = 3.5;
          cx.globalAlpha = parryPulso;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 24, p.aim - 1.1, p.aim + 1.1);
          cx.stroke();
          cx.strokeStyle = "#fff0c8";
          cx.lineWidth = 1.2;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 24, p.aim - 1.1, p.aim + 1.1);
          cx.stroke();
          cx.globalAlpha = 1;
        }

        // retícula de suelo (ulti del mago / sanación del clérigo / zarzas del druida humano)
        if (
          p.rol === "mago" ||
          p.rol === "clerigo" ||
          (p.rol === "druida" && p.forma === "humano")
        ) {
          const maxR = p.rol === "mago" ? 300 : p.rol === "druida" ? 280 : 240;
          const g = groundTarget(p, maxR);
          const col =
            p.rol === "mago"
              ? ELEMENTOS[p.elemento].color
              : p.rol === "druida"
                ? ELEMENTOS.zarzas.color
                : SUPS[0].color;
          const radUlti =
            p.rol === "mago"
              ? p.elemento === "fuego"
                ? 95
                : p.elemento === "hielo"
                  ? 110
                  : 90
              : p.rol === "druida"
                ? 100
                : 64;
          cx.strokeStyle = col;
          cx.globalAlpha = 0.45;
          cx.lineWidth = 1.5;
          cx.setLineDash([4, 4]);
          cx.beginPath();
          cx.arc(g.x, g.y, radUlti, 0, TAU);
          cx.stroke();
          cx.setLineDash([]);
          cx.globalAlpha = 1;
        }
        // etiqueta
        cx.fillStyle = p.color;
        cx.font = "700 10px Alegreya Sans";
        cx.textAlign = "center";
        cx.fillText(p.nombre, p.x, p.y - 38);
        // combo del guerrero: 4 pips que llenan el Golpe Colosal
        if (p.rol === "guerrero" && p.combo > 0) {
          for (let k = 0; k < 4; k++) {
            cx.fillStyle = k < p.combo ? "#e9b45c" : "#2a2440";
            cx.fillRect(p.x - 14 + k * 8, p.y - 50, 6, 4);
          }
          if (p.combo >= 4) {
            cx.strokeStyle = "#e9b45c";
            cx.globalAlpha = 0.5 + Math.sin(animGlobal * 12) * 0.4;
            cx.strokeRect(p.x - 15, p.y - 51, 32, 6);
            cx.globalAlpha = 1;
          }
        }
        // flecha certera lista
        if (p.rol === "arquero" && p.certera) {
          cx.fillStyle = "#ffd27f";
          cx.font = "800 11px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("🎯", p.x + 16, p.y - 42 + Math.sin(animGlobal * 6) * 2);
        }
        // chispa orbital del arma imbuida (sinergia elemental)
        if (p.imbuido && !p.ko) {
          const colIm = (ELEMENTOS[p.imbuido] || { color: "#fff" }).color;
          const oa = animGlobal * 5 + p.idx * 2;
          cx.fillStyle = colIm;
          cx.beginPath();
          cx.arc(
            p.x + Math.cos(oa) * 18,
            p.y - 6 + Math.sin(oa) * 9,
            2.6,
            0,
            TAU,
          );
          cx.fill();
          cx.globalAlpha = 0.4;
          cx.beginPath();
          cx.arc(
            p.x + Math.cos(oa - 0.5) * 18,
            p.y - 6 + Math.sin(oa - 0.5) * 9,
            1.6,
            0,
            TAU,
          );
          cx.fill();
          cx.globalAlpha = 1;
        }
      }

export function renderEnemigo(e) {
        // tragado por el portal arcano: remolino en su lugar
        if (e.portalT > 0) {
          const k = e.portalT / 0.7;
          cx.save();
          cx.translate(e.x, e.y);
          cx.rotate(animGlobal * 10);
          cx.strokeStyle = "#c084f0";
          cx.globalAlpha = 0.7;
          cx.lineWidth = 2;
          for (let j = 0; j < 3; j++) {
            cx.beginPath();
            cx.arc(0, 0, (6 + j * 7) * k, j * 2, j * 2 + 4);
            cx.stroke();
          }
          cx.restore();
          cx.globalAlpha = 1;
          return;
        }
        cx.fillStyle = "rgba(0,0,0,.35)";
        cx.beginPath();
        cx.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.8, e.r * 0.3, 0, 0, TAU);
        cx.fill();

        // muñeco de pruebas: sprite fijo + medidor de DPS
        if (e.dummy) {
          drawSprite(
            SPR.dummy,
            e.x,
            e.y - 2 + (e.hurtT > 0 ? rnd(-1.5, 1.5) : 0),
          );
          let dps = 0;
          for (const l of e.dmgLog) dps += l.d;
          dps = Math.round(dps / 5);
          cx.fillStyle = "#0d0b15";
          cx.fillRect(e.x - 30, e.y - e.r - 26, 60, 14);
          cx.strokeStyle = "#3a3453";
          cx.strokeRect(e.x - 30.5, e.y - e.r - 26.5, 61, 15);
          cx.fillStyle = dps > 0 ? "#e9b45c" : "#9a93ab";
          cx.font = "800 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText(dps + " DPS", e.x, e.y - e.r - 15);
          return;
        }

        let img,
          esc = 1;
        if (e.clonRol) {
          // reflejo oscuro de una clase del grupo
          img = SPR[e.clonRol];
          const obj2 = masCercano(e.x, e.y);
          const bob2 = Math.sin(animGlobal * 6 + e.x) * 1.5;
          if (e.hurtT > 0) cx.globalAlpha = 0.55;
          else cx.globalAlpha = 0.85;
          const flipClon = obj2 ? e.x > obj2.x : false;
          // vibración breve al recibir un golpe (mismo criterio que el
          // jitter de abajo para mobs normales, ver comentario ahí) -- le
          // da peso al impacto en vez de solo el tinte de color.
          const jitClon = e.hitFlashT > 0 ? rnd(-1.4, 1.4) : 0;
          drawSprite(img, e.x + jitClon, e.y - 4 + bob2, flipClon, 1);
          cx.globalAlpha = 1;
          if (e.hitFlashT > 0)
            tinteImpacto(img, e.x + jitClon, e.y - 4 + bob2, flipClon, 1, e.hitFlashCol, clamp(e.hitFlashT / JUICE.flash.dur, 0, 1));
          // velo oscuro
          cx.globalAlpha = 0.45;
          cx.fillStyle = "#1a0f2a";
          cx.beginPath();
          cx.arc(e.x, e.y - 4, 15, 0, TAU);
          cx.fill();
          cx.globalAlpha = 0.6;
          cx.strokeStyle = "#c084f0";
          cx.lineWidth = 1;
          cx.beginPath();
          cx.arc(e.x, e.y - 4, 16, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
          if (e.hp < e.hpMax) {
            cx.fillStyle = "#0d0b15";
            cx.fillRect(e.x - 13, e.y - e.r - 10, 26, 4);
            cx.fillStyle = "#c084f0";
            cx.fillRect(e.x - 13, e.y - e.r - 10, (26 * e.hp) / e.hpMax, 4);
          }
          return;
        }
        // JEFE SECRETO: El Magnate (sprite real)
        if (e.cerdo && assetOK("jefe_cerdo")) {
          const src = SHEETS["jefe_cerdo"];
          const bobc = Math.sin(animGlobal * 4 + e.x) * 2;
          const h = e.r * 3.4,
            w = (h * src.naturalWidth) / src.naturalHeight;
          cx.fillStyle = "rgba(0,0,0,.4)";
          cx.beginPath();
          cx.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.9, e.r * 0.32, 0, 0, TAU);
          cx.fill();
          cx.save();
          cx.imageSmoothingEnabled = false;
          const flipC = (masCercano(e.x, e.y) || { x: e.x }).x < e.x;
          cx.translate(e.x, e.y - e.r * 0.5 + bobc);
          if (flipC) cx.scale(-1, 1);
          if (e.hurtT > 0) {
            cx.globalAlpha = 0.7;
          }
          cx.drawImage(src, -w / 2, -h * 0.62, w, h);
          if (e.rushT > 0) {
            cx.globalCompositeOperation = "lighter";
            cx.globalAlpha = 0.3;
            cx.drawImage(src, -w / 2, -h * 0.62, w, h);
            cx.globalCompositeOperation = "source-over";
          }
          cx.restore();
          cx.globalAlpha = 1;
          // corona dorada de jefe
          drawSprite(SPR.corona, e.x, e.y - e.r * 2.1 + bobc);
          // barra de vida
          const w2 = 64;
          cx.fillStyle = "#0d0b15";
          cx.fillRect(e.x - w2 / 2, e.y - e.r * 2.3, w2, 5);
          cx.fillStyle = "#e9b45c";
          cx.fillRect(e.x - w2 / 2, e.y - e.r * 2.3, (w2 * e.hp) / e.hpMax, 5);
          cx.fillStyle = "#e9b45c";
          cx.font = "800 12px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("⭐ " + e.nombre + " ⭐", e.x, e.y - e.r * 2.5);
          return;
        }
        // Sprite/escala base (ver seleccionarImgEnemigo en render/sprites.js
        // -- compartido con fxDesintegrarEnemigo en render/effects.js para
        // que la nube de píxeles al morir use el mismo sprite que se
        // estaba dibujando).
        const sel = seleccionarImgEnemigo(e);
        img = sel.img;
        esc = sel.esc;
        const mobKey = sel.mobKey;
        // Animación de correr real (ver MOB_RUN en sprites.js): sustituye el
        // icono estático por un frame de la hoja Run del pack mientras haya
        // uno cargado para este tipo -- mismo mecanismo que calcularPoseHeroe()
        // con REAL_RUN, indexado por el reloj de animación en vez de p.anim
        // (los enemigos no llevan ese campo propio).
        if (mobKey && MOB_RUN[mobKey] && MOB_RUN[mobKey].length) {
          const frames = MOB_RUN[mobKey];
          const fr = frames[Math.floor(animGlobal * 8 + e.x * 0.05) % frames.length];
          // El frame real ya viene normalizado al tamaño de la hitbox (ver
          // MOB_R/FACTOR_SPRITE_HITBOX en sprites.js) -- los `esc` de arriba
          // estaban afinados a mano para el icono pequeño anterior, así que
          // aplicarlos aquí también volvería a desproporcionar el tamaño.
          // e.elite conserva un ligero extra (mismo criterio que su radio
          // real, r = tp.r+4) para que se note un poco más grande.
          if (fr) { img = fr; esc = e.elite ? 1.15 : 1; }
        }

        const obj = masCercano(e.x, e.y);
        const bob = Math.sin(animGlobal * 6 + e.x) * 1.5;
        // telegrafiado de carga del acechador
        if (e.telT > 0) {
          cx.strokeStyle = "#7ffce8";
          cx.globalAlpha = 0.5 + Math.sin(animGlobal * 20) * 0.3;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(e.x, e.y, e.r + 6, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        // anillo de mecha del bombardero
        if (e.fuseT >= 0 && e.fuseT < 1) {
          const k = 1 - e.fuseT / 0.7;
          cx.strokeStyle = "#ff5c5c";
          cx.globalAlpha = 0.4 + k * 0.4;
          cx.lineWidth = 2.5;
          cx.beginPath();
          cx.arc(e.x, e.y, 70 * k, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        {
          if (e.hurtT > 0) cx.globalAlpha = 0.55;
          const yMob =
            e.y -
            4 +
            bob +
            (e.ranged && e.tipo !== "caster"
              ? Math.sin(animGlobal * 3 + e.y) * 3
              : 0);
          const flipMob = obj ? e.x > obj.x : false;
          // vibración breve al recibir un golpe (dura lo mismo que el
          // tinte, JUICE.flash.dur ~60ms) -- el destello de color solo no
          // se notaba como IMPACTO, con un poco de temblor se lee mucho
          // más "con peso" sin tocar la física real (knockback/hit-stop,
          // que ya existen aparte, ver systems/juice.js).
          const jitMob = e.hitFlashT > 0 ? rnd(-1.6, 1.6) : 0;
          drawSprite(img, e.x + jitMob, yMob, flipMob, esc);
          cx.globalAlpha = 1;
          if (e.hitFlashT > 0)
            tinteImpacto(img, e.x + jitMob, yMob, flipMob, esc, e.hitFlashCol, clamp(e.hitFlashT / JUICE.flash.dur, 0, 1));
        }
        if (e.jefe)
          drawSprite(
            SPR.corona,
            e.x,
            e.y - 4 + bob - (img.height * esc) / 2 - 8,
          );
        if (e.mini) {
          cx.fillStyle = "#c084f0";
          cx.font = "800 12px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("◆ " + e.nombre + " ◆", e.x, e.y - e.r - 18);
        }
        if (e.rabioso) {
          cx.strokeStyle = "#ff5c5c";
          cx.globalAlpha = 0.4 + Math.sin(animGlobal * 10) * 0.25;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(e.x, e.y - 4, e.r + 8, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        if (e.stunT > 0) {
          cx.fillStyle = "#e9b45c";
          cx.font = "700 12px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("✦ ✦", e.x, e.y - e.r - 14);
        }
        if (e.poisonT > 0) {
          cx.fillStyle = "#6ac04a";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("☠", e.x + e.r + 5, e.y - e.r + 2);
        }
        if (e.burnT > 0) {
          cx.fillStyle = "#ff7d4d";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("🔥", e.x - e.r - 6, e.y - e.r + 2);
          if (Math.random() < 0.15)
            fxParticulas(e.x + rnd(-4, 4), e.y + rnd(-4, 4), 1, "#ff7d4d");
        }
        if (e.slowT > 0) {
          cx.strokeStyle = "#7fc9e8";
          cx.globalAlpha = 0.6;
          cx.lineWidth = 1.5;
          cx.beginPath();
          cx.arc(e.x, e.y + e.r * 0.6, e.r * 0.9, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        if (e.hp < e.hpMax) {
          const w2 = e.jefe ? 60 : e.elite ? 34 : 26;
          cx.fillStyle = "#0d0b15";
          cx.fillRect(e.x - w2 / 2, e.y - e.r - 10, w2, 4);
          cx.fillStyle = e.jefe ? "#c07be0" : "#d1545c";
          cx.fillRect(e.x - w2 / 2, e.y - e.r - 10, (w2 * e.hp) / e.hpMax, 4);
        }
      }
