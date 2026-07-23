// Auto-generated during the modularization refactor (2026-07-23).
import { ROLES } from "../core/constants.js";
import { spriteJugador } from "../render/sprites.js";
import { sfx } from "../systems/audio.js";
import { CARD_RAREZAS, sortearCartas } from "../systems/cards.js";
import { statsTot } from "../systems/combat.js";
import { toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";
import { clamp } from "../utils/helpers.js";

export function abrirCartasParaJugador(lista, idx, onDone) {
        if (idx >= lista.length) {
          onDone();
          return;
        }
        const p = lista[idx];
        if (p.cartasPendientes <= 0) {
          abrirCartasParaJugador(lista, idx + 1, onDone);
          return;
        }
        const cartas = sortearCartas(p);
        const contenedor = document.getElementById("cartas-inner");
        contenedor.innerHTML =
          '<div class="cartas-titulo">' +
          '<h2><canvas id="carta-retrato" width="36" height="42"></canvas>' +
          p.nombre +
          " sube de nivel — Elige una mejora</h2>" +
          '<p style="color:' +
          p.color +
          '">Nivel ' +
          p.nivel +
          " · " +
          ROLES[p.rol].nombre +
          " · Elige sabiamente, las demás desaparecerán</p>" +
          "</div>" +
          '<div class="cartas-grid">' +
          cartas
            .map(
              (c, i) => `
      <button class="carta-mejora ${c.rar ? "rar-" + c.rar : ""}" id="carta-${i}" onclick="elegirCarta(${i})">
        <div class="rar-badge">${CARD_RAREZAS.find((r) => r.id === c.rar)?.nombre || c.rar}</div>
        <div class="carta-icono">${c.ico}</div>
        <h3>${c.nombre}</h3>
        <div class="carta-desc">${c.desc}</div>
        <div class="carta-val">${c.val}</div>
      </button>`,
            )
            .join("") +
          "</div>";
        mostrar("cartas-overlay");
        const rc = document.getElementById("carta-retrato");
        if (rc) {
          const g = rc.getContext("2d");
          g.imageSmoothingEnabled = false;
          const img = spriteJugador(p);
          g.drawImage(
            img,
            (36 - img.width * 0.85) / 2,
            (42 - img.height * 0.85) / 2,
            img.width * 0.85,
            img.height * 0.85,
          );
        }
        // guardar contexto en el overlay
        window._cartaCtx = { cartas, p, lista, idx, onDone };
      }

function elegirCarta(i) {
        const { cartas, p, lista, idx, onDone } = window._cartaCtx;
        const c = cartas[i];
        sfx("carta");
        if (c && c.fn) c.fn(p);
        p.cartasElegidas.push({ nombre: c.nombre, rar: c.rar, ico: c.ico });
        p.cartasPendientes--;
        // curar hasta nuevo máximo si HP subió
        p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
        ocultar("cartas-overlay");
        toast(
          p.nombre + " elige: " + c.nombre,
          CARD_RAREZAS.find((r) => r.id === c.rar)?.id === "legendario"
            ? "#e9b45c"
            : "#e9e3d5",
        );
        // siguiente jugador pendiente
        if (p.cartasPendientes > 0) {
          abrirCartasParaJugador(lista, idx, onDone);
        } else {
          abrirCartasParaJugador(lista, idx + 1, onDone);
        }
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.elegirCarta = elegirCarta;
