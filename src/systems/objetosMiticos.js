// Objetos Míticos (rareza 4, roja/anaranjada): a diferencia del resto del
// equipo, que sale de genItem() con nombre/stats aleatorios, estos son un
// set curado a mano -- cada uno trae un efecto único de verdad (no solo
// mejores números) y por eso no se generan al azar en el loot normal.
// Se obtienen vía fusión legendaria (ver ui/inventory.js) o, con muy poca
// probabilidad, al romper pilares/barriles (ver systems/combat.js).
import { RAREZAS } from "../core/constants.js";
import { az, ri } from "../utils/helpers.js";

export const OBJETOS_MITICOS = [
        {
          id: "espada_pistola",
          nombre: "Espada-Pistola",
          slot: "arma",
          clase: null, // cualquier clase puede empuñarla
          statPool: ["atk", "atk", "crit"],
          efecto: "disparo_secundario",
          efectoDesc: "Tecla R: dispara un proyectil perforante (cd 3s)",
        },
        {
          id: "hacha_verdugo",
          nombre: "Hacha del Verdugo",
          slot: "arma",
          clase: null,
          statPool: ["atk", "atk", "cdr"],
          efecto: "ejecutor",
          efectoDesc: "+50% daño a enemigos por debajo del 25% de vida",
        },
        {
          id: "coraza_fenix",
          nombre: "Coraza del Fénix",
          slot: "armadura",
          clase: null,
          statPool: ["hp", "hp", "armor"],
          efecto: "fenix",
          efectoDesc: "Una vez por partida, sobrevive a un golpe letal con 30% de vida",
        },
        {
          id: "manto_sombras",
          nombre: "Manto de las Sombras",
          slot: "armadura",
          clase: null,
          statPool: ["hp", "vel", "armor"],
          efecto: "sombras",
          efectoDesc: "+0.5s de invulnerabilidad extra al esquivar",
        },
        {
          id: "anillo_tiempo",
          nombre: "Anillo del Tiempo Robado",
          slot: "accesorio",
          clase: null,
          statPool: ["crit", "cdr", "vel"],
          efecto: "robatiempo",
          efectoDesc: "Cada enemigo derrotado reduce 1s el cooldown de tu habilidad",
        },
        {
          id: "amuleto_vampirico",
          nombre: "Amuleto Vampírico",
          slot: "accesorio",
          clase: null,
          statPool: ["hp", "atk", "crit"],
          efecto: "vampirismo",
          efectoDesc: "Los ataques curan un 8% del daño infligido",
        },
      ];

export function tieneEfecto(p, id) {
        if (!p || !p.equipo) return false;
        for (const s in p.equipo) if (p.equipo[s] && p.equipo[s].efecto === id) return true;
        return false;
      }

// Mismas fórmulas de valor por stat que genItem() (ver systems/loot.js),
// solo que con el multiplicador de Mítico y menos stats a la vez -- el
// atractivo de estos objetos es el efecto único, no acumular más números
// que un legendario cargado.
export function genObjetoMitico(f, slot) {
        const candidatos = slot
          ? OBJETOS_MITICOS.filter((o) => o.slot === slot)
          : OBJETOS_MITICOS;
        const base = az(candidatos);
        const rar = RAREZAS[4];
        const stats = {};
        const pool = [...base.statPool];
        for (let i = 0, n = 3; i < n && pool.length; i++) {
          const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          const v = {
            atk: ri(4, 8) + Math.round(f * 0.7 * rar.m),
            hp: ri(16, 28) + Math.round(f * 2.5 * rar.m),
            armor: ri(2, 4) + Math.round(f * 0.5 * rar.m),
            crit: ri(5, 9) + Math.round(rar.m * 2),
            vel: ri(6, 10) + Math.round(rar.m * 2.4),
            cdr: ri(6, 10) + Math.round(rar.m * 2),
          }[k];
          stats[k] = (stats[k] || 0) + v;
        }
        return {
          slot: base.slot,
          clase: base.clase,
          rareza: 4,
          nombre: base.nombre,
          stats,
          efecto: base.efecto,
          efectoDesc: base.efectoDesc,
          // solo las armas llevan contador de kills (ver systems/soul.js:
          // desmantelarArma() lo usa para dar más y mejores fragmentos
          // cuanto más se haya usado el arma) -- las Míticas, al ser
          // únicas y con nombre propio, son de las pocas piezas que tiene
          // sentido que "acumulen historia" en vez de venderse/tirarse.
          ...(base.slot === "arma" ? { kills: 0 } : {}),
        };
      }
