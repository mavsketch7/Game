// Auto-generated during the modularization refactor (2026-07-23).
import { H } from "../core/canvas.js";
import { META } from "../core/save.js";
import { G, setG } from "../core/state.js";
import { render } from "../render/world.js";
import { activarParry, castSup, esquivar, habilidad, transformar } from "../systems/abilities.js";
import { statsTot } from "../systems/combat.js";
import { M, keys, mouse } from "../systems/input.js";
import { invSel } from "../ui/inventory.js";
import { construirMenu } from "../ui/menu.js";
import { banner, toast } from "../ui/notifications.js";
import { ocultar } from "../ui/overlays.js";

export const NET = {
        activo: false,
        modo: null,
        peer: null,
        conn: null,
        conns: [],
        sala: null,
        snap: null,
        snapG: null,
        inputRemoto: {},
        prevRemoto: {},
        miIdx: 0,
        lastSend: 0,
        estado: "idle",
        rolElegido: 0,
      };

function cargarPeerJS(cb) {
        if (window.Peer) {
          cb(true);
          return;
        }
        const s = document.createElement("script");
        s.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
        s.onload = () => cb(!!window.Peer);
        s.onerror = () => cb(false);
        document.head.appendChild(s);
      }

function idSala() {
        return "vespero-" + Math.random().toString(36).slice(2, 7);
      }

function toastNet(msg, col) {
        if (typeof toast === "function" && G) {
          toast(msg, col || "#7fd4c1");
        }
        const el = document.getElementById("net-estado");
        if (el) el.textContent = msg;
      }

export function crearSalaOnline() {
        const btn = document.getElementById("net-estado");
        if (btn) btn.textContent = "Cargando módulo online…";
        cargarPeerJS((ok) => {
          if (!ok) {
            toastNet(
              "⚠ No se pudo cargar el online (¿sin conexión?). El juego local sigue disponible.",
              "#d1545c",
            );
            return;
          }
          const id = idSala();
          NET.peer = new Peer(id, { debug: 1 });
          NET.peer.on("open", () => {
            NET.activo = true;
            NET.modo = "host";
            NET.sala = id;
            const enlace = location.href.split("#")[0] + "#sala=" + id;
            const box = document.getElementById("net-enlace");
            if (box) {
              box.style.display = "block";
              box.querySelector("input").value = enlace;
            }
            toastNet(
              "🟢 Sala creada. Comparte el enlace. Jugadores conectados: 0",
              "#7fd4c1",
            );
          });
          NET.peer.on("connection", (conn) => {
            NET.conns.push(conn);
            conn.on("data", (d) => onDataHost(conn, d));
            conn.on("close", () => {
              NET.conns = NET.conns.filter((c) => c !== conn);
              const s = M.slots.find(
                (s) =>
                  s.activo &&
                  s.ctrl &&
                  s.ctrl.tipo === "net" &&
                  s.ctrl.connId === conn.peer,
              );
              if (s) {
                s.activo = false;
                s.ctrl = null;
                construirMenu();
              }
              toastNet(
                "Un jugador se desconectó. Conectados: " + NET.conns.length,
                "#c9a35a",
              );
            });
          });
          NET.peer.on("error", (e) => {
            toastNet("Error de red: " + e.type, "#d1545c");
          });
        });
      }

function onDataHost(conn, d) {
        if (d.t === "join") {
          // asignar un slot libre de tipo net
          let s = M.slots.find(
            (x) =>
              x.activo &&
              x.ctrl &&
              x.ctrl.tipo === "net" &&
              x.ctrl.connId === conn.peer,
          );
          if (!s) s = M.slots.find((x) => !x.activo);
          if (s) {
            s.activo = true;
            s.ctrl = { tipo: "net", connId: conn.peer };
            s.rolIdx = d.rol || 0;
            s.listo = !!d.listo;
            construirMenu();
          }
          conn.send({ t: "welcome", idx: M.slots.indexOf(s) });
          toastNet(
            "🟢 Jugador conectado. Total: " + NET.conns.length,
            "#7fd4c1",
          );
        } else if (d.t === "rol") {
          const s = M.slots.find(
            (x) =>
              x.activo &&
              x.ctrl &&
              x.ctrl.tipo === "net" &&
              x.ctrl.connId === conn.peer,
          );
          if (s) {
            s.rolIdx = d.rol;
            s.listo = d.listo;
            construirMenu();
          }
        } else if (d.t === "input") {
          NET.inputRemoto[conn.peer] = d;
        }
      }

