// Auto-generated during the modularization refactor (2026-07-23).
import { H, W, cv, toggleFullscreen } from "../core/canvas.js";
import { LOBBIES, ORDEN_ROLES } from "../core/constants.js";
import { G } from "../core/state.js";
import { NET } from "../net/peer.js";
import { activarParry, atacar, castSup, cicloElem, esquivar, habilidad, transformar } from "./abilities.js";
import { aplicarMusica, initAudio, reanudarAudio } from "./audio.js";
import { abrirInfo, cerrarInfo } from "../ui/info.js";
import { cerrarInv, toggleInv } from "../ui/inventory.js";
import { construirMenu } from "../ui/menu.js";
import { cerrarArenaPvp } from "../ui/pvp.js";
import { abrirAjustes, cerrarAjustes, toggleSilencioRapido } from "../ui/settingsOverlay.js";
import { cerrarTienda } from "../ui/shop.js";
import { cerrarSkins } from "../ui/skins.js";

export const keys = {};

// Valores iniciales = mitad del lienzo (960x560, ver index.html). No se usa
// W/H aquí a propósito: este módulo se importa en un ciclo con core/canvas.js
// (vía ui/settingsOverlay.js) y en ese punto W/H todavía no se han
// inicializado — usar la constante importada lanzaría un
// "Cannot access before initialization".
export const mouse = { x: 480, y: 280, izq: false, der: false };

const prevBtns = {};

function safeGetGamepads() {
        try {
          return navigator.getGamepads ? navigator.getGamepads() : [];
        } catch (e) {
          return [];
        }
      }

export function leerInput(p) {
        if (p.ctrl.tipo === "kbm") {
          const mx = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
          const my = (keys["s"] ? 1 : 0) - (keys["w"] ? 1 : 0);
          return {
            mx,
            my,
            aimA: Math.atan2(mouse.y - p.y, mouse.x - p.x),
            atkHeld: mouse.izq,
            gtX: mouse.x,
            gtY: mouse.y,
          };
        }
        const gps = safeGetGamepads();
        const gp = gps[p.ctrl.idx];
        if (!gp)
          return {
            mx: 0,
            my: 0,
            aimA: p.aim,
            atkHeld: false,
            gtX: p.x + Math.cos(p.aim) * 160,
            gtY: p.y + Math.sin(p.aim) * 160,
          };
        const dz = (v) => (Math.abs(v) > 0.22 ? v : 0);
        const mx = dz(gp.axes[0] || 0),
          my = dz(gp.axes[1] || 0);
        const ax = dz(gp.axes[2] || 0),
          ay = dz(gp.axes[3] || 0);
        let aimA = p.aim,
          mag = 0.6;
        const m2 = Math.hypot(ax, ay);
        if (m2 > 0.3) {
          aimA = Math.atan2(ay, ax);
          mag = Math.min(1, m2);
        }
        const b7 = gp.buttons[7];
        const atkHeld = !!(b7 && (b7.pressed || b7.value > 0.4));
        const d = 80 + mag * 210;
        return {
          mx,
          my,
          aimA,
          atkHeld,
          gtX: p.x + Math.cos(aimA) * d,
          gtY: p.y + Math.sin(aimA) * d,
        };
      }

export function pollPads() {
        const gps = safeGetGamepads();
        for (let i = 0; i < gps.length; i++) {
          const gp = gps[i];
          if (!gp) continue;
          const prev = prevBtns[i] || [];
          const cur = gp.buttons.map((b) => b.pressed || b.value > 0.5);
          const edge = (j) => !!cur[j] && !prev[j];
          if (!G) {
            menuPad(i, edge);
          } else {
            // overlay abierto (ficha, tienda, skins, cartas, fin): el pad navega la interfaz
            const ovAb = overlayAbierto();
            if (ovAb) {
              if (edge(12) || edge(14)) padNavega(-1);
              if (edge(13) || edge(15)) padNavega(1);
              if (edge(0)) padActiva();
              if (edge(1)) padCierra();
              if (edge(9)) toggleInv();
              prevBtns[i] = cur;
              continue;
            }
            const p = G.players.find(
              (pl) => pl.ctrl.tipo === "pad" && pl.ctrl.idx === i,
            );
            if (p) {
              if (edge(9)) toggleInv();
              if (edge(8)) {
                initAudio();
                reanudarAudio();
                aplicarMusica();
                abrirAjustes();
              }
              if (G.activo && !G.pausa && !p.ko) {
                if (edge(6) || edge(4)) activarParry(p);
                if (edge(0)) esquivar(p);
                if (edge(3)) habilidad(p);
                if (p.rol === "mago") {
                  if (edge(2) || edge(15)) cicloElem(p, 1);
                  if (edge(14)) cicloElem(p, -1);
                }
                if (p.rol === "clerigo") {
                  if (edge(2)) castSup(p, 0);
                  if (edge(1)) castSup(p, 1);
                  if (edge(5)) castSup(p, 2);
                }
                if (p.rol === "druida") {
                  if (edge(2)) transformar(p, 0);
                  if (edge(1)) transformar(p, 1);
                  if (edge(5)) transformar(p, 2);
                }
              }
            }
          }
          prevBtns[i] = cur;
        }
      }

