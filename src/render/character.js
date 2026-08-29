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
import { ARQUERO_BOW, ARQUERO_BOW_DUR, ATTACK_DUR, CASCO_ATTACK, CASCO_HURT, CASCO_IDLE, CASCO_RUN, CONFIG_ARMA, DASH_ATTACK_DUR, DUMMY_HIT, ESC_FORMA, FROST_GUARDIAN, MARTILLO_FRHOR_IMG, MIRA_IZQUIERDA_POR_DEFECTO, MOB_RUN, MUERTE_DUR, OFFHAND_IMG, OFFHAND_IMG_RAREZA, PETO_ATTACK, PETO_HURT, PETO_IDLE, PETO_RUN, PIERNAS_ATTACK, PIERNAS_HURT, PIERNAS_IDLE, PIERNAS_RUN, REAL_ATTACK, REAL_ATTACK_ANCLA, REAL_DASH, REAL_DASH_ANCLA, REAL_HURT, REAL_IDLE, REAL_IDLE_ANCLA, REAL_MUERTE, REAL_RUN, REAL_RUN_ANCLA, REAL_SPECIAL, REAL_SPECIAL_ANCLA, REAL_SPRITE_SCALE, SHEETS, SPECIAL_ATTACK_DUR, SPR, SPR_FORMAS, TAM_HEROE, WEAPON_ART_POOL, WEAPON_IMG, WEAPON_IMG_RAREZA, armaHiltTip, assetOK, seleccionarImgEnemigo, spriteJugador } from "./sprites.js";
import { CARGA_ARQ_MAX, CARGA_ARQ_ZONA, CARGA_CUCH_MAX, CARGA_CUCH_ZONA, groundTarget } from "../systems/abilities.js";
import { masCercano } from "../systems/combat.js";
import { mouse } from "../systems/input.js";
import { JUICE } from "../systems/juice.js";
import { ENEMY_BAR, ENEMY_BAR_INTERIOR } from "./uiTiles.js";
import { clamp, hexRgba, rnd } from "../utils/helpers.js";

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
        // Capas de armadura equipable (casco/peto/piernas, ver CASCO_IDLE/
        // PETO_IDLE/PIERNAS_IDLE etc. en sprites.js): mismo frame/dirección
        // que el cuerpo en cada rama de abajo, para quedar pixel-alineadas --
        // `null` si esa animación todavía no tiene arte de armadura propio
        // (golpe especial, dash, muerte); dibujarCuerpoHeroe() simplemente no
        // dibuja la capa en ese caso, y p.equipo decide si se dibuja o no.
        let imgCasco = idleFrameIdx >= 0 ? (CASCO_IDLE[dirAim]?.[idleFrameIdx] || null) : null;
        let imgPeto = idleFrameIdx >= 0 ? (PETO_IDLE[dirAim]?.[idleFrameIdx] || null) : null;
        let imgPiernas = idleFrameIdx >= 0 ? (PIERNAS_IDLE[dirAim]?.[idleFrameIdx] || null) : null;
        // Ataque real de esta clase para `dirAim`; si esa clase no tiene arte
        // para arriba/abajo todavía (mago/pícaro, ver REAL_ATTACK_SRC en
        // sprites.js) cae a la hoja lateral antes que no mostrar nada.
        const atkPorClase = REAL_ATTACK[p.rol] || {};
        const atkFrames = atkPorClase[dirAim] || atkPorClase.side;
        const cascoAtkPorClase = CASCO_ATTACK[p.rol] || {};
        const petoAtkPorClase = PETO_ATTACK[p.rol] || {};
        const piernasAtkPorClase = PIERNAS_ATTACK[p.rol] || {};
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
        const especialPorClase = REAL_SPECIAL[p.rol] || {};
        const framesCast = especialPorClase[dirAim] || especialPorClase.side;
        if (p.castUltT > 0 && framesCast && framesCast.length) {
          // Casteo de la ulti (ver p.castUltT en core/gameflow.js/loop.js y
          // habilidad() en systems/abilities.js) -- máxima prioridad, igual
          // que la Estocada de abajo: mientras dura, tapa cualquier otra
          // pose (no debería solaparse con un golpe básico en curso, pero
          // por si acaso). Sin arte para arriba/abajo todavía (mago, ver
          // REAL_SPECIAL_SRC en sprites.js) -- cae a la hoja lateral antes
          // que no mostrar nada, mismo criterio que REAL_ATTACK arriba.
          usaArteClase = true;
          imgCasco = imgPeto = imgPiernas = null; // sin arte de armadura para esto todavía
          const dur = SPECIAL_ATTACK_DUR[p.rol] || 0.5;
          const prog = clamp(1 - p.castUltT / dur, 0, 0.999);
          const frameIdx = Math.floor(prog * framesCast.length);
          const fr = framesCast[frameIdx];
          if (fr) img = fr;
          const anclasDir = REAL_SPECIAL_ANCLA[p.rol]?.[dirAim];
          anclaLocal = anclasDir ? anclasDir[frameIdx] : null;
        } else if (p.dashAtkT > 0) {
          // Estocada (dash-ataque nuevo, ver abilities.js: dashAtaque()):
          // hoja propia, encarada a la dirección de la embestida (no a la
          // puntería) -- mismo criterio que ya usa correr más abajo. Máxima
          // prioridad: si está en curso, tapa tanto el golpe normal como
          // correr/idle.
          anguloFacing = Math.atan2(p.dashAtkY, p.dashAtkX);
          dir = direccionDesdeAim(anguloFacing);
          usaArteClase = true;
          // Sin arte de armadura para el dash-ataque todavía -- se oculta
          // mientras dura este estado en vez de arrastrar el frame de idle.
          imgCasco = imgPeto = imgPiernas = null;
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
        } else if (
          (p.swingT > 0 || (p.rol === "mago" && p.castCd > 0)) &&
          atkFrames &&
          atkFrames.length
        ) {
          usaArteClase = true;
          // Golpe Colosal (combo a 4 pips, ver abilities.js: atacar()) usa la
          // hoja de "especial" del guerrero en vez de la básica cuando ya
          // cargó (p.atkEspecial, fijado en abilities.js) -- si todavía no
          // cargó, cae al golpe básico de siempre sin dejar un hueco visual.
          const especial = p.rol === "guerrero" && p.atkEspecial && REAL_SPECIAL.guerrero[dirAim]?.length;
          const framesGolpe = especial ? REAL_SPECIAL.guerrero[dirAim] : atkFrames;
          const dur = (especial && SPECIAL_ATTACK_DUR[p.rol]) || ATTACK_DUR[p.rol] || 0.2;
          // Mago: castCd (0.45s) dura más que swingT/ATTACK_DUR (0.25s) --
          // sin esto, la animación "terminaba" antes de poder lanzar el
          // siguiente cast y el personaje volvía a idle un instante (con
          // ataque en spam se veía como un parpadeo). Se mantiene el último
          // frame mientras dure esa cola; si sigue atacando, el próximo
          // cast reinicia swingT y encadena limpio, si no, en cuanto
          // castCd llega a 0 esta rama deja de aplicar y cae a idle.
          const prog = p.swingT > 0 ? clamp(1 - p.swingT / dur, 0, 0.999) : 0.999;
          const frameIdx = Math.floor(prog * framesGolpe.length);
          const fr = framesGolpe[frameIdx];
          if (fr) img = fr;
          if (especial) {
            // El Golpe Colosal tampoco tiene arte de armadura propio todavía.
            imgCasco = imgPeto = imgPiernas = null;
          } else {
            const cascoFrames = cascoAtkPorClase[dirAim] || cascoAtkPorClase.side;
            const petoFrames = petoAtkPorClase[dirAim] || petoAtkPorClase.side;
            const piernasFrames = piernasAtkPorClase[dirAim] || piernasAtkPorClase.side;
            imgCasco = (cascoFrames && cascoFrames[frameIdx]) || null;
            imgPeto = (petoFrames && petoFrames[frameIdx]) || null;
            imgPiernas = (piernasFrames && piernasFrames[frameIdx]) || null;
          }
          const anclasDir = especial
            ? REAL_SPECIAL_ANCLA.guerrero[dirAim]
            : (REAL_ATTACK_ANCLA[p.rol]?.[dirAim] || REAL_ATTACK_ANCLA[p.rol]?.side);
          anclaLocal = anclasDir ? anclasDir[frameIdx] : null;
        } else if (p.cargaArqT > 0 && atkFrames && atkFrames.length) {
          // Arquero tensando el arco (p.cargaArqT, ver core/loop.js y
          // dispararFlechaCargada en systems/abilities.js) -- misma hoja de
          // ataque real (tensado progresivo, ver
          // Arquero-ataque lateral basico 01.aseprite) que el disparo
          // normal, pero el frame sale del progreso de CARGA en vez de
          // p.swingT: el personaje se ve tensar más cuanto más se
          // mantiene, no solo animarse en el instante de soltar.
          usaArteClase = true;
          const prog = clamp(p.cargaArqT / CARGA_ARQ_MAX, 0, 0.999);
          const frameIdx = Math.floor(prog * atkFrames.length);
          const fr = atkFrames[frameIdx];
          if (fr) img = fr;
          const cascoFrames = cascoAtkPorClase[dirAim] || cascoAtkPorClase.side;
          const petoFrames = petoAtkPorClase[dirAim] || petoAtkPorClase.side;
          const piernasFrames = piernasAtkPorClase[dirAim] || piernasAtkPorClase.side;
          imgCasco = (cascoFrames && cascoFrames[frameIdx]) || null;
          imgPeto = (petoFrames && petoFrames[frameIdx]) || null;
          imgPiernas = (piernasFrames && piernasFrames[frameIdx]) || null;
          const anclasDir = REAL_ATTACK_ANCLA[p.rol]?.[dirAim] || REAL_ATTACK_ANCLA[p.rol]?.side;
          anclaLocal = anclasDir ? anclasDir[frameIdx] : null;
        } else if (p.golpeT > 0 && REAL_HURT.length) {
          // Herido (flinch al recibir daño, ver p.golpeT en
          // systems/combat.js -- 0.25s, mismo valor aquí) -- solo si no hay
          // un golpe propio en curso (rama de swingT arriba tiene prioridad:
          // que te golpeen a mitad de tu propio ataque no debe cortar la
          // animación de ese ataque). Sin arte lateral/arriba todavía (ver
          // REAL_HURT en sprites.js) -- se fuerza "down" en vez de mirar
          // hacia donde apunta, es la única dirección que existe.
          dir = "down";
          const prog = clamp(1 - p.golpeT / 0.25, 0, 0.999);
          const frameIdx = Math.floor(prog * REAL_HURT.length);
          const fr = REAL_HURT[frameIdx];
          if (fr) img = fr;
          imgCasco = CASCO_HURT[frameIdx] || null;
          imgPeto = PETO_HURT[frameIdx] || null;
          imgPiernas = PIERNAS_HURT[frameIdx] || null;
        } else if (mov && p.inp) {
          anguloFacing = Math.atan2(p.inp.my, p.inp.mx);
          dir = direccionDesdeAim(anguloFacing);
          const runFrames = REAL_RUN[dir];
          if (runFrames && runFrames.length) {
            const runFrameIdx = Math.floor(p.anim * 10) % runFrames.length;
            const fr = runFrames[runFrameIdx];
            if (fr) img = fr;
            anclaLocal = REAL_RUN_ANCLA[dir]?.[runFrameIdx] || null;
            imgCasco = CASCO_RUN[dir]?.[runFrameIdx] || null;
            imgPeto = PETO_RUN[dir]?.[runFrameIdx] || null;
            imgPiernas = PIERNAS_RUN[dir]?.[runFrameIdx] || null;
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
        return { img, imgCasco, imgPeto, imgPiernas, flip, dir, ancla };
      }

      // `pose` es el objeto devuelto por calcularPoseHeroe() -- dibuja el
      // cuerpo y, ENCIMA (piernas -> peto -> casco, de más tapado a menos),
      // cada capa de armadura equipada (ver core/constants.js: SLOTS) que
      // tenga arte para este frame concreto (p.equipo.X truthy Y
      // pose.imgX no nulo -- ver calcularPoseHeroe, `null` en los estados
      // sin arte de armadura todavía). Equipar el peto sin el casco no
      // dibuja el casco, y viceversa: cada capa es independiente.
      function dibujarCuerpoHeroe(p, pose, x, yPies) {
        const { img, imgCasco, imgPeto, imgPiernas, flip } = pose;
        // Aura de la Senda Elemental (tecla C, ver systems/abilities.js):
        // pedido expreso de que sea "un aura con la forma del png del
        // sprite, tenue" en vez del pulso expansivo genérico que se veía
        // como ruido visual -- drop-shadow es alpha-aware, así que el halo
        // sale recortado a la silueta real del personaje sin necesidad de
        // dibujar una máscara aparte.
        const auraSenda = p.rol === "mago" && p.sendaT > 0;
        if (auraSenda) {
          const colAura = hexRgba(ELEMENTOS[p.elemento].color, 0.55);
          cx.filter = `drop-shadow(0 0 2px ${colAura}) drop-shadow(0 0 5px ${colAura})`;
        }
        if (img) {
          const esc = REAL_SPRITE_SCALE[p.rol] || 1;
          drawSpriteBottom(img, x, yPies, flip, esc);
          if (p.equipo.piernas && imgPiernas) drawSpriteBottom(imgPiernas, x, yPies, flip, esc);
          if (p.equipo.peto && imgPeto) drawSpriteBottom(imgPeto, x, yPies, flip, esc);
          if (p.equipo.casco && imgCasco) drawSpriteBottom(imgCasco, x, yPies, flip, esc);
        } else {
          // Los assets reales todavía no cargaron (un instante, al arrancar):
          // icono estático de siempre, centrado -- no viene recolocado por
          // pies como los frames de arriba, así que se ancla como antes.
          drawSprite(spriteJugador(p), x, yPies - 6, flip, REAL_SPRITE_SCALE[p.rol] || 1);
        }
        if (auraSenda) cx.filter = "none";
      }

// Preview animado en idle para overlays HTML (ver ui/inventory.js: la
// ficha de personaje) -- reutiliza calcularPoseHeroe() (pura, sin dibujar,
// no toca `cx`) para la MISMA selección de frame/dirección que el
// personaje real en el canvas de juego, pero dibuja sobre un contexto
// propio del overlay en vez del `cx` del juego: drawSprite/drawSpriteBottom
// (render/spriteDraw.js) están fijados a ese `cx` a propósito (primitivas
// compartidas con el resto del render real), así que aquí se hace el
// drawImage a mano en vez de tocarlas -- cero riesgo para el render real.
// `anim` es un reloj propio del overlay (ver iniciarRetratoAnimado en
// inventory.js), no p.anim -- ese se congela mientras G.pausa está activo
// (la ficha siempre pausa), así que reusarlo dejaría el preview estático.
export function renderRetratoIdle(ctx, p, w, h, anim) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  const pFalso = {
    ...p,
    // Retrato de perfil (lateral), no de espaldas -- aim=0 -> direccionDesdeAim
    // resuelve "side" mirando a la derecha (sin flip, cos(0)>0). Antes era
    // -PI/2 ("up", de espaldas): pedido expreso del usuario, se ve mejor el
    // personaje de perfil que la nuca.
    aim: 0,
    anim,
    inp: null,
    swingT: 0,
    dashAtkT: 0,
    cargaArqT: 0,
    golpeT: 0,
  };
  const { img, imgCasco, imgPeto, imgPiernas, flip } = calcularPoseHeroe(pFalso, 0, 0, false);
  if (!img) return;
  // El personaje real ocupa solo una fracción del cuadro TAM_HEROE (mucho
  // margen transparente alrededor, ver cargarHojaFramesConAncla en
  // sprites.js) -- en el canvas de juego eso se compensa con el zoom de la
  // cámara, que este preview aislado no tiene. Zoom fijo para que se vea
  // como un retrato de verdad y no como un icono perdido en una esquina.
  const ZOOM_RETRATO = 3.4;
  const esc = (REAL_SPRITE_SCALE[p.rol] || 1) * ZOOM_RETRATO;
  ctx.save();
  ctx.translate(Math.round(w / 2), Math.round(h * 0.88));
  if (flip) ctx.scale(-1, 1);
  ctx.scale(esc, esc);
  ctx.drawImage(img, -img.width / 2, -img.height);
  // Mismas capas de armadura equipada que el cuerpo real en juego (ver
  // dibujarCuerpoHeroe) -- así la ficha de personaje refleja lo que lleva
  // puesto, no solo el cuerpo desnudo.
  if (p.equipo.piernas && imgPiernas) ctx.drawImage(imgPiernas, -imgPiernas.width / 2, -imgPiernas.height);
  if (p.equipo.peto && imgPeto) ctx.drawImage(imgPeto, -imgPeto.width / 2, -imgPeto.height);
  if (p.equipo.casco && imgCasco) ctx.drawImage(imgCasco, -imgCasco.width / 2, -imgCasco.height);
  ctx.restore();
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
        const col = ELEMENTOS[p.elemento].color;
        // Orbe en bloques de pixel art (no un arco liso, pedido expreso:
        // "juega con el pixel art y dale dinamismo") -- núcleo romboidal +
        // brillo que pulsa + 3 chispas orbitando SIEMPRE, no solo al
        // cargar, para que no se vea un punto muerto en reposo.
        const PX = 1.6;
        cx.save();
        cx.translate(tx, ty);
        const nucleo = [
          [0, -2],
          [-1, -1], [0, -1], [1, -1],
          [-1, 0], [0, 0], [1, 0],
          [0, 1],
        ];
        cx.fillStyle = col;
        for (const [nx, ny] of nucleo) cx.fillRect(nx * PX - PX / 2, ny * PX - PX / 2, PX, PX);
        const pulso = 0.5 + Math.sin(animGlobal * 6) * 0.5;
        cx.fillStyle = `rgba(255,255,255,${(0.5 + pulso * 0.4).toFixed(2)})`;
        cx.fillRect(-PX * 1.2, -PX * 2.2, PX, PX);
        for (let i = 0; i < 3; i++) {
          const ang = animGlobal * 2.4 + (i * TAU) / 3;
          const rad = 5.5;
          const sx = Math.cos(ang) * rad;
          const sy = Math.sin(ang) * rad * 0.55;
          cx.globalAlpha = 0.35 + 0.45 * ((Math.sin(ang) + 1) / 2);
          cx.fillStyle = col;
          cx.fillRect(sx - PX / 2, sy - PX / 2, PX, PX);
        }
        cx.globalAlpha = 1;
        cx.restore();

        if (p.cargaT > 0) {
          const c = clamp(p.cargaT / 1.1, 0, 1);
          cx.save();
          cx.translate(tx, ty);
          cx.fillStyle = "rgba(192,132,240,.3)";
          cx.beginPath();
          cx.arc(0, 0, 4 + c * 11 + Math.sin(animGlobal * 20) * 1.5, 0, TAU);
          cx.fill();
          cx.fillStyle = "#c084f0";
          cx.beginPath();
          cx.arc(0, 0, 3 + c * 8, 0, TAU);
          cx.fill();
          cx.fillStyle = "#e8d5ff";
          cx.beginPath();
          cx.arc(0, 0, (3 + c * 8) * 0.45, 0, TAU);
          cx.fill();
          if (c >= 1) {
            cx.strokeStyle = "#fff";
            cx.globalAlpha = 0.5 + Math.sin(animGlobal * 22) * 0.4;
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(0, 0, 4 + c * 11, 0, TAU);
            cx.stroke();
            cx.globalAlpha = 1;
          }
          cx.restore();
        }
      }

