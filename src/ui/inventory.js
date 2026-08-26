// Auto-generated during the modularization refactor (2026-07-23).
import { ETQ, FORMAS_INFO, MAX_NIV_PJ, PRECIO_VENTA, RAREZAS, ROLES, SLOTS, SLOT_LABEL } from "../core/constants.js";
import { abandonarPartida } from "../core/gameflow.js";
import { META } from "../core/save.js";
import { G } from "../core/state.js";
import { fxOnda, fxParticulas } from "../render/effects.js";
import { iconoDrop } from "../render/sprites.js";
import { CARD_RAREZAS } from "../systems/cards.js";
import { statsTot } from "../systems/combat.js";
import { M } from "../systems/input.js";
import { genItem } from "../systems/loot.js";
import { genObjetoMitico } from "../systems/objetosMiticos.js";
import {
  ALMA_COLS,
  ALMA_TOTAL,
  colocarFragmento,
  conexionesActivas,
  costeCasillaAlma,
  desbloquearCasillaAlma,
  fragPorId,
  idxAXY,
  mapaOcupacion,
  puedeDesbloquearCasilla,
  quitarFragmento,
} from "../systems/soul.js";
import { banner, toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";
import { clamp } from "../utils/helpers.js";

function escHtml(s) {
        return String(s ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
        );
      }

// ---- Pestañas del panel de ficha (Personaje/Equipamiento/Estadísticas/
// Mapa) -- estado puramente de interfaz, no de partida: vive aquí como
// variable de módulo (igual que padFoco en systems/input.js) en vez de en
// G, porque no hace falta sincronizarla por red ni guardarla.
const PESTANAS_INV = [
        { id: "personaje", ico: "🧑", nombre: "Personaje" },
        { id: "herreria", ico: "⚒", nombre: "Herrería" },
        { id: "alma", ico: "🔮", nombre: "Alma" },
        { id: "mapa", ico: "🗺", nombre: "Mapa" },
        { id: "ajustes", ico: "⚙", nombre: "Ajustes" },
      ];
let invTab = "personaje";
// objeto de la bolsa seleccionado en la pestaña Equipamiento (-1 = ninguno)
let idxSel = -1;
// uid del fragmento de la bolsa de Alma elegido para colocar (null = ninguno)
let fragSel = null;

export function cambiarPestanaInv(dir) {
        const i = PESTANAS_INV.findIndex((t) => t.id === invTab);
        const n = PESTANAS_INV.length;
        invTab = PESTANAS_INV[(((i + dir) % n) + n) % n].id;
        idxSel = -1;
        fragSel = null;
        abrirInv();
      }

function irPestanaInv(id) {
        invTab = id;
        idxSel = -1;
        fragSel = null;
        abrirInv();
      }

function selItemInv(idx) {
        idxSel = idxSel === idx ? -1 : idx;
        abrirInv();
      }

// Ranking en vivo de la sesión actual (punto 5 de la mejora de UX
// multijugador): quién más daño/bajas/parries lleva, con su nombre y
// gremio elegidos. No depende de red: cada jugador (local u online) ya
// trae su propio nombre/gremio resuelto en G.players desde el lobby.
// Mapa de la planta actual (solo plantas normales -- las de jefe son una
// única sala y no tienen G.mazmorra, ver iniciarPlanta en floorgen.js).
// Una sala se considera "conocida" si ya se visitó o si es vecina directa
// de una visitada (sus puertas ya se ven en pantalla al estar dentro) --
// no se revela la mazmorra entera de golpe, solo lo que el grupo ya pudo
// ver por sí mismo.
function minimapaPlanta() {
        if (!G.mazmorra) return "";
        const salas = G.mazmorra.salas;
        const conocidas = new Set();
        for (const s of salas)
          if (s.visitada) {
            conocidas.add(s.id);
            for (const pu of s.puertas) conocidas.add(pu.destino);
          }
        const celdas = [];
        for (let gy = 0; gy < 3; gy++)
          for (let gx = 0; gx < 3; gx++) {
            const s = salas.find((x) => x.gx === gx && x.gy === gy);
            if (!s || !conocidas.has(s.id)) {
              celdas.push('<div class="mini-celda vacia"></div>');
              continue;
            }
            const actual = s.id === G.mazmorra.salaActualId;
            const ico = s.esFinal ? "★" : s.esInicial ? "▲" : "";
            celdas.push(
              '<div class="mini-celda' +
                (actual ? " actual" : s.visitada ? " visitada" : " conocida") +
                '" title="' +
                (s.esFinal ? "Sala final" : "Sala " + (s.id + 1)) +
                '">' +
                ico +
                "</div>",
            );
          }
        return (
          '<h3 style="margin-top:0;font-size:.85rem;color:var(--vespero)">🗺 Mapa de la planta</h3>' +
          '<div class="minimapa">' +
          celdas.join("") +
          "</div>" +
          '<div style="font-size:.68rem;color:var(--ceniza);margin-top:4px">▲ entrada · ★ sala final · solo se ve lo que ya habéis explorado</div>'
        );
      }

function rankingSesion() {
        const filas = G.players
          .slice()
          .sort((a, b) => (b.statDano || 0) - (a.statDano || 0))
          .map(
            (q, i) =>
              '<div class="rank-fila"><span class="rank-pos">#' +
              (i + 1) +
              '</span><span class="rank-jugador"><span class="rank-nombre" style="color:' +
              q.color +
              '">' +
              escHtml(q.nombre) +
              "</span>" +
              (q.gremio
                ? '<span class="rank-gremio">🛡 ' + escHtml(q.gremio) + "</span>"
                : "") +
              "</span>" +
              '<span class="rank-stat" title="Daño total">⚔ ' +
              Math.round(q.statDano || 0) +
              '</span><span class="rank-stat" title="Enemigos derrotados">☠ ' +
              (q.statDerrotados || 0) +
              '</span><span class="rank-stat" title="Parries exitosos">🛡‍⚔ ' +
              (q.statParries || 0) +
              "</span></div>",
          )
          .join("");
        const header =
          '<div class="rank-fila rank-header"><span class="rank-pos">#</span>' +
          '<span class="rank-jugador">Jugador</span>' +
          '<span class="rank-stat" title="Daño total">⚔ Daño</span>' +
          '<span class="rank-stat" title="Enemigos derrotados">☠ Bajas</span>' +
          '<span class="rank-stat" title="Parries exitosos">🛡‍⚔ Parries</span></div>';
        return (
          '<div class="ranking-sesion"><h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">🏆 Ranking de la sesión</h3>' +
          header +
          filas +
          "</div>"
        );
      }

// Estadística de la ficha de personaje con icono y, cuando el stat tiene un
// techo natural (vida actual/máxima, % de crítico, % de CDR), una barrita
// de progreso -- daño/armadura/velocidad no tienen techo fijo (crecen sin
// límite con equipo) así que se quedan solo en número para no dar una
// lectura visual engañosa.
function fichaStat(ico, etq, valor, pct) {
        const barra =
          pct == null
            ? ""
            : '<div class="ficha-stat-bar"><div style="width:' +
              clamp(pct, 0, 100) +
              '%"></div></div>';
        return (
          '<div class="ficha-stat">' +
          ico +
          " " +
          etq +
          "<b>" +
          valor +
          "</b>" +
          barra +
          "</div>"
        );
      }

function fmtStats(st) {
        return Object.entries(st)
          .map(([k, v]) => "+" + v + " " + ETQ[k])
          .join(" · ");
      }

// Compara los stats de un objeto de la bolsa contra el equipado en su mismo
// slot: cada línea lleva el valor absoluto y, si hay algo equipado con lo
// que comparar, un delta en verde/rojo -- así se ve de un vistazo si es una
// mejora sin tener que hacer la resta a mano.
function fmtStatsComparativo(it, actual) {
        const claves = new Set(Object.keys(it.stats));
        if (actual) for (const k in actual.stats) claves.add(k);
        return [...claves]
          .map((k) => {
            const v = it.stats[k] || 0;
            let delta = "";
            if (actual) {
              const d = v - (actual.stats[k] || 0);
              if (d !== 0)
                delta =
                  ' <span style="color:' +
                  (d > 0 ? "#5fcf8f" : "#e0707a") +
                  '">(' +
                  (d > 0 ? "+" : "") +
                  d +
                  ")</span>";
            }
            return "+" + v + " " + ETQ[k] + delta;
          })
          .join(" · ");
      }

function totalPoder(st) {
        return Object.values(st || {}).reduce((a, b) => a + b, 0);
      }

function precioVenta(it) {
        return Math.round(PRECIO_VENTA[it.rareza] * (1 + 0.1 * META.mejoras.fortuna));
      }

// ---- Resumen de impacto en estadísticas (▲/▼ por stat) para la celda de
// la cuadrícula y el tooltip -- comparado contra lo que ya lleva puesto el
// personaje en ese mismo slot (null si el slot está vacío, en cuyo caso
// todo cuenta como ganancia).
const ETQ_CORTA = { atk: "ATK", hp: "HP", armor: "DEF", crit: "CRIT", vel: "VEL", cdr: "CDR" };

function impactoStats(it, actual) {
        const claves = new Set(Object.keys(it.stats));
        if (actual) for (const k in actual.stats) claves.add(k);
        const partes = [];
        for (const k of claves) {
          const v = it.stats[k] || 0;
          const base = actual ? actual.stats[k] || 0 : 0;
          const d = v - base;
          if (d !== 0) partes.push({ k, d });
        }
        partes.sort((a, b) => b.d - a.d);
        return partes;
      }

function impactoResumenHtml(partes) {
        if (!partes.length) return '<span class="impacto-igual">= igual</span>';
        return partes
          .map(
            ({ k, d }) =>
              '<span class="impacto-' +
              (d > 0 ? "up" : "down") +
              '">' +
              (d > 0 ? "▲" : "▼") +
              (ETQ_CORTA[k] || k) +
              "</span>",
          )
          .join(" ");
      }

function impactoDetalleHtml(partes) {
        if (!partes.length)
          return '<div class="tt-stat-linea igual">Sin cambio de estadísticas</div>';
        return partes
          .map(
            ({ k, d }) =>
              '<div class="tt-stat-linea ' +
              (d > 0 ? "up" : "down") +
              '">' +
              (d > 0 ? "▲ +" + d : "▼ " + d) +
              " " +
              ETQ[k] +
              "</div>",
          )
          .join("");
      }

function iconoUrl(it) {
        return iconoDrop(it).toDataURL();
      }

// Celda de la cuadrícula de inventario: icono por tipo de objeto (ver
// iconoDrop en render/sprites.js), color de borde por rareza, resumen
// corto de impacto en stats y, al pasar el cursor, un tooltip con la
// descripción completa (efecto especial + todas las estadísticas con
// indicador de mejora/empeoramiento vs. lo ya equipado).
function celdaItem(it, idx, p, equipada) {
        const rar = RAREZAS[it.rareza];
        const actual = equipada ? null : p.equipo[it.slot];
        const partes = impactoStats(it, actual);
        let tagClase = "";
        if (it.slot === "arma" && it.clase) {
          tagClase = ROLES[it.clase].nombre.split(" ")[0];
        }
        const seleccionada = !equipada && idx === idxSel;
        const etiquetaSlot = SLOT_LABEL[it.slot] || it.slot;
        return (
          '<div class="item-cell ' +
          rar.cls +
          (seleccionada ? " seleccionada" : "") +
          '" style="border-color:' +
          rar.col +
          '"' +
          (equipada
            ? ""
            : ' draggable="true" ondragstart="arrastrarItemInicio(event,' +
              idx +
              ')" ondragend="arrastrarItemFin(event)" onclick="selItemInv(' +
              idx +
              ')"') +
          ">" +
          '<img class="item-cell-ico" src="' +
          iconoUrl(it) +
          '" alt="" />' +
          '<div class="item-cell-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          '<div class="item-cell-tipo">' +
          etiquetaSlot +
          (tagClase ? " · " + tagClase : "") +
          "</div>" +
          '<div class="item-cell-impacto">' +
          impactoResumenHtml(partes) +
          "</div>" +
          '<div class="item-tooltip">' +
          '<div class="tt-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          '<div class="tt-slot">' +
          etiquetaSlot +
          (tagClase ? " · " + tagClase : "") +
          ' · <span class="' +
          rar.cls +
          '">' +
          rar.n +
          "</span></div>" +
          (it.efectoDesc
            ? '<div class="tt-efecto">✦ ' + escHtml(it.efectoDesc) + "</div>"
            : "") +
          (typeof it.kills === "number"
            ? '<div class="tt-efecto">🗡 ' + it.kills + " kills con esta arma</div>"
            : "") +
          impactoDetalleHtml(partes) +
          "</div>" +
          "</div>"
        );
      }

// Misma rareza Y mismo slot (y misma clase si es arma) -- ver
// gruposFusionables() para el porqué: los 7 slots no son intercambiables
// entre sí aunque compartan rareza (un casco y un collar Épicos no fusionan).
function mismoGrupoFusion(a, b) {
        if (a.rareza !== b.rareza || a.slot !== b.slot) return false;
        if (a.slot === "arma" && a.clase !== b.clase) return false;
        return true;
      }

function fusBtnItem(it, idx, p) {
        if (it.rareza >= 4) return ""; // Mítico es el techo, no se fusiona más
        const dentro = p.fusionSel.includes(it);
        if (dentro)
          return (
            '<button class="btn-fus dentro" onclick="togFusion(' +
            idx +
            ')">⚗ quitar</button>'
          );
        if (p.fusionSel.length >= 3) return "";
        if (p.fusionSel.length > 0 && !mismoGrupoFusion(p.fusionSel[0], it))
          return "";
        return (
          '<button class="btn-fus" onclick="togFusion(' +
          idx +
          ')">⚗ fusión</button>'
        );
      }

function togFusion(idx) {
        const p = G.players[G.invSel] || G.players[0];
        const it = p.bolsa[idx];
        if (!it) return;
        const pos = p.fusionSel.indexOf(it);
        if (pos >= 0) p.fusionSel.splice(pos, 1);
        else if (
          p.fusionSel.length < 3 &&
          (p.fusionSel.length === 0 || mismoGrupoFusion(p.fusionSel[0], it))
        )
          p.fusionSel.push(it);
        abrirInv();
      }

function filtrarBolsa(slot) {
        const p = G.players[G.invSel] || G.players[0];
        p.filtroBolsa = slot;
        idxSel = -1;
        abrirInv();
      }

const ORDEN_BOLSA = ["rareza", "slot", "valor"];

function ordenarBolsa(crit) {
        const p = G.players[G.invSel] || G.players[0];
        p.ordenBolsa = crit || p.ordenBolsa || "rareza";
        const slotIdx = (s) => SLOTS.indexOf(s);
        const suma = (it) =>
          Object.values(it.stats || {}).reduce((a, b) => a + b, 0);
        if (p.ordenBolsa === "rareza")
          p.bolsa.sort(
            (a, b) => b.rareza - a.rareza || slotIdx(a.slot) - slotIdx(b.slot),
          );
        else if (p.ordenBolsa === "slot")
          p.bolsa.sort(
            (a, b) => slotIdx(a.slot) - slotIdx(b.slot) || b.rareza - a.rareza,
          );
        else p.bolsa.sort((a, b) => suma(b) - suma(a));
        idxSel = -1;
        abrirInv();
      }

function gruposFusionables(p) {
        const grupos = {};
        for (const it of p.bolsa) {
          if (it.rareza >= 4) continue; // Mítico es el techo, no se fusiona más
          // agrupar por rareza y por slot -- las armas además por clase para
          // no mezclar clases al evolucionar. Antes armadura y accesorio caían
          // en la misma clave ("x"), así que la fusión rápida podía juntar
          // p.ej. 2 armaduras + 1 accesorio de la misma rareza como si fueran
          // "3 del mismo tipo" y fusionarlos igualmente, perdiendo el
          // accesorio como relleno sin avisar.
          const clave =
            it.rareza +
            "|" +
            (it.slot === "arma" ? "arma:" + (it.clase || "") : it.slot);
          (grupos[clave] = grupos[clave] || []).push(it);
        }
        return grupos;
      }

function contarFusionesRapidas(p) {
        let n = 0;
        const g = gruposFusionables(p);
        for (const k in g) n += Math.floor(g[k].length / 3);
        return n;
      }

function fusionRapida() {
        const p = G.players[G.invSel] || G.players[0];
        const g = gruposFusionables(p);
        // preferir la rareza más alta disponible que tenga 3+
        let mejor = null,
          mejorRar = -1;
        for (const k in g) {
          if (g[k].length >= 3) {
            const rar = parseInt(k.split("|")[0]);
            if (rar > mejorRar) {
              mejorRar = rar;
              mejor = g[k];
            }
          }
        }
        if (!mejor) {
          toast("No hay 3 objetos de la misma rareza para fusionar", "#c9a35a");
          return;
        }
        p.fusionSel = mejor.slice(0, 3);
        fusionar();
      }

function fusionar() {
        const p = G.players[G.invSel] || G.players[0];
        if (p.fusionSel.length !== 3) return;
        const rarF = p.fusionSel[0].rareza;
        const base = p.fusionSel[0];
        // sacar los 3 de la bolsa
        for (const it of p.fusionSel) {
          const i = p.bolsa.indexOf(it);
          if (i >= 0) p.bolsa.splice(i, 1);
        }
        idxSel = -1;
        if (rarF < 3) {
          // evolución garantizada a la rareza superior, conservando el slot del primero
          const nuevo = genItem(Math.max(1, G.planta), rarF + 1, base.slot);
          if (base.slot === "arma") nuevo.clase = base.clase;
          // las armas Legendarias ganadas por fusión (no las que caen
          // sueltas del loot normal) llevan contador de kills, igual que
          // las Míticas -- ver systems/soul.js: desmantelarArma().
          if (nuevo.slot === "arma" && nuevo.rareza === 3) nuevo.kills = 0;
          p.bolsa.push(nuevo);
          fxOnda(p.x, p.y, 40, RAREZAS[rarF + 1].col);
          fxParticulas(p.x, p.y, 14, RAREZAS[rarF + 1].col);
          toast(
            "⚗️ ¡Fusión! Nace " +
              nuevo.nombre +
              " [" +
              RAREZAS[rarF + 1].n +
              "]",
            RAREZAS[rarF + 1].col,
          );
        } else if (rarF === 3) {
          // fusión legendaria: única vía (junto al drop rarísimo al romper
          // pilares/barriles, ver systems/combat.js) para conseguir un
          // objeto Mítico. Antes esto daba un 30% de una "reliquia" con
          // todos los stats sumados; ahora ese 30% baja a ~13% (sigue
          // siendo un objeto curado de systems/objetosMiticos.js, no un
          // simple sumatorio) para que el techo de la progresión siga
          // sintiéndose especial sin ser inalcanzable.
          if (Math.random() < 0.13) {
            const nuevo = genObjetoMitico(Math.max(1, G.planta), base.slot);
            p.bolsa.push(nuevo);
            G.shake = Math.max(G.shake, 8);
            fxOnda(p.x, p.y, 80, "#ff5a36");
            fxOnda(p.x, p.y, 50, "#fff0c8");
            fxParticulas(p.x, p.y, 30, "#ff5a36");
            banner("✦ ¡LA FUSIÓN LEGENDARIA SOBREVIVE! ✦");
            toast("Nace " + nuevo.nombre + " [Mítico]", "#ff5a36");
          } else {
            G.shake = Math.max(G.shake, 6);
            fxParticulas(p.x, p.y, 24, "#57496f");
            fxOnda(p.x, p.y, 60, "#d1545c");
            banner(
              "✝ La fusión colapsa: los tres legendarios se desintegran ✝",
            );
            toast("El poder era demasiado. Cenizas.", "#d1545c");
          }
        }
        p.fusionSel = [];
        abrirInv();
      }

// ---- Contenido de cada pestaña ----

// Celda de un slot de equipo en la columna "paper doll" de la Ficha de
// Personaje -- distinta de celdaItem() (pensada para la rejilla de la
// bolsa): compacta, con drop-target de arrastrar-y-soltar (ver
// arrastrarItemInicio/soltarEnSlot más abajo) y tooltip con los stats
// propios del objeto ya equipado (sin comparación, no hay nada que
// comparar contra sí mismo).
function celdaSlotEquipo(slot, p) {
        const it = p.equipo[slot];
        const label = SLOT_LABEL[slot] || slot;
        const dropAttrs =
          ' ondragover="permitirSoltar(event)" ondragleave="quitarResaltadoSlot(event)" ondrop="soltarEnSlot(event,\'' +
          slot +
          '\')"';
        if (!it) {
          return (
            '<div class="eq-slot vacio"' +
            dropAttrs +
            ">" +
            '<div class="eq-slot-info"><div class="eq-slot-label">' +
            label +
            '</div><div class="eq-slot-nombre" style="color:var(--ceniza);font-weight:400">Vacío</div></div>' +
            "</div>"
          );
        }
        const rar = RAREZAS[it.rareza];
        return (
          '<div class="eq-slot" style="border-color:' +
          rar.col +
          '"' +
          dropAttrs +
          ">" +
          '<img class="eq-slot-ico" src="' +
          iconoUrl(it) +
          '" alt="" />' +
          '<div class="eq-slot-info">' +
          '<div class="eq-slot-label">' +
          label +
          "</div>" +
          '<div class="eq-slot-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          "</div>" +
          '<div class="item-tooltip">' +
          '<div class="tt-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          '<div class="tt-slot">' +
          label +
          ' · <span class="' +
          rar.cls +
          '">' +
          rar.n +
          "</span></div>" +
          (it.efectoDesc
            ? '<div class="tt-efecto">✦ ' + escHtml(it.efectoDesc) + "</div>"
            : "") +
          (typeof it.kills === "number"
            ? '<div class="tt-efecto">🗡 ' + it.kills + " kills con esta arma</div>"
            : "") +
          '<div class="tt-stat-linea">' +
          fmtStats(it.stats) +
          "</div>" +
          "</div>" +
          "</div>"
        );
      }

function filtroCtrlHtml(p) {
        const filtro = p.filtroBolsa || "todos";
        return (
          '<div style="display:flex;gap:6px;align-items:center;margin:2px 0 8px;flex-wrap:wrap">' +
          '<span style="font-size:.75rem;color:var(--ceniza)">Filtrar:</span>' +
          '<div class="seg">' +
          [["Todo", "todos"], ...SLOTS.map((s) => [SLOT_LABEL[s] || s, s])]
            .map(
              ([lab, v]) =>
                '<button class="' +
                (filtro === v ? "on" : "") +
                '" onclick="filtrarBolsa(\'' +
                v +
                "')\">" +
                lab +
                "</button>",
            )
            .join("") +
          "</div></div>"
        );
      }

function ordCtrlHtml(p) {
        const ord = p.ordenBolsa || "rareza";
        return (
          '<div style="display:flex;gap:6px;align-items:center;margin:10px 0 2px;flex-wrap:wrap">' +
          '<span style="font-size:.75rem;color:var(--ceniza)">Ordenar:</span>' +
          '<div class="seg">' +
          [
            ["Rareza", "rareza"],
            ["Tipo", "slot"],
            ["Poder", "valor"],
          ]
            .map(
              ([lab, v]) =>
                '<button class="' +
                (ord === v ? "on" : "") +
                '" onclick="ordenarBolsa(\'' +
                v +
                "')\">" +
                lab +
                "</button>",
            )
            .join("") +
          "</div></div>"
        );
      }

function tabPersonaje(p, t, b) {
        const xpPct =
          p.nivel >= MAX_NIV_PJ ? 100 : Math.round((p.xp / p.xpSig) * 100);
        const chips = p.cartasElegidas.length
          ? p.cartasElegidas
              .map((c) => {
                const rc = CARD_RAREZAS.find((r) => r.id === c.rar);
                const col =
                  {
                    normal: "#9a93ab",
                    magico: "#6fb3e8",
                    raro: "#4acca0",
                    epico: "#c084f0",
                    legendario: "#e9b45c",
                  }[c.rar] || "#9a93ab";
                return (
                  '<span class="chip-mejora" style="color:' +
                  col +
                  '">' +
                  c.ico +
                  " " +
                  c.nombre +
                  "</span>"
                );
              })
              .join("")
          : '<span style="color:var(--ceniza);font-size:.72rem">Ninguna todavía — sube de nivel</span>';
        const slotsHtml = SLOTS.map((s) => celdaSlotEquipo(s, p)).join("");
        const statsHtml =
          fichaStat("⚔", "Daño", t.atk, null) +
          fichaStat(
            "❤",
            "Vida",
            Math.ceil(p.hp) + " / " + t.hpMax,
            (p.hp / t.hpMax) * 100,
          ) +
          fichaStat("🛡", "Armadura", t.armor, null) +
          fichaStat("🎯", "Crítico", t.crit + "%", (t.crit / 85) * 100) +
          fichaStat("💨", "Velocidad", t.vel, null) +
          fichaStat("⏱", "Red. CD", t.cdr + "%", (t.cdr / 55) * 100);
        return (
          '<div class="ficha-cab">' +
          '<div class="ficha-datos">' +
          '<h3 style="color:' +
          p.color +
          '">' +
          escHtml(p.nombre) +
          ' <span style="color:var(--ceniza);font-weight:400;font-size:.85rem">' +
          b.nombre +
          "</span></h3>" +
          '<div class="ficha-nivel">Nivel ' +
          p.nivel +
          " / " +
          MAX_NIV_PJ +
          (p.rol === "druida"
            ? ' · <span style="color:' +
              FORMAS_INFO[p.forma].color +
              '">' +
              FORMAS_INFO[p.forma].ico +
              " " +
              FORMAS_INFO[p.forma].nombre +
              "</span>"
            : "") +
          (p.cartasPendientes > 0
            ? ' · <span style="color:#ffd27f">★ ' +
              p.cartasPendientes +
              " tarjeta(s) pendiente(s)</span>"
            : "") +
          "</div>" +
          '<div class="ficha-xpbar"><div style="width:' +
          xpPct +
          '%"></div></div>' +
          '<div style="font-size:.68rem;color:var(--ceniza);margin-top:2px">' +
          (p.nivel >= MAX_NIV_PJ
            ? "NIVEL MÁXIMO"
            : p.xp + " / " + p.xpSig + " XP") +
          "</div>" +
          "</div>" +
          "</div>" +
          '<div class="ficha-libro-top">' +
          '<div class="ficha-libro-slots">' +
          slotsHtml +
          "</div>" +
          '<div class="ficha-libro-preview"><canvas id="ficha-retrato" width="160" height="180"></canvas></div>' +
          '<div class="ficha-libro-stats">' +
          statsHtml +
          "</div>" +
          "</div>" +
          '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">Mejoras de nivel (' +
          p.cartasElegidas.length +
          ")</h3>" +
          '<div class="chips-mejoras">' +
          chips +
          "</div>" +
          '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">Bolsa de ' +
          escHtml(p.nombre) +
          " (" +
          p.bolsa.length +
          ")</h3>" +
          filtroCtrlHtml(p) +
          ordCtrlHtml(p) +
          gridBolsa(p) +
          panelAccionItem(p) +
          rankingSesion()
        );
      }

function tabMapa() {
        const mm = minimapaPlanta();
        return (
          mm ||
          '<p style="color:var(--ceniza)">Sin mapa en esta sala (las plantas de jefe son una única sala).</p>'
        );
      }

// ---- Pestaña Alma (Fragmentos, ver systems/soul.js) ----

const DIR_FLECHA = { N: "↑", S: "↓", E: "→", W: "←" };

function fmtStatsFrag(stat) {
        return Object.entries(stat)
          .map(([k, v]) => "+" + v + " " + (ETQ_CORTA[k] || k))
          .join(" · ");
      }

// Miniatura de la forma del fragmento (bounding box en casillas) para la
// lista de la bolsa -- igual de útil que un número para saber si un
// fragmento de 3 casillas en L va a caber en el hueco que te queda.
function miniFormaHtml(frag) {
        const xs = frag.forma.map(([dx]) => dx),
          ys = frag.forma.map(([, dy]) => dy);
        const minX = Math.min(...xs),
          maxX = Math.max(...xs),
          minY = Math.min(...ys),
          maxY = Math.max(...ys);
        const w = maxX - minX + 1,
          h = maxY - minY + 1;
        const ocupadas = new Set(
          frag.forma.map(([dx, dy]) => dx - minX + "," + (dy - minY)),
        );
        let celdas = "";
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            celdas +=
              '<div class="mini-frag-cel' +
              (ocupadas.has(x + "," + y) ? " on" : "") +
              '"></div>';
        return (
          '<div class="mini-frag" style="grid-template-columns:repeat(' +
          w +
          ',1fr)">' +
          celdas +
          "</div>"
        );
      }

function fragEnBolsaLinea(f) {
        const frag = fragPorId(f.fragId);
        if (!frag) return "";
        const rar = RAREZAS[frag.rareza];
        const seleccionado = fragSel === f.uid;
        return (
          '<div class="frag-item ' +
          rar.cls +
          (seleccionado ? " seleccionada" : "") +
          '" style="border-color:' +
          rar.col +
          '" onclick="seleccionarFragAlma(\'' +
          f.uid +
          "')\">" +
          '<div class="frag-item-cab"><span class="frag-item-ico">' +
          frag.ico +
          "</span>" +
          miniFormaHtml(frag) +
          "</div>" +
          '<div class="frag-item-nombre ' +
          rar.cls +
          '">' +
          escHtml(frag.nombre) +
          "</div>" +
          '<div class="frag-item-desc">' +
          fmtStatsFrag(frag.stat) +
          "</div>" +
          (frag.bonusConexion
            ? '<div class="frag-item-conexion">🔗 si conecta: +' +
              fmtStatsFrag(frag.bonusConexion) +
              "</div>"
            : "") +
          "</div>"
        );
      }

function celdaAlmaHtml(idx) {
        const { x, y } = idxAXY(idx);
        const a = META.alma;
        if (!a.desbloqueadas.includes(idx)) {
          const coste = costeCasillaAlma(a.desbloqueadas.length);
          const puede = puedeDesbloquearCasilla(idx);
          return (
            '<div class="alma-celda bloqueada' +
            (puede ? " rompible" : "") +
            '" title="Romper casilla: ' +
            coste +
            ' 🪙 + 1 punto de desbloqueo" onclick="intentarDesbloquearAlma(' +
            idx +
            ')">🔒<span class="alma-coste">' +
            coste +
            "</span></div>"
          );
        }
        const oc = mapaOcupacion().get(idx);
        if (oc) {
          const frag = fragPorId(oc.fragId);
          const rar = RAREZAS[frag.rareza];
          const esAncla = oc.x === x && oc.y === y;
          const conectado = conexionesActivas().has(oc.uid);
          const lx = x - oc.x,
            ly = y - oc.y;
          let marca = "";
          if (frag.entrada && frag.entrada.x === lx && frag.entrada.y === ly)
            marca +=
              '<span class="alma-dir entrada">' +
              DIR_FLECHA[frag.entrada.dir] +
              "</span>";
          if (frag.salida && frag.salida.x === lx && frag.salida.y === ly)
            marca +=
              '<span class="alma-dir salida">' +
              DIR_FLECHA[frag.salida.dir] +
              "</span>";
          return (
            '<div class="alma-celda ocupada ' +
            rar.cls +
            (conectado ? " conectada" : "") +
            '" style="border-color:' +
            rar.col +
            '" title="' +
            escHtml(frag.nombre) +
            (conectado ? " (conectado)" : "") +
            '" onclick="quitarFragmentoAlma(\'' +
            oc.uid +
            "')\">" +
            (esAncla ? frag.ico : "") +
            marca +
            "</div>"
          );
        }
        return (
          '<div class="alma-celda vacia' +
          (fragSel ? " objetivo" : "") +
          '" onclick="intentarColocarAlma(' +
          idx +
          ')"></div>'
        );
      }

function tabAlma() {
        const a = META.alma;
        const celdas = Array.from({ length: ALMA_TOTAL }, (_, i) =>
          celdaAlmaHtml(i),
        ).join("");
        const bolsaFrag = a.inventario.length
          ? a.inventario.map(fragEnBolsaLinea).join("")
          : '<p style="color:var(--ceniza);font-size:.8rem">Sin fragmentos sueltos. Desmantela armas en la Mesa de Trabajo del vestíbulo.</p>';
        return (
          '<div class="alma-cab">' +
          '<b style="color:var(--vespero)">🔮 Rejilla del Alma</b>' +
          '<div style="font-size:.75rem;color:var(--ceniza);margin-top:2px">Progreso de cuenta, compartido por todo el grupo. Rompe casillas con oro + puntos (uno por cada nivel que alcance cualquier personaje) y encaja fragmentos: si la salida de uno conecta con la entrada de otro, se activa su bonificación extra.</div>' +
          '<div style="margin-top:6px;font-size:.8rem">🪙 ' +
          META.oro +
          " &nbsp;·&nbsp; ✦ " +
          a.puntos +
          " punto" +
          (a.puntos === 1 ? "" : "s") +
          " de desbloqueo &nbsp;·&nbsp; " +
          a.desbloqueadas.length +
          "/" +
          ALMA_TOTAL +
          " casillas rotas</div>" +
          "</div>" +
          '<div class="alma-grid" style="grid-template-columns:repeat(' +
          ALMA_COLS +
          ',1fr)">' +
          celdas +
          "</div>" +
          '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">Fragmentos sueltos (' +
          a.inventario.length +
          ")</h3>" +
          (fragSel
            ? '<div style="font-size:.72rem;color:var(--ceniza);margin:2px 0 6px">Fragmento seleccionado: haz clic en una casilla desbloqueada y vacía para colocarlo.</div>'
            : "") +
          '<div class="frag-bolsa">' +
          bolsaFrag +
          "</div>"
        );
      }

function seleccionarFragAlma(uid) {
        fragSel = fragSel === uid ? null : uid;
        abrirInv();
      }

function intentarColocarAlma(idx) {
        if (!fragSel) {
          toast("Selecciona antes un fragmento de la bolsa", "#c9a35a");
          return;
        }
        const { x, y } = idxAXY(idx);
        const ok = colocarFragmento(fragSel, x, y);
        if (ok) {
          toast("Fragmento colocado", "#7fd4c1");
          fragSel = null;
        } else {
          toast("No encaja ahí (forma o casillas bloqueadas)", "#d1545c");
        }
        abrirInv();
      }

function quitarFragmentoAlma(uid) {
        quitarFragmento(uid);
        abrirInv();
      }

function intentarDesbloquearAlma(idx) {
        if (desbloquearCasillaAlma(idx)) toast("Casilla rota", "#ffd27f");
        else
          toast(
            "No puedes romper esa casilla todavía (oro o puntos insuficientes)",
            "#c9a35a",
          );
        abrirInv();
      }

// Panel con la descripción/acciones del objeto de la bolsa seleccionado en
// la cuadrícula (equipar, fusión, vender, tirar, dar a otro jugador) --
// separado de la celda para que la cuadrícula se mantenga compacta.
function panelAccionItem(p) {
        const it = p.bolsa[idxSel];
        if (!it) return "";
        const rar = RAREZAS[it.rareza];
        const actual = p.equipo[it.slot];
        const puedeEquipar = !(
          it.slot === "arma" &&
          it.clase &&
          it.clase !== p.rol
        );
        let transf = "";
        if (G.players.length > 1) {
          transf = G.players
            .map((q, qi) =>
              qi === G.invSel
                ? ""
                : '<button class="btn" onclick="darItem(' +
                  idxSel +
                  "," +
                  qi +
                  ')">→ ' +
                  escHtml(q.nombre) +
                  "</button>",
            )
            .join("");
        }
        return (
          '<div class="panel-item-sel" style="border-color:' +
          rar.col +
          '">' +
          '<div class="panel-item-cab">' +
          '<div class="panel-item-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          '<div class="panel-item-slot">' +
          (SLOT_LABEL[it.slot] || it.slot) +
          ' · <span class="' +
          rar.cls +
          '">' +
          rar.n +
          "</span></div>" +
          "</div>" +
          (it.efectoDesc
            ? '<div class="item-efecto">✦ ' + escHtml(it.efectoDesc) + "</div>"
            : "") +
          (typeof it.kills === "number"
            ? '<div class="item-efecto">🗡 ' + it.kills + " kills con esta arma</div>"
            : "") +
          '<div class="panel-item-stats">' +
          fmtStatsComparativo(it, actual) +
          "</div>" +
          '<div class="item-acciones">' +
          (puedeEquipar
            ? '<button class="btn" onclick="equipar(' +
              idxSel +
              ')">Equipar</button>'
            : '<button class="btn" disabled title="Arma de otra clase">Solo ' +
              ROLES[it.clase].nombre.split(" ")[0] +
              "</button>") +
          fusBtnItem(it, idxSel, p) +
          transf +
          '<button class="btn" onclick="venderItem(' +
          idxSel +
          ')" title="Se suma al oro de la partida (se banca al terminar, como las monedas)">Vender ' +
          precioVenta(it) +
          " 🪙</button>" +
          '<button class="btn peligro" onclick="tirarItem(' +
          idxSel +
          ')">Tirar</button>' +
          "</div>" +
          "</div>"
        );
      }

function gridBolsa(p) {
        const filtro = p.filtroBolsa || "todos";
        const bolsaFiltrada = p.bolsa
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => filtro === "todos" || it.slot === filtro);
        if (!p.bolsa.length)
          return '<p style="color:var(--ceniza);margin-top:8px">Tu bolsa está vacía. Recoge botín de enemigos, cofres y barriles.</p>';
        if (!bolsaFiltrada.length)
          return '<p style="color:var(--ceniza);margin-top:8px">Nada de ese tipo en la bolsa.</p>';
        return (
          '<div class="grid-inv">' +
          bolsaFiltrada.map(({ it, i }) => celdaItem(it, i, p, false)).join("") +
          "</div>"
        );
      }

