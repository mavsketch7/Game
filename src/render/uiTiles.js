// Reskin de UI con "Dark Ages UI Pixel Art Asset Pack" (Hypnobius,
// torre-vespero: DarkAgesUi_v1.0/32x32-Tilesheet.png, 384x352, empaquetado
// en mosaico). Se recortan aquí los DOS trozos que se usan hoy -- el panel
// ornamentado grande (fondo de los paneles de jugador en el HUD) y la
// placa horizontal (fondo de la barra de vida del jefe) -- no toda la
// hoja tiene aplicación clara todavía (bordes/iconos sueltos, sin usar).
//
// 9-slice / 3-slice DIBUJADO A MANO (sin librería): las esquinas/tapas se
// pintan a su tamaño real de origen, SIN escalar -- el propio pack avisa
// de que reducir por debajo de 32px pierde detalle del grabado -- y solo
// los tramos centrales se estiran para rellenar el ancho/alto pedido. Así
// un panel de cualquier tamaño mantiene las esquinas ornamentadas nítidas
// en vez de deformar todo el dibujo de una vez.
import { cx } from "../core/canvas.js";

const UI_TILES_SRC = `${import.meta.env.BASE_URL}assets/sprites/ui/darkages_tiles.png`;

let uiTilesImg = null;
const imCarga = new Image();
imCarga.onload = () => {
  uiTilesImg = imCarga;
};
imCarga.onerror = () => console.warn("No se pudo cargar la hoja de UI: " + UI_TILES_SRC);
imCarga.src = UI_TILES_SRC;

// Panel ornamentado (esquinas doradas con volutas, borde con gemas azules,
// centro plano oscuro) -- recorte (0,0)-(96,96) de la hoja, esquina de
// 24px medida a ojo contra el propio arte (ver el grabado de las volutas).
const PANEL_ORNADO = { sx: 0, sy: 0, s: 96, esquina: 24 };

// Placa/nameplate horizontal (tapas con esquineras plateadas, centro
// oscuro plano) -- recorte (0,96)-(64,128), tapa de 16px. Pensada para
// barras anchas y bajas (barra de vida de jefe), no para paneles
// cuadrados -- solo se estira en horizontal, la altura se dibuja siempre
// a su tamaño de origen (32px) escalado UNIFORME al alto pedido.
const PLACA_H = { sx: 0, sy: 96, w: 64, h: 32, tapa: 16 };

// Devuelve false sin dibujar nada si la hoja todavía no cargó (un
// instante, al arrancar) -- el llamador debe tener su propio fallback
// (el panel plano de siempre) para ese hueco, igual que el resto de
// sprites reales de este proyecto (ver REAL_IDLE etc. en sprites.js).
export function dibujarPanelOrnado(x, y, w, h) {
  if (!uiTilesImg) return false;
  const { sx, sy, s, esquina: c } = PANEL_ORNADO;
  const mid = s - c * 2;
  const dw = Math.max(1, w - c * 2),
    dh = Math.max(1, h - c * 2);
  cx.drawImage(uiTilesImg, sx, sy, c, c, x, y, c, c);
  cx.drawImage(uiTilesImg, sx + s - c, sy, c, c, x + w - c, y, c, c);
  cx.drawImage(uiTilesImg, sx, sy + s - c, c, c, x, y + h - c, c, c);
  cx.drawImage(uiTilesImg, sx + s - c, sy + s - c, c, c, x + w - c, y + h - c, c, c);
  cx.drawImage(uiTilesImg, sx + c, sy, mid, c, x + c, y, dw, c);
  cx.drawImage(uiTilesImg, sx + c, sy + s - c, mid, c, x + c, y + h - c, dw, c);
  cx.drawImage(uiTilesImg, sx, sy + c, c, mid, x, y + c, c, dh);
  cx.drawImage(uiTilesImg, sx + s - c, sy + c, c, mid, x + w - c, y + c, c, dh);
  cx.drawImage(uiTilesImg, sx + c, sy + c, mid, mid, x + c, y + c, dw, dh);
  return true;
}

export function dibujarPlacaHorizontal(x, y, w, h) {
  if (!uiTilesImg) return false;
  const { sx, sy, w: sw, h: sh, tapa: c } = PLACA_H;
  const midSrc = sw - c * 2;
  const dw = Math.max(1, w - c * 2);
  cx.drawImage(uiTilesImg, sx, sy, c, sh, x, y, c, h);
  cx.drawImage(uiTilesImg, sx + sw - c, sy, c, sh, x + w - c, y, c, h);
  cx.drawImage(uiTilesImg, sx + c, sy, midSrc, sh, x + c, y, dw, h);
  return true;
}
