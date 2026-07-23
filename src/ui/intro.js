// Pantalla de inicio ("Pulsa Start"): cubre toda la ventana por encima del
// juego y se cierra con la primera tecla, clic o botón de mando. Puramente
// de presentación — no toca el estado de la partida ni el menú de debajo.
import { initAudio, reanudarAudio } from "../systems/audio.js";

const el = document.getElementById("pantalla-inicio");

if (el) {
  const fondo = document.getElementById("inicio-fondo");
  const logo = document.getElementById("inicio-logo");
  fondo.style.backgroundImage = `url("${import.meta.env.BASE_URL}assets/ui/portada.webp")`;
  logo.src = `${import.meta.env.BASE_URL}assets/ui/logo.png`;

  let cerrada = false;
  let padTimer = null;

  function cerrarInicio() {
    if (cerrada) return;
    cerrada = true;
    el.classList.add("oculto");
    // primer gesto real del usuario: buen momento para desbloquear audio
    initAudio();
    reanudarAudio();
    window.removeEventListener("keydown", cerrarInicio);
    window.removeEventListener("pointerdown", cerrarInicio);
    if (padTimer) clearInterval(padTimer);
  }

  window.addEventListener("keydown", cerrarInicio);
  window.addEventListener("pointerdown", cerrarInicio);
  // por si ya hay un mando conectado y el jugador pulsa un botón directamente
  padTimer = setInterval(() => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (gp && gp.buttons.some((b) => b.pressed)) {
        cerrarInicio();
        break;
      }
    }
  }, 100);
}
