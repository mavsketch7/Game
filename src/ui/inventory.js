// Auto-generated during the modularization refactor (2026-07-23).
import { ajustarLienzo, esPantallaCompleta, maximizado, toggleFullscreen } from "../core/canvas.js";
import { ETQ, FORMAS_DRUIDA, FORMAS_INFO, MAX_NIV_PJ, PRECIO_VENTA, RAREZAS, ROLES, SENDA_ELEMENTAL, SLOTS, SLOT_LABEL, SUPS } from "../core/constants.js";
import { abandonarPartida } from "../core/gameflow.js";
import { META } from "../core/save.js";
import { AJ, aplicarTexto } from "../core/settings.js";
import { G } from "../core/state.js";
import { iconoDrop } from "../render/sprites.js";
import { aplicarMusica, initAudio, sfx } from "../systems/audio.js";
import { CARD_RAREZAS } from "../systems/cards.js";
import { statsTot } from "../systems/combat.js";
import { M } from "../systems/input.js";
import {
  ALMA_COLS,
  ALMA_TOTAL,
  colocarFragmento,
  conexionesActivas,
  costeCasillaAlma,
  desbloquearCasillaAlma,
  fragPorId,
  idxAXY,
  mapaOcupacion,
  puedeDesbloquearCasilla,
  quitarFragmento,
} from "../systems/soul.js";
import { toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";
import { clamp } from "../utils/helpers.js";

function escHtml(s) {
        return String(s ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
        );
      }

// ---- Pestañas del panel de ficha (Personaje/Equipamiento/Estadísticas/
// Mapa) -- estado puramente de interfaz, no de partida: vive aquí como
// variable de módulo (igual que padFoco en systems/input.js) en vez de en
// G, porque no hace falta sincronizarla por red ni guardarla.
// "icoImg" -- nombre del PNG en public/assets/ui/libro/ico-<icoImg>.png
// (ver pestanasLibro() más abajo). Herrería ya NO vive aquí -- la
// fusión se sacó del menú por completo (pedido expreso: "esta mecánica
// pasará a encontrarla en el lobby o aleatoriamente en la mazmorra, no
// en el menú"), ver ui/forjaFusion.js y el yunque del lobby/mazmorra.
const PESTANAS_INV = [
        { id: "personaje", ico: "🧑", nombre: "Personaje", icoImg: "personaje" },
        { id: "alma", ico: "🔮", nombre: "Alma", icoImg: "alma" },
        { id: "mapa", ico: "🗺", nombre: "Mapa", icoImg: "mapa" },
        { id: "ajustes", ico: "⚙", nombre: "Ajustes", icoImg: "ajustes" },
      ];
let invTab = "personaje";

// ---- Libro real v2 (arte "inventario y assets menu.aseprite" +
// "icons-equipment-menu.aseprite", torre-vespero-assets/UI, ver
// public/assets/ui/libro/) -- sustituye TANTO la ficha de personaje
// como el resto de pestañas: el libro es ahora la interfaz completa
// (marcapáginas con icono, marco de stats partido en dos, botón de
// salir con popup de abandono...), no solo el fondo de "personaje".
// Coordenadas en % calculadas contra el lienzo nativo del arte NUEVO
// (300x200, más grande que el anterior 267x199 -- incluye margen para
// los marcapáginas que sobresalen a la izquierda y el botón de cerrar
// que sobresale arriba-derecha), así el contenedor solo necesita
// aspect-ratio para que todo escale junto sin recalcular nada al
// cambiar el tamaño de ventana.
const libroSrc = (nombre) => `${import.meta.env.BASE_URL}assets/ui/libro/${nombre}.png`;
// 7 casillas reales detectadas en la capa "marco-equipamiento" + la
// guía "Ubicacion-resto-marcos de equipo" (mismo método que la sesión
// anterior: flood-fill sobre los píxeles de la guía). Misma
// agrupación por intención que antes: columna izquierda = arma/
// escudo/joyas, columna derecha (junto al retrato) = armadura de pies
// a cabeza.
const LIBRO_SLOT_POS = {
  arma: { l: 15.67, t: 33, w: 6, h: 9 },
  escudo: { l: 15.67, t: 43.5, w: 6, h: 9 },
  collar: { l: 15.67, t: 54, w: 5.67, h: 9 },
  anillo: { l: 21.67, t: 54, w: 5.67, h: 9 },
  casco: { l: 42.33, t: 33, w: 6, h: 9 },
  peto: { l: 42.33, t: 43.5, w: 6, h: 9 },
  piernas: { l: 42.33, t: 54, w: 6, h: 9 },
};
// Icono de tipo de equipo (icons-equipment-menu.aseprite, 7x 16x16) que
// se muestra DENTRO de cada casilla vacía para indicar qué pieza va ahí
// -- pedido expreso, mensaje aparte: "van en los cuadrados de equipo
// para indicar qué pieza de equipo va, también se puede poner un texto
// pequeño debajo". Mapeo por forma reconocible en el recorte (espada,
// anillo, collar, torso/peto, escudo, casco, piernas) -- collar/peto
// salieron cambiados en el recorte original (confirmado por el
// usuario), de ahí que aquí NO sean identidad: "peto" usa el archivo
// ico-slot-collar.png y viceversa.
const LIBRO_SLOT_ICO = {
  arma: "arma",
  escudo: "escudo",
  casco: "casco",
  peto: "collar",
  piernas: "piernas",
  collar: "peto",
  anillo: "anillo",
};
// Posiciones de los 3 marcapáginas INACTIVOS (guía "botones-cambiomenu-
// ubicacion" del .aseprite) -- el activo va siempre en el hueco grande
// de arriba (ver pestanasLibro()), estos 3 son para las pestañas que NO
// están abiertas ahora mismo.
const LIBRO_MARCAPAGINA_INACTIVO_POS = [
  { l: 3.67, t: 35.5 },
  { l: 3.67, t: 48.5 },
  { l: 3.67, t: 63.5 },
];
// objeto de la bolsa seleccionado en la pestaña Equipamiento (-1 = ninguno)
let idxSel = -1;
// uid del fragmento de la bolsa de Alma elegido para colocar (null = ninguno)
let fragSel = null;

export function cambiarPestanaInv(dir) {
        const i = PESTANAS_INV.findIndex((t) => t.id === invTab);
        const n = PESTANAS_INV.length;
        invTab = PESTANAS_INV[(((i + dir) % n) + n) % n].id;
        idxSel = -1;
        fragSel = null;
        abrirInv();
      }

export function irPestanaInv(id) {
        invTab = id;
        idxSel = -1;
        fragSel = null;
        abrirInv();
      }

function selItemInv(idx) {
        idxSel = idxSel === idx ? -1 : idx;
        abrirInv();
      }

// Ranking en vivo de la sesión actual (punto 5 de la mejora de UX
// multijugador): quién más daño/bajas/parries lleva, con su nombre y
// gremio elegidos. No depende de red: cada jugador (local u online) ya
// trae su propio nombre/gremio resuelto en G.players desde el lobby.
// Mapa de la planta actual (solo plantas normales -- las de jefe son una
// única sala y no tienen G.mazmorra, ver iniciarPlanta en floorgen.js).
// Una sala se considera "conocida" si ya se visitó o si es vecina directa
// de una visitada (sus puertas ya se ven en pantalla al estar dentro) --
// no se revela la mazmorra entera de golpe, solo lo que el grupo ya pudo
// ver por sí mismo.
function minimapaPlanta() {
        if (!G.mazmorra) return "";
        const salas = G.mazmorra.salas;
        const conocidas = new Set();
        for (const s of salas)
          if (s.visitada) {
            conocidas.add(s.id);
            for (const pu of s.puertas) conocidas.add(pu.destino);
          }
        const celdas = [];
        for (let gy = 0; gy < 3; gy++)
          for (let gx = 0; gx < 3; gx++) {
            const s = salas.find((x) => x.gx === gx && x.gy === gy);
            if (!s || !conocidas.has(s.id)) {
              celdas.push('<div class="mini-celda vacia"></div>');
              continue;
            }
            const actual = s.id === G.mazmorra.salaActualId;
            const ico = s.esFinal ? "★" : s.esInicial ? "▲" : "";
            celdas.push(
              '<div class="mini-celda' +
                (actual ? " actual" : s.visitada ? " visitada" : " conocida") +
                '" title="' +
                (s.esFinal ? "Sala final" : "Sala " + (s.id + 1)) +
                '">' +
                ico +
                "</div>",
            );
          }
        return (
          '<h3 style="margin-top:0;font-size:.85rem;color:var(--vespero)">🗺 Mapa de la planta</h3>' +
          '<div class="minimapa">' +
          celdas.join("") +
          "</div>" +
          '<div style="font-size:.68rem;color:var(--ceniza);margin-top:4px">▲ entrada · ★ sala final · solo se ve lo que ya habéis explorado</div>'
        );
      }

function rankingSesion() {
        const filas = G.players
          .slice()
          .sort((a, b) => (b.statDano || 0) - (a.statDano || 0))
          .map(
            (q, i) =>
              '<div class="rank-fila"><span class="rank-pos">#' +
              (i + 1) +
              '</span><span class="rank-jugador"><span class="rank-nombre" style="color:' +
              q.color +
              '">' +
              escHtml(q.nombre) +
              "</span>" +
              (q.gremio
                ? '<span class="rank-gremio">🛡 ' + escHtml(q.gremio) + "</span>"
                : "") +
              "</span>" +
              '<span class="rank-stat" title="Daño total">⚔ ' +
              Math.round(q.statDano || 0) +
              '</span><span class="rank-stat" title="Enemigos derrotados">☠ ' +
              (q.statDerrotados || 0) +
              '</span><span class="rank-stat" title="Parries exitosos">🛡‍⚔ ' +
              (q.statParries || 0) +
              "</span></div>",
          )
          .join("");
        const header =
          '<div class="rank-fila rank-header"><span class="rank-pos">#</span>' +
          '<span class="rank-jugador">Jugador</span>' +
          '<span class="rank-stat" title="Daño total">⚔ Daño</span>' +
          '<span class="rank-stat" title="Enemigos derrotados">☠ Bajas</span>' +
          '<span class="rank-stat" title="Parries exitosos">🛡‍⚔ Parries</span></div>';
        return (
          '<div class="ranking-sesion"><h3 style="margin-top:14px;font-size:.85rem;color:var(--vespero)">🏆 Ranking de la sesión</h3>' +
          header +
          filas +
          "</div>"
        );
      }

function fmtStats(st) {
        return Object.entries(st)
          .map(([k, v]) => "+" + v + " " + ETQ[k])
          .join(" · ");
      }

// Compara los stats de un objeto de la bolsa contra el equipado en su mismo
// slot: cada línea lleva el valor absoluto y, si hay algo equipado con lo
// que comparar, un delta en verde/rojo -- así se ve de un vistazo si es una
// mejora sin tener que hacer la resta a mano.
function fmtStatsComparativo(it, actual) {
        const claves = new Set(Object.keys(it.stats));
        if (actual) for (const k in actual.stats) claves.add(k);
        return [...claves]
          .map((k) => {
            const v = it.stats[k] || 0;
            let delta = "";
            if (actual) {
              const d = v - (actual.stats[k] || 0);
              if (d !== 0)
                delta =
                  ' <span style="color:' +
                  (d > 0 ? "#5fcf8f" : "#e0707a") +
                  '">(' +
                  (d > 0 ? "+" : "") +
                  d +
                  ")</span>";
            }
            return "+" + v + " " + ETQ[k] + delta;
          })
          .join(" · ");
      }

function totalPoder(st) {
        return Object.values(st || {}).reduce((a, b) => a + b, 0);
      }

function precioVenta(it) {
        return Math.round(PRECIO_VENTA[it.rareza] * (1 + 0.1 * META.mejoras.fortuna));
      }

const ETQ_CORTA = { atk: "ATK", hp: "HP", armor: "DEF", crit: "CRIT", vel: "VEL", cdr: "CDR" };

function iconoUrl(it) {
        return iconoDrop(it).toDataURL();
      }


function filtrarBolsa(slot) {
        const p = G.players[G.invSel] || G.players[0];
        p.filtroBolsa = slot;
        idxSel = -1;
        abrirInv();
      }

const ORDEN_BOLSA = ["rareza", "slot", "valor"];

function ordenarBolsa(crit) {
        const p = G.players[G.invSel] || G.players[0];
        p.ordenBolsa = crit || p.ordenBolsa || "rareza";
        const slotIdx = (s) => SLOTS.indexOf(s);
        const suma = (it) =>
          Object.values(it.stats || {}).reduce((a, b) => a + b, 0);
        if (p.ordenBolsa === "rareza")
          p.bolsa.sort(
            (a, b) => b.rareza - a.rareza || slotIdx(a.slot) - slotIdx(b.slot),
          );
        else if (p.ordenBolsa === "slot")
          p.bolsa.sort(
            (a, b) => slotIdx(a.slot) - slotIdx(b.slot) || b.rareza - a.rareza,
          );
        else p.bolsa.sort((a, b) => suma(b) - suma(a));
        idxSel = -1;
        abrirInv();
      }

// ---- Contenido de cada pestaña ----

// Celda de un slot de equipo en la columna "paper doll" de la Ficha de
// Personaje -- distinta de celdaItem() (pensada para la rejilla de la
// bolsa): compacta, con drop-target de arrastrar-y-soltar (ver
// arrastrarItemInicio/soltarEnSlot más abajo) y tooltip con los stats
// propios del objeto ya equipado (sin comparación, no hay nada que
// comparar contra sí mismo).
function celdaSlotEquipo(slot, p) {
        const it = p.equipo[slot];
        const label = SLOT_LABEL[slot] || slot;
        const dropAttrs =
          ' ondragover="permitirSoltar(event)" ondragleave="quitarResaltadoSlot(event)" ondrop="soltarEnSlot(event,\'' +
          slot +
          '\')"';
        if (!it) {
          return (
            '<div class="eq-slot vacio"' +
            dropAttrs +
            ">" +
            '<div class="eq-slot-info"><div class="eq-slot-label">' +
            label +
            '</div><div class="eq-slot-nombre" style="color:var(--ceniza);font-weight:400">Vacío</div></div>' +
            "</div>"
          );
        }
        const rar = RAREZAS[it.rareza];
        return (
          '<div class="eq-slot" style="border-color:' +
          rar.col +
          '"' +
          dropAttrs +
          ">" +
          '<img class="eq-slot-ico" src="' +
          iconoUrl(it) +
          '" alt="" />' +
          '<div class="eq-slot-info">' +
          '<div class="eq-slot-label">' +
          label +
          "</div>" +
          '<div class="eq-slot-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          "</div>" +
          '<div class="item-tooltip">' +
          '<div class="tt-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          '<div class="tt-slot">' +
          label +
          ' · <span class="' +
          rar.cls +
          '">' +
          rar.n +
          "</span></div>" +
          (it.efectoDesc
            ? '<div class="tt-efecto">✦ ' + escHtml(it.efectoDesc) + "</div>"
            : "") +
          (typeof it.kills === "number"
            ? '<div class="tt-efecto">🗡 ' + it.kills + " kills con esta arma</div>"
            : "") +
          '<div class="tt-stat-linea">' +
          fmtStats(it.stats) +
          "</div>" +
          "</div>" +
          "</div>"
        );
      }

function ordCtrlHtml(p) {
        const ord = p.ordenBolsa || "rareza";
        return (
          '<div style="display:flex;gap:6px;align-items:center;margin:10px 0 2px;flex-wrap:wrap">' +
          '<span style="font-size:.75rem;color:var(--ceniza)">Ordenar:</span>' +
          '<div class="seg">' +
          [
            ["Rareza", "rareza"],
            ["Tipo", "slot"],
            ["Poder", "valor"],
          ]
            .map(
              ([lab, v]) =>
                '<button class="' +
                (ord === v ? "on" : "") +
                '" onclick="ordenarBolsa(\'' +
                v +
                "')\">" +
                lab +
                "</button>",
            )
            .join("") +
          "</div></div>"
        );
      }

// Casilla de equipo dentro del libro: mismo `.eq-slot` de siempre (hereda
// drag&drop + tooltip ya existentes) más `.hoja-slot`, que lo reposiciona
// como icono suelto absolutamente colocado en vez de la fila con
// icono+nombre en línea que usa celdaSlotEquipo() -- no cabe texto en una
// casilla de ~18px nativos. El nombre/rareza siguen disponibles en el
// tooltip al pasar el cursor, igual que antes.
function celdaSlotLibro(slot, p) {
        const it = p.equipo[slot];
        const label = SLOT_LABEL[slot] || slot;
        const pos = LIBRO_SLOT_POS[slot];
        const style =
          "left:" + pos.l + "%;top:" + pos.t + "%;width:" + pos.w + "%;height:" + pos.h + "%" +
          (it ? ";border-color:" + RAREZAS[it.rareza].col : "");
        const dropAttrs =
          ' ondragover="permitirSoltar(event)" ondragleave="quitarResaltadoSlot(event)" ondrop="soltarEnSlot(event,\'' +
          slot +
          '\')"';
        if (!it) {
          return (
            '<div class="eq-slot hoja-slot vacio" style="' + style + '"' + dropAttrs + ">" +
            '<img class="hoja-slot-tipo-ico" src="' + libroSrc("ico-slot-" + LIBRO_SLOT_ICO[slot]) + '" alt="" />' +
            '<span class="hoja-slot-etiqueta">' + label + "</span>" +
            '<div class="item-tooltip"><div class="tt-nombre" style="color:var(--ceniza)">' +
            label +
            '</div><div class="tt-slot">Vacío</div></div>' +
            "</div>"
          );
        }
        const rar = RAREZAS[it.rareza];
        // Arrastrable hacia fuera para desequipar -- pedido expreso, no
        // había forma de quitar un objeto ya puesto (ver soltarEnBolsa()
        // más abajo, activo sobre .hoja-grid-inv-wrap).
        const dragAttrs =
          ' draggable="true" ondragstart="arrastrarEquipoInicio(event,\'' +
          slot +
          '\')" ondragend="arrastrarEquipoFin(event)"';
        return (
          '<div class="eq-slot hoja-slot" style="' + style + '"' + dropAttrs + dragAttrs + ">" +
          '<img class="eq-slot-ico" src="' + iconoUrl(it) + '" alt="" />' +
          '<div class="item-tooltip">' +
          '<div class="tt-nombre ' + rar.cls + '">' + escHtml(it.nombre) + "</div>" +
          '<div class="tt-slot">' + label + ' · <span class="' + rar.cls + '">' + rar.n + "</span></div>" +
          (it.efectoDesc ? '<div class="tt-efecto">✦ ' + escHtml(it.efectoDesc) + "</div>" : "") +
          (typeof it.kills === "number" ? '<div class="tt-efecto">🗡 ' + it.kills + " kills con esta arma</div>" : "") +
          '<div class="tt-stat-linea">' + fmtStats(it.stats) + "</div>" +
          "</div>" +
          "</div>"
        );
      }

// Celda de la bolsa dentro del libro: icono suelto (sin nombre/tipo/
// impacto en línea, a diferencia de celdaItem() de la rejilla grande de
// siempre) -- la página derecha del libro es demasiado pequeña para esa
// densidad de texto. Mismo tooltip resumido que celdaSlotLibro.
function celdaItemLibro(it, idx, p) {
        const rar = RAREZAS[it.rareza];
        const seleccionada = idx === idxSel;
        return (
          '<div class="item-cell-libro' + (seleccionada ? " seleccionada" : "") + '" style="border-color:' + rar.col + '"' +
          ' draggable="true" ondragstart="arrastrarItemInicio(event,' + idx + ')" ondragend="arrastrarItemFin(event)" onclick="selItemInv(' + idx + ')">' +
          '<img src="' + iconoUrl(it) + '" alt="" />' +
          '<div class="item-tooltip">' +
          '<div class="tt-nombre ' + rar.cls + '">' + escHtml(it.nombre) + "</div>" +
          '<div class="tt-slot">' + (SLOT_LABEL[it.slot] || it.slot) + ' · <span class="' + rar.cls + '">' + rar.n + "</span></div>" +
          "</div>" +
          "</div>"
        );
      }

function gridBolsaLibro(p) {
        const filtro = p.filtroBolsa || "todos";
        const bolsaFiltrada = p.bolsa
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => filtro === "todos" || it.slot === filtro);
        if (!p.bolsa.length)
          return '<p class="hoja-bolsa-vacia">Bolsa vacía.</p>';
        if (!bolsaFiltrada.length)
          return '<p class="hoja-bolsa-vacia">Nada de ese tipo.</p>';
        return (
          '<div class="grid-inv-libro">' +
          bolsaFiltrada.map(({ it, i }) => celdaItemLibro(it, i, p)).join("") +
          "</div>"
        );
      }

