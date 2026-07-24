// Auto-generated during the modularization refactor (2026-07-23).
import { COLORES_J, LOBBIES, ORDEN_ROLES, ROLES } from "../core/constants.js";
import { nuevaPartida } from "../core/gameflow.js";
import { MEJORAS_TIENDA, META } from "../core/save.js";
import { NET, crearSalaOnline, enviarRolPropio, netEnviarLobby, unirseSalaOnline } from "../net/peer.js";
import { SPR } from "../render/sprites.js";
import { M } from "../systems/input.js";
import { abrirInfo } from "./info.js";

// Fondo inmersivo del menú (misma ilustración que la pantalla de inicio),
// fijado una sola vez desde JS en vez de en el CSS: así respeta el `base`
// relativo de vite.config.js igual que assetUrl() en render/sprites.js.
(() => {
  const menuEl = document.getElementById("menu");
  if (!menuEl) return;
  const url = `${import.meta.env.BASE_URL}assets/ui/portada.webp`;
  menuEl.style.backgroundImage =
    `linear-gradient(180deg, rgba(8,6,15,.5) 0%, rgba(8,6,15,.74) 45%, rgba(8,6,15,.96) 100%), url("${url}")`;
  menuEl.style.backgroundSize = "cover, cover";
  menuEl.style.backgroundPosition = "center, center 30%";
  menuEl.style.backgroundRepeat = "no-repeat, no-repeat";
})();

// Estructura original del menú, guardada en comprobarEnlace() antes de que
// la sustituya por el panel "elige tu clase y conéctate" — se restaura en
// mostrarLobbySincronizado() en cuanto el invitado empieza a recibir el
// estado real del lobby del anfitrión.
let overlayInnerOriginal = null;

// true si este peer manda sobre el lobby (anfitrión o partida local sin
// red todavía); false si es un invitado viendo el estado del anfitrión.
function esAnfitrionDelLobby() {
        return NET.modo !== "cliente";
      }

// Cada jugador confirma su propia clase/listo de forma independiente: el
// invitado solo puede tocar el slot que le asignó el anfitrión (NET.miIdx);
// el anfitrión sigue controlando sus propios dispositivos locales
// (teclado + mandos), pero ya no los slots "net" de los invitados — esos
// se controlan solos desde su propia pantalla.
function puedeEditarSlot(s, i) {
        if (NET.modo === "cliente") return i === NET.miIdx;
        return s.ctrl.tipo !== "net";
      }

