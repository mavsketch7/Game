// Auto-generated during the modularization refactor (2026-07-23).
import { H, W } from "../core/canvas.js";
import { MAX_PLANTA, NOMBRES_ARMA_CLASE, NOMBRES_ITEM, ORDEN_ROLES, PRECIO_VENTA, RAREZAS, ROLES, SLOTS, SUFIJOS } from "../core/constants.js";
import { META } from "../core/save.js";
import { G, setG } from "../core/state.js";
import { M } from "./input.js";
import { construirMenu } from "../ui/menu.js";
import { banner, toast } from "../ui/notifications.js";
import { mostrar, ocultar } from "../ui/overlays.js";
import { az, clamp, ri } from "../utils/helpers.js";

export function genItem(f, forceRar, forceSlot) {
        // mayor probabilidad de rarezas altas en plantas avanzadas
        const t = clamp(f / MAX_PLANTA, 0, 1);
        const pesos = [
          Math.max(3, 50 - t * 44), // común
          25 + t * 5, // raro
          15 + t * 14, // épico
          Math.max(0, t * 25), // legendario
        ];
        let riX;
        if (forceRar !== undefined) {
          riX = forceRar;
        } else {
          const total = pesos.reduce((a, b) => a + b, 0);
          let tir = Math.random() * total;
          riX = 0;
          for (let i = 0; i < pesos.length; i++) {
            tir -= pesos[i];
            if (tir <= 0) {
              riX = i;
              break;
            }
          }
        }
        const rar = RAREZAS[riX],
          slot = forceSlot || az(SLOTS);
        const pools = {
          arma: ["atk", "atk", "crit", "cdr"],
          armadura: ["hp", "hp", "armor", "vel"],
          accesorio: ["crit", "vel", "cdr", "hp", "atk"],
        };
        const stats = {},
          pool = [...pools[slot]];
        for (let i = 0, n = 1 + riX; i < n && pool.length; i++) {
          const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0],
            m = rar.m;
          const v = {
            atk: ri(2, 5) + Math.round(f * 0.7 * m),
            hp: ri(8, 16) + Math.round(f * 2.5 * m),
            armor: ri(1, 3) + Math.round(f * 0.5 * m),
            crit: ri(3, 6) + Math.round(m * 2),
            vel: ri(4, 7) + Math.round(m * 2.4),
            cdr: ri(4, 8) + Math.round(m * 2),
          }[k];
          stats[k] = (stats[k] || 0) + v;
        }
        // las armas están cerradas por clase: sortear entre las clases del grupo
        let clase = null,
          nombreBase;
        if (slot === "arma") {
          clase =
            G && G.players && G.players.length
              ? az(G.players.map((p) => p.rol))
              : az(ORDEN_ROLES);
          nombreBase = az(NOMBRES_ARMA_CLASE[clase]);
        } else {
          nombreBase = az(NOMBRES_ITEM[slot]);
        }
        return {
          slot,
          clase,
          rareza: riX,
          nombre: nombreBase + " " + az(SUFIJOS),
          stats,
        };
      }

export function plantaDespejada() {
        const f = G.planta;
        G.drops.push({ tipo: "item", x: W / 2, y: H / 2, item: genItem(f) });
        if (G.players.length >= 3)
          G.drops.push({
            tipo: "item",
            x: W / 2 + 30,
            y: H / 2 + 14,
            item: genItem(f),
          });
        G.portal = { x: W / 2, y: 64, r: 24, t: 0 };
        G.fogata = { x: W / 2 + 150, y: H / 2 + 40 };
        banner("Planta " + f + " despejada — todos al portal");
        toast("Fogata encendida: descansad juntos (1 vez)", "#e9b45c");
      }

export function finPartida(victoria) {
        G.activo = false;
        const st = G.stats,
          min = Math.floor(st.tiempo / 60),
          seg = Math.floor(st.tiempo % 60);
        const equipoTxt = G.players
          .map(
            (p) =>
              p.nombre + " (" + ROLES[p.rol].nombre + " Nv." + p.nivel + ")",
          )
          .join(" · ");
        // venta automática de todo el equipo NO equipado
        let venta = 0,
          nItems = 0;
        for (const p of G.players) {
          for (const it of p.bolsa) {
            venta += PRECIO_VENTA[it.rareza];
            nItems++;
          }
          p.bolsa = [];
        }
        const fortunaM = 1 + 0.1 * META.mejoras.fortuna;
        const ventaAdj = Math.round(venta * fortunaM);
        const total = G.oroRun + ventaAdj;
        META.oro += total;
        document.getElementById("fin-inner").innerHTML =
          '<div class="pantalla-fin ' +
          (victoria ? "victoria" : "derrota") +
          '">' +
          '<span style="font-size:2rem">' +
          (victoria ? "✦" : "✝") +
          "</span>" +
          "<h1>" +
          (victoria ? "Habéis alcanzado el Lucero" : "La Torre os reclama") +
          "</h1>" +
          '<p style="color:var(--ceniza)">' +
          (victoria
            ? "El grupo corona la planta 100. Véspero, el Eterno, se apaga… y vosotros brilláis en su lugar."
            : "El grupo cae en la planta " +
              G.planta +
              ". Más nombres grabados en la piedra.") +
          "</p>" +
          '<p style="color:var(--ceniza);font-size:.85rem;margin-top:6px">' +
          equipoTxt +
          "</p>" +
          '<div class="stats-fin">Enemigos: <b>' +
          st.derrotados +
          "</b> · Parries: <b>" +
          st.parries +
          "</b> · Daño: <b>" +
          st.dano +
          "</b> · Tiempo: <b>" +
          min +
          "m " +
          seg +
          "s</b></div>" +
          '<div class="stats-fin" style="color:#ffd27f">' +
          "🪙 Oro recogido: <b>" +
          G.oroRun +
          "</b> · Venta de " +
          nItems +
          " objetos: <b>+" +
          ventaAdj +
          "</b>" +
          "<br>Total ganado: <b>" +
          total +
          "</b> — Banca del gremio: <b>" +
          META.oro +
          " 🪙</b></div>" +
          '<p style="color:var(--ceniza);font-size:.78rem">El oro se conserva entre partidas. Gástalo con el mercader del vestíbulo.</p>' +
          '<button class="btn dorado" onclick="reiniciar()" style="margin-top:10px">Volver al menú</button></div>';
        mostrar("fin");
      }

function reiniciar() {
        ocultar("fin");
        ocultar("inv");
        ocultar("tienda");
        ocultar("cartas-overlay");
        ocultar("skins");
        setG(null);
        M.slots.forEach((s) => (s.listo = false));
        construirMenu();
        mostrar("menu");
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.reiniciar = reiniciar;
