// Controles táctiles para móvil (MVP): dos joysticks virtuales (mover +
// apuntar/atacar) y dos botones discretos (esquivar, interactuar). Sigue el
// mismo contrato que ya usan "kbm" y "pad" en systems/input.js -- ver
// leerInputTactil(), que devuelve exactamente la forma {mx,my,aimA,atkHeld,
// gtX,gtY} que consume core/loop.js, así que el resto del juego no sabe que
// existe el touch.
//
// Alcance deliberado (fase 1): solo el slot J1 local (host u offline) puede
// ser "touch" -- un invitado de red (NET.modo==="cliente") sigue leyendo
// input de teclado/ratón directamente en net/peer.js (netEnviarInputCliente),
// que no pasa por leerInput()/p.inp, así que dar soporte táctil a un invitado
// exigiría tocar ese archivo también; queda fuera de este MVP.
import { AJ } from "../core/settings.js";
import { G } from "../core/state.js";
import { esquivar, interactuar } from "./abilities.js";
import { mostrar, ocultar } from "../ui/overlays.js";

const DEADZONE = 0.18; // algo mayor que la del pad (0.22/0.3): el "cero" de un dedo en cristal es menos preciso que un stick mecánico
const RADIO_MAX = 52; // px CSS de desplazamiento máximo del "knob" respecto al centro del stick

const sticks = {
  mover: { id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  apuntar: { id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
};

// Botones discretos, data-driven a propósito: fase 2 (parry, ulti, disparo
// secundario) se añade como entradas nuevas aquí, sin tocar el resto del
// módulo -- ver PLAN de controles táctiles.
const BOTONES_TACTILES = [
  { id: "btn-t-esquivar", accion: esquivar, icono: "⤾", clase: "dorado" },
  { id: "btn-t-interactuar", accion: interactuar, icono: "✋", clase: "" },
];

let montado = false;
let visiblePrev = null;

function esTactilPrimario() {
  return !!(
    window.matchMedia &&
    matchMedia("(pointer: coarse)").matches &&
    matchMedia("(hover: none)").matches
  );
}

export function tocarActivo() {
  if (AJ.controlTactil === "on") return true;
  if (AJ.controlTactil === "off") return false;
  return esTactilPrimario();
}

function jugadorTactil() {
  return G && G.players ? G.players.find((p) => p.ctrl.tipo === "touch") : null;
}

// ===== Contrato con systems/input.js =====
export function leerInputTactil(p) {
  const mov = sticks.mover,
    apu = sticks.apuntar;
  const magMov = Math.hypot(mov.dx, mov.dy);
  const mx = magMov > DEADZONE ? mov.dx : 0,
    my = magMov > DEADZONE ? mov.dy : 0;
  const magApu = Math.hypot(apu.dx, apu.dy);
  const activo = magApu > DEADZONE;
  // si el stick de apuntado no se está tocando, se conserva el último
  // ángulo (p.aim) -- igual que hace la rama "pad" cuando el stick de
  // apuntado vuelve al centro (ver systems/input.js).
  const aimA = activo ? Math.atan2(apu.dy, apu.dx) : p.aim;
  const mag = activo ? Math.min(1, magApu) : 0.6;
  const d = 80 + mag * 210; // misma fórmula que la rama "pad"
  return {
    mx,
    my,
    aimA,
    atkHeld: activo,
    gtX: p.x + Math.cos(aimA) * d,
    gtY: p.y + Math.sin(aimA) * d,
  };
}

// ===== Joysticks virtuales =====
function soltarStick(stick, baseEl, knobEl) {
  stick.id = null;
  stick.dx = stick.dy = 0;
  baseEl.classList.remove("activo");
  knobEl.style.transform = "translate(-50%,-50%)";
}

function posicionarBase(baseEl, x, y) {
  baseEl.style.left = x + "px";
  baseEl.style.top = y + "px";
  baseEl.classList.add("activo");
}

function iniciarStick(stick, touch, baseEl, knobEl) {
  stick.id = touch.identifier;
  stick.ox = touch.clientX;
  stick.oy = touch.clientY;
  stick.dx = stick.dy = 0;
  posicionarBase(baseEl, touch.clientX, touch.clientY);
  knobEl.style.transform = "translate(-50%,-50%)";
}

function actualizarStick(stick, touch, knobEl) {
  const dx = touch.clientX - stick.ox,
    dy = touch.clientY - stick.oy;
  const n = Math.hypot(dx, dy);
  const f = n > RADIO_MAX ? RADIO_MAX / n : 1;
  stick.dx = (dx * f) / RADIO_MAX;
  stick.dy = (dy * f) / RADIO_MAX;
  knobEl.style.transform =
    "translate(calc(-50% + " + dx * f + "px), calc(-50% + " + dy * f + "px))";
}

function tocaBotonEn(x, y) {
  // evita que un toque que cae sobre un botón (esquivar/interactuar,
  // superpuestos a la zona de apuntar) también arranque el stick de
  // apuntado en ese punto.
  const el = document.elementFromPoint(x, y);
  return !!(el && el.closest(".btn-tactil"));
}

function montarStick(zonaId, stick, baseEl, knobEl) {
  const zona = document.getElementById(zonaId);
  zona.addEventListener(
    "touchstart",
    (e) => {
      if (stick.id !== null) return; // ya hay un dedo en este stick
      for (const t of e.changedTouches) {
        if (stick.id !== null) break;
        if (tocaBotonEn(t.clientX, t.clientY)) continue;
        e.preventDefault();
        iniciarStick(stick, t, baseEl, knobEl);
      }
    },
    { passive: false },
  );
}

function montarSeguimientoGlobal() {
  window.addEventListener(
    "touchmove",
    (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === sticks.mover.id) {
          e.preventDefault();
          actualizarStick(sticks.mover, t, document.getElementById("knob-mover"));
        } else if (t.identifier === sticks.apuntar.id) {
          e.preventDefault();
          actualizarStick(sticks.apuntar, t, document.getElementById("knob-apuntar"));
        }
      }
    },
    { passive: false },
  );
  const finTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === sticks.mover.id) {
        soltarStick(sticks.mover, document.getElementById("base-mover"), document.getElementById("knob-mover"));
      } else if (t.identifier === sticks.apuntar.id) {
        soltarStick(sticks.apuntar, document.getElementById("base-apuntar"), document.getElementById("knob-apuntar"));
      }
    }
  };
  window.addEventListener("touchend", finTouch, { passive: false });
  window.addEventListener("touchcancel", finTouch, { passive: false });
}

