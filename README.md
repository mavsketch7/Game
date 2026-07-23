# La Torre de Véspero — Cooperativo

Roguelike de acción 2D en canvas, cooperativo local para 1-4 jugadores
(teclado+ratón y mandos vía Gamepad API), con un modo "jugar online"
experimental (WebRTC vía PeerJS). 100 plantas, jefes cada 5, generación
procedural de mapas, sprites pixel-art y un sistema de cartas/mejoras.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior.

## Empezar

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (normalmente `http://localhost:5173`).

## Compilar para producción

```bash
npm run build   # genera dist/ (estático, listo para servir o empaquetar)
npm run preview # sirve dist/ localmente para probarlo antes de publicar
```

`dist/` es un sitio 100% estático: HTML + CSS + JS + sprites PNG, sin
dependencias de servidor. Puede subirse a cualquier hosting estático, o
usarse como base para un empaquetado nativo futuro (ver
[docs/ROADMAP.md](docs/ROADMAP.md)).

## Estructura del proyecto

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para el mapa completo de
módulos. Resumen:

```
src/
  core/       estado global, canvas, ajustes, guardado, bucle principal
  systems/    reglas de juego (combate, generación de plantas, input, cartas...)
  render/     todo lo que se dibuja en el canvas (sprites, mundo, HUD, FX)
  ui/         overlays HTML (menú, inventario, tienda, ajustes...)
  net/        modo "jugar online" (PeerJS)
public/
  assets/sprites/   sprites PNG (extraídos del HTML original)
```

## Controles

- **Teclado**: `WASD` mover · clic izq. atacar · clic der. parry ·
  `Espacio` esquivar · `E` ulti · `1·2·3` elementos/soportes/formas ·
  `Tab` ficha.
- **Mando**: sticks mover/apuntar · `RT` atacar · `LT` parry · `A` esquivar ·
  `Y` ulti · `X·B·RB` elementos/soportes/formas · `Start` ficha ·
  `Select` ajustes.
- `G` o el botón ⚙ abren ajustes · `F` pantalla completa · `M` silenciar.

## Estado del proyecto

Este proyecto se refactorizó en 2026-07 desde un único archivo HTML
(`backups/index.html.2026-07-23-preRefactor.html`, conservado como
referencia) a la estructura modular actual. Ver
[docs/CHANGELOG.md](docs/CHANGELOG.md).
