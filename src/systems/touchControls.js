// Controles táctiles (prototipo) -- tercer tipo de control (p.ctrl.tipo
// === "touch"), mismo papel que kbm/pad en systems/input.js: este módulo
// mantiene el estado vivo del input (equivalente a `keys`/`mouse` para
// kbm, o a gp.axes/botones para pad) y expone leerInputTactil(p), que
// devuelve el MISMO shape {mx,my,aimA,atkHeld,lanzarHeld,gtX,gtY} que ya
// consume core/loop.js sin tocar ese archivo.
//
// Capa 100% HTML sobre el canvas -- en todo el proyecto el canvas nunca
// hace hit-testing de nada (mousedown en #lienzo siempre dispara
// atacar(), sin comprobar qué se pintó ahí), así que joysticks y botones
// son elementos DOM reales dentro de #touch-controls (index.html),
// construidos aquí, no dibujo+colisión en el lienzo.
import { ELEMENTOS, ELEM_MAGO, FORMAS_DRUIDA, FORMAS_INFO, SENDA_ELEMENTAL, SUPS } from "../core/constants.js";
import { G } from "../core/state.js";
import { activarParry, castSup, dashAtaque, disparoSecundario, esquivar, habilidad, interactuar, sendaElemental, transformar } from "./abilities.js";

// Detección de dispositivo táctil -- no existía nada de esto en el
// proyecto, ver informe de exploración: cero uso de maxTouchPoints/
// matchMedia/ontouchstart en todo src/.
//
// La primera versión usaba matchMedia("pointer: coarse")/maxTouchPoints,
// que dan falso positivo en cualquier portátil/monitor de escritorio con
// pantalla táctil (bastante común) aunque se juegue con teclado+ratón --
// bug reportado: el apuntado se quedaba "pegado" porque leerInput()
// enrutaba a la rama táctil (que solo actualiza el ángulo si se arrastra
// el stick de apuntar en pantalla) en vez de a la de ratón. Ahora exige
// que el propio dispositivo se declare móvil (no solo "tiene touch"):
// navigator.userAgentData.mobile (Chrome/Edge modernos, fuente fiable) o,
// si no existe esa API (Safari/Firefox), el user-agent clásico + que la
// resolución sea evidentemente de móvil -- pedido expreso del usuario:
// "solo deben ejecutarse si se juega desde un dispositivo móvil, o a
// partir de una resolución que es evidente que es móvil". El toggle
// manual en Ajustes (ui/inventory.js) sigue como vía de escape para
// probar desde escritorio o para el caso raro que esto no acierte.
export function esTactil() {
  try {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
      return navigator.userAgentData.mobile;
    }
    const uaMovil = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    const pantallaMovil = Math.min(window.innerWidth, window.innerHeight) <= 780;
    return uaMovil || pantallaMovil;
  } catch (e) {
    return false;
  }
}

function jugadorTactil() {
  return G ? G.players.find((p) => p.ctrl.tipo === "touch") : null;
}

// Estado vivo leído por leerInputTactil() cada frame. aimA es "pegajoso"
// -- igual que el mando (ver systems/input.js: aimA solo se actualiza si
// el stick supera el umbral de magnitud, si no mantiene el último p.aim
// real), así que aquí NO hace falta guardar un valor por defecto: cuando
// el stick de apuntar no está activo, leerInputTactil() devuelve p.aim
// directamente.
const st = { mx: 0, my: 0, aimA: 0, aimActivo: false, atkHeld: false, lanzarHeld: false };

const RADIO_STICK = 42; // radio máximo de arrastre en px CSS, ver .tc-stick-base
const UMBRAL_AIM = 0.3; // mismo umbral que el mando (systems/input.js: m2 > 0.3)

export function leerInputTactil(p) {
  sincronizarBotones(p);
  const aimA = st.aimActivo ? st.aimA : p.aim;
  const d = 160; // mismo criterio que el mando cuando no hay gamepad conectado (systems/input.js)
  return {
    mx: st.mx,
    my: st.my,
    aimA,
    atkHeld: st.atkHeld,
    lanzarHeld: st.lanzarHeld,
    gtX: p.x + Math.cos(aimA) * d,
    gtY: p.y + Math.sin(aimA) * d,
  };
}

// ---- Construcción del DOM (una vez, al cargar el módulo) ----

let cont, zonaMover, zonaApuntar, stickMover, stickApuntar, contBotones;

