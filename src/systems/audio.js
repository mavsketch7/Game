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

// Espadazo del guerrero (golpe básico, Golpe Colosal y Estocada, ver
// systems/abilities.js) -- reemplaza el antiguo preset de un solo
// oscilador (sonaba fino, "sin peso") por dos capas, mismo patrón que
// sfxAterrizaje(): un silbido agudo (el filo cortando el aire) seguido,
// unos milisegundos después, de un golpe grave con ataque brusco (el
// "peso" del acero conectando) en vez de solo el barrido agudo de antes.
export function sfxEspadazo() {
        if (AJ.silencio || !audioCtx) return;
        reanudarAudio();
        const now = audioCtx.currentTime;
        const vol = AJ.volMaster * AJ.volSfx;
        // silbido: filo cortando el aire, agudo y breve
        const oscSilbido = audioCtx.createOscillator();
        const gSilbido = audioCtx.createGain();
        oscSilbido.type = "sawtooth";
        oscSilbido.frequency.setValueAtTime(1900, now);
        oscSilbido.frequency.exponentialRampToValueAtTime(500, now + 0.09);
        gSilbido.gain.setValueAtTime(0.26 * vol, now);
        gSilbido.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        oscSilbido.connect(gSilbido);
        gSilbido.connect(audioCtx.destination);
        oscSilbido.start(now);
        oscSilbido.stop(now + 0.12);
        // impacto grave: el peso del golpe conectando -- ataque brusco
        // (linearRamp de casi nada a pleno volumen en 12ms, no un fade
        // suave) para que se sienta un golpe seco, no un zumbido.
        const t0 = now + 0.045;
        const oscGrave = audioCtx.createOscillator();
        const gGrave = audioCtx.createGain();
        oscGrave.type = "square";
        oscGrave.frequency.setValueAtTime(150, t0);
        oscGrave.frequency.exponentialRampToValueAtTime(48, t0 + 0.11);
        gGrave.gain.setValueAtTime(0.001, t0);
        gGrave.gain.linearRampToValueAtTime(0.55 * vol, t0 + 0.012);
        gGrave.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
        oscGrave.connect(gGrave);
        gGrave.connect(audioCtx.destination);
        oscGrave.start(t0);
        oscGrave.stop(t0 + 0.15);
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
      }