// Herrería: la mesa de fusión de siempre (3 objetos de la misma rareza →
// evolucionan), reubicada aquí desde la antigua pestaña "Equipamiento" --
// el yunque/martillo/chispas del boceto llegan en un pase aparte, de
// momento la mecánica ya funciona igual que antes bajo el nuevo nombre.
function tabHerreria(p) {
        p.fusionSel = p.fusionSel.filter((it) => p.bolsa.includes(it));
        const slotsF = [0, 1, 2]
          .map((k) => {
            const it = p.fusionSel[k];
            return it
              ? '<div class="fusion-slot lleno" style="border-color:' +
                  RAREZAS[it.rareza].col +
                  ";color:" +
                  RAREZAS[it.rareza].col +
                  '">' +
                  it.nombre +
                  "</div>"
              : '<div class="fusion-slot">vacío</div>';
          })
          .join("");
        const rarF = p.fusionSel.length ? p.fusionSel[0].rareza : -1;
        const esLeg = rarF === 3;
        let fusBtn = "";
        if (p.fusionSel.length === 3) {
          fusBtn =
            '<button class="btn dorado" onclick="fusionar()">⚗️ FUSIONAR' +
            (esLeg ? " (13% de éxito)" : " → " + RAREZAS[rarF + 1].n) +
            "</button>";
        }
        const avisoF =
          esLeg && p.fusionSel.length === 3
            ? '<div class="fusion-aviso">⚠ Fusión legendaria: si tiene éxito, nace un objeto Mítico único. Si falla (87%), LOS TRES SE DESTRUYEN.</div>'
            : "";
        const nRapidas = contarFusionesRapidas(p);
        const btnRapida =
          nRapidas > 0
            ? '<button class="btn dorado" onclick="fusionRapida()">⚡ Fusión rápida (' +
              nRapidas +
              " disponible" +
              (nRapidas > 1 ? "s" : "") +
              ")</button>"
            : '<button class="btn" disabled title="Necesitas 3 objetos de la misma rareza">⚡ Fusión rápida (0)</button>';
        const fusion =
          '<div class="fusion-panel">' +
          '<b style="font-size:.9rem;color:var(--vespero)">⚒ Herrería — Mesa de fusión</b>' +
          '<div style="font-size:.72rem;color:var(--ceniza);margin-top:2px">Combina 3 objetos de la MISMA rareza (mismo slot, y misma clase si son armas) → evolucionan a la superior.</div>' +
          '<div class="fusion-slots">' +
          slotsF +
          fusBtn +
          "</div>" +
          '<div style="margin-top:8px">' +
          btnRapida +
          ' <span style="font-size:.7rem;color:var(--ceniza)">coge 3 iguales automáticamente (prioriza la rareza más alta)</span></div>' +
          avisoF +
          "</div>";
        return (
          fusion +
          '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">Bolsa de ' +
          escHtml(p.nombre) +
          " (" +
          p.bolsa.length +
          ")</h3>" +
          filtroCtrlHtml(p) +
          ordCtrlHtml(p) +
          gridBolsa(p) +
          panelAccionItem(p)
        );
      }

