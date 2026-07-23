// Auto-generated during the modularization refactor (2026-07-23).
import { H, W, cx } from "../core/canvas.js";
import { ELEMENTOS, ELEM_MAGO, FORMAS_DRUIDA, FORMAS_INFO, MAX_NIV_PJ, MAX_PLANTA, NOMBRE_CLIMA, RAREZAS, ROLES, SUPS } from "../core/constants.js";
import { META } from "../core/save.js";
import { G } from "../core/state.js";
import { K, spriteJugador } from "./sprites.js";
import { animGlobal } from "./world.js";
import { NIVEL_ULTI } from "../systems/abilities.js";
import { statsTot, vivos } from "../systems/combat.js";
import { banner } from "../ui/notifications.js";
import { clamp, lighten } from "../utils/helpers.js";

export function barra(x, y, w2, h2, pct, col, txt) {
        pct = clamp(pct, 0, 1);
        // fondo hundido con leve viñeta
        cx.fillStyle = "#0d0b15";
        cx.fillRect(x, y, w2, h2);
        cx.fillStyle = "rgba(0,0,0,.4)";
        cx.fillRect(x, y, w2, Math.min(2, h2 * 0.3));
        if (pct > 0) {
          const g = cx.createLinearGradient(x, y, x, y + h2);
          g.addColorStop(0, lighten(col, 32));
          g.addColorStop(0.55, col);
          g.addColorStop(1, lighten(col, -22));
          cx.fillStyle = g;
          cx.fillRect(x, y, w2 * pct, h2);
          // brillo superior tipo cristal
          cx.fillStyle = "rgba(255,255,255,.22)";
          cx.fillRect(x, y, w2 * pct, Math.max(1, h2 * 0.4));
        }
        cx.strokeStyle = "#3a3453";
        cx.lineWidth = 1;
        cx.strokeRect(x + 0.5, y + 0.5, w2 - 1, h2 - 1);
        if (txt) {
          cx.font = "700 9px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillStyle = "rgba(0,0,0,.6)";
          cx.fillText(txt, x + w2 / 2, y + h2 - 1.5);
          cx.fillStyle = "#e9e3d5";
          cx.fillText(txt, x + w2 / 2, y + h2 - 2.5);
        }
      }

function barraHP(x, y, w2, h2, p, t) {
        if (p.ko) {
          barra(x, y, w2, h2, 0, "#555", "K.O.");
          return;
        }
        const pct = p.hp / t.hpMax;
        const col = pct < 0.3 ? "#c8434b" : pct < 0.6 ? "#d1913a" : "#4f9d5c";
        const txt =
          "HP " +
          Math.ceil(p.hp) +
          "/" +
          t.hpMax +
          (p.escudo > 0 ? " 🛡" + Math.ceil(p.escudo) : "");
        barra(x, y, w2, h2, pct, col, txt);
        if (p.escudo > 0) {
          const escPct = clamp(p.escudo / t.hpMax, 0, 1);
          cx.strokeStyle = "#8fb8e8";
          cx.lineWidth = 1.4;
          cx.globalAlpha = 0.9;
          cx.strokeRect(
            x + 0.5,
            y + 0.5,
            w2 * clamp(pct + escPct, 0, 1) - 1,
            h2 - 1,
          );
          cx.globalAlpha = 1;
        }
        if (pct < 0.25) {
          cx.strokeStyle = "#ff5c5c";
          cx.globalAlpha = 0.35 + Math.sin(animGlobal * 10) * 0.3;
          cx.lineWidth = 2;
          cx.strokeRect(x - 1, y - 1, w2 + 2, h2 + 2);
          cx.globalAlpha = 1;
        }
      }

function iconoCd(x, y, tam, etiqueta, cd, total, col) {
        const listo = cd <= 0;
        cx.fillStyle = "#0d0b15";
        cx.fillRect(x, y, tam, tam);
        const g = cx.createLinearGradient(x, y, x, y + tam);
        g.addColorStop(0, lighten(col, 30));
        g.addColorStop(1, col);
        cx.fillStyle = g;
        cx.globalAlpha = listo ? 1 : 0.32;
        cx.fillRect(x, y, tam, tam);
        cx.globalAlpha = 1;
        if (!listo) {
          const k = clamp(cd / total, 0, 1);
          cx.fillStyle = "rgba(13,11,21,.82)";
          cx.fillRect(x, y, tam, tam * k);
        } else {
          cx.strokeStyle = "rgba(255,255,255,.6)";
          cx.globalAlpha = 0.5 + Math.sin(animGlobal * 8) * 0.35;
          cx.lineWidth = 1;
          cx.strokeRect(x + 0.5, y + 0.5, tam - 1, tam - 1);
          cx.globalAlpha = 1;
        }
        cx.strokeStyle = "#3a3453";
        cx.strokeRect(x + 0.5, y + 0.5, tam - 1, tam - 1);
        cx.fillStyle = listo ? "#1a1206" : "#e9e3d5";
        cx.font = "800 9px Alegreya Sans";
        cx.textAlign = "center";
        cx.fillText(etiqueta, x + tam / 2, y + tam - 4);
      }

