// Auto-generated during the modularization refactor (2026-07-23).
import { H } from "./canvas.js";
import { G } from "./state.js";

export const META = {
        oro: 0,
        mejoras: { hp: 0, atk: 0, armor: 0, vel: 0, fortuna: 0, crit: 0, cdr: 0 },
      };

// Progreso del sistema de Fragmentos de Alma (ver systems/soul.js): es meta
// -- de cuenta, no de personaje concreto -- igual que META.mejoras, así que
// sus bonificaciones se aplican a todo el grupo en cualquier partida.
//   - desbloqueadas: índices (0..48, rejilla 7x7) de casillas ya rotas.
//   - colocados: fragmentos ya insertados en la rejilla ({uid, fragId, x, y}).
//   - inventario: fragmentos sueltos sin colocar ({uid, fragId}).
//   - puntos: "permiso" para romper una casilla, uno por cada nivel que
//     alcance cualquier personaje en cualquier partida (ver ganarXP en
//     systems/combat.js); romper una casilla gasta 1 punto + oro.
META.alma = {
  desbloqueadas: [24], // casilla central de la rejilla 7x7, gratis de partida
  colocados: [],
  inventario: [],
  puntos: 0,
};

const CLAVE_META = "vespero_meta_v1";

// Progreso entre partidas (oro, mejoras, skins) persistido en el propio
// navegador -- antes vivía solo en memoria y se perdía al recargar.
export function guardarMeta() {
        try {
          localStorage.setItem(CLAVE_META, JSON.stringify(META));
        } catch (e) {
          /* localStorage lleno/deshabilitado: seguir sin persistir */
        }
      }

function cargarMeta() {
        let datos;
        try {
          const bruto = localStorage.getItem(CLAVE_META);
          if (!bruto) return;
          datos = JSON.parse(bruto);
        } catch (e) {
          return;
        }
        if (typeof datos.oro === "number") META.oro = datos.oro;
        if (datos.mejoras) Object.assign(META.mejoras, datos.mejoras);
        if (datos.skins) {
          if (Array.isArray(datos.skins.comprados))
            META.skins.comprados = datos.skins.comprados;
          if (datos.skins.equipada) META.skins.equipada = datos.skins.equipada;
        }
        if (datos.alma) {
          if (Array.isArray(datos.alma.desbloqueadas))
            META.alma.desbloqueadas = datos.alma.desbloqueadas;
          if (Array.isArray(datos.alma.colocados))
            META.alma.colocados = datos.alma.colocados;
          if (Array.isArray(datos.alma.inventario))
            META.alma.inventario = datos.alma.inventario;
          if (typeof datos.alma.puntos === "number")
            META.alma.puntos = datos.alma.puntos;
        }
      }

export const MEJORAS_TIENDA = [
        {
          id: "hp",
          ico: "❤️",
          nombre: "Sangre de la Torre",
          desc: "+15 HP base para todo el grupo por nivel.",
          max: 10,
          porNivel: "+15 HP",
        },
        {
          id: "atk",
          ico: "⚔️",
          nombre: "Filo del Gremio",
          desc: "+2 de daño base para todo el grupo por nivel.",
          max: 10,
          porNivel: "+2 daño",
        },
        {
          id: "armor",
          ico: "🛡️",
          nombre: "Forja Antigua",
          desc: "+1 de armadura base por nivel.",
          max: 8,
          porNivel: "+1 arm.",
        },
        {
          id: "vel",
          ico: "💨",
          nombre: "Botas del Peregrino",
          desc: "+4 de velocidad de movimiento por nivel.",
          max: 6,
          porNivel: "+4 vel.",
        },
        {
          id: "fortuna",
          ico: "🪙",
          nombre: "Fortuna",
          desc: "+10% de oro obtenido por nivel.",
          max: 5,
          porNivel: "+10% oro",
        },
        {
          id: "crit",
          ico: "🎯",
          nombre: "Ojo Certero",
          desc: "+2% de probabilidad de crítico para todo el grupo por nivel.",
          max: 8,
          porNivel: "+2% crít.",
        },
        {
          id: "cdr",
          ico: "⏱️",
          nombre: "Reflejos del Gremio",
          desc: "+3% de reducción de cooldown de habilidades por nivel.",
          max: 8,
          porNivel: "+3% CDR",
        },
      ];

export function costeMejora(id) {
        const n = META.mejoras[id];
        return 50 + n * 65;
      }

META.skins = { comprados: [], equipada: {} };

export const SKINS = [
        {
          id: "alba",
          nombre: "Alba",
          precio: 120,
          desc: "Blancos y turquesas del amanecer.",
          pal: { H: "#dfe8e4", B: "#9fd4c4", G: "#7fd4c1", L: "#6a8a80" },
        },
        {
          id: "sangre",
          nombre: "Sangre Fría",
          precio: 150,
          desc: "Carmesí oscuro de los lobbys malditos.",
          pal: { H: "#5a1f2a", B: "#8a2f3a", G: "#ff5c5c", L: "#3a1520" },
        },
        {
          id: "sombra",
          nombre: "Sombrío",
          precio: 150,
          desc: "Negro absoluto con destellos arcanos.",
          pal: { H: "#26232f", B: "#3a3450", G: "#c084f0", L: "#1a1725" },
        },
        {
          id: "esmeralda",
          nombre: "Esmeralda",
          precio: 200,
          desc: "Verdes profundos del bosque antiguo.",
          pal: { H: "#2f6a4a", B: "#3f8a5a", G: "#7fffb0", L: "#1f4a35" },
        },
        {
          id: "dorado",
          nombre: "Véspero Dorado",
          precio: 300,
          desc: "El oro del propio Lucero. Prestigio puro.",
          pal: { H: "#e9b45c", B: "#c99035", G: "#fff0c8", L: "#8a6b23" },
        },
      ];

cargarMeta();
