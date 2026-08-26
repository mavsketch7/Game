// Auto-generated during the modularization refactor (2026-07-23).
import { TAU } from "../core/canvas.js";
// Alias deliberado: TODO este archivo trata "W"/"H" como el tamaño de la
// SALA (mundo), no el del viewport -- con la cámara de personaje, ambos
// dejan de ser lo mismo (ver SALA_W/SALA_H en core/constants.js). Importar
// con alias evita tener que tocar cada fórmula de generarMapa()/
// posPuerta()/límites de una por una: siguen escritas igual, ahora a
// escala de sala real.
import { NOMBRE_CLIMA, SALA_H as H, SALA_W as W } from "../core/constants.js";
import { G } from "../core/state.js";
import { detenerMusicaJefe, iniciarMusicaJefe } from "./audio.js";
import { DESC_ARQ, arquetipoJefe, esJefe, nombreJefe } from "./bosses.js";
import { spawnClon, spawnEnemigo, statsTot, tipoAleatorio } from "./combat.js";
import { CUSTOM_ROOMS } from "./customRooms.js";
import { banner, toast } from "../ui/notifications.js";
import { az, clamp, ri, rnd } from "../utils/helpers.js";

// El Magnate (cerdo presidencial, jefe secreto de la planta 5) queda "en
// standby" desde que el Guardián de Hielo pasó a ser el jefe real de esa
// planta -- código intacto, solo inalcanzable, para un desbloqueo secreto
// futuro (mismo patrón que MUSICA_SINTETIZADA_ACTIVA en systems/audio.js).
const MAGNATE_ACTIVO = false;

// Radio de "calor" alrededor de cada hoguera de la sala del Guardián de
// Hielo (ver G.hoguerasJefe más abajo y el debuff de congelación en
// core/loop.js) dentro del cual el jugador se libra de la ralentización
// ambiental de esa sala.
export const RADIO_HOGUERA_JEFE = 140;

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
// Cada una es una composición de rectángulos hecha a mano (no aleatoria en
// su disposición base, como mucho con algún parámetro puntual tipo el `gy`
// de "partida"), verificada para dejar siempre libres con margen los 4
// puntos cardinales donde caen las puertas de la mazmorra multi-sala.
//
// Las formas proceduales de abajo conviven con las "CUSTOM_ROOMS": salas
// diseñadas a mano en tools/level-editor/, exportadas como JSON a
// src/systems/customRooms/*.json y cargadas automáticamente por
// customRooms.js -- añadir una sala nueva diseñada a mano NO requiere tocar
// este archivo, solo soltar el JSON en esa carpeta (ver generarMapa() más
// abajo, rama `CUSTOM_ROOMS[forma]`).
const FORMAS_MAPA = [
        "sala",
        "sala",
        "cruz",
        "partida",
        "foso",
        "columnas",
        "pasilloL",
        "nicho",
        "u",
        "pasilloDoble",
        "antesala",
        "herradura",
        "escalonada",
        ...Object.keys(CUSTOM_ROOMS),
      ];

const NOMBRE_FORMA = {
        sala: "",
        cruz: "Sala en cruz",
        partida: "Sala partida",
        foso: "Anillo del foso",
        columnas: "Sala de columnas",
        pasilloL: "Pasillo en L",
        nicho: "Sala con nicho",
        u: "Sala en U",
        pasilloDoble: "Pasillo doble",
        antesala: "Antesala angosta",
        herradura: "Herradura",
        escalonada: "Sala escalonada",
        ...Object.fromEntries(
          Object.values(CUSTOM_ROOMS).map((sala) => [sala.id, sala.nombre]),
        ),
      };

// Algunas formas (nicho/u/herradura/escalonada) se diseñaron a mano con
// coordenadas absolutas en píxeles, pensadas para la sala-pantalla de
// 960x560 de antes -- a diferencia del resto (cruz/foso/pasilloL/...), que
// ya usan fracciones de W/H y por tanto escalan solas con el alias de
// arriba. Estas 4 necesitan un factor de escala explícito para no quedar
// como detalles diminutos perdidos en una sala ahora mucho más grande.
const ESC_X = W / 960,
      ESC_Y = H / 560;

// Grosor del muro de borde y ancho del hueco que deja libre una puerta --
// ver agregarMurosPerimetro(). El hueco tiene que ser cómodo de cruzar
// (más ancho que el sprite de la puerta, ~80px, ver render/world.js) y
// quedar centrado en la posición fija de cada puerta (posPuerta()).
const GROSOR_MURO_BORDE = 24;
const HUECO_PUERTA = 140;

