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
