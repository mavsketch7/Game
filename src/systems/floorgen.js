// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W } from "../core/canvas.js";
import { NOMBRE_CLIMA } from "../core/constants.js";
import { G } from "../core/state.js";
import { DESC_ARQ, arquetipoJefe, esJefe, nombreJefe } from "./bosses.js";
import { spawnClon, spawnEnemigo, statsTot, tipoAleatorio } from "./combat.js";
import { banner, toast } from "../ui/notifications.js";
import { az, clamp, ri, rnd } from "../utils/helpers.js";

function climaAleatorio() {
        const r = Math.random();
        return r < 0.45
          ? "despejado"
          : r < 0.6
            ? "lluvia"
            : r < 0.72
              ? "niebla"
              : r < 0.86
                ? "tormenta"
                : "ceniza";
      }

const FORMAS_MAPA = [
        "sala",
        "sala",
        "cruz",
        "circulo",
        "partida",
        "foso",
        "rombo",
      ];

const NOMBRE_FORMA = {
        sala: "",
        cruz: "Sala en cruz",
        circulo: "Rotonda",
        partida: "Sala partida",
        foso: "Anillo del foso",
        rombo: "Cámara romboidal",
      };

export function generarMapa(forma) {
        G.forma = forma;
        G.muros = [];
        if (forma === "cruz") {
          const mw = W * 0.24,
            mh = H * 0.26;
          G.muros.push(
            { x: 0, y: 0, w: mw, h: mh },
            { x: W - mw, y: 0, w: mw, h: mh },
            { x: 0, y: H - mh, w: mw, h: mh },
            { x: W - mw, y: H - mh, w: mw, h: mh },
          );
        } else if (forma === "partida") {
          const gy = rnd(H * 0.32, H * 0.62),
            gap = 52; // hueco central
          G.muros.push(
            { x: W / 2 - 14, y: 92, w: 28, h: Math.max(30, gy - gap - 92) },
            {
              x: W / 2 - 14,
              y: gy + gap,
              w: 28,
              h: Math.max(30, H - 92 - (gy + gap)),
            },
          );
        } else if (forma === "foso") {
          G.muros.push({
            x: W / 2 - W * 0.15,
            y: H / 2 - H * 0.14,
            w: W * 0.3,
            h: H * 0.28,
          });
        }
      }

export function dentroForma(x, y, margen) {
        const m = margen || 0;
        if (G.forma === "circulo") {
          const rx = W / 2 - 30 - m,
            ry = H / 2 - 30 - m;
          const dx = (x - W / 2) / rx,
            dy = (y - H / 2) / ry;
          return dx * dx + dy * dy <= 1;
        }
        if (G.forma === "rombo") {
          const rx = W / 2 - 26 - m,
            ry = H / 2 - 26 - m;
          return Math.abs(x - W / 2) / rx + Math.abs(y - H / 2) / ry <= 1;
        }
        return x > 28 + m * 0 && x < W - 28 && y > 28 && y < H - 28;
      }

export function colisionaMuro(x, y, r) {
        for (const m of G.muros)
          if (
            x + r > m.x &&
            x - r < m.x + m.w &&
            y + r > m.y &&
            y - r < m.y + m.h
          )
            return m;
        return null;
      }

export function puntoValido(x, y, r) {
        return dentroForma(x, y, r) && !colisionaMuro(x, y, r || 10);
      }

export function aplicarLimites(ent) {
        for (const m of G.muros) {
          if (
            ent.x + ent.r > m.x &&
            ent.x - ent.r < m.x + m.w &&
            ent.y + ent.r > m.y &&
            ent.y - ent.r < m.y + m.h
          ) {
            const dx1 = m.x + m.w - (ent.x - ent.r),
              dx2 = ent.x + ent.r - m.x;
            const dy1 = m.y + m.h - (ent.y - ent.r),
              dy2 = ent.y + ent.r - m.y;
            if (Math.min(dx1, dx2) < Math.min(dy1, dy2))
              ent.x += dx1 < dx2 ? dx1 : -dx2;
            else ent.y += dy1 < dy2 ? dy1 : -dy2;
          }
        }
        if (G.forma === "circulo") {
          const rx = W / 2 - 30,
            ry = H / 2 - 30;
          const dx = (ent.x - W / 2) / rx,
            dy = (ent.y - H / 2) / ry;
          const d2 = dx * dx + dy * dy;
          if (d2 > 1) {
            const d = Math.sqrt(d2);
            ent.x = W / 2 + (dx / d) * rx;
            ent.y = H / 2 + (dy / d) * ry;
          }
        } else if (G.forma === "rombo") {
          const rx = W / 2 - 26,
            ry = H / 2 - 26;
          const s = Math.abs(ent.x - W / 2) / rx + Math.abs(ent.y - H / 2) / ry;
          if (s > 1) {
            ent.x = W / 2 + (ent.x - W / 2) / s;
            ent.y = H / 2 + (ent.y - H / 2) / s;
          }
        }
      }