// Selector de jugador: fila de puntos de color junto al banner --
// visible en TODAS las pestañas ahora (antes solo en "personaje", con
// forma de marcapáginas en el lomo -- ese hueco lo ocupa ahora
// pestanasLibro(), así que se muda aquí). Sigue llamando a
// invSel(i), igual que la fila plana .tabs-jug de siempre.
function selectorJugadorLibro() {
        if (G.players.length < 2) return "";
        return (
          '<div class="hoja-pieza hoja-selector-jugador">' +
          G.players
            .map(
              (q, i) =>
                '<button class="hoja-jugador-punto' + (i === G.invSel ? " activa" : "") + '" style="background:' + q.color + '" onclick="invSel(' + i + ')" title="' + escHtml(q.nombre) + '"></button>',
            )
            .join("") +
          "</div>"
        );
      }

// Marcapáginas de sección (Personaje/Alma/Mapa/Ajustes): la pestaña
// ACTIVA ocupa siempre el hueco grande/apuntado de arriba
// (marcapagina-activo.png, con su propio icono), las demás se reparten
// en los 3 huecos pequeños de debajo (marcapagina.png, uno para cada
// una de las otras 3) -- confirmado con el usuario ("la activa sube al
// hueco grande, las demás se reordenan debajo").
function pestanasLibro() {
        const conIcono = PESTANAS_INV.filter((t) => t.icoImg);
        const activa = conIcono.find((t) => t.id === invTab) || conIcono[0];
        const inactivas = conIcono.filter((t) => t.id !== activa.id);
        let html =
          '<button class="hoja-marcapagina hoja-marcapagina-activa" style="background-image:url(\'' +
          libroSrc("marcapagina-activo") +
          "')\" onclick=\"irPestanaInv('" +
          activa.id +
          "')\" title=\"" +
          escHtml(activa.nombre) +
          '">' +
          '<img class="hoja-marcapagina-ico" src="' + libroSrc("ico-" + activa.icoImg) + '" alt="" />' +
          "</button>";
        inactivas.forEach((t, i) => {
          const pos = LIBRO_MARCAPAGINA_INACTIVO_POS[i];
          if (!pos) return;
          html +=
            '<button class="hoja-marcapagina" style="left:' + pos.l + "%;top:" + pos.t + "%;background-image:url('" +
            libroSrc("marcapagina") +
            "')\" onclick=\"irPestanaInv('" +
            t.id +
            "')\" title=\"" +
            escHtml(t.nombre) +
            '">' +
            '<img class="hoja-marcapagina-ico hoja-marcapagina-ico-chica" src="' + libroSrc("ico-" + t.icoImg) + '" alt="" />' +
            "</button>";
        });
        return html;
      }

