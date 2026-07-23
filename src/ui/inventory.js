// Auto-generated during the modularization refactor (2026-07-23).
import { ETQ, FORMAS_INFO, MAX_NIV_PJ, RAREZAS, ROLES, SLOTS } from "../core/constants.js";
import { abandonarPartida } from "../core/gameflow.js";
import { G } from "../core/state.js";
import { fxOnda, fxParticulas } from "../render/effects.js";
import { spriteJugador } from "../render/sprites.js";
import { CARD_RAREZAS } from "../systems/cards.js";
import { statsTot } from "../systems/combat.js";
import { M } from "../systems/input.js";
import { genItem } from "../systems/loot.js";
import { banner, toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";
import { clamp } from "../utils/helpers.js";

function fmtStats(st) {
        return Object.entries(st)
          .map(([k, v]) => "+" + v + " " + ETQ[k])
          .join(" · ");
      }

function lineaItem(it, idx, equipada, p) {
        const rar = RAREZAS[it.rareza];
        const actual = p.equipo[it.slot];
        const comp =
          !equipada && actual
            ? '<div class="item-stats">Equipado: <span class="' +
              RAREZAS[actual.rareza].cls +
              '">' +
              actual.nombre +
              "</span> (" +
              fmtStats(actual.stats) +
              ")</div>"
            : "";
        // tag de clase para armas
        let tagClase = "";
        if (it.slot === "arma" && it.clase) {
          const bien = it.clase === p.rol;
          tagClase =
            ' <span class="tag-clase ' +
            (bien ? "bien" : "mal") +
            '">' +
            ROLES[it.clase].nombre.split(" ")[0] +
            "</span>";
        }
        const puedeEquipar = !(
          it.slot === "arma" &&
          it.clase &&
          it.clase !== p.rol
        );
        // botones de transferencia a otros jugadores
        let transf = "";
        if (!equipada && G.players.length > 1) {
          transf = G.players
            .map((q, qi) =>
              qi === G.invSel
                ? ""
                : '<button class="btn" style="padding:5px 8px;font-size:.72rem" onclick="darItem(' +
                  idx +
                  "," +
                  qi +
                  ')">→ ' +
                  q.nombre +
                  "</button>",
            )
            .join("");
        }
        return (
          '<div class="item-linea"><div class="item-info">' +
          '<div class="item-slot">' +
          it.slot +
          tagClase +
          ' · <span class="' +
          rar.cls +
          '">' +
          rar.n +
          "</span></div>" +
          '<div class="item-nombre ' +
          rar.cls +
          '">' +
          it.nombre +
          "</div>" +
          '<div class="item-stats">' +
          fmtStats(it.stats) +
          "</div>" +
          comp +
          "</div>" +
          (equipada
            ? ""
            : '<div class="item-acciones">' +
              (puedeEquipar
                ? '<button class="btn" onclick="equipar(' +
                  idx +
                  ')">Equipar</button>'
                : '<button class="btn" disabled title="Arma de otra clase">Solo ' +
                  ROLES[it.clase].nombre.split(" ")[0] +
                  "</button>") +
              fusBtnItem(it, idx, p) +
              transf +
              '<button class="btn peligro" onclick="tirarItem(' +
              idx +
              ')">Tirar</button></div>') +
          "</div>"
        );
      }

function fusBtnItem(it, idx, p) {
        const dentro = p.fusionSel.includes(it);
        if (dentro)
          return (
            '<button class="btn-fus dentro" onclick="togFusion(' +
            idx +
            ')">⚗ quitar</button>'
          );
        if (p.fusionSel.length >= 3) return "";
        if (p.fusionSel.length > 0 && p.fusionSel[0].rareza !== it.rareza)
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
          (p.fusionSel.length === 0 || p.fusionSel[0].rareza === it.rareza)
        )
          p.fusionSel.push(it);
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
        abrirInv();
      }

