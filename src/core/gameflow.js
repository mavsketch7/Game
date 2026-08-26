// Auto-generated during the modularization refactor (2026-07-23).
import { H, W } from "./canvas.js";
import { COLORES_J, ORDEN_ROLES, ROLES, SLOTS, XP_TABLA } from "./constants.js";
import { META } from "./save.js";
import { AJ } from "./settings.js";
import { G, setG } from "./state.js";
import { NET, netBroadcast } from "../net/peer.js";
import {
  ajustarVolumenAmbienteEnPartida,
  aplicarMusica,
  detenerMusicaJefe,
  initAudio,
  reanudarAudio,
} from "../systems/audio.js";
import { statsTot } from "../systems/combat.js";
import { M } from "../systems/input.js";
import { abrirInv, cerrarInv, invSel } from "../ui/inventory.js";
import { banner, toast } from "../ui/notifications.js";
import { ocultar } from "../ui/overlays.js";

export function nuevaPartida() {
        initAudio();
        reanudarAudio();
        aplicarMusica();
        // La ambiental ya NO se corta al empezar a jugar -- sigue de
        // fondo, solo más baja (pedido explícito del usuario). Vuelve a
        // su volumen normal al terminar la run y regresar al menú (ver
        // reiniciar() en systems/loot.js).
        ajustarVolumenAmbienteEnPartida(true);
        const players = [];
        M.slots.forEach((s, i) => {
          if (!s.activo) return;
          const rol = ORDEN_ROLES[s.rolIdx],
            b = ROLES[rol];
          players.push({
            idx: players.length,
            color: COLORES_J[i],
            nombre: (s.nombre && s.nombre.trim().slice(0, 14)) || "J" + (i + 1),
            gremio: s.gremio ? s.gremio.name : null,
            gremioId: s.gremio ? s.gremio.id : null,
            ctrl: s.ctrl,
            rol,
            x: 0,
            y: 0,
            r: 17,
            hp: b.hp,
            res: b.res,
            escudo: 0,
            aim: -Math.PI / 2,
            inp: { mx: 0, my: 0, atkHeld: false },
            atkCd: 0,
            castCd: 0,
            skillCd: 0,
            supCd: [0, 0, 0],
            dashT: 0,
            dashCd: 0,
            dashX: 0,
            dashY: 1,
            // Estocada (dash-ataque del guerrero, ver systems/abilities.js:
            // dashAtaque()) -- estado propio, separado del esquive de arriba.
            dashAtkT: 0,
            dashAtkCd: 0,
            dashAtkX: 0,
            dashAtkY: 1,
            atkEspecial: false,
            _dashAtkVictims: null,
            _cargaSrc: null, // control del sonido de tensar en curso (arquero), ver core/loop.js
            _cargaSrcT0: null, // instante en que empezó, ver TENSADO_MIN_AUDIBLE_MS en systems/abilities.js
            pasoT: 0, // cadencia del sonido de paso, ver core/loop.js
            disparoCd: 0,
            invulT: 0,
            parryT: 0,
            parryCd: 0,
            parryCombo: 0,
            parryComboT: 0,
            golpeT: 0,
            swingT: 0,
            anim: Math.random() * 9,
            trail: [],
            hasteT: 0,
            elemento: "fuego",
            ko: false,
            reviveT: 0,
            koAnimT: 0, // tiempo tumbándose desde que empezó el K.O., ver render/character.js
            // niveles
            nivel: 1,
            xp: 0,
            xpSig: XP_TABLA[1],
            cartasPendientes: 0,
            // bonuses por cartas
            _bonusHP: 0,
            _bonusAtk: 0,
            _bonusArmor: 0,
            _bonusVel: 0,
            _bonusCrit: 0,
            _bonusCdr: 0,
            _hasteBonus: 0,
            _doubleUlti: false,
            _parryHeal: 0,
            _pierceProy: 0,
            _areaDurMult: 1,
            _areaRadMult: 1,
            _healBonus: 1,
            _egidaBonus: 1,
            _ultCdMult: 1,
            _poison: false,
            _dashDmg: false,
            _dashVictims: null,
            forma: "humano",
            formCd: 0,
            _formHeal: 0,
            _formDmg: 1,
            cargaT: 0,
            cargaArqT: 0, // disparo cargado del arquero, ver dispararFlechaCargada en systems/abilities.js
            cargaCuchT: 0, // cuchillo cargado del pícaro, ver lanzarCuchillo en systems/abilities.js
            cuchilloCd: 0,
            combo: 0,
            comboT: 0,
            certera: false,
            focoE: null,
            focoN: 0,
            imbuido: null,
            atrapado: null,
            qteT: 0,
            qteHits: 0,
            rescT: 0,
            cofreObj: null,
            dropObj: null,
            secretoObj: null,
            secretoParedObj: null,
            _retoAvisoT: 0,
            rootT: 0,
            hazTick: 0,
            enOrtiga: false,
            congelado: false,
            safeX: 0,
            safeY: 0,
            fusionSel: [],
            lvlT: 0,
            cartasElegidas: [],
            bolsa: [],
            equipo: Object.fromEntries(SLOTS.map((s) => [s, null])),
            // estadísticas de la sesión actual, para el ranking en vivo (Tab)
            statDano: 0,
            statDerrotados: 0,
            statParries: 0,
          });
        });
        setG({
          activo: true,
          pausa: false,
          planta: 0,
          escena: "lobby",
          lobby: M.lobby,
          players,
          ff: AJ.fuegoAmigo,
          enemigos: [],
          projs: [],
          areas: [],
          drops: [],
          fx: [],
          pilares: [],
          objetos: [],
          decals: [],
          flechasClavadas: [],
          hazards: [],
          clima: "despejado",
          wx: [],
          rayos: [],
          rayoCd: 0,
          flashT: 0,
          fadeT: 0,
          forma: "sala",
          muros: [],
          mazmorra: null,
          puertas: [],
          salaTipo: "normal",
          salaEsFinal: false,
          portal: null,
          fogata: null,
          fogataUsada: false,
          descansoT: 0,
          mercader: null,
          tiendaLock: false,
          skinNpc: null,
          skinLock: false,
          arenaNpc: null,
          arenaLock: false,
          yunqueNpc: null,
          yunqueLock: false,
          oroRun: 0,
          shake: 0,
          hitStopT: 0, // "juice" de combate -- ver systems/juice.js + main.js
          estilo: { puntos: 0, rango: 0, rangoT: 0, decayT: 0 }, // rango de estilo D..EXTREMO, ver systems/juice.js
          banner: { txt: "", t: 0 },
          toasts: [],
          invSel: 0,
          stats: { derrotados: 0, parries: 0, dano: 0, tiempo: 0 },
          modo: "torre",
        });
        ocultar("menu");
        iniciarLobby();
        if (NET.modo === "host") netBroadcast({ t: "inicio" });
      }