export function construirMenu() {
        const cont = document.getElementById("slots");
        if (!cont) return;
        const soyAnfitrion = esAnfitrionDelLobby();

        // cont.innerHTML="" reconstruye todas las tarjetas desde cero, así
        // que sin esto, escribir el propio nombre perdía el foco y el
        // cursor en cuanto llegaba CUALQUIER otro cambio de red mientras
        // tecleabas (incluida tu propia actualización, que vuelve como
        // snapshot del anfitrión). Se guarda y se restaura alrededor del
        // repintado.
        const focoPrevio = document.activeElement;
        let focoIdx = -1,
          focoSel = null,
          focoVal = null;
        if (focoPrevio && focoPrevio.classList?.contains("input-nombre-slot")) {
          focoIdx = Number(focoPrevio.dataset.idx);
          focoSel = [focoPrevio.selectionStart, focoPrevio.selectionEnd];
          focoVal = focoPrevio.value;
        }

        cont.innerHTML = "";
        M.slots.forEach((s, i) => {
          const div = document.createElement("div");
          if (!s.activo) {
            div.className = "slot libre";
            div.innerHTML =
              "Pulsa <kbd>A</kbd> en un mando<br>para unirte como J" + (i + 1);
            cont.appendChild(div);
            return;
          }
          const rol = ORDEN_ROLES[s.rolIdx],
            r = ROLES[rol];
          const editable = puedeEditarSlot(s, i);
          div.className = "slot marco-px" + (s.listo ? " listo" : "");
          div.style.setProperty("--gema", COLORES_J[i]);
          div.innerHTML =
            '<div class="dispositivo"><span>J' +
            (i + 1) +
            " · " +
            (s.ctrl.tipo === "kbm"
              ? "Teclado + Ratón"
              : s.ctrl.tipo === "net"
                ? "Online"
                : "Mando " + (s.ctrl.idx + 1)) +
            "</span>" +
            '<span class="pcolor" style="background:' +
            COLORES_J[i] +
            '"></span></div>' +
            '<div class="fila-clase"><button class="btn-mini"' +
            (editable ? "" : " disabled") +
            ' data-d="-1">◀</button><h3>' +
            r.nombre +
            '</h3><button class="btn-mini"' +
            (editable ? "" : " disabled") +
            ' data-d="1">▶</button></div>' +
            '<div class="desc">' +
            r.desc +
            '<br><b style="color:var(--vespero)">Ulti:</b> ' +
            r.skill.nombre +
            "</div>";
          const mini = document.createElement("canvas");
          const img = SPR[rol];
          mini.width = img.width;
          mini.height = img.height;
          mini.getContext("2d").drawImage(img, 0, 0);
          mini.style.width = "44px";
          mini.style.imageRendering = "pixelated";
          div.appendChild(mini);
          const nombreInput = document.createElement("input");
          nombreInput.className = "input-nombre-slot";
          nombreInput.maxLength = 20;
          nombreInput.placeholder = "Nombre (opcional)";
          nombreInput.setAttribute("aria-label", "Nombre de J" + (i + 1));
          nombreInput.dataset.idx = String(i);
          nombreInput.value = s.nombre || "";
          nombreInput.disabled = !editable;
          let nombreDebounce = null;
          nombreInput.oninput = () => {
            s.nombre = nombreInput.value;
            if (NET.modo === "cliente") {
              clearTimeout(nombreDebounce);
              nombreDebounce = setTimeout(
                () => enviarRolPropio(s.rolIdx, s.listo, s.nombre),
                400,
              );
            } else {
              netEnviarLobby();
            }
          };
          div.appendChild(nombreInput);
          const bl = document.createElement("button");
          bl.className = "btn-listo";
          bl.textContent = s.listo ? "✔ Listo" : "Marcar listo";
          bl.disabled = !editable;
          bl.onclick = () => {
            s.listo = !s.listo;
            if (NET.modo === "cliente") enviarRolPropio(s.rolIdx, s.listo, s.nombre);
            construirMenu();
          };
          div.appendChild(bl);
          const biInfo = document.createElement("button");
          biInfo.className = "btn-info";
          biInfo.textContent = "ℹ Info habilidades";
          biInfo.onclick = (ev) => {
            ev.stopPropagation();
            abrirInfo(rol);
          };
          div.appendChild(biInfo);
          if (s.ctrl.tipo === "pad") {
            const ay = document.createElement("div");
            ay.className = "pad-ayuda";
            ay.innerHTML =
              "<kbd>◀▶</kbd> clase · <kbd>A</kbd> listo · <kbd>B</kbd> salir · <kbd>X</kbd> info · <kbd>▲▼</kbd> lobby · <kbd>Start</kbd> empezar";
            div.appendChild(ay);
          }
          if (editable) {
            div.querySelectorAll(".btn-mini").forEach((b) => {
              b.onclick = () => {
                if (!s.listo) {
                  s.rolIdx =
                    (s.rolIdx + ORDEN_ROLES.length + +b.dataset.d) %
                    ORDEN_ROLES.length;
                  if (NET.modo === "cliente") enviarRolPropio(s.rolIdx, s.listo, s.nombre);
                  construirMenu();
                }
              };
            });
          }
          cont.appendChild(div);
        });
        if (focoIdx >= 0) {
          const focoNuevo = cont.querySelector(
            '.input-nombre-slot[data-idx="' + focoIdx + '"]',
          );
          if (focoNuevo && !focoNuevo.disabled) {
            focoNuevo.value = focoVal;
            focoNuevo.focus();
            focoNuevo.setSelectionRange(focoSel[0], focoSel[1]);
          }
        }
        const cl = document.getElementById("cartas-lobby");
        cl.innerHTML = Object.entries(LOBBIES)
          .map(
            ([id, l]) =>
              '<button class="card-sel' +
              (M.lobby === id ? " activa" : "") +
              '"' +
              (soyAnfitrion ? "" : " disabled") +
              ' data-lobby="' +
              id +
              '">' +
              "<h3>" +
              l.icon +
              " " +
              l.nombre +
              '</h3><div class="desc">' +
              l.desc +
              "</div></button>",
          )
          .join("");
        if (soyAnfitrion) {
          cl.querySelectorAll("button").forEach((b) => {
            b.onclick = () => {
              M.lobby = b.dataset.lobby;
              construirMenu();
            };
          });
        }

        // Controles exclusivos del anfitrión (nombre/empezar, fuego amigo,
        // crear sala): ocultos para el invitado, que en su lugar ve un
        // aviso de que está conectado y esperando.
        const filaNombre = document.getElementById("fila-nombre");
        const netPanel = document.getElementById("net-panel");
        const ffLabel = document.querySelector(".check-ff");
        if (filaNombre) filaNombre.style.display = soyAnfitrion ? "" : "none";
        if (netPanel) netPanel.style.display = soyAnfitrion ? "" : "none";
        if (ffLabel) ffLabel.style.display = soyAnfitrion ? "" : "none";
        let estadoInvitado = document.getElementById("estado-invitado");
        if (!soyAnfitrion) {
          if (!estadoInvitado) {
            estadoInvitado = document.createElement("p");
            estadoInvitado.id = "estado-invitado";
            estadoInvitado.style.cssText =
              "text-align:center;color:var(--alba);margin-top:14px;font-size:.88rem";
            document.getElementById("cartas-lobby").after(estadoInvitado);
          }
          estadoInvitado.textContent =
            "Conectado. Elige tu clase y marca listo cuando quieras — el anfitrión empezará la partida en cuanto todos lo estéis.";
        } else if (estadoInvitado) {
          estadoInvitado.remove();
        }

        if (soyAnfitrion) {
          const activos = M.slots.filter((s) => s.activo);
          document.getElementById("btn-empezar").disabled = !(
            M.lobby &&
            activos.length > 0 &&
            activos.every((s) => s.listo)
          );
          // oro del gremio
          let oroEl = document.getElementById("menu-oro");
          if (!oroEl) {
            oroEl = document.createElement("p");
            oroEl.id = "menu-oro";
            oroEl.style.cssText =
              "text-align:center;color:#ffd27f;font-weight:800;font-size:.88rem;margin-top:10px";
            document.getElementById("fila-nombre").after(oroEl);
          }
          oroEl.innerHTML =
            "🪙 Oro del gremio: " +
            META.oro +
            (Object.values(META.mejoras).some((v) => v > 0)
              ? " · Mejoras activas: " +
                MEJORAS_TIENDA.filter((m) => META.mejoras[m.id] > 0)
                  .map((m) => m.ico + " Nv." + META.mejoras[m.id])
                  .join(" ")
              : "");
          // el invitado necesita ver esto mismo en tiempo real (ver
          // net/peer.js:netEnviarLobby y mostrarLobbySincronizado más abajo)
          netEnviarLobby();
        }
      }

