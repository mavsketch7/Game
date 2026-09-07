// Menú de pausa: existió como paso intermedio propio (kit "Fantasy Stone
// UI", retrato+nameplate+panel+3 botones Inventory/Map/Quit) entre Tab/
// Start y la ficha de personaje -- pedido expreso de sustituirlo: "el
// libro sustituye el menú que se ha implementado", ahora que la propia
// ficha (ui/inventory.js) ya cubre lo mismo que ofrecían esos 3 botones
// (su pestaña "Mapa", su botón "Abandonar partida" y, obviamente, el
// propio inventario/ficha). Tab/Start abre la ficha DIRECTAMENTE.
// abrirMenuPausa()/cerrarMenuPausa() de este archivo se han quitado por
// quedar sin ningún llamador -- el arte del kit (public/assets/ui/pausa/)
// y el contenedor #menu-pausa en index.html NO se han tocado, quedan sin
// usar por si se retoman más adelante.
import { G } from "../core/state.js";
import { abrirInv, cerrarInv } from "./inventory.js";

function overlayOculto(id) {
  return document.getElementById(id).classList.contains("oculto");
}

export function toggleMenuPausa() {
  if (!G || !G.activo) return;
  // no alternar si hay cartas, tienda, sastre o yunque abiertos -- mismo
  // guard que tenía toggleInv() antes de que el menú de pausa (y ahora
  // este toggle directo) lo sustituyera.
  if (!overlayOculto("cartas-overlay")) return;
  if (!overlayOculto("tienda")) return;
  if (!overlayOculto("skins")) return;
  if (!overlayOculto("yunque")) return;
  if (!overlayOculto("inv")) cerrarInv();
  else abrirInv();
}
