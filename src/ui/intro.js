// Pantalla de inicio ("Pulsa Start"): cubre toda la ventana por encima del
// juego y se cierra con la primera tecla, clic o botón de mando. Puramente
// de presentación — no toca el estado de la partida ni el menú de debajo.
import { initAudio, iniciarMusicaAmbiente, reanudarAudio } from "../systems/audio.js";

const el = document.getElementById("pantalla-inicio");

if (el) {
  const logo = document.getElementById("inicio-logo");
  logo.src = `${import.meta.env.BASE_URL}assets/ui/logo.png`;

  // Fondo en vídeo: 20 s (recodificado de art/inicio/portada-soulforge.gif
  // con tools/gifAVideo.mjs), empieza limpio y termina lleno de partículas,
  // así que un loop nativo daría un corte seco. Dos copias: al acercarse el
  // final la segunda entra desde 0 con un fundido y hace de "activa" cuando
  // la primera acaba (y al revés), sin salto. Sin portada estática de
  // respaldo: el propio `poster` del <video> (primer fotograma exacto, ver
  // más abajo) cubre el hueco mientras carga, así que no hay ningún
  // parpadeo con una imagen vieja antes de que arranque el vídeo de verdad
  // (reportado: "aún carga la imagen antigua").
  const FUNDIDO_VIDEO = 1.8;
  let parar = false;
  function iniciarVideoFondo() {
    const cont = document.getElementById("inicio-video");
    // Antes también se descartaba con "reducir movimiento" (prefers-reduced-
    // motion), pero en Windows basta con tener las animaciones del sistema
    // desactivadas para que el navegador lo reporte -- y entonces nadie veía
    // el vídeo, solo la portada estática (reportado: "aún carga la imagen
    // antigua"). Es un fondo silencioso y suave, sin destellos, así que se
    // reproduce siempre; la portada solo queda de respaldo si el vídeo falla.
    if (!cont) return;
    const src = `${import.meta.env.BASE_URL}assets/ui/inicio.mp4`;
    const poster = `${import.meta.env.BASE_URL}assets/ui/inicio-poster.jpg`;
    const crear = () => {
      const v = document.createElement("video");
      v.src = src;
      v.poster = poster;
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
    // Opacidad a 1 YA (no en el evento "playing"): el poster es el primer
    // fotograma exacto del propio vídeo, así que se ve al instante sin
    // esperar nada -- cuando el vídeo real esté listo, sustituye al poster
    // sin ningún salto visual porque es literalmente el mismo fotograma.
    activo.style.opacity = "1";
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
