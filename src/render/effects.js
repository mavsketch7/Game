// Auto-generated during the modularization refactor (2026-07-23).
import { TAU } from "../core/canvas.js";
import { G } from "../core/state.js";
import { SANGRE_ANIM, SANGRE_DUR, seleccionarImgEnemigo } from "./sprites.js";
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
        G.fx.push({ id: _fxId++, tipo: "tajo", x, y, dir, r, t: 0.22, t0: 0.22 });
      }

// Puñalada (pícaro, ver CONFIG_ARMA.estocada en render/sprites.js): una
// línea fina que dispara hacia delante y se apaga, no el barrido ancho en
// media luna de fxTajo -- una estocada es recta, no un arco. t un poco más
// corto que fxTajo (golpe más seco/instantáneo).
export function fxEstocada(x, y, dir, r) {
        G.fx.push({ id: _fxId++, tipo: "estocada", x, y, dir, r, t: 0.18, t0: 0.18 });
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

// Muestrea los píxeles opacos de `img` (ya sea un <img> o un <canvas> --
// los frames de sprites en este proyecto son casi todos canvases, ver
// cargarHojaFrames/buildSprite en render/sprites.js) y devuelve su offset
// respecto al CENTRO del sprite (en espacio de mundo, ya multiplicado por
// `escala` y con el flip aplicado) más el color real de ese píxel -- para
// que la desintegración use los colores propios del enemigo en vez de un
// color plano inventado. `stride` limita el número de muestras: como mucho
// ~15 por lado, de sobra para leerse como "se hace pedazos" sin empujar
// cientos de fx nuevos de golpe (un enemigo grande no debe costar más que
// uno pequeño solo por tener más píxeles de origen).
function muestrearPixelesSprite(img, escala, flip) {
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (!w || !h) return [];
        const tmp = document.createElement("canvas");
        tmp.width = w;
        tmp.height = h;
        const g = tmp.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.drawImage(img, 0, 0, w, h);
        let data;
        try {
          data = g.getImageData(0, 0, w, h).data;
        } catch {
          return []; // por si algún día hay una imagen cross-origin sin CORS
        }
        const stride = Math.max(1, Math.round(Math.max(w, h) / 15));
        const puntos = [];
        for (let py = 0; py < h; py += stride) {
          for (let px = 0; px < w; px += stride) {
            const idx = (py * w + px) * 4;
            if (data[idx + 3] < 80) continue; // solo píxeles bien opacos, no el borde antialiaseado
            puntos.push({
              ox: (px - w / 2) * (flip ? -1 : 1) * escala,
              oy: (py - h / 2) * escala,
              col: `rgb(${data[idx]},${data[idx + 1]},${data[idx + 2]})`,
            });
          }
        }
        return puntos;
      }

// Desintegración en píxeles al morir (ver seleccionarImgEnemigo en
// render/sprites.js -- MISMO sprite que se estaba dibujando, para que la
// nube se parezca de verdad al enemigo que acaba de caer). Reutiliza el
// tipo de fx "part" (ya se dibuja como un cuadradito de color, exactamente
// lo que hace falta aquí) pero con un origen/color por MUESTRA real de la
// imagen -- no un burst uniforme de color plano desde un único punto, como
// hace fxParticulas. `flip` es opcional (por defecto sin voltear): el
// llamador puede pasar la orientación real del enemigo si la tiene a mano
// (ver matarEnemigo en systems/combat.js), pero no es crítico -- una nube
// que se dispersa hacia fuera se lee bien igual mirando a cualquier lado.
export function fxDesintegrarEnemigo(e, flip) {
        const sel = seleccionarImgEnemigo(e);
        if (!sel || !sel.img) return;
        const puntos = muestrearPixelesSprite(sel.img, sel.esc || 1, !!flip);
        if (!puntos.length) return;
        const ox0 = e.x, oy0 = e.y - (e.r || 14) * 0.3;
        for (const pt of puntos) {
          const dist = Math.hypot(pt.ox, pt.oy) || 1;
          const ang = Math.atan2(pt.oy, pt.ox) + rnd(-0.35, 0.35);
          // los píxeles más externos del sprite (dist mayor) salen
          // despedidos más lejos -- se lee más como una explosión desde
          // dentro que como un temblor uniforme.
          const v = rnd(25, 70) + dist * 0.7;
          G.fx.push({
            id: _fxId++,
            tipo: "part",
            x: ox0 + pt.ox,
            y: oy0 + pt.oy,
            vx: Math.cos(ang) * v,
            vy: Math.sin(ang) * v - 25, // leve impulso hacia arriba antes de dispersarse
            col: pt.col,
            tam: rnd(2, 3.5),
            t: rnd(0.5, 0.9),
            t0: 0.9,
          });
        }
      }
