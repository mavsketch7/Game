# Changelog

## 2026-07-23 — Refactor a proyecto modular

Reestructuración completa del proyecto de un único archivo HTML
(`index.html.html`, ~11.400 líneas) a una arquitectura de app web
convencional, en preparación para un futuro empaquetado en Steam
(Electron) y Android (Capacitor). Ver [ROADMAP.md](ROADMAP.md) y
[ARCHITECTURE.md](ARCHITECTURE.md).

- **Backup**: el HTML original se conserva íntegro en
  `backups/index.html.2026-07-23-preRefactor.html`. El backup previo del
  usuario (`torre-de-vespero-coop_12.BACKUP-before-pixelart.html`) se
  movió a la misma carpeta.
- **Tooling**: proyecto npm con Vite (`npm run dev` / `build` / `preview`).
- **CSS**: extraído tal cual a `src/styles/main.css`.
- **JavaScript**: las ~10.000 líneas de script inline se dividieron en 31
  módulos ES por sistema bajo `src/` (`core/`, `systems/`, `render/`,
  `ui/`, `net/`, `utils/`). El comportamiento se preservó: es una
  reorganización de archivos, no una reescritura de la lógica de juego.
- **Sprites**: las ~28 imágenes que estaban incrustadas como
  `data:image/png;base64,...` dentro del script se extrajeron a archivos
  PNG reales en `public/assets/sprites/`, cargados vía
  `assetUrl()` en `render/sprites.js`.
- **`sprites_test/`**: archivado íntegro (sin borrar nada) en
  `tools/asset-source/sprites_test/` — era el taller donde se generaron
  los sprites, no algo referenciado por el juego.
- Sin cambios de balance, mecánicas ni contenido del juego.