function tabAjustes() {
        return (
          '<div style="padding:26px 8px;text-align:center;color:var(--ceniza)">' +
          '<h3 style="color:var(--vespero);font-size:1rem">⚙ Ajustes</h3>' +
          '<p style="margin-top:8px;font-size:.85rem">Esta pestaña está en construcción. De momento los ajustes siguen disponibles en el botón ⚙ de la esquina.</p>' +
          "</div>"
        );
      }

export function abrirInv() {
        if (!G || !G.activo) return;
        G.pausa = true;
        const p = G.players[G.invSel] || G.players[0];
        const t = statsTot(p),
          b = ROLES[p.rol];
        const tabsJug = G.players
          .map(
            (q, i) =>
              '<button class="tab-jug' +
              (i === G.invSel ? " activa" : "") +
              '" onclick="invSel(' +
              i +
              ')" style="border-left:3px solid ' +
              q.color +
              '">' +
              escHtml(q.nombre) +
              " · " +
              ROLES[q.rol].nombre.split(" ")[0] +
              "</button>",
          )
          .join("");
        const pestanas = PESTANAS_INV.map(
          (tb) =>
            '<button class="tab-v' +
            (invTab === tb.id ? " activa" : "") +
            '" onclick="irPestanaInv(\'' +
            tb.id +
            "')\"><span class=\"tab-v-ico\">" +
            tb.ico +
            '</span><span class="tab-v-nombre">' +
            tb.nombre +
            "</span></button>",
        ).join("");
        let contenido;
        if (invTab === "herreria") contenido = tabHerreria(p);
        else if (invTab === "alma") contenido = tabAlma();
        else if (invTab === "mapa") contenido = tabMapa();
        else if (invTab === "ajustes") contenido = tabAjustes();
        else contenido = tabPersonaje(p, t, b);
        document.getElementById("inv-inner").innerHTML =
          '<div class="libro-tabs">' +
          pestanas +
          '<span class="libro-hint">LB/RB para cambiar</span>' +
          "</div>" +
          '<div class="libro-pagina">' +
          '<div class="fila-cerrar"><h2 class="display">Ficha de personaje</h2>' +
          '<div style="display:flex;gap:8px">' +
          (G.escena === "torre"
            ? '<button class="btn peligro" onclick="abandonarPartida()">' +
              (G.confirmAband
                ? "⚠ ¿SEGURO? −" + Math.ceil(G.oroRun * 0.5) + " 🪙"
                : "🏳 Al lobby (−50% oro)") +
              "</button>"
            : "") +
          '<button class="btn dorado" onclick="cerrarInv()">Volver (Tab / Start)</button></div></div>' +
          '<div class="tabs-jug">' +
          tabsJug +
          "</div>" +
          '<div class="inv-contenido">' +
          contenido +
          "</div>" +
          "</div>";
        mostrar("inv");
        if (invTab === "personaje") iniciarRetratoAnimado(p);
        else detenerRetratoAnimado();
      }

