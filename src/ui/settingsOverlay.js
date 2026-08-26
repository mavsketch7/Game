// Ajustes: vivía en su propio overlay (#ajustes/#ajustes-inner), accesible
// con el botón ⚙ incluso antes de tener partida -- ahora es una pestaña
// más del libro (ver ui/inventory.js: tabAjustes(), solo alcanzable con
// partida activa, igual que el resto del libro). Este archivo se queda
// solo con toggleSilencioRapido(), el atajo rápido de silencio (tecla M)
// que no depende de ningún overlay abierto.
import { AJ } from "../core/settings.js";
import { aplicarMusica, initAudio } from "../systems/audio.js";
import { G } from "../core/state.js";
import { toast } from "./notifications.js";

export function toggleSilencioRapido() {
        AJ.silencio = !AJ.silencio;
        initAudio();
        aplicarMusica();
        if (G)
          toast(AJ.silencio ? "🔇 Silencio" : "🔊 Sonido activado", "#9a93ab");
      }
