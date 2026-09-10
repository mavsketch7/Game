// Fragua de fusión: popup independiente (NO el libro/menú) para fusionar 3
// objetos de la misma rareza en uno superior -- lógica trasladada tal cual
// desde la antigua pestaña "Herrería" del libro (ver ui/inventory.js,
// commits anteriores) ahora que la mecánica se sacó del menú por completo.
// Accesible SOLO desde dos sitios del mundo, nunca desde el menú de pausa:
// (1) un botón dentro del yunque del lobby (ver ui/workbench.js), (2) la
// fragua que aparece por sorpresa en una sala normal de la mazmorra (ver
// sala.fraguaNpc en systems/floorgen.js, y la comprobación de cercanía en
// core/loop.js).
import { RAREZAS, SLOT_LABEL } from "../core/constants.js";
import { G } from "../core/state.js";
import { fxOnda, fxParticulas } from "../render/effects.js";
import { iconoDrop } from "../render/sprites.js";
import { genItem } from "../systems/loot.js";
import { genObjetoMitico } from "../systems/objetosMiticos.js";
import { banner, toast } from "./notifications.js";
import { cerrarOverlayBase, iniciarAperturaOverlay, mostrar } from "./overlays.js";

function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function iconoUrl(it) {
  return iconoDrop(it).toDataURL();
}

// true justo tras una fusión real -- lo lee y consume el propio render
// para que el martillo golpee y salten chispas SOLO en el repintado que
// sigue a una fusión, no cada vez que se repinta el popup por cualquier
// otro motivo (mismo mecanismo que tenía tabHerreria() en el libro).
let golpeMartilloPendiente = false;

// Misma rareza Y mismo slot (y misma clase si es arma) -- los 7 slots no
// son intercambiables entre sí aunque compartan rareza (un casco y un
// collar Épicos no fusionan).
function mismoGrupoFusion(a, b) {
  if (a.rareza !== b.rareza || a.slot !== b.slot) return false;
  if (a.slot === "arma" && a.clase !== b.clase) return false;
  return true;
}

function gruposFusionables(p) {
  const grupos = {};
  for (const it of p.bolsa) {
    if (it.rareza >= 4) continue; // Mítico es el techo, no se fusiona más
    const clave =
      it.rareza + "|" + (it.slot === "arma" ? "arma:" + (it.clase || "") : it.slot);
    (grupos[clave] = grupos[clave] || []).push(it);
  }
  return grupos;
}

function contarFusionesRapidas(p) {
  let n = 0;
  const g = gruposFusionables(p);
  for (const k in g) n += Math.floor(g[k].length / 3);
  return n;
}

// N chispas con deriva aleatoria propia (--dx/--dy), un solo disparo al
// golpear el martillo -- mismo mecanismo que las luciérnagas de la
// pantalla de selección (ver ui/menu.js).
function chispasForjaHtml() {
  let html = "";
  for (let i = 0; i < 10; i++) {
    const ang = (Math.random() * 140 - 70 - 90) * (Math.PI / 180);
    const dist = 18 + Math.random() * 26;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    html +=
      '<span class="chispa-forja" style="--dx:' +
      dx.toFixed(0) +
      "px;--dy:" +
      dy.toFixed(0) +
      "px;animation-delay:" +
      (Math.random() * 0.12).toFixed(2) +
      's"></span>';
  }
  return html;
}

// Celda de la bolsa dentro del popup: mismo look que el grid del libro
// (borde por rareza, casillas delimitadas -- pedido expreso) pero con un
// resalte propio si el objeto ya está metido en la fusión, y clic ==
// meter/sacar de la fusión en vez de seleccionar para ver acciones.
function celdaFusionHtml(it, idx, p) {
  const rar = RAREZAS[it.rareza];
  const dentro = p.fusionSel.includes(it);
  const bloqueada =
    it.rareza >= 4 ||
    (!dentro && p.fusionSel.length >= 3) ||
    (!dentro && p.fusionSel.length > 0 && !mismoGrupoFusion(p.fusionSel[0], it));
  return (
    '<div class="item-cell-libro' +
    (dentro ? " seleccionada" : "") +
    (bloqueada ? " bloqueada" : "") +
    '" style="border-color:' +
    rar.col +
    '" onclick="' +
    (bloqueada && !dentro ? "" : "togFusionPop(" + idx + ")") +
    '" title="' +
    escHtml(it.nombre) +
    " · " +
    (SLOT_LABEL[it.slot] || it.slot) +
    '">' +
    '<img src="' +
    iconoUrl(it) +
    '" alt="" />' +
    "</div>"
  );
}

