// Auto-generated during the modularization refactor (2026-07-23).
import { AJ } from "./settings.js";
// nota: abrirAjustes se importa dinámicamente más abajo (no de forma
// estática) para evitar un ciclo de módulos: ui/settingsOverlay.js
// importa de este mismo archivo, y ese ciclo hacía que "cv"/"W"/"H" se
// leyeran antes de inicializarse cuando el grafo se cargaba en cierto
// orden (ver systems/input.js, que registra listeners sobre `cv` en su
// nivel superior).

export const cv = document.getElementById("lienzo");

export const cx = cv.getContext("2d");

cx.imageSmoothingEnabled = false;

export const W = cv.width,
        H = cv.height,
        TAU = Math.PI * 2;

export let maximizado = false;

const _marco = document.getElementById("marco");

export function ajustarLienzo() {
        const fs = esPantallaCompleta() || maximizado;
        let maxW, maxH;
        if (fs) {
          maxW = window.innerWidth;
          maxH = window.innerHeight;
        } else {
          maxW = window.innerWidth * 0.97;
          maxH = window.innerHeight * 0.84;
        }
        let esc;
        if (AJ.escala === "auto") esc = Math.min(maxW / W, maxH / H);
        else esc = Math.min(parseFloat(AJ.escala), maxW / W, maxH / H);
        if (!fs) esc = Math.max(esc, 0.5);
        const cw = Math.round(W * esc),
          ch = Math.round(H * esc);
        cv.style.width = cw + "px";
        cv.style.height = ch + "px";
        if (_marco) _marco.style.width = fs ? "100%" : cw + "px";
      }

export function esPantallaCompleta() {
        return !!(
          document.fullscreenElement || document.webkitFullscreenElement
        );
      }

export function toggleFullscreen() {
        const el = document.documentElement;
        const yaFS = esPantallaCompleta();
        if (!yaFS && !maximizado) {
          // intentar la API de pantalla completa; si no está disponible (iframe), maximizar en la ventana
          const req = el.requestFullscreen || el.webkitRequestFullscreen;
          if (req) {
            const pr = req.call(el);
            if (pr && pr.catch)
              pr.catch(() => {
                maximizado = true;
                document.body.classList.add("pantalla-completa");
                ajustarLienzo();
              });
          } else {
            maximizado = true;
            document.body.classList.add("pantalla-completa");
          }
        } else {
          if (yaFS) {
            const ex = document.exitFullscreen || document.webkitExitFullscreen;
            if (ex) ex.call(document);
          }
          if (maximizado) {
            maximizado = false;
            document.body.classList.remove("pantalla-completa");
          }
        }
        setTimeout(() => {
          ajustarLienzo();
          if (!document.getElementById("ajustes").classList.contains("oculto"))
            import("../ui/settingsOverlay.js").then(({ abrirAjustes }) => abrirAjustes());
        }, 200);
      }

window.addEventListener("resize", ajustarLienzo);

document.addEventListener("fullscreenchange", () => {
        setTimeout(ajustarLienzo, 60);
      });

document.addEventListener("webkitfullscreenchange", () => {
        setTimeout(ajustarLienzo, 60);
      });

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.toggleFullscreen = toggleFullscreen;
