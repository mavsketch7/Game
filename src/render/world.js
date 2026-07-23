// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W, cx } from "../core/canvas.js";
import { ELEMENTOS, MAX_PLANTA, RAREZAS, SUPS } from "../core/constants.js";
import { G } from "../core/state.js";
import { fxParticulas } from "./effects.js";
import { barra, renderHUD } from "./hud.js";
import { ATTACK_DUR, ESC_FORMA, KENNEY_TILE, NO_SCHEMATIC_WEAPON, REAL_ATTACK, REAL_RUN, REAL_SPRITE_SCALE, SHEETS, SPR, SPR_FORMAS, assetOK, spriteJugador, wallPatron } from "./sprites.js";
import { groundTarget } from "../systems/abilities.js";
import { masCercano } from "../systems/combat.js";
import { mouse } from "../systems/input.js";
import { clamp, ri, rnd } from "../utils/helpers.js";

export let sueloPat = null,
        sueloPlanta = -1,
        animGlobal = 0;

function patronSuelo(f) {
        // prueba: tile real de Kenney Tiny Dungeon (misma familia visual que
        // enemigos/PNJs/props ya sustituidos), con prioridad sobre la textura
        // suelo1/suelo2 anterior para lograr coherencia visual.
        const kenneyKey = f % 10 < 5 ? "floorA" : "floorB";
        if (KENNEY_TILE[kenneyKey]) return cx.createPattern(KENNEY_TILE[kenneyKey], "repeat");
        // usar baldosa de mazmorra tileable (espejada, sin costuras)
        const tileKey = f % 10 < 5 ? "suelo1" : "suelo2";
        if (assetOK(tileKey)) {
          const src = SHEETS[tileKey];
          // dibujar la baldosa a un tamaño múltiplo entero para que encaje limpia
          const TS = 128;
          const c = document.createElement("canvas");
          c.width = TS;
          c.height = TS;
          const g = c.getContext("2d");
          g.imageSmoothingEnabled = true;
          g.drawImage(
            src,
            0,
            0,
            src.naturalWidth,
            src.naturalHeight,
            0,
            0,
            TS,
            TS,
          );
          // viñeteado sutil para que los sprites resalten
          g.fillStyle = "rgba(10,8,17,.22)";
          g.fillRect(0, 0, TS, TS);
          return cx.createPattern(c, "repeat");
        }
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        const g = c.getContext("2d");
        const t = f / MAX_PLANTA;
        const base =
          t > 0.9
            ? "#2a1520"
            : t > 0.7
              ? "#221a2e"
              : t > 0.5
                ? "#1f1a30"
                : t > 0.3
                  ? "#1b1728"
                  : "#181524";
        const alt =
          t > 0.9
            ? "#341820"
            : t > 0.7
              ? "#271e33"
              : t > 0.5
                ? "#241e36"
                : t > 0.3
                  ? "#201b2e"
                  : "#1c1929";
        g.fillStyle = base;
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = alt;
        g.fillRect(0, 0, 32, 32);
        g.fillRect(32, 32, 32, 32);
        g.fillStyle = "rgba(0,0,0,.25)";
        for (let i = 0; i < 5; i++)
          g.fillRect(ri(0, 60), ri(0, 60), ri(2, 5), 1);
        return cx.createPattern(c, "repeat");
      }

function drawSprite(img, x, y, flip, esc) {
        esc = esc || 1;
        cx.save();
        cx.translate(Math.round(x), Math.round(y));
        if (flip) cx.scale(-1, 1);
        cx.scale(esc, esc);
        cx.drawImage(img, -img.width / 2, -img.height / 2);
        cx.restore();
      }

function dibujarHeroe(p, x, y, mov) {
        let img = spriteJugador(p);
        const atkFrames = REAL_ATTACK[p.rol];
        const runFrames = REAL_RUN[p.rol];
        if (p.swingT > 0 && atkFrames && atkFrames.length) {
          const dur = ATTACK_DUR[p.rol] || 0.2;
          const prog = clamp(1 - p.swingT / dur, 0, 0.999);
          const fr = atkFrames[Math.floor(prog * atkFrames.length)];
          if (fr) img = fr;
        } else if (mov && runFrames && runFrames.length) {
          const fr = runFrames[Math.floor(p.anim * 10) % runFrames.length];
          if (fr) img = fr;
        }
        drawSprite(img, x, y - 6, Math.cos(p.aim) < 0, REAL_SPRITE_SCALE[p.rol] || 1);
      }