function gridBolsaFusion(p) {
  if (!p.bolsa.length)
    return '<p style="color:var(--ceniza);margin-top:8px">Tu bolsa está vacía.</p>';
  return (
    '<div class="grid-inv-libro">' +
    p.bolsa.map((it, i) => celdaFusionHtml(it, i, p)).join("") +
    "</div>"
  );
}

export function abrirFusion() {
  if (!iniciarAperturaOverlay("fraguaLock")) return;
  render();
  mostrar("fusion");
}

function render() {
  const p = G.players[G.invSel] || G.players[0];
  p.fusionSel = p.fusionSel.filter((it) => p.bolsa.includes(it));
  const slotsF = [0, 1, 2]
    .map((k) => {
      const it = p.fusionSel[k];
      return it
        ? '<div class="fusion-slot lleno" style="border-color:' +
            RAREZAS[it.rareza].col +
            ";color:" +
            RAREZAS[it.rareza].col +
            '">' +
            escHtml(it.nombre) +
            "</div>"
        : '<div class="fusion-slot">vacío</div>';
    })
    .join('<span class="fusion-flecha">→</span>');
  const rarF = p.fusionSel.length ? p.fusionSel[0].rareza : -1;
  const esLeg = rarF === 3;
  let fusBtn = "";
  if (p.fusionSel.length === 3) {
    fusBtn =
      '<button class="btn dorado" onclick="fusionarPop()">⚗️ FUSIONAR' +
      (esLeg ? " (13% de éxito)" : " → " + RAREZAS[rarF + 1].n) +
      "</button>";
  }
  const avisoF =
    esLeg && p.fusionSel.length === 3
      ? '<div class="fusion-aviso">⚠ Fusión legendaria: si tiene éxito, nace un objeto Mítico único. Si falla (87%), LOS TRES SE DESTRUYEN.</div>'
      : "";
  const nRapidas = contarFusionesRapidas(p);
  const btnRapida =
    nRapidas > 0
      ? '<button class="btn dorado" onclick="fusionRapidaPop()">⚡ Fusión rápida (' +
        nRapidas +
        " disponible" +
        (nRapidas > 1 ? "s" : "") +
        ")</button>"
      : '<button class="btn" disabled title="Necesitas 3 objetos de la misma rareza">⚡ Fusión rápida (0)</button>';
  const golpe = golpeMartilloPendiente;
  golpeMartilloPendiente = false;
  document.getElementById("fusion-inner").innerHTML =
    '<div class="tienda-cab">' +
    "<h2>⚗ Fragua</h2>" +
    '<p style="color:var(--ceniza);font-size:.8rem;margin-top:4px">Combina 3 objetos de la MISMA rareza (mismo hueco, y misma clase si son armas) → evolucionan a la superior. Haz clic en la bolsa para meterlos/sacarlos.</p>' +
    "</div>" +
    '<div class="herreria-escena">' +
    '<div class="herreria-yunque' +
    (golpe ? " golpea" : "") +
    '"></div>' +
    '<div class="fusion-slots-forja">' +
    slotsF +
    '<span class="fusion-flecha">→</span>' +
    '<div class="fusion-slot resultado">?</div>' +
    "</div>" +
    (golpe ? chispasForjaHtml() : "") +
    "</div>" +
    '<div class="fusion-panel">' +
    '<div style="text-align:center">' +
    fusBtn +
    "</div>" +
    '<div style="margin-top:8px;text-align:center">' +
    btnRapida +
    ' <span style="font-size:.7rem;color:var(--ceniza)">coge 3 iguales automáticamente (prioriza la rareza más alta)</span></div>' +
    avisoF +
    "</div>" +
    '<h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">Bolsa de ' +
    escHtml(p.nombre) +
    " (" +
    p.bolsa.length +
    ")</h3>" +
    gridBolsaFusion(p) +
    '<div style="text-align:center;margin-top:14px"><button class="btn" onclick="cerrarFusion()">Cerrar (Esc)</button></div>';
}

