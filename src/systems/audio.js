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
      }

export function reanudarAudio() {
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
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
