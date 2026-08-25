// Auto-generated during the modularization refactor (2026-07-23).
// Rediseño de la escena de selección de personaje (2026-08-25): fondo fijo
// de sala con arco (ver public/assets/ui/seleccion/), icono ⓘ/gremio/
// ranking/fogata que abren paneles flotantes en vez de secciones siempre
// visibles, y "Entrar en la Torre" viviendo dentro del hueco oscuro del
// arco (oculto con :disabled hasta que todos estén listos, ver main.css).
import { COLORES_J, LOBBIES, ORDEN_ROLES, ROLES } from "../core/constants.js";
import { nuevaPartida } from "../core/gameflow.js";
import { MEJORAS_TIENDA, META } from "../core/save.js";
import { NET, crearSalaOnline, enviarRolPropio, netEnviarLobby, unirseSalaOnline } from "../net/peer.js";
import { crearGremio, miGremio, rankingGremios, salirGremio, unirseGremio } from "../systems/guilds.js";
import { idJugador } from "../systems/identity.js";
import { M } from "../systems/input.js";
import { abrirInfo } from "./info.js";

function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

// Fondo de la escena, fijado una sola vez desde JS en vez de en el CSS: así
// respeta el `base` relativo de vite.config.js igual que assetUrl() en
// render/sprites.js. El degradado deja el arco central (donde vive el
// botón "Empezar expedición") relativamente limpio y oscurece los bordes.
// background-size/position (cover, centrado) se fijan en main.css --
// aquí solo la imagen, que depende del BASE_URL.
(() => {
  const escenaEl = document.querySelector(".escena-seleccion");
  if (!escenaEl) return;
  const url = `${import.meta.env.BASE_URL}assets/ui/seleccion/fondo.png`;
  escenaEl.style.backgroundImage =
    `linear-gradient(180deg, rgba(8,6,15,.5) 0%, rgba(8,6,15,.1) 22%, rgba(8,6,15,.18) 55%, rgba(8,6,15,.88) 100%), url("${url}")`;
  escenaEl.style.backgroundRepeat = "no-repeat, no-repeat";
})();

// Estructura original del menú, guardada en comprobarEnlace() antes de que
// la sustituya por el panel "elige tu clase y conéctate" — se restaura en
// mostrarLobbySincronizado() en cuanto el invitado empieza a recibir el
// estado real del lobby del anfitrión.
let overlayInnerOriginal = null;

// Ids de jugador (ver systems/identity.js) para los que ya se consultó su
// gremio a Supabase en esta carga de página — evita repetir la consulta en
// cada repintado de construirMenu(), que ocurre varias veces por segundo.
const gremioFetchHecho = new Set();

// Índices de slot con el panel de "crear/unirse a gremio" desplegado dentro
// del popover de gremio (ver construirPopoverGremio) -- colapsado por
// defecto para no mostrar un input + 2 botones por cada jugador sin gremio.
const gremioUiAbierta = new Set();

function sincronizarGremio(s) {
  if (NET.modo === "cliente") enviarRolPropio(s.rolIdx, s.listo, s.nombre, s.gremio);
  else netEnviarLobby();
}

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

// ===== Paneles flotantes (ayuda / fogata-online / gremio / ranking) =====
// Solo uno abierto a la vez -- togglePopover cierra los demás antes de
// abrir el pedido. Ver los 4 <button class="icono-escena"> en index.html.
const POPOVERS = ["ayuda", "fogata", "gremio", "ranking"];

function cerrarPopovers() {
  POPOVERS.forEach((id) => document.getElementById("popover-" + id)?.classList.add("oculto"));
}

function togglePopover(id) {
  const el = document.getElementById("popover-" + id);
  if (!el) return;
  const yaAbierto = !el.classList.contains("oculto");
  cerrarPopovers();
  if (!yaAbierto) el.classList.remove("oculto");
}

window.cerrarPopovers = cerrarPopovers;

