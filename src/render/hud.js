// Auto-generated during the modularization refactor (2026-07-23).
import { H, W, animGlobal, cx } from "../core/canvas.js";
import { ELEMENTOS, ELEM_MAGO, FORMAS_DRUIDA, FORMAS_INFO, MAX_NIV_PJ, MAX_PLANTA, NOMBRE_CLIMA, ROLES, SENDA_ELEMENTAL, SUPS } from "../core/constants.js";
import { META } from "../core/save.js";
import { G } from "../core/state.js";
import { K } from "./sprites.js";
import { NIVEL_ULTI } from "../systems/abilities.js";
import { statsTot, vivos } from "../systems/combat.js";
import { ESTILO } from "../systems/juice.js";
import { dibujarPlacaHorizontal } from "./uiTiles.js";
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
        // marco "engastado en metal" a juego con el tileset Dark Ages UI
        // del resto del HUD/overlays (ver render/uiTiles.js) -- un borde
        // oscuro grueso + un filo dorado fino por dentro, en vez del
        // trazo plano de un solo color de antes.
        cx.strokeStyle = "#120d08";
        cx.lineWidth = 2;
        cx.strokeRect(x + 1, y + 1, w2 - 2, h2 - 2);
        cx.strokeStyle = "#c9a35a";
        cx.lineWidth = 1;
        cx.globalAlpha = 0.8;
        cx.strokeRect(x + 1.5, y + 1.5, w2 - 3, h2 - 3);
        cx.globalAlpha = 1;
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
        // Fuente/margen proporcionales a `tam` (en vez de fijos) -- el
        // panel del jugador ahora usa iconos más grandes (22 en vez de
        // 16) para que se lean bien, y esta función es la única que los
        // dibuja, así que escala con el tamaño que le pidan.
        cx.font = `800 ${Math.round(tam * 0.56)}px Alegreya Sans`;
        cx.textAlign = "center";
        cx.fillText(etiqueta, x + tam / 2, y + Math.round(tam * 0.75));
      }

// Iconos de testeo para buffs/debuffs activos (fila bajo las habilidades
// del panel de jugador) -- de momento un cuadro plano con el color del
// estado + un glifo, se sustituirán por arte definitivo más adelante.
function iconoEstado(x, y, tam, ico, col) {
        cx.fillStyle = "#0d0b15";
        cx.fillRect(x, y, tam, tam);
        cx.fillStyle = col;
        cx.globalAlpha = 0.8;
        cx.fillRect(x, y, tam, tam);
        cx.globalAlpha = 1;
        cx.strokeStyle = "#3a3453";
        cx.strokeRect(x + 0.5, y + 0.5, tam - 1, tam - 1);
        cx.font = `700 ${Math.round(tam * 0.58)}px Alegreya Sans`;
        cx.textAlign = "center";
        cx.fillText(ico, x + tam / 2, y + Math.round(tam * 0.78));
      }