function togFusionPop(idx) {
  const p = G.players[G.invSel] || G.players[0];
  const it = p.bolsa[idx];
  if (!it) return;
  const pos = p.fusionSel.indexOf(it);
  if (pos >= 0) p.fusionSel.splice(pos, 1);
  else if (
    p.fusionSel.length < 3 &&
    (p.fusionSel.length === 0 || mismoGrupoFusion(p.fusionSel[0], it))
  )
    p.fusionSel.push(it);
  render();
}

function fusionRapidaPop() {
  const p = G.players[G.invSel] || G.players[0];
  const g = gruposFusionables(p);
  let mejor = null,
    mejorRar = -1;
  for (const k in g) {
    if (g[k].length >= 3) {
      const rar = parseInt(k.split("|")[0]);
      if (rar > mejorRar) {
        mejorRar = rar;
        mejor = g[k];
      }
    }
  }
  if (!mejor) {
    toast("No hay 3 objetos de la misma rareza para fusionar", "#c9a35a");
    return;
  }
  p.fusionSel = mejor.slice(0, 3);
  fusionarPop();
}

function fusionarPop() {
  const p = G.players[G.invSel] || G.players[0];
  if (p.fusionSel.length !== 3) return;
  golpeMartilloPendiente = true;
  const rarF = p.fusionSel[0].rareza;
  const base = p.fusionSel[0];
  for (const it of p.fusionSel) {
    const i = p.bolsa.indexOf(it);
    if (i >= 0) p.bolsa.splice(i, 1);
  }
  if (rarF < 3) {
    const nuevo = genItem(Math.max(1, G.planta), rarF + 1, base.slot);
    if (base.slot === "arma") nuevo.clase = base.clase;
    if (nuevo.slot === "arma" && nuevo.rareza === 3) nuevo.kills = 0;
    p.bolsa.push(nuevo);
    fxOnda(p.x, p.y, 40, RAREZAS[rarF + 1].col);
    fxParticulas(p.x, p.y, 14, RAREZAS[rarF + 1].col);
    toast("⚗️ ¡Fusión! Nace " + nuevo.nombre + " [" + RAREZAS[rarF + 1].n + "]", RAREZAS[rarF + 1].col);
  } else if (rarF === 3) {
    if (Math.random() < 0.13) {
      const nuevo = genObjetoMitico(Math.max(1, G.planta), base.slot);
      p.bolsa.push(nuevo);
      G.shake = Math.max(G.shake, 8);
      fxOnda(p.x, p.y, 80, "#ff5a36");
      fxOnda(p.x, p.y, 50, "#fff0c8");
      fxParticulas(p.x, p.y, 30, "#ff5a36");
      banner("✦ ¡LA FUSIÓN LEGENDARIA SOBREVIVE! ✦");
      toast("Nace " + nuevo.nombre + " [Mítico]", "#ff5a36");
    } else {
      G.shake = Math.max(G.shake, 6);
      fxParticulas(p.x, p.y, 24, "#57496f");
      fxOnda(p.x, p.y, 60, "#d1545c");
      banner("✝ La fusión colapsa: los tres legendarios se desintegran ✝");
      toast("El poder era demasiado. Cenizas.", "#d1545c");
    }
  }
  p.fusionSel = [];
  render();
}

export function cerrarFusion() {
  cerrarOverlayBase("fusion");
}

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.togFusionPop = togFusionPop;
window.fusionarPop = fusionarPop;
window.fusionRapidaPop = fusionRapidaPop;
window.cerrarFusion = cerrarFusion;
