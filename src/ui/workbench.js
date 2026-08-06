// Mesa de Trabajo / Yunque: estación del vestíbulo (ver G.yunqueNpc en
// core/gameflow.js) donde desmantelar armas de la bolsa en Fragmentos de
// Alma -- ver systems/soul.js para el resto del sistema (rejilla, catálogo,
// conexiones) y ui/inventory.js (pestaña "Alma") para colocarlos.
import { RAREZAS } from "../core/constants.js";
import { G } from "../core/state.js";
import { desmantelarArma, fragPorId } from "../systems/soul.js";
import { toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";

function lineaArma(it, idx) {
  const rar = RAREZAS[it.rareza];
  const nFrag = 1 + it.rareza;
  return (
    '<div class="mejora-linea">' +
    '<div class="mejora-info">' +
    '<h4>Arma · <span class="' +
    rar.cls +
    '">' +
    rar.n +
    "</span></h4>" +
    '<div class="m-desc ' +
    rar.cls +
    '" style="font-weight:600">' +
    it.nombre +
    "</div>" +
    '<div class="m-desc">Suelta ' +
    nFrag +
    " fragmento" +
    (nFrag > 1 ? "s" : "") +
    " de Alma</div>" +
    "</div>" +
    '<button class="btn dorado" onclick="desmantelar(' +
    idx +
    ')">⚒ Desmantelar</button>' +
    "</div>"
  );
}

export function abrirYunque() {
  if (!G || !G.activo) return;
  G.pausa = true;
  G.yunqueLock = true;
  const p = G.players[G.invSel] || G.players[0];
  const armas = p.bolsa
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.slot === "arma");
  const lineas = armas.length
    ? armas.map(({ it, i }) => lineaArma(it, i)).join("")
    : '<p style="color:var(--ceniza);font-size:.8rem">' +
      p.nombre +
      " no lleva armas sueltas en la bolsa (el arma equipada no se puede desmantelar).</p>";
  document.getElementById("yunque-inner").innerHTML =
    '<div class="tienda-cab">' +
    "<h2>⚒ Mesa de Trabajo</h2>" +
    '<p style="color:var(--ceniza);font-size:.8rem;margin-top:4px">Desmantela armas de la bolsa de ' +
    p.nombre +
    " en Fragmentos de Alma. Cuanto mejor sea el arma, más y mejores fragmentos suelta.</p>" +
    "</div>" +
    lineas +
    '<div style="text-align:center;margin-top:14px"><button class="btn dorado" onclick="cerrarYunque()">Cerrar (Esc)</button></div>';
  mostrar("yunque");
}

function desmantelar(idx) {
  const p = G.players[G.invSel] || G.players[0];
  const it = p.bolsa[idx];
  if (!it || it.slot !== "arma") return;
  const nuevos = desmantelarArma(it);
  p.bolsa.splice(idx, 1);
  const nombres = nuevos.map((f) => fragPorId(f.fragId).nombre).join(", ");
  toast("⚒ " + it.nombre + " → " + nombres, "#c9a35a");
  abrirYunque();
}

export function cerrarYunque() {
  ocultar("yunque");
  if (G) G.pausa = false;
}

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarYunque = cerrarYunque;
window.desmantelar = desmantelar;