export const M = {
        slots: [
          { activo: true, ctrl: { tipo: "kbm" }, rolIdx: 0, listo: false, nombre: "" },
          { activo: false, ctrl: null, rolIdx: 1, listo: false, nombre: "" },
          { activo: false, ctrl: null, rolIdx: 2, listo: false, nombre: "" },
          { activo: false, ctrl: null, rolIdx: 3, listo: false, nombre: "" },
        ],
        lobby: null,
      };

const OVERLAYS_PAD = [
        "ajustes",
        "cartas-overlay",
        "info-overlay",
        "tienda",
        "skins",
        "arena-pvp",
        "inv",
        "fin",
      ];

let padFoco = 0;

function overlayAbierto() {
        for (const id of OVERLAYS_PAD) {
          const el = document.getElementById(id);
          if (el && !el.classList.contains("oculto")) return id;
        }
        return null;
      }

function botonesOverlay(ov) {
        return [
          ...document
            .getElementById(ov)
            .querySelectorAll("button:not([disabled])"),
        ].filter((b) => b.offsetParent !== null);
      }

function padNavega(d) {
        const ov = overlayAbierto();
        if (!ov) return;
        const botones = botonesOverlay(ov);
        if (!botones.length) return;
        document
          .querySelectorAll(".pad-foco")
          .forEach((el) => el.classList.remove("pad-foco"));
        padFoco =
          (((padFoco + d) % botones.length) + botones.length) % botones.length;
        botones[padFoco].classList.add("pad-foco");
        botones[padFoco].scrollIntoView({ block: "nearest" });
      }

function padActiva() {
        const ov = overlayAbierto();
        if (!ov) return;
        const botones = botonesOverlay(ov);
        const b = botones[Math.min(padFoco, botones.length - 1)];
        if (b) {
          b.click();
          setTimeout(() => padNavega(0), 60);
        } // el clic puede re-renderizar: re-enfocar
      }

function padCierra() {
        const ov = overlayAbierto();
        if (!ov) return;
        if (ov === "cartas-overlay" || ov === "fin") return; // las cartas se eligen, el fin no se esquiva
        if (ov === "inv") cerrarInv();
        else if (ov === "tienda") cerrarTienda();
        else if (ov === "skins") cerrarSkins();
        else if (ov === "arena-pvp") cerrarArenaPvp();
        else if (ov === "info-overlay") cerrarInfo();
        else if (ov === "ajustes") cerrarAjustes();
        padFoco = 0;
      }

function menuPad(idx, edge) {
        // overlay abierto en el menú (ej. info de habilidades): navegar con el pad
        if (overlayAbierto()) {
          if (edge(12) || edge(14)) padNavega(-1);
          if (edge(13) || edge(15)) padNavega(1);
          if (edge(0)) padActiva();
          if (edge(1)) padCierra();
          return;
        }
        const slot = M.slots.find(
          (s) =>
            s.activo && s.ctrl && s.ctrl.tipo === "pad" && s.ctrl.idx === idx,
        );
        if (!slot) {
          if (edge(0)) {
            const libre = M.slots.find((s) => !s.activo);
            if (libre) {
              libre.activo = true;
              libre.ctrl = { tipo: "pad", idx };
              libre.listo = false;
              construirMenu();
            }
          }
          return;
        }
        let cambio = false;
        if (!slot.listo) {
          if (edge(14)) {
            slot.rolIdx =
              (slot.rolIdx + ORDEN_ROLES.length - 1) % ORDEN_ROLES.length;
            cambio = true;
          }
          if (edge(15)) {
            slot.rolIdx = (slot.rolIdx + 1) % ORDEN_ROLES.length;
            cambio = true;
          }
        }
        if (edge(0)) {
          slot.listo = !slot.listo;
          cambio = true;
        }
        if (edge(1)) {
          if (slot.listo) slot.listo = false;
          else {
            slot.activo = false;
            slot.ctrl = null;
          }
          cambio = true;
        }
        // X: info de habilidades de la clase actual
        if (edge(2)) abrirInfo(ORDEN_ROLES[slot.rolIdx]);
        // dpad arriba/abajo: elegir lobby
        if (edge(12) || edge(13)) {
          const ids = Object.keys(LOBBIES);
          const i2 = Math.max(0, ids.indexOf(M.lobby));
          M.lobby =
            ids[
              (((i2 + (edge(13) ? 1 : -1)) % ids.length) + ids.length) %
                ids.length
            ];
          cambio = true;
        }
        // Start: entrar en la Torre si todos están listos
        if (edge(9)) {
          const be = document.getElementById("btn-empezar");
          if (be && !be.disabled) be.click();
        }
        if (cambio) construirMenu();
      }