function crearDom() {
  cont = document.getElementById("touch-controls");
  if (!cont) return false; // index.html sin el contenedor todavía (no debería pasar)
  cont.innerHTML =
    '<div class="tc-zona tc-zona-mover"></div>' +
    '<div class="tc-zona tc-zona-apuntar"></div>' +
    '<div class="tc-stick tc-stick-mover" hidden><div class="tc-stick-base"></div><div class="tc-stick-nub"></div></div>' +
    '<div class="tc-stick tc-stick-apuntar" hidden><div class="tc-stick-base"></div><div class="tc-stick-nub"></div></div>' +
    '<div class="tc-botones" id="tc-botones"><div class="tc-fila tc-fila-clase" id="tc-fila-clase"></div><div class="tc-fila tc-fila-universal" id="tc-fila-universal"></div></div>';
  zonaMover = cont.querySelector(".tc-zona-mover");
  zonaApuntar = cont.querySelector(".tc-zona-apuntar");
  stickMover = cont.querySelector(".tc-stick-mover");
  stickApuntar = cont.querySelector(".tc-stick-apuntar");
  contBotones = cont.querySelector("#tc-botones");
  return true;
}

// ---- Joystick genérico (flotante: nace donde se toca la zona) ----

function posicionStick(stickEl, x, y) {
  stickEl.style.left = x + "px";
  stickEl.style.top = y + "px";
}

function moverNub(stickEl, dx, dy) {
  const nub = stickEl.querySelector(".tc-stick-nub");
  nub.style.transform = `translate(${dx}px, ${dy}px)`;
}

// zona: el div que captura el touchstart. onMove(nx, ny, distFrac) se
// llama en cada touchmove con el vector normalizado (-1..1) y la
// fracción de radio (0..1, para el umbral de aim). onEnd() al soltar.
function engancharStick(zona, stickEl, onStart, onMove, onEnd) {
  let touchId = null,
    baseX = 0,
    baseY = 0;
  zona.addEventListener(
    "touchstart",
    (e) => {
      if (touchId !== null) return; // ya hay un dedo en esta zona
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const r = cont.getBoundingClientRect();
      baseX = t.clientX - r.left;
      baseY = t.clientY - r.top;
      posicionStick(stickEl, baseX, baseY);
      stickEl.hidden = false;
      moverNub(stickEl, 0, 0);
      if (onStart) onStart();
      e.preventDefault();
    },
    { passive: false },
  );
  const mover = (e) => {
    const t = [...e.changedTouches].find((tt) => tt.identifier === touchId);
    if (!t) return;
    const r = cont.getBoundingClientRect();
    const dx = t.clientX - r.left - baseX,
      dy = t.clientY - r.top - baseY;
    const dist = Math.min(Math.hypot(dx, dy), RADIO_STICK);
    const ang = Math.atan2(dy, dx);
    const nx = (Math.cos(ang) * dist) / RADIO_STICK,
      ny = (Math.sin(ang) * dist) / RADIO_STICK;
    moverNub(stickEl, Math.cos(ang) * dist, Math.sin(ang) * dist);
    onMove(nx, ny, dist / RADIO_STICK);
    e.preventDefault();
  };
  const soltar = (e) => {
    const t = [...e.changedTouches].find((tt) => tt.identifier === touchId);
    if (!t) return;
    touchId = null;
    stickEl.hidden = true;
    onEnd();
    e.preventDefault();
  };
  zona.addEventListener("touchmove", mover, { passive: false });
  zona.addEventListener("touchend", soltar, { passive: false });
  zona.addEventListener("touchcancel", soltar, { passive: false });
}

// ---- Botones de acción (delegación de eventos + un par de casos
// especiales que necesitan mantener pulsado, no solo un tap) ----

function tapBoton(accion, fn) {
  return `<button type="button" class="tc-btn" data-accion="${accion}">${fn}</button>`;
}

// Iconos/colores calcados de renderHUD() (render/hud.js) para que el
// jugador reconozca los mismos símbolos que ya usa el HUD -- no hace
// falta inventar un lenguaje visual nuevo para táctil.
function filaUniversal() {
  return (
    tapBoton("esquivar", "⤸") +
    tapBoton("interactuar", "✋") +
    tapBoton("parry", "🛡") +
    tapBoton("secundario", "R") +
    tapBoton("habilidad", "Q")
  );
}

