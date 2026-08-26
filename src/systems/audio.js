// Auto-generated during the modularization refactor (2026-07-23).
import { AJ } from "../core/settings.js";

let audioCtx = null,
        musGain = null,
        musTimer = null;

export function initAudio() {
        if (audioCtx) return;
        try {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          return;
        }
        musGain = audioCtx.createGain();
        musGain.connect(audioCtx.destination);
        musGain.gain.value = 0;
        cargarMythicDropBuffer();
        precargarSonidosReales();
      }

export function reanudarAudio() {
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      }

// Sonido de archivo real (no sintetizado) para el drop de objetos Míticos.
// Se precarga en cuanto arranca el audio para que suene sin retardo al caer.
let mythicDropBuffer = null;
let mythicDropLoading = null;
function cargarMythicDropBuffer() {
  if (mythicDropBuffer || mythicDropLoading || !audioCtx) return mythicDropLoading;
  const url = `${import.meta.env.BASE_URL}assets/audio/mythic_drop_sound.webm`;
  mythicDropLoading = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => audioCtx.decodeAudioData(buf))
    .then((decoded) => {
      mythicDropBuffer = decoded;
    })
    .catch(() => {});
  return mythicDropLoading;
}
function reproducirMythicDrop() {
  if (!audioCtx) return;
  const vol = AJ.volMaster * AJ.volSfx;
  const play = () => {
    if (!mythicDropBuffer) return;
    const src = audioCtx.createBufferSource();
    src.buffer = mythicDropBuffer;
    const g = audioCtx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(audioCtx.destination);
    src.start();
  };
  if (mythicDropBuffer) play();
  else cargarMythicDropBuffer()?.then(play);
}

// Sonidos de combate/movimiento REALES (torre-vespero-assets/sounds-fx),
// uno por acción concreta en vez del "golpe"/"espadazo" sintetizado de
// siempre para las clases con muestra propia. Mismo mecanismo que
// cargarMythicDropBuffer()/reproducirMythicDrop() de arriba, generalizado a
// varios "grupos" (cada uno con 1+ variantes -- las de más de una rotan al
// azar para no sonar siempre igual). Disparados por golpeArco() en
// systems/abilities.js (ya sabe si el golpe conectó o falló antes de
// decidir el sonido) y por el paso del jugador en core/loop.js.
// offset (s): recorte de silencio/aire de arranque al PRINCIPIO de cada
// archivo -- medido de verdad decodificando cada muestra y buscando dónde
// empieza a sonar fuerte (no a ojo): varias traían casi medio segundo de
// aire/silencio antes del golpe real (golpe_aire.m4a llegaba a 0.65s), así
// que sonaban con retraso aunque el código las disparase al instante. Sin
// esto, aunque el buffer ya estuviera cargado, se oía la parte muda antes
// que el golpe -- el retraso estaba en el AUDIO, no en el código.
const GRUPOS_SONIDO = {
  impactoGuerrero: [
    { nombre: "impacto_guerrero_1", ext: "m4a", offset: 0.27 },
    { nombre: "impacto_guerrero_2", ext: "m4a", offset: 0.19 },
    { nombre: "impacto_guerrero_3", ext: "m4a", offset: 0.0 },
  ],
  impactoPicaro: [
    { nombre: "impacto_picaro_1", ext: "m4a", offset: 0.06 },
    { nombre: "impacto_picaro_2", ext: "m4a", offset: 0.15 },
  ],
  golpeAire: [{ nombre: "golpe_aire", ext: "m4a", offset: 0.61 }],
  golpeCritico: [{ nombre: "golpe_critico", ext: "m4a", offset: 0.43 }],
  paso: [{ nombre: "paso_1", ext: "wav", offset: 0 }],
  // Tensar el arco (arquero, ver p._cargaSrc en core/loop.js y
  // dispararFlechaCargada en abilities.js) -- un único archivo (antes
  // rotaba entre 3 variantes; se simplificó a una sola). Se reproduce
  // CONTROLABLE (ver reproducirSonidoControlable) porque el archivo dura
  // más que la carga máxima del juego -- si no se corta a mano al
  // soltar, se oiría de más incluso en un toque instantáneo.
  cargaArco: [{ nombre: "carga_arco", ext: "m4a", offset: 0.144 }],
  // Disparo real al soltar -- SIEMPRE, cargado o no (antes solo el
  // cargado tenía sonido real; el básico se quedaba con el sintetizado
  // de sfx(), que ya no se usa para el arquero).
  disparoArco: [{ nombre: "flecha_disparo", ext: "m4a", offset: 0.288 }],
  // Aviso corto al entrar en la ventana de crítico óptimo mientras se
  // carga -- refuerza en sonido la marca visual de la barra.
  cargaLista: [{ nombre: "carga_lista", ext: "m4a", offset: 0.104 }],
  // Impacto real de un PROYECTIL contra un enemigo (flecha del arquero,
  // cuchillo lanzado del pícaro -- mismo golpe seco para los dos, ver
  // core/loop.js: dispara al final del bucle de colisión proyectil-vs-
  // enemigo). golpeArco() ya decide su propio sonido para los golpes
  // MELÉ (impactoGuerrero/impactoPicaro/golpeAire/golpeCritico); esto
  // cubre el hueco de los proyectiles, que antes no sonaban nada al
  // conectar.
  impactoProyectil: [{ nombre: "impacto_flecha", ext: "m4a", offset: 0.016 }],
};
const bufferesReales = {};
const cargaReales = {};