export function renderHUD() {
        // Sin panel/marco de fondo (se quitó a petición expresa: solo
        // quedan los elementos sueltos -- avatar, barras, iconos --, cada
        // uno con su propio fondo oscuro, más grandes que antes para que
        // los buffs/debuffs se lean bien). Anclas movidas para dejar sitio
        // al bloque más ancho/alto (antes 198x88, ahora ~226x108).
        const pos = [
          [16, 14],
          [W - 250, 14],
          [16, H - 130],
          [W - 250, H - 130],
        ];
        G.players.forEach((p, i) => {
          const [x, y] = pos[i] || pos[0];
          const t = statsTot(p),
            b = ROLES[p.rol];
          // Avatar: icono representativo de la clase (de momento, en vez
          // del retrato real -- pedido expreso, "ya se pondrán los
          // definitivos" más adelante).
          cx.fillStyle = "#0a0812";
          cx.fillRect(x - 1, y + 3, 38, 44);
          cx.font = "25px Alegreya Sans";
          cx.textAlign = "center";
          cx.fillText(b.ico, x + 18, y + 32);
          cx.strokeStyle = "#3a3453";
          cx.lineWidth = 1;
          cx.strokeRect(x - 0.5, y + 3.5, 37, 43);
          // Nombre: sin panel detrás, así que lleva su propia sombra (igual
          // que ya hacía el texto de las barras en barra()) para seguir
          // leyéndose sobre cualquier fondo del mundo.
          cx.font = "800 13px Alegreya Sans";
          cx.textAlign = "left";
          const nombreTxt = p.nombre + " · " + b.nombre.split(" ")[0];
          cx.fillStyle = "rgba(0,0,0,.7)";
          cx.fillText(nombreTxt, x + 45, y + 12);
          cx.fillStyle = p.color;
          cx.fillText(nombreTxt, x + 44, y + 11);
          barraHP(x + 44, y + 16, 180, 13, p, t);
          barra(x + 44, y + 32, 180, 10, p.res / b.res, "#5a9ad1", "");
          // barra XP pequeña debajo
          const xpPct = p.nivel >= MAX_NIV_PJ ? 1 : p.xp / p.xpSig;
          barra(x + 44, y + 45, 120, 7, xpPct, "#4a8a5a", "");
          const nvTxt =
            "Nv." + p.nivel + (p.cartasPendientes > 0 ? " ★" + p.cartasPendientes : "");
          cx.font = "700 12px Alegreya Sans";
          cx.textAlign = "left";
          cx.fillStyle = "rgba(0,0,0,.7)";
          cx.fillText(nvTxt, x + 169, y + 53);
          cx.fillStyle = "#c9c3d6";
          cx.fillText(nvTxt, x + 168, y + 52);
          // iconos de habilidad
          const iy = y + 60;
          if (p.nivel < NIVEL_ULTI) {
            cx.fillStyle = "#1c1830";
            cx.fillRect(x + 44, iy, 22, 22);
            cx.strokeStyle = "#3a3453";
            cx.strokeRect(x + 44.5, iy + 0.5, 21, 21);
            cx.fillStyle = "#9a93ab";
            cx.font = "800 10px Alegreya Sans";
            cx.textAlign = "center";
            cx.fillText("🔒" + NIVEL_ULTI, x + 55, iy + 15);
          } else {
            iconoCd(x + 44, iy, 22, "Q", p.skillCd, b.skill.cd, "#e9b45c");
          }
          if (p.rol === "mago") {
            ELEM_MAGO.forEach((el, k) => {
              const col = ELEMENTOS[el].color;
              const sel = p.elemento === el;
              cx.fillStyle = sel ? col : "#3a3453";
              cx.fillRect(x + 71 + k * 27, iy, 22, 22);
              cx.strokeStyle = sel ? "#e9e3d5" : "#3a3453";
              cx.strokeRect(x + 71.5 + k * 27, iy + 0.5, 21, 21);
              cx.fillStyle = sel ? "#1a1206" : "#9a93ab";
              cx.font = "800 12px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText(k + 1, x + 82 + k * 27, iy + 16);
            });
            // Senda Elemental (tecla C, ver SENDA_ELEMENTAL en
            // core/constants.js) -- 4º icono, justo después de los 3 de
            // elemento, coloreado con el elemento activo ahora mismo.
            iconoCd(
              x + 71 + 3 * 27,
              iy,
              22,
              "C",
              p.sendaCd,
              SENDA_ELEMENTAL.cd,
              ELEMENTOS[p.elemento].color,
            );
          } else if (p.rol === "clerigo") {
            SUPS.forEach((s, k) =>
              iconoCd(
                x + 71 + k * 27,
                iy,
                22,
                "" + (k + 1),
                p.supCd[k],
                s.cd,
                s.color,
              ),
            );
          } else if (p.rol === "guerrero") {
            // Estocada (dash-ataque, Mayús · R3 -- ver systems/abilities.js:
            // dashAtaque()): cooldown 2.2 s, mismo valor fijado ahí.
            iconoCd(x + 71, iy, 22, "⇧", p.dashAtkCd, 2.2, "#c9a35a");
          } else if (p.rol === "picaro") {
            // Cuchillo cargado (Mayús · R3 -- ver systems/abilities.js:
            // lanzarCuchillo()): cooldown 1.5 s, mismo valor fijado ahí.
            iconoCd(x + 71, iy, 22, "⇧", p.cuchilloCd, 1.5, "#c9a35a");
          } else if (p.rol === "druida") {
            FORMAS_DRUIDA.forEach((fo, k) => {
              const fi = FORMAS_INFO[fo];
              const sel = p.forma === fo;
              cx.fillStyle = sel ? fi.color : "#3a3453";
              cx.fillRect(x + 71 + k * 27, iy, 22, 22);
              cx.strokeStyle = sel ? "#e9e3d5" : "#3a3453";
              cx.strokeRect(x + 71.5 + k * 27, iy + 0.5, 21, 21);
              cx.fillStyle = sel ? "#1a1206" : "#9a93ab";
              cx.font = "800 12px Alegreya Sans";
              cx.textAlign = "center";
              cx.fillText(k + 1, x + 82 + k * 27, iy + 16);
            });
          }
          // Fila de buffs/debuffs, bajo los iconos de habilidad -- iconos
          // de testeo (glifo + color plano), arte definitivo pendiente.
          // Solo estados con timer/flag que ya existían en el jugador (ver
          // core/gameflow.js), sin inventar un sistema de status nuevo.
          const estados = [];
          if (p.escudo > 0) estados.push({ ico: "🛡", col: "#5a9ad1" });
          if (p.hasteT > 0) estados.push({ ico: "»»", col: "#e9b45c" });
          if (p.invulT > 0) estados.push({ ico: "✦", col: "#e9e3d5" });
          if (p.sendaT > 0) {
            estados.push({
              ico: p.elemento === "fuego" ? "🔥" : p.elemento === "hielo" ? "❄" : "🔮",
              col: ELEMENTOS[p.elemento].color,
            });
          }
          if (p.rootT > 0) estados.push({ ico: "⛓", col: "#9a5a3a" });
          if (p.enOrtiga) estados.push({ ico: "☠", col: "#6ac04a" });
          if (p.congelado) estados.push({ ico: "🥶", col: "#7fc9e8" });
          const iy2 = iy + 27;
          estados.forEach((es, k) => iconoEstado(x + 44 + k * 24, iy2, 20, es.ico, es.col));
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
          // Placa ornamentada (Dark Ages UI, ver render/uiTiles.js) en vez
          // del panel plano de siempre, con el mismo fallback que los
          // paneles de jugador si la hoja de UI no cargó todavía.
          if (!dibujarPlacaHorizontal(W / 2 - 178, H - 30, 356, 29)) {
            cx.fillStyle = "rgba(10,8,16,.55)";
            cx.beginPath();
            cx.roundRect(W / 2 - 178, H - 30, 356, 29, 6);
            cx.fill();
            cx.strokeStyle = "#6a3f8a";
            cx.lineWidth = 1;
            cx.stroke();
          }
          const critico = jefe.hp / jefe.hpMax < 0.2;
          if (critico) {
            // Trazo propio (beginPath+roundRect) en vez de reusar el path
            // del fallback de arriba -- con la placa ornamentada dibujada
            // por drawImage no queda ningún path activo que re-trazar.
            cx.beginPath();
            cx.roundRect(W / 2 - 178, H - 30, 356, 29, 6);
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

        // Rango de estilo (D/C/B/A/S/SS/SS+/SSS++/EXTREMO -- ver
        // systems/juice.js: ESTILO/aplicarEstilo/actualizarEstilo). Medidor
        // de GRUPO, no por jugador -- un único indicador central en vez de
        // 4 separados. Solo se dibuja en combate real (no lobby/PvP) y solo
        // si hay algo que mostrar (puntos>0) para no ensuciar la pantalla
        // fuera de un combo activo. Centro-abajo, por encima de donde
        // ocuparía la barra de jefe (H-30..H-1) -- el único hueco que
        // queda libre de los paneles de jugador pase lo que pase el número
        // de jugadores.
        if (G.escena !== "lobby" && G.escena !== "pvp" && G.estilo && G.estilo.puntos > 0) {
          const est = G.estilo;
          const rangoInfo = ESTILO.rangos[est.rango];
          // "pop" al subir de rango: se agranda y brilla más un instante
          // (rangoT, ver actualizarEstilo) en vez de cambiar de golpe.
          const popK = est.rangoT > 0 ? clamp(est.rangoT / 0.5, 0, 1) : 0;
          const yRango = H - 54;
          cx.save();
          cx.translate(W / 2, yRango);
          cx.scale(1 + popK * 0.5, 1 + popK * 0.5);
          cx.textAlign = "center";
          cx.font = "800 22px Cinzel";
          cx.shadowColor = rangoInfo.col;
          cx.shadowBlur = 10 + popK * 14;
          cx.lineWidth = 3;
          cx.strokeStyle = "rgba(13,11,21,.85)";
          cx.strokeText(rangoInfo.letra, 0, 0);
          cx.shadowBlur = 0;
          cx.fillStyle = rangoInfo.col;
          cx.fillText(rangoInfo.letra, 0, 0);
          cx.restore();
          // barra fina de progreso hacia el siguiente rango debajo de la
          // letra (o llena del todo en EXTREMO, que no tiene "siguiente")
          const siguiente = ESTILO.rangos[est.rango + 1];
          const pct = siguiente
            ? clamp((est.puntos - rangoInfo.min) / (siguiente.min - rangoInfo.min), 0, 1)
            : 1;
          barra(W / 2 - 55, yRango + 12, 110, 4, pct, rangoInfo.col, "");
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