export function renderHUD() {
        const pos = [
          [16, 14],
          [W - 206, 14],
          [16, H - 82],
          [W - 206, H - 82],
        ];
        G.players.forEach((p, i) => {
          const [x, y] = pos[i] || pos[0];
          const t = statsTot(p),
            b = ROLES[p.rol];
          const panelG = cx.createLinearGradient(x - 4, y - 4, x - 4, y + 64);
          panelG.addColorStop(0, "rgba(23,20,36,.86)");
          panelG.addColorStop(1, "rgba(11,9,18,.86)");
          cx.fillStyle = panelG;
          cx.beginPath();
          cx.roundRect(x - 4, y - 4, 198, 68, 7);
          cx.fill();
          cx.strokeStyle = p.ko ? "#4a4560" : p.color;
          cx.lineWidth = 1.5;
          cx.globalAlpha = p.ko ? 0.6 : 0.9;
          cx.stroke();
          cx.globalAlpha = 1;
          // marco del retrato con color de rareza de armadura
          const armR = p.equipo.armadura ? p.equipo.armadura.rareza : -1;
          cx.fillStyle = "#0a0812";
          cx.fillRect(x - 1, y + 2, 27, 31);
          cx.drawImage(spriteJugador(p), x, y + 4, 24, 28);
          cx.strokeStyle = armR >= 0 ? RAREZAS[armR].col : "#3a3453";
          cx.lineWidth = 1;
          cx.strokeRect(x - 1.5, y + 1.5, 27, 31);
          cx.fillStyle = p.color;
          cx.font = "800 10px Alegreya Sans";
          cx.textAlign = "left";
          cx.fillText(p.nombre + " · " + b.nombre.split(" ")[0], x + 30, y + 7);
          barraHP(x + 30, y + 11, 130, 10, p, t);
          barra(x + 30, y + 23, 130, 8, p.res / b.res, "#5a9ad1", "");
          // barra XP pequeña debajo
          const xpPct = p.nivel >= MAX_NIV_PJ ? 1 : p.xp / p.xpSig;
          barra(x + 30, y + 33, 85, 5, xpPct, "#4a8a5a", "");
          cx.fillStyle = "#9a93ab";
          cx.font = "700 9px Alegreya Sans";
          cx.textAlign = "left";
          cx.fillText(
            "Nv." +
              p.nivel +
              (p.cartasPendientes > 0 ? " ★" + p.cartasPendientes : ""),
            x + 118,
            y + 39,
          );
          // iconos
          const iy = y + 42;
          if (p.nivel < NIVEL_ULTI) {
            cx.fillStyle = "#1c1830";
            cx.fillRect(x + 30, iy, 16, 16);
            cx.strokeStyle = "#3a3453";
            cx.strokeRect(x + 30.5, iy + 0.5, 15, 15);
            cx.fillStyle = "#9a93ab";
            cx.font = "800 8px Alegreya Sans";
            cx.textAlign = "center";
            cx.fillText("🔒" + NIVEL_ULTI, x + 38, iy + 11);
          } else {
            iconoCd(x + 30, iy, 16, "E", p.skillCd, b.skill.cd, "#e9b45c");
          }
          if (p.rol === "mago") {
            ELEM_MAGO.forEach((el, k) => {
              const col = ELEMENTOS[el].color;
              const sel = p.elemento === el;
              cx.fillStyle = sel ? col : "#3a3453";
              cx.fillRect(x + 52 + k * 20, iy, 16, 16);
              cx.strokeStyle = sel ? "#e9e3d5" : "#3a3453";
              cx.strokeRect(x + 52.5 + k * 20, iy + 0.5, 15, 15);
              cx.fillStyle = sel ? "#1a1206" : "#9a93ab";
              cx.font = "800 9px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText(k + 1, x + 60 + k * 20, iy + 12);
            });
          } else if (p.rol === "clerigo") {
            SUPS.forEach((s, k) =>
              iconoCd(
                x + 52 + k * 20,
                iy,
                16,
                "" + (k + 1),
                p.supCd[k],
                s.cd,
                s.color,
              ),
            );
          } else if (p.rol === "druida") {
            FORMAS_DRUIDA.forEach((fo, k) => {
              const fi = FORMAS_INFO[fo];
              const sel = p.forma === fo;
              cx.fillStyle = sel ? fi.color : "#3a3453";
              cx.fillRect(x + 52 + k * 20, iy, 16, 16);
              cx.strokeStyle = sel ? "#e9e3d5" : "#3a3453";
              cx.strokeRect(x + 52.5 + k * 20, iy + 0.5, 15, 15);
              cx.fillStyle = sel ? "#1a1206" : "#9a93ab";
              cx.font = "800 9px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText(k + 1, x + 60 + k * 20, iy + 12);
            });
          }
          if (p.hasteT > 0) {
            cx.fillStyle = "#e9b45c";
            cx.font = "800 10px Alegreya Sans";
            cx.textAlign = "left";
            cx.fillText("»» " + p.hasteT.toFixed(0) + "s", x + 118, iy + 12);
          }
        });

        // planta arriba-centro
        cx.textAlign = "center";
        cx.fillStyle = "#e9b45c";
        cx.font = "800 15px Cinzel";
        if (G.escena === "lobby") {
          cx.fillText("VESTÍBULO DEL GREMIO", W / 2, 26);
          cx.fillStyle = "#ffd27f";
          cx.font = "800 13px Alegreya Sans";
          cx.fillText("🪙 " + META.oro, W / 2, 44);
        } else if (G.escena === "pvp") {
          cx.fillText("⚔ ARENA PvP", W / 2, 26);
          cx.fillStyle = "#ffd27f";
          cx.font = "800 12px Alegreya Sans";
          cx.fillText(
            vivos().length + " / " + G.players.length + " en pie",
            W / 2,
            44,
          );
        } else {
          cx.fillText("PLANTA " + G.planta + " / " + MAX_PLANTA, W / 2, 26);
          // mini barra de progreso de planta
          const barW = 260;
          const prog = G.planta / MAX_PLANTA;
          cx.fillStyle = "#1a1728";
          cx.fillRect(W / 2 - barW / 2, 32, barW, 6);
          cx.fillStyle = "#e9b45c";
          cx.fillRect(W / 2 - barW / 2, 32, barW * prog, 6);
          for (let f2 = 5; f2 <= MAX_PLANTA; f2 += 5) {
            const bx = W / 2 - barW / 2 + barW * (f2 / MAX_PLANTA);
            cx.fillStyle = G.planta >= f2 ? "#c07be0" : "#6a5080";
            cx.fillRect(bx - 1, 30, 2, 10);
          }
          cx.strokeStyle = "#3a3453";
          cx.strokeRect(W / 2 - barW / 2 - 0.5, 31.5, barW + 1, 7);
          // oro de esta partida y clima
          cx.fillStyle = "#ffd27f";
          cx.font = "800 12px Alegreya Sans";
          cx.fillText(
            "🪙 " +
              G.oroRun +
              (NOMBRE_CLIMA[G.clima] ? "   " + NOMBRE_CLIMA[G.clima] : ""),
            W / 2,
            54,
          );
        }

        // jefe
        const jefe = G.enemigos.find((e) => e.jefe);
        if (jefe) {
          cx.fillStyle = "rgba(10,8,16,.55)";
          cx.beginPath();
          cx.roundRect(W / 2 - 178, H - 30, 356, 29, 6);
          cx.fill();
          cx.strokeStyle = "#6a3f8a";
          cx.lineWidth = 1;
          cx.stroke();
          const critico = jefe.hp / jefe.hpMax < 0.2;
          if (critico) {
            cx.strokeStyle = "#ff5c5c";
            cx.globalAlpha = 0.4 + Math.sin(animGlobal * 10) * 0.3;
            cx.lineWidth = 1.5;
            cx.stroke();
            cx.globalAlpha = 1;
          }
          barra(
            W / 2 - 170,
            H - 18,
            340,
            13,
            jefe.hp / jefe.hpMax,
            critico ? "#c8434b" : "#c07be0",
            jefe.nombre,
          );
        }

        // toasts
        let ty = 64;
        cx.textAlign = "center";
        for (const to of G.toasts) {
          cx.globalAlpha = clamp(to.t, 0, 1);
          cx.fillStyle = to.col;
          cx.font = "700 12px Alegreya Sans";
          cx.fillText(to.txt, W / 2, ty);
          ty += 16;
          cx.globalAlpha = 1;
        }
        if (G.banner.t > 0) {
          cx.globalAlpha = clamp(G.banner.t / 0.5, 0, 1);
          cx.fillStyle = "#e9b45c";
          cx.font = "800 26px Cinzel";
          cx.textAlign = "center";
          cx.fillText(G.banner.txt, W / 2, H * 0.3);
          cx.globalAlpha = 1;
        }
      }
