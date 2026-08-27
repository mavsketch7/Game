// Auto-generated during the modularization refactor (2026-07-23).
import { TAU } from "../core/canvas.js";
// Alias: el único uso de W/H de este archivo es un clamp de objetivo
// DENTRO de la sala (mundo) -- ver el mismo truco en systems/floorgen.js.
import { ELEMENTOS, ELEM_MAGO, FORMAS_DRUIDA, FORMAS_INFO, RAREZAS, ROLES, SALA_H as H, SALA_W as W, SUPS } from "../core/constants.js";
import { update } from "../core/loop.js";
import { G } from "../core/state.js";
import { fxEstocada, fxOnda, fxParticulas, fxTajo, fxTexto } from "../render/effects.js";
import { sfx, sfxDisparoArco, sfxGolpeAire, sfxGolpeCritico, sfxImpactoFrhor, sfxImpactoGuerrero, sfxImpactoPicaro, sfxRompeBarril, sfxRompeHielo, sfxSwingFrhor } from "./audio.js";
import { curarP, danoAEnemigo, danoAlJugador, masCercano, statsTot, vivos } from "./combat.js";
import { posDropValida } from "./floorgen.js";
import { JUICE } from "./juice.js";
import { dropItem, genItem } from "./loot.js";
import { OBJETOS_MITICOS, genObjetoMitico, tieneEfecto } from "./objetosMiticos.js";
import { FRAGMENTOS_CATALOGO } from "./soul.js";
import { META, guardarMeta } from "../core/save.js";
import { toast } from "../ui/notifications.js";
import { clamp } from "../utils/helpers.js";

export function groundTarget(p, maxR) {
        let tx = p.inp ? p.inp.gtX : p.x,
          ty = p.inp ? p.inp.gtY : p.y;
        const d = Math.hypot(tx - p.x, ty - p.y);
        if (d > maxR) {
          tx = p.x + ((tx - p.x) / d) * maxR;
          ty = p.y + ((ty - p.y) / d) * maxR;
        }
        return { x: tx, y: ty };
      }

const cdHaste = (p) => (p.hasteT > 0 ? 0.55 : 1);