// Barra de carga vertical genérica, junto al personaje -- la usan tanto
// el disparo del arquero (p.cargaArqT/CARGA_ARQ_MAX/CARGA_ARQ_ZONA) como
// el cuchillo del pícaro (p.cargaCuchT/CARGA_CUCH_MAX/CARGA_CUCH_ZONA, ver
// systems/abilities.js), mismo aspecto para las dos: una banda marca la
// ventana de crítico óptimo (zona) y el contorno se ilumina al entrar en
// ella, a juego con el aviso sonoro (sfxCargaLista, disparado desde
// core/loop.js). No usa barra() de render/hud.js porque esa función es
// horizontal (w2,h2 con el relleno creciendo en X) -- aquí el relleno
// crece en Y, de abajo arriba.
function dibujarBarraCarga(p, cargaActual, cargaMax, zona) {
        const bw = 5, bh = 30;
        const bx = p.x + 16, by = p.y - bh / 2 - 4;
        const c = clamp(cargaActual / cargaMax, 0, 1);
        const enZona = cargaActual >= zona[0] && cargaActual <= zona[1];
        cx.fillStyle = "rgba(10,8,17,.78)";
        cx.fillRect(bx, by, bw, bh);
        // banda de la zona óptima: misma referencia (abajo=0, arriba=máximo)
        // que el relleno de más abajo, para que ambas cosas midan lo mismo.
        const zonaY0 = by + bh - (zona[1] / cargaMax) * bh;
        const zonaY1 = by + bh - (zona[0] / cargaMax) * bh;
        cx.fillStyle = "rgba(226,196,137,.4)";
        cx.fillRect(bx, zonaY0, bw, zonaY1 - zonaY0);
        const fillH = c * bh;
        cx.fillStyle = enZona ? "#ffd27f" : "#e9e3d5";
        cx.fillRect(bx, by + bh - fillH, bw, fillH);
        cx.strokeStyle = enZona ? "#ffd27f" : "#3a3453";
        cx.lineWidth = 1;
        cx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        if (enZona) {
          cx.globalAlpha = 0.5 + Math.sin(animGlobal * 20) * 0.4;
          cx.strokeStyle = "#fff7e0";
          cx.lineWidth = 1.5;
          cx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
          cx.globalAlpha = 1;
        }
      }