function cargarBufferReal(nombre, ext) {
  if (bufferesReales[nombre] || cargaReales[nombre] || !audioCtx) return cargaReales[nombre];
  const url = `${import.meta.env.BASE_URL}assets/audio/${nombre}.${ext}`;
  cargaReales[nombre] = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => audioCtx.decodeAudioData(buf))
    .then((decoded) => {
      bufferesReales[nombre] = decoded;
    })
    .catch(() => {});
  return cargaReales[nombre];
}

function precargarSonidosReales() {
  for (const grupo in GRUPOS_SONIDO)
    for (const f of GRUPOS_SONIDO[grupo]) cargarBufferReal(f.nombre, f.ext);
}

// volMul: multiplicador de volumen del grupo (aparte de volMaster/volSfx).
// pitchJitter: variación aleatoria de playbackRate (0-1, ver sfxPaso) para
// que la misma muestra repetida muchas veces no suene robótica.
function reproducirSonidoReal(grupo, volMul, pitchJitter) {
  if (AJ.silencio || !audioCtx) return;
  reanudarAudio();
  const lista = GRUPOS_SONIDO[grupo];
  if (!lista || !lista.length) return;
  const f = lista[Math.floor(Math.random() * lista.length)];
  const vol = AJ.volMaster * AJ.volSfx * (volMul ?? 1);
  const play = () => {
    const buffer = bufferesReales[f.nombre];
    if (!buffer) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    if (pitchJitter) src.playbackRate.value = 1 - pitchJitter / 2 + Math.random() * pitchJitter;
    const g = audioCtx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(audioCtx.destination);
    // start(when, offset): when=0 (=ya, no encolado a futuro), offset
    // salta el silencio de arranque de la muestra -- ver comentario de
    // GRUPOS_SONIDO más arriba.
    src.start(0, f.offset || 0);
  };
  if (bufferesReales[f.nombre]) play();
  else cargarBufferReal(f.nombre, f.ext)?.then(play);
}

// Como reproducirSonidoReal, pero devuelve un control { stop() } para
// poder cortar el sonido antes de que acabe solo -- lo necesitan el
// tensado del arco (se corta al soltar) y el vuelo de la flecha (se
// corta al impactar/chocar con un muro/caducar), que si no se quedarían
// sonando de más. Toma el PRIMER archivo del grupo (estos dos grupos ya
// no rotan variantes) en vez de elegir al azar como reproducirSonidoReal.
// loop=true los repite hasta que se llama a stop() -- el vuelo lo
// necesita porque su muestra real dura menos que un vuelo típico.
function reproducirSonidoControlable(grupo, volMul, loop) {
  const noop = { stop() {} };
  if (AJ.silencio || !audioCtx) return noop;
  reanudarAudio();
  const f = (GRUPOS_SONIDO[grupo] || [])[0];
  if (!f) return noop;
  const vol = AJ.volMaster * AJ.volSfx * (volMul ?? 1);
  let src = null,
    detenido = false;
  const play = () => {
    if (detenido) return;
    const buffer = bufferesReales[f.nombre];
    if (!buffer) return;
    src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = !!loop;
    const g = audioCtx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(audioCtx.destination);
    src.start(0, f.offset || 0);
  };
  if (bufferesReales[f.nombre]) play();
  else cargarBufferReal(f.nombre, f.ext)?.then(play);
  return {
    stop() {
      detenido = true;
      try {
        src && src.stop();
      } catch (e) {}
    },
  };
}