function filaClase(rol) {
  if (rol === "mago") {
    return (
      ELEM_MAGO.map(
        (el, k) =>
          `<button type="button" class="tc-btn tc-btn-clase" data-accion="elem" data-el="${el}" style="--col:${ELEMENTOS[el].color}">${k + 1}</button>`,
      ).join("") +
      `<button type="button" class="tc-btn tc-btn-clase" data-accion="senda">C</button>`
    );
  }
  if (rol === "clerigo") {
    return SUPS.map(
      (s, k) =>
        `<button type="button" class="tc-btn tc-btn-clase" data-accion="sup" data-idx="${k}" style="--col:${s.color}">${k + 1}</button>`,
    ).join("");
  }
  if (rol === "druida") {
    return FORMAS_DRUIDA.map(
      (fo, k) =>
        `<button type="button" class="tc-btn tc-btn-clase" data-accion="forma" data-idx="${k}" style="--col:${FORMAS_INFO[fo].color}">${FORMAS_INFO[fo].ico}</button>`,
    ).join("");
  }
  if (rol === "guerrero" || rol === "picaro") {
    // Estocada (guerrero, tap) / Cuchillo cargado (pícaro, mantener) --
    // mismo botón "⇧" que en el HUD, pero necesita su propio touchstart/
    // touchend en vez de pasar por el dispatcher genérico de tapBoton(),
    // ver conectarBotonesEspeciales().
    return '<button type="button" class="tc-btn tc-btn-clase" data-accion="dashOLanzar">⇧</button>';
  }
  return "";
}

let rolConstruido = null;

function sincronizarBotones(p) {
  if (rolConstruido === p.rol) return;
  rolConstruido = p.rol;
  document.getElementById("tc-fila-clase").innerHTML = filaClase(p.rol);
  document.getElementById("tc-fila-universal").innerHTML = filaUniversal();
  conectarBotonesEspeciales();
}

function conectarBotonesEspeciales() {
  const btn = cont.querySelector('[data-accion="dashOLanzar"]');
  if (!btn) return;
  btn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const p = jugadorTactil();
      if (!p) return;
      if (p.rol === "guerrero") dashAtaque(p);
      else st.lanzarHeld = true; // pícaro: cuchillo cargado, se suelta en touchend
    },
    { passive: false },
  );
  const soltar = (e) => {
    e.preventDefault();
    st.lanzarHeld = false;
  };
  btn.addEventListener("touchend", soltar, { passive: false });
  btn.addEventListener("touchcancel", soltar, { passive: false });
}

// Delegación en el contenedor de botones para el resto (tap único, sin
// estado mantenido) -- mismas funciones que ya llaman teclado y mando en
// systems/input.js, ningún comportamiento de juego nuevo.
function conectarDelegacion() {
  contBotones.addEventListener(
    "touchstart",
    (e) => {
      const btn = e.target.closest(".tc-btn");
      if (!btn) return;
      e.preventDefault();
      const p = jugadorTactil();
      if (!p) return;
      const accion = btn.dataset.accion;
      if (accion === "esquivar") esquivar(p);
      else if (accion === "interactuar") interactuar(p);
      else if (accion === "parry") activarParry(p);
      else if (accion === "secundario") disparoSecundario(p);
      else if (accion === "habilidad") habilidad(p);
      else if (accion === "senda") sendaElemental(p);
      else if (accion === "elem") p.elemento = btn.dataset.el;
      else if (accion === "sup") castSup(p, +btn.dataset.idx);
      else if (accion === "forma") transformar(p, +btn.dataset.idx);
    },
    { passive: false },
  );
}

// ---- Visibilidad -- llamada cada frame junto a pollPads() (ver
// main.js), independiente de G.activo/G.pausa para poder ocultarse en
// cuanto la partida termina sin necesitar un hook propio en
// core/gameflow.js (que se confirmó agnóstico al tipo de control). ----

let visible = false;
export function sincronizarVisibilidadTactil() {
  if (!cont && !crearDom()) return;
  const debeVerse = esTactil() && !!G && G.activo && !!jugadorTactil();
  if (debeVerse === visible) return;
  visible = debeVerse;
  cont.classList.toggle("oculto", !visible);
}

// Inicialización -- igual que los listeners de kbm al final de
// systems/input.js, se engancha una vez al cargar el módulo.
if (crearDom()) {
  engancharStick(
    zonaMover,
    stickMover,
    null,
    (nx, ny) => {
      st.mx = nx;
      st.my = ny;
    },
    () => {
      st.mx = 0;
      st.my = 0;
    },
  );
  engancharStick(
    zonaApuntar,
    stickApuntar,
    () => {
      st.atkHeld = true;
    },
    (nx, ny, frac) => {
      if (frac > UMBRAL_AIM) {
        st.aimA = Math.atan2(ny, nx);
        st.aimActivo = true;
      } else {
        st.aimActivo = false;
      }
    },
    () => {
      st.atkHeld = false;
      st.aimActivo = false;
    },
  );
  conectarDelegacion();
}