export function invSel(i) {
        G.invSel = i;
        idxSel = -1;
        abrirInv();
      }

export function cerrarInv() {
        detenerRetratoAnimado();
        ocultar("inv");
        if (G) {
          G.pausa = false;
          G.confirmAband = false;
        }
      }

// ---- Preview animado en idle (canvas #ficha-retrato, pestaña Personaje) ----
// import() dinámico para no crear un ciclo de módulos: render/character.js
// importa systems/input.js, que a su vez importa este archivo de forma
// estática (cambiarPestanaInv/cerrarInv) -- mismo motivo/patrón que
// setLobby() en ui/settingsOverlay.js.
let retratoRAF = null;
let retratoAnimT = 0;

function detenerRetratoAnimado() {
        if (retratoRAF) {
          cancelAnimationFrame(retratoRAF);
          retratoRAF = null;
        }
      }

function iniciarRetratoAnimado(p) {
        detenerRetratoAnimado();
        const canvas = document.getElementById("ficha-retrato");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let ultimo = performance.now();
        import("../render/character.js").then(({ renderRetratoIdle }) => {
          const paso = (ahora) => {
            const dt = Math.min(0.05, (ahora - ultimo) / 1000);
            ultimo = ahora;
            retratoAnimT += dt;
            renderRetratoIdle(ctx, p, canvas.width, canvas.height, retratoAnimT);
            retratoRAF = requestAnimationFrame(paso);
          };
          retratoRAF = requestAnimationFrame(paso);
        });
      }