// Guerrero: golpe que conecta -- rota entre las 3 variantes impactodirecto.
export function sfxImpactoGuerrero() {
  reproducirSonidoReal("impactoGuerrero", 0.75);
}
// Pícaro: golpe de daga que conecta -- alterna entre las 2 variantes.
export function sfxImpactoPicaro() {
  reproducirSonidoReal("impactoPicaro", 0.75);
}
// Golpe que NO conecta con ningún enemigo (guerrero) -- golpeaire1.
export function sfxGolpeAire() {
  reproducirSonidoReal("golpeAire", 0.55);
}
// Crítico (cualquier clase que pase por golpeArco) -- sustituye al golpe
// normal cuando alguno de los enemigos alcanzados fue crítico.
export function sfxGolpeCritico() {
  reproducirSonidoReal("golpeCritico", 0.9);
}
// Paso al caminar/correr -- "levemente": volumen bajo a propósito, más un
// pequeño jitter de tono para que no se note la repetición de la muestra.
export function sfxPaso() {
  reproducirSonidoReal("paso", 0.22, 0.18);
}
// Arquero: empieza a tensar el arco (una vez por carga, no por frame) --
// controlable, hay que cortarlo al soltar (ver p._cargaSrc en
// core/loop.js): la muestra real dura más que la carga máxima del juego.
export function sfxTensarArco() {
  return reproducirSonidoControlable("cargaArco", 0.7);
}
// Pícaro: empieza a cargar el cuchillo -- sintetizado y a propósito
// distinto del tensado real del arquero (ver el preset "cargaCuchillo"
// en sfx() más abajo). Un solo disparo corto, no hace falta cortarlo a
// mano como el del arquero (ya se apaga solo mucho antes del mínimo de
// carga real).
export function sfxCargaCuchillo() {
  sfx("cargaCuchillo");
}
// Disparo real al soltar -- SIEMPRE (cargado o toque instantáneo, ver
// dispararFlechaCargada en abilities.js). También lo usa el cuchillo
// cargado del pícaro (lanzarCuchillo) para el mismo golpe de soltar.
export function sfxDisparoArco() {
  reproducirSonidoReal("disparoArco", 0.75);
}
// Arquero: aviso al entrar en la ventana de crítico óptimo mientras se
// carga (una vez por carga, ver dispararFlechaCargada en abilities.js).
export function sfxCargaLista() {
  reproducirSonidoReal("cargaLista", 0.55);
}
// Proyectil (flecha o cuchillo lanzado) que conecta con un enemigo.
export function sfxImpactoProyectil() {
  reproducirSonidoReal("impactoProyectil", 0.8);
}

export function sfx(tipo) {
        if (AJ.silencio || !audioCtx) return;
        reanudarAudio();
        const now = audioCtx.currentTime;
        const g = audioCtx.createGain();
        g.connect(audioCtx.destination);
        const vol = AJ.volMaster * AJ.volSfx;
        const presets = {
          golpe: { f: 180, f2: 90, tipo: "square", dur: 0.08, v: 0.5 },
          flecha: { f: 640, f2: 320, tipo: "triangle", dur: 0.09, v: 0.28 },
          cuchillo: { f: 900, f2: 380, tipo: "triangle", dur: 0.06, v: 0.26 },
          // Pícaro echando el brazo atrás para el cuchillo cargado -- a
          // propósito NADA que ver con carga_arco.m4a del arquero (pedido
          // expreso: no deben sonar igual). Sintetizado en vez de muestra
          // real (no hay ninguna pensada para esto): barrido ASCENDENTE
          // (tensión creciente) con sawtooth, frente al "cuchillo" de
          // arriba (lanzamiento normal), que es un triangle descendente
          // -- timbre y dirección opuestos a propósito, para que no se
          // confundan al oído.
          cargaCuchillo: { f: 260, f2: 720, tipo: "sawtooth", dur: 0.22, v: 0.22 },
          magia: { f: 420, f2: 760, tipo: "sine", dur: 0.16, v: 0.34 },
          hielo: { f: 900, f2: 1400, tipo: "sine", dur: 0.14, v: 0.3 },
          fuego: { f: 220, f2: 110, tipo: "sawtooth", dur: 0.18, v: 0.34 },
          ulti: { f: 160, f2: 520, tipo: "sawtooth", dur: 0.4, v: 0.4 },
          daño: { f: 120, f2: 60, tipo: "square", dur: 0.16, v: 0.45 },
          muerte: { f: 300, f2: 40, tipo: "sawtooth", dur: 0.35, v: 0.4 },
          nivel: { f: 520, f2: 1040, tipo: "triangle", dur: 0.5, v: 0.4 },
          moneda: { f: 1200, f2: 1800, tipo: "triangle", dur: 0.1, v: 0.3 },
          legendario: { f: 300, f2: 1500, tipo: "sine", dur: 0.6, v: 0.4 },
          carta: { f: 660, f2: 990, tipo: "sine", dur: 0.22, v: 0.34 },
          portal: { f: 300, f2: 900, tipo: "sine", dur: 0.5, v: 0.36 },
          parry: { f: 1400, f2: 700, tipo: "square", dur: 0.12, v: 0.4 },
          ui: { f: 520, f2: 520, tipo: "sine", dur: 0.05, v: 0.22 },
          jefe: { f: 80, f2: 200, tipo: "sawtooth", dur: 0.7, v: 0.5 },
        };
        const pr = presets[tipo] || presets.ui;
        const osc = audioCtx.createOscillator();
        osc.type = pr.tipo;
        osc.frequency.setValueAtTime(pr.f, now);
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, pr.f2),
          now + pr.dur,
        );
        g.gain.setValueAtTime(pr.v * vol, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + pr.dur);
        osc.connect(g);
        osc.start(now);
        osc.stop(now + pr.dur + 0.02);
      }