// Controles de gremio de UN jugador (tag+Salir, o Crear/Unirse) -- vivían
// dentro de cada tarjeta; ahora se agrupan todos en #popover-gremio-cont
// para no ocupar sitio en la tarjeta compacta del nuevo diseño.
function construirGremioControles(s, i) {
  const fila = document.createElement("div");
  fila.className = "popover-gremio-fila";
  const etiqueta = document.createElement("span");
  etiqueta.className = "popover-gremio-jugador";
  etiqueta.textContent = "J" + (i + 1);
  fila.appendChild(etiqueta);

  if (s.gremio) {
    const tag = document.createElement("span");
    tag.className = "gremio-tag";
    tag.textContent = "🛡 " + s.gremio.name;
    fila.appendChild(tag);
    const salirBtn = document.createElement("button");
    salirBtn.className = "btn-mini-texto";
    salirBtn.textContent = "Salir";
    salirBtn.onclick = () => {
      salirBtn.disabled = true;
      salirGremio(idJugador(s.ctrl))
        .then(() => {
          s.gremio = null;
          sincronizarGremio(s);
          construirMenu();
          construirPopoverGremio();
        })
        .catch((e) => {
          salirBtn.disabled = false;
          const msg = fila.querySelector(".gremio-msg");
          if (msg) msg.textContent = e.message || "Error al salir del gremio";
        });
    };
    fila.appendChild(salirBtn);
  } else if (!gremioUiAbierta.has(i)) {
    const abrirBtn = document.createElement("button");
    abrirBtn.className = "btn-mini-texto";
    abrirBtn.textContent = "Unirse a un gremio";
    abrirBtn.onclick = () => {
      gremioUiAbierta.add(i);
      construirPopoverGremio();
    };
    fila.appendChild(abrirBtn);
  } else {
    const gInput = document.createElement("input");
    gInput.className = "input-gremio-slot";
    gInput.maxLength = 24;
    gInput.placeholder = "Nombre de gremio";
    const crearBtn = document.createElement("button");
    crearBtn.className = "btn-mini-texto";
    crearBtn.textContent = "Crear";
    const unirseBtn = document.createElement("button");
    unirseBtn.className = "btn-mini-texto";
    unirseBtn.textContent = "Unirse";
    const msg = document.createElement("span");
    msg.className = "gremio-msg";
    const conAccion = (fn) => () => {
      const nombreG = gInput.value;
      if (!nombreG || !nombreG.trim()) return;
      crearBtn.disabled = true;
      unirseBtn.disabled = true;
      msg.textContent = "Un momento…";
      fn(nombreG, idJugador(s.ctrl), s.nombre)
        .then((g) => {
          s.gremio = { id: g.id, name: g.name, tag: g.tag };
          gremioUiAbierta.delete(i);
          sincronizarGremio(s);
          construirMenu();
          construirPopoverGremio();
        })
        .catch((e) => {
          crearBtn.disabled = false;
          unirseBtn.disabled = false;
          msg.textContent = e.message || "Error";
        });
    };
    crearBtn.onclick = conAccion(crearGremio);
    unirseBtn.onclick = conAccion(unirseGremio);
    fila.append(gInput, crearBtn, unirseBtn, msg);
  }
  return fila;
}

function construirPopoverGremio() {
  const cont = document.getElementById("popover-gremio-cont");
  if (!cont) return;
  cont.innerHTML = "";
  const oro = document.createElement("p");
  oro.className = "popover-oro";
  oro.innerHTML =
    "🪙 Oro del gremio: " +
    META.oro +
    (Object.values(META.mejoras).some((v) => v > 0)
      ? " · Mejoras activas: " +
        MEJORAS_TIENDA.filter((m) => META.mejoras[m.id] > 0)
          .map((m) => m.ico + " Nv." + META.mejoras[m.id])
          .join(" ")
      : "");
  cont.appendChild(oro);
  const activos = M.slots.filter((s, i) => s.activo && puedeEditarSlot(s, i));
  if (!activos.length) {
    cont.insertAdjacentHTML("beforeend", '<p class="a-desc">Únete a la partida para gestionar tu gremio.</p>');
    return;
  }
  M.slots.forEach((s, i) => {
    if (!s.activo || !puedeEditarSlot(s, i)) return;
    cont.appendChild(construirGremioControles(s, i));
  });
}

