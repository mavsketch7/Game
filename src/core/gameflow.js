// Auto-generated during the modularization refactor (2026-07-23).
import { H, W } from "./canvas.js";
import { COLORES_J, ORDEN_ROLES, ROLES, XP_TABLA } from "./constants.js";
import { META } from "./save.js";
import { G, setG } from "./state.js";
import { NET, netBroadcast } from "../net/peer.js";
import { aplicarMusica, initAudio, reanudarAudio } from "../systems/audio.js";
import { statsTot } from "../systems/combat.js";
import { M } from "../systems/input.js";
import { abrirInv, cerrarInv, invSel } from "../ui/inventory.js";
import { banner, toast } from "../ui/notifications.js";
import { ocultar } from "../ui/overlays.js";

export function nuevaPartida() {
        initAudio();
        reanudarAudio();
        aplicarMusica();
        const nombre1 = (document.getElementById("input-nombre").value || "J1")
          .trim()
          .slice(0, 14);
        const players = [];
        M.slots.forEach((s, i) => {
          if (!s.activo) return;
          const rol = ORDEN_ROLES[s.rolIdx],
            b = ROLES[rol];
          players.push({
            idx: players.length,
            color: COLORES_J[i],
            nombre: i === 0 ? nombre1 : "J" + (i + 1),
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
            rootT: 0,
            hazTick: 0,
            enOrtiga: false,
            safeX: 0,
            safeY: 0,
            fusionSel: [],
            lvlT: 0,
            cartasElegidas: [],
            bolsa: [],
            equipo: { arma: null, armadura: null, accesorio: null },
          });
        });
        setG({
          activo: true,
          pausa: false,
          planta: 0,
          escena: "lobby",
          lobby: M.lobby,
          players,
          ff: document.getElementById("chk-ff").checked,
          enemigos: [],
          projs: [],
          areas: [],
          drops: [],
          fx: [],
          pilares: [],
          objetos: [],
          decals: [],
          hazards: [],
          clima: "despejado",
          wx: [],
          rayos: [],
          rayoCd: 0,
          flashT: 0,
          forma: "sala",
          muros: [],
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
          oroRun: 0,
          shake: 0,
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
        G.escena = "lobby";
        G.planta = 0;
        G.enemigos = [];
        G.projs = [];
        G.areas = [];
        G.drops = [];
        G.fx = [];
        G.objetos = [];
        G.decals = [];
        G.hazards = [];
        G.clima = "despejado";
        G.wx = [];
        G.rayos = [];
        G.forma = "sala";
        G.muros = [];
        G.portal = { x: W / 2, y: 64, r: 24, t: 0 };
        G.fogata = null;
        G.fogataUsada = true;
        G.pilares = [];
        G.mercader = { x: W - 130, y: H / 2 - 40 };
        G.skinNpc = { x: 110, y: H / 2 - 40 };
        G.arenaNpc = { x: W / 2, y: H - 130 };
        G.tiendaLock = false;
        G.skinLock = false;
        G.arenaLock = false;
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
