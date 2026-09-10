// Marcos de barra de vida (asset propio, no tileset) -- el hueco interior
// (donde va el relleno de vida) se midió a mano escaneando el canal alfa
// del PNG (transparente dentro, opaco en el marco/adornos) -- ver los
// scripts de análisis en el historial de la sesión, no hace falta
// recalcularlo salvo que se reemplace el archivo de origen.
export const BOSS_BAR = new Image();
BOSS_BAR.src = `${import.meta.env.BASE_URL}assets/ui/ui-ingame/boss-hp-ui-bar.png`;
// Rect interior en el espacio nativo de la imagen (520x71).
export const BOSS_BAR_INTERIOR = { x: 40, y: 29, w: 440, h: 24 };

export const ENEMY_BAR = new Image();
ENEMY_BAR.src = `${import.meta.env.BASE_URL}assets/ui/ui-ingame/enemies-hp-ui-bar-outline.png`;
// Rect interior en el espacio nativo de la imagen (74x18).
export const ENEMY_BAR_INTERIOR = { x: 5, y: 5, w: 64, h: 8 };
