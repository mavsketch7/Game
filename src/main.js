// Auto-generated during the modularization refactor (2026-07-23).
import { H, W, ajustarLienzo, cx } from "./core/canvas.js";
import { update } from "./core/loop.js";
import { aplicarTexto } from "./core/settings.js";
import { G } from "./core/state.js";
import { NET, interpolarPosicionesRed, netEnviarInputCliente, netEnviarSnapshot } from "./net/peer.js";
import { render } from "./render/world.js";
import { pollPads } from "./systems/input.js";
import { construirMenu } from "./ui/menu.js";

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
        if (G && G.activo && !G.pausa) update(dt);
        render();
        if (NET.modo === "host") netEnviarSnapshot();
        requestAnimationFrame(bucle);
      }

construirMenu();

aplicarTexto();

ajustarLienzo();

requestAnimationFrame(bucle);
