// Auto-generated during the modularization refactor (2026-07-23).
import { ETQ, PRECIO_VENTA, RAREZAS } from "../core/constants.js";
import { MEJORAS_TIENDA, META, costeMejora, guardarMeta } from "../core/save.js";
import { G } from "../core/state.js";
import { statsTot } from "../systems/combat.js";
import { M } from "../systems/input.js";
import { genItem } from "../systems/loot.js";
import { toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";
import { clamp } from "../utils/helpers.js";

// Objetos a la venta: 3 piezas de equipo generadas al abrir la tienda (no
// al cada refresco -- comprar una mejora permanente vuelve a llamar
// abrirTienda() y no debe voltear la oferta bajo los pies del jugador).
// Se renuevan solas la próxima vez que se abra la tienda tras cerrarla.
let ofertaTienda = null;

function precioCompra(rareza) {
        return Math.round(PRECIO_VENTA[rareza] * 3);
      }

function lineaOferta(it, idx) {
        const rar = RAREZAS[it.rareza];
        const coste = precioCompra(it.rareza);
        const stats = Object.entries(it.stats)
          .map(([k, v]) => "+" + v + " " + ETQ[k])
          .join(" · ");
        return (
          '<div class="mejora-linea">' +
          '<div class="mejora-info">' +
          "<h4>" +
          it.slot +
          ' · <span class="' +
          rar.cls +
          '">' +
          rar.n +
          "</span></h4>" +
          '<div class="m-desc ' +
          rar.cls +
          '" style="font-weight:600">' +
          it.nombre +
          "</div>" +
          '<div class="m-desc">' +
          stats +
          "</div>" +
          "</div>" +
          '<button class="btn' +
          (META.oro >= coste ? " dorado" : "") +
          '" ' +
          (META.oro < coste ? "disabled" : "") +
          ' onclick="comprarObjeto(' +
          idx +
          ')">' +
          coste +
          " 🪙</button>" +
          "</div>"
        );
      }

export function abrirTienda() {
        if (!G || !G.activo) return;
        G.pausa = true;
        G.tiendaLock = true;
        if (!ofertaTienda) {
          const f = Math.max(1, G.planta || 1);
          ofertaTienda = [genItem(f), genItem(f), genItem(f)];
        }
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
        const ofertaLineas = ofertaTienda.length
          ? ofertaTienda.map(lineaOferta).join("")
          : '<p style="color:var(--ceniza);font-size:.8rem">Vuelve más tarde para ver objetos nuevos.</p>';
        document.getElementById("tienda-inner").innerHTML =
          '<div class="tienda-cab">' +
          "<h2>🛒 Mercader del Gremio</h2>" +
          '<div class="tienda-oro">Banca: ' +
          META.oro +
          " 🪙</div>" +
          '<p style="color:var(--ceniza);font-size:.8rem;margin-top:4px">Mejoras permanentes: se aplican a todo el grupo en todas las partidas.</p>' +
          "</div>" +
          lineas +
          '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">🎒 Objetos del día</h3>' +
          '<p style="color:var(--ceniza);font-size:.75rem;margin-bottom:6px">Van a la bolsa del personaje seleccionado en la ficha. Se renuevan al volver a entrar.</p>' +
          ofertaLineas +
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
        guardarMeta();
        toast(
          "Mejora comprada: " + m.nombre + " Nv." + META.mejoras[id],
          "#ffd27f",
        );
        // curar al nuevo máximo si compraron HP
        for (const p of G.players) p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
        abrirTienda();
      }

function comprarObjeto(idx) {
        const it = ofertaTienda[idx];
        if (!it) return;
        const coste = precioCompra(it.rareza);
        if (META.oro < coste) return;
        const p = G.players[G.invSel] || G.players[0];
        if (!p) return;
        META.oro -= coste;
        guardarMeta();
        p.bolsa.push(it);
        ofertaTienda.splice(idx, 1);
        toast(p.nombre + " compra " + it.nombre, RAREZAS[it.rareza].col);
        abrirTienda();
      }

export function cerrarTienda() {
        ocultar("tienda");
        ofertaTienda = null;
        if (G) G.pausa = false;
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarTienda = cerrarTienda;
window.comprarObjeto = comprarObjeto;
window.comprarMejora = comprarMejora;