// Por defecto TODO el borde de la sala es muro sólido; el único hueco es
// el de la(s) puerta(s) reales que tenga esa sala en esa dirección (según
// el grafo de la mazmorra, no la forma) -- así nunca hay una "salida"
// donde en realidad no hay camino. Los bloques interiores de cada forma
// (cruz/foso/etc., más arriba) ya se diseñaron dejando libre el centro de
// cada borde con margen de sobra, así que este muro adicional no puede
// chocar con ellos.
function agregarMurosPerimetro(direcciones) {
        const t = GROSOR_MURO_BORDE,
          g = HUECO_PUERTA;
        const tiene = (d) => direcciones.includes(d);
        // norte
        if (tiene("N"))
          G.muros.push(
            { x: 0, y: 0, w: W / 2 - g / 2, h: t },
            { x: W / 2 + g / 2, y: 0, w: W / 2 - g / 2, h: t },
          );
        else G.muros.push({ x: 0, y: 0, w: W, h: t });
        // sur
        if (tiene("S"))
          G.muros.push(
            { x: 0, y: H - t, w: W / 2 - g / 2, h: t },
            { x: W / 2 + g / 2, y: H - t, w: W / 2 - g / 2, h: t },
          );
        else G.muros.push({ x: 0, y: H - t, w: W, h: t });
        // oeste
        if (tiene("O"))
          G.muros.push(
            { x: 0, y: 0, w: t, h: H / 2 - g / 2 },
            { x: 0, y: H / 2 + g / 2, w: t, h: H / 2 - g / 2 },
          );
        else G.muros.push({ x: 0, y: 0, w: t, h: H });
        // este
        if (tiene("E"))
          G.muros.push(
            { x: W - t, y: 0, w: t, h: H / 2 - g / 2 },
            { x: W - t, y: H / 2 + g / 2, w: t, h: H / 2 - g / 2 },
          );
        else G.muros.push({ x: W - t, y: 0, w: t, h: H });
      }

export function generarMapa(forma, direccionesConPuerta) {
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
        } else if (forma === "nicho") {
          // alcoba lateral: un bloque asimétrico a un lado de la sala
          G.muros.push({
            x: 110 * ESC_X,
            y: 190 * ESC_Y,
            w: 110 * ESC_X,
            h: 180 * ESC_Y,
          });
        } else if (forma === "u") {
          // bloque macizo arriba con hueco por debajo: obliga a rodearlo
          G.muros.push({
            x: W / 2 - 160 * ESC_X,
            y: 90 * ESC_Y,
            w: 320 * ESC_X,
            h: 130 * ESC_Y,
          });
        } else if (forma === "pasilloDoble") {
          // dos corredores paralelos simétricos con un hueco central
          const gy2 = H * 0.5,
            gap2 = 60;
          G.muros.push(
            { x: W * 0.3, y: 92, w: 26, h: Math.max(30, gy2 - gap2 - 92) },
            {
              x: W * 0.3,
              y: gy2 + gap2,
              w: 26,
              h: Math.max(30, H - 92 - (gy2 + gap2)),
            },
            { x: W * 0.66, y: 92, w: 26, h: Math.max(30, gy2 - gap2 - 92) },
            {
              x: W * 0.66,
              y: gy2 + gap2,
              w: 26,
              h: Math.max(30, H - 92 - (gy2 + gap2)),
            },
          );
        } else if (forma === "antesala") {
          // cuello de botella cerca de la entrada inferior: dos bloques con
          // un hueco central estrecho por el que hay que pasar
          G.muros.push(
            { x: 0, y: H - 170, w: W * 0.38, h: 30 },
            { x: W * 0.62, y: H - 170, w: W * 0.38, h: 30 },
          );
        } else if (forma === "herradura") {
          // marco hueco en forma de herradura, abierto por abajo -- se
          // puede entrar y caminar dentro, no es un bloque macizo
          G.muros.push(
            { x: 330 * ESC_X, y: 170 * ESC_Y, w: 300 * ESC_X, h: 26 },
            { x: 330 * ESC_X, y: 170 * ESC_Y, w: 26, h: 200 * ESC_Y },
            { x: 604 * ESC_X, y: 170 * ESC_Y, w: 26, h: 200 * ESC_Y },
          );
        } else if (forma === "escalonada") {
          // tres bloques pequeños en zigzag diagonal
          G.muros.push(
            { x: 200 * ESC_X, y: 150 * ESC_Y, w: 70, h: 70 },
            { x: 445 * ESC_X, y: 250 * ESC_Y, w: 70, h: 70 },
            { x: 690 * ESC_X, y: 350 * ESC_Y, w: 70, h: 70 },
          );
        } else if (CUSTOM_ROOMS[forma]) {
          // Sala diseñada a mano en tools/level-editor/, exportada como JSON
          // (ver src/systems/customRooms/*.json y customRooms.js). Los
          // rectángulos ya vienen fusionados y en píxeles reales -- estas
          // coordenadas asumen la sala a 1600x1000 tal cual (el tamaño del
          // lienzo del editor); si SALA_W/SALA_H cambiara de tamaño más
          // adelante, habría que reexportar el JSON desde la herramienta, no
          // se escala sola con ESC_X/ESC_Y como "nicho"/"u"/etc. Los muros
          // marcados `secreto: true` en el JSON se pueden revelar
          // acercándose y pulsando E (ver p.secretoParedObj en
          // core/loop.js e interactuar() en systems/abilities.js).
          for (const m of CUSTOM_ROOMS[forma].muros) G.muros.push({ ...m });
        }
        agregarMurosPerimetro(direccionesConPuerta || []);
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