export function render() {
        animGlobal += 0.016;
        if (window._sueloDirty) {
          sueloPlanta = -2;
          window._sueloDirty = false;
        }
        if (sueloPlanta !== (G ? G.planta : -2)) {
          sueloPat = patronSuelo(G ? G.planta : 1);
          sueloPlanta = G ? G.planta : -2;
        }
        cx.save();
        if (G && G.shake > 0)
          cx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
        cx.fillStyle = sueloPat;
        cx.fillRect(0, 0, W, H);
        cx.strokeStyle = "#3a3453";
        cx.lineWidth = 8;
        cx.strokeRect(10, 10, W - 20, H - 20);
        if (!G) {
          cx.restore();
          return;
        }

        // forma de la sala: vacío exterior y muros
        if (G.forma === "circulo" || G.forma === "rombo") {
          cx.fillStyle = "#0a0812";
          cx.beginPath();
          cx.rect(0, 0, W, H);
          if (G.forma === "circulo")
            cx.ellipse(W / 2, H / 2, W / 2 - 24, H / 2 - 24, 0, 0, TAU);
          else {
            cx.moveTo(W / 2, 20);
            cx.lineTo(W - 20, H / 2);
            cx.lineTo(W / 2, H - 20);
            cx.lineTo(20, H / 2);
            cx.closePath();
          }
          cx.fill("evenodd");
          cx.strokeStyle = "#3a3453";
          cx.lineWidth = 6;
          cx.beginPath();
          if (G.forma === "circulo")
            cx.ellipse(W / 2, H / 2, W / 2 - 24, H / 2 - 24, 0, 0, TAU);
          else {
            cx.moveTo(W / 2, 20);
            cx.lineTo(W - 20, H / 2);
            cx.lineTo(W / 2, H - 20);
            cx.lineTo(20, H / 2);
            cx.closePath();
          }
          cx.stroke();
        }
        const wallPat = wallPatron();
        for (const m of G.muros) {
          if (wallPat) {
            cx.fillStyle = wallPat;
            cx.fillRect(m.x, m.y, m.w, m.h);
            cx.strokeStyle = "rgba(10,8,17,.6)";
            cx.lineWidth = 2;
            cx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
            continue;
          }
          cx.fillStyle = "#0a0812";
          cx.fillRect(m.x, m.y, m.w, m.h);
          cx.fillStyle = "#221d36";
          cx.fillRect(m.x, m.y, m.w, 6);
          cx.strokeStyle = "#3a3453";
          cx.lineWidth = 2;
          cx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
          cx.strokeStyle = "rgba(58,52,83,.35)";
          cx.lineWidth = 1;
          for (let yy = m.y + 14; yy < m.y + m.h; yy += 14) {
            cx.beginPath();
            cx.moveTo(m.x + 2, yy);
            cx.lineTo(m.x + m.w - 2, yy);
            cx.stroke();
          }
        }

        // fogata
        if (G.fogata) {
          const f = G.fogata;
          cx.fillStyle = "#4a3b2c";
          cx.fillRect(f.x - 10, f.y + 2, 20, 5);
          if (!G.fogataUsada) {
            const fl = Math.sin(animGlobal * 14) * 2;
            cx.fillStyle = "#ff7d4d";
            cx.beginPath();
            cx.moveTo(f.x - 7, f.y + 3);
            cx.lineTo(f.x, f.y - 12 - fl);
            cx.lineTo(f.x + 7, f.y + 3);
            cx.closePath();
            cx.fill();
            cx.fillStyle = "#ffd27f";
            cx.beginPath();
            cx.moveTo(f.x - 4, f.y + 3);
            cx.lineTo(f.x, f.y - 6 - fl);
            cx.lineTo(f.x + 4, f.y + 3);
            cx.closePath();
            cx.fill();
            if (G.descansoT > 0) {
              cx.strokeStyle = "#7fd4c1";
              cx.lineWidth = 3;
              cx.beginPath();
              cx.arc(
                f.x,
                f.y - 4,
                18,
                -Math.PI / 2,
                -Math.PI / 2 + TAU * (G.descansoT / 2.2),
              );
              cx.stroke();
            }
          } else {
            cx.fillStyle = "#555";
            cx.fillRect(f.x - 4, f.y - 3, 8, 4);
          }
        }

        // portal
        if (G.portal) {
          const po = G.portal;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(233,180,92," + (0.9 - k * 0.28) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              po.x,
              po.y,
              po.r - k * 6 + Math.sin(po.t * 3 + k) * 2,
              0,
              TAU,
            );
            cx.stroke();
          }
          cx.fillStyle = "#e9b45c";
          cx.font = "700 11px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText(
            "PLANTA " +
              (G.planta + 1) +
              "  (" +
              (po.dentro || 0) +
              "/" +
              (po.total || 1) +
              ")",
            po.x,
            po.y + po.r + 16,
          );
        }

        // áreas
        for (const a of G.areas) {
          const col =
            a.clase === "elem"
              ? ELEMENTOS[a.elemento].color
              : a.clase === "malArea"
                ? a.color || "#57496f"
                : SUPS[0].color;
          const alfa = a.ttl < 0.4 ? a.ttl / 0.4 : 1;
          const rr = a.nace > 0 ? a.r * (1 - a.nace / 0.15) : a.r;
          cx.globalAlpha = 0.22 * alfa;
          cx.fillStyle = col;
          cx.beginPath();
          cx.arc(a.x, a.y, rr, 0, TAU);
          cx.fill();
          cx.globalAlpha = 0.85 * alfa;
          cx.strokeStyle = col;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(a.x, a.y, rr, 0, TAU);
          cx.stroke();
          for (let k = 0; k < 5; k++) {
            const a2 = animGlobal * 1.6 + (k / 5) * TAU;
            cx.fillRect(
              a.x + Math.cos(a2) * (rr - 7) - 2,
              a.y + Math.sin(a2) * (rr - 7) - 2,
              4,
              4,
            );
          }
          if (a.clase === "sanar") {
            cx.fillRect(a.x - 2, a.y - 7, 4, 14);
            cx.fillRect(a.x - 7, a.y - 2, 14, 4);
          }
          cx.globalAlpha = 1;
        }

        // ---- zonas del suelo ----
        for (const hz of G.hazards) {
          if (hz.tipo === "grieta") {
            if (hz.estado === 2) {
              // agujero
              cx.fillStyle = "#0a0812";
              cx.beginPath();
              cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.7, 0, 0, TAU);
              cx.fill();
              cx.strokeStyle = "#26232f";
              cx.lineWidth = 2;
              cx.beginPath();
              cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.7, 0, 0, TAU);
              cx.stroke();
            } else {
              // grietas visibles (parpadeo si está cediendo)
              cx.strokeStyle = hz.estado === 1 ? "#6a5a94" : "#26232f";
              cx.globalAlpha =
                hz.estado === 1 ? 0.6 + Math.sin(animGlobal * 24) * 0.35 : 0.8;
              cx.lineWidth = 1.5;
              cx.beginPath();
              cx.moveTo(hz.x - hz.r * 0.8, hz.y);
              cx.lineTo(hz.x - hz.r * 0.2, hz.y - hz.r * 0.4);
              cx.lineTo(hz.x + hz.r * 0.3, hz.y + hz.r * 0.2);
              cx.lineTo(hz.x + hz.r * 0.8, hz.y - hz.r * 0.1);
              cx.moveTo(hz.x - hz.r * 0.3, hz.y + hz.r * 0.5);
              cx.lineTo(hz.x + hz.r * 0.1, hz.y - hz.r * 0.1);
              cx.stroke();
              cx.globalAlpha = 1;
            }
          } else if (hz.tipo === "arena") {
            cx.fillStyle = "#8a6b43";
            cx.globalAlpha = 0.55;
            cx.beginPath();
            cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.8, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = 0.9;
            cx.strokeStyle = "#c9a35a";
            cx.lineWidth = 1.5;
            // remolino
            for (let k = 0; k < 3; k++) {
              cx.beginPath();
              cx.arc(
                hz.x,
                hz.y,
                hz.r * 0.3 + k * hz.r * 0.24,
                hz.fase * 0.8 + k,
                hz.fase * 0.8 + k + 4,
              );
              cx.stroke();
            }
            cx.globalAlpha = 1;
          } else if (hz.tipo === "ortiga") {
            cx.fillStyle = "#2f5a2a";
            cx.globalAlpha = 0.45;
            cx.beginPath();
            cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.75, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            cx.fillStyle = "#4a8a3a";
            for (let k = 0; k < 7; k++) {
              const a = (k / 7) * TAU + hz.x;
              const sx = hz.x + Math.cos(a) * hz.r * 0.5,
                sy = hz.y + Math.sin(a) * hz.r * 0.4;
              cx.beginPath();
              cx.moveTo(sx - 3, sy + 3);
              cx.lineTo(sx, sy - 6 - Math.sin(animGlobal * 2 + k) * 1.5);
              cx.lineTo(sx + 3, sy + 3);
              cx.closePath();
              cx.fill();
            }
          } else if (hz.tipo === "telarana") {
            cx.strokeStyle = "#e8e0d0";
            cx.globalAlpha = 0.5;
            cx.lineWidth = 1;
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * TAU;
              cx.beginPath();
              cx.moveTo(hz.x, hz.y);
              cx.lineTo(hz.x + Math.cos(a) * hz.r, hz.y + Math.sin(a) * hz.r);
              cx.stroke();
            }
            for (let k = 1; k <= 2; k++) {
              cx.beginPath();
              cx.arc(hz.x, hz.y, (hz.r * k) / 2.4, 0, TAU);
              cx.stroke();
            }
            cx.globalAlpha = 1;
          } else if (hz.tipo === "fuegoZona") {
            cx.fillStyle = "#ff7d4d";
            cx.globalAlpha = 0.25 + Math.sin(animGlobal * 8 + hz.x) * 0.08;
            cx.beginPath();
            cx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.8, 0, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            for (let k = 0; k < 5; k++) {
              const a = (k / 5) * TAU + hz.fase;
              const fx2 = hz.x + Math.cos(a) * hz.r * 0.5,
                fy = hz.y + Math.sin(a) * hz.r * 0.4;
              const fl = Math.sin(animGlobal * 11 + k * 2) * 2;
              cx.fillStyle = k % 2 ? "#ff7d4d" : "#ffd27f";
              cx.beginPath();
              cx.moveTo(fx2 - 3, fy + 2);
              cx.lineTo(fx2, fy - 7 - fl);
              cx.lineTo(fx2 + 3, fy + 2);
              cx.closePath();
              cx.fill();
            }
          }
        }

        // telegrafiados de rayos y meteoros
        for (const ry of G.rayos) {
          const k = 1 - ry.t / (ry.meteoro ? 1.0 : 0.85);
          cx.strokeStyle = ry.meteoro ? "#ff7d4d" : "#cfe4ff";
          cx.globalAlpha = 0.4 + Math.sin(animGlobal * 18) * 0.25;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(ry.x, ry.y, 46, 0, TAU);
          cx.stroke();
          cx.beginPath();
          cx.arc(ry.x, ry.y, 46 * k, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
          if (ry.meteoro) {
            // el meteoro cayendo
            const my = ry.y - 260 * (1 - k);
            cx.fillStyle = "#ff9d3d";
            cx.beginPath();
            cx.arc(ry.x + 30 * (1 - k), my, 6, 0, TAU);
            cx.fill();
            cx.strokeStyle = "rgba(255,125,77,.5)";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.moveTo(ry.x + 30 * (1 - k) + 8, my - 14);
            cx.lineTo(ry.x + 30 * (1 - k), my);
            cx.stroke();
          }
        }

        // escombros de columnas destruidas
        for (const dc of G.decals) {
          cx.fillStyle = "rgba(0,0,0,.3)";
          cx.beginPath();
          cx.ellipse(dc.x, dc.y + 8, 20, 8, 0, 0, TAU);
          cx.fill();
          cx.fillStyle = "#2a2440";
          cx.fillRect(dc.x - 10, dc.y, 7, 5);
          cx.fillRect(dc.x + 2, dc.y + 3, 9, 5);
          cx.fillRect(dc.x - 3, dc.y - 4, 6, 4);
        }

        // pilares (columnas): usa el sprite de columna de mazmorra si está cargado
        for (const pl of G.pilares) {
          if (pl.hurtT > 0) pl.hurtT -= 0.016;
          cx.fillStyle = "rgba(0,0,0,.35)";
          cx.beginPath();
          cx.ellipse(pl.x, pl.y + pl.r * 0.55, pl.r, pl.r * 0.4, 0, 0, TAU);
          cx.fill();
          if (assetOK("pilar")) {
            const src = SHEETS["pilar"];
            const ph = pl.r * 3.4,
              pw = (ph * src.naturalWidth) / src.naturalHeight;
            cx.save();
            cx.imageSmoothingEnabled = false;
            if (pl.hurtT > 0) {
              cx.globalAlpha = 0.85;
            }
            cx.drawImage(src, pl.x - pw / 2, pl.y - ph * 0.72, pw, ph);
            if (pl.hurtT > 0) {
              cx.globalCompositeOperation = "source-atop";
              cx.fillStyle = "rgba(190,120,220,.5)";
              cx.fillRect(pl.x - pw / 2, pl.y - ph * 0.72, pw, ph);
              cx.globalCompositeOperation = "source-over";
              cx.globalAlpha = 1;
            }
            cx.restore();
          } else {
            const cuerpo = pl.destructible ? "#3d3555" : "#2d2742";
            const tapa = pl.destructible ? "#4d4468" : "#3a3453";
            cx.fillStyle = pl.hurtT > 0 ? "#6a5a94" : cuerpo;
            cx.fillRect(
              pl.x - pl.r * 0.85,
              pl.y - pl.r * 1.5,
              pl.r * 1.7,
              pl.r * 2,
            );
            cx.fillStyle = tapa;
            cx.beginPath();
            cx.ellipse(
              pl.x,
              pl.y - pl.r * 1.5,
              pl.r * 0.95,
              pl.r * 0.35,
              0,
              0,
              TAU,
            );
            cx.fill();
            cx.beginPath();
            cx.ellipse(
              pl.x,
              pl.y + pl.r * 0.5,
              pl.r * 0.9,
              pl.r * 0.32,
              0,
              0,
              TAU,
            );
            cx.fill();
          }
          // grietas / barra de vida según daño
          if (pl.destructible && pl.hp < pl.hpMax) {
            const danio = 1 - pl.hp / pl.hpMax;
            cx.strokeStyle = "rgba(10,8,17,.7)";
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.moveTo(pl.x - 4, pl.y - pl.r * 1.2);
            cx.lineTo(pl.x + 2, pl.y - pl.r * 0.5);
            cx.lineTo(pl.x - 3, pl.y);
            if (danio > 0.5) {
              cx.moveTo(pl.x + 8, pl.y - pl.r);
              cx.lineTo(pl.x + 3, pl.y - pl.r * 0.2);
              cx.lineTo(pl.x + 9, pl.y + pl.r * 0.3);
            }
            cx.stroke();
            cx.fillStyle = "#0d0b15";
            cx.fillRect(pl.x - 14, pl.y - pl.r * 1.9, 28, 4);
            cx.fillStyle = "#9a93ab";
            cx.fillRect(
              pl.x - 14,
              pl.y - pl.r * 1.9,
              (28 * pl.hp) / pl.hpMax,
              4,
            );
          }
        }

        // objetos del nivel
        for (const o of G.objetos) {
          if (o.tipo === "barril") {
            cx.fillStyle = "rgba(0,0,0,.3)";
            cx.beginPath();
            cx.ellipse(o.x, o.y + 12, 11, 4, 0, 0, TAU);
            cx.fill();
            drawSprite(SPR.barril, o.x, o.y);
          } else if (o.tipo === "cofre") {
            cx.fillStyle = "rgba(0,0,0,.3)";
            cx.beginPath();
            cx.ellipse(o.x, o.y + 10, 14, 5, 0, 0, TAU);
            cx.fill();
            drawSprite(o.abierto ? SPR.cofreAb : SPR.cofre, o.x, o.y);
            if (!o.abierto) {
              cx.globalAlpha = 0.3 + Math.sin(animGlobal * 3) * 0.15;
              cx.fillStyle = "#e9b45c";
              cx.beginPath();
              cx.arc(o.x, o.y, 18, 0, TAU);
              cx.fill();
              cx.globalAlpha = 1;
            }
          } else if (o.tipo === "cristal") {
            const bob = Math.sin(animGlobal * 3 + o.x) * 3;
            cx.globalAlpha = 0.3;
            cx.fillStyle = "#6fb8e8";
            cx.beginPath();
            cx.arc(o.x, o.y + bob, 14, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            drawSprite(SPR.cristal, o.x, o.y + bob);
          } else if (o.tipo === "brasero") {
            cx.fillStyle = "#3a3453";
            cx.fillRect(o.x - 6, o.y - 2, 12, 8);
            cx.fillStyle = "#2a2440";
            cx.fillRect(o.x - 8, o.y + 5, 16, 3);
            const fl = Math.sin(animGlobal * 11 + o.x) * 2;
            cx.fillStyle = "#ff7d4d";
            cx.beginPath();
            cx.moveTo(o.x - 5, o.y - 1);
            cx.lineTo(o.x, o.y - 12 - fl);
            cx.lineTo(o.x + 5, o.y - 1);
            cx.closePath();
            cx.fill();
            cx.fillStyle = "#ffd27f";
            cx.beginPath();
            cx.moveTo(o.x - 3, o.y - 1);
            cx.lineTo(o.x, o.y - 7 - fl);
            cx.lineTo(o.x + 3, o.y - 1);
            cx.closePath();
            cx.fill();
          }
        }

        // mercader (lobby)
        if (G.mercader) {
          const m = G.mercader;
          cx.fillStyle = "rgba(0,0,0,.35)";
          cx.beginPath();
          cx.ellipse(m.x, m.y + 16, 12, 4, 0, 0, TAU);
          cx.fill();
          drawSprite(
            SPR.mercader,
            m.x,
            m.y - 6 + Math.sin(animGlobal * 2) * 1.5,
          );
          drawSprite(SPR.moneda, m.x, m.y - 38 + Math.sin(animGlobal * 3) * 3);
          cx.fillStyle = "#ffd27f";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("MERCADER — acércate", m.x, m.y + 34);
        }
        // sastre de skins (lobby)
        if (G.skinNpc) {
          const m = G.skinNpc;
          cx.fillStyle = "rgba(0,0,0,.35)";
          cx.beginPath();
          cx.ellipse(m.x, m.y + 16, 12, 4, 0, 0, TAU);
          cx.fill();
          // el sastre luce la skin dorada, por supuesto
          drawSprite(
            SPR.sastre,
            m.x,
            m.y - 6 + Math.sin(animGlobal * 2.3 + 1) * 1.5,
          );
          // aguja de sastre flotante (rombo que rota)
          cx.save();
          cx.translate(m.x, m.y - 38 + Math.sin(animGlobal * 3 + 1) * 3);
          cx.rotate(animGlobal * 2);
          cx.fillStyle = "#c084f0";
          cx.fillRect(-4, -4, 8, 8);
          cx.restore();
          cx.fillStyle = "#c084f0";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("SASTRE — skins", m.x, m.y + 34);
        }
        // portal de la Arena PvP (lobby)
        if (G.arenaNpc) {
          const m = G.arenaNpc;
          for (let k = 0; k < 3; k++) {
            cx.strokeStyle = "rgba(209,84,92," + (0.9 - k * 0.28) + ")";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              m.x,
              m.y,
              22 - k * 6 + Math.sin(animGlobal * 3 + k) * 2,
              0,
              TAU,
            );
            cx.stroke();
          }
          cx.fillStyle = "#ff5c5c";
          cx.font = "700 13px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("⚔", m.x, m.y + 5);
          cx.fillStyle = "#d1545c";
          cx.font = "700 10px Alegreya Sans";
          cx.fillText("ARENA PvP — acércate", m.x, m.y + 34);
        }

        // drops
        for (const dr of G.drops) {
          const bob = Math.sin(animGlobal * 4 + dr.x) * 3;
          if (dr.tipo === "vial") drawSprite(SPR.vial, dr.x, dr.y + bob);
          else if (dr.tipo === "moneda") {
            cx.globalAlpha = 0.3;
            cx.fillStyle = "#ffd27f";
            cx.beginPath();
            cx.arc(dr.x, dr.y + bob, 10, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            drawSprite(SPR.moneda, dr.x, dr.y + bob);
          } else {
            cx.globalAlpha = 0.35;
            cx.fillStyle = RAREZAS[dr.item.rareza].col;
            cx.beginPath();
            cx.arc(dr.x, dr.y + bob, 14, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
            drawSprite(SPR.gema[dr.item.rareza], dr.x, dr.y + bob);
          }
        }

        // entidades ordenadas por Y
        const ents = [
          ...G.enemigos.map((e) => ({ t: "e", y: e.y, e })),
          ...G.players.map((p) => ({ t: "p", y: p.y, p })),
        ];
        ents.sort((a, b) => a.y - b.y);
        for (const en of ents) {
          if (en.t === "e") renderEnemigo(en.e);
          else renderJugador(en.p);
        }

        // proyectiles
        for (const pr of G.projs) {
          if (pr.tipo === "flecha") {
            cx.save();
            cx.translate(pr.x, pr.y);
            cx.rotate(Math.atan2(pr.vy, pr.vx));
            cx.fillStyle = pr.color;
            cx.fillRect(-8, -1.5, 14, 3);
            cx.beginPath();
            cx.moveTo(6, -4);
            cx.lineTo(12, 0);
            cx.lineTo(6, 4);
            cx.closePath();
            cx.fill();
            cx.restore();
          } else if (pr.tipo === "rama") {
            cx.save();
            cx.translate(pr.x, pr.y);
            cx.rotate(animGlobal * 14 + pr.x);
            cx.fillStyle = "#8a6b43";
            cx.fillRect(-7, -1.5, 14, 3);
            cx.fillStyle = "#6b4a2c";
            cx.fillRect(-2, -3, 3, 2);
            cx.fillStyle = "#6ac04a";
            cx.beginPath();
            cx.ellipse(5, -3, 3, 1.8, -0.5, 0, TAU);
            cx.fill();
            cx.restore();
          } else if (pr.tipo === "bola") {
            // bola de fuego con estela
            cx.fillStyle = "rgba(255,125,77,.35)";
            cx.beginPath();
            cx.arc(pr.x - pr.vx * 0.02, pr.y - pr.vy * 0.02, 5, 0, TAU);
            cx.fill();
            cx.fillStyle = "#ff7d4d";
            cx.beginPath();
            cx.arc(pr.x, pr.y, 5, 0, TAU);
            cx.fill();
            cx.fillStyle = "#ffd27f";
            cx.beginPath();
            cx.arc(pr.x, pr.y, 2.5, 0, TAU);
            cx.fill();
          } else if (pr.tipo === "carambano") {
            cx.save();
            cx.translate(pr.x, pr.y);
            cx.rotate(Math.atan2(pr.vy, pr.vx));
            cx.fillStyle = "#7fc9e8";
            cx.beginPath();
            cx.moveTo(8, 0);
            cx.lineTo(-6, -3.5);
            cx.lineTo(-3, 0);
            cx.lineTo(-6, 3.5);
            cx.closePath();
            cx.fill();
            cx.fillStyle = "#cfe4ff";
            cx.beginPath();
            cx.moveTo(7, 0);
            cx.lineTo(-2, -1.5);
            cx.lineTo(-2, 1.5);
            cx.closePath();
            cx.fill();
            cx.restore();
          } else if (pr.tipo === "tuit") {
            // burbuja de "tuit" azul
            cx.fillStyle = "#4a90d9";
            cx.beginPath();
            cx.arc(pr.x, pr.y, 6, 0, TAU);
            cx.fill();
            cx.fillStyle = "#fff";
            cx.font = "700 8px Alegreya Sans";
            cx.textAlign = "center";
            cx.fillText("!", pr.x, pr.y + 3);
            cx.fillStyle = "#4a90d9";
            cx.beginPath();
            cx.moveTo(pr.x - 4, pr.y + 4);
            cx.lineTo(pr.x - 7, pr.y + 9);
            cx.lineTo(pr.x - 1, pr.y + 6);
            cx.closePath();
            cx.fill();
          } else if (pr.tipo === "orbeArc") {
            const rr = pr.r || 4;
            cx.fillStyle = "rgba(192,132,240,.25)";
            cx.beginPath();
            cx.arc(
              pr.x,
              pr.y,
              rr + 4 + Math.sin(animGlobal * 16) * 1.5,
              0,
              TAU,
            );
            cx.fill();
            cx.fillStyle = "#c084f0";
            cx.beginPath();
            cx.arc(pr.x, pr.y, rr, 0, TAU);
            cx.fill();
            cx.fillStyle = "#e8d5ff";
            cx.beginPath();
            cx.arc(pr.x, pr.y, rr * 0.45, 0, TAU);
            cx.fill();
          } else {
            cx.fillStyle = pr.color;
            cx.beginPath();
            cx.arc(pr.x, pr.y, pr.r, 0, TAU);
            cx.fill();
            cx.globalAlpha = 0.3;
            cx.beginPath();
            cx.arc(pr.x, pr.y, pr.r + 4, 0, TAU);
            cx.fill();
            cx.globalAlpha = 1;
          }
        }

        // fx
        for (const f of G.fx) {
          const k = f.t / f.t0;
          if (f.tipo === "txt") {
            cx.globalAlpha = k;
            cx.fillStyle = f.col;
            cx.font = (f.grande ? "800 16px" : "700 12px") + " Alegreya Sans";
            cx.textAlign = "center";
            cx.fillText(f.txt, f.x, f.y - (1 - k) * 22);
            cx.globalAlpha = 1;
          } else if (f.tipo === "onda") {
            cx.globalAlpha = k;
            cx.strokeStyle = f.col;
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(f.x, f.y, f.r * (1 - k * 0.3) + (1 - k) * 18, 0, TAU);
            cx.stroke();
            cx.globalAlpha = 1;
          } else if (f.tipo === "tajo") {
            // filo afilado: una medialuna que se afina en punta en ambos
            // extremos (no un simple trazo de arco), con un destello claro
            // en el borde de ataque para que brille como un corte de hoja
            const sweep = 1.35;
            const nP = 12;
            const grosor = 7 + f.r * 0.03;
            cx.save();
            cx.globalAlpha = k * k; // se apaga más rápido: sensación de corte instantáneo
            cx.beginPath();
            for (let i = 0; i <= nP; i++) {
              const t2 = i / nP;
              const ang = f.dir - sweep / 2 + t2 * sweep;
              const w = Math.sin(t2 * Math.PI) * grosor;
              const rx = f.x + Math.cos(ang) * (f.r + w * 0.35);
              const ry = f.y + Math.sin(ang) * (f.r + w * 0.35);
              if (i === 0) cx.moveTo(rx, ry);
              else cx.lineTo(rx, ry);
            }
            for (let i = nP; i >= 0; i--) {
              const t2 = i / nP;
              const ang = f.dir - sweep / 2 + t2 * sweep;
              const w = Math.sin(t2 * Math.PI) * grosor;
              const rx = f.x + Math.cos(ang) * (f.r - w * 0.85);
              const ry = f.y + Math.sin(ang) * (f.r - w * 0.85);
              cx.lineTo(rx, ry);
            }
            cx.closePath();
            const grad = cx.createLinearGradient(
              f.x + Math.cos(f.dir - sweep / 2) * f.r,
              f.y + Math.sin(f.dir - sweep / 2) * f.r,
              f.x + Math.cos(f.dir + sweep / 2) * f.r,
              f.y + Math.sin(f.dir + sweep / 2) * f.r,
            );
            grad.addColorStop(0, "rgba(233,227,213,0)");
            grad.addColorStop(0.5, "rgba(255,255,255,.9)");
            grad.addColorStop(1, "rgba(233,180,92,.15)");
            cx.fillStyle = grad;
            cx.fill();
            // destello nítido justo en el filo exterior (borde de ataque)
            cx.strokeStyle = "#fff7e0";
            cx.lineWidth = 1.4;
            cx.beginPath();
            for (let i = 0; i <= nP; i++) {
              const t2 = i / nP;
              const ang = f.dir - sweep / 2 + t2 * sweep;
              const w = Math.sin(t2 * Math.PI) * grosor;
              const rx = f.x + Math.cos(ang) * (f.r + w * 0.35);
              const ry = f.y + Math.sin(ang) * (f.r + w * 0.35);
              if (i === 0) cx.moveTo(rx, ry);
              else cx.lineTo(rx, ry);
            }
            cx.stroke();
            cx.restore();
          } else if (f.tipo === "part") {
            f.x += f.vx * 0.016;
            f.y += f.vy * 0.016;
            cx.globalAlpha = k;
            cx.fillStyle = f.col;
            cx.fillRect(f.x - 2, f.y - 2, 4, 4);
            cx.globalAlpha = 1;
          }
        }

        // ---- capa de clima ----
        if (G.escena === "torre") {
          if (G.clima === "lluvia" || G.clima === "tormenta") {
            cx.strokeStyle =
              G.clima === "tormenta"
                ? "rgba(160,190,230,.5)"
                : "rgba(140,170,210,.35)";
            cx.lineWidth = 1;
            cx.beginPath();
            for (const w2 of G.wx)
              if (w2.tipo === "gota") {
                cx.moveTo(w2.x, w2.y);
                cx.lineTo(w2.x + (w2.vx || 0) * 0.03, w2.y + w2.vy * 0.03);
              }
            cx.stroke();
          } else if (G.clima === "ceniza") {
            cx.fillStyle = "rgba(216,140,100,.55)";
            for (const w2 of G.wx)
              if (w2.tipo === "ceniza") {
                const drift = Math.sin(animGlobal * 1.5 + w2.fase) * 8;
                cx.fillRect(w2.x + drift - 1.5, w2.y - 1.5, 3, 3);
              }
            cx.fillStyle = "rgba(90,40,25,.08)";
            cx.fillRect(0, 0, W, H);
          }
          if (G.clima === "niebla") {
            const nb = cx.createRadialGradient(
              W / 2,
              H / 2,
              120,
              W / 2,
              H / 2,
              W * 0.62,
            );
            nb.addColorStop(0, "rgba(150,145,170,0)");
            nb.addColorStop(1, "rgba(150,145,170,.34)");
            cx.fillStyle = nb;
            cx.fillRect(0, 0, W, H);
            cx.fillStyle = "rgba(150,145,170,.1)";
            for (let k = 0; k < 3; k++) {
              const nx = ((animGlobal * 22 * (k + 1)) % (W + 240)) - 120;
              cx.beginPath();
              cx.ellipse(nx, 110 + k * 150, 150, 42, 0, 0, TAU);
              cx.fill();
            }
          }
          if (G.flashT > 0) {
            cx.fillStyle = "rgba(230,240,255," + (G.flashT / 0.14) * 0.5 + ")";
            cx.fillRect(0, 0, W, H);
          }
        }

        renderMira();
        renderHUD();
        cx.restore();
      }

function renderMira() {
        if (!G || !G.activo || !G.players) return;
        for (const p of G.players) {
          if (p.ko) continue;
          if (p.ctrl.tipo === "kbm") {
            const mx = mouse.x,
              my = mouse.y;
            cx.strokeStyle = p.color;
            cx.globalAlpha = 0.22;
            cx.lineWidth = 1;
            cx.setLineDash([3, 5]);
            cx.beginPath();
            cx.moveTo(p.x, p.y);
            cx.lineTo(mx, my);
            cx.stroke();
            cx.setLineDash([]);
            cx.globalAlpha = 1;
            cx.strokeStyle = p.color;
            cx.lineWidth = 2;
            cx.beginPath();
            cx.moveTo(mx - 9, my);
            cx.lineTo(mx - 4, my);
            cx.moveTo(mx + 4, my);
            cx.lineTo(mx + 9, my);
            cx.moveTo(mx, my - 9);
            cx.lineTo(mx, my - 4);
            cx.moveTo(mx, my + 4);
            cx.lineTo(mx, my + 9);
            cx.stroke();
            const c2 = 6,
              o = 9;
            cx.beginPath();
            cx.moveTo(mx - o, my - o + c2);
            cx.lineTo(mx - o, my - o);
            cx.lineTo(mx - o + c2, my - o);
            cx.moveTo(mx + o - c2, my - o);
            cx.lineTo(mx + o, my - o);
            cx.lineTo(mx + o, my - o + c2);
            cx.moveTo(mx + o, my + o - c2);
            cx.lineTo(mx + o, my + o);
            cx.lineTo(mx + o - c2, my + o);
            cx.moveTo(mx - o + c2, my + o);
            cx.lineTo(mx - o, my + o);
            cx.lineTo(mx - o, my + o - c2);
            cx.lineWidth = 1.5;
            cx.stroke();
            cx.strokeStyle = "rgba(255,255,255,.75)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(mx, my, 3, 0, TAU);
            cx.stroke();
          } else if (p.ctrl.tipo === "pad") {
            const d = 44;
            const ax = p.x + Math.cos(p.aim) * d,
              ay = p.y + Math.sin(p.aim) * d;
            cx.strokeStyle = p.color;
            cx.globalAlpha = 0.18;
            cx.lineWidth = 1;
            cx.setLineDash([3, 5]);
            cx.beginPath();
            cx.moveTo(p.x, p.y);
            cx.lineTo(ax, ay);
            cx.stroke();
            cx.setLineDash([]);
            cx.globalAlpha = 0.9;
            cx.save();
            cx.translate(ax, ay);
            cx.rotate(p.aim);
            cx.fillStyle = p.color;
            cx.beginPath();
            cx.moveTo(6, 0);
            cx.lineTo(-4, -5);
            cx.lineTo(-1, 0);
            cx.lineTo(-4, 5);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "#141020";
            cx.lineWidth = 1;
            cx.stroke();
            cx.restore();
            cx.globalAlpha = 1;
          }
        }
      }

function dibujarCargaMago(p, tx, ty) {
        cx.fillStyle = ELEMENTOS[p.elemento].color;
        cx.beginPath();
        cx.arc(tx, ty, 4, 0, TAU);
        cx.fill();
        cx.fillStyle = "rgba(255,255,255,.55)";
        cx.beginPath();
        cx.arc(tx - 1.3, ty - 1.4, 1.3, 0, TAU);
        cx.fill();
        if (p.cargaT > 0) {
          const c = clamp(p.cargaT / 1.1, 0, 1);
          cx.fillStyle = "rgba(192,132,240,.3)";
          cx.beginPath();
          cx.arc(tx, ty, 4 + c * 11 + Math.sin(animGlobal * 20) * 1.5, 0, TAU);
          cx.fill();
          cx.fillStyle = "#c084f0";
          cx.beginPath();
          cx.arc(tx, ty, 3 + c * 8, 0, TAU);
          cx.fill();
          cx.fillStyle = "#e8d5ff";
          cx.beginPath();
          cx.arc(tx, ty, (3 + c * 8) * 0.45, 0, TAU);
          cx.fill();
          if (c >= 1) {
            cx.strokeStyle = "#fff";
            cx.globalAlpha = 0.5 + Math.sin(animGlobal * 22) * 0.4;
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(tx, ty, 4 + c * 11, 0, TAU);
            cx.stroke();
            cx.globalAlpha = 1;
          }
        }
      }

function renderJugador(p) {
        const eq = p.equipo;
        cx.fillStyle = "rgba(0,0,0,.35)";
        cx.beginPath();
        cx.ellipse(p.x, p.y + 16, 11, 4, 0, 0, TAU);
        cx.fill();
        // anillo de color del jugador
        cx.strokeStyle = p.color;
        cx.globalAlpha = 0.75;
        cx.lineWidth = 2;
        cx.beginPath();
        cx.ellipse(p.x, p.y + 16, 13, 5, 0, 0, TAU);
        cx.stroke();
        cx.globalAlpha = 1;

        if (p.ko) {
          cx.save();
          cx.translate(p.x, p.y);
          cx.rotate(Math.PI / 2);
          cx.globalAlpha = 0.55;
          cx.drawImage(spriteJugador(p), -21, -18);
          cx.restore();
          cx.globalAlpha = 1;
          cx.strokeStyle = "#7fd4c1";
          cx.lineWidth = 3;
          cx.beginPath();
          cx.arc(
            p.x,
            p.y - 26,
            12,
            -Math.PI / 2,
            -Math.PI / 2 + TAU * (p.reviveT / 2),
          );
          cx.stroke();
          cx.fillStyle = "#d1545c";
          cx.font = "800 11px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("✚ reanimar", p.x, p.y - 42);
          return;
        }

        for (const tr of p.trail) {
          cx.globalAlpha = (tr.t / 0.25) * 0.4;
          if (p.rol === "druida" && p.forma && p.forma !== "humano")
            drawSprite(
              SPR_FORMAS[p.forma],
              tr.x,
              tr.y - 4,
              Math.cos(p.aim) < 0,
              ESC_FORMA[p.forma],
            );
          else dibujarHeroe(p, tr.x, tr.y, false);
        }
        cx.globalAlpha = 1;
        // celebración de subida de nivel: aura dorada expansiva + chispas ascendentes
        if (p.lvlT > 0) {
          const k = p.lvlT / 1.5;
          cx.strokeStyle = "#ffd27f";
          cx.globalAlpha = k * 0.9;
          cx.lineWidth = 3;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 22 + (1 - k) * 38, 0, TAU);
          cx.stroke();
          cx.strokeStyle = "#e9b45c";
          cx.globalAlpha = k * 0.5;
          cx.lineWidth = 1.5;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 14 + (1 - k) * 60, 0, TAU);
          cx.stroke();
          cx.globalAlpha = k;
          for (let s = 0; s < 6; s++) {
            const sa = (s / 6) * TAU + animGlobal * 2;
            const sy = p.y - 10 - (1 - k) * 44 - s * 4;
            cx.fillStyle = s % 2 ? "#ffd27f" : "#fff0c8";
            cx.fillRect(p.x + Math.cos(sa) * 16 - 1.5, sy - 1.5, 3, 3);
          }
          cx.globalAlpha = 1;
        }
        // atrapado en arenas: anillo de QTE + progreso de rescate
        if (p.atrapado) {
          cx.strokeStyle = "#c9a35a";
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 24, 0, TAU);
          cx.stroke();
          // ventana verde (0.60–0.85 del ciclo)
          cx.strokeStyle = "#7fd4c1";
          cx.lineWidth = 5;
          cx.beginPath();
          cx.arc(
            p.x,
            p.y - 4,
            24,
            -Math.PI / 2 + TAU * 0.6,
            -Math.PI / 2 + TAU * 0.85,
          );
          cx.stroke();
          // marcador giratorio
          const qa = -Math.PI / 2 + TAU * p.qteT;
          cx.fillStyle = "#e9e3d5";
          cx.beginPath();
          cx.arc(
            p.x + Math.cos(qa) * 24,
            p.y - 4 + Math.sin(qa) * 24,
            4,
            0,
            TAU,
          );
          cx.fill();
          for (let k = 0; k < 3; k++) {
            cx.fillStyle = k < p.qteHits ? "#7fd4c1" : "#3a3453";
            cx.fillRect(p.x - 12 + k * 10, p.y - 44, 7, 7);
          }
          if (p.rescT > 0) {
            cx.strokeStyle = "#e9b45c";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(
              p.x,
              p.y - 4,
              30,
              -Math.PI / 2,
              -Math.PI / 2 + TAU * (p.rescT / 1.2),
            );
            cx.stroke();
          }
          cx.fillStyle = "#c9a35a";
          cx.font = "800 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("⏳ esquive en verde o pide ayuda", p.x, p.y + 34);
        }
        // enraizado por telaraña
        if (p.rootT > 0) {
          cx.strokeStyle = "#e8e0d0";
          cx.globalAlpha = 0.7;
          cx.lineWidth = 1;
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * TAU + 0.4;
            cx.beginPath();
            cx.moveTo(p.x, p.y + 8);
            cx.lineTo(p.x + Math.cos(a) * 16, p.y + 8 + Math.sin(a) * 7);
            cx.stroke();
          }
          cx.globalAlpha = 1;
          cx.fillStyle = "#e8e0d0";
          cx.font = "700 9px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("esquive para romper", p.x, p.y + 30);
        }
        if (p.escudo > 0) {
          cx.strokeStyle = "rgba(143,184,232,.75)";
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 20, 0, TAU);
          cx.stroke();
        }
        if (p.hasteT > 0) {
          cx.fillStyle = "#e9b45c";
          cx.font = "800 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("»»", p.x + 14, p.y - 22);
        }
        if (p.golpeT > 0 && Math.floor(p.golpeT * 20) % 2 === 0)
          cx.globalAlpha = 0.4;
        const mov =
          Math.hypot(p.inp ? p.inp.mx : 0, p.inp ? p.inp.my : 0) > 0.1;
        const bob = Math.sin(p.anim * 8) * (mov ? 1.5 : 0.5);
        const flip = Math.cos(p.aim) < 0;
        const formaAnimal =
          p.rol === "druida" && p.forma && p.forma !== "humano";
        if (formaAnimal) {
          const esc2 = ESC_FORMA[p.forma];
          drawSprite(
            SPR_FORMAS[p.forma],
            p.x,
            p.y -
              4 +
              bob +
              (p.forma === "aguila"
                ? Math.sin(animGlobal * 4 + p.idx) * 3 - 4
                : 0),
            flip,
            esc2,
          );
          cx.strokeStyle = "#6ac04a";
          cx.globalAlpha = 0.35;
          cx.lineWidth = 1.5;
          cx.beginPath();
          cx.arc(p.x, p.y + 2, 17, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        } else {
          dibujarHeroe(p, p.x, p.y + bob, mov);
        }
        cx.globalAlpha = 1;

        // accesorio: gema flotante sobre la cabeza
        if (eq.accesorio && !formaAnimal) {
          const gcol = RAREZAS[eq.accesorio.rareza].col;
          cx.save();
          cx.translate(p.x, p.y - 34 + Math.sin(animGlobal * 3 + p.idx) * 2);
          cx.rotate(animGlobal * 1.5);
          cx.fillStyle = gcol;
          cx.fillRect(-3, -3, 6, 6);
          cx.restore();
        }

        // arma apuntando: dibujo esquemático (pomo/hoja/arco/báculo…) que
        // sigue la puntería continua del jugador; el orbe de carga del mago
        // se dibuja aparte porque es un efecto mágico, no una hoja física.
        const wcol = eq.arma ? RAREZAS[eq.arma.rareza].col : null;
        if (!formaAnimal && !NO_SCHEMATIC_WEAPON[p.rol]) {
          cx.save();
          cx.translate(p.x, p.y + 3);
          cx.rotate(p.aim + (p.swingT > 0 ? (p.swingT / 0.18 - 0.5) * 1.6 : 0));
          cx.scale(1.3, 1.3);
          if (p.rol === "guerrero") {
            // espada larga: pomo, empuñadura, guarda cruzada y hoja biselada con filo
            cx.fillStyle = "#4a3624";
            cx.fillRect(3, -2, 6, 4);
            cx.fillStyle = "#6b4a2b";
            cx.beginPath();
            cx.arc(3, 0, 2.6, 0, TAU);
            cx.fill();
            cx.fillStyle = "#e9b45c";
            cx.fillRect(9, -5, 3, 10);
            const blade = wcol || "#c9ccd6";
            cx.fillStyle = blade;
            cx.beginPath();
            cx.moveTo(12, -2.8);
            cx.lineTo(27, -1.4);
            cx.lineTo(31, 0);
            cx.lineTo(27, 1.4);
            cx.lineTo(12, 2.8);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "rgba(255,255,255,.4)";
            cx.lineWidth = 0.8;
            cx.beginPath();
            cx.moveTo(13, 0);
            cx.lineTo(28, 0);
            cx.stroke();
            cx.strokeStyle = "rgba(0,0,0,.25)";
            cx.lineWidth = 0.6;
            cx.beginPath();
            cx.moveTo(12, -2.6);
            cx.lineTo(27, -1.3);
            cx.moveTo(12, 2.6);
            cx.lineTo(27, 1.3);
            cx.stroke();
          } else if (p.rol === "arquero") {
            // arco recurvo con puños de cuero, muescas y cuerda tensa
            const bx = 11,
              br = 10;
            cx.strokeStyle = wcol || "#8a6b43";
            cx.lineWidth = 3;
            cx.beginPath();
            cx.arc(bx, 0, br, -1.15, 1.15);
            cx.stroke();
            cx.strokeStyle = "rgba(255,255,255,.3)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(bx, 0, br, -1.02, 1.02);
            cx.stroke();
            cx.fillStyle = "#3a2a1a";
            cx.fillRect(bx - 2, -2.4, 3.5, 4.8);
            const tAx = bx + Math.cos(-1.15) * br,
              tAy = Math.sin(-1.15) * br;
            const tBx = bx + Math.cos(1.15) * br,
              tBy = Math.sin(1.15) * br;
            cx.fillStyle = "#2a1f14";
            cx.beginPath();
            cx.arc(tAx, tAy, 1.6, 0, TAU);
            cx.fill();
            cx.beginPath();
            cx.arc(tBx, tBy, 1.6, 0, TAU);
            cx.fill();
            cx.strokeStyle = "#e9e3d5";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(tAx, tAy);
            cx.lineTo(bx + 2, 0);
            cx.lineTo(tBx, tBy);
            cx.stroke();
          } else if (p.rol === "mago") {
            // cetro con bandas de envoltura y garra metálica sosteniendo la gema
            cx.fillStyle = wcol || "#5c4d99";
            cx.beginPath();
            cx.moveTo(8, -1.8);
            cx.lineTo(23, -1.3);
            cx.lineTo(23, 1.3);
            cx.lineTo(8, 1.8);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "rgba(0,0,0,.3)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(13, -1.6);
            cx.lineTo(13, 1.6);
            cx.moveTo(18, -1.4);
            cx.lineTo(18, 1.4);
            cx.stroke();
            cx.strokeStyle = "#3a3453";
            cx.lineWidth = 1.6;
            cx.beginPath();
            cx.moveTo(21, -3);
            cx.quadraticCurveTo(26, -6.5, 29, -2);
            cx.stroke();
            cx.beginPath();
            cx.moveTo(21, 3);
            cx.quadraticCurveTo(26, 6.5, 29, 2);
            cx.stroke();
            dibujarCargaMago(p, 26, 0);
          } else if (p.rol === "picaro") {
            // par de dagas con guarda, empuñadura envuelta y hoja afilada
            // (poco recorrido vertical: a esta escala, subir demasiado la
            // daga alta choca con la capucha puntiaguda del sprite)
            cx.fillStyle = "#3a2a1a";
            cx.fillRect(6, -4.6, 4, 2.2);
            cx.fillRect(6, 1.6, 4, 2.2);
            cx.fillStyle = "#8a4a5a";
            cx.fillRect(9.5, -5.2, 2, 4);
            cx.fillRect(9.5, 1, 2, 4);
            cx.fillStyle = wcol || "#b8bcc9";
            for (const yo of [-3.9, 2.3]) {
              cx.beginPath();
              cx.moveTo(11.5, yo - 1.5);
              cx.lineTo(19, yo - 0.7);
              cx.lineTo(21.5, yo);
              cx.lineTo(19, yo + 0.7);
              cx.lineTo(11.5, yo + 1.5);
              cx.closePath();
              cx.fill();
            }
            cx.strokeStyle = "rgba(255,255,255,.35)";
            cx.lineWidth = 0.6;
            cx.beginPath();
            cx.moveTo(12, -3.9);
            cx.lineTo(19, -3.9);
            cx.moveTo(12, 2.3);
            cx.lineTo(19, 2.3);
            cx.stroke();
          } else if (p.rol === "druida") {
            // bastón nudoso envuelto en enredadera con racimo de hojas en la punta
            cx.fillStyle = wcol || "#8a6b43";
            cx.beginPath();
            cx.moveTo(8, -1.6);
            cx.lineTo(22, -1.1);
            cx.lineTo(22, 1.1);
            cx.lineTo(8, 1.6);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "#6ac04a";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(11, -1.5);
            cx.quadraticCurveTo(13, 1.7, 15, -1.4);
            cx.quadraticCurveTo(17, 1.7, 19, -1.3);
            cx.stroke();
            cx.fillStyle = "#6ac04a";
            const hojas = [
              [24, -3, -0.6],
              [26.5, 0, 0],
              [24, 3, 0.6],
            ];
            for (let hi = 0; hi < 3; hi++) {
              const lx = hojas[hi][0],
                ly = hojas[hi][1],
                lr = hojas[hi][2];
              cx.save();
              cx.translate(lx, ly);
              cx.rotate(lr);
              cx.beginPath();
              cx.ellipse(0, 0, 4, 2, 0, 0, TAU);
              cx.fill();
              cx.restore();
            }
          } else {
            // clérigo: cetro sagrado con cabeza de cruz radiante
            cx.fillStyle = wcol || "#8b8474";
            cx.beginPath();
            cx.moveTo(8, -1.6);
            cx.lineTo(20, -1.2);
            cx.lineTo(20, 1.2);
            cx.lineTo(8, 1.6);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = "rgba(201,163,90,.5)";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(26, 0, 7, 0, TAU);
            cx.stroke();
            cx.fillStyle = "#ffe6a3";
            cx.beginPath();
            cx.arc(26, 0, 5, 0, TAU);
            cx.fill();
            cx.strokeStyle = "#c9a35a";
            cx.lineWidth = 1;
            cx.beginPath();
            cx.arc(26, 0, 5, 0, TAU);
            cx.stroke();
            cx.fillStyle = "#fff7e0";
            cx.fillRect(25, -4, 2, 8);
            cx.fillRect(23, -1, 6, 2);
          }
          cx.restore();
        }

        // parry activo: se dibuja por encima del cuerpo y del arma para que
        // nunca quede tapado por el sprite (antes se pintaba antes del
        // cuerpo y el propio personaje lo ocultaba casi por completo)
        if (p.parryT > 0) {
          const parryPulso = 0.75 + Math.sin(animGlobal * 24) * 0.25;
          cx.strokeStyle = "#e9b45c";
          cx.lineWidth = 3.5;
          cx.globalAlpha = parryPulso;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 24, p.aim - 1.1, p.aim + 1.1);
          cx.stroke();
          cx.strokeStyle = "#fff0c8";
          cx.lineWidth = 1.2;
          cx.beginPath();
          cx.arc(p.x, p.y - 4, 24, p.aim - 1.1, p.aim + 1.1);
          cx.stroke();
          cx.globalAlpha = 1;
        }

        // retícula de suelo (ulti del mago / sanación del clérigo / zarzas del druida humano)
        if (
          p.rol === "mago" ||
          p.rol === "clerigo" ||
          (p.rol === "druida" && p.forma === "humano")
        ) {
          const maxR = p.rol === "mago" ? 300 : p.rol === "druida" ? 280 : 240;
          const g = groundTarget(p, maxR);
          const col =
            p.rol === "mago"
              ? ELEMENTOS[p.elemento].color
              : p.rol === "druida"
                ? ELEMENTOS.zarzas.color
                : SUPS[0].color;
          const radUlti =
            p.rol === "mago"
              ? p.elemento === "fuego"
                ? 95
                : p.elemento === "hielo"
                  ? 110
                  : 90
              : p.rol === "druida"
                ? 100
                : 64;
          cx.strokeStyle = col;
          cx.globalAlpha = 0.45;
          cx.lineWidth = 1.5;
          cx.setLineDash([4, 4]);
          cx.beginPath();
          cx.arc(g.x, g.y, radUlti, 0, TAU);
          cx.stroke();
          cx.setLineDash([]);
          cx.globalAlpha = 1;
        }
        // etiqueta
        cx.fillStyle = p.color;
        cx.font = "700 10px Alegreya Sans";
        cx.textAlign = "center";
        cx.fillText(p.nombre, p.x, p.y - 38);
        // combo del guerrero: 4 pips que llenan el Golpe Colosal
        if (p.rol === "guerrero" && p.combo > 0) {
          for (let k = 0; k < 4; k++) {
            cx.fillStyle = k < p.combo ? "#e9b45c" : "#2a2440";
            cx.fillRect(p.x - 14 + k * 8, p.y - 50, 6, 4);
          }
          if (p.combo >= 4) {
            cx.strokeStyle = "#e9b45c";
            cx.globalAlpha = 0.5 + Math.sin(animGlobal * 12) * 0.4;
            cx.strokeRect(p.x - 15, p.y - 51, 32, 6);
            cx.globalAlpha = 1;
          }
        }
        // flecha certera lista
        if (p.rol === "arquero" && p.certera) {
          cx.fillStyle = "#ffd27f";
          cx.font = "800 11px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("🎯", p.x + 16, p.y - 42 + Math.sin(animGlobal * 6) * 2);
        }
        // chispa orbital del arma imbuida (sinergia elemental)
        if (p.imbuido && !p.ko) {
          const colIm = (ELEMENTOS[p.imbuido] || { color: "#fff" }).color;
          const oa = animGlobal * 5 + p.idx * 2;
          cx.fillStyle = colIm;
          cx.beginPath();
          cx.arc(
            p.x + Math.cos(oa) * 18,
            p.y - 6 + Math.sin(oa) * 9,
            2.6,
            0,
            TAU,
          );
          cx.fill();
          cx.globalAlpha = 0.4;
          cx.beginPath();
          cx.arc(
            p.x + Math.cos(oa - 0.5) * 18,
            p.y - 6 + Math.sin(oa - 0.5) * 9,
            1.6,
            0,
            TAU,
          );
          cx.fill();
          cx.globalAlpha = 1;
        }
      }

