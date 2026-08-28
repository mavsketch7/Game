// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W } from "./canvas.js";
import { ELEMENTOS, MAX_PLANTA, RAREZAS, ROLES, SALA_H, SALA_W, XP_POR_PLANTA } from "./constants.js";
import { iniciarLobby } from "./gameflow.js";
import { META } from "./save.js";
import { G } from "./state.js";
import { NET, netAplicarInputs } from "../net/peer.js";
import { fxOnda, fxParticulas, fxTexto } from "../render/effects.js";
import { CARGA_ARQ_MAX, CARGA_ARQ_ZONA, CARGA_CUCH_MAX, CARGA_CUCH_ZONA, actualizarSendaElemental, aplicarImbuido, atacar, danoPilar, dispararArcano, dispararFlechaCargada, golpeObjeto, lanzarCuchillo } from "../systems/abilities.js";
import { sfx, sfxAterrizaje, sfxCargaCuchillo, sfxCargaLista, sfxGolpeAire, sfxGolpeCritico, sfxImpactoGuerrero, sfxImpactoProyectil, sfxPaso, sfxTensarArco } from "../systems/audio.js";
import { esJefe, escalaEnemigo } from "../systems/bosses.js";
import { curarP, danoAEnemigo, danoAlJugador, explotarBomber, ganarXP, masCercano, matarEnemigo, spawnClon, spawnEnemigo, statsTot, tipoAleatorio, vivos } from "../systems/combat.js";
import { JUICE, actualizarEstilo } from "../systems/juice.js";
import { RADIO_HOGUERA_JEFE, aplicarLimites, colisionaMuro, cruzarPuerta, dentroForma, iniciarPlanta, ponPilares, salaActual } from "../systems/floorgen.js";
import { leerInput } from "../systems/input.js";
import { actualizarNavegacion, obtenerRumbo } from "../systems/navegacion.js";
import { finPartida, plantaDespejada } from "../systems/loot.js";
import { abrirCartasParaJugador } from "../ui/cardsOverlay.js";
import { banner, toast } from "../ui/notifications.js";
import { abrirArenaPvp } from "../ui/pvp.js";
import { abrirTienda } from "../ui/shop.js";
import { abrirSkins } from "../ui/skins.js";
import { abrirYunque } from "../ui/workbench.js";
import { az, clamp, rnd } from "../utils/helpers.js";

// Cooldowns simples que decrecen linealmente con dt cada frame para cada
// jugador vivo -- hoisted fuera de update() para no crear un array nuevo
// por jugador y por frame.
const CDS_LINEALES = [
  "atkCd",
  "castCd",
  "skillCd",
  "dashCd",
  "dashAtkCd",
  "cuchilloCd",
  "disparoCd",
  "invulT",
  "parryT",
  "parryCd",
  "golpeT",
  "swingT",
  "hasteT",
  "castUltT",
  "sendaT",
  "sendaCd",
];

// Flechas clavadas (detalle de impacto: la flecha se queda incrustada en
// el muro o en el enemigo un rato en vez de desaparecer sin más al
// golpear, ver los dos sitios de spawn en el bucle de proyectiles más
// abajo). G.flechasClavadas es SOLO decorativo -- no colisiona, no hace
// daño, no se sincroniza por red (mismo criterio que el resto de FX
// puramente visuales que no necesitan estar exactos entre anfitrión e
// invitado). MAX_FLECHAS_CLAVADAS acota cuántas hay a la vez (el "límite
// de flechas" pedido, en vez de un tiempo de vida corto): al pasarse del
// límite se quita la más antigua, así no hace falta vaciar el array ni
// tocar nada al cargar el juego.
const MAX_FLECHAS_CLAVADAS = 24;

// Radio de colisión sólida de un barril (16x22 en pantalla, ver
// render/world.js) -- antes era puramente decorativo (sin colisión
// ninguna, ni contra jugadores ni contra enemigos), pedido expreso del
// usuario: "son objetos sólidos". Compartido por jugador/enemigos/jefe
// para no repetir el número en cada sitio.
const BARRIL_R = 7;
const FLECHA_CLAVADA_VIDA = 5;
function agregarFlechaClavada(entry) {
  G.flechasClavadas.push(entry);
  if (G.flechasClavadas.length > MAX_FLECHAS_CLAVADAS) G.flechasClavadas.shift();
}

// Guardián de Hielo (primer jefe real, planta 5 -- ver systems/floorgen.js
// para el spawn, render/character.js para el sprite): al cruzar cada
// umbral de vida caen `n` pilares de hielo (ver ponPilares() en
// systems/floorgen.js, ya reutilizable tal cual en pleno combate) y
// aparecen un par de mobs. Mientras alguno de esos pilares siga en pie,
// el jefe se regenera -- e.hpTopeFase evita que la regeneración
// recupere más allá del punto en que se cruzó el umbral (nunca deshace
// daño ya hecho ANTES de esta fase, solo el de la fase actual si se
// tarda demasiado en romper los pilares).
function iniciarFaseHielo(e, n) {
  ponPilares(G.planta, n);
  const nuevos = G.pilares.slice(-n);
  const hpPilar = 70 + G.planta * 3;
  nuevos.forEach((pl) => {
    pl.hielo = true;
    // ponPilares() sortea destructible al ~55% -- estos SIEMPRE tienen
    // que poder romperse (si no, la fase queda imposible de superar y el
    // jefe se regenera para siempre).
    pl.destructible = true;
    pl.hp = hpPilar;
    pl.hpMax = hpPilar;
  });
  e.pilaresFase = nuevos;
  e.regenerando = true;
  e.hpTopeFase = e.hp;
  // Antes fijo (2/3 según planta), sin mirar cuántos jugadores hay -- con
  // un grupo de 4 apenas se notaba. Escalado a la party, igual que ya
  // escala el HP del jefe (multCoop en systems/combat.js): con la IA de
  // enjambre (calcularRumboEnjambre) estos mobs ya rodean y flanquean
  // solos, así que más mobs es presión real, no un montón amontonado.
  const nMobs = 1 + G.players.length;
  for (let k = 0; k < nMobs; k++) spawnEnemigo(G.planta, tipoAleatorio(G.planta), false);
  fxOnda(e.x, e.y, 70, "#7fc9e8");
  fxParticulas(e.x, e.y, 18, "#bfe6f7");
  G.shake = Math.max(G.shake, 5);
  banner("¡El Guardián de Hielo invoca " + n + " pilares de hielo!");
}

// Enjambre "pensante": combina el flow field (rodea muros/pilares, ver
// systems/navegacion.js) con separación entre enemigos y un ángulo de
// flanqueo fijo por enemigo (e.anguloFlanqueo, asignado al nacer en
// combat.js: spawnEnemigo) para que un grupo no se apile en un punto ni
// ataque todos en fila. Devuelve solo el ÁNGULO para las líneas
// "caminar hacia el objetivo" de cada arquetipo -- el apuntado de
// ataques/proyectiles, el kiting de retirada y los checks de rango
// siguen usando `dir`/`d` (línea recta real, adyacencia física), sin
// tocar. Los jefes (e.jefe) no flanquean -- deben ir derechos a rango
// de golpe, no orbitar; sí se benefician del rodeo de muros/pilares y
// de la separación (para no atravesarse con mobs invocados).
const RADIO_COMPROMISO = 200;
const HOLGURA_LINEA_LIBRE = 50;
const RADIO_SEPARACION = 40;
const LIMITE_ENEMIGOS_SEPARACION = 40;
const MARGEN_OBSTACULO_STEER = 24;

function calcularRumboEnjambre(e, obj, d, dt) {
  const rumbo = obtenerRumbo(e.x, e.y);
  let dirBase;
  if (rumbo.ang === null) {
    // sin celda/ruta conocida: línea recta de toda la vida como red de
    // seguridad -- nunca debe congelarse por un fallo del pathfinding.
    dirBase = Math.atan2(obj.y - e.y, obj.x - e.x);
  } else if (
    !e.jefe &&
    d < RADIO_COMPROMISO &&
    rumbo.dist - d < HOLGURA_LINEA_LIBRE
  ) {
    // cerca y sin muro real de por medio (el propio flow field ya dice
    // que el camino mide casi lo mismo que la línea recta): en vez de
    // ir directo al jugador, cada enemigo va a un punto a su alrededor
    // en su ángulo de flanqueo, que gira lento -- así rodean en vez de
    // apilarse en fila.
    e.anguloFlanqueo = (e.anguloFlanqueo || 0) + dt * 0.2;
    const radio = obj.r + e.r + 20;
    const tx = obj.x + Math.cos(e.anguloFlanqueo) * radio;
    const ty = obj.y + Math.sin(e.anguloFlanqueo) * radio;
    dirBase = Math.atan2(ty - e.y, tx - e.x);
  } else {
    dirBase = rumbo.ang;
  }

  // Rodeo de pilares "pegados": la rejilla del flow field solo infla
  // pilares un margen fijo pequeño (ver systems/navegacion.js -- pensado
  // para el enemigo más pequeño), así que un enemigo grande (jefe,
  // minijefe, tank) puede tocar el borde real de colisión (pl.r+e.r)
  // mucho antes de que la rejilla lo considere "bloqueado", y dirBase
  // sigue apuntando casi al centro. Un simple empuje de repulsión ahí se
  // anula casi del todo contra ese rumbo (probado con el jefe, r=58: se
  // queda "empatado" pegado al borde sin apenas avance tangencial). En
  // vez de recalcular un desvío desde cero cada frame (el ruido
  // numérico cerca del punto de contacto puede alternar de lado y dejar
  // un avance tangencial neto ~0), se detecta el contacto UNA vez y se
  // camina en tangente a su borde en un sentido FIJO durante todo el
  // contacto (elegido al empezar, hacia el lado más corto para llegar
  // al objetivo) -- garantiza progreso angular real cada frame en vez
  // de forcejear. Se suelta solo en cuanto deja de estar pegado a ESE
  // pilar (el flow field ya tira de él hacia fuera en cuanto hay hueco).
  let pilarPegado = null;
  for (const pl of G.pilares) {
    if (Math.hypot(e.x - pl.x, e.y - pl.y) < pl.r + e.r + 4) {
      pilarPegado = pl;
      break;
    }
  }
  if (pilarPegado) {
    if (e._rodeoPilar !== pilarPegado) {
      e._rodeoPilar = pilarPegado;
      const angRadial = Math.atan2(e.y - pilarPegado.y, e.x - pilarPegado.x);
      const angObjetivo = Math.atan2(obj.y - pilarPegado.y, obj.x - pilarPegado.x);
      let diff = angObjetivo - angRadial;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      e._rodeoSigno = diff >= 0 ? 1 : -1;
    }
    const angRadial = Math.atan2(e.y - pilarPegado.y, e.x - pilarPegado.x);
    dirBase = angRadial + (Math.PI / 2) * e._rodeoSigno;
  } else {
    e._rodeoPilar = null;
  }

  // Separación: nudge aditivo lejos de enemigos cercanos, no un
  // comportamiento aparte -- así el enemigo sigue avanzando aunque le
  // empujen. Se salta con salas muy pobladas (?qa=1, ~100 enemigos)
  // donde no se nota visualmente y sí en rendimiento.
  let sepX = 0,
    sepY = 0;
  if (G.enemigos.length <= LIMITE_ENEMIGOS_SEPARACION) {
    for (const otro of G.enemigos) {
      if (otro === e || otro.hp <= 0) continue;
      const dx = e.x - otro.x,
        dy = e.y - otro.y;
      const dd = Math.hypot(dx, dy);
      const radioMin = e.r + otro.r + RADIO_SEPARACION;
      if (dd > 0 && dd < radioMin) {
        const peso = (radioMin - dd) / radioMin;
        sepX += (dx / dd) * peso;
        sepY += (dy / dd) * peso;
      }
    }
  }

  // Repulsión de muros cercanos: la rejilla del flow field solo infla
  // los obstáculos un margen fijo pequeño (ver systems/navegacion.js --
  // calibrado para el enemigo más pequeño), así que un enemigo grande
  // (jefe, minijefe, tank) puede recibir una dirección que en realidad
  // apunta dentro de su propio cuerpo cerca de un muro. Empuje radial
  // simple (a diferencia de los pilares, aquí no se ha observado el
  // "empate" -- un rectángulo grande no tiene un único centro que anule
  // el rumbo igual que un círculo).
  let obsX = 0,
    obsY = 0;
  for (const m of G.muros || []) {
    const cx = clamp(e.x, m.x, m.x + m.w);
    const cy = clamp(e.y, m.y, m.y + m.h);
    const dx = e.x - cx,
      dy = e.y - cy;
    const dd = Math.hypot(dx, dy);
    const radioMin = e.r + MARGEN_OBSTACULO_STEER;
    if (dd > 0 && dd < radioMin) {
      const peso = (radioMin - dd) / radioMin;
      obsX += (dx / dd) * peso;
      obsY += (dy / dd) * peso;
    }
  }

  const vx = Math.cos(dirBase) + sepX * 0.8 + obsX * 1.3;
  const vy = Math.sin(dirBase) + sepY * 0.8 + obsY * 1.3;
  return vx === 0 && vy === 0 ? dirBase : Math.atan2(vy, vx);
}