// ---- Arrastrar y soltar: bolsa -> slot de equipo (ver celdaSlotEquipo) ----
let arrastreIdx = null;

function arrastrarItemInicio(ev, idx) {
        arrastreIdx = idx;
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", String(idx));
        ev.currentTarget.classList.add("arrastrando");
      }

function arrastrarItemFin(ev) {
        ev.currentTarget.classList.remove("arrastrando");
        arrastreIdx = null;
      }

function permitirSoltar(ev) {
        ev.preventDefault();
        ev.currentTarget.classList.add("arrastre-sobre");
      }

function quitarResaltadoSlot(ev) {
        ev.currentTarget.classList.remove("arrastre-sobre");
      }

function soltarEnSlot(ev, slot) {
        ev.preventDefault();
        ev.currentTarget.classList.remove("arrastre-sobre");
        const idx =
          arrastreIdx != null
            ? arrastreIdx
            : parseInt(ev.dataTransfer.getData("text/plain"), 10);
        arrastreIdx = null;
        if (Number.isNaN(idx)) return;
        const p = G.players[G.invSel] || G.players[0];
        const it = p.bolsa[idx];
        if (!it) return;
        if (it.slot !== slot) {
          toast("Ese objeto no va en ese hueco", "#c9a35a");
          return;
        }
        equipar(idx);
      }