// Marcapáginas fijo de "Salir" (ico-salir.png) -- NO es una pestaña de
// contenido (no cambia invTab ni redibuja el libro): dispara
// directamente el popup de abandonar. Pedido expreso: separado del
// botón de cerrar (X, ver marcoLibroChrome() -- ese vuelve a cerrar el
// libro sin más, "para seguir jugando"), bajo la pila de los 3
// marcapáginas de sección.
function salirBotonHtml() {
        return (
          '<button class="hoja-marcapagina hoja-marcapagina-salir" style="background-image:url(\'' +
          libroSrc("marcapagina") +
          "')\" onclick=\"abrirConfirmarAbandono()\" title=\"Salir\">" +
          '<img class="hoja-marcapagina-ico hoja-marcapagina-ico-chica" src="' + libroSrc("ico-salir") + '" alt="" />' +
          "</button>"
        );
      }

// Popup "¿Seguro que quieres volver ya?" -- reutiliza el contenedor
// #menu-pausa/#menu-pausa-inner que ya existe en index.html (antes
// alojaba el menú de pausa intermedio, ahora sin uso, ver
// ui/pauseMenu.js) en vez de crear un overlay nuevo. Solo lo abre el
// marcapáginas de Salir (ver salirBotonHtml()) -- el botón de cerrar
// (X) del libro vuelve a cerrar sin más, pedido expreso: "el botón con
// la X es para seguir jugando".
function abrirConfirmarAbandono() {
        document.getElementById("menu-pausa-inner").innerHTML =
          '<div class="popup-abandono">' +
          "<h3>¿Seguro que quieres volver ya?</h3>" +
          "<p>Perderás la mitad de lo que has conseguido en esta expedición.</p>" +
          '<div class="popup-abandono-botones">' +
          '<button class="btn peligro" onclick="confirmarAbandonoDefinitivo()">Abandonar</button>' +
          '<button class="btn dorado" onclick="cerrarPopupAbandono()">Continuar</button>' +
          "</div></div>";
        mostrar("menu-pausa");
      }

