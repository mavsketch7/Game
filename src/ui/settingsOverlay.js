// Auto-generated during the modularization refactor (2026-07-23).
import { ajustarLienzo, esPantallaCompleta, maximizado, toggleFullscreen } from "../core/canvas.js";
import { LOBBIES } from "../core/constants.js";
import { AJ, aplicarTexto } from "../core/settings.js";
import { G } from "../core/state.js";
import { aplicarMusica, initAudio, reanudarAudio, sfx } from "../systems/audio.js";
import { M } from "../systems/input.js";
import { toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";

export function abrirAjustes() {
        if (G) G.pausa = true;
        const pct = (v) => Math.round(v * 100);
        const segTexto = [
          ["S", 0.85],
          ["M", 1],
          ["L", 1.2],
          ["XL", 1.45],
        ];
        document.getElementById("ajustes-inner").innerHTML =
          '<div class="fila-cerrar"><h2 class="display">⚙ Ajustes</h2>' +
          '<button class="btn dorado" onclick="cerrarAjustes()">Cerrar</button></div>' +
          '<div class="ajuste-fila"><div><h4>🖥 Pantalla completa</h4>' +
          '<div class="a-desc">Ocupa toda la pantalla (también con F11 o la tecla F).</div></div>' +
          '<div class="ajuste-ctrl"><button class="btn' +
          (esPantallaCompleta() || maximizado ? " dorado" : "") +
          '" onclick="toggleFullscreen()">' +
          (esPantallaCompleta() || maximizado ? "Salir" : "Activar") +
          "</button></div></div>" +
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
          "</div></div></div>" +
          '<div class="ajuste-fila"><div><h4>🔇 Silencio total</h4>' +
          '<div class="a-desc">Corta música y efectos de golpe.</div></div>' +
          '<div class="ajuste-ctrl"><button class="btn' +
          (AJ.silencio ? " dorado" : "") +
          '" onclick="toggleSilencio()">' +
          (AJ.silencio ? "Silenciado" : "Con sonido") +
          "</button></div></div>" +
          '<div class="ajuste-fila"><div><h4>🔊 Volumen general</h4>' +
          '<div class="a-desc">Nivel maestro de todo el audio.</div></div>' +
          '<div class="ajuste-ctrl"><input type="range" min="0" max="100" value="' +
          pct(AJ.volMaster) +
          '" oninput="setVol(\'volMaster\',this.value)"><span class="val-num" id="v-master">' +
          pct(AJ.volMaster) +
          "%</span></div></div>" +
          '<div class="ajuste-fila"><div><h4>💥 Efectos</h4>' +
          '<div class="a-desc">Golpes, magia, monedas, subidas de nivel.</div></div>' +
          '<div class="ajuste-ctrl"><input type="range" min="0" max="100" value="' +
          pct(AJ.volSfx) +
          '" oninput="setVol(\'volSfx\',this.value)"><span class="val-num" id="v-sfx">' +
          pct(AJ.volSfx) +
          "%</span></div></div>" +
          '<div class="ajuste-fila"><div><h4>🎵 Música</h4>' +
          '<div class="a-desc">Melodía ambiental de la Torre.</div></div>' +
          '<div class="ajuste-ctrl"><input type="range" min="0" max="100" value="' +
          pct(AJ.volMus) +
          '" oninput="setVol(\'volMus\',this.value)"><span class="val-num" id="v-mus">' +
          pct(AJ.volMus) +
          "%</span></div></div>" +
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
          "</div></div></div>" +
          // Lobby del grupo y fuego amigo son elección de ANTES de empezar la
          // partida (G.lobby/G.ff se capturan una vez en nuevaPartida()) --
          // cambiarlos a mitad de partida no haría nada, así que solo se
          // muestran mientras se está en la pantalla de selección.
          (!G || !G.activo
            ? '<div class="ajuste-fila"><div><h4>⚔ Lobby del grupo</h4>' +
              '<div class="a-desc">Bando de tu grupo esta partida (bonus para todos).</div></div>' +
              '<div class="ajuste-ctrl"><div class="seg" id="seg-lobby">' +
              Object.entries(LOBBIES)
                .map(
                  ([id, l]) =>
                    '<button class="' +
                    (M.lobby === id ? "on" : "") +
                    '" onclick="setLobby(\'' +
                    id +
                    "')\">" +
                    l.icon +
                    " " +
                    l.nombre +
                    "</button>",
                )
                .join("") +
              "</div></div></div>" +
              '<div class="ajuste-fila"><div><h4>🔥 Fuego amigo</h4>' +
              '<div class="a-desc">Ataques, flechas y áreas dañan a tus compañeros al 50%.</div></div>' +
              '<div class="ajuste-ctrl"><button class="btn' +
              (AJ.fuegoAmigo ? " dorado" : "") +
              '" onclick="toggleFuegoAmigo()">' +
              (AJ.fuegoAmigo ? "Activado" : "Desactivado") +
              "</button></div></div>"
            : "");
        mostrar("ajustes");
      }

export function cerrarAjustes() {
        ocultar("ajustes");
        if (
          G &&
          document.getElementById("inv").classList.contains("oculto") &&
          document
            .getElementById("cartas-overlay")
            .classList.contains("oculto") &&
          document.getElementById("tienda").classList.contains("oculto") &&
          document.getElementById("skins").classList.contains("oculto")
        )
          G.pausa = false;
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
        abrirAjustes();
      }

function setTexto(v) {
        AJ.texto = v;
        aplicarTexto();
        abrirAjustes();
        sfx("ui");
      }

function setEscala(v) {
        AJ.escala = v;
        ajustarLienzo();
        abrirAjustes();
        sfx("ui");
      }

// import() dinámico (no en el import estático de arriba) para no crear un
// ciclo de módulos: systems/input.js importa este archivo de forma
// estática, y menu.js importa systems/input.js -- mismo motivo que
// core/canvas.js usa import() para abrir ajustes.
function setLobby(id) {
        M.lobby = id;
        abrirAjustes();
        sfx("ui");
        import("./menu.js").then(({ construirMenu }) => construirMenu());
      }

function toggleFuegoAmigo() {
        AJ.fuegoAmigo = !AJ.fuegoAmigo;
        abrirAjustes();
        sfx("ui");
      }

export function toggleSilencioRapido() {
        AJ.silencio = !AJ.silencio;
        initAudio();
        aplicarMusica();
        if (G)
          toast(AJ.silencio ? "🔇 Silencio" : "🔊 Sonido activado", "#9a93ab");
        if (!document.getElementById("ajustes").classList.contains("oculto"))
          abrirAjustes();
      }

document.getElementById("btn-ajustes").onclick = () => {
        initAudio();
        reanudarAudio();
        aplicarMusica();
        abrirAjustes();
      };

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarAjustes = cerrarAjustes;
window.setEscala = setEscala;
window.setLobby = setLobby;
window.setTexto = setTexto;
window.setVol = setVol;
window.toggleFuegoAmigo = toggleFuegoAmigo;
window.toggleSilencio = toggleSilencio;
