// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W } from "../core/canvas.js";
import { ROLES } from "../core/constants.js";
import { G } from "../core/state.js";
import { statsTot } from "../systems/combat.js";
import { generarMapa, puntoValido } from "../systems/floorgen.js";
import { banner, toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";
import { az, ri, rnd } from "../utils/helpers.js";

export function abrirArenaPvp() {
        if (!G || !G.activo) return;
        G.pausa = true;
        G.arenaLock = true;
        const listos = G.players.length >= 2;
        const lista = G.players
          .map(
            (p) =>
              '<div class="mejora-linea"><div class="mejora-info"><h4 style="color:' +
              p.color +
              '">' +
              p.nombre +
              " · " +
              ROLES[p.rol].nombre +
              "</h4></div></div>",
          )
          .join("");
        document.getElementById("arena-pvp-inner").innerHTML =
          '<div class="tienda-cab">' +
          "<h2>⚔ Arena PvP</h2>" +
          '<p style="color:var(--ceniza);font-size:.85rem;margin-top:4px">Os enfrentáis entre vosotros en una sala cerrada, a vida completa. El daño entre jugadores es total y no hay reanimación: quien cae queda eliminado del combate. Gana quien quede en pie. Al terminar, todos volvéis al vestíbulo curados.</p>' +
          "</div>" +
          lista +
          (listos
            ? ""
            : '<p style="color:var(--sangre);font-size:.8rem;margin-top:8px">Hacen falta al menos 2 aspirantes para el combate.</p>') +
          '<div style="text-align:center;margin-top:14px">' +
          '<button class="btn dorado" ' +
          (listos ? "" : "disabled") +
          ' onclick="comenzarPvp()">Comenzar combate</button> ' +
          '<button class="btn" onclick="cerrarArenaPvp()">Cancelar (Esc)</button></div>';
        mostrar("arena-pvp");
      }

export function cerrarArenaPvp() {
        ocultar("arena-pvp");
        if (G) G.pausa = false;
      }

function comenzarPvp() {
        if (!G || G.players.length < 2) return;
        cerrarArenaPvp();
        iniciarPvP();
      }

function iniciarPvP() {
        G.escena = "pvp";
        G.pvpFinT = 0;
        G.enemigos = [];
        G.projs = [];
        G.areas = [];
        G.drops = [];
        G.fx = [];
        G.objetos = [];
        G.decals = [];
        G.hazards = [];
        G.wx = [];
        G.rayos = [];
        G.rayoCd = 99;
        G.portal = null;
        G.fogata = null;
        G.fogataUsada = true;
        G.descansoT = 0;
        G.mercader = null;
        G.skinNpc = null;
        G.arenaNpc = null;
        G.clima = "despejado";
        generarMapa(az(["sala", "circulo", "rombo"]));
        G.pilares = [];
        const nPil = ri(2, 3);
        for (let i = 0; i < nPil; i++) {
          let px2,
            py2,
            itp = 0;
          do {
            px2 = rnd(160, W - 160);
            py2 = rnd(140, H - 160);
            itp++;
          } while (!puntoValido(px2, py2, 26) && itp < 25);
          if (itp >= 25) continue;
          G.pilares.push({
            x: px2,
            y: py2,
            r: 24,
            destructible: false,
            hp: 0,
            hpMax: 0,
            hurtT: 0,
          });
        }
        const N = G.players.length;
        G.players.forEach((p, i) => {
          const ang = (TAU * i) / N - Math.PI / 2;
          p.x = W / 2 + Math.cos(ang) * 190;
          p.y = H / 2 + Math.sin(ang) * 150;
          p.hp = statsTot(p).hpMax;
          p.res = ROLES[p.rol].res;
          p.escudo = 0;
          p.ko = false;
          p.reviveT = 0;
          p.trail = [];
          p.forma = "humano";
          p.atrapado = null;
          p.rootT = 0;
          p.safeX = p.x;
          p.safeY = p.y;
          p.invulT = 0.6;
        });
        banner("⚔ ARENA PvP — ¡que gane el mejor!");
        toast("Fuego amigo al 100% · sin reanimación", "#d1545c");
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarArenaPvp = cerrarArenaPvp;
window.comenzarPvp = comenzarPvp;