function cerrarPopupAbandono() {
        ocultar("menu-pausa");
      }

// abandonarPartida() (core/gameflow.js) trae su PROPIO confirm de doble
// clic (G.confirmAband) pensado para el botón de texto de siempre --
// aquí la confirmación ya la hizo este popup, así que se fuerza el flag
// antes de llamarla para que ejecute el abandono real a la primera.
function confirmarAbandonoDefinitivo() {
        if (G) G.confirmAband = true;
        cerrarPopupAbandono();
        abandonarPartida();
      }
window.abrirConfirmarAbandono = abrirConfirmarAbandono;
window.cerrarPopupAbandono = cerrarPopupAbandono;
window.confirmarAbandonoDefinitivo = confirmarAbandonoDefinitivo;

// "Chrome" compartido por TODAS las pestañas del libro: fondo, pestañas
// de sección, marcapáginas de salir, selector de jugador, título
// dinámico (banner) y botón de cerrar. `contenido` es el HTML
// específico de cada pestaña, ya posicionado.
function marcoLibroChrome(contenido) {
        const titulo = (PESTANAS_INV.find((t) => t.id === invTab) || {}).nombre || "Personaje";
        return (
          '<div class="hoja-libro">' +
          '<img class="hoja-fondo" src="' + libroSrc("fondo") + '" alt="" />' +
          pestanasLibro() +
          salirBotonHtml() +
          selectorJugadorLibro() +
          '<div class="hoja-pieza hoja-banner-titulo" style="background-image:url(\'' + libroSrc("banner-titulo") + "')\">" +
          '<span class="hoja-banner-titulo-texto">' + escHtml(titulo) + "</span>" +
          "</div>" +
          '<button class="hoja-pieza hoja-cerrar" style="background-image:url(\'' + libroSrc("boton-cerrar") + "')\" onclick=\"cerrarInv()\" aria-label=\"Cerrar\"></button>" +
          contenido +
          "</div>"
        );
      }

// Lista de habilidades para la columna derecha de .hoja-stats -- combina
// las universales (mismo mapeo de teclas que systems/input.js:
// Espacio=esquivar, clic derecho=parry, E=interactuar, R=disparoSecundario,
// Q=habilidad con el nombre real de ROLES[rol].skill) con el extra propio
// de cada clase (Estocada del guerrero, elemento+Senda del mago, apoyos
// del clérigo, formas del druida -- arquero/pícaro no tienen extra: su
// carga se hace manteniendo el propio ataque básico).
function habilidadesLibro(p, b) {
        const lista = [
          { tecla: "Clic", txt: "Ataque básico" },
          { tecla: "␣", txt: "Esquivar" },
          { tecla: "Clic-D", txt: "Parry" },
          { tecla: "E", txt: "Interactuar" },
          { tecla: "R", txt: "Disparo secundario" },
          { tecla: "Q", txt: b.skill.nombre },
        ];
        if (p.rol === "guerrero") {
          lista.push({ tecla: "⇧", txt: "Estocada" });
        } else if (p.rol === "mago") {
          lista.push({ tecla: "1-3", txt: "Elemento" });
          lista.push({ tecla: "C", txt: SENDA_ELEMENTAL.nombre });
        } else if (p.rol === "clerigo") {
          lista.push({ tecla: "1-3", txt: "Apoyos: " + SUPS.map((s) => s.corto).join("/") });
        } else if (p.rol === "druida") {
          lista.push({ tecla: "1-3", txt: "Formas: " + FORMAS_DRUIDA.map((f) => FORMAS_INFO[f].nombre).join("/") });
        }
        return lista
          .map(
            (h) =>
              '<div class="hoja-hab"><b>' + escHtml(h.tecla) + "</b>" + escHtml(h.txt) + "</div>",
          )
          .join("");
      }

// Filtro de la bolsa, versión compacta para dentro del libro (misma
// lógica/acción que filtroCtrlHtml() -- onclick="filtrarBolsa(...)" -- solo
// más pequeño para caber en la franja bajo la rejilla de la página
// derecha).
function filtroLibroHtml(p) {
        const filtro = p.filtroBolsa || "todos";
        return (
          '<div class="hoja-pieza hoja-filtro">' +
          [["Todo", "todos"], ...SLOTS.map((s) => [SLOT_LABEL[s] || s, s])]
            .map(
              ([lab, v]) =>
                '<button class="' +
                (filtro === v ? "on" : "") +
                '" onclick="filtrarBolsa(\'' +
                v +
                "')\">" +
                lab +
                "</button>",
            )
            .join("") +
          "</div>"
        );
      }