export function renderJugador(p) {
        const eq = p.equipo;

        if (p.ko) {
          // Colapso real (ver REAL_MUERTE/MUERTE_DUR en render/sprites.js):
          // juega los 5 fotogramas UNA vez según cuánto lleva tumbado
          // (p.koAnimT, ver core/loop.js) y se queda fijo en el último
          // (tumbado del todo) el resto del K.O. -- no vuelve a jugarse en
          // bucle. Antes era el icono estático de siempre rotado 90°, un
          // hack sin animación real; se mantiene como fallback por si el
          // arte no cargó todavía (un instante, al arrancar).
          if (REAL_MUERTE.length) {
            const prog = clamp((p.koAnimT || 0) / MUERTE_DUR, 0, 0.999);
            const fr = REAL_MUERTE[Math.floor(prog * REAL_MUERTE.length)];
            cx.globalAlpha = 0.8;
            if (fr) drawSpriteBottom(fr, p.x, p.y, false, REAL_SPRITE_SCALE[p.rol] || 1);
            cx.globalAlpha = 1;
          } else {
            cx.save();
            cx.translate(p.x, p.y);
            cx.rotate(Math.PI / 2);
            cx.globalAlpha = 0.55;
            cx.drawImage(spriteJugador(p), -21, -18);
            cx.restore();
            cx.globalAlpha = 1;
          }
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
            dibujarCuerpoHeroe(p, poseTr, tr.x, tr.y);
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
        // (antes había un parpadeo de globalAlpha aquí al recibir daño --
        // quedaba sin efecto real, el globalAlpha se resetea más abajo
        // antes de dibujar el cuerpo. Sustituido por la animación real de
        // "herido", REAL_HURT en sprites.js, ver calcularPoseHeroe.)
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
            dibujarCuerpoHeroe(p, poseHeroe, p.x, p.y + bob);
          }
        }
        cx.globalAlpha = 1;

        // anillo: gema flotante sobre la cabeza (antes "accesorio", partido
        // en collar/anillo al pasar a 7 slots -- ver core/constants.js:
        // SLOTS. El collar todavía no tiene efecto visual propio).
        if (eq.anillo && !formaAnimal) {
          const gcol = RAREZAS[eq.anillo.rareza].col;
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
          // Destello leve solo a partir de Épico (2) -- antes arrancaba en
          // Raro (1), pedido expreso del usuario al pasar las armas con
          // arte real (ver WEAPON_ART_POOL en sprites.js) a mantener su
          // color propio sin recolorear: la rareza la transmite SOLO este
          // halo (+ el rayo de luz del drop en world.js), así que debe
          // quedar reservado a lo genuinamente raro, no a cualquier Raro.
          if (rarezaArma >= 2 && wcol) {
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
              const wDib = ww0 * s2, hDib = wh0 * s2;
              // La mano (ancla real "m-d" de la hoja COMPARTIDA de idle/correr --
              // ver REAL_IDLE_ANCLA en sprites.js, no hay marca específica de
              // arquero para reposo) cae muy cerca del tobillo en varias
              // direcciones. Centrar el arco ahí (mitad arriba/mitad abajo del
              // pivote, como antes) lo hacía asomar por debajo de los pies --
              // bug reportado: "el arco se dibuja debajo del personaje". Se
              // ancla como una empuñadura real: la mayor parte del arco por
              // ENCIMA de la mano y solo el limbo inferior por debajo.
              cx.drawImage(fr, 8 - wDib / 2, -hDib * 0.82, wDib, hDib);
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
            // Martillo de Frhor: imagen propia ya teñida azul zafiro (ver
            // MARTILLO_FRHOR_IMG en sprites.js), en vez del lookup normal
            // por rareza -- se ve distinto a un Épico normal a propósito.
            // Arma con arte real por variante (pack "iron-weapons", ver
            // WEAPON_ART_POOL/genItem): tiene prioridad sobre el sprite
            // único reteñido -- se muestra tal cual, tal como cayó, sin
            // recolorear (solo guerrero/pícaro pasan por aquí con
            // `arteIdx`; arquero tiene su propio arco animado más arriba y
            // mago/clérigo/druida siguen sin pack de variantes todavía).
            const poolArma = eq.arma && eq.arma.arteIdx !== undefined ? WEAPON_ART_POOL[eq.arma.clase] : null;
            const wimg =
              (eq.arma && eq.arma.id === "martillo_frhor" && MARTILLO_FRHOR_IMG) ||
              (poolArma && poolArma.length && poolArma[eq.arma.arteIdx % poolArma.length]) ||
              (WEAPON_IMG_RAREZA[p.rol] && WEAPON_IMG_RAREZA[p.rol][rarezaArma]) ||
              WEAPON_IMG[p.rol];
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
              // Iconos del pack "iron-weapons" (WEAPON_ART_POOL): vienen en
              // diagonal (icono de inventario típico), no en tira vertical
              // con la punta arriba como el resto del pack -- el aspect
              // ratio (cuadrados, 32x32) no sirve para detectarlo como con
              // magic-wood.png, así que se marca explícito con `esIconoArma`.
              // Se ancla por su punto de MANGO real (ver armaHiltTip() en
              // sprites.js, medido a mano en Aseprite por el usuario/por
              // mí) y se rota exactamente -atan2(punta-mango) para que la
              // punta caiga siempre a lo largo de la puntería -- confirmado
              // con un barrido numérico de 0.5° (no solo a ojo, que llevó a
              // dos intentos previos fallidos con un ángulo fijo). Sin datos
              // calibrados para esa variante concreta (arquero, u otra
              // futura), cae al mismo -45° de siempre como aproximación.
              const esIconoArma = !!(poolArma && poolArma.length && wimg === poolArma[eq.arma.arteIdx % poolArma.length]);
              const datosHiltTip = esIconoArma ? armaHiltTip(eq.arma.clase, eq.arma.arteIdx) : null;
              if (datosHiltTip) {
                const { hilt, tip } = datosHiltTip;
                const rotIcono = -Math.atan2(tip[1] - hilt[1], tip[0] - hilt[0]);
                cx.rotate(rotIcono);
                cx.drawImage(wimg, -hilt[0] * s, -hilt[1] * s, ww, wh);
              } else if (esIconoArma) {
                cx.rotate(-Math.PI / 4);
                cx.drawImage(wimg, 0, -wh / 2, ww, wh);
              } else if (ww0 >= wh0) {
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
          dibujarCuerpoHeroe(p, poseHeroe, p.x, p.y + bob);
        }

        // Orbe de carga del mago: efecto de gameplay (no una hoja física),
        // independiente de si la capa esquemática de arriba está activa --
        // tiene que seguir viéndose durante el golpe (cuando esa capa se
        // apaga porque el báculo ya viene en el frame de REAL_ATTACK) igual
        // que en reposo. Mismo pivote/escala que usaba la capa esquemática
        // para que no salte de sitio al activarse/desactivarse esa capa.
        // De espaldas ("up") NO se dibuja -- el cuerpo se redibuja ENCIMA
        // del arma para esa dirección (ver el bloque justo arriba), pero el
        // orbe se pintaba siempre el último, por encima de todo, así que se
        // veía superpuesto sobre la espalda del personaje (reportado: "se
        // sobrepone y queda raro").
        if (!formaAnimal && p.rol === "mago" && poseHeroe?.dir !== "up") {
          cx.save();
          // Mismo pivote que el dibujo real del arma más arriba (ancla real
          // de mano si hay, si no el pivote fijo + GRIP) -- antes SIEMPRE
          // usaba el pivote fijo aunque la hoja actual tuviera ancla real,
          // así que el orbe y la vara podían caer en sitios distintos
          // ("la bola flota", reportado). gripDibujoOrbe reproduce el mismo
          // `gripDibujo` que usa esa rama para que la cuenta de abajo
          // encaje en los dos casos.
          let gripDibujoOrbe;
          if (anclaMano) {
            cx.translate(anclaMano.x, anclaMano.y);
            gripDibujoOrbe = 0;
          } else {
            cx.translate(p.x, p.y + 3);
            gripDibujoOrbe = CONFIG_ARMA.grip;
          }
          cx.rotate(p.aim);
          cx.scale(CONFIG_ARMA.escala, CONFIG_ARMA.escala);
          // Punta real de la vara: (25,5) en el PNG nativo de magic-wood.png
          // (29x10, horizontal -- ver WEAPON_SRC en sprites.js), medido a
          // mano por el usuario. Misma fórmula de escala que usa la rama
          // horizontal del dibujo de armas de abajo (s = (REACH-GRIP)/
          // max(ancho,alto)) para caer exactamente donde se dibuja la
          // punta; y=5 es el centro vertical del PNG (10px de alto), por
          // eso da 0 en el eje local.
          const sVara = (CONFIG_ARMA.reach - CONFIG_ARMA.grip) / 29;
          dibujarCargaMago(p, gripDibujoOrbe + 25 * sVara, (5 - 5) * sVara);
          cx.restore();
        }
        // Barra de carga (arquero/pícaro): a diferencia del orbe del mago
        // de arriba, NO va dentro del cx.rotate(p.aim) -- una barra
        // vertical girando con la puntería no se leería como "cuánto
        // llevo cargado". Se queda en espacio de mundo, siempre en vertical.
        if (!formaAnimal && p.rol === "arquero" && p.cargaArqT > 0) {
          dibujarBarraCarga(p, p.cargaArqT, CARGA_ARQ_MAX, CARGA_ARQ_ZONA);
        }
        if (!formaAnimal && p.rol === "picaro" && p.cargaCuchT > 0) {
          dibujarBarraCarga(p, p.cargaCuchT, CARGA_CUCH_MAX, CARGA_CUCH_ZONA);
        }

        // Mano secundaria (ver OFFHAND_IMG/OFFHAND_IMG_RAREZA en sprites.js):
        // escudo/libro, no gira con la puntería ni el swing -- se lleva pegada
        // al cuerpo, en el lado contrario a la mano del arma (que sí sigue la
        // puntería), volteándose solo con el mismo flip del propio personaje.
        // Tier de rareza del slot "escudo" (brazo izquierdo, ver
        // core/constants.js: SLOTS) si hay uno equipado; si no, 0 (dibujo
        // base sin teñir) -- antes tomaba prestada la rareza del arma
        // porque no existía un ítem de escudo real que equipar.
        const oimg = !formaAnimal
          && ((OFFHAND_IMG_RAREZA[p.rol] && OFFHAND_IMG_RAREZA[p.rol][eq.escudo ? eq.escudo.rareza : 0]) || OFFHAND_IMG[p.rol]);
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
        // Causa REAL de la "doble sombra" del Guardián de Hielo (confirmado:
        // ocurre incluso en sala vacía, sin ningún pilar/barril cerca) --
        // esta sombra genérica se dibuja aquí de forma INCONDICIONAL, antes
        // de llegar a las ramas de jefe con sprite real (`e.cerdo`,
        // `e.arquetipo === "hielo"`, más abajo), que YA dibujan la suya
        // propia calibrada a su sprite/pies reales. Sin este guard, el
        // Guardián (y El Magnate, aunque esté en standby) pintaba DOS
        // sombras cada frame: esta genérica (offset e.r*0.9 hacia abajo,
        // pensada para el dibujo procedural por defecto de los mobs) más la
        // suya, centrada en sus pies -- la de abajo asomaba como una sombra
        // extra y flotante.
        if (!(e.cerdo || e.arquetipo === "hielo")) {
          cx.fillStyle = "rgba(0,0,0,.35)";
          cx.beginPath();
          cx.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.8, e.r * 0.3, 0, 0, TAU);
          cx.fill();
        }

        // muñeco de pruebas: sprite real (torre-vespero-assets/Dummy, ver
        // DUMMY_HIT en render/sprites.js) + medidor de DPS. Frame 0 = reposo;
        // al recibir un golpe (e.hurtT, mismo campo que ya usa cualquier
        // enemigo para el flinch, ver danoAEnemigo en systems/combat.js:
        // `e.hurtT = 0.12`) se reproduce la reacción completa según el
        // progreso de esos 0.12s. Cae al icono procedural (SPR.dummy) si el
        // pack todavía no cargó, mismo criterio que el resto del pipeline.
        if (e.dummy) {
          const HURT_DUR = 0.12;
          const frameIdx = e.hurtT > 0
            ? Math.min(DUMMY_HIT.length - 1, Math.floor((1 - e.hurtT / HURT_DUR) * DUMMY_HIT.length))
            : 0;
          const img = DUMMY_HIT.length ? DUMMY_HIT[frameIdx] : SPR.dummy;
          drawSprite(img, e.x, e.y - 2);
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
        // PRIMER JEFE REAL: Guardián de Hielo (ver core/loop.js: rama
        // arq==="hielo", systems/floorgen.js: spawn en planta 5). Sprite
        // real animado (FROST_GUARDIAN, ver render/sprites.js), a
        // diferencia del resto de jefes (dibujo procedural reescalado) --
        // mismo criterio de "pipeline aparte" que la rama `cerdo` de
        // arriba. Prioridad de animación: herido > ataque > caminar > idle
        // (mismo criterio que calcularPoseHeroe con el héroe), indexada
        // por animGlobal -- los enemigos no llevan reloj de animación
        // propio, mismo idiom que MOB_RUN más abajo.
        if (e.arquetipo === "hielo") {
          let frames = FROST_GUARDIAN.idle;
          if (e.hurtT > 0 && FROST_GUARDIAN.hit.length) {
            const prog = clamp(1 - e.hurtT / 0.12, 0, 0.999);
            frames = FROST_GUARDIAN.hit;
            frames = [frames[Math.floor(prog * frames.length)]];
          } else if (e.atkT > 0 && FROST_GUARDIAN.atk.length) {
            const prog = clamp(1 - e.atkT / (e.atkTMax || 0.9), 0, 0.999);
            frames = [FROST_GUARDIAN.atk[Math.floor(prog * FROST_GUARDIAN.atk.length)]];
          } else if (e.moviendose && FROST_GUARDIAN.walk.length) {
            frames = FROST_GUARDIAN.walk;
          }
          const fr = frames[Math.floor(animGlobal * 8) % frames.length] || frames[0];
          const obj3 = masCercano(e.x, e.y);
          const flip3 = obj3 ? e.x > obj3.x : false;
          // Sombra en el suelo -- esta rama devuelve antes de llegar a la
          // sombra genérica de más abajo (e.y + e.r*0.9, calibrada para el
          // resto de enemigos), así que necesita la suya. cargarFramesSueltosTrim
          // (render/sprites.js) ya ancla cada frame por su borde INFERIOR
          // real (bbox alfa, mismo criterio que el héroe) dentro de `fr`,
          // así que los pies caen EXACTOS en e.y -- sin offset a ojo.
          cx.fillStyle = "rgba(0,0,0,.4)";
          cx.beginPath();
          cx.ellipse(e.x, e.y, e.r * 0.85, e.r * 0.28, 0, 0, TAU);
          cx.fill();
          if (e.hurtT > 0) cx.globalAlpha = 0.8;
          if (fr) drawSpriteBottom(fr, e.x, e.y, flip3);
          cx.globalAlpha = 1;
          // barra de vida + nombre (mismo patrón que El Magnate arriba)
          const w3 = 90;
          cx.fillStyle = "#0d0b15";
          cx.fillRect(e.x - w3 / 2, e.y - e.r * 2.5, w3, 6);
          cx.fillStyle = "#7fc9e8";
          cx.fillRect(e.x - w3 / 2, e.y - e.r * 2.5, (w3 * Math.max(0, e.hp)) / e.hpMax, 6);
          cx.fillStyle = "#bfe6f7";
          cx.font = "800 12px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("❄ " + e.nombre + " ❄", e.x, e.y - e.r * 2.7);
          if (e.regenerando) {
            const nVivos = (e.pilaresFase || []).filter((pl) => G.pilares.includes(pl)).length;
            cx.fillStyle = "#eaf6ff";
            cx.font = "700 11px Alegreya Sans";
            cx.fillText("🧊 Destruye los pilares (" + nVivos + " restantes)", e.x, e.y - e.r * 2.7 - 14);
          }
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
          const barX = e.x - w2 / 2,
            barY = e.y - e.r - 10;
          if (ENEMY_BAR.complete && ENEMY_BAR.naturalWidth) {
            // Marco real (enemies-hp-ui-bar-outline.png, ver
            // render/uiTiles.js) escalado para que su hueco interior mida
            // exactamente w2 -- así el relleno de vida ocupa el mismo
            // sitio de siempre (barX,barY,w2,alto) y solo cambia el fondo
            // plano de antes por el marco con relieve.
            const escEn = w2 / ENEMY_BAR_INTERIOR.w;
            const frameW = ENEMY_BAR.naturalWidth * escEn,
              frameH = ENEMY_BAR.naturalHeight * escEn;
            const interiorH = ENEMY_BAR_INTERIOR.h * escEn;
            cx.fillStyle = e.jefe ? "#c07be0" : "#d1545c";
            cx.fillRect(barX, barY, (w2 * e.hp) / e.hpMax, interiorH);
            cx.drawImage(
              ENEMY_BAR,
              barX - ENEMY_BAR_INTERIOR.x * escEn,
              barY - ENEMY_BAR_INTERIOR.y * escEn,
              frameW,
              frameH,
            );
          } else {
            cx.fillStyle = "#0d0b15";
            cx.fillRect(barX, barY, w2, 4);
            cx.fillStyle = e.jefe ? "#c07be0" : "#d1545c";
            cx.fillRect(barX, barY, (w2 * e.hp) / e.hpMax, 4);
          }
        }
      }
