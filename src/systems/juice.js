// "Juice" de combate: hit-stop, shake por golpe, empuje (knockback) y
// destello de impacto -- los 4 se enganchan en danoAEnemigo() (combat.js),
// el ÚNICO punto por el que pasa cualquier golpe DIRECTO a un enemigo (los
// tics de veneno/quemadura tocan e.hp a mano en core/loop.js sin pasar por
// aquí, así que no spamean estos efectos en cada tick de DoT).
//
// Cada sistema tiene su propio "enabled" -- se puede apagar cualquiera de
// los 4 sin tocar el resto ni la lógica de combate real (hp, muerte, XP,
// drops...), que vive intacta en combat.js. Nada de aquí depende de la red:
// solo se llama desde danoAEnemigo()/loop.js, que ya son exclusivos del
// host/un solo jugador (el cliente nunca corre update(), ver main.js).
import { G } from "../core/state.js";
import { clamp } from "../utils/helpers.js";

export const JUICE = {
  hitStop: {
    enabled: true,
    base: 0.035, // suelo de congelación con daño ~0, en segundos
    perDmg: 0.0012, // segundos añadidos por punto de daño infligido
    min: 0.05,
    max: 0.15,
  },
  shake: {
    enabled: true,
    perDmg: 0.045,
    min: 1.5, // por debajo del shake de golpe recibido/subir de nivel (4)
    max: 6, // por debajo del shake de jefe derrotado/cadena perfecta (8-10)
  },
  knockback: {
    enabled: true,
    // 140 -> 165 -> 230: feedback repetido de "sigue sin haber peso" -- el
    // primer ajuste (165) no se notaba lo bastante. friction sube un poco
    // (0.85 -> 0.87) para que el enemigo deslice un poco más lejos antes
    // de frenar, en vez de solo empujar más fuerte y parar igual de rápido
    // (eso se lee como un golpe más fuerte, no más "pesado").
    meleeForce: 230, // empuje del tajo normal (golpeArco en abilities.js)
    friction: 0.87, // decel. por frame en core/loop.js (e.kx *= friction)
  },
  flash: {
    enabled: true,
    dur: 0.06, // ~3-4 frames a 60fps
    colorNormal: "#ffffff",
    colorCrit: "#ff2b3d",
  },
};

// Congela update() (ver main.js: bucle()) sin tocar hp/estado/red -- se
// consume con el dt REAL de pantalla, no con el del juego, así que sigue
// corriendo aunque la propia lógica esté parada. Math.max con lo que
// hubiera: varios golpes en el mismo frame (multijugador) no se suman.
export function aplicarHitStop(dmg) {
  if (!JUICE.hitStop.enabled || !G) return;
  const dur = clamp(
    JUICE.hitStop.base + dmg * JUICE.hitStop.perDmg,
    JUICE.hitStop.min,
    JUICE.hitStop.max,
  );
  G.hitStopT = Math.max(G.hitStopT || 0, dur);
}

// Reusa G.shake, el sistema de temblor de cámara ya existente (decae solo
// en core/loop.js, se aplica como translate() en render/world.js) -- esto
// solo añade el disparador que faltaba: hasta ahora G.shake solo subía en
// eventos gordos (jefe derrotado, parry, subir de nivel), nunca en un golpe
// normal. Math.max, no suma -- nunca se acumula por golpear varias veces.
export function aplicarShakeGolpe(dmg) {
  if (!JUICE.shake.enabled || !G) return;
  const s = clamp(dmg * JUICE.shake.perDmg, JUICE.shake.min, JUICE.shake.max);
  G.shake = Math.max(G.shake || 0, s);
}

// Destello de impacto sobre el sprite del enemigo: blanco en golpe normal,
// rojo sangre en crítico (deja el crítico identificable a simple vista de
// paso). Dibujado real en render/character.js (renderEnemigo) por
// composición "source-atop" -- no toca los píxeles originales del sprite,
// así que no hay sprite que "restaurar": simplemente deja de dibujarse el
// tinte en cuanto e.hitFlashT llega a 0 (decae en core/loop.js).
export function aplicarFlash(e, crit) {
  if (!JUICE.flash.enabled) return;
  e.hitFlashT = JUICE.flash.dur;
  e.hitFlashCol = crit ? JUICE.flash.colorCrit : JUICE.flash.colorNormal;
}