function tabPersonaje(p, t, b) {
        const xpPct =
          p.nivel >= MAX_NIV_PJ ? 100 : Math.round((p.xp / p.xpSig) * 100);
        const chips = p.cartasElegidas.length
          ? p.cartasElegidas
              .map((c) => {
                const rc = CARD_RAREZAS.find((r) => r.id === c.rar);
                const col =
                  {
                    normal: "#9a93ab",
                    magico: "#6fb3e8",
                    raro: "#4acca0",
                    epico: "#c084f0",
                    legendario: "#e9b45c",
                  }[c.rar] || "#9a93ab";
                return (
                  '<span class="chip-mejora" style="color:' +
                  col +
                  '">' +
                  c.ico +
                  " " +
                  c.nombre +
                  "</span>"
                );
              })
              .join("")
          : '<span style="color:var(--ceniza);font-size:.72rem">Ninguna todavía — sube de nivel</span>';
        const insignias =
          (p.rol === "druida"
            ? '<span style="color:' + FORMAS_INFO[p.forma].color + '">' + FORMAS_INFO[p.forma].ico + " " + FORMAS_INFO[p.forma].nombre + "</span>"
            : "") +
          (p.cartasPendientes > 0
            ? ' <span style="color:#ffd27f">★ ' + p.cartasPendientes + " tarjeta(s) pendiente(s)</span>"
            : "");
        const contenido =
          '<div class="hoja-pieza hoja-info-jugador" style="background-image:url(\'' + libroSrc("info-jugador-marco") + "')\">" +
          '<span class="hoja-info-jugador-texto">' + escHtml(p.nombre) + " · Nv. " + p.nivel + "/" + MAX_NIV_PJ + "</span>" +
          "</div>" +
          '<div class="hoja-pieza hoja-xp" style="background-image:url(\'' + libroSrc("xp-fondo") + "')\">" +
          '<div class="hoja-xp-relleno" style="width:' + xpPct + '%"></div>' +
          "</div>" +
          SLOTS.map((s) => '<img class="hoja-pieza hoja-marco-equipo" src="' + libroSrc("marco-equipamiento") + '" style="left:' + LIBRO_SLOT_POS[s].l + "%;top:" + LIBRO_SLOT_POS[s].t + "%;width:" + LIBRO_SLOT_POS[s].w + "%;height:" + LIBRO_SLOT_POS[s].h + '%" alt="" />').join("") +
          SLOTS.map((s) => celdaSlotLibro(s, p)).join("") +
          '<canvas id="ficha-retrato" class="hoja-pieza hoja-retrato" width="160" height="180"></canvas>' +
          '<div class="hoja-pieza hoja-stats-panel" style="background-image:url(\'' + libroSrc("stats-marco") + "')\">" +
          '<div class="hoja-stats-col">' +
          '<div class="hoja-stat" title="Daño">⚔<b>' + t.atk + "</b></div>" +
          '<div class="hoja-stat" title="Vida">❤<b>' + Math.ceil(p.hp) + "/" + t.hpMax + "</b></div>" +
          '<div class="hoja-stat" title="Armadura">🛡<b>' + t.armor + "</b></div>" +
          '<div class="hoja-stat" title="Crítico">🎯<b>' + t.crit + "%</b></div>" +
          '<div class="hoja-stat" title="Velocidad">💨<b>' + t.vel + "</b></div>" +
          '<div class="hoja-stat" title="Reducción de cooldown">⏱<b>' + t.cdr + "%</b></div>" +
          "</div></div>" +
          '<div class="hoja-pieza hoja-skills-panel" style="background-image:url(\'' + libroSrc("skills-marco") + "')\">" +
          '<div class="hoja-stats-col hoja-hab-col">' + habilidadesLibro(p, b) + "</div>" +
          "</div>" +
          '<img class="hoja-pieza hoja-marco-inv" src="' + libroSrc("marco-inventario") + '" alt="" />' +
          '<div class="hoja-pieza hoja-inv-titulo">Inventario</div>' +
          '<div class="hoja-pieza hoja-grid-inv-wrap" ondragover="permitirSoltar(event)" ondragleave="quitarResaltadoSlot(event)" ondrop="soltarEnBolsa(event)">' + gridBolsaLibro(p) + "</div>" +
          filtroLibroHtml(p);
        return (
          marcoLibroChrome(contenido) +
          (insignias ? '<div class="libro-insignias">' + insignias + "</div>" : "") +
          '<h3 class="libro-subtitulo">Mejoras de nivel (' +
          p.cartasElegidas.length +
          ")</h3>" +
          '<div class="chips-mejoras">' +
          chips +
          "</div>" +
          '<h3 class="libro-subtitulo">Ordenar la bolsa</h3>' +
          ordCtrlHtml(p) +
          panelAccionItem(p) +
          rankingSesion()
        );
      }

// Envuelve el contenido de una pestaña que NO es "personaje" (Mapa/Alma/
// Ajustes) en el mismo libro de fondo (fondo.png, las 2 páginas
// en blanco + bordes/esquinas, sin las piezas de equipo/inventario que
// eran solo para la ficha) -- pedido expreso: "abandonar ya el sistema
// actual y que todo se base en el libro, usándolo de fondo". Mismo
// marcoLibroChrome() que tabPersonaje() (pestañas/selector de jugador/
// título/botón de salir), sin tarjeta de fondo en las páginas -- pedido
// expreso: "no pongas un background a la columna para que se vea bien
// el libro de fondo". El contenido de cada pestaña sigue exactamente
// igual (mismo HTML/CSS/colores de siempre, ya probados), solo cambia
// el marco que lo rodea. `der` es opcional: si se omite, `izq` ocupa
// una única página centrada (pensado para contenido pequeño como el
// minimapa); si se pasa, cada argumento va en su propia página.
function envolverEnLibroBlanco(izq, der) {
        const paginas =
          der != null
            ? '<div class="hoja-libro-blanco-pagina">' + izq + "</div>" +
              '<div class="hoja-libro-blanco-pagina">' + der + "</div>"
            : '<div class="hoja-libro-blanco-pagina hoja-libro-blanco-sola">' + izq + "</div>";
        return marcoLibroChrome('<div class="hoja-libro-blanco-paginas">' + paginas + "</div>");
      }

// Pedido expreso: sin la tarjeta oscura general de las páginas en
// blanco, el mapa (pensado con colores claros sobre fondo oscuro, ver
// .mini-celda) no se leía nada sobre el papel -- se le da su propia
// tarjeta oscura, fija en la hoja izquierda (antes centrada en las dos
// páginas). La hoja derecha queda libre por ahora.
function tabMapa() {
        const mm = minimapaPlanta();
        const contenido =
          '<div class="mapa-marco">' +
          (mm ||
            '<p style="color:var(--ceniza)">Sin mapa en esta sala (las plantas de jefe son una única sala).</p>') +
          "</div>";
        return envolverEnLibroBlanco(contenido, "");
      }

// ---- Pestaña Alma (Fragmentos, ver systems/soul.js) ----

const DIR_FLECHA = { N: "↑", S: "↓", E: "→", W: "←" };

function fmtStatsFrag(stat) {
        return Object.entries(stat)
          .map(([k, v]) => "+" + v + " " + (ETQ_CORTA[k] || k))
          .join(" · ");
      }

// Miniatura de la forma del fragmento (bounding box en casillas) para la
// lista de la bolsa -- igual de útil que un número para saber si un
// fragmento de 3 casillas en L va a caber en el hueco que te queda.
function miniFormaHtml(frag) {
        const xs = frag.forma.map(([dx]) => dx),
          ys = frag.forma.map(([, dy]) => dy);
        const minX = Math.min(...xs),
          maxX = Math.max(...xs),
          minY = Math.min(...ys),
          maxY = Math.max(...ys);
        const w = maxX - minX + 1,
          h = maxY - minY + 1;
        const ocupadas = new Set(
          frag.forma.map(([dx, dy]) => dx - minX + "," + (dy - minY)),
        );
        let celdas = "";
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            celdas +=
              '<div class="mini-frag-cel' +
              (ocupadas.has(x + "," + y) ? " on" : "") +
              '"></div>';
        return (
          '<div class="mini-frag" style="grid-template-columns:repeat(' +
          w +
          ',1fr)">' +
          celdas +
          "</div>"
        );
      }

function fragEnBolsaLinea(f) {
        const frag = fragPorId(f.fragId);
        if (!frag) return "";
        const rar = RAREZAS[frag.rareza];
        const seleccionado = fragSel === f.uid;
        return (
          '<div class="frag-item ' +
          rar.cls +
          (seleccionado ? " seleccionada" : "") +
          '" style="border-color:' +
          rar.col +
          '" onclick="seleccionarFragAlma(\'' +
          f.uid +
          "')\">" +
          '<div class="frag-item-cab"><span class="frag-item-ico">' +
          frag.ico +
          "</span>" +
          miniFormaHtml(frag) +
          "</div>" +
          '<div class="frag-item-nombre ' +
          rar.cls +
          '">' +
          escHtml(frag.nombre) +
          "</div>" +
          '<div class="frag-item-desc">' +
          fmtStatsFrag(frag.stat) +
          "</div>" +
          (frag.bonusConexion
            ? '<div class="frag-item-conexion">🔗 si conecta: +' +
              fmtStatsFrag(frag.bonusConexion) +
              "</div>"
            : "") +
          "</div>"
        );
      }

// Fondo de cada celda de la rejilla del Alma: la misma casilla de
// equipo que ya usa Personaje (marco-equipamiento.png, ver
// LIBRO_SLOT_POS) -- pedido expreso: "usaremos los cuadrados del
// inventario marco-equipamiento si puede ser para ajustar las almas".
// Hay muchas más celdas de alma que huecos medidos a mano en Personaje,
// así que aquí se repite el mismo PNG como fondo de CADA celda de
// `.alma-grid`, no en posiciones fijas como las 7 de equipo.
const ALMA_CELDA_BG = "background-image:url('" + libroSrc("marco-equipamiento") + "');background-size:100% 100%;";

