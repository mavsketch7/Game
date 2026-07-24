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

// Solo formas cuadradas/rectangulares -- nada de círculos, rombos ni anillos.
const FORMAS_MAPA = [
        "sala",
        "sala",
        "cruz",
        "partida",
        "foso",
        "columnas",
        "pasilloL",
      ];

const NOMBRE_FORMA = {
        sala: "",
        cruz: "Sala en cruz",
        partida: "Sala partida",
        foso: "Anillo del foso",
        columnas: "Sala de columnas",
        pasilloL: "Pasillo en L",
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
        } else if (forma === "columnas") {
          const n = ri(4, 6);
          for (let i = 0; i < n; i++) {
            let cx2,
              cy2,
              it = 0;
            do {
              cx2 = rnd(120, W - 120);
              cy2 = rnd(110, H - 160);
              it++;
            } while (!puntoValido(cx2, cy2, 20) && it < 20);
            if (it < 20) G.muros.push({ x: cx2 - 11, y: cy2 - 11, w: 22, h: 22 });
          }
        } else if (forma === "pasilloL") {
          // dos bloques en cuadrantes opuestos: dejan libres con margen
          // amplio los 4 puntos cardinales donde van las puertas
          G.muros.push(
            { x: W * 0.55, y: H * 0.14, w: W * 0.34, h: H * 0.3 },
            { x: W * 0.11, y: H * 0.56, w: W * 0.34, h: H * 0.3 },
          );
        }
      }