// ===== Botones discretos =====
function montarBotones() {
  for (const cfg of BOTONES_TACTILES) {
    const btn = document.getElementById(cfg.id);
    if (!btn) continue;
    btn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const p = jugadorTactil();
        if (!G || !G.activo || G.pausa || !p || p.ko) return;
        cfg.accion(p);
      },
      { passive: false },
    );
  }
}

// ===== Visibilidad ligada a pausa/overlays (sondeo barato, mismo patrón que pollPads()) =====
export function actualizarVisibilidadTactil() {
  if (!montado) return;
  const debeVerse = !!(G && G.activo && !G.pausa);
  if (debeVerse === visiblePrev) return;
  visiblePrev = debeVerse;
  if (debeVerse) {
    mostrar("controles-tactiles");
  } else {
    ocultar("controles-tactiles");
    // si se oculta con un dedo aún apoyado (se abrió el inventario, p.ej.),
    // no debe quedar un vector fantasma al reabrir el juego.
    soltarStick(sticks.mover, document.getElementById("base-mover"), document.getElementById("knob-mover"));
    soltarStick(sticks.apuntar, document.getElementById("base-apuntar"), document.getElementById("knob-apuntar"));
  }
}

// ===== Aviso de orientación =====
function comprobarOrientacion() {
  if (!tocarActivo()) return;
  const vertical = window.innerHeight > window.innerWidth;
  document.body.classList.toggle("orientacion-incorrecta", vertical);
}

// ===== Montaje =====
export function montarControlesTactiles() {
  if (montado) return;
  montado = true;

  const cont = document.getElementById("controles-tactiles");
  cont.innerHTML =
    '<div id="zona-t-mover" class="zona-tactil"></div>' +
    '<div id="zona-t-apuntar" class="zona-tactil"></div>' +
    '<div class="stick-base" id="base-mover"><div class="stick-knob" id="knob-mover"></div></div>' +
    '<div class="stick-base" id="base-apuntar"><div class="stick-knob" id="knob-apuntar"></div></div>' +
    BOTONES_TACTILES.map(
      (b) =>
        '<button class="btn-tactil ' + b.clase + '" id="' + b.id + '" aria-label="' + b.id + '">' + b.icono + "</button>",
    ).join("");

  montarStick("zona-t-mover", sticks.mover, document.getElementById("base-mover"), document.getElementById("knob-mover"));
  montarStick("zona-t-apuntar", sticks.apuntar, document.getElementById("base-apuntar"), document.getElementById("knob-apuntar"));
  montarSeguimientoGlobal();
  montarBotones();

  comprobarOrientacion();
  window.addEventListener("resize", comprobarOrientacion);
  window.addEventListener("orientationchange", comprobarOrientacion);
}