function equipar(idx) {
        const p = G.players[G.invSel] || G.players[0];
        const it = p.bolsa[idx];
        if (!it) return;
        if (it.slot === "arma" && it.clase && it.clase !== p.rol) {
          toast(
            "Esa arma es de " +
              ROLES[it.clase].nombre +
              " — no puedes equiparla",
            "#d1545c",
          );
          return;
        }
        const ant = p.equipo[it.slot];
        p.equipo[it.slot] = it;
        p.bolsa.splice(idx, 1);
        if (ant) p.bolsa.push(ant);
        p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
        idxSel = -1;
        toast(p.nombre + " equipa " + it.nombre, RAREZAS[it.rareza].col);
        abrirInv();
      }

function tirarItem(idx) {
        const p = G.players[G.invSel] || G.players[0];
        if (p.bolsa[idx]) {
          p.bolsa.splice(idx, 1);
          idxSel = -1;
          abrirInv();
        }
      }

// Vende un objeto de la bolsa por oro AHORA en vez de esperar a la venta
// automática de fin de partida -- el oro va a G.oroRun (igual que las
// monedas recogidas), no directo a META.oro: sigue bancándose (y sujeto al
// peaje de abandonar) al terminar la partida, no salta esa mecánica.
function venderItem(idx) {
        const p = G.players[G.invSel] || G.players[0];
        const it = p.bolsa[idx];
        if (!it) return;
        const oro = precioVenta(it);
        p.bolsa.splice(idx, 1);
        G.oroRun += oro;
        idxSel = -1;
        toast("Vendido " + it.nombre + " por " + oro + " 🪙", "#ffd27f");
        abrirInv();
      }

