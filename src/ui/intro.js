// Pantalla de inicio ("Pulsa Start"): cubre toda la ventana por encima del
// juego y se cierra con la primera tecla, clic o botón de mando. Puramente
// de presentación — no toca el estado de la partida ni el menú de debajo.
import { initAudio, iniciarMusicaAmbiente, reanudarAudio } from "../systems/audio.js";

const el = document.getElementById("pantalla-inicio");

if (el) {
  const fondo = document.getElementById("inicio-fondo");
  const logo = document.getElementById("inicio-logo");
  fondo.style.backgroundImage = `url("${import.meta.env.BASE_URL}assets/ui/portada.webp")`;
  logo.src = `${import.meta.env.BASE_URL}assets/ui/logo.png`;

  // Fondo en vídeo: 20 s, empieza limpio y termina lleno de partículas, así que
  // un loop nativo daría un corte seco. Dos copias: al acercarse el final la
  // segunda entra desde 0 con un fundido y hace de "activa" cuando la primera
  // acaba (y al revés), sin salto. Sin vídeo (o con "reducir movimiento") se
  // queda la portada estática de siempre.
  const FUNDIDO_VIDEO = 1.8;
  let parar = false;
  function iniciarVideoFondo() {
    const cont = document.getElementById("inicio-video");
    if (!cont || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const src = `${import.meta.env.BASE_URL}assets/ui/inicio.mp4`;
    const crear = () => {
      const v = document.createElement("video");
      v.src = src;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.disablePictureInPicture = true;
      cont.appendChild(v);
      return v;
    };
    let activo = crear();
    let otro = crear();
    let fundiendo = false;
    activo.addEventListener("playing", () => { activo.style.opacity = "1"; }, { once: true });
    activo.play().catch(() => cont.remove());
    otro.load();
    function tick() {
      if (parar) return;
      const d = activo.duration;
      if (d && activo.currentTime > d - FUNDIDO_VIDEO) {
        if (!fundiendo) {
          fundiendo = true;
          activo.style.zIndex = "1";
          otro.style.zIndex = "2";
          otro.currentTime = 0;
          otro.play().catch(() => {});
        }
        const k = Math.min(1, (activo.currentTime - (d - FUNDIDO_VIDEO)) / FUNDIDO_VIDEO);
        otro.style.opacity = String(k);
        if (k >= 1 || activo.ended) {
          activo.pause();
          activo.style.opacity = "0";
          [activo, otro] = [otro, activo];
          fundiendo = false;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  iniciarVideoFondo();

  let cerrada = false;
  let padTimer = null;

  function cerrarInicio() {
    if (cerrada) return;
    cerrada = true;
    parar = true;
    el.querySelectorAll("video").forEach((v) => v.pause());
    el.classList.add("oculto");
    // primer gesto real del usuario: buen momento para desbloquear audio.
    // La pantalla completa se pide sola, ver el listener de pointerdown
    // en core/canvas.js -- se engancha a CUALQUIER toque, este incluido,
    // así que no hace falta duplicar la llamada aquí (llamarla dos veces
    // en el mismo toque disparaba requestFullscreen() por partida doble
    // y el navegador rechazaba una de las dos).
    initAudio();
    reanudarAudio();
    iniciarMusicaAmbiente();
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