export function netBroadcast(obj) {
        for (const c of NET.conns) {
          if (c.open) c.send(obj);
        }
      }

export function netAplicarInputs() {
        if (NET.modo !== "host") return;
        for (const p of G.players) {
          if (p.ctrl.tipo !== "net") continue;
          const d = NET.inputRemoto[p.ctrl.connId];
          if (!d) continue;
          const pv = NET.prevRemoto[p.ctrl.connId] || {};
          p.inp.mx = d.mx || 0;
          p.inp.my = d.my || 0;
          p.inp.atkHeld = !!d.atk;
          if (typeof d.aim === "number") p.aim = d.aim;
          if (!p.ko && !G.pausa) {
            if (d.parry && !pv.parry) activarParry(p);
            if (d.dash && !pv.dash) esquivar(p);
            if (d.ulti && !pv.ulti) habilidad(p);
            const eKey = (n) => d["k" + n] && !pv["k" + n];
            if (p.rol === "mago") {
              if (eKey(1)) p.elemento = "fuego";
              if (eKey(2)) p.elemento = "hielo";
              if (eKey(3)) p.elemento = "arcano";
            } else if (p.rol === "clerigo") {
              if (eKey(1)) castSup(p, 0);
              if (eKey(2)) castSup(p, 1);
              if (eKey(3)) castSup(p, 2);
            } else if (p.rol === "druida") {
              if (eKey(1)) transformar(p, 0);
              if (eKey(2)) transformar(p, 1);
              if (eKey(3)) transformar(p, 2);
            }
          }
          NET.prevRemoto[p.ctrl.connId] = { ...d };
        }
      }

export function unirseSalaOnline(id) {
        cargarPeerJS((ok) => {
          if (!ok) {
            alert(
              "No se pudo cargar el módulo online. ¿Tienes conexión a internet?",
            );
            return;
          }
          NET.peer = new Peer({ debug: 1 });
          NET.peer.on("open", () => {
            const conn = NET.peer.connect(id, { reliable: false });
            NET.conn = conn;
            conn.on("open", () => {
              NET.activo = true;
              NET.modo = "cliente";
              NET.sala = id;
              conn.send({ t: "join", rol: NET.rolElegido || 0, listo: false });
              mostrarEsperaCliente();
            });
            conn.on("data", (d) => onDataCliente(d));
            conn.on("close", () => {
              alert("Desconectado de la sala.");
              location.hash = "";
              location.reload();
            });
          });
          NET.peer.on("error", (e) => {
            alert(
              "No se pudo conectar a la sala (" +
                e.type +
                "). ¿El host sigue activo?",
            );
          });
        });
      }

function onDataCliente(d) {
        if (d.t === "welcome") {
          NET.miIdx = d.idx;
        } else if (d.t === "estado") {
          recibirSnapshot(d.s);
        } else if (d.t === "inicio") {
          ocultar("menu");
        } else if (d.t === "fin") {
          /* el host controla el fin */
        }
      }

function mostrarEsperaCliente() {
        const el = document.getElementById("net-estado");
        if (el)
          el.innerHTML =
            "🟢 Conectado. Esperando a que el anfitrión inicie la partida…";
        const b = document.getElementById("btn-unirse");
        if (b) b.textContent = "Conectado ✔";
      }