export function update(dt) {
        if (NET.modo === "host") netAplicarInputs();
        G.stats.tiempo += dt;
        const N = G.players.length;

        // jugadores
        for (const p of G.players) {
          // los jugadores 'net' ya reciben su inp de netAplicarInputs(); leerInput()
          // no sabe de mandos remotos y lo pisaría con un input vacío cada frame.
          if (p.ctrl.tipo !== "net") p.inp = leerInput(p);
          if (p.ko) {
            // tiempo tumbándose (ver REAL_MUERTE/MUERTE_DUR en
            // render/sprites.js) -- sin tope aquí, el render ya recorta al
            // último fotograma una vez pasado MUERTE_DUR.
            p.koAnimT = (p.koAnimT || 0) + dt;
            // reanimación (en la Arena PvP una caída es una eliminación
            // definitiva para ese combate: no hay revivir al rival)
            const cerca =
              G.escena !== "pvp" &&
              vivos().some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 42);
            if (cerca) p.reviveT += dt;
            else p.reviveT = Math.max(0, p.reviveT - dt * 1.5);
            if (p.reviveT >= 2) {
              p.ko = false;
              p.reviveT = 0;
              p.koAnimT = 0;
              p.hp = Math.round(statsTot(p).hpMax * 0.4);
              p.res = ROLES[p.rol].res * 0.5;
              p.invulT = 1;
              fxOnda(p.x, p.y, 46, "#7fd4c1");
              toast(p.nombre + " vuelve a la lucha", "#7fd4c1");
            }
            continue;
          }
          const t = statsTot(p),
            b = ROLES[p.rol];
          for (const k of CDS_LINEALES) if (p[k] > 0) p[k] -= dt;
          for (let i = 0; i < 3; i++) if (p.supCd[i] > 0) p.supCd[i] -= dt;
          if (p.formCd > 0) p.formCd -= dt;
          actualizarSendaElemental(p, dt);
          p.res = clamp(
            p.res +
              (p.rol === "mago" || p.rol === "clerigo" ? 16 : 14) *
                dt *
                (p.hasteT > 0 ? 1.3 : 1),
            0,
            b.res,
          );
          p.anim += dt;
          // netAplicarInputs() ya puso el p.aim correcto para los jugadores
          // 'net' (viene del cliente remoto); p.inp.aimA no existe para
          // ellos, así que pisarlo aquí lo dejaba en NaN cada frame —
          // rompía su dirección de ataque y el flip/rotación del sprite.
          if (p.ctrl.tipo !== "net") p.aim = p.inp.aimA;

          let vx = 0,
            vy = 0;
          if (p.rootT > 0) p.rootT -= dt;
          if (p.atrapado || p.rootT > 0) {
            // inmovilizado: arenas movedizas o telaraña
            p.dashT = 0;
            p.dashAtkT = 0;
          } else if (p.dashT > 0) {
            p.dashT -= dt;
            vx = p.dashX * 560;
            vy = p.dashY * 560;
            p.trail.push({ x: p.x, y: p.y, t: 0.25 });
          } else if (p.dashAtkT > 0) {
            // Estocada (guerrero, ver systems/abilities.js: dashAtaque()):
            // misma mecánica de movimiento que el esquive, pero sin
            // invulnerabilidad -- el daño se aplica más abajo, junto al
            // resto de la vuelta del jugador.
            p.dashAtkT -= dt;
            vx = p.dashAtkX * 480;
            vy = p.dashAtkY * 480;
            p.trail.push({ x: p.x, y: p.y, t: 0.2 });
            // La estocada golpea a lo largo de todo el trayecto (más abajo,
            // "Estocada: daña una vez a cada enemigo..."), no en un único
            // instante como golpeArco -- así que el sonido de impacto/fallo
            // real (mismo criterio que golpeArco en abilities.js) se decide
            // AQUÍ, en el frame en que el trayecto termina, según si
            // conectó con algo (p._dashAtkVictims) y si hubo crítico
            // (p._dashAtkCrit, marcado más abajo). Antes llevaba un
            // "espadazo" sintetizado al arrancar -- chocaba con este sonido
            // real igual que le pasaba al golpe básico (ver golpeArco).
            if (p.dashAtkT <= 0 && p._dashAtkVictims) {
              if (p._dashAtkVictims.size === 0) sfxGolpeAire();
              else if (p._dashAtkCrit) sfxGolpeCritico();
              else sfxImpactoGuerrero();
            }
          } else if (
            p.cargaArqT > 0 ||
            p.cargaCuchT > 0 ||
            (p.rol === "mago" && (p.swingT > 0 || p.castCd > 0 || p.cargaT > 0))
          ) {
            // Arquero tensando el arco / pícaro echando el brazo atrás
            // (ver dispararFlechaCargada/lanzarCuchillo más abajo): se
            // quedan quietos apuntando -- vx/vy ya están a 0. Mago: rol a
            // distancia de alto daño y poco aguante -- debe plantarse para
            // lanzar el ataque básico, no puede kitear disparando en
            // movimiento (ver también el bloqueo de INICIAR el cast en
            // abilities.js: atacar()). castCd dura más que swingT (0.45s
            // vs 0.25s), así que se mantiene quieto también durante esa
            // cola, no solo el swing -- p.cargaT cubre el arcano, que se
            // carga manteniendo pulsado (ver el bloque "arcano" más abajo
            // en este mismo update()): en cuanto empieza a cargar queda
            // plantado, aunque haya empezado a cargar en movimiento.
          } else {
            const n = Math.hypot(p.inp.mx, p.inp.my);
            if (n > 0) {
              let velEf = t.vel * (p.enOrtiga ? 0.72 : 1) * (p.congelado ? 0.6 : 1);
              vx = (p.inp.mx / n) * velEf * Math.min(1, n);
              vy = (p.inp.my / n) * velEf * Math.min(1, n);
            }
          }
          p.x = clamp(p.x + vx * dt, 28, SALA_W - 28);
          p.y = clamp(p.y + vy * dt, 28, SALA_H - 28);
          // Paso (ver systems/audio.js: sfxPaso(), "levemente" -- volumen
          // bajo a propósito) -- cadencia simple por temporizador mientras
          // se mueve de verdad (vx/vy ya resueltos: no suena atrapado/
          // enraizado ni empujando contra un muro sin avanzar). Se resetea
          // a 0 en cuanto se para, así el primer paso al reanudar suena en
          // el acto, no con retardo.
          if (Math.hypot(vx, vy) > 20) {
            p.pasoT -= dt;
            if (p.pasoT <= 0) {
              p.pasoT = 0.33;
              sfxPaso();
            }
          } else {
            p.pasoT = 0;
          }
          for (const pl of G.pilares) {
            const d = Math.hypot(p.x - pl.x, p.y - pl.y);
            if (d < pl.r + p.r) {
              const a = Math.atan2(p.y - pl.y, p.x - pl.x);
              p.x = pl.x + Math.cos(a) * (pl.r + p.r);
              p.y = pl.y + Math.sin(a) * (pl.r + p.r);
            }
          }
          // Barriles: eran puramente decorativos, sin colisión -- pedido
          // expreso ("son objetos sólidos"). BARRIL_R a ojo del sprite real
          // (16x22, ver render/world.js), un pelín menor que el semiancho
          // para no sentirse "invisible y más grande de lo que se ve".
          for (const o of G.objetos) {
            if (o.tipo !== "barril") continue;
            const d = Math.hypot(p.x - o.x, p.y - o.y);
            if (d < BARRIL_R + p.r) {
              const a = Math.atan2(p.y - o.y, p.x - o.x) || rnd(0, TAU);
              p.x = o.x + Math.cos(a) * (BARRIL_R + p.r);
              p.y = o.y + Math.sin(a) * (BARRIL_R + p.r);
            }
          }
          aplicarLimites(p);

          // ---- zonas del suelo ----
          p.enOrtiga = false;
          // Debuff ambiental de la sala del Guardián de Hielo: ralentiza
          // salvo cerca de una de las hogueras de alivio (pedido expreso
          // del usuario). Atado a la presencia con vida del jefe (no a un
          // flag de tipo de sala) para que se apague solo al derrotarlo.
          p.congelado =
            G.enemigos.some((en) => en.jefe && en.arquetipo === "hielo" && en.hp > 0) &&
            !(G.hoguerasJefe || []).some((hg) => Math.hypot(hg.x - p.x, hg.y - p.y) < RADIO_HOGUERA_JEFE);
          if (p.hazTick > 0) p.hazTick -= dt;
          let sobrePeligro = false;
          for (const hz of G.hazards) {
            const dh = Math.hypot(p.x - hz.x, p.y - hz.y);
            if (dh > hz.r) continue;
            sobrePeligro = true;
            if (hz.tipo === "grieta") {
              if (hz.estado === 0) {
                hz.estado = 1;
                hz.t = 0.55;
                fxTexto(hz.x, hz.y - 14, "¡cruje!", "#9a93ab");
              } else if (hz.estado === 2 && p.invulT <= 0 && p.dashT <= 0) {
                // caída al vacío
                const inst = G.planta >= 60;
                fxParticulas(p.x, p.y, 12, "#26232f");
                if (inst) {
                  fxTexto(p.x, p.y - 30, "¡CAÍDA MORTAL!", "#d1545c", true);
                  p.escudo = 0;
                  danoAlJugador(p, statsTot(p).hpMax * 4, { caida: true });
                } else {
                  danoAlJugador(
                    p,
                    statsTot(p).hpMax * 0.25 + statsTot(p).armor * 0.6,
                    { caida: true },
                  );
                  fxTexto(p.x, p.y - 30, "¡caes al vacío!", "#d1545c");
                }
                if (!p.ko) {
                  p.x = p.safeX;
                  p.y = p.safeY;
                  p.invulT = 0.8;
                }
              }
            } else if (hz.tipo === "arena") {
              if (
                !p.atrapado &&
                dh < hz.r - 6 &&
                p.dashT <= 0 &&
                p.invulT <= 0
              ) {
                p.atrapado = hz;
                p.qteT = 0;
                p.qteHits = 0;
                p.rescT = 0;
                fxTexto(p.x, p.y - 34, "¡ARENAS MOVEDIZAS!", "#c9a35a", true);
                toast(
                  p.nombre +
                    " se hunde — ayúdale o pulsa esquive en el momento justo",
                  "#c9a35a",
                );
              }
            } else if (
              hz.tipo === "ortiga" ||
              hz.tipo === "telarana" ||
              hz.tipo === "escarcha"
            ) {
              p.enOrtiga = true;
              if (p.hazTick <= 0 && p.invulT <= 0) {
                p.hazTick = 0.5;
                danoAlJugador(
                  p,
                  Math.max(
                    2,
                    escalaEnemigo(Math.max(1, G.planta)).atkBase * 0.3,
                  ),
                  { haz: hz },
                );
              }
            } else if (hz.tipo === "fuegoZona") {
              if (p.hazTick <= 0 && p.invulT <= 0) {
                p.hazTick = 0.5;
                danoAlJugador(
                  p,
                  Math.max(
                    3,
                    escalaEnemigo(Math.max(1, G.planta)).atkBase * 0.55,
                  ),
                  { haz: hz },
                );
                fxParticulas(p.x, p.y, 3, "#ff7d4d");
              }
            }
          }
          if (!sobrePeligro && !p.atrapado) {
            p.safeX = p.x;
            p.safeY = p.y;
          }

          // ---- lucha contra las arenas movedizas ----
          if (p.atrapado) {
            p.qteT = (p.qteT + dt * 1.1) % 1;
            // rescate por un compañero (más rápido que reanimar)
            const aliado = vivos().some(
              (q) =>
                q !== p && !q.atrapado && Math.hypot(q.x - p.x, q.y - p.y) < 46,
            );
            if (aliado) p.rescT += dt;
            else p.rescT = Math.max(0, p.rescT - dt);
            if (p.rescT >= 1.2 || p.qteHits >= 3) {
              const hz = p.atrapado;
              p.atrapado = null;
              p.invulT = 0.5;
              // salto hacia fuera
              const a = Math.atan2(p.y - hz.y, p.x - hz.x) || rnd(0, TAU);
              p.x = clamp(hz.x + Math.cos(a) * (hz.r + 16), 28, SALA_W - 28);
              p.y = clamp(hz.y + Math.sin(a) * (hz.r + 16), 28, SALA_H - 28);
              fxOnda(p.x, p.y, 30, "#c9a35a");
              fxParticulas(p.x, p.y, 10, "#c9a35a");
              toast(p.nombre + " escapa de las arenas", "#7fd4c1");
            }
          }

          // cofre cercano sin abrir (botón de interacción, ver
          // abilities.js: interactuar) -- se recalcula cada frame, tanto
          // para saber si E hace algo como para que render/world.js dibuje
          // el aviso de tecla sobre el cofre
          p.cofreObj =
            G.objetos.find(
              (o) =>
                o.tipo === "cofre" &&
                !o.abierto &&
                Math.hypot(o.x - p.x, o.y - p.y) < 46,
            ) || null;
          // objeto (arma/armadura/accesorio) cercano sin recoger -- a
          // diferencia del oro/vial, no se recoge solo por pisarlo: hay que
          // pulsar E/botón (ver abilities.js: interactuar), igual que el
          // cofre
          p.dropObj =
            G.drops.find(
              (dr) =>
                dr.tipo === "item" &&
                Math.hypot(dr.x - p.x, dr.y - p.y) < 40,
            ) || null;
          // puerta secreta sin revelar cerca -- pulsar E la revela (ver
          // interactuar() en abilities.js); hasta entonces no se cruza
          // sola ni se dibuja como puerta normal (ver world.js/loop.js)
          p.secretoObj =
            (G.puertas || []).find(
              (pu) => pu.oculta && Math.hypot(pu.x - p.x, pu.y - p.y) < 46,
            ) || null;
          // muro secreto INTERIOR (dentro de una misma sala, ver forma
          // "arsenal" en floorgen.js) -- a diferencia de una puerta
          // secreta entre salas, este es un G.muros real que bloquea el
          // paso hasta que se revela con E; entonces se quita del array.
          // Distancia al punto más cercano del rectángulo (no al centro):
          // un muro secreto grande (varias celdas) tendría el centro muy
          // lejos de alguien pegado a su borde.
          p.secretoParedObj =
            (G.muros || []).find((m) => {
              if (!m.secreto) return false;
              const dx = Math.max(m.x - p.x, 0, p.x - (m.x + m.w));
              const dy = Math.max(m.y - p.y, 0, p.y - (m.y + m.h));
              return Math.hypot(dx, dy) < 46;
            }) || null;
          for (let i = p.trail.length - 1; i >= 0; i--) {
            p.trail[i].t -= dt;
            if (p.trail[i].t <= 0) p.trail.splice(i, 1);
          }
          // Sombra Letal: el dash daña a quien atraviesas
          if (p.dashT > 0 && p._dashVictims) {
            for (const e of G.enemigos) {
              if ((e.hp <= 0 && !e.dummy) || p._dashVictims.has(e)) continue;
              if (Math.hypot(e.x - p.x, e.y - p.y) < 26 + e.r) {
                p._dashVictims.add(e);
                danoAEnemigo(
                  e,
                  statsTot(p).atk * 1.2,
                  p,
                  true,
                  p.dashX * 160,
                  p.dashY * 160,
                );
              }
            }
          }
          // Estocada: daña una vez a cada enemigo que atraviesa la embestida
          // (mismo patrón que Sombra Letal arriba, set propio para no
          // interferir con p._dashVictims del esquive normal).
          if (p.dashAtkT > 0 && p._dashAtkVictims) {
            for (const e of G.enemigos) {
              if ((e.hp <= 0 && !e.dummy) || p._dashAtkVictims.has(e)) continue;
              if (Math.hypot(e.x - p.x, e.y - p.y) < 28 + e.r) {
                p._dashAtkVictims.add(e);
                if (
                  danoAEnemigo(
                    e,
                    statsTot(p).atk * 1.3,
                    p,
                    true,
                    p.dashAtkX * 180,
                    p.dashAtkY * 180,
                  )
                )
                  p._dashAtkCrit = true;
              }
            }
          }
          if (p.lvlT > 0) p.lvlT -= dt;
          if (p._retoAvisoT > 0) p._retoAvisoT -= dt;
          // combo del guerrero: se desvanece sin golpear
          if (p.comboT > 0) {
            p.comboT -= dt;
            if (p.comboT <= 0) p.combo = 0;
          }
          // cadena de parries: se desvanece si pasa demasiado tiempo sin parry
          if (p.parryComboT > 0) {
            p.parryComboT -= dt;
            if (p.parryComboT <= 0) p.parryCombo = 0;
          }
          // sinergia elemental: los lanzadores cercanos imbuyen las armas físicas
          if (
            p.rol === "guerrero" ||
            p.rol === "picaro" ||
            p.rol === "arquero"
          ) {
            p.imbuido = null;
            let mejor = null;
            for (const q of vivos()) {
              if (q === p) continue;
              if (Math.hypot(q.x - p.x, q.y - p.y) >= 130) continue;
              if (q.rol === "mago") {
                mejor = { pri: 3, elem: q.elemento };
              } else if (q.rol === "clerigo" && (!mejor || mejor.pri < 2)) {
                mejor = { pri: 2, elem: "sagrado" };
              } else if (q.rol === "druida" && (!mejor || mejor.pri < 1)) {
                mejor = { pri: 1, elem: "zarzas" };
              }
            }
            if (mejor) p.imbuido = mejor.elem;
          }
          if (p.rol === "mago" && p.elemento === "arcano" && !p.atrapado) {
            // en la sala de reto "solo parry" el arcano no puede cargar más
            // (si no, esquivaría el guard de atacar() en abilities.js, que
            // es el único sitio pensado para bloquear el daño normal)
            if (G.salaTipo === "reto_parry") {
              if (p.cargaT > 0) dispararArcano(p);
              p.cargaT = 0;
              if (p.inp.atkHeld) atacar(p);
            } else if (p.inp.atkHeld && p.castCd <= 0 && p.res >= 12) {
              p.cargaT = Math.min(p.cargaT + dt, 1.1);
            } else if (!p.inp.atkHeld && p.cargaT > 0) {
              dispararArcano(p);
            }
          } else if (p.rol === "arquero" && !p.atrapado) {
            // mismo patrón que el arcano de arriba (p.cargaT), en
            // p.cargaArqT -- ver dispararFlechaCargada en abilities.js y
            // el bloqueo de movimiento un poco más arriba en este mismo
            // update().
            if (G.salaTipo === "reto_parry") {
              if (p.cargaArqT > 0) dispararFlechaCargada(p);
              p.cargaArqT = 0;
              if (p.inp.atkHeld) atacar(p);
            } else if (p.inp.atkHeld && p.atkCd <= 0) {
              const antes = p.cargaArqT || 0;
              // El tensado arranca en el mismo frame en que se empieza a
              // mantener pulsado -- instantáneo incluso en un toque corto
              // (dispararFlechaCargada lo corta al soltar, con un mínimo
              // de tiempo audible antes de cortarlo, ver
              // TENSADO_MIN_AUDIBLE_MS en abilities.js -- así el ataque
              // básico siempre se oye tensar Y disparar, no solo lo
              // segundo).
              if (antes <= 0) {
                p._cargaSrc = sfxTensarArco();
                p._cargaSrcT0 = performance.now();
              }
              p.cargaArqT = Math.min(antes + dt, CARGA_ARQ_MAX);
              if (antes < CARGA_ARQ_ZONA[0] && p.cargaArqT >= CARGA_ARQ_ZONA[0])
                sfxCargaLista();
            } else if (!p.inp.atkHeld && p.cargaArqT > 0) {
              dispararFlechaCargada(p);
            }
          } else {
            if (p.cargaT > 0 && p.rol === "mago")
              dispararArcano(p); // cambió de elemento o quedó atrapado: suelta lo cargado
            else p.cargaT = 0;
            if (p.cargaArqT > 0 && p.rol === "arquero")
              dispararFlechaCargada(p); // quedó atrapado a media carga: suelta lo cargado
            else p.cargaArqT = 0;
            if (p.inp.atkHeld) atacar(p);
          }
          // Cuchillo del pícaro: entrada INDEPENDIENTE del botón de ataque
          // de arriba (Mayús/lanzarHeld, no clic izq/atkHeld) -- conserva
          // su golpe de daga de siempre Y puede cargar el cuchillo aparte,
          // a diferencia del arquero/mago, que sustituyen por completo su
          // botón de ataque mientras cargan.
          if (p.rol === "picaro" && !p.atrapado) {
            if (p.inp.lanzarHeld && p.cuchilloCd <= 0) {
              const antes = p.cargaCuchT || 0;
              // Sonido de carga PROPIO, distinto del tensado real del
              // arquero (pedido expreso) -- ver sfxCargaCuchillo.
              if (antes <= 0) sfxCargaCuchillo();
              p.cargaCuchT = Math.min(antes + dt, CARGA_CUCH_MAX);
              if (antes < CARGA_CUCH_ZONA[0] && p.cargaCuchT >= CARGA_CUCH_ZONA[0])
                sfxCargaLista();
            } else if (!p.inp.lanzarHeld && p.cargaCuchT > 0) {
              lanzarCuchillo(p);
            }
          } else if (p.cargaCuchT > 0) {
            lanzarCuchillo(p); // quedó atrapado a media carga: suelta lo cargado
          }
        }

        // proyectiles
        for (let i = G.projs.length - 1; i >= 0; i--) {
          const pr = G.projs[i];
          pr.x += pr.vx * dt;
          pr.y += pr.vy * dt;
          pr.ttl -= dt;
          let fuera =
            pr.ttl <= 0 ||
            pr.x < 10 ||
            pr.x > SALA_W - 10 ||
            pr.y < 10 ||
            pr.y > SALA_H - 10;
          if (colisionaMuro(pr.x, pr.y, pr.r)) {
            fuera = true;
            fxParticulas(pr.x, pr.y, 3, "#6a5a94");
            if (pr.tipo === "flecha" && pr.owner === "p")
              agregarFlechaClavada({
                x: pr.x,
                y: pr.y,
                dir: Math.atan2(pr.vy, pr.vx),
                color: pr.color,
                enemigo: null,
                t: FLECHA_CLAVADA_VIDA,
              });
          }
          if (!dentroForma(pr.x, pr.y, 0)) fuera = true;
          for (const pl of G.pilares)
            if (Math.hypot(pr.x - pl.x, pr.y - pl.y) < pl.r) {
              if (pr.owner === "p" && pl.destructible)
                danoPilar(pl, pr.dmg * 0.8);
              fuera = true;
            }
          if (pr.owner === "p")
            for (const o of G.objetos) {
              if (o.tipo === "barril") {
                if (Math.hypot(pr.x - o.x, pr.y - o.y) < 14) {
                  golpeObjeto(o, pr.dmg);
                  fuera = true;
                  break;
                }
              }
            }
          if (fuera) {
            G.projs.splice(i, 1);
            continue;
          }
          if (pr.owner === "p") {
            let dado = false,
              restantes = pr.pierce || 0;
            for (const e of G.enemigos) {
              if (e.hp <= 0 && !e.dummy) continue;
              if (pr.golpeados && pr.golpeados.has(e)) continue;
              if (Math.hypot(pr.x - e.x, pr.y - e.y) < pr.r + e.r) {
                danoAEnemigo(
                  e,
                  pr.dmg,
                  pr.duenio || G.players[0],
                  true,
                  pr.vx * 0.12,
                  pr.vy * 0.12,
                  pr.critBonus,
                );
                // Golpe seco real al conectar -- antes solo los golpes
                // MELÉ sonaban al impactar (golpeArco decide su propio
                // sonido); flecha/cuchillo se quedaban mudos.
                if (pr.tipo === "flecha" || pr.tipo === "cuchillo")
                  sfxImpactoProyectil();
                if (
                  pr.duenio &&
                  pr.duenio._poison &&
                  pr.duenio.rol === "picaro" &&
                  !e.dummy
                ) {
                  e.poisonT = 3;
                  e.poisonDps = statsTot(pr.duenio).atk * 0.3;
                  e.poisonOwner = pr.duenio;
                }
                // efectos elementales del mago
                if (pr.quema && !e.dummy) {
                  e.burnT = 2.5;
                  e.burnDps = statsTot(pr.duenio || G.players[0]).atk * 0.35;
                  e.burnOwner = pr.duenio;
                  fxTexto(e.x, e.y - e.r - 14, "🔥", "#ff7d4d");
                }
                if (pr.congela) {
                  e.slowT = Math.max(e.slowT, 1.3);
                  fxParticulas(e.x, e.y, 5, "#7fc9e8");
                }
                if (pr.tipo === "orbeArc" && pr.carga > 0.85) {
                  const ka = Math.atan2(pr.vy, pr.vx);
                  e.kx += Math.cos(ka) * 160 * (e.knockRes ?? 1);
                  e.ky += Math.sin(ka) * 160 * (e.knockRes ?? 1);
                }
                // arquero: foco para la Flecha Certera + sinergias elementales
                const du = pr.duenio;
                if (du && du.rol === "arquero" && pr.tipo === "flecha") {
                  if (du.imbuido) aplicarImbuido(du, e);
                  if (!pr.certera) {
                    if (e === du.focoE) du.focoN = (du.focoN || 0) + 1;
                    else {
                      du.focoE = e;
                      du.focoN = 1;
                    }
                    if (du.focoN >= 3) {
                      du.focoN = 0;
                      du.certera = true;
                      fxTexto(
                        du.x,
                        du.y - 30,
                        "🎯 ¡certera lista!",
                        "#ffd27f",
                        true,
                      );
                    }
                  }
                }
                if (restantes > 0) {
                  pr.pierce = restantes - 1;
                  if (!pr.golpeados) pr.golpeados = new Set();
                  pr.golpeados.add(e);
                } else {
                  dado = true;
                  // Se clava en ESTE enemigo (el que agota la
                  // perforación) -- uno que solo atravesó de camino no
                  // se queda dentro, sigue volando. Sigue al enemigo por
                  // un offset local fijo (no su centro exacto) para que
                  // no se amontonen todas en el mismo punto; desaparece
                  // sola si el enemigo muere antes de que le toque su
                  // turno por el límite (ver el barrido de update() más
                  // abajo).
                  if (pr.tipo === "flecha" && !e.dummy)
                    agregarFlechaClavada({
                      ox: Math.cos(Math.atan2(pr.vy, pr.vx)) * e.r * 0.5,
                      oy: Math.sin(Math.atan2(pr.vy, pr.vx)) * e.r * 0.5,
                      dir: Math.atan2(pr.vy, pr.vx),
                      color: pr.color,
                      enemigo: e,
                      t: FLECHA_CLAVADA_VIDA,
                    });
                }
                break;
              }
            }
            // fuego amigo: los proyectiles alcanzan a los compañeros (nunca al que dispara)
            if (!dado && (G.ff || G.escena === "pvp")) {
              for (const q of vivos()) {
                if (q === pr.duenio) continue;
                if (Math.hypot(pr.x - q.x, pr.y - q.y) < pr.r + q.r) {
                  danoAlJugador(q, pr.dmg * (G.escena === "pvp" ? 1 : 0.5), {
                    ff: pr.duenio,
                  });
                  if (G.escena !== "pvp")
                    fxTexto(
                      (pr.x + q.x) / 2,
                      q.y - 34,
                      "¡fuego amigo!",
                      "#ff9d3d",
                    );
                  dado = true;
                  break;
                }
              }
            }
            if (dado) G.projs.splice(i, 1);
          } else {
            let dado = false;
            for (const p of G.players) {
              if (p.ko) continue;
              if (Math.hypot(pr.x - p.x, pr.y - p.y) < pr.r + p.r) {
                danoAlJugador(p, pr.dmg, { proj: pr });
                // telaraña de la Tejedora: enraíza
                if (pr.root && !p.ko && p.invulT <= 0) {
                  p.rootT = 1.2;
                  fxTexto(p.x, p.y - 34, "¡ATRAPADO EN TELARAÑA!", "#e8e0d0");
                }
                dado = true;
                break;
              }
            }
            if (dado && !pr.parried) G.projs.splice(i, 1);
          }
        }

        // áreas
        for (let i = G.areas.length - 1; i >= 0; i--) {
          const a = G.areas[i];
          a.ttl -= dt;
          a.tick -= dt;
          if (a.nace > 0) a.nace -= dt;
          if (a.tick <= 0) {
            a.tick = 0.35;
            if (a.clase === "malArea") {
              for (const q of vivos())
                if (Math.hypot(q.x - a.x, q.y - a.y) < a.r + q.r * 0.5)
                  danoAlJugador(q, a.dps * 0.35, { area: a });
            } else if (a.clase === "elem") {
              const el = ELEMENTOS[a.elemento];
              const dpsMult = statsTot(a.duenio || G.players[0]).atk / 12;
              for (const e of G.enemigos) {
                if (e.hp <= 0 && !e.dummy) continue;
                if (Math.hypot(e.x - a.x, e.y - a.y) < a.r + e.r * 0.5) {
                  if (el.dps > 0)
                    danoAEnemigo(
                      e,
                      el.dps * 0.35 * a.mult * dpsMult,
                      a.duenio || G.players[0],
                      false,
                    );
                  if (el.slow > 0) e.slowT = Math.max(e.slowT, 0.5);
                }
              }
              // fuego amigo: las áreas dañinas queman a los aliados (no al dueño, no las sagradas)
              if (
                (G.ff || G.escena === "pvp") &&
                el.dps > 0 &&
                a.elemento !== "sagrado"
              ) {
                const multFF2 = G.escena === "pvp" ? 1 : 0.5;
                for (const q of vivos()) {
                  if (q === a.duenio) continue;
                  if (Math.hypot(q.x - a.x, q.y - a.y) < a.r + q.r * 0.5)
                    danoAlJugador(q, el.dps * 0.35 * a.mult * dpsMult * multFF2, {
                      ff: a.duenio,
                    });
                }
              }
              if (el.healPS > 0)
                for (const q of vivos())
                  if (Math.hypot(q.x - a.x, q.y - a.y) < a.r)
                    curarP(q, Math.round(el.healPS * 0.35 * a.mult));
            } else {
              // sanar
              const hm = a.healMult || 1;
              for (const q of vivos())
                if (Math.hypot(q.x - a.x, q.y - a.y) < a.r)
                  curarP(q, Math.round(14 * 0.35 * hm));
            }
          }
          if (a.ttl <= 0) G.areas.splice(i, 1);
        }

        // enemigos
        if (G.enemigos.length) actualizarNavegacion();
        for (const e of G.enemigos) {
          if (e.hurtT > 0) e.hurtT -= dt;
          // destello de impacto (blanco/rojo, ver systems/juice.js) --
          // decae solo, independiente de hurtT (dim de siempre, más largo).
          if (e.hitFlashT > 0) e.hitFlashT -= dt;
          // muñeco de pruebas: solo regenera y limpia su log de DPS
          if (e.dummy) {
            e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.2 * dt);
            while (e.dmgLog.length && G.stats.tiempo - e.dmgLog[0].t > 5)
              e.dmgLog.shift();
            continue;
          }
          if (e.hp <= 0) continue; // muerto este mismo frame
          // veneno del pícaro
          if (e.poisonT > 0) {
            e.poisonT -= dt;
            e.poisonTick -= dt;
            if (e.poisonTick <= 0) {
              e.poisonTick = 0.5;
              const pd = Math.max(1, Math.round(e.poisonDps * 0.5));
              e.hp -= pd;
              if (e.poisonOwner) {
                G.stats.dano += pd;
                e.poisonOwner.statDano = (e.poisonOwner.statDano || 0) + pd;
              }
              fxTexto(e.x, e.y - e.r - 4, pd, "#6ac04a");
              if (e.hp <= 0) {
                matarEnemigo(e, e.poisonOwner);
                continue;
              }
            }
          }
          // quemadura de la bola de fuego
          if (e.burnT > 0) {
            e.burnT -= dt;
            e.burnTick = (e.burnTick || 0) - dt;
            if (e.burnTick <= 0) {
              e.burnTick = 0.5;
              const bd = Math.max(1, Math.round((e.burnDps || 0) * 0.5));
              e.hp -= bd;
              if (e.burnOwner) {
                G.stats.dano += bd;
                e.burnOwner.statDano = (e.burnOwner.statDano || 0) + bd;
              }
              fxTexto(e.x, e.y - e.r - 4, bd, "#ff7d4d");
              fxParticulas(e.x, e.y, 2, "#ff7d4d");
              if (e.hp <= 0) {
                matarEnemigo(e, e.burnOwner);
                continue;
              }
            }
          }
          // tragado por el portal arcano
          if (e.portalT > 0) {
            e.portalT -= dt;
            if (e.portalT <= 0) {
              e.x = clamp((e.portalX ?? e.x) + rnd(-24, 24), 40, SALA_W - 40);
              e.y = 42;
              e.stunT = Math.max(e.stunT, 0.55);
              fxParticulas(e.x, e.y, 10, "#c084f0");
              fxOnda(e.x, e.y, 24, "#c084f0");
              fxTexto(e.x, e.y - 16, "¡caída!", "#c084f0");
              danoAEnemigo(
                e,
                e.portalDmg || 10,
                e.portalOwner || G.players[0],
                true,
              );
              if (e.hp <= 0) continue;
            } else continue; // dentro del portal: sin IA, sin colisiones
          }
          if (e.stunT > 0) {
            e.stunT -= dt;
            e.kx *= JUICE.knockback.friction;
            e.ky *= JUICE.knockback.friction;
            e.x += e.kx * dt;
            e.y += e.ky * dt;
            continue;
          }
          if (e.slowT > 0) e.slowT -= dt;
          const obj = masCercano(e.x, e.y);
          if (!obj) break;
          const velF = e.vel * (e.slowT > 0 ? 0.45 : 1);
          const d = Math.hypot(obj.x - e.x, obj.y - e.y);
          const dir = Math.atan2(obj.y - e.y, obj.x - e.x);
          const dirMov = calcularRumboEnjambre(e, obj, d, dt);

          if (e.jefe) {
            const arq = e.arquetipo || "invocador";
            e.patCd -= dt;
            e.metCd -= dt;

            // ===== JEFE SECRETO: El Magnate =====
            if (arq === "cerdo") {
              // se acerca dando pisotones; alterna 3 patrones
              if (e.patCd <= 0) {
                e.patCd = 2.6;
                const modo = (e.cerdoModo = ((e.cerdoModo || 0) + 1) % 3);
                if (modo === 0) {
                  // ráfaga de "tuits" en abanico hacia el jugador más cercano
                  const v2 = obj;
                  const a2 = Math.atan2(v2.y - e.y, v2.x - e.x);
                  for (let k = -2; k <= 2; k++)
                    G.projs.push({
                      owner: "e",
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a2 + k * 0.22) * 260,
                      vy: Math.sin(a2 + k * 0.22) * 260,
                      r: 6,
                      dmg: e.atk,
                      tipo: "tuit",
                      color: "#4a90d9",
                      ttl: 2.6,
                    });
                  fxTexto(e.x, e.y - e.r - 12, "¡TREMENDO!", "#e9b45c");
                } else if (modo === 1) {
                  // invoca lechones (mini secuaces)
                  for (let k = 0; k < 2; k++)
                    spawnEnemigo(G.planta, "runner", false);
                  const secu = G.enemigos.slice(-2);
                  secu.forEach((s) => {
                    s.nombre = "Lechón";
                    s.hp = Math.round(s.hp * 0.6);
                    s.hpMax = s.hp;
                  });
                  fxOnda(e.x, e.y, 50, "#e9b45c");
                  fxTexto(
                    e.x,
                    e.y - e.r - 12,
                    "¡mis mejores lechones!",
                    "#e9b45c",
                  );
                } else {
                  // carga embravecida con la bandera
                  e.rushDir = Math.atan2(obj.y - e.y, obj.x - e.x);
                  e.rushT = 0.7;
                  fxTexto(e.x, e.y - e.r - 12, "¡CARGA!", "#d1545c");
                }
              }
              // ejecución de la carga
              if (e.rushT > 0) {
                e.rushT -= dt;
                e.x += Math.cos(e.rushDir) * 360 * dt;
                e.y += Math.sin(e.rushDir) * 360 * dt;
                for (const p of vivos())
                  if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 4)
                    danoAlJugador(p, e.atk * 1.3, { melee: e });
                if (Math.random() < 0.4) fxParticulas(e.x, e.y, 2, "#e9b45c");
              } else if (d > e.r + obj.r + 6) {
                e.x +=
                  Math.cos(dir) * e.vel * 0.7 * (e.slowT > 0 ? 0.45 : 1) * dt;
                e.y +=
                  Math.sin(dir) * e.vel * 0.7 * (e.slowT > 0 ? 0.45 : 1) * dt;
              }
              // invocación de refuerzos al 50%
              if (!e.invoco && e.hp < e.hpMax * 0.5) {
                e.invoco = true;
                for (let k = 0; k < 3; k++)
                  spawnEnemigo(G.planta, "melee", false);
                banner("¡El Magnate reparte cargos!");
              }
              e.x = clamp(e.x, e.r, SALA_W - e.r);
              e.y = clamp(e.y, e.r, SALA_H - e.r);
              aplicarLimites(e);
              e.hurtT = Math.max(0, e.hurtT - dt);
              if (e.stunT > 0) e.stunT -= dt;
              if (e.slowT > 0) e.slowT -= dt;
              continue;
            }

            // ===== PRIMER JEFE REAL: Guardián de Hielo =====
            if (arq === "hielo") {
              e.atkCdJefe -= dt;

              // Enrage suave si la pelea se alarga (ver j.tInicio en
              // floorgen.js, fijado al aparecer): pasados 100s reales sin
              // caer, acelera hasta un 35% los cooldowns de sus ataques a
              // distancia -- evita partidas eternas por turtling, sin
              // límite duro ni derrota automática.
              const tVida = G.stats.tiempo - (e.tInicio ?? G.stats.tiempo);
              const enrage = clamp((tVida - 100) / 100, 0, 0.35);

              // "Esquirla de hielo": proyectil que enraíza -- mismo efecto
              // que ya usa la Tejedora (pr.root, ver el manejo de
              // proyectiles: p.rootT = 1.2), solo cambia el sprite
              // (tipo "carambano", ya dibujado en render/world.js sin
              // ningún uso hasta ahora) y el dueño. Activo SIEMPRE, incluso
              // regenerando -- obliga a esquivar también fuera de rango de
              // melee, sobre todo a quien esté quieto rompiendo un pilar.
              e.esquirlaCd -= dt;
              if (e.esquirlaCd <= 0) {
                e.esquirlaCd = rnd(4.5, 5.5) * (1 - enrage);
                const nDisparos = e.faseHielo3 ? 2 : 1;
                for (let k = 0; k < nDisparos; k++) {
                  const a2 =
                    Math.atan2(obj.y - e.y, obj.x - e.x) +
                    (k - (nDisparos - 1) / 2) * 0.3;
                  G.projs.push({
                    owner: "e",
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(a2) * 250,
                    vy: Math.sin(a2) * 250,
                    r: 5,
                    dmg: e.atk * 0.7,
                    tipo: "carambano",
                    color: "#7fc9e8",
                    ttl: 2.6,
                    root: true,
                  });
                }
                sfx("hielo");
              }

              // "Lluvia de esquirlas": telegrafiado de zona reskinado del
              // meteoro que ya usan magma/eterno (G.rayos, ry.meteoro),
              // una por jugador vivo -- presión de sala que no depende de
              // que el jefe esté cerca ni de si está regenerando.
              e.lluviaCd -= dt;
              if (e.lluviaCd <= 0) {
                e.lluviaCd = rnd(7, 9) * (1 - enrage);
                for (const p of vivos())
                  G.rayos.push({
                    x: clamp(p.x + rnd(-30, 30), 40, SALA_W - 40),
                    y: clamp(p.y + rnd(-30, 30), 40, SALA_H - 40),
                    t: 1.0,
                    meteoro: true,
                    hielo: true,
                    dmg: e.atk * 1.1,
                  });
                banner("❄ ¡Lluvia de esquirlas!");
              }

              if (e.atkT > 0) {
                e.atkT -= dt;
                const prog = 1 - e.atkT / e.atkTMax;
                // el golpe conecta a mitad del gesto de ataque (real,
                // 14 frames) -- da tiempo a leer el telegrafiado en vez
                // de hacer daño en el instante 0 del swing.
                if (prog >= 0.5 && !e.atkGolpeo) {
                  e.atkGolpeo = true;
                  for (const p of vivos())
                    if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 16)
                      danoAlJugador(p, e.atk, { melee: e });
                  fxOnda(e.x, e.y, e.r + 20, "#bfe6f7");
                  G.shake = Math.max(G.shake, 3);
                }
                e.moviendose = false;
              } else if (d > e.r + obj.r + 10) {
                e.x += Math.cos(dirMov) * velF * dt;
                e.y += Math.sin(dirMov) * velF * dt;
                e.moviendose = true;
              } else {
                e.moviendose = false;
                if (e.atkCdJefe <= 0) {
                  e.atkT = e.atkTMax;
                  e.atkGolpeo = false;
                  // Cadencia más agresiva que la versión inicial (2.2s) --
                  // pedido expreso ("tiene que atacar algo más rápido").
                  e.atkCdJefe = 1.3;
                }
              }

              // Temblor de pantalla a cada paso mientras se mueve -- pedido
              // expreso ("cada paso hará que tiemble la pantalla"). Cadencia
              // atada a la velocidad real (más rápido = pasos más seguidos).
              if (e.moviendose) {
                e.pasoT = (e.pasoT || 0) - dt;
                if (e.pasoT <= 0) {
                  e.pasoT = 26 / Math.max(1, e.vel); // ~26px por zancada
                  G.shake = Math.max(G.shake, 4);
                  // Escarcha residual: 1 de cada 3 zancadas deja un parche
                  // de hielo bajo sus pies -- mismo hazard que ya usa la
                  // Tejedora (tipo "escarcha", mismo manejo de
                  // ralentización + tick de daño que "telarana"/"ortiga",
                  // ver más abajo en este bucle -- solo cambia el dibujo,
                  // ver render/world.js). Con el combate avanzando el
                  // suelo se va llenando de charcos: presión acumulativa
                  // sin mecánica nueva. Tope para no saturar la sala si la
                  // pelea se alarga mucho.
                  if (Math.random() < 0.33 && G.hazards.length < 24) {
                    G.hazards.push({
                      tipo: "escarcha",
                      x: e.x,
                      y: e.y + e.r * 0.6,
                      r: 34,
                      estado: 0,
                      t: 0,
                      fase: 0,
                      ttl: 9,
                    });
                  }
                }
              } else {
                e.pasoT = 0;
              }

              // umbrales de vida: caen pilares + mobs, empieza a regenerar
              if (!e.faseHielo1 && e.hp < e.hpMax * 0.75) {
                e.faseHielo1 = true;
                iniciarFaseHielo(e, 2);
              } else if (!e.faseHielo2 && e.hp < e.hpMax * 0.5) {
                e.faseHielo2 = true;
                iniciarFaseHielo(e, 4);
              } else if (!e.faseHielo3 && e.hp < e.hpMax * 0.25) {
                e.faseHielo3 = true;
                iniciarFaseHielo(e, 6);
              }

              if (e.regenerando) {
                // pl.hp > 0: un pilar con vida a 0 puede seguir un
                // momento en G.pilares reproduciendo su fase de escombro
                // (pl.rotoT, ver systems/abilities.js) -- eso es solo
                // cosmético, no debe retrasar que el jefe vuelva a ser
                // vulnerable.
                const algunPilarVivo = e.pilaresFase.some((pl) => G.pilares.includes(pl) && pl.hp > 0);
                if (!algunPilarVivo) {
                  e.regenerando = false;
                  toast("❄ Pilares destruidos — el Guardián vuelve a ser vulnerable", "#7fd4c1");
                } else {
                  // Más urgente según avanza la pelea (4%/s en fase 1,
                  // 5% en fase 2, 6% en fase 3) -- aprieta el ritmo de
                  // "hay que romper los pilares YA" sin tocar la lógica,
                  // solo el número según cuántos umbrales ya se cruzaron.
                  const faseActual = e.faseHielo3 ? 3 : e.faseHielo2 ? 2 : 1;
                  e.hp = Math.min(
                    e.hpTopeFase,
                    e.hp + e.hpMax * (0.04 + 0.01 * faseActual) * dt,
                  );
                }
              }

              // Colisión sólida con pilares y barriles -- a diferencia de
              // los enemigos genéricos (ver más abajo en este mismo
              // bucle), esta rama es autocontenida y no pasaba por ahí:
              // el jefe atravesaba tanto los pilares normales como los
              // que él mismo invoca. Pedido expreso del usuario ("los
              // pilares que invoca el golem tampoco deben atravesarse").
              // Sin daño pasivo al empujar (a diferencia de los mobs
              // normales) para no interferir con el ritmo de la mecánica
              // de romper pilares a propósito.
              for (const pl of G.pilares) {
                const dPl = Math.hypot(e.x - pl.x, e.y - pl.y);
                if (dPl < pl.r + e.r) {
                  const aPl = Math.atan2(e.y - pl.y, e.x - pl.x) || rnd(0, TAU);
                  e.x = pl.x + Math.cos(aPl) * (pl.r + e.r);
                  e.y = pl.y + Math.sin(aPl) * (pl.r + e.r);
                }
              }
              for (const o of G.objetos) {
                if (o.tipo !== "barril") continue;
                const dB = Math.hypot(e.x - o.x, e.y - o.y);
                if (dB < BARRIL_R + e.r) {
                  const aB = Math.atan2(e.y - o.y, e.x - o.x) || rnd(0, TAU);
                  e.x = o.x + Math.cos(aB) * (BARRIL_R + e.r);
                  e.y = o.y + Math.sin(aB) * (BARRIL_R + e.r);
                }
              }
              e.x = clamp(e.x, e.r, SALA_W - e.r);
              e.y = clamp(e.y, e.r, SALA_H - e.r);
              aplicarLimites(e);
              e.hurtT = Math.max(0, e.hurtT - dt);
              continue;
            }

            // --- teletransporte + siega del Segador ---
            if ((arq === "segador" || arq === "eterno") && e.segT > 0) {
              e.segT -= dt;
              if (e.segT <= 0) {
                // aparece y siega en área
                fxParticulas(e.x, e.y, 10, "#57496f");
                e.x = e.segX;
                e.y = e.segY;
                fxOnda(e.x, e.y, 86, "#c07be0");
                fxParticulas(e.x, e.y, 16, "#c07be0");
                G.shake = Math.max(G.shake, 5);
                for (const p of vivos())
                  if (Math.hypot(p.x - e.x, p.y - e.y) < 86 + p.r)
                    danoAlJugador(p, e.atk * 1.6, { melee: e });
                // charca de sombra residual
                G.areas.push({
                  clase: "malArea",
                  x: e.x,
                  y: e.y,
                  r: 44,
                  ttl: 4,
                  tick: 0,
                  nace: 0.15,
                  dps: e.atk * 0.4,
                  color: "#57496f",
                });
              }
            }

            if (e.patCd <= 0) {
              if (arq === "invocador" || arq === "eterno") {
                const nP =
                  G.planta >= 90
                    ? 20
                    : G.planta >= 60
                      ? 16
                      : G.planta >= 30
                        ? 14
                        : 12;
                const vOrbe = G.planta >= 90 ? 240 : G.planta >= 60 ? 220 : 200;
                e.patCd = G.planta >= 90 ? 2.2 : G.planta >= 60 ? 2.6 : 3.2;
                for (let k = 0; k < nP; k++) {
                  const a2 = (k / nP) * TAU + e.fase;
                  G.projs.push({
                    owner: "e",
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(a2) * vOrbe,
                    vy: Math.sin(a2) * vOrbe,
                    r: 5,
                    dmg: e.atk,
                    tipo: "orbe",
                    color: "#c07be0",
                    ttl: 3.2,
                  });
                }
                e.fase += 0.35;
                G.shake = Math.max(G.shake, 3);
              } else if (arq === "segador") {
                // marca destino junto a un jugador aleatorio y desaparece
                e.patCd = 4;
                const v2 = az(vivos());
                if (v2) {
                  e.segX = clamp(v2.x + rnd(-40, 40), 50, SALA_W - 50);
                  e.segY = clamp(v2.y + rnd(-40, 40), 50, SALA_H - 50);
                  e.segT = 0.8;
                  fxOnda(e.segX, e.segY, 86, "#57496f");
                  fxTexto(e.segX, e.segY, "⚠", "#c07be0", true);
                }
              } else if (arq === "gemelos") {
                // golpe de suelo: anillo corto de orbes
                e.patCd = e.rabioso ? 2.2 : 3.2;
                for (let k = 0; k < 8; k++) {
                  const a2 = (k / 8) * TAU + e.fase;
                  G.projs.push({
                    owner: "e",
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(a2) * 180,
                    vy: Math.sin(a2) * 180,
                    r: 5,
                    dmg: e.atk * 0.9,
                    tipo: "orbe",
                    color: "#ffb84d",
                    ttl: 1.6,
                  });
                }
                e.fase += 0.5;
                G.shake = Math.max(G.shake, 3);
              } else if (arq === "tejedora") {
                // dispara telarañas que inmovilizan
                e.patCd = 2.8;
                const v2 = az(vivos());
                if (v2) {
                  const a2 = Math.atan2(v2.y - e.y, v2.x - e.x);
                  for (let k = -1; k <= 1; k++)
                    G.projs.push({
                      owner: "e",
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a2 + k * 0.3) * 190,
                      vy: Math.sin(a2 + k * 0.3) * 190,
                      r: 5,
                      dmg: e.atk * 0.4,
                      tipo: "tela",
                      color: "#e8e0d0",
                      ttl: 2.6,
                      root: true,
                    });
                }
                // deja parches de telaraña ocasionales
                if (Math.random() < 0.4)
                  G.hazards.push({
                    tipo: "telarana",
                    x: e.x + rnd(-60, 60),
                    y: e.y + rnd(-60, 60),
                    r: 24,
                    estado: 0,
                    t: 0,
                    fase: 0,
                    ttl: 8,
                  });
              } else if (arq === "magma") {
                // meteoros telegrafiados sobre los jugadores
                e.patCd = 3.2;
                for (const p of vivos()) {
                  if (Math.random() < 0.8)
                    G.rayos.push({
                      x: clamp(p.x + rnd(-30, 30), 40, SALA_W - 40),
                      y: clamp(p.y + rnd(-30, 30), 40, SALA_H - 40),
                      t: 1.0,
                      meteoro: true,
                      dmg: e.atk * 1.4,
                    });
                }
              } else if (arq === "espejo") {
                // teletransporte + tríada arcana
                e.patCd = 2.6;
                if (Math.random() < 0.45) {
                  fxParticulas(e.x, e.y, 10, "#c07be0");
                  e.x = rnd(70, SALA_W - 70);
                  e.y = rnd(70, SALA_H * 0.6);
                  fxParticulas(e.x, e.y, 10, "#c07be0");
                }
                const v2 = az(vivos());
                if (v2) {
                  const a2 = Math.atan2(v2.y - e.y, v2.x - e.x);
                  for (let k = -1; k <= 1; k++)
                    G.projs.push({
                      owner: "e",
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a2 + k * 0.22) * 250,
                      vy: Math.sin(a2 + k * 0.22) * 250,
                      r: 4,
                      dmg: e.atk,
                      tipo: "orbe",
                      color: "#c084f0",
                      ttl: 2.4,
                    });
                }
              }
            }
            // el Eterno también lanza meteoros
            if (arq === "eterno" && e.metCd <= 0) {
              e.metCd = 4;
              for (const p of vivos())
                G.rayos.push({
                  x: clamp(p.x + rnd(-30, 30), 40, SALA_W - 40),
                  y: clamp(p.y + rnd(-30, 30), 40, SALA_H - 40),
                  t: 1.0,
                  meteoro: true,
                  dmg: e.atk * 1.3,
                });
              // y marca una siega
              const v2 = az(vivos());
              if (v2) {
                e.segX = v2.x;
                e.segY = v2.y;
                e.segT = 0.8;
                fxOnda(e.segX, e.segY, 86, "#57496f");
              }
            }
            // invocación al 50% (y al 25% para el Eterno)
            if (!e.invoco && e.hp < e.hpMax * 0.5) {
              e.invoco = true;
              const nInv = G.planta >= 50 ? 3 : 2;
              if (arq === "espejo") {
                for (const p of vivos()) spawnClon(G.planta, p.rol);
              } else
                for (let k = 0; k < nInv; k++)
                  spawnEnemigo(G.planta, tipoAleatorio(G.planta), k % 2 === 0);
              banner("¡" + e.nombre + " invoca refuerzos!");
            }
            if (arq === "eterno" && !e.invoco2 && e.hp < e.hpMax * 0.25) {
              e.invoco2 = true;
              for (const p of vivos()) spawnClon(G.planta, p.rol);
              banner("¡El Eterno refleja vuestras almas!");
            }
            const velJ = arq === "magma" ? e.vel * 0.6 : e.vel;
            if (e.segT <= 0 && d > e.r + obj.r + 6) {
              e.x += Math.cos(dirMov) * velJ * (e.slowT > 0 ? 0.45 : 1) * dt;
              e.y += Math.sin(dirMov) * velJ * (e.slowT > 0 ? 0.45 : 1) * dt;
            }
          } else if (e.mini) {
            // minijefe: persecución + ráfaga radial pequeña
            e.patCd -= dt;
            if (e.patCd <= 0) {
              e.patCd = 3.5;
              for (let k = 0; k < 7; k++) {
                const a2 = (k / 7) * TAU + e.fase;
                G.projs.push({
                  owner: "e",
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(a2) * 190,
                  vy: Math.sin(a2) * 190,
                  r: 4,
                  dmg: e.atk * 0.8,
                  tipo: "orbe",
                  color: "#8a55c8",
                  ttl: 2.2,
                });
              }
              e.fase += 0.6;
            }
            if (d > e.r + obj.r - 2) {
              e.x += Math.cos(dirMov) * velF * dt;
              e.y += Math.sin(dirMov) * velF * dt;
            }
          } else if (e.tipo === "runner") {
            // acechador: carga telegrafiada
            if (e.rushT > 0) {
              e.rushT -= dt;
              e.x += Math.cos(e.rushDir) * 400 * dt;
              e.y += Math.sin(e.rushDir) * 400 * dt;
            } else if (e.telT > 0) {
              e.telT -= dt;
              if (e.telT <= 0) {
                e.rushT = 0.38;
                e.rushDir = Math.atan2(obj.y - e.y, obj.x - e.x);
              }
            } else {
              e.chargeCd -= dt;
              if (e.chargeCd <= 0 && d < 280 && d > 60) {
                e.telT = 0.35;
                e.chargeCd = 2.6;
              } else if (d > e.r + obj.r - 2) {
                e.x += Math.cos(dirMov) * velF * dt;
                e.y += Math.sin(dirMov) * velF * dt;
              }
            }
          } else if (e.tipo === "bomber") {
            if (e.fuseT >= 0) {
              e.fuseT -= dt;
              if (e.fuseT <= 0) {
                explotarBomber(e);
                continue;
              }
            } else {
              if (d < 48) {
                e.fuseT = 0.7;
              } else {
                e.x += Math.cos(dirMov) * velF * dt;
                e.y += Math.sin(dirMov) * velF * dt;
              }
            }
          } else if (e.tipo === "caster") {
            e.blinkCd -= dt;
            if (d < 130 && e.blinkCd <= 0) {
              // teletransporte lejos del jugador
              fxParticulas(e.x, e.y, 8, "#c07be0");
              const a2 = dir + Math.PI + rnd(-0.8, 0.8);
              e.x = clamp(e.x + Math.cos(a2) * 230, 40, SALA_W - 40);
              e.y = clamp(e.y + Math.sin(a2) * 230, 40, SALA_H - 40);
              fxParticulas(e.x, e.y, 8, "#c07be0");
              e.blinkCd = 4;
            } else if (d > 320) {
              e.x += Math.cos(dirMov) * velF * dt;
              e.y += Math.sin(dirMov) * velF * dt;
            }
            e.shootCd -= dt;
            if (e.shootCd <= 0 && d < 440) {
              e.shootCd = 2.2;
              for (let k = -1; k <= 1; k++) {
                const a2 = dir + k * 0.22;
                G.projs.push({
                  owner: "e",
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(a2) * 240,
                  vy: Math.sin(a2) * 240,
                  r: 4,
                  dmg: e.atk,
                  tipo: "orbe",
                  color: "#c07be0",
                  ttl: 2.5,
                });
              }
            }
          } else if (e.ranged) {
            if (d > 300) {
              e.x += Math.cos(dirMov) * velF * dt;
              e.y += Math.sin(dirMov) * velF * dt;
            } else if (d < 170) {
              e.x -= Math.cos(dir) * velF * 0.8 * dt;
              e.y -= Math.sin(dir) * velF * 0.8 * dt;
            }
            e.shootCd -= dt;
            if (e.shootCd <= 0 && d < 420) {
              e.shootCd = 1.7;
              G.projs.push({
                owner: "e",
                x: e.x,
                y: e.y,
                vx: Math.cos(dir) * 230,
                vy: Math.sin(dir) * 230,
                r: 4,
                dmg: e.atk,
                tipo: "orbe",
                color: "#d1545c",
                ttl: 2.5,
              });
            }
          } else {
            // melee y tank
            if (d > e.r + obj.r - 2) {
              e.x += Math.cos(dirMov) * velF * dt;
              e.y += Math.sin(dirMov) * velF * dt;
            }
          }

          e.kx *= JUICE.knockback.friction;
          e.ky *= JUICE.knockback.friction;
          e.x += e.kx * dt;
          e.y += e.ky * dt;
          // colisión con pilares: empuje + los enemigos golpean columnas destructibles al empujar
          if (e.pilCd > 0) e.pilCd -= dt;
          for (const pl of G.pilares) {
            const dd = Math.hypot(e.x - pl.x, e.y - pl.y);
            if (dd < pl.r + e.r) {
              const a2 = Math.atan2(e.y - pl.y, e.x - pl.x);
              e.x = pl.x + Math.cos(a2) * (pl.r + e.r);
              e.y = pl.y + Math.sin(a2) * (pl.r + e.r);
              if (pl.destructible && e.pilCd <= 0 && !e.dummy) {
                e.pilCd = 1;
                danoPilar(pl, e.atk * 0.7);
              }
            }
          }
          // Barriles: mismo empuje sólido que contra el jugador (ver arriba
          // en el bucle de jugadores) -- antes solo los pilares bloqueaban
          // a los enemigos.
          for (const o of G.objetos) {
            if (o.tipo !== "barril") continue;
            const dd = Math.hypot(e.x - o.x, e.y - o.y);
            if (dd < BARRIL_R + e.r) {
              const a2 = Math.atan2(e.y - o.y, e.x - o.x) || rnd(0, TAU);
              e.x = o.x + Math.cos(a2) * (BARRIL_R + e.r);
              e.y = o.y + Math.sin(a2) * (BARRIL_R + e.r);
            }
          }
          e.x = clamp(e.x, 24, SALA_W - 24);
          e.y = clamp(e.y, 24, SALA_H - 24);
          aplicarLimites(e);
          e.atkCd -= dt;
          if (e.atkCd <= 0 && e.tipo !== "bomber") {
            for (const p of vivos()) {
              if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 3) {
                e.atkCd = e.tipo === "tank" ? 1.2 : 0.9;
                const mult = e.jefe
                  ? 1.4
                  : e.tipo === "tank"
                    ? 1.25
                    : e.rushT > 0
                      ? 1.3
                      : 1;
                danoAlJugador(p, e.atk * mult, { melee: e });
                break;
              }
            }
          }
        }
        for (let i = G.enemigos.length - 1; i >= 0; i--)
          if (G.enemigos[i].hp <= 0 && !G.enemigos[i].dummy)
            G.enemigos.splice(i, 1);

        // Arena PvP: comprueba si sólo queda un aspirante en pie
        if (G.escena === "pvp" && G.activo) {
          if (G.pvpFinT > 0) {
            G.pvpFinT -= dt;
            if (G.pvpFinT <= 0) iniciarLobby();
          } else {
            const v = vivos();
            if (v.length <= 1) {
              if (v.length === 1) {
                banner("⚔ ¡" + v[0].nombre + " gana la Arena!");
                toast("🏆 " + v[0].nombre + " es el vencedor", "#e9b45c");
              } else {
                banner("Combate sin vencedor");
              }
              G.pvpFinT = 3.5;
            }
          }
        }

        // en una mazmorra multi-sala, limpiar una sala normal NO debe
        // adelantar la planta -- solo cuenta la sala marcada "esFinal"
        // (las plantas de jefe no tienen mazmorra -- G.mazmorra===null --
        // y se comportan exactamente igual que antes)
        const sfActual = G.mazmorra ? salaActual() : null;
        const finalPendiente =
          !G.mazmorra || (sfActual && sfActual.esFinal && !sfActual.despejada);
        if (
          G.escena === "torre" &&
          G.enemigos.length === 0 &&
          !G.portal &&
          G.activo &&
          finalPendiente
        ) {
          if (sfActual) sfActual.despejada = true;
          if (G.planta === MAX_PLANTA) {
            finPartida(true);
            return;
          }
          // XP por completar planta
          const xpPlanta = XP_POR_PLANTA * (esJefe(G.planta) ? 4 : 1);
          for (const p of G.players) if (!p.ko) ganarXP(p, xpPlanta);
          // si algún jugador tiene tarjetas pendientes, abrir pantalla de cartas primero
          const conCartas = G.players.filter((p) => p.cartasPendientes > 0);
          if (conCartas.length > 0) {
            G.pausa = true;
            abrirCartasParaJugador(conCartas, 0, () => {
              G.pausa = false;
              plantaDespejada();
            });
          } else {
            plantaDespejada();
          }
        }

        // drops (cada jugador tiene su propia bolsa). El oro y los viales se
        // recogen solos al pisarlos; los objetos (arma/armadura/accesorio)
        // NO -- esos exigen pulsar E/botón, ver p.dropObj más arriba y
        // interactuar() en abilities.js.
        for (let i = G.drops.length - 1; i >= 0; i--) {
          const dr = G.drops[i];
          dr.t = (dr.t || 0) + dt; // edad del drop, ver el rayo de luz en render/world.js
          if (dr.tipo === "item") {
            // aterrizaje: salta/gira/cae (ver render/world.js) y, justo al
            // tocar el suelo, un golpe grave+brillo que da "peso" al drop --
            // una sola vez por objeto (dr.aterrizadoFx), aquí en vez de en
            // render() porque solo el host debe disparar el sonido/fx, y
            // este bucle es exclusivo del host (update() no corre en el
            // invitado).
            if (!dr.aterrizadoFx && dr.t >= (dr.saltoDur || 0.5)) {
              dr.aterrizadoFx = true;
              sfxAterrizaje(dr.item.rareza);
              fxParticulas(dr.x, dr.y + 6, 6 + dr.item.rareza * 2, RAREZAS[dr.item.rareza].col);
              fxOnda(dr.x, dr.y + 6, 16 + dr.item.rareza * 3, RAREZAS[dr.item.rareza].col);
            }
            continue;
          }
          const p = vivos().find(
            (q) => Math.hypot(dr.x - q.x, dr.y - q.y) < 26,
          );
          if (p) {
            if (dr.tipo === "vial") {
              curarP(p, Math.round(statsTot(p).hpMax * 0.15));
              sfx("carta");
            } else if (dr.tipo === "moneda") {
              const gan = Math.max(
                1,
                Math.round(dr.val * (1 + 0.1 * META.mejoras.fortuna)),
              );
              G.oroRun += gan;
              sfx("moneda");
              fxTexto(p.x, p.y - 30, "+" + gan + " 🪙", "#ffd27f");
            }
            G.drops.splice(i, 1);
          }
        }

        // objetos interactivos por proximidad (cristal de maná)
        for (let i = G.objetos.length - 1; i >= 0; i--) {
          const o = G.objetos[i];
          if (o.tipo === "cofre" && o.abriendoT > 0) o.abriendoT -= dt;
          if (o.tipo === "cristal") {
            const p = vivos().find(
              (q) => Math.hypot(o.x - q.x, o.y - q.y) < 24,
            );
            if (p) {
              p.res = clamp(p.res + 45, 0, ROLES[p.rol].res);
              fxTexto(
                p.x,
                p.y - 30,
                "+45 " + ROLES[p.rol].resNombre,
                "#6fb8e8",
              );
              fxParticulas(o.x, o.y, 8, "#6fb8e8");
              G.objetos.splice(i, 1);
            }
          }
        }

        // mercader (solo en lobby): abrir tienda por proximidad
        if (G.escena === "lobby" && G.mercader) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.mercader.x - q.x, G.mercader.y - q.y) < 50,
          );
          if (cerca && !G.tiendaLock && !G.pausa) {
            abrirTienda();
          }
          if (!cerca) G.tiendaLock = false;
        }
        // sastre de skins (solo en lobby)
        if (G.escena === "lobby" && G.skinNpc) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.skinNpc.x - q.x, G.skinNpc.y - q.y) < 50,
          );
          if (cerca && !G.skinLock && !G.pausa) {
            abrirSkins();
          }
          if (!cerca) G.skinLock = false;
        }
        // Mesa de Trabajo / Yunque (solo en lobby): desmantelar armas en
        // Fragmentos de Alma -- ver ui/workbench.js y systems/soul.js.
        if (G.escena === "lobby" && G.yunqueNpc) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.yunqueNpc.x - q.x, G.yunqueNpc.y - q.y) < 50,
          );
          if (cerca && !G.yunqueLock && !G.pausa) {
            abrirYunque();
          }
          if (!cerca) G.yunqueLock = false;
        }
        // portal de la Arena PvP (solo en lobby): jugadores contra jugadores
        if (G.escena === "lobby" && G.arenaNpc) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.arenaNpc.x - q.x, G.arenaNpc.y - q.y) < 50,
          );
          if (cerca && !G.arenaLock && !G.pausa) {
            abrirArenaPvp();
          }
          if (!cerca) G.arenaLock = false;
        }
        // NPC de pruebas (QA, ?qa=1 -- ver core/gameflow.js): sube un nivel
        // a todo el grupo por cada acercamiento, para probar las tarjetas
        // de mejora sin tener que jugar plantas enteras. G.nivelLock evita
        // que se dispare cada frame mientras sigues cerca; se resetea al
        // alejarte, así que puedes repetir el proceso volviendo a acercarte.
        if (G.escena === "lobby" && G.nivelNpc) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.nivelNpc.x - q.x, G.nivelNpc.y - q.y) < 50,
          );
          if (cerca && !G.nivelLock && !G.pausa) {
            G.nivelLock = true;
            for (const p of vivos()) ganarXP(p, Math.max(1, p.xpSig - p.xp));
            const conCartas = G.players.filter((pl) => pl.cartasPendientes > 0);
            if (conCartas.length) {
              G.pausa = true;
              abrirCartasParaJugador(conCartas, 0, () => {
                G.pausa = false;
              });
            }
          }
          if (!cerca) G.nivelLock = false;
        }

        // Portal de pruebas (QA, ?qa=1): salta directo a la planta 5 (el
        // Guardián de Hielo) para poder probar el jefe sin bajar 4 plantas
        // primero cada vez. Mismo patrón de "lock" que el NPC de nivel de
        // arriba.
        if (G.escena === "lobby" && G.jefeNpcQA) {
          const cercaJefeQA = vivos().some(
            (q) => Math.hypot(G.jefeNpcQA.x - q.x, G.jefeNpcQA.y - q.y) < 50,
          );
          if (cercaJefeQA && !G.jefeQALock && !G.pausa) {
            G.jefeQALock = true;
            G.planta = 5;
            iniciarPlanta();
          }
          if (!cercaJefeQA) G.jefeQALock = false;
        }

        // fogata
        if (G.fogata && !G.fogataUsada) {
          const alguien = vivos().some(
            (q) => Math.hypot(G.fogata.x - q.x, G.fogata.y - q.y) < 52,
          );
          if (alguien) {
            G.descansoT += dt;
            if (G.descansoT >= 2.2) {
              G.fogataUsada = true;
              for (const q of G.players) {
                if (q.ko) continue;
                curarP(q, Math.round(statsTot(q).hpMax * 0.35));
                q.res = clamp(
                  q.res + ROLES[q.rol].res * 0.5,
                  0,
                  ROLES[q.rol].res,
                );
              }
              toast("El grupo descansa junto al fuego", "#7fd4c1");
            }
          } else if (G.descansoT > 0)
            G.descansoT = Math.max(0, G.descansoT - dt * 2);
        }

        // puertas de la mazmorra: en cuanto un jugador vivo toca una, todo
        // el grupo salta junto a la sala conectada (ver cruzarPuerta) --
        // no hace falta que todos estén juntos, a diferencia del portal
        if (G.escena === "torre" && G.puertas && G.puertas.length) {
          for (const pu of G.puertas) {
            if (pu.oculta) continue; // secreta sin revelar: no se cruza sola
            if (
              vivos().some((q) => Math.hypot(q.x - pu.x, q.y - pu.y) < pu.r)
            ) {
              cruzarPuerta(pu);
              break;
            }
          }
        }

        // portal: todos los vivos dentro
        if (G.portal) {
          G.portal.t += dt;
          const vs = vivos();
          const dentro = vs.filter(
            (q) =>
              Math.hypot(G.portal.x - q.x, G.portal.y - q.y) < G.portal.r + 12,
          ).length;
          G.portal.dentro = dentro;
          G.portal.total = vs.length;
          if (vs.length > 0 && dentro === vs.length) {
            if (G.escena === "lobby") {
              G.planta = 1;
              iniciarPlanta();
              return;
            }
            G.planta++;
            const conCartas = G.players.filter((p) => p.cartasPendientes > 0);
            if (conCartas.length > 0) {
              G.pausa = true;
              abrirCartasParaJugador(conCartas, 0, () => {
                G.pausa = false;
                iniciarPlanta();
              });
            } else {
              iniciarPlanta();
            }
            return;
          }
        }

        // escalera abajo: todos los vivos dentro -- retrocede una planta
        // (o vuelve al lobby si ya estaba en la 1). Regenera la planta
        // anterior desde cero en vez de recordar el layout exacto que se
        // dejó atrás: es un "volver" simple, no un mapa de torre completo
        // con memoria (confirmado con el usuario, ver plan de la torre).
        if (G.escaleraAbajo) {
          G.escaleraAbajo.t += dt;
          const vsAbajo = vivos();
          const dentroAbajo = vsAbajo.filter(
            (q) =>
              Math.hypot(G.escaleraAbajo.x - q.x, G.escaleraAbajo.y - q.y) <
              G.escaleraAbajo.r + 12,
          ).length;
          G.escaleraAbajo.dentro = dentroAbajo;
          G.escaleraAbajo.total = vsAbajo.length;
          if (vsAbajo.length > 0 && dentroAbajo === vsAbajo.length) {
            if (G.planta <= 1) {
              iniciarLobby();
            } else {
              G.planta--;
              iniciarPlanta();
            }
            return;
          }
        }

        // ---- hazards: progresión de grietas y caducidad de telarañas ----
        for (let i = G.hazards.length - 1; i >= 0; i--) {
          const hz = G.hazards[i];
          if (hz.tipo === "grieta" && hz.estado === 1) {
            hz.t -= dt;
            if (hz.t <= 0) {
              hz.estado = 2;
              fxParticulas(hz.x, hz.y, 10, "#26232f");
              G.shake = Math.max(G.shake, 2);
            }
          }
          if (hz.ttl !== undefined) {
            hz.ttl -= dt;
            if (hz.ttl <= 0) G.hazards.splice(i, 1);
          }
          hz.fase += dt;
        }

        // ---- clima ----
        if (G.escena === "torre") {
          if (G.clima === "lluvia" || G.clima === "tormenta") {
            for (let k = 0; k < (G.clima === "tormenta" ? 4 : 2); k++)
              G.wx.push({
                x: rnd(0, W),
                y: -10,
                vy: rnd(420, 560),
                vx: rnd(-40, -15),
                t: 1.4,
                tipo: "gota",
              });
          } else if (G.clima === "ceniza") {
            if (Math.random() < 0.5)
              G.wx.push({
                x: rnd(0, W),
                y: -6,
                vy: rnd(25, 55),
                vx: rnd(-14, 14),
                t: 12,
                tipo: "ceniza",
                fase: rnd(0, TAU),
              });
          }
          if (G.clima === "tormenta") {
            G.rayoCd -= dt;
            if (G.rayoCd <= 0) {
              G.rayoCd = rnd(4.5, 8);
              // el rayo cae cerca de una entidad aleatoria
              const objetivo =
                Math.random() < 0.6
                  ? az(vivos())
                  : az(G.enemigos.filter((e) => !e.dummy));
              const rx = objetivo
                ? clamp(objetivo.x + rnd(-50, 50), 40, SALA_W - 40)
                : rnd(60, SALA_W - 60);
              const ry = objetivo
                ? clamp(objetivo.y + rnd(-50, 50), 40, SALA_H - 40)
                : rnd(60, SALA_H - 60);
              G.rayos.push({
                x: rx,
                y: ry,
                t: 0.85,
                meteoro: false,
                dmg: escalaEnemigo(Math.max(1, G.planta)).atkBase * 1.2,
              });
            }
          }
        }
        for (let i = G.wx.length - 1; i >= 0; i--) {
          const w2 = G.wx[i];
          w2.x += (w2.vx || 0) * dt;
          w2.y += w2.vy * dt;
          w2.t -= dt;
          if (w2.t <= 0 || w2.y > H + 10) G.wx.splice(i, 1);
        }
        // impactos telegrafiados: rayos de tormenta y meteoros de jefe
        if (G.flashT > 0) G.flashT -= dt;
        if (G.fadeT > 0) G.fadeT -= dt;
        for (let i = G.rayos.length - 1; i >= 0; i--) {
          const ry = G.rayos[i];
          ry.t -= dt;
          if (ry.t <= 0) {
            G.rayos.splice(i, 1);
            G.shake = Math.max(G.shake, 5);
            if (!ry.meteoro) G.flashT = 0.14;
            fxOnda(ry.x, ry.y, 46, ry.meteoro ? "#ff7d4d" : "#cfe4ff");
            fxParticulas(ry.x, ry.y, 14, ry.meteoro ? "#ff9d3d" : "#cfe4ff");
            // daña a jugadores Y enemigos
            for (const p of vivos())
              if (Math.hypot(p.x - ry.x, p.y - ry.y) < 46 + p.r)
                danoAlJugador(p, ry.dmg, { rayo: true });
            for (const e of G.enemigos) {
              if ((e.hp <= 0 && !e.dummy) || e.jefe) continue;
              if (Math.hypot(e.x - ry.x, e.y - ry.y) < 46 + e.r) {
                const rd = Math.max(1, Math.round(ry.dmg));
                if (e.dummy) {
                  e.hp = Math.max(1, e.hp - rd);
                  e.dmgLog.push({ t: G.stats.tiempo, d: rd });
                } else {
                  e.hp -= rd;
                  fxTexto(e.x, e.y - e.r - 6, rd, "#cfe4ff");
                  if (e.hp <= 0) matarEnemigo(e);
                }
              }
            }
            // los meteoros dejan suelo en llamas
            if (ry.meteoro)
              G.hazards.push({
                tipo: "fuegoZona",
                x: ry.x,
                y: ry.y,
                r: 26,
                estado: 0,
                t: 0,
                fase: 0,
                ttl: 6,
              });
          }
        }

        for (let i = G.fx.length - 1; i >= 0; i--) {
          G.fx[i].t -= dt;
          if (G.fx[i].t <= 0) G.fx.splice(i, 1);
        }
        for (let i = G.flechasClavadas.length - 1; i >= 0; i--) {
          const fc = G.flechasClavadas[i];
          fc.t -= dt;
          // clavada en un enemigo que ya murió: desaparece con él en vez
          // de quedarse flotando sola sobre las cenizas.
          if (fc.t <= 0 || (fc.enemigo && fc.enemigo.hp <= 0))
            G.flechasClavadas.splice(i, 1);
        }
        for (let i = G.toasts.length - 1; i >= 0; i--) {
          G.toasts[i].t -= dt;
          if (G.toasts[i].t <= 0) G.toasts.splice(i, 1);
        }
        if (G.banner.t > 0) G.banner.t -= dt;
        if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
        actualizarEstilo(dt);
      }
