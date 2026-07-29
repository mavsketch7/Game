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

// Por debajo de 1x (ventana más pequeña que el lienzo nativo) no hay forma
// de evitar artefactos de escalado. A partir de 1x, redondear siempre hacia
// abajo al entero exacto es obligatorio: los patrones de suelo/muro
// (createPattern de un tile pequeño repetido) muestran un moiré muy visible
// si el navegador los reescala por CSS con un factor no entero -- el
// lienzo ya usa image-rendering:pixelated, pero eso solo evita el
// difuminado, no el moiré de un factor fraccionario.
function escalaSinMoire(limite) {
        return limite >= 1 ? Math.floor(limite) : limite;
      }

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
        const limite = Math.min(maxW / W, maxH / H);
        let esc;
        if (AJ.escala === "auto") esc = escalaSinMoire(limite);
        else esc = escalaSinMoire(Math.min(parseFloat(AJ.escala), limite));
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

// Pantalla completa "por defecto": los navegadores bloquean
// requestFullscreen() sin un gesto real del usuario, así que no se puede
// forzar al cargar la página. En su lugar, ui/intro.js llama a esto en el
// primer gesto real (tecla/clic/botón de mando en la pantalla "Pulsa
// Start"), el mismo punto donde ya se desbloquea el audio -- efecto
// práctico idéntico a "empieza en pantalla completa" sin violar la
// política del navegador.
export function pedirPantallaCompleta() {
        if (esPantallaCompleta() || maximizado) return;
        const el = document.documentElement;
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
        setTimeout(ajustarLienzo, 200);
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
