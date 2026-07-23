// Auto-generated during the modularization refactor (2026-07-23).
import { MAX_PLANTA } from "../core/constants.js";

const ARQUETIPOS = [
        "invocador",
        "segador",
        "gemelos",
        "tejedora",
        "magma",
        "espejo",
      ];

export function arquetipoJefe(f) {
        if (f >= 100) return "eterno";
        return ARQUETIPOS[(Math.round(f / 5) - 1) % ARQUETIPOS.length];
      }

export const DESC_ARQ = {
        invocador: "orbes radiales e invocaciones",
        segador: "se teletransporta y siega en área",
        gemelos: "dos colosos: el superviviente se enfurece",
        tejedora: "telarañas que inmovilizan",
        magma: "meteoros y suelo en llamas",
        espejo: "crea copias oscuras del grupo",
        eterno: "todo a la vez",
      };

export const NOMBRES_MINI = [
        "Verdugo Errante",
        "Ojo del Abismo",
        "Gula Insaciable",
        "Centinela Perdido",
        "El Coleccionista",
        "Aullido Hueco",
      ];

const NOMBRES_JEFES = [
        "",
        "",
        "",
        "",
        "Centinela de Umbral", // 5
        "",
        "",
        "",
        "",
        "Señor de las Sombras", // 10
        "",
        "",
        "",
        "",
        "El Custodio Roto", // 15
        "",
        "",
        "",
        "",
        "Carnicero de la Planta XX", // 20
        "",
        "",
        "",
        "",
        "Araña de Abismo", // 25
        "",
        "",
        "",
        "",
        "Oráculo Marchito", // 30
        "",
        "",
        "",
        "",
        "Goliat de Piedra Negra", // 35
        "",
        "",
        "",
        "",
        "Reina de las Ascuas", // 40
        "",
        "",
        "",
        "",
        "Jinete del Vacío", // 45
        "",
        "",
        "",
        "",
        "Hydra de la Torre", // 50
        "",
        "",
        "",
        "",
        "Archimago Caído", // 55
        "",
        "",
        "",
        "",
        "Devorador de Almas", // 60
        "",
        "",
        "",
        "",
        "Titán de Obsidiana", // 65
        "",
        "",
        "",
        "",
        "Señora de Cristal", // 70
        "",
        "",
        "",
        "",
        "El Ángel Marchito", // 75
        "",
        "",
        "",
        "",
        "Rey Espectro", // 80
        "",
        "",
        "",
        "",
        "Quimera del Fin", // 85
        "",
        "",
        "",
        "",
        "Guardián de Véspero", // 90
        "",
        "",
        "",
        "",
        "El Eterno Hambre", // 95
        "",
        "",
        "",
        "",
        "Véspero, el Eterno", // 100
      ];

export function nombreJefe(f) {
        const idx = f - 1;
        if (NOMBRES_JEFES[idx]) return NOMBRES_JEFES[idx];
        return "Jefe de la Planta " + f;
      }

export function esJefe(f) {
        return f % 5 === 0;
      }

export function escalaEnemigo(f) {
        const t = f / MAX_PLANTA; // 0..1
        const hpBase = 25 + f * 12 + f * f * 0.8; // ~25 planta1, ~1305 planta100
        const atkBase = 4 + f * 1.8 + f * f * 0.025; // ~4 planta1, ~186 planta100
        const velBase = 56 + Math.min(f * 1.1, 70); // tope 126 px/s en planta ~64+
        return { hpBase, atkBase, velBase };
      }