// Sonido en capas para la caída de un objeto de rareza alta (Legendario+):
// varios osciladores combinados (impacto grave + barrido + brillo armónico,
// y una capa extra solo para Mítico) en vez del único oscilador plano de
// sfx("legendario") -- una fanfarria en miniatura, más grande cuanto mayor
// la rareza, sin necesitar ningún archivo de audio.
export function sfxDropEpico(rareza) {
        if (AJ.silencio || !audioCtx) return;
        reanudarAudio();
        const now = audioCtx.currentTime;
        const vol = AJ.volMaster * AJ.volSfx;
        const mitico = rareza >= 4;
        if (mitico) reproducirMythicDrop();
        const capa = (f0, f1, tipo, dur, v, delay) => {
          const t0 = now + delay;
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = tipo;
          osc.frequency.setValueAtTime(f0, t0);
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(v * vol, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          osc.connect(g);
          g.connect(audioCtx.destination);
          osc.start(t0);
          osc.stop(t0 + dur + 0.03);
        };
        capa(160, 45, "sawtooth", 0.22, 0.5, 0); // impacto grave: el "peso" del objeto
        capa(280, 1500, "sine", mitico ? 0.9 : 0.7, 0.4, 0.03); // barrido principal
        capa(900, 1800, "triangle", mitico ? 0.7 : 0.5, 0.22, 0.12); // brillo armónico ("campana")
      }

// Golpe de aterrizaje: se dispara para CUALQUIER objeto al tocar el suelo
// (no solo legendario+, ver core/loop.js), justo cuando termina la
// animación de salto/giro/caída en render/world.js -- un thump grave para
// dar sensación de peso + un destello agudo breve encima que crece con la
// rareza, para que un objeto mejor "suene" un poco más especial al caer
// sin depender solo de sfxDropEpico (que es la fanfarria de aparición,
// solo legendario+).
export function sfxAterrizaje(rareza) {
        if (AJ.silencio || !audioCtx) return;
        reanudarAudio();
        const now = audioCtx.currentTime;
        const vol = AJ.volMaster * AJ.volSfx;
        // grave: golpe seco, da la sensación de peso al caer
        const oscGrave = audioCtx.createOscillator();
        const gGrave = audioCtx.createGain();
        oscGrave.type = "sine";
        oscGrave.frequency.setValueAtTime(150, now);
        oscGrave.frequency.exponentialRampToValueAtTime(35, now + 0.16);
        gGrave.gain.setValueAtTime(0.55 * vol, now);
        gGrave.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        oscGrave.connect(gGrave);
        gGrave.connect(audioCtx.destination);
        oscGrave.start(now);
        oscGrave.stop(now + 0.2);
        // brillante: destello agudo breve encima, más presente cuanto mayor
        // la rareza (0=apenas se nota, 4=bien brillante)
        const brillo = 0.1 + rareza * 0.05;
        const oscBrillo = audioCtx.createOscillator();
        const gBrillo = audioCtx.createGain();
        oscBrillo.type = "triangle";
        oscBrillo.frequency.setValueAtTime(1400 + rareza * 200, now);
        oscBrillo.frequency.exponentialRampToValueAtTime(2400 + rareza * 200, now + 0.08);
        gBrillo.gain.setValueAtTime(brillo * vol, now);
        gBrillo.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        oscBrillo.connect(gBrillo);
        gBrillo.connect(audioCtx.destination);
        oscBrillo.start(now);
        oscBrillo.stop(now + 0.16);
      }

const MUS_NOTAS = [
        110, 0, 146.83, 0, 130.81, 0, 164.81, 0, 110, 0, 98, 0, 130.81, 0,
        123.47, 0,
      ];

let musPaso = 0;

function tickMusica() {
        if (!audioCtx || AJ.silencio) return;
        const f = MUS_NOTAS[musPaso % MUS_NOTAS.length];
        musPaso++;
        if (f > 0) {
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.value = f;
          osc.connect(g);
          g.connect(musGain);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.5, now + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          osc.start(now);
          osc.stop(now + 0.75);
          // quinta suave encima cada 4 pasos
          if (musPaso % 4 === 0) {
            const o2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain();
            o2.type = "sine";
            o2.frequency.value = f * 1.5;
            o2.connect(g2);
            g2.connect(musGain);
            g2.gain.setValueAtTime(0, now);
            g2.gain.linearRampToValueAtTime(0.2, now + 0.05);
            g2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            o2.start(now);
            o2.stop(now + 0.95);
          }
        }
      }

export function aplicarMusica() {
        if (!audioCtx) return;
        const objetivo = AJ.silencio ? 0 : AJ.volMaster * AJ.volMus;
        musGain.gain.setTargetAtTime(objetivo, audioCtx.currentTime, 0.4);
        if (!musTimer && !AJ.silencio) musTimer = setInterval(tickMusica, 430);
        if (audioAmbiente && ambienteActivo) {
          audioAmbiente.volume = AJ.silencio ? 0 : AJ.volMaster * AJ.volMus * VOL_AMBIENTE;
          if (AJ.silencio) audioAmbiente.pause();
          else if (audioAmbiente.paused) audioAmbiente.play().catch(() => {});
        }
      }

// Música ambiental real (archivo, no sintetizada) para la pantalla de
// carga ("Pulsa Start") y la selección de personaje -- suena "flojito"
// a propósito (VOL_AMBIENTE la reduce aparte del volMaster/volMus, para
// que quede de fondo y no compita con la música sintetizada de la Torre
// ni con los SFX de la UI). Motor aparte de musGain/tickMusica de arriba
// (HTMLAudioElement en vez de un buffer de Web Audio) porque es un loop
// largo de un archivo real, no notas sintetizadas nota a nota.
const VOL_AMBIENTE = 0.7;
let audioAmbiente = null;
let ambienteActivo = false;

function crearAudioAmbiente() {
  if (audioAmbiente) return audioAmbiente;
  audioAmbiente = new Audio(
    `${import.meta.env.BASE_URL}assets/audio/ambiente_seleccion.mp3`,
  );
  audioAmbiente.loop = true;
  audioAmbiente.volume = 0;
  document.body.appendChild(audioAmbiente);
  return audioAmbiente;
}

// Llamar tras initAudio()/reanudarAudio() (primer gesto real del usuario --
// ver cerrarInicio() en ui/intro.js), así arranca en cuanto el navegador
// deja sonar audio. Sigue sonando durante toda la selección de personaje
// hasta que detenerMusicaAmbiente() la corta al empezar la partida.
export function iniciarMusicaAmbiente() {
  ambienteActivo = true;
  const a = crearAudioAmbiente();
  if (!AJ.silencio) a.play().catch(() => {});
  aplicarMusica();
}

// Fundido de salida suave (en vez de corte seco) al entrar a la mazmorra,
// donde toma el relevo la música sintetizada de la Torre. Ver nuevaPartida()
// en core/gameflow.js.
export function detenerMusicaAmbiente() {
  ambienteActivo = false;
  if (!audioAmbiente || audioAmbiente.paused) return;
  const a = audioAmbiente;
  const paso = () => {
    a.volume = Math.max(0, a.volume - 0.04);
    if (a.volume > 0) requestAnimationFrame(paso);
    else a.pause();
  };
  requestAnimationFrame(paso);
}