function celdaAlmaHtml(idx) {
        const { x, y } = idxAXY(idx);
        const a = META.alma;
        if (!a.desbloqueadas.includes(idx)) {
          const coste = costeCasillaAlma(a.desbloqueadas.length);
          const puede = puedeDesbloquearCasilla(idx);
          return (
            '<div class="alma-celda bloqueada' +
            (puede ? " rompible" : "") +
            '" style="' + ALMA_CELDA_BG + '" title="Romper casilla: ' +
            coste +
            ' 🪙 + 1 punto de desbloqueo" onclick="intentarDesbloquearAlma(' +
            idx +
            ')">🔒<span class="alma-coste">' +
            coste +
            "</span></div>"
          );
        }
        const oc = mapaOcupacion().get(idx);
        if (oc) {
          const frag = fragPorId(oc.fragId);
          const rar = RAREZAS[frag.rareza];
          const esAncla = oc.x === x && oc.y === y;
          const conectado = conexionesActivas().has(oc.uid);
          const lx = x - oc.x,
            ly = y - oc.y;
          let marca = "";
          if (frag.entrada && frag.entrada.x === lx && frag.entrada.y === ly)
            marca +=
              '<span class="alma-dir entrada">' +
              DIR_FLECHA[frag.entrada.dir] +
              "</span>";
          if (frag.salida && frag.salida.x === lx && frag.salida.y === ly)
            marca +=
              '<span class="alma-dir salida">' +
              DIR_FLECHA[frag.salida.dir] +
              "</span>";
          return (
            '<div class="alma-celda ocupada ' +
            rar.cls +
            (conectado ? " conectada" : "") +
            '" style="' + ALMA_CELDA_BG + "border-color:" +
            rar.col +
            '" title="' +
            escHtml(frag.nombre) +
            (conectado ? " (conectado)" : "") +
            '" onclick="quitarFragmentoAlma(\'' +
            oc.uid +
            "')\">" +
            (esAncla ? frag.ico : "") +
            marca +
            "</div>"
          );
        }
        return (
          '<div class="alma-celda vacia' +
          (fragSel ? " objetivo" : "") +
          '" style="' + ALMA_CELDA_BG + '" onclick="intentarColocarAlma(' +
          idx +
          ')"></div>'
        );
      }

function tabAlma() {
        const a = META.alma;
        const celdas = Array.from({ length: ALMA_TOTAL }, (_, i) =>
          celdaAlmaHtml(i),
        ).join("");
        const bolsaFrag = a.inventario.length
          ? a.inventario.map(fragEnBolsaLinea).join("")
          : '<p style="color:var(--ceniza);font-size:.8rem">Sin fragmentos sueltos. Desmantela armas en la Mesa de Trabajo del vestíbulo.</p>';
        const paginaIzq =
          '<div class="alma-cab">' +
          '<b style="color:var(--vespero)">🔮 Rejilla del Alma</b>' +
          '<div style="font-size:.75rem;color:var(--ceniza);margin-top:2px">Progreso de cuenta, compartido por todo el grupo. Rompe casillas con oro + puntos (uno por cada nivel que alcance cualquier personaje) y encaja fragmentos: si la salida de uno conecta con la entrada de otro, se activa su bonificación extra.</div>' +
          '<div style="margin-top:6px;font-size:.8rem">🪙 ' +
          META.oro +
          " &nbsp;·&nbsp; ✦ " +
          a.puntos +
          " punto" +
          (a.puntos === 1 ? "" : "s") +
          " de desbloqueo &nbsp;·&nbsp; " +
          a.desbloqueadas.length +
          "/" +
          ALMA_TOTAL +
          " casillas rotas</div>" +
          "</div>" +
          '<div class="alma-grid" style="grid-template-columns:repeat(' +
          ALMA_COLS +
          ',1fr)">' +
          celdas +
          "</div>";
        // Mismo marco que la bolsa de Personaje (marco-inventario.png) --
        // pedido expreso: "a la derecha tendrá el inventario de almas,
        // usará el mismo grid que el inventario". La lista interior se
        // queda como estaba (fragEnBolsaLinea, con la forma/orientación
        // de cada fragmento) en vez de forzarla a iconos sueltos: esa
        // info de forma es la que de verdad importa para saber si un
        // fragmento va a encajar, un icono plano la perdería.
        const paginaDer =
          '<div class="hoja-alma-inv-marco" style="background-image:url(\'' + libroSrc("marco-inventario") + "')\">" +
          '<h3 class="hoja-alma-inv-titulo">Inventario de Almas (' +
          a.inventario.length +
          ")</h3>" +
          (fragSel
            ? '<div style="font-size:.72rem;color:var(--ceniza);margin:2px 0 6px">Fragmento seleccionado: haz clic en una casilla desbloqueada y vacía para colocarlo.</div>'
            : "") +
          '<div class="frag-bolsa">' +
          bolsaFrag +
          "</div>" +
          "</div>";
        return envolverEnLibroBlanco(paginaIzq, paginaDer);
      }

function seleccionarFragAlma(uid) {
        fragSel = fragSel === uid ? null : uid;
        abrirInv();
      }

function intentarColocarAlma(idx) {
        if (!fragSel) {
          toast("Selecciona antes un fragmento de la bolsa", "#c9a35a");
          return;
        }
        const { x, y } = idxAXY(idx);
        const ok = colocarFragmento(fragSel, x, y);
        if (ok) {
          toast("Fragmento colocado", "#7fd4c1");
          fragSel = null;
        } else {
          toast("No encaja ahí (forma o casillas bloqueadas)", "#d1545c");
        }
        abrirInv();
      }

function quitarFragmentoAlma(uid) {
        quitarFragmento(uid);
        abrirInv();
      }

function intentarDesbloquearAlma(idx) {
        if (desbloquearCasillaAlma(idx)) toast("Casilla rota", "#ffd27f");
        else
          toast(
            "No puedes romper esa casilla todavía (oro o puntos insuficientes)",
            "#c9a35a",
          );
        abrirInv();
      }

// Panel con la descripción/acciones del objeto de la bolsa seleccionado en
// la cuadrícula (equipar, fusión, vender, tirar, dar a otro jugador) --
// separado de la celda para que la cuadrícula se mantenga compacta.
function panelAccionItem(p) {
        const it = p.bolsa[idxSel];
        if (!it) return "";
        const rar = RAREZAS[it.rareza];
        const actual = p.equipo[it.slot];
        const puedeEquipar = !(
          it.slot === "arma" &&
          it.clase &&
          it.clase !== p.rol
        );
        let transf = "";
        if (G.players.length > 1) {
          transf = G.players
            .map((q, qi) =>
              qi === G.invSel
                ? ""
                : '<button class="btn" onclick="darItem(' +
                  idxSel +
                  "," +
                  qi +
                  ')">→ ' +
                  escHtml(q.nombre) +
                  "</button>",
            )
            .join("");
        }
        return (
          '<div class="panel-item-sel" style="border-color:' +
          rar.col +
          '">' +
          '<div class="panel-item-cab">' +
          '<div class="panel-item-nombre ' +
          rar.cls +
          '">' +
          escHtml(it.nombre) +
          "</div>" +
          '<div class="panel-item-slot">' +
          (SLOT_LABEL[it.slot] || it.slot) +
          ' · <span class="' +
          rar.cls +
          '">' +
          rar.n +
          "</span></div>" +
          "</div>" +
          (it.efectoDesc
            ? '<div class="item-efecto">✦ ' + escHtml(it.efectoDesc) + "</div>"
            : "") +
          (typeof it.kills === "number"
            ? '<div class="item-efecto">🗡 ' + it.kills + " kills con esta arma</div>"
            : "") +
          '<div class="panel-item-stats">' +
          fmtStatsComparativo(it, actual) +
          "</div>" +
          '<div class="item-acciones">' +
          (puedeEquipar
            ? '<button class="btn" onclick="equipar(' +
              idxSel +
              ')">Equipar</button>'
            : '<button class="btn" disabled title="Arma de otra clase">Solo ' +
              ROLES[it.clase].nombre.split(" ")[0] +
              "</button>") +
          transf +
          '<button class="btn" onclick="venderItem(' +
          idxSel +
          ')" title="Se suma al oro de la partida (se banca al terminar, como las monedas)">Vender ' +
          precioVenta(it) +
          " 🪙</button>" +
          '<button class="btn peligro" onclick="tirarItem(' +
          idxSel +
          ')">Tirar</button>' +
          "</div>" +
          "</div>"
        );
      }