function serPlayer(p) {
        const t = statsTot(p);
        return {
          idx: p.idx,
          rol: p.rol,
          nombre: p.nombre,
          color: p.color,
          x: p.x,
          y: p.y,
          aim: p.aim,
          hp: p.hp,
          res: p.res,
          nivel: p.nivel,
          ko: p.ko,
          reviveT: p.reviveT,
          swingT: p.swingT,
          golpeT: p.golpeT,
          anim: p.anim,
          forma: p.forma,
          escudo: p.escudo,
          invulT: p.invulT,
          parryT: p.parryT,
          dashT: p.dashT,
          atrapadoB: !!p.atrapado,
          rootT: p.rootT,
          qteT: p.qteT,
          qteHits: p.qteHits,
          rescT: p.rescT,
          imbuido: p.imbuido,
          combo: p.combo,
          certera: p.certera,
          cargaT: p.cargaT,
          elemento: p.elemento,
          trail: (p.trail || []).map((tr) => ({ x: tr.x, y: tr.y, t: tr.t })),
          lvlT: p.lvlT,
          cartasPendientes: p.cartasPendientes,
          eqR: {
            a: p.equipo.arma ? p.equipo.arma.rareza : -1,
            r: p.equipo.armadura ? p.equipo.armadura.rareza : -1,
            c: p.equipo.accesorio ? p.equipo.accesorio.rareza : -1,
          },
          skin: META.skins.equipada[p.rol] || "",
          ns: {
            hpMax: t.hpMax,
            atk: t.atk,
            armor: t.armor,
            vel: t.vel,
            crit: t.crit,
            cdr: t.cdr,
            res: t.res,
            resNombre: t.resNombre,
          },
        };
      }

function serEnemigo(e) {
        return {
          tipo: e.tipo,
          x: e.x,
          y: e.y,
          r: e.r,
          hp: e.hp,
          hpMax: e.hpMax,
          jefe: e.jefe,
          mini: e.mini,
          elite: e.elite,
          cerdo: e.cerdo,
          arquetipo: e.arquetipo,
          clonRol: e.clonRol,
          ranged: e.ranged,
          nombre: e.nombre,
          hurtT: e.hurtT,
          slowT: e.slowT,
          poisonT: e.poisonT,
          burnT: e.burnT,
          telT: e.telT,
          fuseT: e.fuseT,
          rabioso: e.rabioso,
          gemelo: e.gemelo,
          rushT: e.rushT,
          portalT: e.portalT,
          stunT: e.stunT,
        };
      }

function serializarEstado() {
        return {
          pl: G.planta,
          md: G.modo,
          es: G.escena,
          cl: G.clima,
          fo: G.forma,
          mu: G.muros,
          sh: G.shake,
          fl: G.flashT,
          oro: G.oroRun,
          bn: G.banner,
          ts: (G.toasts || []).slice(-3),
          P: G.players.map(serPlayer),
          E: G.enemigos.map(serEnemigo),
          R: G.projs.map((pr) => ({
            x: pr.x,
            y: pr.y,
            tipo: pr.tipo,
            color: pr.color,
            r: pr.r,
            vx: pr.vx,
            vy: pr.vy,
            carga: pr.carga,
            owner: pr.owner,
          })),
          A: G.areas.map((a) => ({
            x: a.x,
            y: a.y,
            r: a.r,
            clase: a.clase,
            elemento: a.elemento,
            color: a.color,
            ttl: a.ttl,
            nace: a.nace,
            tick: a.tick,
          })),
          D: G.drops.map((dr) => ({
            x: dr.x,
            y: dr.y,
            tipo: dr.tipo,
            val: dr.val,
            rar: dr.item ? dr.item.rareza : -1,
          })),
          H: G.hazards.map((h) => ({
            tipo: h.tipo,
            x: h.x,
            y: h.y,
            r: h.r,
            estado: h.estado,
            fase: h.fase,
          })),
          PI: G.pilares.map((pl) => ({
            x: pl.x,
            y: pl.y,
            r: pl.r,
            destructible: pl.destructible,
            hp: pl.hp,
            hpMax: pl.hpMax,
            hurtT: pl.hurtT,
          })),
          O: G.objetos.map((o) => ({
            tipo: o.tipo,
            x: o.x,
            y: o.y,
            abierto: o.abierto,
            hp: o.hp,
          })),
          RY: G.rayos.map((r) => ({
            x: r.x,
            y: r.y,
            t: r.t,
            meteoro: r.meteoro,
          })),
          WX: G.wx.map((w) => ({
            x: w.x,
            y: w.y,
            tipo: w.tipo,
            vx: w.vx,
            vy: w.vy,
            fase: w.fase,
          })),
          PT: G.portal,
          ME: G.mercader,
          SN: G.skinNpc,
          AN: G.arenaNpc,
          FG: G.fogata,
          FX: (G.fx || []).slice(-30),
        };
      }