export function atacar(p) {
        if (p.atrapado) return;
        if (G.salaTipo === "reto_parry") {
          if (!(p._retoAvisoT > 0)) {
            fxTexto(p.x, p.y - 28, "¡Solo puedes parryar aquí!", "#c084f0");
            p._retoAvisoT = 0.9;
          }
          return;
        }
        const t = statsTot(p);
        if (p.rol === "guerrero") {
          if (p.atkCd > 0) return;
          const colosal = (p.combo || 0) >= 4;
          p.atkCd =
            ((colosal ? 0.5 : 0.38) * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          p.swingT = colosal ? 0.26 : 0.18; // 0.26 ver SPECIAL_ATTACK_DUR.guerrero en render/sprites.js -- mismo valor
          p.atkEspecial = colosal; // qué hoja usa character.js: básica o especial
          if (colosal) {
            p.combo = 0;
            golpeArco(p, p.aim, 88, 2.1, t.atk * 2);
            fxOnda(p.x, p.y, 88, "#e9b45c");
            G.shake = Math.max(G.shake, 4);
            fxTexto(p.x, p.y - 36, "¡GOLPE COLOSAL!", "#e9b45c", true);
          } else {
            const hits = golpeArco(p, p.aim, 62, 1.5, t.atk);
            if (hits > 0) {
              p.combo = (p.combo || 0) + 1;
              p.comboT = 3;
              if (p.combo >= 4)
                fxTexto(p.x, p.y - 30, "⚔ ¡cargado!", "#e9b45c");
            }
          }
        } else if (p.rol === "arquero") {
          if (p.atkCd > 0) return;
          p.atkCd = (0.3 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          p.swingT = 0.3;
          const dmgFle = t.atk * (p.imbuido === "arcano" ? 1.15 : 1);
          // Mismo sonido real que dispararFlechaCargada (disparo) -- este
          // camino solo se usa atrapado/en la sala "solo parry" (el juego
          // normal pasa por dispararFlechaCargada, ver el bloque
          // "arquero" en core/loop.js:update()), pero debe sonar
          // exactamente igual, no volver al sintetizado de sfx().
          if (p.certera) {
            // Flecha Certera: crítico natural, atraviesa y vuela más rápido
            p.certera = false;
            dispararProy(p, p.aim, dmgFle * 2, "flecha", "#ffd27f", 560, true);
            const pr = G.projs[G.projs.length - 1];
            pr.pierce = (pr.pierce || 0) + 2;
            pr.certera = true;
            fxOnda(p.x, p.y, 20, "#ffd27f");
            sfxDisparoArco();
          } else {
            dispararProy(p, p.aim, dmgFle, "flecha", "#e9e3d5", 480, true);
            sfxDisparoArco();
          }
        } else if (p.rol === "mago") {
          if (p.elemento === "arcano") return; // el arcano se carga manteniendo el ataque (gestionado en el update)
          if (p.castCd > 0) return;
          if (p.res < 8) {
            fxTexto(p.x, p.y - 24, "sin maná", "#9a93ab");
            return;
          }
          p.res -= 8;
          p.castCd = (0.45 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          p.swingT = 0.25; // ver ATTACK_DUR.mago en render/sprites.js -- mismo valor
          if (p.elemento === "fuego") {
            dispararProy(p, p.aim, t.atk * 0.9, "bola", "#ff7d4d", 400);
            G.projs[G.projs.length - 1].quema = true;
          } else {
            dispararProy(p, p.aim, t.atk * 0.8, "carambano", "#7fc9e8", 430);
            G.projs[G.projs.length - 1].congela = true;
          }
        } else if (p.rol === "picaro") {
          if (p.atkCd > 0) return;
          p.atkCd = (0.2 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          p.swingT = 0.1;
          // rango 46->56 y arco 1.1->0.65 rad: más alcance pero más
          // estrecho, a juego con la puñalada recta (ya no es un barrido
          // ancho como el guerrero, ver CONFIG_ARMA.estocada en sprites.js).
          golpeArco(p, p.aim, 56, 0.65, t.atk * 0.75, true);
        } else if (p.rol === "druida") {
          if (p.atkCd > 0) return;
          const fd = p._formDmg || 1;
          if (p.forma === "humano") {
            p.atkCd = (0.4 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            dispararProy(p, p.aim, t.atk, "rama", "#8a6b43", 420);
          } else if (p.forma === "aguila") {
            p.atkCd = (0.25 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            p.swingT = 0.1;
            golpeArco(p, p.aim, 50, 1.2, t.atk * 0.7 * fd);
          } else if (p.forma === "lobo") {
            p.atkCd = (0.34 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            p.swingT = 0.14;
            golpeArco(p, p.aim, 55, 1.0, t.atk * 1.1 * fd);
          } else {
            // oso
            p.atkCd = (0.6 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            p.swingT = 0.22;
            golpeArco(p, p.aim, 66, 1.7, t.atk * 1.5 * fd);
          }
        } else {
          // clérigo: proyectil sagrado básico
          if (p.atkCd > 0) return;
          p.atkCd = (0.45 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          dispararProy(p, p.aim, t.atk, "orbe", "#ffe6a3", 380);
        }
      }

// Longitud visual de fxEstocada, deliberadamente MÁS CORTA que `rango`
// (46-56px, el alcance real de golpe contra enemigos): con la línea recta
// completa se veía "lanzada" lejos del cuerpo, sobre todo porque nace a la
// altura de los PIES (p.y, mismo punto que usa fxTajo) en vez de a la
// altura de la mano -- con el barrido ancho de fxTajo eso no se notaba,
// con una línea fina y recta sí. ALTO_MANO sube el origen a la altura del
// puño; ALCANCE_ESTOCADA_FX mantiene la punta pegada al cuerpo en vez de
// proyectarse hasta donde de verdad llega el golpe (que es más largo que
// el brazo, a propósito, para que el hitbox se sienta generoso).
const ALTO_MANO_ESTOCADA = 16;
const ALCANCE_ESTOCADA_FX = 24;

// Disparo cargado del arquero (mantener el botón de ataque, ver el bloque
// "arquero" en core/loop.js:update() y dispararFlechaCargada más abajo,
// mismo patrón que el arcano del mago con p.cargaT/dispararArcano). Un
// toque corto (menos de CARGA_ARQ_UMBRAL) dispara igual que siempre, sin
// perforar ni bono de crítico -- así un simple clic no cambia de
// sensación. CARGA_ARQ_ZONA marca la ventana de "óptimo" (fracción de
// CARGA_ARQ_MAX en SEGUNDOS, no un porcentaje): soltar dentro de esa
// ventana da el bono de crítico más alto; cargar más allá sigue
// disparando con perforación pero sin el bono extra -- premia soltar en
// el momento justo, no simplemente "cuanto más, mejor".
export const CARGA_ARQ_MAX = 0.9;
export const CARGA_ARQ_UMBRAL = 0.2;
export const CARGA_ARQ_ZONA = [0.5, 0.8];

function golpeArco(p, dir, rango, arco, dmgBase, esPicaro) {
        // Pícaro: línea recta de puñalada (fxEstocada), no el barrido en
        // media luna de fxTajo -- una daga apuñala, no siega (ver
        // CONFIG_ARMA.estocada en render/sprites.js, mismo criterio para
        // el arma en mano).
        if (esPicaro) fxEstocada(p.x, p.y - ALTO_MANO_ESTOCADA, dir, ALCANCE_ESTOCADA_FX);
        else fxTajo(p.x, p.y, dir, rango);
        // guerrero/pícaro ya NO llevan el "espadazo" sintetizado en el
        // swing -- chocaba con el sonido de impacto/fallo REAL que se
        // decide más abajo (uno sintético + uno real a la vez sonaba raro,
        // "no encaja"). El resto sigue con el "golpe" genérico de siempre.
        if (p.rol !== "guerrero" && !esPicaro) sfx("golpe");
        // Martillo de Frhor: silbido del martillazo AL AIRE, antes de saber
        // si golpea (pedido expreso del usuario) -- suena siempre que se
        // blande, independientemente de si conecta; el impacto real (más
        // abajo) es un sonido aparte y se superpone a propósito.
        if (tieneEfecto(p, "congela_frhor")) sfxSwingFrhor();
        let hits = 0,
          huboCrit = false;
        for (const e of G.enemigos) {
          if (e.hp <= 0 && !e.dummy) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < rango + e.r) {
            let da = Math.atan2(e.y - p.y, e.x - p.x) - dir;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            if (Math.abs(da) < arco / 2) {
              let dmg = dmgBase;
              if (p.imbuido === "arcano") dmg *= 1.15; // sinergia arcana
              // pícaro: puñalada por la espalda si el enemigo está centrado en otro
              let backstab = false;
              if (esPicaro && !e.dummy && !e.jefe) {
                const obj2 = masCercano(e.x, e.y);
                if (obj2 && obj2 !== p) {
                  backstab = true;
                  dmg *= 1.6;
                }
              }
              if (
                danoAEnemigo(
                  e,
                  dmg,
                  p,
                  true,
                  Math.cos(dir) * JUICE.knockback.meleeForce,
                  Math.sin(dir) * JUICE.knockback.meleeForce,
                )
              )
                huboCrit = true;
              hits++;
              if (backstab)
                fxTexto(e.x, e.y - e.r - 16, "¡por la espalda!", "#c084f0");
              if (esPicaro && p._poison && !e.dummy) {
                e.poisonT = 3;
                e.poisonDps = statsTot(p).atk * 0.3;
                e.poisonOwner = p;
              }
              if (p.imbuido) aplicarImbuido(p, e);
              // Martillo de Frhor (drop garantizado del Guardián de
              // Hielo, ver systems/combat.js: matarEnemigo()) -- congela
              // de verdad (stunT, no solo ralentiza) al enemigo golpeado
              // por un ataque básico. Solo aquí: golpeArco() es el único
              // punto de daño melee básico, proyectiles/habilidades no
              // pasan por aquí.
              if (!e.dummy && tieneEfecto(p, "congela_frhor"))
                e.stunT = Math.max(e.stunT, 4);
            }
          }
        }
        // fuego amigo: el tajo alcanza a los compañeros en el arco (50% de daño;
        // en la Arena PvP es el único daño que existe, así que va al 100%)
        if (G.ff || G.escena === "pvp") {
          const multFF = G.escena === "pvp" ? 1 : 0.5;
          for (const q of vivos()) {
            if (q === p || q.invulT > 0) continue;
            const dq = Math.hypot(q.x - p.x, q.y - p.y);
            if (dq < rango + q.r) {
              let da = Math.atan2(q.y - p.y, q.x - p.x) - dir;
              while (da > Math.PI) da -= TAU;
              while (da < -Math.PI) da += TAU;
              if (Math.abs(da) < arco / 2) {
                danoAlJugador(q, dmgBase * multFF, { ff: p });
                if (G.escena !== "pvp")
                  fxTexto(
                    (p.x + q.x) / 2,
                    q.y - 34,
                    "¡fuego amigo!",
                    "#ff9d3d",
                  );
              }
            }
          }
        }
        // pilares destructibles y objetos
        for (const pl of G.pilares) {
          if (!pl.destructible) continue;
          if (Math.hypot(pl.x - p.x, pl.y - p.y) < rango + pl.r) {
            let da = Math.atan2(pl.y - p.y, pl.x - p.x) - dir;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            if (Math.abs(da) < arco / 2) danoPilar(pl, dmgBase * 0.7);
          }
        }
        for (const o of G.objetos) {
          if (o.tipo !== "barril") continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) < rango + 12) {
            let da = Math.atan2(o.y - p.y, o.x - p.x) - dir;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            if (Math.abs(da) < arco / 2) golpeObjeto(o, dmgBase);
          }
        }
        // Sonido de impacto/fallo REAL (torre-vespero-assets/sounds-fx), UNA
        // vez por golpe (no una por enemigo alcanzado) -- se decide aquí, ya
        // con `hits`/`huboCrit` calculados, en vez de al principio de la
        // función. El crítico manda: si algún enemigo alcanzado fue
        // crítico, suena la muestra de crítico en vez de una normal.
        if (hits > 0 && !huboCrit && tieneEfecto(p, "congela_frhor")) {
          // Martillo de Frhor: sonido propio (impacto_guerrero_2/3, más
          // fuerte) por encima del de la clase -- el crítico sigue
          // sonando como crítico, eso no cambia.
          sfxImpactoFrhor();
        } else if (p.rol === "guerrero") {
          if (hits === 0) sfxGolpeAire();
          else if (huboCrit) sfxGolpeCritico();
          else sfxImpactoGuerrero();
        } else if (esPicaro) {
          if (hits === 0) sfx("golpe");
          else if (huboCrit) sfxGolpeCritico();
          else sfxImpactoPicaro();
        }
        return hits;
      }

export const NIVEL_ULTI = 5;

export function aplicarImbuido(p, e) {
        const im = p.imbuido;
        if (!im) return;
        const t = statsTot(p);
        if (im === "fuego" && !e.dummy) {
          e.burnT = Math.max(e.burnT, 1.6);
          e.burnDps = Math.max(e.burnDps, t.atk * 0.25);
          e.burnOwner = p;
        } else if (im === "hielo") {
          e.slowT = Math.max(e.slowT, 0.9);
        } else if (im === "sagrado") {
          curarP(p, Math.max(1, Math.round(t.atk * 0.15)));
        } else if (im === "zarzas" && !e.dummy) {
          e.poisonT = Math.max(e.poisonT, 2);
          e.poisonDps = Math.max(e.poisonDps, t.atk * 0.2);
          e.poisonOwner = p;
        }
        // 'arcano' se aplica como multiplicador de daño en el propio golpe
      }

// Probabilidad de que un pilar/barril roto suelte un objeto Mítico -- una
// vía alternativa a la fusión legendaria, pensada para ser rarísima (el
// jugador rompe decenas de estos por partida, así que incluso un 1.5% se
// nota bastante a lo largo de 100 plantas sin sentirse garantizado en
// ninguna sesión corta). Valor a revisar en balanceo si hace falta.
const PROB_DROP_MITICO_ROTO = 0.015;

export function danoPilar(pl, dmg) {
        if (!pl.destructible || pl.hp <= 0) return;
        pl.hp -= Math.round(dmg);
        pl.hurtT = 0.15;
        // Pilares de hielo del Guardián: tintineo agudo en CADA golpe (no
        // solo al romperse), pedido expreso del usuario -- el resto de
        // pilares (mazmorra normal) se quedan mudos como hasta ahora.
        if (pl.hielo) sfx("hielo");
        if (pl.hp <= 0) {
          if (pl.hielo) {
            sfxRompeHielo();
            fxParticulas(pl.x, pl.y - 10, 18, "#bfe6f7");
          } else {
            fxParticulas(pl.x, pl.y - 10, 16, "#57496f");
          }
          G.shake = Math.max(G.shake, 3);
          // Sin decal de escombro mientras el Guardián de Hielo siga vivo en
          // la sala -- confirmado por Playwright (reproducido a propósito):
          // no basta con silenciar solo SUS pilares (pl.hielo), porque el
          // jefe se pasa toda la pelea deambulando por la sala entera
          // persiguiendo al jugador, así que tarde o temprano acaba de pie
          // junto al escombro de un pilar normal también, y esa sombra
          // (rgba(0,0,0,.3), ver el bucle de G.decals en render/world.js) se
          // confunde con una segunda sombra suya "flotando" detrás. Fuera de
          // esta sala, cualquier pilar normal conserva su escombro de
          // siempre.
          const jefeHieloVivo = G.enemigos.some(
            (en) => en.jefe && en.arquetipo === "hielo" && en.hp > 0,
          );
          if (!jefeHieloVivo) G.decals.push({ x: pl.x, y: pl.y });
          if (Math.random() < PROB_DROP_MITICO_ROTO)
            dropItem(pl.x, pl.y, genObjetoMitico(G.planta || 1));
          else if (Math.random() < 0.35)
            G.drops.push({
              tipo: "moneda",
              x: pl.x,
              y: pl.y,
              val: Math.max(1, Math.round(1 + G.planta * 0.2)),
            });
          if (pl.hielo) {
            // Deja la última fase (escombro) visible un momento en vez de
            // desaparecer del array en el mismo tick en que llega a 0 de
            // vida -- pedido expreso ("debería reproducirse al romperse"):
            // antes no daba tiempo a ver el resultado de la rotura.
            // render/world.js decrementa pl.rotoT cada frame (mismo patrón
            // que ya usa con pl.hurtT) y lo quita de G.pilares al llegar a
            // 0. La mecánica de "vulnerable de nuevo" no espera a esto (ver
            // core/loop.js: algunPilarVivo ya exige pl.hp > 0).
            pl.rotoT = 0.55;
          } else {
            const idx = G.pilares.indexOf(pl);
            if (idx >= 0) G.pilares.splice(idx, 1);
          }
          toast("¡Columna destruida!", "#9a93ab");
        }
      }

export function golpeObjeto(o, dmg) {
        if (o.tipo === "barril") {
          o.hp -= dmg;
          if (o.hp <= 0) {
            sfxRompeBarril();
            fxParticulas(o.x, o.y, 10, "#6b4a2c");
            if (Math.random() < PROB_DROP_MITICO_ROTO)
              dropItem(o.x, o.y, genObjetoMitico(G.planta || 1));
            else if (Math.random() < 0.55)
              G.drops.push({
                tipo: "moneda",
                x: o.x,
                y: o.y,
                val: Math.max(1, Math.round(1 + G.planta * 0.15)),
              });
            else if (Math.random() < 0.5)
              G.drops.push({ tipo: "vial", x: o.x, y: o.y });
            G.objetos.splice(G.objetos.indexOf(o), 1);
          }
        }
      }

// Botón de acción (E en teclado, click del stick izq. en mando -- ver
// systems/input.js): abre al instante un cofre cercano sin abrir. La
// detección de "hay un cofre cerca" corre cada frame en core/loop.js
// (p.cofreObj), que también es lo que usa render/world.js para dibujar el
// aviso de tecla sobre el cofre antes de pulsar nada.
export function interactuar(p) {
        if (p.atrapado || p.ko) return;
        const cofre = p.cofreObj;
        if (!cofre || cofre.abierto) {
          // sin cofre cerca: ¿hay un objeto (arma/armadura/accesorio) en el
          // suelo esperando a que lo recojan? A diferencia del oro/vial, que
          // se cogen solos al pisarlos, estos exigen este mismo botón (ver
          // p.dropObj en core/loop.js).
          const dr = p.dropObj;
          if (!dr) {
            // tampoco hay objeto que recoger: ¿una puerta secreta cerca sin
            // revelar? (ver p.secretoObj en core/loop.js). Revelarla no
            // cruza al momento -- el jugador tiene que volver a acercarse
            // y entrar, igual que cualquier otra puerta ya visible.
            const pu = p.secretoObj;
            if (!pu) {
              // tampoco hay puerta secreta: ¿un muro secreto INTERIOR
              // cerca? (ver p.secretoParedObj en core/loop.js -- una sala
              // como "arsenal" puede tener un tramo de muro que en
              // realidad es un paso oculto). A diferencia de la puerta
              // secreta, aquí se quita el muro directamente: no hace
              // falta "cruzar" nada porque es la misma sala.
              const muroSecreto = p.secretoParedObj;
              if (!muroSecreto) return;
              const idxMuro = G.muros.indexOf(muroSecreto);
              if (idxMuro < 0) return;
              G.muros.splice(idxMuro, 1);
              p.secretoParedObj = null;
              const cxMuro = muroSecreto.x + muroSecreto.w / 2,
                cyMuro = muroSecreto.y + muroSecreto.h / 2;
              fxOnda(cxMuro, cyMuro, 30, "#c084f0");
              fxParticulas(cxMuro, cyMuro, 14, "#c084f0");
              toast(p.nombre + " descubre un paso secreto en el muro", "#c084f0");
              return;
            }
            pu.oculta = false;
            p.secretoObj = null;
            fxOnda(pu.x, pu.y, 40, "#c084f0");
            fxParticulas(pu.x, pu.y, 14, "#c084f0");
            toast(p.nombre + " descubre una puerta secreta", "#c084f0");
            return;
          }
          const idx = G.drops.indexOf(dr);
          if (idx < 0) return;
          G.drops.splice(idx, 1);
          p.dropObj = null;
          p.bolsa.push(dr.item);
          sfx("moneda");
          toast(
            p.nombre +
              " recoge " +
              dr.item.nombre +
              " [" +
              RAREZAS[dr.item.rareza].n +
              "] — Tab/Start",
            RAREZAS[dr.item.rareza].col,
          );
          return;
        }
        cofre.abierto = true;
        cofre.abriendoT = 0.4; // duración del pop de apertura (ver world.js)
        p.cofreObj = null;
        fxOnda(cofre.x, cofre.y, 30, "#e9b45c");
        fxParticulas(cofre.x, cofre.y - 6, 12, "#e9b45c");
        if (cofre.qa) {
          // cofre de pruebas (?qa=1): suelta el set COMPLETO de Míticos de
          // golpe para poder probar los 6 efectos sin depender del RNG de
          // fusión -- ver systems/objetosMiticos.js
          OBJETOS_MITICOS.forEach((tpl, i) => {
            const ang = (i / OBJETOS_MITICOS.length) * TAU;
            const pv = posDropValida(
              cofre.x + Math.cos(ang) * 40,
              cofre.y + Math.sin(ang) * 40,
            );
            const item = genObjetoMitico(G.planta || 1, tpl.slot);
            item.nombre = tpl.nombre; // set completo, no uno al azar por slot
            item.efecto = tpl.efecto;
            item.efectoDesc = tpl.efectoDesc;
            dropItem(pv.x, pv.y, item);
          });
          toast("🧪 Cofre de pruebas: set Mítico completo", "#ff5a36");
          // set completo de Fragmentos de Alma (uno de cada tipo del
          // catálogo, ver systems/soul.js) + puntos y oro de sobra para
          // poder desbloquear casillas y probar la rejilla sin grindear.
          FRAGMENTOS_CATALOGO.forEach((frag, i) => {
            META.alma.inventario.push({
              uid: "qa" + Date.now().toString(36) + i,
              fragId: frag.id,
            });
          });
          META.alma.puntos += 20;
          META.oro += 2000;
          guardarMeta();
          toast("🔮 Cofre de pruebas: set de Fragmentos de Alma + 20 puntos + 2000 🪙", "#c9a35a");
          return;
        }
        const pv1 = posDropValida(cofre.x, cofre.y - 14);
        dropItem(pv1.x, pv1.y, genItem(G.planta || 1));
        const pv2 = posDropValida(cofre.x + 14, cofre.y);
        G.drops.push({
          tipo: "moneda",
          x: pv2.x,
          y: pv2.y,
          val: Math.max(2, Math.round(3 + G.planta * 0.25)),
        });
        toast("🪙 ¡Cofre abierto!", "#e9b45c");
      }

// Efecto único de la Espada-Pistola (ver systems/objetosMiticos.js): un
// ataque a distancia que no reemplaza ni interrumpe el combo melé normal --
// tecla propia (R), cooldown aparte del resto de habilidades.
export function disparoSecundario(p) {
        if (p.ko || p.atrapado || !tieneEfecto(p, "disparo_secundario")) return;
        if (p.disparoCd > 0) return;
        p.disparoCd = 3;
        const t = statsTot(p);
        sfx("flecha");
        G.projs.push({
          owner: "p",
          duenio: p,
          x: p.x + Math.cos(p.aim) * 16,
          y: p.y + Math.sin(p.aim) * 16,
          vx: Math.cos(p.aim) * 620,
          vy: Math.sin(p.aim) * 620,
          r: 4,
          dmg: Math.round(t.atk * 0.8),
          tipo: "flecha",
          color: "#ff5a36",
          ttl: 1.2,
          pierce: 2,
        });
      }

// silencioso: se salta el sintetizado de sfx() -- lo usa TODO disparo del
// arquero (dispararFlechaCargada pone su propio sfxDisparoArco real
// encima, cargado o no) y el lanzamiento cargado del pícaro
// (lanzarCuchillo, reutiliza sfxDisparoArco).
function dispararProy(p, dir, dmg, tipo, color, v, silencioso) {
        if (silencioso) {
          // nada -- el llamador decide su propio sonido
        } else if (tipo === "flecha") sfx("flecha");
        else if (tipo === "bola") sfx("fuego");
        else if (tipo === "carambano") sfx("hielo");
        else if (tipo === "orbeArc") sfx("magia");
        else if (tipo === "rama") sfx("flecha");
        else if (tipo === "cuchillo") sfx("cuchillo");
        const pr = {
          owner: "p",
          duenio: p,
          x: p.x + Math.cos(dir) * 16,
          y: p.y + Math.sin(dir) * 16,
          vx: Math.cos(dir) * v,
          vy: Math.sin(dir) * v,
          r: 4,
          dmg,
          tipo,
          color,
          ttl: 1.6,
        };
        if (tipo === "flecha" && p._pierceProy > 0) pr.pierce = p._pierceProy;
        G.projs.push(pr);
      }

// Duración mínima (ms) que el tensado del arco debe sonar antes de dejar
// que un disparo lo corte -- un toque MUY corto (p.cargaArqT casi 0)
// paraba el sonido casi al arrancar, tan rápido que en la práctica no se
// llegaba a oír: el disparo sonaba solo, sin el tensado antes ("el
// ataque básico no reproduce el charge"). El daño/disparo en sí sigue
// saliendo al instante siempre -- esto SOLO retrasa cuándo se corta el
// sonido, no ninguna lógica de juego.
const TENSADO_MIN_AUDIBLE_MS = 150;
function cortarTensado(p) {
  if (!p._cargaSrc) return;
  const llevaMs = performance.now() - (p._cargaSrcT0 || 0);
  if (llevaMs >= TENSADO_MIN_AUDIBLE_MS) p._cargaSrc.stop();
  p._cargaSrc = null;
}

// Soltar el disparo cargado del arquero (ver p.cargaArqT en core/loop.js:
// update(), mismo patrón que dispararArcano() del mago con p.cargaT).
// p.cargaArqT ya viene en SEGUNDOS mantenidos, no normalizado -- se
// resetea aquí, antes de cualquier `return` (soltar dos veces seguidas
// sin recargar no debe repetir el disparo). Flecha Certera (proc
// existente) tiene prioridad sobre la carga: si está lista, se dispara
// igual que siempre pase lo que pase con la carga acumulada.
export function dispararFlechaCargada(p) {
        cortarTensado(p);
        const carga = p.cargaArqT || 0;
        p.cargaArqT = 0;
        if (p.atkCd > 0) return;
        const t = statsTot(p);
        p.atkCd = (0.3 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
        p.swingT = 0.3;
        const dmgFle = t.atk * (p.imbuido === "arcano" ? 1.15 : 1);
        if (p.certera) {
          p.certera = false;
          dispararProy(p, p.aim, dmgFle * 2, "flecha", "#ffd27f", 560, true);
          const pr = G.projs[G.projs.length - 1];
          pr.pierce = (pr.pierce || 0) + 2;
          pr.certera = true;
          fxOnda(p.x, p.y, 20, "#ffd27f");
          sfxDisparoArco();
          return;
        }
        // "silencioso" en las dos ramas de abajo: dispararProy() ya no
        // pone el "flecha" sintetizado de sfx() en NINGÚN disparo del
        // arquero, cargado o toque corto -- el real (sfxDisparoArco) de
        // aquí abajo lo sustituye siempre.
        const cargado = carga >= CARGA_ARQ_UMBRAL;
        const enZona = cargado && carga >= CARGA_ARQ_ZONA[0] && carga <= CARGA_ARQ_ZONA[1];
        dispararProy(
          p,
          p.aim,
          dmgFle,
          "flecha",
          cargado ? "#ffd27f" : "#e9e3d5",
          cargado ? 560 : 480,
          true,
        );
        const pr = G.projs[G.projs.length - 1];
        if (cargado) {
          pr.pierce = 2 + (p._pierceProy || 0); // "de forma estándar" -- escalable por p._pierceProy (tarjetas/equipo)
          pr.critBonus = enZona ? 40 : 15;
          pr.cargada = true;
          fxOnda(p.x, p.y, enZona ? 20 : 14, "#ffd27f");
        }
        sfxDisparoArco();
      }

// Cuchillo arrojado del pícaro: mismo patrón de carga que el disparo del
// arquero de arriba (p.cargaCuchT, ver el bloque "picaro" en
// core/loop.js:update() y p.inp.lanzarHeld en systems/input.js -- Mayús
// mantenida). Tecla y cooldown PROPIOS (p.cuchilloCd): no sustituye al
// golpe de daga normal (p.atkCd, golpeArco) ni a Esquivar/Estocada, es
// una herramienta nueva y aparte.
export const CARGA_CUCH_MAX = 0.9;
export const CARGA_CUCH_UMBRAL = 0.2;
export const CARGA_CUCH_ZONA = [0.5, 0.8];

export function lanzarCuchillo(p) {
        if (p.rol !== "picaro") return;
        // A diferencia del arquero, el cargado del cuchillo (ver
        // sfxCargaCuchillo en core/loop.js) es un solo disparo sintetizado
        // corto, no una muestra real que haya que cortar a mano -- se
        // apaga solo, mucho antes de CARGA_CUCH_UMBRAL.
        const carga = p.cargaCuchT || 0;
        p.cargaCuchT = 0;
        if (p.cuchilloCd > 0) return;
        const t = statsTot(p);
        p.cuchilloCd = 1.5; // ver el mismo valor en render/hud.js (icono de cooldown, "⇧")
        p.swingT = Math.max(p.swingT, 0.15);
        if (carga < CARGA_CUCH_UMBRAL) {
          dispararProy(p, p.aim, t.atk * 0.8, "cuchillo", "#d8d8e0", 520);
          return;
        }
        const enZona = carga >= CARGA_CUCH_ZONA[0] && carga <= CARGA_CUCH_ZONA[1];
        dispararProy(p, p.aim, t.atk * 0.8, "cuchillo", "#ffd27f", 620, true);
        const pr = G.projs[G.projs.length - 1];
        pr.pierce = 2 + (p._pierceProy || 0);
        pr.critBonus = enZona ? 40 : 15;
        pr.cargada = true;
        fxOnda(p.x, p.y, enZona ? 20 : 14, "#ffd27f");
        sfxDisparoArco(); // mismo golpe de soltar que el arquero, ver dispararFlechaCargada
      }

function crearArea(x, y, r, elemento, mult, duenio) {
        const el = ELEMENTOS[elemento];
        const rFinal =
          r * (duenio && duenio._areaRadMult ? duenio._areaRadMult : 1);
        const ttlFinal =
          el.ttl * (duenio && duenio._areaDurMult ? duenio._areaDurMult : 1);
        G.areas.push({
          clase: "elem",
          x,
          y,
          r: rFinal,
          elemento,
          mult: mult || 1,
          duenio,
          ttl: ttlFinal,
          tick: 0,
          nace: 0.15,
        });
        fxOnda(x, y, rFinal, el.color);
      }

export function habilidad(p) {
        const t = statsTot(p),
          sk = ROLES[p.rol].skill;
        if (p.nivel < NIVEL_ULTI) {
          fxTexto(p.x, p.y - 24, "🔒 ulti al nivel " + NIVEL_ULTI, "#9a93ab");
          return;
        }
        if (p.skillCd > 0) return;
        if (p.res < sk.coste) {
          fxTexto(
            p.x,
            p.y - 24,
            "sin " + ROLES[p.rol].resNombre.toLowerCase(),
            "#9a93ab",
          );
          return;
        }
        p.res -= sk.coste;
        sfx("ulti");
        const cdMult = (1 - t.cdr / 100) * (p._ultCdMult || 1);
        p.skillCd = sk.cd * cdMult;
        function lanzarUlti() {
          if (p.rol === "guerrero") {
            fxOnda(p.x, p.y, 84, "#e9b45c");
            p.swingT = 0.22;
            for (const e of G.enemigos) {
              if (e.hp <= 0) continue;
              if (Math.hypot(e.x - p.x, e.y - p.y) < 84 + e.r) {
                const a = Math.atan2(e.y - p.y, e.x - p.x);
                danoAEnemigo(
                  e,
                  t.atk * 1.7,
                  p,
                  true,
                  Math.cos(a) * 220,
                  Math.sin(a) * 220,
                );
              }
            }
          } else if (p.rol === "arquero") {
            for (let i = -2; i <= 2; i++)
              dispararProy(
                p,
                p.aim + i * 0.16,
                t.atk * 0.9,
                "flecha",
                "#e9e3d5",
                480,
              );
          } else if (p.rol === "mago") {
            const g = groundTarget(p, 300);
            if (p.elemento === "fuego") {
              // zona que quema durante un tiempo breve
              crearArea(g.x, g.y, 95, "fuego", 2, p);
              fxOnda(g.x, g.y, 95, "#ff7d4d");
            } else if (p.elemento === "hielo") {
              // ralentización masiva en área
              crearArea(g.x, g.y, 110, "hielo", 1.5, p);
              fxOnda(g.x, g.y, 110, "#7fc9e8");
              fxOnda(g.x, g.y, 70, "#cfe4ff");
              for (const e of G.enemigos) {
                if (e.hp <= 0 && !e.dummy) continue;
                if (Math.hypot(e.x - g.x, e.y - g.y) < 110 + e.r) {
                  e.slowT = Math.max(e.slowT, 2.5);
                  fxParticulas(e.x, e.y, 4, "#7fc9e8");
                }
              }
            } else {
              // PORTAL ARCANO: los enemigos caen y reaparecen arriba con daño de caída
              sfx("portal");
              fxOnda(g.x, g.y, 90, "#c084f0");
              fxOnda(g.x, g.y, 55, "#e0c0ff");
              fxParticulas(g.x, g.y, 20, "#c084f0");
              G.areas.push({
                clase: "malArea",
                x: g.x,
                y: g.y,
                r: 90,
                ttl: 0.6,
                tick: 99,
                nace: 0.1,
                dps: 0,
                color: "#c084f0",
              });
              let tragados = 0;
              for (const e of G.enemigos) {
                if ((e.hp <= 0 && !e.dummy) || e.dummy) continue;
                if (Math.hypot(e.x - g.x, e.y - g.y) < 90 + e.r) {
                  if (e.jefe) {
                    // los jefes resisten el portal: solo daño parcial
                    danoAEnemigo(e, t.atk * 1.4, p, true);
                    fxTexto(e.x, e.y - e.r - 8, "¡resiste!", "#c084f0");
                  } else {
                    e.portalT = 0.7;
                    e.portalX = e.x;
                    e.portalDmg = t.atk * 2.2;
                    e.portalOwner = p;
                    fxParticulas(e.x, e.y, 8, "#c084f0");
                    tragados++;
                  }
                }
              }
              if (tragados > 0)
                fxTexto(
                  g.x,
                  g.y - 20,
                  "¡" + tragados + " tragado" + (tragados > 1 ? "s" : "") + "!",
                  "#c084f0",
                  true,
                );
            }
            G.shake = Math.max(G.shake, 4);
          } else if (p.rol === "picaro") {
            // Danza de Cuchillas: atraviesa 190px en línea, daña todo en el camino
            const dist = 190;
            const x0 = p.x,
              y0 = p.y;
            let x1 = clamp(p.x + Math.cos(p.aim) * dist, 28, W - 28);
            let y1 = clamp(p.y + Math.sin(p.aim) * dist, 28, H - 28);
            for (const e of G.enemigos) {
              if (e.hp <= 0 && !e.dummy) continue;
              // distancia del enemigo al segmento
              const dx = x1 - x0,
                dy = y1 - y0,
                len2 = dx * dx + dy * dy || 1;
              let u = ((e.x - x0) * dx + (e.y - y0) * dy) / len2;
              u = clamp(u, 0, 1);
              const px2 = x0 + u * dx,
                py2 = y0 + u * dy;
              if (Math.hypot(e.x - px2, e.y - py2) < 30 + e.r) {
                danoAEnemigo(
                  e,
                  t.atk * 1.6,
                  p,
                  true,
                  Math.cos(p.aim) * 180,
                  Math.sin(p.aim) * 180,
                );
              }
            }
            for (let k = 0; k < 5; k++)
              fxTajo(
                x0 + ((x1 - x0) * k) / 4,
                y0 + ((y1 - y0) * k) / 4,
                p.aim,
                26,
              );
            p.x = x1;
            p.y = y1;
            p.invulT = 0.5;
            p.trail.push({ x: x0, y: y0, t: 0.25 });
            G.shake = Math.max(G.shake, 3);
          } else if (p.rol === "druida") {
            const g = groundTarget(p, 280);
            crearArea(g.x, g.y, 100, "zarzas", 1.6, p);
            G.shake = Math.max(G.shake, 3);
          } else {
            crearArea(p.x, p.y, 105, "sagrado", 1.6, p);
          }
        }
        lanzarUlti();
        if (p._doubleUlti) {
          // segunda ejecución con pequeño delay visual
          G.fx.push({
            tipo: "txt",
            x: p.x,
            y: p.y - 44,
            txt: "×2",
            col: "#e9b45c",
            t: 0.9,
            t0: 0.9,
            grande: true,
          });
          setTimeout(() => {
            if (G && G.activo) lanzarUlti();
          }, 220);
        }
      }

export function castSup(p, i) {
        if (p.rol !== "clerigo") return;
        const s = SUPS[i],
          t = statsTot(p);
        if (p.supCd[i] > 0) return;
        if (p.res < s.coste) {
          fxTexto(p.x, p.y - 24, "sin maná", "#9a93ab");
          return;
        }
        p.res -= s.coste;
        p.supCd[i] = s.cd * (1 - t.cdr / 100);
        if (i === 0) {
          // área de sanación
          const g = groundTarget(p, 240);
          const healMult = p._healBonus || 1;
          G.areas.push({
            clase: "sanar",
            x: g.x,
            y: g.y,
            r: 64,
            duenio: p,
            ttl: 3,
            tick: 0,
            nace: 0.15,
            healMult,
          });
          fxOnda(g.x, g.y, 64, SUPS[0].color);
        } else if (i === 1) {
          // ímpetu
          for (const q of vivos())
            if (Math.hypot(q.x - p.x, q.y - p.y) < 130) {
              q.hasteT = 5;
              fxTexto(q.x, q.y - 30, "ÍMPETU", "#e9b45c");
            }
          fxOnda(p.x, p.y, 130, SUPS[1].color);
        } else {
          // égida
          const egidaMult = p._egidaBonus || 1;
          for (const q of vivos())
            if (Math.hypot(q.x - p.x, q.y - p.y) < 150) {
              const hm = statsTot(q).hpMax;
              q.escudo = Math.min(
                q.escudo + Math.round(hm * 0.18 * egidaMult),
                Math.round(hm * 0.5),
              );
              fxTexto(q.x, q.y - 30, "ÉGIDA", "#8fb8e8");
            }
          fxOnda(p.x, p.y, 150, SUPS[2].color);
        }
      }

export function esquivar(p) {
        // atrapado en arenas: el botón de esquive es el QTE de escape
        if (p.atrapado) {
          const enVentana = p.qteT >= 0.6 && p.qteT <= 0.85;
          if (enVentana) {
            p.qteHits++;
            fxOnda(p.x, p.y, 20 + p.qteHits * 8, "#7fd4c1");
            fxTexto(p.x, p.y - 30, "¡" + p.qteHits + "/3!", "#7fd4c1", true);
          } else {
            fxTexto(p.x, p.y - 30, "fallo…", "#9a93ab");
          }
          return;
        }
        // enraizado por telaraña: el esquive la rompe (cuesta el dash)
        if (p.rootT > 0) {
          if (p.dashCd > 0 || p.res < 18) return;
          p.res -= 18;
          p.rootT = 0;
          p.dashCd = 0.7;
          fxParticulas(p.x, p.y, 8, "#e8e0d0");
          fxTexto(p.x, p.y - 30, "¡libre!", "#7fd4c1");
          return;
        }
        if (p.dashCd > 0 || p.res < 18) return;
        p.res -= 18;
        let dx = p.inp ? p.inp.mx : 0,
          dy = p.inp ? p.inp.my : 0;
        if (dx === 0 && dy === 0) {
          dx = Math.cos(p.aim);
          dy = Math.sin(p.aim);
        }
        const n = Math.hypot(dx, dy) || 1;
        p.dashX = dx / n;
        p.dashY = dy / n;
        const durDash = p.rol === "picaro" ? 0.26 : 0.2;
        p.dashT = durDash;
        p.dashCd = 0.7;
        p.invulT = durDash + 0.04 + (tieneEfecto(p, "sombras") ? 0.5 : 0);
        p._dashVictims = p._dashDmg ? new Set() : null;
      }

// Estocada: habilidad secundaria NUEVA del guerrero (tecla propia, Mayús/R3
// -- ver systems/input.js), aparte de Esquivar. A diferencia de Esquivar
// (reposicionamiento defensivo, invulnerable, sin daño) esto es una
// embestida ofensiva: recorre terreno en línea recta y daña una vez a cada
// enemigo que atraviesa (mismo patrón que el efecto "Sombra Letal" del
// esquive normal, ver p._dashVictims en core/loop.js), pero SIN
// invulnerabilidad -- son dos herramientas distintas, no un reskin. Propio
// cooldown/coste, no comparte el del esquive.
export function dashAtaque(p) {
        if (p.rol !== "guerrero") return;
        if (p.ko || p.atrapado || p.rootT > 0) return;
        if (p.dashAtkCd > 0 || p.dashT > 0 || p.dashAtkT > 0) return;
        if (p.res < 22) {
          fxTexto(p.x, p.y - 24, "sin aguante", "#9a93ab");
          return;
        }
        p.res -= 22;
        let dx = p.inp ? p.inp.mx : 0,
          dy = p.inp ? p.inp.my : 0;
        if (dx === 0 && dy === 0) {
          dx = Math.cos(p.aim);
          dy = Math.sin(p.aim);
        }
        const n = Math.hypot(dx, dy) || 1;
        p.dashAtkX = dx / n;
        p.dashAtkY = dy / n;
        p.dashAtkT = 0.28; // ver DASH_ATTACK_DUR.guerrero en render/sprites.js -- mismo valor
        p.dashAtkCd = 2.2;
        p._dashAtkVictims = new Set();
        // Sin "espadazo" sintetizado al arrancar (mismo criterio que
        // golpeArco, ver comentario ahí) -- el sonido real de impacto/fallo
        // se decide en core/loop.js cuando la embestida termina, según si
        // conectó con algo y si hubo crítico (ver p._dashAtkCrit).
        p._dashAtkCrit = false;
        fxOnda(p.x, p.y, 18, "#e9b45c");
      }

export function activarParry(p) {
        if (p.parryCd > 0) return;
        p.parryT = 0.18;
        p.parryCd = 0.9;
      }

export function transformar(p, idx) {
        if (p.rol !== "druida" || p.formCd > 0) return;
        const destino = FORMAS_DRUIDA[idx];
        if (p.forma === destino) {
          p.forma = "humano";
          p.formCd = 0.6;
          fxOnda(p.x, p.y, 34, "#6ac04a");
          fxParticulas(p.x, p.y, 8, "#6ac04a");
          fxTexto(p.x, p.y - 32, "🌿 humano", "#6ac04a");
          return;
        }
        if (p.res < 20) {
          fxTexto(p.x, p.y - 24, "sin naturaleza", "#9a93ab");
          return;
        }
        p.res -= 20;
        p.forma = destino;
        p.formCd = 0.8;
        const fi = FORMAS_INFO[destino];
        fxOnda(p.x, p.y, 44, fi.color);
        fxOnda(p.x, p.y, 26, "#6ac04a");
        fxParticulas(p.x, p.y, 14, fi.color);
        fxTexto(p.x, p.y - 34, fi.ico + " " + fi.nombre, fi.color, true);
        // Vínculo Salvaje: transformarse cura
        if (p._formHeal > 0)
          curarP(p, Math.round(statsTot(p).hpMax * p._formHeal));
        // el cambio de forma puede reducir stats: ajustar hp al máximo actual
        p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
      }

export function dispararArcano(p) {
        const t = statsTot(p);
        const c = clamp(p.cargaT / 1.1, 0, 1);
        p.cargaT = 0;
        if (p.castCd > 0) return;
        if (p.res < 12) {
          fxTexto(p.x, p.y - 24, "sin maná", "#9a93ab");
          return;
        }
        p.res -= 12;
        p.castCd = (0.5 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
        const vel = 170 + c * 310; // sin carga: lentísimo
        const dmg = t.atk * (1.5 + c * 1.9); // más daño base que fuego/hielo, brutal cargado
        dispararProy(p, p.aim, dmg, "orbeArc", "#c084f0", vel);
        const pr = G.projs[G.projs.length - 1];
        pr.r = 4 + c * 7;
        pr.ttl = 2.2;
        pr.carga = c;
        if (c > 0.85) pr.pierce = (pr.pierce || 0) + 1; // a plena carga atraviesa un enemigo
        fxOnda(p.x, p.y, 16 + c * 22, "#c084f0");
        if (c > 0.85) G.shake = Math.max(G.shake, 2);
      }

export function cicloElem(p, d) {
        const i =
          (ELEM_MAGO.indexOf(p.elemento) + ELEM_MAGO.length + d) %
          ELEM_MAGO.length;
        p.elemento = ELEM_MAGO[i];
      }
