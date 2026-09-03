// Auto-generated during the modularization refactor (2026-07-23).
import { H, W, ajustarLienzo, cx } from "./core/canvas.js";
import { update } from "./core/loop.js";
import { aplicarTexto } from "./core/settings.js";
import { G } from "./core/state.js";
import { NET, interpolarPosicionesRed, netEnviarEventosFx, netEnviarInputCliente, netEnviarSnapshot } from "./net/peer.js";
import { render } from "./render/world.js";
import { M, pollPads } from "./systems/input.js";
import { actualizarVisibilidadTactil, montarControlesTactiles, tocarActivo } from "./systems/touchInput.js";
import { construirMenu } from "./ui/menu.js";
import "./ui/cursor.js";
import "./ui/guildRankings.js";
import "./ui/intro.js";

// En un dispositivo táctil, J1 juega con controles táctiles en vez de
// teclado+ratón -- sustituye, no se "une" como un mando adicional (un
// dispositivo táctil es la propia pantalla, no puede coexistir consigo
// mismo). Solo cubre el slot local (host u offline); un invitado de red
// sigue sin soporte táctil (ver systems/touchInput.js).
if (tocarActivo()) {
  M.slots[0].ctrl = { tipo: "touch" };
  montarControlesTactiles();
}

let ultimo = 0;

function bucle(ts) {
        const dt = Math.min(0.033, (ts - ultimo) / 1000 || 0.016);
        ultimo = ts;
        if (NET.modo === "cliente") {
          // el cliente no simula: envía su input y dibuja el estado recibido
          netEnviarInputCliente();
          try {
            if (G && G.players) {
              interpolarPosicionesRed(dt);
              render();
            }
            else {
              cx.fillStyle = "#12101c";
              cx.fillRect(0, 0, W, H);
              cx.fillStyle = "#e9b45c";
              cx.font = "700 20px Cinzel";
              cx.textAlign = "center";
              cx.fillText("Conectando a la sala…", W / 2, H / 2);
            }
          } catch (err) {
            /* un snapshot incompleto no debe congelar el cliente */
          }
          requestAnimationFrame(bucle);
          return;
        }
        pollPads();
        actualizarVisibilidadTactil();
        if (G && G.activo && !G.pausa) update(dt);
        render();
        if (NET.modo === "host") {
          netEnviarEventosFx();
          netEnviarSnapshot();
        }
        requestAnimationFrame(bucle);
      }

construirMenu();

aplicarTexto();

ajustarLienzo();

requestAnimationFrame(bucle);