// Rango de estilo tipo "hack and slash" (D/C/B/A/S/SS/SS+/SSS++/EXTREMO,
// a lo Devil May Cry/Bayonetta): un medidor GLOBAL de grupo, no por
// jugador -- con la pantalla compartida de este coop, cuatro medidores
// separados serían ruido, uno solo lee mejor de un vistazo y premia jugar
// EN EQUIPO sin pausas, no acumular golpes en solitario. No sustituye el
// combo de 4 golpes del guerrero (Golpe Colosal, ver abilities.js) -- ese
// sigue exactamente igual por debajo, esto es una capa visual aparte que
// no toca daño/cooldowns/mecánicas, solo feedback.
export const ESTILO = {
  enabled: true,
  porGolpe: 6,
  porCritico: 14,
  porMuerte: 10, // bonus al rematar, para premiar cerrar el combo con una muerte
  ventana: 2.4, // segundos sin golpear antes de que el rango empiece a caer
  caida: 55, // puntos/seg perdidos una vez pasada la ventana
  max: 400,
  rangos: [
    { letra: "D", min: 0, col: "#9a93ab" },
    { letra: "C", min: 20, col: "#e9e3d5" },
    { letra: "B", min: 45, col: "#7fd4c1" },
    { letra: "A", min: 75, col: "#6fb3e8" },
    { letra: "S", min: 110, col: "#e9b45c" },
    { letra: "SS", min: 150, col: "#ff9d3d" },
    { letra: "SS+", min: 200, col: "#ff5c5c" },
    { letra: "SSS++", min: 260, col: "#c084f0" },
    { letra: "EXTREMO", min: 330, col: "#ff2b6b" },
  ],
};

function estadoEstilo() {
  if (!G) return null;
  if (!G.estilo) G.estilo = { puntos: 0, rango: 0, rangoT: 0 };
  return G.estilo;
}

// Llamado desde danoAEnemigo() (combat.js) en cada golpe REAL conectado
// (no en el dummy, mismo criterio que aplicarShakeGolpe) y desde
// matarEnemigo() con esMuerte=true para el bonus extra de rematar.
export function aplicarEstilo(crit, esMuerte) {
  if (!ESTILO.enabled) return;
  const est = estadoEstilo();
  if (!est) return;
  est.puntos = Math.min(
    ESTILO.max,
    est.puntos + (crit ? ESTILO.porCritico : ESTILO.porGolpe) + (esMuerte ? ESTILO.porMuerte : 0),
  );
  est.decayT = ESTILO.ventana;
}

// Llamado una vez por frame desde core/loop.js (update()) -- decae el
// medidor si ha pasado la ventana sin golpear y recalcula el rango vigente
// (el más alto cuyo mínimo ya se alcanzó). rangoT solo se reinicia al
// SUBIR de rango (el pop de entrada en el HUD, ver render/world.js) -- al
// bajar no hace falta ningún efecto especial, solo que el texto cambie.
export function actualizarEstilo(dt) {
  if (!ESTILO.enabled) return;
  const est = estadoEstilo();
  if (!est) return;
  if (est.decayT > 0) est.decayT -= dt;
  else if (est.puntos > 0) est.puntos = Math.max(0, est.puntos - ESTILO.caida * dt);
  let nuevoRango = 0;
  for (let i = ESTILO.rangos.length - 1; i >= 0; i--) {
    if (est.puntos >= ESTILO.rangos[i].min) {
      nuevoRango = i;
      break;
    }
  }
  if (nuevoRango > est.rango) {
    est.rango = nuevoRango;
    est.rangoT = 0.5;
  } else {
    est.rango = nuevoRango;
    if (est.rangoT > 0) est.rangoT = Math.max(0, est.rangoT - dt);
  }
}