// Ajustes: antes overlay aparte (#ajustes, accesible con el botón ⚙ incluso
// antes de tener partida) -- ahora pestaña del libro, solo alcanzable con
// partida activa. "Lobby del grupo"/"Fuego amigo" (antes aquí, solo
// visibles pre-partida) se mudaron al popover de la hoguera en la
// selección de personaje (ver ui/menu.js: construirPopoverFogata()), que
// sigue siendo alcanzable antes de jugar -- aquí ya no pintan nada.
function tabAjustes() {
        const pct = (v) => Math.round(v * 100);
        const segTexto = [
          ["S", 0.85],
          ["M", 1],
          ["L", 1.2],
          ["XL", 1.45],
        ];
        // Array de filas (en vez de una única cadena) para poder repartirlas
        // en las dos páginas del libro -- ver envolverEnLibroBlanco() más
        // arriba, mismo criterio que tabAlma().
        const filas = [
          '<div class="ajuste-fila"><div><h4>🖥 Pantalla completa</h4>' +
            '<div class="a-desc">Ocupa toda la pantalla (también con F11 o la tecla F).</div></div>' +
            '<div class="ajuste-ctrl"><button class="btn' +
            (esPantallaCompleta() || maximizado ? " dorado" : "") +
            '" onclick="toggleFullscreen()">' +
            (esPantallaCompleta() || maximizado ? "Salir" : "Activar") +
            "</button></div></div>",
          '<div class="ajuste-fila"><div><h4>👆 Controles táctiles</h4>' +
            '<div class="a-desc">Joysticks y botones en pantalla en vez de teclado+ratón (prototipo).</div></div>' +
            '<div class="ajuste-ctrl"><button class="btn' +
            (M.slots[0].ctrl.tipo === "touch" ? " dorado" : "") +
            '" onclick="toggleControlTactil()">' +
            (M.slots[0].ctrl.tipo === "touch" ? "Activados" : "Desactivados") +
            "</button></div></div>",
          '<div class="ajuste-fila"><div><h4>🔍 Tamaño / resolución</h4>' +
            '<div class="a-desc">Escala el juego para aprovechar tu monitor. "Auto" lo ajusta a la ventana.</div></div>' +
            '<div class="ajuste-ctrl"><div class="seg" id="seg-escala">' +
            [
              ["Auto", "auto"],
              ["×1", "1"],
              ["×2", "2"],
              ["×3", "3"],
              ["×4", "4"],
            ]
              .map(
                ([lab, v]) =>
                  '<button class="' +
                  (AJ.escala === v ? "on" : "") +
                  '" onclick="setEscala(\'' +
                  v +
                  "')\">" +
                  lab +
                  "</button>",
              )
              .join("") +
            "</div></div></div>",
          '<div class="ajuste-fila"><div><h4>🔇 Silencio total</h4>' +
            '<div class="a-desc">Corta música y efectos de golpe.</div></div>' +
            '<div class="ajuste-ctrl"><button class="btn' +
            (AJ.silencio ? " dorado" : "") +
            '" onclick="toggleSilencio()">' +
            (AJ.silencio ? "Silenciado" : "Con sonido") +
            "</button></div></div>",
          '<div class="ajuste-fila"><div><h4>🔊 Volumen general</h4>' +
            '<div class="a-desc">Nivel maestro de todo el audio.</div></div>' +
            '<div class="ajuste-ctrl"><input type="range" min="0" max="100" value="' +
            pct(AJ.volMaster) +
            '" oninput="setVol(\'volMaster\',this.value)"><span class="val-num" id="v-master">' +
            pct(AJ.volMaster) +
            "%</span></div></div>",
          '<div class="ajuste-fila"><div><h4>💥 Efectos</h4>' +
            '<div class="a-desc">Golpes, magia, monedas, subidas de nivel.</div></div>' +
            '<div class="ajuste-ctrl"><input type="range" min="0" max="100" value="' +
            pct(AJ.volSfx) +
            '" oninput="setVol(\'volSfx\',this.value)"><span class="val-num" id="v-sfx">' +
            pct(AJ.volSfx) +
            "%</span></div></div>",
          '<div class="ajuste-fila"><div><h4>🎵 Música</h4>' +
            '<div class="a-desc">Melodía ambiental de la Torre.</div></div>' +
            '<div class="ajuste-ctrl"><input type="range" min="0" max="100" value="' +
            pct(AJ.volMus) +
            '" oninput="setVol(\'volMus\',this.value)"><span class="val-num" id="v-mus">' +
            pct(AJ.volMus) +
            "%</span></div></div>",
          '<div class="ajuste-fila"><div><h4>🔤 Tamaño del texto</h4>' +
            '<div class="a-desc">Escala los textos de menús, ficha y ayudas.</div></div>' +
            '<div class="ajuste-ctrl"><div class="seg" id="seg-texto">' +
            segTexto
              .map(
                ([lab, v]) =>
                  '<button class="' +
                  (Math.abs(AJ.texto - v) < 0.01 ? "on" : "") +
                  '" onclick="setTexto(' +
                  v +
                  ')">' +
                  lab +
                  "</button>",
              )
              .join("") +
            "</div></div></div>",
        ];
        const mitad = Math.ceil(filas.length / 2);
        return envolverEnLibroBlanco(
          filas.slice(0, mitad).join(""),
          filas.slice(mitad).join(""),
        );
      }

function setVol(cual, v) {
        initAudio();
        AJ[cual] = +v / 100;
        const el = document.getElementById(
          { volMaster: "v-master", volSfx: "v-sfx", volMus: "v-mus" }[cual],
        );
        if (el) el.textContent = Math.round(v) + "%";
        aplicarMusica();
        if (cual !== "volMus") sfx("ui");
      }

function toggleSilencio() {
        AJ.silencio = !AJ.silencio;
        initAudio();
        aplicarMusica();
        abrirInv();
      }

function setTexto(v) {
        AJ.texto = v;
        aplicarTexto();
        abrirInv();
        sfx("ui");
      }

function setEscala(v) {
        AJ.escala = v;
        ajustarLienzo();
        abrirInv();
        sfx("ui");
      }

// Toggle táctil↔teclado para J1 (M.slots[0], siempre el jugador local en
// esta ventana) -- pensado sobre todo para probar los controles táctiles
// desde escritorio con la emulación táctil de Chrome DevTools sin tener
// que desplegar a un móvil cada vez, ver systems/touchControls.js.
// Ajustes solo es alcanzable con partida activa (mismo guard que el
// resto de esta pestaña), así que además de la definición del slot (para
// la próxima partida) hay que tocar también el jugador YA en curso.
function toggleControlTactil() {
        const nuevoTipo = M.slots[0].ctrl.tipo === "touch" ? "kbm" : "touch";
        M.slots[0].ctrl = { tipo: nuevoTipo };
        if (G && G.players && G.players[0]) G.players[0].ctrl = { tipo: nuevoTipo };
        sfx("ui");
        abrirInv();
      }

export function abrirInv() {
        if (!G || !G.activo) return;
        G.pausa = true;
        const p = G.players[G.invSel] || G.players[0];
        const t = statsTot(p),
          b = ROLES[p.rol];
        let contenido;
        if (invTab === "alma") contenido = tabAlma();
        else if (invTab === "mapa") contenido = tabMapa();
        else if (invTab === "ajustes") contenido = tabAjustes();
        else contenido = tabPersonaje(p, t, b);
        // El libro es ahora la interfaz completa (marcoLibroChrome(), ver
        // más arriba) -- ya no hace falta la lista lateral .libro-tabs ni
        // la cabecera .fila-cerrar con los botones de siempre: el título
        // vive en el banner del propio libro, las pestañas en los
        // marcapáginas, y "salir" en su botón con popup de confirmación
        // (ver abrirConfirmarAbandono()).
        document.getElementById("inv-inner").innerHTML = contenido;
        mostrar("inv");
        if (invTab === "personaje") iniciarRetratoAnimado(p);
        else detenerRetratoAnimado();
      }