function jugadorKbm() {
        return G ? G.players.find((p) => p.ctrl.tipo === "kbm") : null;
      }

window.addEventListener("keydown", (e) => {
        const k = e.key.toLowerCase();
        keys[k] = true;
        // atajos globales (funcionan siempre)
        if (k === "f") {
          e.preventDefault();
          toggleFullscreen();
          return;
        }
        if (k === "g") {
          e.preventDefault();
          initAudio();
          reanudarAudio();
          aplicarMusica();
          if (document.getElementById("ajustes").classList.contains("oculto"))
            abrirAjustes();
          else cerrarAjustes();
          return;
        }
        if (
          k === "escape" &&
          !document.getElementById("ajustes").classList.contains("oculto")
        ) {
          cerrarAjustes();
          return;
        }
        if (k === "m" && (G || document.getElementById("menu"))) {
          toggleSilencioRapido();
        }
        if (!G || !G.activo) return;
        if (k === "tab") {
          e.preventDefault();
          toggleInv();
          return;
        }
        if (G.pausa) {
          if (k === "escape") {
            if (
              !document
                .getElementById("cartas-overlay")
                .classList.contains("oculto")
            )
              return; // no cerrar si hay cartas
            if (
              !document.getElementById("tienda").classList.contains("oculto")
            ) {
              cerrarTienda();
              return;
            }
            if (
              !document.getElementById("skins").classList.contains("oculto")
            ) {
              cerrarSkins();
              return;
            }
            cerrarInv();
          }
          return;
        }
        const p = jugadorKbm();
        if (!p || p.ko) return;
        if (k === " ") {
          e.preventDefault();
          esquivar(p);
        }
        if (k === "e") habilidad(p);
        if (p.rol === "mago") {
          if (k === "1") p.elemento = "fuego";
          if (k === "2") p.elemento = "hielo";
          if (k === "3") p.elemento = "arcano";
        }
        if (p.rol === "clerigo") {
          if (k === "1") castSup(p, 0);
          if (k === "2") castSup(p, 1);
          if (k === "3") castSup(p, 2);
        }
        if (p.rol === "druida") {
          if (k === "1") transformar(p, 0);
          if (k === "2") transformar(p, 1);
          if (k === "3") transformar(p, 2);
        }
      });

window.addEventListener("keyup", (e) => {
        keys[e.key.toLowerCase()] = false;
      });

window.addEventListener("blur", () => {
        for (const k in keys) keys[k] = false;
        mouse.izq = false;
      });

document.addEventListener("keydown", (e) => {
        if (
          e.key === "Escape" &&
          !document.getElementById("info-overlay").classList.contains("oculto")
        )
          cerrarInfo();
      });

function coordsRaton(e) {
        const r = cv.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) * (W / r.width);
        mouse.y = (e.clientY - r.top) * (H / r.height);
      }

cv.addEventListener("mousemove", coordsRaton);

cv.addEventListener("mousedown", (e) => {
        coordsRaton(e);
        // en modo cliente solo registramos el estado del ratón (se envía como input)
        if (NET.modo === "cliente") {
          if (e.button === 0) mouse.izq = true;
          if (e.button === 2) mouse.der = true;
          return;
        }
        if (!G || !G.activo || G.pausa) return;
        const p = jugadorKbm();
        if (!p || p.ko) return;
        if (e.button === 0) {
          mouse.izq = true;
          atacar(p);
        }
        if (e.button === 2) {
          mouse.der = true;
          activarParry(p);
        }
      });

window.addEventListener("mouseup", (e) => {
        if (e.button === 0) mouse.izq = false;
        if (e.button === 2) mouse.der = false;
      });

cv.addEventListener("contextmenu", (e) => e.preventDefault());

try {
        window.addEventListener("gamepadconnected", () => {
          construirMenu && !G && construirMenu();
        });
      } catch (e) {}
