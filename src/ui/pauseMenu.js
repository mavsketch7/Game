// Menú de pausa: arte del kit "Fantasy Stone UI" (retrato circular + nameplate
// + panel + 3 botones Inventory/Map/Quit, en public/assets/ui/pausa/).
// Sustituye lo que Tab/Start abrían antes (la ficha de personaje
// directamente, ver inventory.js) -- ahora Tab/Start abren este menú primero,
// y desde aquí "Inventory"/"Map" llevan a las pestañas correspondientes de la
// ficha ya existente. Mismo patrón que el resto de src/ui/*.js: innerHTML +
// mostrar()/ocultar() + handlers en window para los onclick="..." inline.
import { ROLES } from "../core/constants.js";
import { G } from "../core/state.js";
import { cerrarInv } from "./inventory.js";
import { mostrar, ocultar } from "./overlays.js";

function escHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

const uiSrc = (nombre) => `${import.meta.env.BASE_URL}assets/ui/pausa/${nombre}`;

function overlayOculto(id) {
  return document.getElementById(id).classList.contains("oculto");
}

export function abrirMenuPausa() {
  if (!G || !G.activo) return;
  G.pausa = true;
  const p = G.players[G.invSel] || G.players[0];
  const mostrarQuit = G.escena === "torre";

  document.getElementById("menu-pausa-inner").innerHTML =
    '<div id="mp-layout">' +
    '<div id="mp-retrato">' +
    // El marco (portrait-frame.png) tiene el círculo interior relleno de un
    // color opaco (es un "hueco vacío" en el arte de origen, no un recorte
    // transparente) -- por eso va DEBAJO en el DOM y el canvas del
    // personaje se pinta encima, no al revés.
    '<div id="mp-retrato-marco" style="background-image:url(\'' + uiSrc("portrait-frame.png") + "')\"></div>" +
    '<div id="mp-retrato-icono">' + escHtml(ROLES[p.rol].ico || "❔") + "</div>" +
    "</div>" +
    '<div id="mp-nameplate" style="background-image:url(\'' + uiSrc("nameplate.png") + "')\">" +
    '<span id="mp-nameplate-texto">' + escHtml(p.nombre) + " · " + escHtml(ROLES[p.rol].nombre) + "</span>" +
    "</div>" +
    '<div id="mp-panel" style="background-image:url(\'' + uiSrc("panel.png") + "')\">" +
    '<div id="mp-panel-texto">Piso ' + (G.piso || 1) + " · " + (G.oroRun || 0) + " 🪙</div>" +
    "</div>" +
    '<div id="mp-botones">' +
    '<button class="mp-btn" style="background-image:url(\'' + uiSrc("btn-inventory.png") + '\')" ' +
    'onclick="cerrarMenuPausa();irPestanaInv(\'personaje\')" aria-label="Inventory"></button>' +
    '<button class="mp-btn" style="background-image:url(\'' + uiSrc("btn-map.png") + '\')" ' +
    'onclick="cerrarMenuPausa();irPestanaInv(\'mapa\')" aria-label="Map"></button>' +
    (mostrarQuit
      ? '<button class="mp-btn" style="background-image:url(\'' + uiSrc("btn-quit.png") + '\')" ' +
        'onclick="cerrarMenuPausa();abandonarPartida()" aria-label="Quit"></button>'
      : "") +
    "</div>" +
    "</div>";

  mostrar("menu-pausa");
}

export function cerrarMenuPausa() {
  ocultar("menu-pausa");
  if (G) G.pausa = false;
}

export function toggleMenuPausa() {
  if (!G || !G.activo) return;
  // no alternar si hay cartas, tienda, sastre o yunque abiertos -- mismo
  // guard que tenía toggleInv() antes de que este menú lo sustituyera.
  if (!overlayOculto("cartas-overlay")) return;
  if (!overlayOculto("tienda")) return;
  if (!overlayOculto("skins")) return;
  if (!overlayOculto("yunque")) return;
  if (!overlayOculto("inv")) {
    cerrarInv(); // la ficha está encima -- Tab la cierra primero, no reabre el menú debajo
    return;
  }
  if (!overlayOculto("menu-pausa")) cerrarMenuPausa();
  else abrirMenuPausa();
}

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarMenuPausa = cerrarMenuPausa;
