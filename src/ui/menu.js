// Auto-generated during the modularization refactor (2026-07-23).
import { COLORES_J, LOBBIES, ORDEN_ROLES, ROLES } from "../core/constants.js";
import { nuevaPartida } from "../core/gameflow.js";
import { MEJORAS_TIENDA, META } from "../core/save.js";
import { NET, crearSalaOnline, unirseSalaOnline } from "../net/peer.js";
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

export function construirMenu() {
        if (window._esInvitado) return;
        const cont = document.getElementById("slots");
        if (!cont) return;
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
          div.className = "slot marco-px" + (s.listo ? " listo" : "");
          div.style.setProperty("--gema", COLORES_J[i]);
          div.innerHTML =
            '<div class="dispositivo"><span>J' +
            (i + 1) +
            " · " +
            (s.ctrl.tipo === "kbm"
              ? "Teclado + Ratón"
              : "Mando " + (s.ctrl.idx + 1)) +
            "</span>" +
            '<span class="pcolor" style="background:' +
            COLORES_J[i] +
            '"></span></div>' +
            '<div class="fila-clase"><button class="btn-mini" data-d="-1">◀</button><h3>' +
            r.nombre +
            '</h3><button class="btn-mini" data-d="1">▶</button></div>' +
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
          const bl = document.createElement("button");
          bl.className = "btn-listo";
          bl.textContent = s.listo ? "✔ Listo" : "Marcar listo";
          bl.onclick = () => {
            s.listo = !s.listo;
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
          div.querySelectorAll(".btn-mini").forEach((b) => {
            b.onclick = () => {
              if (!s.listo) {
                s.rolIdx =
                  (s.rolIdx + ORDEN_ROLES.length + +b.dataset.d) %
                  ORDEN_ROLES.length;
                construirMenu();
              }
            };
          });
          cont.appendChild(div);
        });
        const cl = document.getElementById("cartas-lobby");
        cl.innerHTML = Object.entries(LOBBIES)
          .map(
            ([id, l]) =>
              '<button class="card-sel' +
              (M.lobby === id ? " activa" : "") +
              '" data-lobby="' +
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
        cl.querySelectorAll("button").forEach((b) => {
          b.onclick = () => {
            M.lobby = b.dataset.lobby;
            construirMenu();
          };
        });
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
        window._esInvitado = true;
        // panel de invitado: elegir clase y conectar
        const menu = document
          .getElementById("menu")
          .querySelector(".overlay-inner");
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