export function dentroForma(x, y, margen) {
        const m = margen || 0;
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

// Corrige una posición propuesta para un drop (botín, moneda...) que podría
// caer dentro de un muro o fuera de la forma de la sala -- por ejemplo el
// knockback de un enemigo justo antes de morir, o el jitter aleatorio que se
// suma a su posición de muerte. Sin esto el drop podía quedar en un punto
// inalcanzable para siempre (ver matarEnemigo/golpeObjeto/danoPilar).
export function posDropValida(x, y, r) {
        const ent = { x, y, r: r || 8 };
        aplicarLimites(ent);
        aplicarLimites(ent); // segundo pase: por si el primero lo dejó tocando otro muro
        return { x: ent.x, y: ent.y };
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
      }

// ---- helpers de poblado, compartidos entre la sala única de una planta de
// jefe y cada sala de una mazmorra multi-sala normal (ver poblarSala) ----

const zonaLibre = (x, y, r) =>
        y < H - 140 &&
        y > 95 &&
        Math.abs(x - W / 2) + Math.abs(y - 64) > 110 && // lejos del spawn y del portal
        puntoValido(x, y, r);

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

function ponPilares(f, nPil) {
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
      }

function ponHazardsYObjetos(f) {
        if (f >= 10 && Math.random() < 0.7) ponHazard("grieta", 20, ri(1, 3));
        if (f >= 8 && Math.random() < 0.35) ponHazard("arena", 34, 1);
        if (f >= 6 && Math.random() < 0.5) ponHazard("ortiga", 28, ri(1, 2));
        if (f >= 14 && Math.random() < 0.45)
          ponHazard("fuegoZona", 26, ri(1, 2));
        const nBar = ri(1, 3);
        for (let i = 0; i < nBar; i++)
          ponObjeto({ tipo: "barril", x: 0, y: 0, hp: 10 });
        if (Math.random() < 0.45)
          ponObjeto({ tipo: "cofre", x: 0, y: 0, hp: 1, abierto: false });
        if (Math.random() < 0.5) ponObjeto({ tipo: "cristal", x: 0, y: 0 });
        if (Math.random() < 0.6) ponObjeto({ tipo: "brasero", x: 0, y: 0 });
      }

// ---- mazmorra multi-sala (plantas normales; las de jefe siguen siendo una
// única sala, ver iniciarPlanta) ----
//
// Cada sala sigue siendo una pantalla fija de 960x560 como hoy -- no hay
// cámara ni scroll. La cuadrícula GRIDxGRID solo decide qué salas son
// vecinas y en qué dirección cardinal cae la puerta entre ellas; las 4
// posiciones de puerta (centro de cada borde) son fijas y ya se verificó
// que caen dentro de dentroForma() para las 6 formas de sala existentes
// (todas rectangulares -- ver FORMAS_MAPA).
const GRID = 3;
const DIR_VEC = { N: [0, -1], S: [0, 1], O: [-1, 0], E: [1, 0] };
const DIR_OPUESTA = { N: "S", S: "N", E: "O", O: "E" };

function posPuerta(dir) {
        return dir === "N"
          ? { x: W / 2, y: 46 }
          : dir === "S"
            ? { x: W / 2, y: H - 46 }
            : dir === "O"
              ? { x: 46, y: H / 2 }
              : { x: W - 46, y: H / 2 };
      }

function nuevaSala(id, gx, gy, esInicial) {
        return {
          id,
          gx,
          gy,
          forma: az(FORMAS_MAPA),
          tipo: "normal", // "normal" | "reto_parry"
          visitada: false,
          poblada: false,
          despejada: false, // solo relevante si esFinal
          esInicial: !!esInicial,
          esFinal: false,
          muros: [],
          pilares: [],
          objetos: [],
          hazards: [],
          enemigos: [],
          decals: [],
          puertas: [],
        };
      }

function conectar(a, b, dirDesdeA) {
        const dirDesdeB = DIR_OPUESTA[dirDesdeA];
        const pa = posPuerta(dirDesdeA),
          pb = posPuerta(dirDesdeB);
        a.puertas.push({ x: pa.x, y: pa.y, r: 30, dir: dirDesdeA, destino: b.id });
        b.puertas.push({ x: pb.x, y: pb.y, r: 30, dir: dirDesdeB, destino: a.id });
      }

// Paseo aleatorio simple sobre una cuadrícula 3x3: basta para 3-5 salas,
// no hace falta nada más sofisticado (BSP, etc.) para el alcance actual.
export function generarGrafoPlanta() {
        const nSalas = ri(3, 5);
        const ocupadas = new Map();
        const gxInicial = ri(0, GRID - 1),
          gyInicial = GRID - 1; // entrada en la fila inferior
        const salas = [];
        const crear = (x, y, ini) => {
          const s = nuevaSala(salas.length, x, y, ini);
          salas.push(s);
          ocupadas.set(x + "," + y, s);
          return s;
        };
        let actual = crear(gxInicial, gyInicial, true);
        let intentos = 0;
        while (salas.length < nSalas && intentos++ < 60) {
          const libres = Object.entries(DIR_VEC)
            .map(([d, [dx, dy]]) => ({
              d,
              gx: actual.gx + dx,
              gy: actual.gy + dy,
            }))
            .filter(
              (o) =>
                o.gx >= 0 &&
                o.gx < GRID &&
                o.gy >= 0 &&
                o.gy < GRID &&
                !ocupadas.has(o.gx + "," + o.gy),
            );
          if (!libres.length) {
            actual = az(salas); // atasco: retrocede a una sala ya creada y sigue el paseo
            continue;
          }
          const o = az(libres);
          const nva = crear(o.gx, o.gy, false);
          conectar(actual, nva, o.d);
          actual = nva;
        }
        const inicial = salas[0];
        const final = salas.reduce(
          (a, b) =>
            Math.abs(b.gx - inicial.gx) + Math.abs(b.gy - inicial.gy) >
            Math.abs(a.gx - inicial.gx) + Math.abs(a.gy - inicial.gy)
              ? b
              : a,
          salas[0],
        );
        final.esFinal = true;
        // sala de reto "solo parry": aparece a veces como una sala intermedia
        // más (nunca la de inicio ni la final), a partir de cierta planta
        if (G.planta >= 5 && salas.length > 2 && Math.random() < 0.09) {
          const candidatas = salas.filter((s) => !s.esInicial && !s.esFinal);
          if (candidatas.length) az(candidatas).tipo = "reto_parry";
        }
        return { salas, salaActualId: inicial.id };
      }

export function salaPorId(id) {
        return G.mazmorra && G.mazmorra.salas.find((s) => s.id === id);
      }

export function salaActual() {
        return G.mazmorra ? salaPorId(G.mazmorra.salaActualId) : null;
      }

// Puebla pilares/hazards/objetos/enemigos de una sala normal la PRIMERA vez
// que se visita (ver cargarSala) -- no se regenera si se vuelve a entrar.
function poblarSala(sala, f) {
        const N = G.players.length;
        ponPilares(f, ri(2, 4));
        if (sala.tipo === "reto_parry") {
          // sala de reto: sin hazards/objetos que distraigan, solo enemigos
          const nEn = ri(2, 3) + Math.floor((N - 1) / 2);
          for (let i = 0; i < nEn; i++) spawnEnemigo(f, "melee");
          toast(
            "Sala de reto: aquí solo el contraataque de parry hace daño",
            "#c084f0",
          );
          return;
        }
        ponHazardsYObjetos(f);
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
        if (f >= 7 && Math.random() < 0.16) {
          spawnEnemigo(f, "mini");
          toast("⚠ Un minijefe merodea esta planta…", "#c07be0");
        }
      }

// Carga una sala en G (reasigna las referencias que ya usa todo el motor:
// render(), masCercano(), puntoValido(), aplicarLimites(), spawnEnemigo()...
// siguen funcionando sin ningún cambio porque siempre operan sobre "lo que
// hoy está en G"). La forma/muros se generan la primera vez que se visita
// y se reutilizan después; los enemigos/pilares/objetos supervivientes de
// una sala ya visitada NO se regeneran al volver a entrar.
export function cargarSala(sala) {
        G.mazmorra.salaActualId = sala.id;
        if (!sala.visitada) {
          generarMapa(sala.forma); // deja el resultado en G.forma/G.muros
          sala.muros = G.muros;
        } else {
          G.forma = sala.forma;
          G.muros = sala.muros;
        }
        G.pilares = sala.pilares;
        G.objetos = sala.objetos;
        G.hazards = sala.hazards;
        G.enemigos = sala.enemigos;
        G.decals = sala.decals;
        G.puertas = sala.puertas;
        // espejos de solo-lectura para render()/red (el invitado no tiene
        // G.mazmorra): son valores primitivos, no referencias -- cualquier
        // mutación persistente (ej. "despejada") debe ir contra el objeto
        // `sala` real vía salaActual(), nunca contra estos espejos.
        G.salaTipo = sala.tipo;
        G.salaEsFinal = sala.esFinal;
        G.projs = [];
        G.areas = [];
        G.drops = []; // transitorios: no persisten al cruzar una puerta
        G.portal =
          sala.esFinal && sala.despejada
            ? { x: W / 2, y: 64, r: 24, t: 0 }
            : null;
        if (!sala.poblada) {
          poblarSala(sala, G.planta);
          sala.poblada = true;
        }
        sala.visitada = true;
      }

// Traslada a TODO el grupo a la sala conectada en cuanto un jugador vivo
// toca una puerta (ver core/loop.js) -- no hace falta que todos estén
// juntos, a diferencia del portal de fin de planta.
export function cruzarPuerta(pu) {
        const origenId = G.mazmorra.salaActualId;
        const destino = salaPorId(pu.destino);
        if (!destino) return;
        cargarSala(destino);
        const entrada =
          destino.puertas.find((d) => d.destino === origenId) ||
          destino.puertas[0];
        const [dx, dy] = DIR_VEC[entrada.dir];
        const bx = entrada.x - dx * 70,
          by = entrada.y - dy * 70; // un paso hacia dentro, opuesto a la puerta
        const perp = [-dy, dx];
        const N = G.players.length;
        G.players.forEach((p, i) => {
          const off = (i - (N - 1) / 2) * 34;
          p.x = clamp(bx + perp[0] * off, 40, W - 40);
          p.y = clamp(by + perp[1] * off, 40, H - 40);
          p.atrapado = null;
          p.rootT = 0;
          aplicarLimites(p);
        });
        G.fadeT = 0.3;
      }

export function iniciarPlanta() {
        const f = G.planta,
          N = G.players.length;
        G.escena = "torre";
        G.projs = [];
        G.areas = [];
        G.drops = [];
        G.fx = [];
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

        function reposicionarJugadores() {
          G.players.forEach((p, i) => {
            p.x = W / 2 + (i - (N - 1) / 2) * 46;
            p.y = H - 70;
            p.trail = [];
            p.safeX = p.x;
            p.safeY = p.y;
            p.atrapado = null;
            p.rootT = 0;
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
        }

        if (esJefe(f)) {
          // plantas de jefe: SIEMPRE una única sala, sin mazmorra multi-sala
          G.mazmorra = null;
          G.puertas = [];
          G.salaTipo = "normal";
          G.salaEsFinal = false;
          G.enemigos = [];
          G.objetos = [];
          G.decals = [];
          G.hazards = [];
          generarMapa(az(["sala", "sala", "cruz"]));
          reposicionarJugadores();
          G.pilares = [];
          ponPilares(f, ri(1, 2));
          ponHazardsYObjetos(f);
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
          G.mazmorra = generarGrafoPlanta();
          cargarSala(salaPorId(G.mazmorra.salaActualId));
          reposicionarJugadores();
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