async function construirPopoverRanking() {
  const cont = document.getElementById("popover-ranking-cont");
  if (!cont) return;
  cont.innerHTML = '<p class="a-desc">Cargando…</p>';
  try {
    const top = await rankingGremios(5);
    cont.innerHTML = top.length
      ? top
          .map(
            (g, i) =>
              '<div class="nota-fila"><span class="nota-pos">#' +
              (i + 1) +
              "</span><span class=\"nota-nombre\">" +
              escHtml(g.name) +
              '</span><span class="nota-stat" title="Daño total">⚔ ' +
              g.total_dano +
              "</span></div>",
          )
          .join("")
      : '<p class="a-desc">Todavía no hay gremios con partidas terminadas.</p>';
  } catch (e) {
    cont.innerHTML = '<p class="a-desc" style="color:#d1545c">No se pudo cargar el ranking (¿sin conexión?).</p>';
  }
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
          focoClase = null,
          focoSel = null,
          focoVal = null;
        if (focoPrevio?.classList?.contains("input-nombre-slot")) {
          focoClase = "input-nombre-slot";
        }
        if (focoClase) {
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
              '<span class="libre-ico">Ⓐ</span><span class="libre-txt">Pulsa <kbd>A</kbd> en un mando<br>para unirte como J' +
              (i + 1) +
              "</span>";
            cont.appendChild(div);
            return;
          }
          const rol = ORDEN_ROLES[s.rolIdx],
            r = ROLES[rol];
          const editable = puedeEditarSlot(s, i);
          div.className = "slot" + (s.listo ? " listo" : "");
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
            '<img class="tarjeta-retrato" alt="" src="' +
            import.meta.env.BASE_URL +
            "assets/ui/seleccion/" +
            rol +
            '.png">' +
            '<div class="fila-clase"><button class="flecha flecha-izq"' +
            (editable ? "" : " disabled") +
            ' data-d="-1" aria-label="Clase anterior"></button><h3>' +
            r.nombre +
            '</h3><button class="flecha flecha-der"' +
            (editable ? "" : " disabled") +
            ' data-d="1" aria-label="Clase siguiente"></button></div>';
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
                () => enviarRolPropio(s.rolIdx, s.listo, s.nombre, s.gremio),
                400,
              );
            } else {
              netEnviarLobby();
            }
          };
          div.appendChild(nombreInput);

          if (editable && !gremioFetchHecho.has(idJugador(s.ctrl))) {
            const pid = idJugador(s.ctrl);
            gremioFetchHecho.add(pid);
            miGremio(pid)
              .then((g) => {
                s.gremio = g;
                sincronizarGremio(s);
                construirMenu();
              })
              .catch(() => {});
          }

          // Antes eran 2 botones a ancho completo apilados (~90px de alto
          // entre los dos); en una fila cabe lo mismo en ~45px, y era el
          // mayor consumidor de alto vertical de la tarjeta -- ver
          // análisis de UX que motivó este cambio.
          const filaAcciones = document.createElement("div");
          filaAcciones.className = "fila-acciones";
          const bl = document.createElement("button");
          bl.className = "btn-listo";
          bl.textContent = s.listo ? "✔ Listo" : "Marcar listo";
          bl.disabled = !editable;
          bl.onclick = () => {
            s.listo = !s.listo;
            if (NET.modo === "cliente") enviarRolPropio(s.rolIdx, s.listo, s.nombre, s.gremio);
            construirMenu();
          };
          filaAcciones.appendChild(bl);
          const biInfo = document.createElement("button");
          biInfo.className = "btn-info";
          biInfo.textContent = "ℹ";
          biInfo.title = "Info de habilidades";
          biInfo.onclick = (ev) => {
            ev.stopPropagation();
            abrirInfo(rol);
          };
          filaAcciones.appendChild(biInfo);
          div.appendChild(filaAcciones);
          if (s.ctrl.tipo === "pad") {
            const ay = document.createElement("div");
            ay.className = "pad-ayuda";
            ay.innerHTML =
              "<kbd>◀▶</kbd> clase · <kbd>A</kbd> listo · <kbd>B</kbd> salir · <kbd>X</kbd> info · <kbd>▲▼</kbd> lobby · <kbd>Start</kbd> empezar";
            div.appendChild(ay);
          }
          if (editable) {
            div.querySelectorAll(".flecha").forEach((b) => {
              b.onclick = () => {
                if (!s.listo) {
                  s.rolIdx =
                    (s.rolIdx + ORDEN_ROLES.length + +b.dataset.d) %
                    ORDEN_ROLES.length;
                  if (NET.modo === "cliente") enviarRolPropio(s.rolIdx, s.listo, s.nombre, s.gremio);
                  construirMenu();
                }
              };
            });
          }
          cont.appendChild(div);
        });
        if (focoIdx >= 0) {
          const focoNuevo = cont.querySelector(
            "." + focoClase + '[data-idx="' + focoIdx + '"]',
          );
          if (focoNuevo && !focoNuevo.disabled) {
            focoNuevo.value = focoVal;
            focoNuevo.focus();
            focoNuevo.setSelectionRange(focoSel[0], focoSel[1]);
          }
        }
        if (!document.getElementById("popover-gremio").classList.contains("oculto")) {
          construirPopoverGremio();
        }

        // Controles exclusivos del anfitrión (nombre/empezar, fuego amigo,
        // crear sala): ocultos para el invitado, que en su lugar ve un
        // aviso de que está conectado y esperando.
        const filaNombre = document.getElementById("fila-nombre");
        const iconoFogata = document.getElementById("icono-fogata");
        if (filaNombre) filaNombre.style.display = soyAnfitrion ? "" : "none";
        if (iconoFogata) iconoFogata.style.display = soyAnfitrion ? "" : "none";
        const estadoInvitado = document.getElementById("estado-invitado");
        if (estadoInvitado) {
          estadoInvitado.classList.toggle("oculto", soyAnfitrion);
          if (!soyAnfitrion) {
            estadoInvitado.textContent =
              "Conectado. Elige tu clase y marca listo cuando quieras — el anfitrión empezará la partida en cuanto todos lo estéis.";
          }
        }

        if (soyAnfitrion) {
          const activos = M.slots.filter((s) => s.activo);
          document.getElementById("btn-empezar").disabled = !(
            M.lobby &&
            activos.length > 0 &&
            activos.every((s) => s.listo)
          );
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

document.getElementById("icono-ayuda").onclick = () => togglePopover("ayuda");
document.getElementById("icono-fogata").onclick = () => togglePopover("fogata");
document.getElementById("icono-gremio").onclick = () => {
  togglePopover("gremio");
  if (!document.getElementById("popover-gremio").classList.contains("oculto")) construirPopoverGremio();
};
document.getElementById("icono-ranking").onclick = () => {
  togglePopover("ranking");
  if (!document.getElementById("popover-ranking").classList.contains("oculto")) construirPopoverRanking();
};

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