function darItem(idx, targetIdx) {
        const p = G.players[G.invSel] || G.players[0];
        const q = G.players[targetIdx];
        const it = p.bolsa[idx];
        if (!it || !q || q === p) return;
        p.bolsa.splice(idx, 1);
        q.bolsa.push(it);
        idxSel = -1;
        toast(
          p.nombre + " da " + it.nombre + " a " + q.nombre,
          RAREZAS[it.rareza].col,
        );
        abrirInv();
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.arrastrarItemFin = arrastrarItemFin;
window.arrastrarItemInicio = arrastrarItemInicio;
window.cerrarInv = cerrarInv;
window.darItem = darItem;
window.permitirSoltar = permitirSoltar;
window.quitarResaltadoSlot = quitarResaltadoSlot;
window.soltarEnSlot = soltarEnSlot;
window.equipar = equipar;
window.filtrarBolsa = filtrarBolsa;
window.fusionRapida = fusionRapida;
window.fusionar = fusionar;
window.intentarColocarAlma = intentarColocarAlma;
window.intentarDesbloquearAlma = intentarDesbloquearAlma;
window.invSel = invSel;
window.irPestanaInv = irPestanaInv;
window.ordenarBolsa = ordenarBolsa;
window.quitarFragmentoAlma = quitarFragmentoAlma;
window.selItemInv = selItemInv;
window.seleccionarFragAlma = seleccionarFragAlma;
window.tirarItem = tirarItem;
window.togFusion = togFusion;
window.venderItem = venderItem;
