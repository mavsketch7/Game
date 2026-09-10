// Auto-generated during the modularization refactor (2026-07-23).
import { AJ } from "./settings.js";
// nota: abrirInv se importa dinámicamente más abajo (no de forma
// estática) para evitar un ciclo de módulos: ui/inventory.js
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

// Reloj de animación global (segundos acumulados, ver render() en
// render/world.js) -- vive aquí en vez de en world.js porque tanto
// world.js como render/character.js (dibujo de jugador/enemigos) lo leen
// constantemente para pulsos/ondas, y este módulo no depende de ninguno
// de los dos -- evita un ciclo entre ellos. Solo world.js debe avanzarlo
// (una vez por frame, en su render()); el resto solo lo lee.
export let animGlobal = 0;

export function avanzarAnimGlobal(dt) {
  animGlobal += dt;
}

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
        // El suelo de 0.5 es solo para que una ventana normal no encoja el
        // lienzo hasta hacerlo ilegible -- nunca debe forzarlo a un tamaño
        // MAYOR que el hueco real disponible (limite ya es el tamaño máximo
        // que cabe sin desbordar). Sin este tope, una ventana de escritorio
        // angosta (p.ej. 300x800, sin pantalla completa) producía un
        // lienzo/#marco más ancho que el viewport -- scroll horizontal en
        // todo el body, con los overlays (position:absolute contra #marco)
        // desbordando también. Confirmado con auditoría de responsive.
        if (!fs) esc = Math.min(Math.max(esc, 0.5), limite);
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

// Bloqueo de orientación "a horizontal" -- mejor esfuerzo, solo tiene
// efecto en Android Chrome/Edge en pantalla completa (iOS Safari no
// soporta screen.orientation.lock() en ningún caso). El aviso de
// #aviso-rotar (ver systems/touchControls.js) es el respaldo universal
// para cuando esto no hace nada -- esto es solo una mejora extra donde
// el navegador lo permita. try/catch además del .catch() de la
// promesa: algunos navegadores (visto en pruebas) lanzan la excepción
// de permisos de forma SÍNCRONA en vez de devolver una promesa
// rechazada -- sin el try/catch, esa excepción escapa de este .then()
// como un rechazo de promesa sin gestionar.
function intentarBloqueoOrientacion() {
        try {
          screen.orientation?.lock?.("landscape").catch(() => {});
        } catch (e) {
          /* ignorado a propósito, ver comentario de arriba */
        }
      }

// Pantalla completa "por defecto": los navegadores bloquean
// requestFullscreen() sin un gesto real del usuario, así que no se puede
// forzar al cargar la página. En su lugar, ui/intro.js llama a esto en el
// primer gesto real (tecla/clic/botón de mando en la pantalla "Pulsa
// Start"), el mismo punto donde ya se desbloquea el audio -- efecto
// práctico idéntico a "empieza en pantalla completa" sin violar la
// política del navegador.
//
// Reportado con una captura real de un Android/Chrome concreto: el
// primer intento se rechazó en silencio (Promise de requestFullscreen()
// rechazada -- el motivo exacto varía por versión/OEM, no reproducible
// aquí) y el juego se quedó para siempre en el respaldo de solo-CSS
// (body.pantalla-completa), que llena el viewport del NAVEGADOR pero no
// esconde su barra de direcciones ni la barra de navegación del sistema
// -- a diferencia de la API de pantalla completa real, que si el
// navegador la concede sí las esconde. Antes, `|| maximizado` en la
// guarda de abajo hacía que UNA vez caído a ese respaldo, nunca se
// volviera a intentar pantalla completa real -- ahora sigue
// reintentando cada toque genuino posterior (ver el listener de
// pointerdown al final de este archivo) hasta que lo consiga.
export function pedirPantallaCompleta() {
        if (esPantallaCompleta()) return;
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) {
          const pr = req.call(el);
          if (pr && pr.then) pr.then(intentarBloqueoOrientacion);
          if (pr && pr.catch)
            pr.catch(() => {
              if (!maximizado) {
                maximizado = true;
                document.body.classList.add("pantalla-completa");
                ajustarLienzo();
              }
            });
        } else if (!maximizado) {
          // API de pantalla completa ni existe (p.ej. iOS Safari, que no
          // la soporta en páginas normales) -- este respaldo es lo máximo
          // que se puede conseguir ahí, no tiene sentido reintentarlo.
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
            if (pr && pr.then) pr.then(intentarBloqueoOrientacion);
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
          // Refresca la pestaña del libro que esté abierta (no solo Ajustes)
          // para que el botón Activar/Salir se actualice si el cambio de
          // pantalla completa vino de fuera (F11, Esc del navegador...).
          if (!document.getElementById("inv").classList.contains("oculto"))
            import("../ui/inventory.js").then(({ abrirInv }) => abrirInv());
        }, 200);
      }

window.addEventListener("resize", ajustarLienzo);

document.addEventListener("fullscreenchange", () => {
        setTimeout(ajustarLienzo, 60);
      });

document.addEventListener("webkitfullscreenchange", () => {
        setTimeout(ajustarLienzo, 60);
      });

// Reintento de pantalla completa en cualquier gesto genuino posterior --
// pointerdown/keydown SIEMPRE llegan dentro de un gesto real del
// usuario (eventos de confianza del navegador), así que son un punto
// seguro para reintentar sin arriesgar que el navegador lo rechace por
// "no viene de un gesto". Ver el comentario de pedirPantallaCompleta()
// más arriba -- esto es lo que de verdad soluciona el caso real
// reportado (Android concreto que rechazó el primer intento en "Pulsa
// Start"): antes ahí se acababa la única oportunidad, ahora cualquier
// toque/tecla posterior (elegir clase, marcar listo, abrir la ficha...)
// vuelve a intentarlo hasta conseguirlo. Una vez esPantallaCompleta()
// es true, no hace nada (early return dentro de
// pedirPantallaCompleta()) -- barato de dejar enganchado para siempre.
// Único punto que la pide (ui/intro.js ya no la llama aparte, para no
// disparar requestFullscreen() dos veces en el mismo toque -- el
// navegador rechazaba una de las dos llamadas al hacerlo).
function reintentarPantallaCompleta() {
        if (!esPantallaCompleta()) pedirPantallaCompleta();
      }
window.addEventListener("pointerdown", reintentarPantallaCompleta);
window.addEventListener("keydown", reintentarPantallaCompleta);

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.toggleFullscreen = toggleFullscreen;
