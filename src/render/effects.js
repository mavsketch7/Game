// Auto-generated during the modularization refactor (2026-07-23).
import { TAU } from "../core/canvas.js";
import { G } from "../core/state.js";
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

export function fxParticulas(x, y, n, col) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU,
            v = rnd(40, 160);
          G.fx.push({
            id: _fxId++,
            tipo: "part",
            x,
            y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            col,
            t: rnd(0.3, 0.6),
            t0: 0.6,
          });
        }
      }
