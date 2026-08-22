// Auto-generated during the modularization refactor (2026-07-23).
import { TAU } from "../core/canvas.js";
import { G } from "../core/state.js";
import { SANGRE_ANIM, SANGRE_DUR } from "./sprites.js";
import { rnd } from "../utils/helpers.js";

// id incremental y estable: net/peer.js lo usa para mandar los fx nuevos al
// invitado por un canal aparte e inmediato (netEnviarEventosFx), en vez de
// esperar a que salgan en el siguiente snapshot completo (~40ms de por
// medio). G.fx además se recorta cada frame en core/loop.js (splice de los
// caducados), así que un índice/longitud de array no serviría para saber
// qué es "nuevo" — el id sí, porque nunca se reutiliza ni se reordena.
let _fxId = 0;

export function fxTexto(x, y, txt, col, grande) {
        G.fx.push({
          id: _fxId++,
          tipo: "txt",
          x,
          y,
          txt: "" + txt,
          col,
          t: 0.9,
          t0: 0.9,
          grande,
        });
      }

export function fxOnda(x, y, r, col) {
        G.fx.push({ id: _fxId++, tipo: "onda", x, y, r, col, t: 0.35, t0: 0.35 });
      }

export function fxTajo(x, y, dir, r) {
        G.fx.push({ id: _fxId++, tipo: "tajo", x, y, dir, r, t: 0.16, t0: 0.16 });
      }

// Puñalada (pícaro, ver CONFIG_ARMA.estocada en render/sprites.js): una
// línea fina que dispara hacia delante y se apaga, no el barrido ancho en
// media luna de fxTajo -- una estocada es recta, no un arco. t un poco más
// corto que fxTajo (golpe más seco/instantáneo).
export function fxEstocada(x, y, dir, r) {
        G.fx.push({ id: _fxId++, tipo: "estocada", x, y, dir, r, t: 0.14, t0: 0.14 });
      }

// Salpicadura de sangre real (torre-vespero-assets/BloodFX Batch 1, ver
// SANGRE_ANIM en render/sprites.js) -- efecto PRINCIPAL de sangre, con la
// dispersión de píxeles de fxParticulas (más abajo) como acompañamiento de
// gotas sueltas alrededor. Variante aleatoria entre las 3 cargadas y flip
// horizontal aleatorio, para que golpe tras golpe no se repita siempre la
// misma silueta. `dirEmpuje` orienta el splat hacia donde sale despedido
// el enemigo (mismo ángulo que el knockback del golpe, ver danoAEnemigo en
// systems/combat.js) -- si no hay empuje (dummy, por ejemplo) cae a un
// ángulo fijo hacia arriba. `escala` normalmente clamp(e.r/32, ...) desde
// el llamador, para que la salpicadura crezca con el tamaño real del
// enemigo en vez de medir siempre lo mismo contra un jefe o un slime.
export function fxSangre(x, y, dirEmpuje, escala) {
        if (!SANGRE_ANIM.length) return; // hoja aún sin cargar (arranque)
        const variante = Math.floor(Math.random() * SANGRE_ANIM.length);
        const dur = SANGRE_DUR[variante] || 0.6;
        G.fx.push({
          id: _fxId++,
          tipo: "sangre",
          x,
          y,
          dir: (dirEmpuje === undefined || Number.isNaN(dirEmpuje)) ? -Math.PI / 2 : dirEmpuje,
          variante,
          flip: Math.random() < 0.5,
          escala: escala || 1,
          t: dur,
          t0: dur,
        });
      }

// size/spread opcionales (por defecto 4px y sin dispersión de origen, el
// comportamiento de siempre -- todos los usos existentes, nivel/moneda/
// portal/muerte, siguen igual sin tocarlos). Pensados para el estallido de
// sangre por golpe (ver danoAEnemigo en systems/combat.js): un enemigo
// grande (jefe/élite) necesita partículas más grandes y repartidas por más
// superficie, no solo más cantidad, o el efecto se pierde contra su sprite.
export function fxParticulas(x, y, n, col, size, spread) {
        const tam = size || 4;
        const disp = spread || 0;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU,
            v = rnd(40, 160);
          G.fx.push({
            id: _fxId++,
            tipo: "part",
            x: x + (disp ? rnd(-disp, disp) : 0),
            y: y + (disp ? rnd(-disp, disp) : 0),
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            col,
            tam,
            t: rnd(0.3, 0.6),
            t0: 0.6,
          });
        }
      }
