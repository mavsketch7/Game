// Diálogo de las dos estaciones del vestíbulo (ver mockup_dialogo.png en
// art/npcs/): Alma de Agua (antes "mercader") y Alma de Fuego (antes
// "yunque" a secas) -- cada una abre este menú en vez de su panel de
// siempre directamente, y desde aquí se reparte a los paneles reales
// (mejoras/comprar en ui/shop.js, desmantelar en ui/workbench.js, fusión en
// ui/forjaFusion.js), que ya existían y no cambian de lógica, solo de
// puerta de entrada. "← Volver" en cada uno de esos paneles reabre este
// diálogo (ver volverAlmaAgua/volverAlmaFuego más abajo).
import { abrirFusion } from "./forjaFusion.js";
import { cerrarOverlayBase, iniciarAperturaOverlay, mostrar, ocultar } from "./overlays.js";
import { abrirComprarObjetos, abrirMejoras, renovarOferta } from "./shop.js";
import { abrirYunque } from "./workbench.js";

const ALMAS = {
  agua: {
    nombre: "Alma de Agua",
    clase: "agua",
    lock: "tiendaLock",
    opciones: [
      { texto: "Mejoras permanentes", accion: () => { ocultarDialogo(); abrirMejoras(); } },
      { texto: "Comprar objetos", accion: () => { ocultarDialogo(); abrirComprarObjetos(); } },
    ],
  },
  fuego: {
    nombre: "Alma de Fuego",
    clase: "fuego",
    lock: "yunqueLock",
    opciones: [
      { texto: "Mejorar alma", accion: () => { ocultarDialogo(); abrirYunque(); } },
      { texto: "Combinar almas", accion: () => { ocultarDialogo(); abrirFusion(); } },
    ],
  },
};

let almaAbierta = null;

function lineaOpcion(op, idx) {
  return (
    '<button class="dialogo-opcion" onclick="elegirOpcionAlma(' +
    idx +
    ')"><span class="dialogo-flecha">▶</span>' +
    op.texto +
    "</button>"
  );
}

function render(clave) {
  const a = ALMAS[clave];
  document.getElementById("dialogo-inner").innerHTML =
    '<div class="dialogo-caja ' +
    a.clase +
    '">' +
    '<div class="dialogo-avatar ' +
    a.clase +
    '"></div>' +
    '<div class="dialogo-cuerpo">' +
    '<h2 class="dialogo-titulo ' +
    a.clase +
    '">' +
    a.nombre +
    "</h2>" +
    a.opciones.map(lineaOpcion).join("") +
    '<button class="dialogo-opcion dialogo-adios" onclick="cerrarDialogo()">Adiós</button>' +
    "</div>" +
    "</div>";
}

function abrirAlma(clave) {
  if (!iniciarAperturaOverlay(ALMAS[clave].lock)) return;
  almaAbierta = clave;
  render(clave);
  mostrar("dialogo");
}

export function abrirAlmaAgua() {
  abrirAlma("agua");
}
export function abrirAlmaFuego() {
  abrirAlma("fuego");
}

function elegirOpcionAlma(idx) {
  const a = ALMAS[almaAbierta];
  if (!a || !a.opciones[idx]) return;
  a.opciones[idx].accion();
}

// Al pasar a un panel real: oculta el diálogo sin despausar ni tocar nada más.
function ocultarDialogo() {
  ocultar("dialogo");
}

// Adiós / Escape: fin de la conversación (la oferta de objetos del día se
// renueva la próxima vez, como al cerrar el panel de compra).
export function cerrarDialogo() {
  cerrarOverlayBase("dialogo");
  almaAbierta = null;
  renovarOferta();
}

// Botones "← Volver" de los paneles reales (shop.js/workbench.js/
// forjaFusion.js) -- reabren este diálogo en la misma alma de donde salió.
function volverAlmaAgua() {
  ocultar("tienda");
  abrirAlmaAgua();
}
function volverAlmaFuego() {
  ocultar("yunque");
  ocultar("fusion");
  abrirAlmaFuego();
}

// Expuestas en window: referenciadas desde onclick="..." en HTML generado
// dinámicamente (aquí mismo y en shop.js/workbench.js/forjaFusion.js).
window.elegirOpcionAlma = elegirOpcionAlma;
window.cerrarDialogo = cerrarDialogo;
window.volverAlmaAgua = volverAlmaAgua;
window.volverAlmaFuego = volverAlmaFuego;
