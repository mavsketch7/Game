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

// Avatar del jugador (moneda por clase, ver render/hud.js: renderHUD()).
// Cada PNG trae 4 monedas en fila -- cobre/bronce/plata/oro, 86px cada
// una (frame width fijo, alto varía un poco por archivo pero se lee de
// naturalHeight) -- pensadas como un futuro indicador de RANGO. De
// momento el HUD solo dibuja el frame 0 (cobre), pero se carga la tira
// entera ya para no tener que retocar la carga cuando se añada el
// sistema de rango real.
export const AVATAR_MONEDA_FRAME_W = 86;
const AVATAR_MONEDA_SRC = {
  guerrero: "avatar-moneda-class-guerrero.png",
  arquero: "avatar-moneda-class-arquero.png",
  mago: "avatar-moneda-class-mago.png",
  // el archivo de arte se llama "ladron", pero la clase en ROLES/p.rol es "picaro"
  picaro: "avatar-moneda-class-ladron.png",
};
export const AVATAR_MONEDA_IMG = {};
for (const rol in AVATAR_MONEDA_SRC) {
  const im = new Image();
  im.src = `${import.meta.env.BASE_URL}assets/ui/ui-ingame/${AVATAR_MONEDA_SRC[rol]}`;
  AVATAR_MONEDA_IMG[rol] = im;
}