// Llamado desde net/peer.js cuando llega un snapshot del lobby del
// anfitrión (mensaje "lobby"). Restaura la estructura real del menú (la
// primera vez, si comprobarEnlace() la había sustituido por el panel de
// "elige tu clase y conéctate") y renderiza el mismo construirMenu() que ve
// el anfitrión, en modo solo-lectura.
export function mostrarLobbySincronizado(slots, lobby) {
        const menu = document.getElementById("menu")?.querySelector(".overlay-inner");
        if (menu && overlayInnerOriginal !== null && !document.getElementById("slots")) {
          menu.innerHTML = overlayInnerOriginal;
        }
        M.slots = slots;
        M.lobby = lobby;
        construirMenu();
      }

document.getElementById("btn-empezar").onclick = nuevaPartida;

document.getElementById("btn-crear-sala").onclick = () => {
        document.getElementById("btn-crear-sala").disabled = true;
        crearSalaOnline();
      };

document.getElementById("btn-copiar-enlace").onclick = () => {
        const inp = document.querySelector("#net-enlace input");
        inp.select();
        try {
          navigator.clipboard.writeText(inp.value);
        } catch (e) {
          document.execCommand("copy");
        }
        document.getElementById("btn-copiar-enlace").textContent = "¡Copiado!";
        setTimeout(() => {
          document.getElementById("btn-copiar-enlace").textContent = "Copiar";
        }, 1500);
      };

(function comprobarEnlace() {
        const m = (location.hash || "").match(/sala=([\w-]+)/);
        if (!m) return;
        const sala = m[1];
        // panel de invitado: elegir clase y conectar
        const menu = document
          .getElementById("menu")
          .querySelector(".overlay-inner");
        overlayInnerOriginal = menu.innerHTML;
        menu.innerHTML =
          '<div id="hero-titulo" class="marco-px"><span class="lucero">✦</span><h1>La Torre de Véspero — Online</h1>' +
          "<p>Te han invitado a una sala. Elige tu clase y conéctate.</p></div>" +
          '<div class="grupo-sel marco-px"><h2>Tu clase</h2><div id="net-clase-sel"></div></div>' +
          '<div style="text-align:center;margin-top:12px"><button class="btn dorado" id="btn-unirse">Conectarse a la sala</button></div>' +
          '<p id="net-estado" style="text-align:center;margin-top:10px;color:var(--alba)"></p>';
        let rolIdx = 0;
        const pintarSel = () => {
          const rol = ORDEN_ROLES[rolIdx],
            r = ROLES[rol];
          const cont = document.getElementById("net-clase-sel");
          cont.innerHTML =
            '<div class="slot"><div class="fila-clase"><button class="btn-mini" id="nc-izq">◀</button><h3>' +
            r.nombre +
            '</h3><button class="btn-mini" id="nc-der">▶</button></div><div class="desc">' +
            r.desc +
            "</div></div>";
          document.getElementById("nc-izq").onclick = () => {
            rolIdx = (rolIdx + ORDEN_ROLES.length - 1) % ORDEN_ROLES.length;
            pintarSel();
          };
          document.getElementById("nc-der").onclick = () => {
            rolIdx = (rolIdx + 1) % ORDEN_ROLES.length;
            pintarSel();
          };
        };
        pintarSel();
        document.getElementById("btn-unirse").onclick = () => {
          document.getElementById("btn-unirse").disabled = true;
          document.getElementById("net-estado").textContent = "Conectando…";
          NET.rolElegido = rolIdx;
          unirseSalaOnline(sala);
        };
      })();