export function iniciarLobby() {
        // por si se abandona la partida estando en la sala de un jefe
        // (ver abandonarPartida() más abajo) -- no-op si no estaba sonando.
        detenerMusicaJefe();
        G.escena = "lobby";
        G.planta = 0;
        G.estilo = { puntos: 0, rango: 0, rangoT: 0, decayT: 0 };
        G.enemigos = [];
        G.projs = [];
        G.areas = [];
        G.drops = [];
        G.fx = [];
        G.objetos = [];
        G.decals = [];
        G.flechasClavadas = [];
        G.hazards = [];
        G.clima = "despejado";
        G.wx = [];
        G.rayos = [];
        G.forma = "sala";
        G.muros = [];
        G.mazmorra = null;
        G.puertas = [];
        G.salaTipo = "normal";
        G.salaEsFinal = false;
        G.portal = { x: W / 2, y: 64, r: 24, t: 0 };
        G.fogata = null;
        G.fogataUsada = true;
        G.pilares = [];
        G.mercader = { x: W - 130, y: H / 2 - 40 };
        G.skinNpc = { x: 110, y: H / 2 - 40 };
        G.arenaNpc = { x: W / 2, y: H - 130 };
        G.yunqueNpc = { x: W - 130, y: 90 };
        // Cofre de pruebas (QA): solo aparece con ?qa=1 en la URL -- a
        // propósito NO depende de import.meta.env.DEV para que se pueda
        // activar también en el build de producción sin tener que montar
        // un entorno de desarrollo aparte. Suelta el set completo de
        // objetos Míticos al abrirse (ver interactuar() en abilities.js).
        if (new URLSearchParams(location.search).get("qa") === "1") {
          G.objetos.push({
            tipo: "cofre",
            x: W / 2,
            y: H - 220,
            abierto: false,
            abriendoT: 0,
            qa: true,
          });
          // NPC de pruebas (QA): sube un nivel a todo el grupo cada vez que
          // te acercas (y otra vez si te alejas y vuelves) -- para probar
          // las tarjetas de mejora sin tener que jugar plantas enteras. Ver
          // el disparador de proximidad en core/loop.js.
          G.nivelNpc = { x: 250, y: 90 };
          // Portal de pruebas (QA): salta directo a la planta 5 (el
          // Guardián de Hielo) sin tener que bajar 4 plantas primero. Ver
          // el disparador de proximidad en core/loop.js.
          G.jefeNpcQA = { x: 250, y: 160 };
        }
        G.tiendaLock = false;
        G.skinLock = false;
        G.arenaLock = false;
        G.nivelLock = false;
        G.yunqueLock = false;
        const N = G.players.length;
        G.players.forEach((p, i) => {
          p.x = W / 2 + (i - (N - 1) / 2) * 46;
          p.y = H - 80;
          p.trail = [];
          p.hp = statsTot(p).hpMax;
          p.res = ROLES[p.rol].res;
          p.atrapado = null;
          p.rootT = 0;
          p.safeX = p.x;
          p.safeY = p.y;
          p.fusionSel = [];
        });
        // muñecos de prueba (no mueren, muestran DPS)
        for (let i = 0; i < 3; i++) {
          G.enemigos.push({
            dummy: true,
            tipo: "dummy",
            nombre: "Muñeco",
            x: 150 + i * 110,
            y: H / 2 + 30,
            r: 15,
            hp: 99999,
            hpMax: 99999,
            atk: 0,
            vel: 0,
            atkCd: 99,
            shootCd: 99,
            patCd: 99,
            stunT: 0,
            hurtT: 0,
            slowT: 0,
            kx: 0,
            ky: 0,
            fase: 0,
            dmgLog: [],
          });
        }
        // braseros decorativos
        G.objetos.push(
          { tipo: "brasero", x: 80, y: 100 },
          { tipo: "brasero", x: W - 80, y: 100 },
        );
        banner("Vestíbulo del Gremio — probad, comprad y entrad al portal");
        toast(
          "El mercader (" + META.oro + " 🪙 disponibles) espera a la derecha",
          "#ffd27f",
        );
      }

export function abandonarPartida() {
        if (!G || G.escena !== "torre") return;
        if (!G.confirmAband) {
          G.confirmAband = true;
          abrirInv();
          return;
        }
        G.confirmAband = false;
        const perdido = Math.ceil(G.oroRun * 0.5);
        G.oroRun -= perdido;
        cerrarInv();
        iniciarLobby();
        banner("Retirada al lobby… la Torre cobra su peaje");
        toast(
          "🏳 Habéis abandonado. Peaje de la Torre: −" +
            perdido +
            " 🪙 (os quedan " +
            G.oroRun +
            ")",
          "#d1545c",
        );
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.abandonarPartida = abandonarPartida;
