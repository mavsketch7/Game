// Extraído de world.js (2026-08-19, reparto de responsabilidades: ver
// render/character.js) -- primitivas de dibujo de sprite genéricas, usadas
// tanto por el resto de world.js (suelo/props/objetos) como por
// render/character.js (jugador/enemigos). Sin dependencias de ninguno de
// los dos, para no crear un ciclo entre ellos.
import { cx } from "../core/canvas.js";

export function drawSprite(img, x, y, flip, esc) {
        esc = esc || 1;
        cx.save();
        cx.translate(Math.round(x), Math.round(y));
        if (flip) cx.scale(-1, 1);
        cx.scale(esc, esc);
        cx.drawImage(img, -img.width / 2, -img.height / 2);
        cx.restore();
      }

// Como drawSprite(), pero ancla por el borde INFERIOR (pies) en vez del
// centro geométrico del cuadro -- para los frames de REAL_IDLE/REAL_RUN/
// REAL_ATTACK, que ya vienen recolocados por cargarHojaFrames() (sprites.js)
// para que los pies queden justo en el borde inferior del cuadro. Con
// drawSprite() (centrado) el margen vacío desigual de la hoja de origen
// desplazaba el punto de apoyo real y el personaje se veía "flotando".
export function drawSpriteBottom(img, x, yPies, flip, esc) {
        esc = esc || 1;
        cx.save();
        cx.translate(Math.round(x), Math.round(yPies));
        if (flip) cx.scale(-1, 1);
        cx.scale(esc, esc);
        cx.drawImage(img, -img.width / 2, -img.height);
        cx.restore();
      }