export function invSel(i) {
        G.invSel = i;
        idxSel = -1;
        abrirInv();
      }

export function cerrarInv() {
        detenerRetratoAnimado();
        ocultar("inv");
        if (G) {
          G.pausa = false;
          G.confirmAband = false;
        }
      }

// ---- Preview animado en idle (canvas #ficha-retrato, pestaña Personaje) ----
// import() dinámico para no crear un ciclo de módulos: render/character.js
// importa systems/input.js, que a su vez importa este archivo de forma
// estática (cambiarPestanaInv/cerrarInv) -- mismo motivo/patrón que
// setLobby() en ui/settingsOverlay.js.
let retratoRAF = null;
let retratoAnimT = 0;

function detenerRetratoAnimado() {
        if (retratoRAF) {
          cancelAnimationFrame(retratoRAF);
          retratoRAF = null;
        }
      }

function iniciarRetratoAnimado(p) {
        detenerRetratoAnimado();
        const canvas = document.getElementById("ficha-retrato");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let ultimo = performance.now();
        import("../render/character.js").then(({ renderRetratoIdle }) => {
          const paso = (ahora) => {
            const dt = Math.min(0.05, (ahora - ultimo) / 1000);
            ultimo = ahora;
            retratoAnimT += dt;
            renderRetratoIdle(ctx, p, canvas.width, canvas.height, retratoAnimT);
            retratoRAF = requestAnimationFrame(paso);
          };
          retratoRAF = requestAnimationFrame(paso);
        });
      }

// ---- Arrastrar y soltar: bolsa -> slot de equipo (ver celdaSlotEquipo) ----
let arrastreIdx = null;
// uid del fragmento no aplica aquí -- este es el slot de equipo (arma,
// escudo...) que se está arrastrando FUERA para desequiparlo (ver
// arrastrarEquipoInicio/soltarEnBolsa) -- pedido expreso: "debe dejar
// arrastrarlos y soltarlos de nuevo en el inventario".
let arrastreEquipoSlot = null;

function arrastrarItemInicio(ev, idx) {
        arrastreIdx = idx;
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", String(idx));
        ev.currentTarget.classList.add("arrastrando");
      }

function arrastrarItemFin(ev) {
        ev.currentTarget.classList.remove("arrastrando");
        arrastreIdx = null;
      }

function arrastrarEquipoInicio(ev, slot) {
        arrastreEquipoSlot = slot;
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", "eq:" + slot);
        ev.currentTarget.classList.add("arrastrando");
      }

function arrastrarEquipoFin(ev) {
        ev.currentTarget.classList.remove("arrastrando");
        arrastreEquipoSlot = null;
      }

function desequiparSlot(slot) {
        const p = G.players[G.invSel] || G.players[0];
        const it = p.equipo[slot];
        if (!it) return;
        p.equipo[slot] = null;
        p.bolsa.push(it);
        p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
        toast(p.nombre + " guarda " + it.nombre, RAREZAS[it.rareza].col);
        abrirInv();
      }

function soltarEnBolsa(ev) {
        ev.preventDefault();
        ev.currentTarget.classList.remove("arrastre-sobre");
        let slot = arrastreEquipoSlot;
        arrastreEquipoSlot = null;
        if (!slot) {
          const dato = ev.dataTransfer.getData("text/plain");
          if (dato.startsWith("eq:")) slot = dato.slice(3);
        }
        if (slot) desequiparSlot(slot);
      }

function permitirSoltar(ev) {
        ev.preventDefault();
        ev.currentTarget.classList.add("arrastre-sobre");
      }

function quitarResaltadoSlot(ev) {
        ev.currentTarget.classList.remove("arrastre-sobre");
      }

function soltarEnSlot(ev, slot) {
        ev.preventDefault();
        ev.currentTarget.classList.remove("arrastre-sobre");
        const idx =
          arrastreIdx != null
            ? arrastreIdx
            : parseInt(ev.dataTransfer.getData("text/plain"), 10);
        arrastreIdx = null;
        if (Number.isNaN(idx)) return;
        const p = G.players[G.invSel] || G.players[0];
        const it = p.bolsa[idx];
        if (!it) return;
        if (it.slot !== slot) {
          toast("Ese objeto no va en ese hueco", "#c9a35a");
          return;
        }
        equipar(idx);
      }

function equipar(idx) {
        const p = G.players[G.invSel] || G.players[0];
        const it = p.bolsa[idx];
        if (!it) return;
        if (it.slot === "arma" && it.clase && it.clase !== p.rol) {
          toast(
            "Esa arma es de " +
              ROLES[it.clase].nombre +
              " — no puedes equiparla",
            "#d1545c",
          );
          return;
        }
        const ant = p.equipo[it.slot];
        p.equipo[it.slot] = it;
        p.bolsa.splice(idx, 1);
        if (ant) p.bolsa.push(ant);
        p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
        idxSel = -1;
        toast(p.nombre + " equipa " + it.nombre, RAREZAS[it.rareza].col);
        abrirInv();
      }

function tirarItem(idx) {
        const p = G.players[G.invSel] || G.players[0];
        if (p.bolsa[idx]) {
          p.bolsa.splice(idx, 1);
          idxSel = -1;
          abrirInv();
        }
      }

// Vende un objeto de la bolsa por oro AHORA en vez de esperar a la venta
// automática de fin de partida -- el oro va a G.oroRun (igual que las
// monedas recogidas), no directo a META.oro: sigue bancándose (y sujeto al
// peaje de abandonar) al terminar la partida, no salta esa mecánica.
function venderItem(idx) {
        const p = G.players[G.invSel] || G.players[0];
        const it = p.bolsa[idx];
        if (!it) return;
        const oro = precioVenta(it);
        p.bolsa.splice(idx, 1);
        G.oroRun += oro;
        idxSel = -1;
        toast("Vendido " + it.nombre + " por " + oro + " 🪙", "#ffd27f");
        abrirInv();
      }

function darItem(idx, targetIdx) {
        const p = G.players[G.invSel] || G.players[0];
        const q = G.players[targetIdx];
        const it = p.bolsa[idx];
        if (!it || !q || q === p) return;
        p.bolsa.splice(idx, 1);
        q.bolsa.push(it);
        idxSel = -1;
        toast(
          p.nombre + " da " + it.nombre + " a " + q.nombre,
          RAREZAS[it.rareza].col,
        );
        abrirInv();
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.arrastrarItemFin = arrastrarItemFin;
window.arrastrarItemInicio = arrastrarItemInicio;
window.arrastrarEquipoInicio = arrastrarEquipoInicio;
window.arrastrarEquipoFin = arrastrarEquipoFin;
window.soltarEnBolsa = soltarEnBolsa;
window.desequiparSlot = desequiparSlot;
window.cerrarInv = cerrarInv;
window.darItem = darItem;
window.permitirSoltar = permitirSoltar;
window.quitarResaltadoSlot = quitarResaltadoSlot;
window.setEscala = setEscala;
window.setTexto = setTexto;
window.setVol = setVol;
window.soltarEnSlot = soltarEnSlot;
window.toggleSilencio = toggleSilencio;
window.toggleControlTactil = toggleControlTactil;
window.equipar = equipar;
window.filtrarBolsa = filtrarBolsa;
window.intentarColocarAlma = intentarColocarAlma;
window.intentarDesbloquearAlma = intentarDesbloquearAlma;
window.invSel = invSel;
window.irPestanaInv = irPestanaInv;
window.ordenarBolsa = ordenarBolsa;
window.quitarFragmentoAlma = quitarFragmentoAlma;
window.selItemInv = selItemInv;
window.seleccionarFragAlma = seleccionarFragAlma;
window.tirarItem = tirarItem;
window.venderItem = venderItem;