export function netEnviarSnapshot() {
        if (NET.modo !== "host" || !G) return;
        const ahora = performance.now();
        if (ahora - NET.lastSend < 66) return; // ~15 Hz
        NET.lastSend = ahora;
        netBroadcast({ t: "estado", s: serializarEstado() });
      }

function recibirSnapshot(s) {
        // players con defaults para que render() no falle
        const players = s.P.map((sp) => ({
          ...sp,
          ctrl: { tipo: "net" },
          inp: { mx: sp.inp ? 0 : 0, my: 0, atkHeld: false },
          equipo: {
            arma: sp.eqR.a >= 0 ? { rareza: sp.eqR.a } : null,
            armadura: sp.eqR.r >= 0 ? { rareza: sp.eqR.r } : null,
            accesorio: sp.eqR.c >= 0 ? { rareza: sp.eqR.c } : null,
          },
          atrapado: sp.atrapadoB ? {} : null,
          supCd: [0, 0, 0],
          skillCd: 0,
          parryCd: 0,
          parryCombo: 0,
          parryComboT: 0,
          dashCd: 0,
          atkCd: 0,
          castCd: 0,
          formCd: 0,
          comboT: 0,
          bolsa: [],
          cartasElegidas: [],
          fusionSel: [],
          _dashVictims: null,
          _netStats: sp.ns,
        }));
        const G2 = {
          activo: true,
          pausa: false,
          planta: s.pl,
          modo: s.md,
          escena: s.es,
          clima: s.cl,
          forma: s.fo,
          muros: s.mu,
          shake: s.sh,
          flashT: s.fl,
          oroRun: s.oro,
          banner: s.bn,
          toasts: s.ts || [],
          players,
          enemigos: s.E,
          projs: s.R,
          areas: s.A,
          drops: s.D,
          hazards: s.H,
          pilares: s.PI,
          objetos: s.O,
          rayos: s.RY,
          wx: s.WX,
          portal: s.PT,
          mercader: s.ME,
          skinNpc: s.SN,
          arenaNpc: s.AN,
          fogata: s.FG,
          fx: s.FX,
          decals: [],
          lobby: "buenos",
          invSel: 0,
          stats: { tiempo: 0, derrotados: 0, parries: 0, dano: 0 },
          ff: false,
          rayoCd: 0,
          descansoT: 0,
          fogataUsada: false,
          tiendaLock: false,
          skinLock: false,
        };
        NET.snap = s;
        NET.snapG = G2;
        if (G !== G2) setG(G2);
        // por si el paquete "inicio" se perdió en el canal no fiable de
        // PeerJS: en cuanto llega el primer estado real de partida, se
        // oculta el menú igualmente (recibir estado implica que ya empezó).
        ocultar("menu");
      }

export function netEnviarInputCliente() {
        if (NET.modo !== "cliente" || !NET.conn || !NET.conn.open) return;
        const mi =
          NET.snap && NET.snap.P
            ? NET.snap.P.find((p) => p.idx === NET.miIdx)
            : null;
        let aim = 0;
        if (mi) {
          aim = Math.atan2(mouse.y - mi.y, mouse.x - mi.x);
        }
        const mx =
          (keys["d"] || keys["arrowright"] ? 1 : 0) -
          (keys["a"] || keys["arrowleft"] ? 1 : 0);
        const my =
          (keys["s"] || keys["arrowdown"] ? 1 : 0) -
          (keys["w"] || keys["arrowup"] ? 1 : 0);
        NET.conn.send({
          t: "input",
          mx,
          my,
          aim,
          atk: !!mouse.izq,
          parry: !!mouse.der,
          dash: !!keys[" "],
          ulti: !!keys["e"],
          k1: !!keys["1"],
          k2: !!keys["2"],
          k3: !!keys["3"],
        });
      }