export function ponPilares(f, nPil) {
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

// hazardMult/objMult (por defecto 1) escalan las probabilidades según el
// "perfil" sorteado para la sala en poblarSala() -- las plantas de jefe
// llaman a esta función sin argumentos extra y no se ven afectadas.
function ponHazardsYObjetos(f, hazardMult, objMult) {
        hazardMult = hazardMult ?? 1;
        objMult = objMult ?? 1;
        const p = (base) => clamp(base * hazardMult, 0, 0.95);
        const po = (base) => clamp(base * objMult, 0, 0.95);
        if (f >= 10 && Math.random() < p(0.7)) ponHazard("grieta", 20, ri(1, 3));
        if (f >= 8 && Math.random() < p(0.35)) ponHazard("arena", 34, 1);
        if (f >= 6 && Math.random() < p(0.5)) ponHazard("ortiga", 28, ri(1, 2));
        if (f >= 14 && Math.random() < p(0.45))
          ponHazard("fuegoZona", 26, ri(1, 2));
        const nBar = Math.round(ri(1, 3) * objMult);
        for (let i = 0; i < nBar; i++)
          ponObjeto({ tipo: "barril", x: 0, y: 0, hp: 10 });
        if (Math.random() < po(0.45))
          ponObjeto({ tipo: "cofre", x: 0, y: 0, hp: 1, abierto: false });
        if (Math.random() < po(0.5)) ponObjeto({ tipo: "cristal", x: 0, y: 0 });
        if (Math.random() < po(0.6)) ponObjeto({ tipo: "brasero", x: 0, y: 0 });
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
function generarGrafoPlanta() {
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
        // QA (?qa=1 en la URL, mismo interruptor que el cofre de pruebas en
        // core/gameflow.js): la sala de entrada de la planta 1 (justo al
        // subir las escaleras desde el lobby) es siempre "arsenal" -- la
        // primera sala diseñada a mano con tools/level-editor/ (index.html) -- para
        // poder probarla sin esperar a que el sorteo la saque por azar.
        if (
          G.planta === 1 &&
          new URLSearchParams(location.search).get("qa") === "1"
        ) {
          actual.forma = "arsenal";
        }
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
        // Sala secreta: una sala "hoja" (una sola puerta) que no sea ni la
        // de inicio ni la final se marca como secreta y su ÚNICA puerta se
        // oculta (ver p.secretoObj / interactuar() -- hay que encontrarla y
        // pulsar E para revelarla). Al ser una hoja, nunca está en el
        // camino obligatorio hacia la sala final -- si nadie la encuentra,
        // la partida sigue igual de jugable, es solo un extra opcional.
        if (Math.random() < 0.35) {
          const hojas = salas.filter(
            (s) => !s.esInicial && !s.esFinal && s.puertas.length === 1,
          );
          if (hojas.length) {
            const secreta = az(hojas);
            secreta.secreta = true;
            const padre = salaPorId2(salas, secreta.puertas[0].destino);
            const puertaDelPadre = padre?.puertas.find(
              (pu) => pu.destino === secreta.id,
            );
            if (puertaDelPadre) puertaDelPadre.oculta = true;
          }
        }
        return { salas, salaActualId: inicial.id };
      }

function salaPorId2(salas, id) {
        return salas.find((s) => s.id === id);
      }

function salaPorId(id) {
        return G.mazmorra && G.mazmorra.salas.find((s) => s.id === id);
      }

export function salaActual() {
        return G.mazmorra ? salaPorId(G.mazmorra.salaActualId) : null;
      }

// Perfiles de contenido para que dos salas con la misma forma no se
// sientan iguales: cada uno pesa distinto el número de pilares y las
// probabilidades de hazards/objetos (ver ponHazardsYObjetos). Sorteado por
// sala, no ligado a la forma -- así la variedad no depende solo de la
// geometría de FORMAS_MAPA.
const PERFILES_SALA = [
        { nombre: "estandar", pilares: [2, 4], hazardMult: 1, objMult: 1 },
        { nombre: "pilares", pilares: [4, 6], hazardMult: 0.3, objMult: 1 },
        { nombre: "hazards", pilares: [0, 1], hazardMult: 1.8, objMult: 0.6 },
        { nombre: "tesoro", pilares: [1, 3], hazardMult: 0.4, objMult: 1.6 },
        { nombre: "arena", pilares: [0, 1], hazardMult: 0.2, objMult: 0.3 },
      ];

// Objetos con campos extra fijos según su tipo, iguales a los que pone
// ponHazardsYObjetos() aleatoriamente -- se usan al colocar el contenido
// EXACTO que se diseñó a mano en el editor (ver colocarContenidoFijo()).
function crearObjetoFijo(tipo, x, y) {
        if (tipo === "barril") return { tipo, x, y, hp: 10 };
        if (tipo === "cofre") return { tipo, x, y, hp: 1, abierto: false };
        return { tipo, x, y }; // cristal, brasero
      }

// Si la sala es una CUSTOM_ROOM con objetos/enemigos/pilares definidos en su
// JSON (ver tools/level-editor/, botón "Exportar JSON (motor)"), coloca ese
// contenido EXACTO en vez de sortearlo -- sustituye a
// ponPilares/ponHazardsYObjetos/el sorteo de enemigos de poblarSala().
// Devuelve true si había contenido fijo que colocar (para que poblarSala()
// sepa que debe saltarse el poblado procedural).
function colocarContenidoFijo(sala, f) {
        const datos = CUSTOM_ROOMS[sala.forma];
        if (!datos) return false;
        const hayContenido =
          (datos.objetos && datos.objetos.length) ||
          (datos.enemigos && datos.enemigos.length) ||
          (datos.pilares && datos.pilares.length);
        if (!hayContenido) return false;

        for (const o of datos.objetos || [])
          G.objetos.push(crearObjetoFijo(o.tipo, o.x, o.y));
        for (const e of datos.enemigos || [])
          spawnEnemigo(f, e.tipo, false, { x: e.x, y: e.y });
        for (const p of datos.pilares || []) {
          const dest = p.destructible !== false;
          G.pilares.push({
            x: p.x,
            y: p.y,
            r: 24,
            destructible: dest,
            hp: dest ? 60 + f * 3 : 0,
            hpMax: dest ? 60 + f * 3 : 0,
            hurtT: 0,
          });
        }
        return true;
      }

// Puebla pilares/hazards/objetos/enemigos de una sala normal la PRIMERA vez
// que se visita (ver cargarSala) -- no se regenera si se vuelve a entrar.
function poblarSala(sala, f) {
        const N = G.players.length;
        // QA (?qa=1, mismo interruptor que el arsenal/cofre de pruebas de
        // arriba y en core/gameflow.js): la sala de entrada de la planta 1
        // se llena con 100 enemigos extra -- para probar de golpe el
        // combate a gran escala (sangre real, desintegración en píxeles,
        // rango de estilo, rendimiento...) sin tener que arrastrarlos sala
        // tras sala. Se suma ANTES de colocarContenidoFijo a propósito, así
        // se apila sobre el contenido fijo del arsenal en vez de sustituirlo.
        if (
          f === 1 &&
          sala.forma === "arsenal" &&
          new URLSearchParams(location.search).get("qa") === "1"
        ) {
          for (let i = 0; i < 100; i++) spawnEnemigo(f, tipoAleatorio(f));
        }
        if (colocarContenidoFijo(sala, f)) return;
        const perfil = az(PERFILES_SALA);
        ponPilares(f, ri(perfil.pilares[0], perfil.pilares[1]));
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
        ponHazardsYObjetos(f, perfil.hazardMult, perfil.objMult);
        // Rangos ~60-80% más altos que antes (2-3/3-4/4-5/5-6/6-8): las
        // salas se quedaban muy vacías, sobre todo en plantas bajas en
        // solitario (2-3 enemigos repartidos por toda la sala se notaba
        // desierto). Feedback directo del usuario, no un cálculo de
        // dificultad -- si hace falta volver a bajarlo por exceso de
        // dificultad, este es el único sitio que tocar.
        const base =
          f <= 5
            ? ri(4, 6)
            : f <= 20
              ? ri(6, 8)
              : f <= 50
                ? ri(7, 9)
                : f <= 80
                  ? ri(9, 11)
                  : ri(11, 14);
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
function cargarSala(sala) {
        G.mazmorra.salaActualId = sala.id;
        if (!sala.visitada) {
          generarMapa(
            sala.forma,
            sala.puertas.map((pu) => pu.dir),
          ); // deja el resultado en G.forma/G.muros
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
        // El portal de fin de planta se colocaba en (W/2, 64), casi encima
        // de la puerta "N" (W/2, 46, radio 30 -- ver posPuerta()): con el
        // radio de captura del portal (r+12=36) las dos zonas se solapaban
        // por completo. Cuando la sala final tenía su puerta de vuelta
        // justo en el lado norte (según por dónde se llegó a ella en el
        // paseo aleatorio del grafo), intentar cruzar esa puerta para
        // volver también contaba como "estar dentro del portal", así que
        // en vez de cruzar hacia la sala anterior el juego devolvía al
        // jugador siempre al mismo sitio. Se separa en X (bien lejos de
        // las 4 posiciones de puerta) manteniendo la Y original, que ya
        // está verificada libre de muros en las 6 formas de sala.
        G.portal =
          sala.esFinal && sala.despejada
            ? { x: W / 2 + 160, y: 64, r: 24, t: 0 }
            : null;
        // Escalera para volver a la planta anterior (o al lobby si esto
        // era la planta 1): vive en la sala de ENTRADA de la planta, no
        // hace falta despejarla primero -- es una vía de retirada, no una
        // recompensa. Espejo del portal de arriba (mismo Y, X al otro
        // lado del centro) para no solapar con ninguna puerta.
        G.escaleraAbajo = sala.esInicial
          ? { x: W / 2 - 160, y: 64, r: 24, t: 0 }
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
        // Pista de jefe: se para SIEMPRE al cambiar de planta (no-op si no
        // estaba sonando) -- si la nueva planta también es de jefe, se
        // vuelve a arrancar más abajo (crossfade limpio en vez de dejarla
        // sonando de una planta de jefe a la siguiente sin transición).
        detenerMusicaJefe();
        G.escena = "torre";
        G.projs = [];
        G.areas = [];
        G.drops = [];
        G.fx = [];
        G.flechasClavadas = [];
        G.wx = [];
        G.rayos = [];
        G.rayoCd = rnd(3, 6);
        G.portal = null;
        G.escaleraAbajo = null;
        G.fogata = null;
        G.fogataUsada = false;
        G.descansoT = 0;
        G.mercader = null;
        G.skinNpc = null;
        G.arenaNpc = null;
        G.nivelNpc = null;
        // Portal de pruebas (QA) del vestíbulo -- sin esto se quedaba
        // "pegado" en pantalla al entrar a cualquier planta (mismo bug
        // que ya evitan mercader/skinNpc/arenaNpc/nivelNpc de arriba).
        G.jefeNpcQA = null;
        // Hogueras de alivio del Guardián de Hielo (ver debuff de
        // congelación en core/loop.js) -- solo existen en su sala, se
        // limpian aquí para no arrastrarse a otras plantas.
        G.hoguerasJefe = [];
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
          // Crossfade a la pista del jefe (fundido de entrada natural,
          // ver iniciarMusicaJefe() en systems/audio.js) al entrar en su
          // sala.
          iniciarMusicaJefe();
          // plantas de jefe: SIEMPRE una única sala, sin mazmorra multi-sala
          G.mazmorra = null;
          G.puertas = [];
          G.salaTipo = "normal";
          G.salaEsFinal = false;
          G.enemigos = [];
          G.objetos = [];
          G.decals = [];
          G.hazards = [];
          generarMapa(az(["sala", "sala", "cruz"]), []); // sin puertas: sala de jefe sellada
          reposicionarJugadores();
          // vía de retirada, mismo criterio que en cargarSala(): siempre
          // disponible, no hace falta vencer al jefe primero para volver
          G.escaleraAbajo = { x: W / 2 - 160, y: 64, r: 24, t: 0 };
          G.pilares = [];
          ponPilares(f, ri(1, 2));
          ponHazardsYObjetos(f);
          const arq = arquetipoJefe(f);
          if (MAGNATE_ACTIVO && f === 5) {
            // JEFE SECRETO: El Magnate (cerdo presidencial) — en standby,
            // ver MAGNATE_ACTIVO arriba.
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
          } else if (f === 5) {
            // PRIMER JEFE REAL: Guardián de Hielo -- ver core/loop.js
            // (rama arq==="hielo") para la IA y la mecánica de pilares,
            // render/character.js para el sprite animado real.
            spawnEnemigo(f, "jefe");
            const j = G.enemigos.find((e) => e.jefe);
            if (j) {
              j.arquetipo = "hielo";
              j.nombre = "Guardián de Hielo";
              j.hp = Math.round(j.hp * 1.5);
              j.hpMax = j.hp;
              // Hitbox (círculo de colisión/alcance de golpe, no el tamaño
              // visual -- ese lo fija FROST_ALTO en render/sprites.js, no
              // esto) ajustado al ancho real del sprite: medido por píxeles,
              // el cuerpo ocupa ~40-43% del ancho nativo (192px) en
              // idle/walk, que sobre el lienzo ya recompuesto (276px de
              // ancho) da un semiancho de ~55-60px -- 46 se quedaba corto y
              // dejaba hombros/brazos fuera del círculo de golpe.
              j.r = 58;
              j.knockRes = 0.6;
              j.faseHielo1 = false;
              j.faseHielo2 = false;
              j.faseHielo3 = false;
              j.regenerando = false;
              j.pilaresFase = [];
              j.atkT = 0;
              // Windup/cadencia de ataque más rápidos que la versión inicial
              // (0.9s/2.2s) -- pedido expreso del usuario ("tiene que
              // atacar algo más rápido a melee"). El render escala la
              // animación real (14 frames) a este mismo atkTMax, así que
              // acortarlo también acelera el gesto visual, no solo el daño.
              j.atkTMax = 0.62;
              j.moviendose = false;
              j.atkCdJefe = 0.9;
              // Más rápido que el jefe genérico (TIPOS.jefe.velM=0.75 lo
              // deja muy lento) -- pedido expreso ("y moverse"). Tope propio
              // algo por encima del cap normal de jefe (130).
              j.vel = Math.min(Math.round(j.vel * 1.7), 155);
              j.pasoT = 0;
              // Descarta cualquier pilar decorativo genérico (ponPilares()
              // más arriba, antes de que existiera el jefe) que haya caído
              // encima o pegado al Guardián -- confirmado por Playwright:
              // esto, no un desajuste del sprite, era la causa real del
              // "el jefe flota sobre la sombra": la sombra de ESE pilar
              // (independiente, no `pl.hielo`) asomaba por detrás del
              // Guardián mientras el pilar en sí quedaba oculto tras su
              // sprite, mucho más ancho que su hitbox.
              G.pilares = G.pilares.filter(
                (pl) => Math.hypot(pl.x - j.x, pl.y - j.y) > j.r + 90,
              );
            }
            // 4-5 hogueras estratégicas repartidas en pentágono alrededor
            // del centro de la sala -- pedido expreso del usuario para
            // paliar el debuff de congelación ambiental (ver core/loop.js)
            // sin obstruir el combate: ninguna cae sobre el punto de
            // aparición de los jugadores (abajo, reposicionarJugadores) ni
            // sobre la escalera de retirada (arriba-izquierda).
            {
              const cxB = W / 2, cyB = H / 2, rB = 380;
              G.hoguerasJefe = [-90, -18, 54, 126, 198].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                return {
                  x: Math.round(cxB + rB * Math.cos(rad)),
                  y: Math.round(cyB + rB * Math.sin(rad)),
                };
              });
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
            ? (MAGNATE_ACTIVO ? "El Magnate" : "Guardián de Hielo")
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
              ? (MAGNATE_ACTIVO
                  ? "⭐ JEFE SECRETO: El Magnate ha aparecido…"
                  : "❄ El Guardián de Hielo despierta… destruye sus pilares para evitar que se regenere")
              : "Arquetipo: " + DESC_ARQ[arquetipoJefe(f)],
            f === 5 ? "#7fc9e8" : "#c07be0",
          );
      }

