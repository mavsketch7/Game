// Doble daga del pícaro: la segunda daga va en la ranura "escudo" (para el
// pícaro se llama "Mano secundaria") y cada daga Rara o mejor sale con un
// elemento. En el combo de 3 golpes, el 1º golpe (daga izquierda) aplica el
// elemento de la mano secundaria, el 2º (daga derecha) el del arma principal
// y el 3º (doble) los dos más la sinergia de la pareja, si la hay.
import { ELEMENTOS_DAGA } from "../core/constants.js";
import { fxParticulas, fxTexto } from "../render/effects.js";
import { G } from "../core/state.js";
import { danoAEnemigo } from "./combat.js";

// Clave de pareja sin orden ("agua+rayo" == "rayo+agua").
const clavePareja = (a, b) => [a, b].sort().join("+");

// dano: multiplicador del golpe doble. duracion: multiplica la duración de
// quemadura/veneno/lentitud aplicadas en ese golpe. aturde: segundos de
// aturdimiento. chispas: a cuántos enemigos salta la chispa del rayo.
const SINERGIAS = {
  "agua+rayo": { nombre: "Electrocutar", desc: "+50% daño y aturde", dano: 1.5, aturde: 0.5 },
  "fuego+veneno": { nombre: "Toxina ígnea", desc: "quemadura y veneno duran el doble", duracion: 2 },
  "agua+hielo": { nombre: "Congelación", desc: "congela al enemigo", aturde: 1.2 },
  "fuego+hielo": { nombre: "Choque térmico", desc: "+40% daño", dano: 1.4 },
  "fuego+rayo": { nombre: "Plasma", desc: "+25% daño y la chispa salta a 2 enemigos", dano: 1.25, chispas: 2 },
  "hielo+veneno": { nombre: "Veneno helado", desc: "veneno más fuerte y ralentiza el doble", duracion: 2, venenoFuerte: true },
};
const AFINIDAD = { nombre: "Afinidad", desc: "mismo elemento: efectos el doble de largos", duracion: 2 };

export function esDaga(it) {
  return !!it && it.slot === "arma" && it.clase === "picaro";
}

// Daga equipada en la mano secundaria (null si no hay, o si hay un escudo).
export function dagaSecundaria(p) {
  return p.rol === "picaro" && esDaga(p.equipo.escudo) ? p.equipo.escudo : null;
}

export function sinergiaDagas(a, b) {
  if (!a || !b) return null;
  if (a === b) return AFINIDAD;
  return SINERGIAS[clavePareja(a, b)] || null;
}

// Elementos que aplica el golpe `paso` (0 izq, 1 der, 2 doble) y la
// sinergia activa en el doble.
export function elementosDelGolpe(p, paso) {
  const izq = dagaSecundaria(p)?.elemento || null;
  const der = p.equipo.arma?.elemento || null;
  if (paso === 0) return { elementos: izq ? [izq] : [], sinergia: null };
  if (paso === 1) return { elementos: der ? [der] : [], sinergia: null };
  return { elementos: [izq, der].filter(Boolean), sinergia: sinergiaDagas(izq, der) };
}

function chispa(p, origen, dmg, saltos) {
  const tocados = new Set([origen]);
  let desde = origen;
  for (let s = 0; s < saltos; s++) {
    let mejor = null, md = 80;
    for (const e of G.enemigos) {
      if (tocados.has(e) || e.hp <= 0 || e.dummy) continue;
      const d = Math.hypot(e.x - desde.x, e.y - desde.y);
      if (d < md) { md = d; mejor = e; }
    }
    if (!mejor) return;
    tocados.add(mejor);
    danoAEnemigo(mejor, dmg * 0.35, p, false, 0, 0);
    fxParticulas(mejor.x, mejor.y - mejor.r * 0.4, 5, ELEMENTOS_DAGA.rayo.color, 2, mejor.r * 0.5);
    desde = mejor;
  }
}

// Efecto de un elemento sobre un enemigo alcanzado (tras el daño del golpe).
export function aplicarElementoDaga(p, e, el, dmg, atk, dir, sinergia) {
  const dur = sinergia?.duracion || 1;
  if (el === "fuego" && !e.dummy) {
    e.burnT = Math.max(e.burnT || 0, 1.6 * dur);
    e.burnDps = Math.max(e.burnDps || 0, atk * 0.25);
    e.burnOwner = p;
  } else if (el === "hielo") {
    e.slowT = Math.max(e.slowT || 0, 1.2 * dur);
  } else if (el === "veneno" && !e.dummy) {
    e.poisonT = Math.max(e.poisonT || 0, 2.5 * dur);
    e.poisonDps = Math.max(e.poisonDps || 0, atk * (sinergia?.venenoFuerte ? 0.35 : 0.2));
    e.poisonOwner = p;
    if (sinergia?.venenoFuerte) e.slowT = Math.max(e.slowT || 0, 1.2 * dur);
  } else if (el === "agua") {
    e.slowT = Math.max(e.slowT || 0, 0.6 * dur);
    if (!e.jefe && !e.dummy) {
      const kr = e.knockRes !== undefined ? e.knockRes : 1;
      e.kx = (e.kx || 0) + Math.cos(dir) * 160 * kr;
      e.ky = (e.ky || 0) + Math.sin(dir) * 160 * kr;
    }
  } else if (el === "rayo") {
    chispa(p, e, dmg, sinergia?.chispas || 1);
  }
  fxParticulas(e.x, e.y - e.r * 0.4, 4, ELEMENTOS_DAGA[el].color, 2, e.r * 0.4);
}

// Efectos de la sinergia sobre cada enemigo alcanzado por el golpe doble
// (el multiplicador de daño ya va aplicado en el propio golpe).
export function aplicarSinergiaDagas(e, sinergia) {
  if (sinergia.aturde && !e.jefe) e.stunT = Math.max(e.stunT || 0, sinergia.aturde);
}

export function avisoSinergia(p, sinergia) {
  fxTexto(p.x, p.y - 40, "✦ " + sinergia.nombre, "#e9b45c", true);
}