function gruposFusionables(p) {
        const grupos = {};
        for (const it of p.bolsa) {
          // agrupar por rareza; las armas además por clase para no mezclar clases al evolucionar
          const clave =
            it.rareza +
            "|" +
            (it.slot === "arma" ? "arma:" + (it.clase || "") : "x");
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
        if (rarF < 3) {
          // evolución garantizada a la rareza superior, conservando el slot del primero
          const nuevo = genItem(Math.max(1, G.planta), rarF + 1, base.slot);
          if (base.slot === "arma") nuevo.clase = base.clase;
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
        } else {
          // fusión legendaria: 30% éxito → suma de TODOS los stats; 70% → destrucción total
          if (Math.random() < 0.3) {
            const stats = {};
            for (const it of p.fusionSel)
              for (const k in it.stats)
                stats[k] = (stats[k] || 0) + it.stats[k];
            const nuevo = {
              slot: base.slot,
              clase: base.slot === "arma" ? base.clase : null,
              rareza: 3,
              nombre: "✦ Reliquia Fusionada de Véspero",
              stats,
            };
            p.bolsa.push(nuevo);
            G.shake = Math.max(G.shake, 8);
            fxOnda(p.x, p.y, 80, "#e9b45c");
            fxOnda(p.x, p.y, 50, "#fff0c8");
            fxParticulas(p.x, p.y, 30, "#e9b45c");
            banner("✦ ¡LA FUSIÓN LEGENDARIA SOBREVIVE! ✦");
            toast(
              "Nace la Reliquia Fusionada — todos los stats sumados",
              "#e9b45c",
            );
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

export function abrirInv() {
        if (!G || !G.activo) return;
        G.pausa = true;
        const p = G.players[G.invSel] || G.players[0];
        const t = statsTot(p),
          b = ROLES[p.rol];
        const tabs = G.players
          .map(
            (q, i) =>
              '<button class="tab-jug' +
              (i === G.invSel ? " activa" : "") +
              '" onclick="invSel(' +
              i +
              ')" style="border-left:3px solid ' +
              q.color +
              '">' +
              q.nombre +
              " · " +
              ROLES[q.rol].nombre.split(" ")[0] +
              "</button>",
          )
          .join("");
        // chips de mejoras elegidas
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
        const eq = SLOTS.map((s) => {
          const it = p.equipo[s];
          return it
            ? lineaItem(it, -1, true, p)
            : '<div class="item-linea"><div class="item-info"><div class="item-slot">' +
                s +
                '</div><div class="item-stats">Vacío</div></div></div>';
        }).join("");
        const bolsa = p.bolsa.length
          ? p.bolsa.map((it, i) => lineaItem(it, i, false, p)).join("")
          : '<p style="color:var(--ceniza);margin-top:8px">Tu bolsa está vacía. Recoge botín de enemigos, cofres y barriles.</p>';
        // ---- panel de fusión ----
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
            (esLeg ? " (30% de éxito)" : " → " + RAREZAS[rarF + 1].n) +
            "</button>";
        }
        const avisoF =
          esLeg && p.fusionSel.length === 3
            ? '<div class="fusion-aviso">⚠ Fusión legendaria: si tiene éxito, el resultado SUMA todas las estadísticas de los 3 objetos. Si falla (70%), LOS TRES SE DESTRUYEN.</div>'
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
          '<b style="font-size:.85rem;color:var(--vespero)">⚗️ Mesa de fusión</b>' +
          '<div style="font-size:.72rem;color:var(--ceniza);margin-top:2px">Combina 3 objetos de la MISMA rareza → evolucionan a la superior. Con legendarios, el resultado suma todos los stats… si sobrevive.</div>' +
          '<div class="fusion-slots">' +
          slotsF +
          fusBtn +
          "</div>" +
          '<div style="margin-top:8px">' +
          btnRapida +
          ' <span style="font-size:.7rem;color:var(--ceniza)">coge 3 iguales automáticamente (prioriza la rareza más alta)</span></div>' +
          avisoF +
          "</div>";
        // controles de orden de la bolsa
        const ord = p.ordenBolsa || "rareza";
        const ordCtrl =
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
          "</div></div>";
        const xpPct =
          p.nivel >= MAX_NIV_PJ ? 100 : Math.round((p.xp / p.xpSig) * 100);
        document.getElementById("inv-inner").innerHTML =
          '<div class="fila-cerrar"><h2 class="display">Ficha de personaje — pausa</h2>' +
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
          tabs +
          "</div>" +
          '<div class="ficha-cab">' +
          '<canvas id="ficha-retrato" width="72" height="84"></canvas>' +
          '<div class="ficha-datos">' +
          '<h3 style="color:' +
          p.color +
          '">' +
          p.nombre +
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
          '<div class="ficha-stats">' +
          '<div class="ficha-stat">Daño<b>' +
          t.atk +
          "</b></div>" +
          '<div class="ficha-stat">Vida<b>' +
          Math.ceil(p.hp) +
          " / " +
          t.hpMax +
          "</b></div>" +
          '<div class="ficha-stat">Armadura<b>' +
          t.armor +
          "</b></div>" +
          '<div class="ficha-stat">Crítico<b>' +
          t.crit +
          "%</b></div>" +
          '<div class="ficha-stat">Velocidad<b>' +
          t.vel +
          "</b></div>" +
          '<div class="ficha-stat">Red. CD<b>' +
          t.cdr +
          "%</b></div>" +
          "</div>" +
          "</div>" +
          "</div>" +
          '<h3 style="margin-top:12px;font-size:.85rem;color:var(--vespero)">Mejoras de nivel (' +
          p.cartasElegidas.length +
          ")</h3>" +
          '<div class="chips-mejoras">' +
          chips +
          "</div>" +
          '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">Equipado</h3>' +
          eq +
          fusion +
          '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">Bolsa de ' +
          p.nombre +
          " (" +
          p.bolsa.length +
          ")</h3>" +
          ordCtrl +
          bolsa;
        mostrar("inv");
        // retrato grande
        const rc = document.getElementById("ficha-retrato");
        if (rc) {
          const g = rc.getContext("2d");
          g.imageSmoothingEnabled = false;
          g.clearRect(0, 0, 72, 84);
          {
            const img = spriteJugador(p);
            g.drawImage(
              img,
              (72 - img.width * 1.6) / 2,
              (84 - img.height * 1.6) / 2,
              img.width * 1.6,
              img.height * 1.6,
            );
          }
        }
      }

export function invSel(i) {
        G.invSel = i;
        abrirInv();
      }

export function cerrarInv() {
        ocultar("inv");
        if (G) {
          G.pausa = false;
          G.confirmAband = false;
        }
      }

export function toggleInv() {
        if (!G || !G.activo) return;
        // no alternar si hay cartas, tienda o sastre abiertos
        if (
          !document
            .getElementById("cartas-overlay")
            .classList.contains("oculto")
        )
          return;
        if (!document.getElementById("tienda").classList.contains("oculto"))
          return;
        if (!document.getElementById("skins").classList.contains("oculto"))
          return;
        if (G.pausa) cerrarInv();
        else abrirInv();
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
        toast(p.nombre + " equipa " + it.nombre, RAREZAS[it.rareza].col);
        abrirInv();
      }

function tirarItem(idx) {
        const p = G.players[G.invSel] || G.players[0];
        if (p.bolsa[idx]) {
          p.bolsa.splice(idx, 1);
          abrirInv();
        }
      }

function darItem(idx, targetIdx) {
        const p = G.players[G.invSel] || G.players[0];
        const q = G.players[targetIdx];
        const it = p.bolsa[idx];
        if (!it || !q || q === p) return;
        p.bolsa.splice(idx, 1);
        q.bolsa.push(it);
        toast(
          p.nombre + " da " + it.nombre + " a " + q.nombre,
          RAREZAS[it.rareza].col,
        );
        abrirInv();
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarInv = cerrarInv;
window.darItem = darItem;
window.equipar = equipar;
window.fusionRapida = fusionRapida;
window.fusionar = fusionar;
window.invSel = invSel;
window.ordenarBolsa = ordenarBolsa;
window.tirarItem = tirarItem;
window.togFusion = togFusion;