function renderEnemigo(e) {
        // tragado por el portal arcano: remolino en su lugar
        if (e.portalT > 0) {
          const k = e.portalT / 0.7;
          cx.save();
          cx.translate(e.x, e.y);
          cx.rotate(animGlobal * 10);
          cx.strokeStyle = "#c084f0";
          cx.globalAlpha = 0.7;
          cx.lineWidth = 2;
          for (let j = 0; j < 3; j++) {
            cx.beginPath();
            cx.arc(0, 0, (6 + j * 7) * k, j * 2, j * 2 + 4);
            cx.stroke();
          }
          cx.restore();
          cx.globalAlpha = 1;
          return;
        }
        cx.fillStyle = "rgba(0,0,0,.35)";
        cx.beginPath();
        cx.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.8, e.r * 0.3, 0, 0, TAU);
        cx.fill();

        // muñeco de pruebas: sprite fijo + medidor de DPS
        if (e.dummy) {
          drawSprite(
            SPR.dummy,
            e.x,
            e.y - 2 + (e.hurtT > 0 ? rnd(-1.5, 1.5) : 0),
          );
          let dps = 0;
          for (const l of e.dmgLog) dps += l.d;
          dps = Math.round(dps / 5);
          cx.fillStyle = "#0d0b15";
          cx.fillRect(e.x - 30, e.y - e.r - 26, 60, 14);
          cx.strokeStyle = "#3a3453";
          cx.strokeRect(e.x - 30.5, e.y - e.r - 26.5, 61, 15);
          cx.fillStyle = dps > 0 ? "#e9b45c" : "#9a93ab";
          cx.font = "800 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText(dps + " DPS", e.x, e.y - e.r - 15);
          return;
        }

        let img,
          esc = 1;
        if (e.clonRol) {
          // reflejo oscuro de una clase del grupo
          img = SPR[e.clonRol];
          const obj2 = masCercano(e.x, e.y);
          const bob2 = Math.sin(animGlobal * 6 + e.x) * 1.5;
          if (e.hurtT > 0) cx.globalAlpha = 0.55;
          else cx.globalAlpha = 0.85;
          drawSprite(img, e.x, e.y - 4 + bob2, obj2 ? e.x > obj2.x : false, 1);
          // velo oscuro
          cx.globalAlpha = 0.45;
          cx.fillStyle = "#1a0f2a";
          cx.beginPath();
          cx.arc(e.x, e.y - 4, 15, 0, TAU);
          cx.fill();
          cx.globalAlpha = 0.6;
          cx.strokeStyle = "#c084f0";
          cx.lineWidth = 1;
          cx.beginPath();
          cx.arc(e.x, e.y - 4, 16, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
          if (e.hp < e.hpMax) {
            cx.fillStyle = "#0d0b15";
            cx.fillRect(e.x - 13, e.y - e.r - 10, 26, 4);
            cx.fillStyle = "#c084f0";
            cx.fillRect(e.x - 13, e.y - e.r - 10, (26 * e.hp) / e.hpMax, 4);
          }
          return;
        }
        // JEFE SECRETO: El Magnate (sprite real)
        if (e.cerdo && assetOK("jefe_cerdo")) {
          const src = SHEETS["jefe_cerdo"];
          const bobc = Math.sin(animGlobal * 4 + e.x) * 2;
          const h = e.r * 3.4,
            w = (h * src.naturalWidth) / src.naturalHeight;
          cx.fillStyle = "rgba(0,0,0,.4)";
          cx.beginPath();
          cx.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.9, e.r * 0.32, 0, 0, TAU);
          cx.fill();
          cx.save();
          cx.imageSmoothingEnabled = false;
          const flipC = (masCercano(e.x, e.y) || { x: e.x }).x < e.x;
          cx.translate(e.x, e.y - e.r * 0.5 + bobc);
          if (flipC) cx.scale(-1, 1);
          if (e.hurtT > 0) {
            cx.globalAlpha = 0.7;
          }
          cx.drawImage(src, -w / 2, -h * 0.62, w, h);
          if (e.rushT > 0) {
            cx.globalCompositeOperation = "lighter";
            cx.globalAlpha = 0.3;
            cx.drawImage(src, -w / 2, -h * 0.62, w, h);
            cx.globalCompositeOperation = "source-over";
          }
          cx.restore();
          cx.globalAlpha = 1;
          // corona dorada de jefe
          drawSprite(SPR.corona, e.x, e.y - e.r * 2.1 + bobc);
          // barra de vida
          const w2 = 64;
          cx.fillStyle = "#0d0b15";
          cx.fillRect(e.x - w2 / 2, e.y - e.r * 2.3, w2, 5);
          cx.fillStyle = "#e9b45c";
          cx.fillRect(e.x - w2 / 2, e.y - e.r * 2.3, (w2 * e.hp) / e.hpMax, 5);
          cx.fillStyle = "#e9b45c";
          cx.font = "800 12px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("⭐ " + e.nombre + " ⭐", e.x, e.y - e.r * 2.5);
          return;
        }
        if (e.jefe) {
          img = SPR.brutoB;
          esc = G.planta >= 90 ? 2.4 : 2;
        } else if (e.mini) {
          img = SPR.slime;
          esc = 1.7;
        } else if (e.tipo === "tank") {
          img = SPR.golem;
          esc = e.elite ? 1.5 : 1.25;
        } else if (e.tipo === "runner") {
          img = SPR.acechador;
          esc = e.elite ? 1.1 : 0.85;
        } else if (e.tipo === "bomber") {
          img = SPR.bomber;
          esc = e.elite ? 1.3 : 1;
        } else if (e.tipo === "caster") {
          img = SPR.hechicero;
          esc = e.elite ? 1.2 : 0.95;
        } else if (e.elite) {
          img = SPR.bruto;
          esc = 1.35;
        } else if (e.ranged) {
          img = SPR.ojo;
        } else {
          img = SPR.esqueleto;
        }

        const obj = masCercano(e.x, e.y);
        const bob = Math.sin(animGlobal * 6 + e.x) * 1.5;
        // telegrafiado de carga del acechador
        if (e.telT > 0) {
          cx.strokeStyle = "#7ffce8";
          cx.globalAlpha = 0.5 + Math.sin(animGlobal * 20) * 0.3;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(e.x, e.y, e.r + 6, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        // anillo de mecha del bombardero
        if (e.fuseT >= 0 && e.fuseT < 1) {
          const k = 1 - e.fuseT / 0.7;
          cx.strokeStyle = "#ff5c5c";
          cx.globalAlpha = 0.4 + k * 0.4;
          cx.lineWidth = 2.5;
          cx.beginPath();
          cx.arc(e.x, e.y, 70 * k, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        {
          if (e.hurtT > 0) cx.globalAlpha = 0.55;
          drawSprite(
            img,
            e.x,
            e.y -
              4 +
              bob +
              (e.ranged && e.tipo !== "caster"
                ? Math.sin(animGlobal * 3 + e.y) * 3
                : 0),
            obj ? e.x > obj.x : false,
            esc,
          );
          cx.globalAlpha = 1;
        }
        if (e.jefe)
          drawSprite(
            SPR.corona,
            e.x,
            e.y - 4 + bob - (img.height * esc) / 2 - 8,
          );
        if (e.mini) {
          cx.fillStyle = "#c084f0";
          cx.font = "800 12px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("◆ " + e.nombre + " ◆", e.x, e.y - e.r - 18);
        }
        if (e.rabioso) {
          cx.strokeStyle = "#ff5c5c";
          cx.globalAlpha = 0.4 + Math.sin(animGlobal * 10) * 0.25;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(e.x, e.y - 4, e.r + 8, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        if (e.stunT > 0) {
          cx.fillStyle = "#e9b45c";
          cx.font = "700 12px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("✦ ✦", e.x, e.y - e.r - 14);
        }
        if (e.poisonT > 0) {
          cx.fillStyle = "#6ac04a";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("☠", e.x + e.r + 5, e.y - e.r + 2);
        }
        if (e.burnT > 0) {
          cx.fillStyle = "#ff7d4d";
          cx.font = "700 10px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText("🔥", e.x - e.r - 6, e.y - e.r + 2);
          if (Math.random() < 0.15)
            fxParticulas(e.x + rnd(-4, 4), e.y + rnd(-4, 4), 1, "#ff7d4d");
        }
        if (e.slowT > 0) {
          cx.strokeStyle = "#7fc9e8";
          cx.globalAlpha = 0.6;
          cx.lineWidth = 1.5;
          cx.beginPath();
          cx.arc(e.x, e.y + e.r * 0.6, e.r * 0.9, 0, TAU);
          cx.stroke();
          cx.globalAlpha = 1;
        }
        if (e.hp < e.hpMax) {
          const w2 = e.jefe ? 60 : e.elite ? 34 : 26;
          cx.fillStyle = "#0d0b15";
          cx.fillRect(e.x - w2 / 2, e.y - e.r - 10, w2, 4);
          cx.fillStyle = e.jefe ? "#c07be0" : "#d1545c";
          cx.fillRect(e.x - w2 / 2, e.y - e.r - 10, (w2 * e.hp) / e.hpMax, 4);
        }
      }
