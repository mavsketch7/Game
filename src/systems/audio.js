// Auto-generated during the modularization refactor (2026-07-23).
import { AJ } from "../core/settings.js";
import { clamp } from "../utils/helpers.js";

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
  // Martillo de Frhor (drop del Guardián de Hielo, ver systems/combat.js):
  // pedido expreso del usuario -- SOLO las variantes 2/3 de golpe de
  // guerrero (más "duras" que la 1), reproducidas más fuerte que el
  // impacto normal (ver sfxImpactoFrhor). Reutiliza los mismos archivos
  // ya cargados por impactoGuerrero, no hace falta cargarlos aparte.
  impactoFrhor: [
    { nombre: "impacto_guerrero_2", ext: "m4a", offset: 0.19 },
    { nombre: "impacto_guerrero_3", ext: "m4a", offset: 0.0 },
  ],
  // Martillo de Frhor: silbido del martillazo al AIRE, antes de saber si
  // conecta -- las 3 muestras alternan al azar (mismo mecanismo de rotación
  // que impactoGuerrero) para que no suene idéntico cada golpe. Offsets
  // medidos decodificando cada muestra (mismo método que el resto del
  // grupo, ver comentario de GRUPOS_SONIDO arriba).
  swingFrhor: [
    { nombre: "hammer-swingheavy", ext: "m4a", offset: 0.165 },
    { nombre: "hammer-swing1", ext: "m4a", offset: 0.114 },
    { nombre: "hammer-swingheavy2", ext: "m4a", offset: 0.112 },
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
  // Parry exitoso (ver parryExitoso en systems/combat.js) -- sustituye al
  // tono sintetizado de siempre (sfx("parry"), onda cuadrada 1400→700Hz).
  // 5 variantes que rotan al azar, mismo mecanismo que impactoGuerrero.
  // Offsets medidos decodificando cada muestra (RMS por ventanas de 5ms
  // contra el pico global), no a ojo -- mismo criterio que el resto del
  // grupo (ver comentario de GRUPOS_SONIDO más arriba).
  parry: [
    { nombre: "parry_1", ext: "m4a", offset: 0.145 },
    { nombre: "parry_2", ext: "m4a", offset: 0.11 },
    { nombre: "parry_3", ext: "m4a", offset: 0.135 },
    { nombre: "parry_4", ext: "m4a", offset: 0.135 },
    { nombre: "parry_5", ext: "m4a", offset: 0.105 },
  ],
  // Ulti de fuego del mago (Cataclismo, ver lanzarUlti() en
  // systems/abilities.js): "casteo" al lanzar la ulti (controlable --
  // dura 6.4s de origen, mucho más que el retardo hasta la explosión, así
  // que se corta a mano justo cuando esta empieza, ver sfxFuegoUltiCast())
  // y "explosión" cuando de verdad aparece el sprite (FIRE_EXPLOSION_SHEET
  // en render/sprites.js), no en el instante de pulsar la tecla.
  fuegoUltiCast: [{ nombre: "fuego_ulti_cast", ext: "wav", offset: 0 }],
  fuegoUltiExplosion: [{ nombre: "fuego_ulti_explosion", ext: "wav", offset: 0 }],
  // Impacto del ataque básico de fuego (bola) contra un enemigo -- antes
  // mudo (impactoProyectil solo cubría flecha/cuchillo, ver core/loop.js).
  fuegoBolaImpacto: [{ nombre: "fuego_bola_impacto", ext: "wav", offset: 0.797 }],
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
// Martillo de Frhor: golpe básico que conecta, MÁS fuerte que el impacto
// normal (0.95 vs 0.75) -- pedido expreso del usuario ("más duros").
export function sfxImpactoFrhor() {
  reproducirSonidoReal("impactoFrhor", 0.95);
}
// Martillo de Frhor: silbido del golpe al lanzarlo, ANTES de resolver si
// impacta -- se dispara al iniciar el swing, no al conectar (ver
// golpeArco en systems/abilities.js).
export function sfxSwingFrhor() {
  reproducirSonidoReal("swingFrhor", 0.8);
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
// Parry exitoso -- ver parryExitoso() en systems/combat.js (el "clang" al
// bloquear) y la predicción del cliente en net/peer.js (feedback
// inmediato al pulsar, antes de que el host confirme).
export function sfxParry() {
  reproducirSonidoReal("parry", 0.85);
}
// Ulti de fuego del mago: "casteo" al lanzar (controlable -- se corta a
// mano en cuanto empieza a sonar la explosión, ver lanzarUlti() en
// systems/abilities.js, la muestra de origen dura 6.4s) y "explosión"
// cuando de verdad sale el sprite (retardado respecto al casteo, no en
// el instante de pulsar la tecla).
export function sfxFuegoUltiCast() {
  return reproducirSonidoControlable("fuegoUltiCast", 0.8);
}
export function sfxFuegoUltiExplosion() {
  reproducirSonidoReal("fuegoUltiExplosion", 0.9);
}
// Ataque básico de fuego (bola) al impactar contra un enemigo.
export function sfxFuegoBolaImpacto() {
  reproducirSonidoReal("fuegoBolaImpacto", 0.8);
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

// Barril roto: golpe grave de madera + un "traqueteo" de astillas encima
// (varios pulsos cortos y decrecientes en vez de un solo tono, para que
// se lea como algo que se hace pedazos, no un golpe limpio). Sin archivo
// real -- mismo criterio en capas que sfxDropEpico/sfxAterrizaje.
export function sfxRompeBarril() {
        if (AJ.silencio || !audioCtx) return;
        reanudarAudio();
        const now = audioCtx.currentTime;
        const vol = AJ.volMaster * AJ.volSfx;
        const oscGrave = audioCtx.createOscillator();
        const gGrave = audioCtx.createGain();
        oscGrave.type = "square";
        oscGrave.frequency.setValueAtTime(180, now);
        oscGrave.frequency.exponentialRampToValueAtTime(55, now + 0.14);
        gGrave.gain.setValueAtTime(0.5 * vol, now);
        gGrave.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        oscGrave.connect(gGrave);
        gGrave.connect(audioCtx.destination);
        oscGrave.start(now);
        oscGrave.stop(now + 0.17);
        for (let i = 0; i < 4; i++) {
          const t0 = now + 0.02 + i * 0.035 + Math.random() * 0.015;
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = "square";
          o.frequency.value = 300 + Math.random() * 500;
          g.gain.setValueAtTime(0.16 * vol * (1 - i * 0.18), t0);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(t0);
          o.stop(t0 + 0.06);
        }
      }

// Pilar de hielo roto: estallido de cristal -- un barrido agudo
// descendente-luego-ascendente ("crac") más un puñado de tintineos altos
// dispersos encima, más brillante y frío que el golpe de madera de arriba.
export function sfxRompeHielo() {
        if (AJ.silencio || !audioCtx) return;
        reanudarAudio();
        const now = audioCtx.currentTime;
        const vol = AJ.volMaster * AJ.volSfx;
        const oscCrac = audioCtx.createOscillator();
        const gCrac = audioCtx.createGain();
        oscCrac.type = "sawtooth";
        oscCrac.frequency.setValueAtTime(1200, now);
        oscCrac.frequency.exponentialRampToValueAtTime(300, now + 0.09);
        gCrac.gain.setValueAtTime(0.4 * vol, now);
        gCrac.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        oscCrac.connect(gCrac);
        gCrac.connect(audioCtx.destination);
        oscCrac.start(now);
        oscCrac.stop(now + 0.12);
        for (let i = 0; i < 5; i++) {
          const t0 = now + 0.03 + i * 0.03 + Math.random() * 0.02;
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = "sine";
          o.frequency.value = 1600 + Math.random() * 1400;
          g.gain.setValueAtTime(0.14 * vol, t0);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(t0);
          o.stop(t0 + 0.2);
        }
      }

// Música sintetizada de la mazmorra (el "chun chun chun" de fondo) --
// DESACTIVADA de momento a petición del usuario. Se deja MUS_NOTAS/
// tickMusica intactos para poder reactivarla o sustituirla más adelante
// (p.ej. por una pista real, como ya se hizo con la ambiental de la
// selección -- ver iniciarMusicaAmbiente()/detenerMusicaAmbiente()).
const MUSICA_SINTETIZADA_ACTIVA = false;

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
        if (MUSICA_SINTETIZADA_ACTIVA && !musTimer && !AJ.silencio)
          musTimer = setInterval(tickMusica, 430);
        if (audioAmbiente && ambienteActivo) {
          audioAmbiente.volume = volObjetivoAmbiente();
          if (AJ.silencio) audioAmbiente.pause();
          else if (audioAmbiente.paused) audioAmbiente.play().catch(() => {});
        }
        if (audioJefe && jefeActivo) {
          audioJefe.volume = volObjetivoJefe();
          if (AJ.silencio) audioJefe.pause();
          else if (audioJefe.paused) audioJefe.play().catch(() => {});
        }
      }

// Fundido genérico por interpolación en el tiempo (no por pasos fijos de
// volumen/frame, que dependían del refresco de pantalla) -- un solo
// mecanismo reutilizado por la ambiental, la pista de jefe, y sus
// fundidos de entrada Y salida, en vez de 4 bucles casi iguales.
function fundirAudio(el, objetivo, dur, alTerminar) {
  const inicio = el.volume;
  const t0 = performance.now();
  function paso(ahora) {
    const k = dur > 0 ? clamp((ahora - t0) / (dur * 1000), 0, 1) : 1;
    // Clamp explícito: con dos fundidos solapados sobre el MISMO elemento
    // (p.ej. iniciarMusicaAmbiente() + ajustarVolumenAmbienteEnPartida()
    // casi seguidos, cada uno con su propio `inicio` capturado en
    // instantes distintos) el valor intermedio puede salirse un poco de
    // [0,1] -- el setter de HTMLMediaElement.volume lanza si eso pasa,
    // así que se recorta siempre, no solo por estética.
    el.volume = clamp(inicio + (objetivo - inicio) * k, 0, 1);
    if (k < 1) requestAnimationFrame(paso);
    else if (alTerminar) alTerminar();
  }
  requestAnimationFrame(paso);
}

// Música ambiental real (archivo, no sintetizada) para la pantalla de
// carga ("Pulsa Start"), la selección de personaje Y AHORA TAMBIÉN
// durante la partida (antes se cortaba de golpe al entrar a jugar, ver
// nuevaPartida() en core/gameflow.js -- pedido explícito: que se quede
// sonando, solo más bajo). `volAmbienteContexto` es ese "más bajo": 1 en
// selección, reducido ya jugando, 0 mientras suena una pista de jefe
// (ver iniciarMusicaJefe() más abajo, that's a crossfade real, no un
// silencio). VOL_AMBIENTE (aparte de volMaster/volMus) la mantiene de
// fondo a propósito, sin competir con SFX/pista de jefe.
const VOL_AMBIENTE = 0.35;
let audioAmbiente = null;
let ambienteActivo = false;
let volAmbienteContexto = 1;

function volObjetivoAmbiente() {
  if (AJ.silencio || !ambienteActivo) return 0;
  return AJ.volMaster * AJ.volMus * VOL_AMBIENTE * volAmbienteContexto;
}

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
// deja sonar audio. Con fundido de entrada (antes saltaba directa al
// volumen final) para que el primer sonido de la partida no sea un golpe
// seco. Sigue sonando durante selección Y partida -- ya no hay
// detenerMusicaAmbiente() en nuevaPartida(), solo un volumen más bajo
// (ver ajustarVolumenAmbienteEnPartida()).
export function iniciarMusicaAmbiente() {
  ambienteActivo = true;
  const a = crearAudioAmbiente();
  if (!AJ.silencio) {
    a.play().catch(() => {});
    fundirAudio(a, volObjetivoAmbiente(), 1.2);
  }
}

// Fundido de salida suave (en vez de corte seco). Ya NO se llama al
// empezar partida (ver core/gameflow.js/net/peer.js) -- queda para
// cuando de verdad haga falta apagarla del todo (p.ej. silencio manual).
export function detenerMusicaAmbiente() {
  ambienteActivo = false;
  if (!audioAmbiente || audioAmbiente.paused) return;
  fundirAudio(audioAmbiente, 0, 0.6, () => audioAmbiente.pause());
}

// Baja (bajo=true, al empezar a jugar) o restaura (bajo=false, al volver
// de la sala de un jefe) el volumen de la ambiental SIN pararla -- sigue
// sonando en bucle de fondo todo el rato, solo cambia de nivel.
export function ajustarVolumenAmbienteEnPartida(bajo) {
  volAmbienteContexto = bajo ? 0.45 : 1;
  if (audioAmbiente && ambienteActivo && !AJ.silencio)
    fundirAudio(audioAmbiente, volObjetivoAmbiente(), 1.5);
}

// Pista de la sala del jefe (archivo real, un loop por jefe -- de momento
// solo el Guardián de Hielo). Crossfade con la ambiental: al entrar la
// ambiental baja a 0 (sin pausarse del todo hasta llegar ahí, lista para
// retomar) mientras esta sube; al salir, al revés. Mismo mecanismo de
// HTMLAudioElement + fundirAudio() que la ambiental.
const VOL_JEFE = 0.55;
let audioJefe = null;
let jefeActivo = false;

function volObjetivoJefe() {
  if (AJ.silencio || !jefeActivo) return 0;
  return AJ.volMaster * AJ.volMus * VOL_JEFE;
}

function crearAudioJefe() {
  if (audioJefe) return audioJefe;
  audioJefe = new Audio(`${import.meta.env.BASE_URL}assets/audio/musica_jefe_1.mp3`);
  audioJefe.loop = true;
  audioJefe.volume = 0;
  document.body.appendChild(audioJefe);
  return audioJefe;
}

export function iniciarMusicaJefe() {
  jefeActivo = true;
  const a = crearAudioJefe();
  if (!AJ.silencio) {
    a.play().catch(() => {});
    fundirAudio(a, volObjetivoJefe(), 1.5);
  }
  if (audioAmbiente && ambienteActivo) fundirAudio(audioAmbiente, 0, 1.5);
}

export function detenerMusicaJefe() {
  jefeActivo = false;
  if (audioJefe && !audioJefe.paused) fundirAudio(audioJefe, 0, 1.5, () => audioJefe.pause());
  if (audioAmbiente && ambienteActivo && !AJ.silencio)
    fundirAudio(audioAmbiente, volObjetivoAmbiente(), 1.5);
}

// Bucle del fuego de la Senda Elemental (tecla C, mago, elemento fuego --
// ver actualizarSendaElemental() en systems/abilities.js) mientras dura
// el rastro. Fade in/out (pedido expreso: "que no haya cambios
// bruscos"), mismo mecanismo de HTMLAudioElement + fundirAudio() que la
// ambiental/pista de jefe de arriba. Un Audio POR JUGADOR (indexado por
// p.idx, no uno global) porque en cooperativo puede haber más de un mago
// con la Senda de fuego activa a la vez.
const VOL_SENDA_FUEGO = 0.55;
const audiosSendaFuego = {};

function crearAudioSendaFuego(idx) {
  if (audiosSendaFuego[idx]) return audiosSendaFuego[idx];
  const a = new Audio(`${import.meta.env.BASE_URL}assets/audio/fuego_senda_loop.wav`);
  a.loop = true;
  a.volume = 0;
  document.body.appendChild(a);
  audiosSendaFuego[idx] = a;
  return a;
}

export function iniciarSendaFuegoAudio(idx) {
  if (AJ.silencio) return;
  const a = crearAudioSendaFuego(idx);
  a.play().catch(() => {});
  fundirAudio(a, AJ.volMaster * AJ.volSfx * VOL_SENDA_FUEGO, 0.6);
}

export function detenerSendaFuegoAudio(idx) {
  const a = audiosSendaFuego[idx];
  if (!a || a.paused) return;
  fundirAudio(a, 0, 0.6, () => a.pause());
}
