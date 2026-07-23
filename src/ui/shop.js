// Auto-generated during the modularization refactor (2026-07-23).
import { MEJORAS_TIENDA, META, costeMejora } from "../core/save.js";
import { G } from "../core/state.js";
import { statsTot } from "../systems/combat.js";
import { M } from "../systems/input.js";
import { toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";
import { clamp } from "../utils/helpers.js";

export function abrirTienda() {
        if (!G || !G.activo) return;
        G.pausa = true;
        G.tiendaLock = true;
        const lineas = MEJORAS_TIENDA.map((m) => {
          const niv = META.mejoras[m.id],
            max = niv >= m.max,
            coste = costeMejora(m.id);
          const puntos = Array.from(
            { length: m.max },
            (_, i) => '<span class="' + (i < niv ? "on" : "") + '"></span>',
          ).join("");
          return (
            '<div class="mejora-linea">' +
            '<div class="mejora-info">' +
            "<h4>" +
            m.ico +
            " " +
            m.nombre +
            ' <span style="color:var(--ceniza);font-weight:400;font-size:.72rem">(' +
            m.porNivel +
            " /nivel)</span></h4>" +
            '<div class="m-desc">' +
            m.desc +
            "</div>" +
            '<div class="mejora-niv">' +
            puntos +
            "</div>" +
            "</div>" +
            (max
              ? '<button class="btn" disabled>MÁXIMO</button>'
              : '<button class="btn' +
                (META.oro >= coste ? " dorado" : "") +
                '" ' +
                (META.oro < coste ? "disabled" : "") +
                " onclick=\"comprarMejora('" +
                m.id +
                "')\">" +
                coste +
                " 🪙</button>") +
            "</div>"
          );
        }).join("");
        document.getElementById("tienda-inner").innerHTML =
          '<div class="tienda-cab">' +
          "<h2>🛒 Mercader del Gremio</h2>" +
          '<div class="tienda-oro">Banca: ' +
          META.oro +
          " 🪙</div>" +
          '<p style="color:var(--ceniza);font-size:.8rem;margin-top:4px">Mejoras permanentes: se aplican a todo el grupo en todas las partidas.</p>' +
          "</div>" +
          lineas +
          '<div style="text-align:center;margin-top:14px"><button class="btn dorado" onclick="cerrarTienda()">Cerrar (Esc)</button></div>';
        mostrar("tienda");
      }

function comprarMejora(id) {
        const m = MEJORAS_TIENDA.find((x) => x.id === id);
        if (!m) return;
        if (META.mejoras[id] >= m.max) return;
        const coste = costeMejora(id);
        if (META.oro < coste) return;
        META.oro -= coste;
        META.mejoras[id]++;
        toast(
          "Mejora comprada: " + m.nombre + " Nv." + META.mejoras[id],
          "#ffd27f",
        );
        // curar al nuevo máximo si compraron HP
        for (const p of G.players) p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
        abrirTienda();
      }

export function cerrarTienda() {
        ocultar("tienda");
        if (G) G.pausa = false;
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarTienda = cerrarTienda;
window.comprarMejora = comprarMejora;
