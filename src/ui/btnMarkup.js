// Inserta la estructura de 3 <span> (tapa izq/centro/tapa dcha) que pide
// el tileset de botones (ver --ux-btn-* y el bloque ".btn, .btn-listo,
// ..." en styles/main.css) dentro de CUALQUIER botón del juego, sin tocar
// el HTML/JS que los crea -- hay botones repartidos en 9 archivos
// distintos (menu.js, inventory.js, shop.js, workbench.js, skins.js,
// pvp.js, settingsOverlay.js, guildRankings.js, systems/loot.js) y varios
// mutan el texto de un botón YA insertado en vez de re-renderizarlo
// entero (p.ej. "Copiar" -> "¡Copiado!" en btn-copiar-enlace, ver
// menu.js). Por eso esto no es un pase único al cargar: un
// MutationObserver vigila todo document.body y re-envuelve cualquier
// botón de la familia en cuanto pierde su .btn-center (recién creado, o
// recién sobrescrito con textContent/innerHTML), así que sirve tanto
// para el primer render como para esas mutaciones puntuales.
const SELECTOR =
  ".btn, .btn-listo, .btn-info, .btn-mini-texto, .btn-fus, .seg button, .inicio-start";

function envolver(el) {
  if (el.querySelector(":scope > .btn-center")) return;
  const centro = document.createElement("span");
  centro.className = "btn-center";
  while (el.firstChild) centro.appendChild(el.firstChild);
  const izq = document.createElement("span");
  izq.className = "btn-left";
  const der = document.createElement("span");
  der.className = "btn-right";
  el.append(izq, centro, der);
}

function envolverArbol(nodo) {
  if (nodo.nodeType !== 1) return;
  if (nodo.matches(SELECTOR)) envolver(nodo);
  nodo.querySelectorAll(SELECTOR).forEach(envolver);
}

envolverArbol(document.body);

new MutationObserver((mutaciones) => {
  for (const m of mutaciones) {
    if (m.target.nodeType === 1 && m.target.matches(SELECTOR)) {
      envolver(m.target);
    }
    m.addedNodes.forEach(envolverArbol);
  }
}).observe(document.body, { childList: true, subtree: true });