export function iniciarPlanta() {
        const f = G.planta,
          N = G.players.length;
        G.escena = "torre";
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
        G.rayoCd = rnd(3, 6);
        G.portal = null;
        G.fogata = null;
        G.fogataUsada = false;
        G.descansoT = 0;
        G.mercader = null;
        G.skinNpc = null;
        G.arenaNpc = null;
        G.clima = climaAleatorio();
        // forma de la sala: los jefes prefieren espacios abiertos
        generarMapa(
          esJefe(f) ? az(["sala", "circulo", "rombo"]) : az(FORMAS_MAPA),
        );
        G.players.forEach((p, i) => {
          p.x = W / 2 + (i - (N - 1) / 2) * 46;
          p.y = H - 70;
          p.trail = [];
          p.safeX = p.x;
          p.safeY = p.y;
          p.atrapado = null;
          p.rootT = 0;
          if (G.forma === "circulo" || G.forma === "rombo") p.y = H - 88;
          if (p.ko) {
            p.ko = false;
            p.hp = Math.round(statsTot(p).hpMax * 0.3);
            toast(p.nombre + " se levanta al cruzar el portal", "#7fd4c1");
          }
          if (G.lobby === "buenos") {
            p.escudo = Math.round(statsTot(p).hpMax * 0.12);
          }
        });
        if (G.lobby === "buenos")
          toast("Pasiva del Alba: escudos renovados", "#7fd4c1");
        // pilares: ~55% destructibles
        G.pilares = [];
        const nPil = esJefe(f) ? ri(1, 2) : ri(2, 4);
        for (let i = 0; i < nPil; i++) {
          const dest = Math.random() < 0.55;
          let px2,
            py2,
            itp = 0;
          do {
            px2 = rnd(140, W - 140);
            py2 = rnd(110, H - 180);
            itp++;
          } while (!puntoValido(px2, py2, 26) && itp < 25);
          if (itp >= 25) continue;
          G.pilares.push({
            x: px2,
            y: py2,
            r: 24,
            destructible: dest,
            hp: dest ? 60 + f * 3 : 0,
            hpMax: dest ? 60 + f * 3 : 0,
            hurtT: 0,
          });
        }
        // ---- zonas peligrosas del suelo ----
        const zonaLibre = (x, y, r) =>
          y < H - 140 &&
          y > 95 &&
          Math.abs(x - W / 2) + Math.abs(y - 64) > 110 &&
          puntoValido(x, y, r); // lejos del spawn y del portal
        function ponHazard(tipo, r2, n2) {
          for (let i = 0; i < n2; i++) {
            let hx,
              hy,
              it2 = 0;
            do {
              hx = rnd(70, W - 70);
              hy = rnd(100, H - 150);
              it2++;
            } while (!zonaLibre(hx, hy, r2) && it2 < 20);
            G.hazards.push({
              tipo,
              x: hx,
              y: hy,
              r: r2,
              estado: 0,
              t: 0,
              fase: Math.random() * TAU,
            });
          }
        }
        if (f >= 10 && Math.random() < 0.7) ponHazard("grieta", 20, ri(1, 3));
        if (f >= 8 && Math.random() < 0.35) ponHazard("arena", 34, 1);
        if (f >= 6 && Math.random() < 0.5) ponHazard("ortiga", 28, ri(1, 2));
        if (f >= 14 && Math.random() < 0.45)
          ponHazard("fuegoZona", 26, ri(1, 2));
        // objetos del nivel (respetando la forma de la sala)
        function ponObjeto(o) {
          let ox,
            oy,
            ito = 0;
          do {
            ox = rnd(80, W - 80);
            oy = rnd(100, H - 120);
            ito++;
          } while (!puntoValido(ox, oy, 14) && ito < 25);
          if (ito < 25) {
            o.x = ox;
            o.y = oy;
            G.objetos.push(o);
          }
        }
        const nBar = ri(1, 3);
        for (let i = 0; i < nBar; i++)
          ponObjeto({ tipo: "barril", x: 0, y: 0, hp: 10 });
        if (Math.random() < 0.45)
          ponObjeto({ tipo: "cofre", x: 0, y: 0, hp: 1, abierto: false });
        if (Math.random() < 0.5) ponObjeto({ tipo: "cristal", x: 0, y: 0 });
        if (Math.random() < 0.6) ponObjeto({ tipo: "brasero", x: 0, y: 0 });
        if (esJefe(f)) {
          const arq = arquetipoJefe(f);
          if (f === 5) {
            // JEFE SECRETO: El Magnate (cerdo presidencial) — solo para test en planta 5
            spawnEnemigo(f, "jefe");
            const j = G.enemigos.find((e) => e.jefe);
            if (j) {
              j.cerdo = true;
              j.arquetipo = "cerdo";
              j.nombre = "El Magnate";
              j.hp = Math.round(j.hp * 1.35);
              j.hpMax = j.hp;
              j.r = 40;
              j.knockRes = 0.5;
            }
            for (let i = 0; i < N - 1; i++) spawnEnemigo(f, "melee");
          } else if (arq === "gemelos") {
            spawnEnemigo(f, "jefe");
            spawnEnemigo(f, "jefe");
            G.enemigos
              .filter((e) => e.jefe)
              .forEach((e, k) => {
                e.gemelo = true;
                e.hp = Math.round(e.hp * 0.55);
                e.hpMax = e.hp;
                e.nombre = "Coloso Gemelo " + (k === 0 ? "α" : "β");
              });
          } else {
            spawnEnemigo(f, "jefe");
            if (f >= 50) spawnEnemigo(f, "melee", true);
            if (f >= 75) spawnEnemigo(f, "melee", true);
          }
          for (let i = 0; i < N - 1; i++) spawnEnemigo(f, "melee");
          // el espejo invoca copias del grupo al empezar
          if (arq === "espejo") {
            for (const p of G.players) spawnClon(f, p.rol);
          }
        } else {
          const base =
            f <= 5
              ? ri(2, 3)
              : f <= 20
                ? ri(3, 4)
                : f <= 50
                  ? ri(4, 5)
                  : f <= 80
                    ? ri(5, 6)
                    : ri(6, 8);
          const n = base + (N - 1);
          for (let i = 0; i < n; i++) {
            const esElite = Math.random() < clamp(f * 0.005, 0, 0.35);
            spawnEnemigo(f, tipoAleatorio(f), esElite);
          }
          // minijefe aleatorio
          if (f >= 7 && Math.random() < 0.16) {
            spawnEnemigo(f, "mini");
            toast("⚠ Un minijefe merodea esta planta…", "#c07be0");
          }
        }
        const climaTxt = NOMBRE_CLIMA[G.clima]
          ? " · " + NOMBRE_CLIMA[G.clima]
          : "";
        const formaTxt = NOMBRE_FORMA[G.forma]
          ? " · " + NOMBRE_FORMA[G.forma]
          : "";
        const nombreJ = esJefe(f)
          ? f === 5
            ? "El Magnate"
            : nombreJefe(f)
          : "";
        banner(
          "Planta " +
            f +
            (esJefe(f) ? " — ⚔ " + nombreJ : "") +
            formaTxt +
            climaTxt,
        );
        if (esJefe(f))
          toast(
            f === 5
              ? "⭐ JEFE SECRETO: El Magnate ha aparecido…"
              : "Arquetipo: " + DESC_ARQ[arquetipoJefe(f)],
            f === 5 ? "#e9b45c" : "#c07be0",
          );
      }
