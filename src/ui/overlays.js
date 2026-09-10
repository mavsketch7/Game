// Auto-generated during the modularization refactor (2026-07-23).
import { G } from "../core/state.js";

export function mostrar(id) {
        document.getElementById(id).classList.remove("oculto");
      }

export function ocultar(id) {
        document.getElementById(id).classList.add("oculto");
      }

// Guarda de apertura común a los popups de estación (tienda/skins/
// yunque/fusión/arena) -- los 5 abrirX() empezaban idénticos: nada sin
// partida activa, pausar, y marcar su "lock" de proximidad (ver
// core/loop.js, que solo lo resetea cuando el jugador se aleja del
// NPC) para no reabrirse solo con seguir cerca. Cada abrirX() sigue
// siendo dueño de su propio contenido -- esto solo cubre las 3 líneas
// que eran copia exacta unas de otras. Devuelve false si no procede
// abrir; el llamador debe hacer return en ese caso.
export function iniciarAperturaOverlay(lockProp) {
        if (!G || !G.activo) return false;
        G.pausa = true;
        if (lockProp) G[lockProp] = true;
        return true;
      }

// Cierre común: ocultar + despausar, lo idéntico entre los 5
// cerrarX(). La limpieza propia de cada uno (p.ej. shop.js vacía la
// oferta del día) sigue viviendo en su función, después de llamar a
// esta.
export function cerrarOverlayBase(id) {
        ocultar(id);
        if (G) G.pausa = false;
      }
