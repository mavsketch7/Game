# Arquitectura

## Resumen

El juego es una app cliente pura: un bucle `requestAnimationFrame` que lee
input (teclado/ratón/mandos), actualiza un estado de partida mutable (`G`,
en `core/state.js`) y dibuja todo en un único `<canvas>`. No hay backend
propio; el modo "jugar online" usa PeerJS (WebRTC) para conectar
directamente a otros navegadores.

El estado sigue el mismo patrón que tenía el HTML original (mutación
directa de objetos compartidos, no un store inmutable/Redux-like) — se
preservó deliberadamente para no reescribir la lógica de juego, solo
reorganizarla en archivos con responsabilidades claras.

## Punto de entrada

`src/main.js` importa `ui/menu.js` (que arrastra transitivamente casi todo
el grafo de módulos), define el `bucle(ts)` principal y lo arranca con
`requestAnimationFrame`.

## Mapa de módulos

| Carpeta | Archivo | Responsabilidad |
|---|---|---|
| `core/` | `canvas.js` | referencia al `<canvas>`, escalado, pantalla completa |
| | `settings.js` | ajustes de audio/texto (`AJ`) |
| | `state.js` | estado mutable de la partida en curso (`G`) y su setter |
| | `save.js` | meta-progresión entre partidas (oro, mejoras, skins) |
| | `constants.js` | tablas de datos (roles, elementos, rarezas, XP...) |
| | `gameflow.js` | ciclo de vida de una partida (crear, lobby, abandonar) |
| | `loop.js` | `update(dt)`: la simulación de un frame |
| `systems/` | `input.js` | teclado/ratón + Gamepad API, navegación de menús con mando |
| | `audio.js` | sonido sintetizado (Web Audio, sin archivos de audio) |
| | `floorgen.js` | generación procedural de plantas/mapas |
| | `combat.js` | daño, muerte, XP, curación, invocación de enemigos |
| | `abilities.js` | ataques y habilidades de las 6 clases |
| | `bosses.js` | arquetipos y escalado de jefes |
| | `cards.js` | pool y sorteo de cartas de mejora |
| | `loot.js` | generación de objetos, fin de partida, reinicio |
| `render/` | `sprites.js` | construcción de sprites pixel-art + carga de texturas PNG |
| | `world.js` | dibujado del mundo (suelo, jugadores, enemigos) cada frame |
| | `hud.js` | barras de vida, cooldowns, HUD por jugador |
| | `effects.js` | partículas y efectos visuales |
| `ui/` | `menu.js`, `inventory.js`, `shop.js`, `skins.js`, `pvp.js`, `info.js`, `settingsOverlay.js`, `cardsOverlay.js`, `overlays.js`, `notifications.js` | overlays HTML de cada pantalla |
| `net/` | `peer.js` | modo "jugar online" (PeerJS/WebRTC) |
| `utils/` | `helpers.js` | utilidades puras (random, clamp, color) |

Nota: `iniciarLobby` vive en `core/gameflow.js` junto al resto del ciclo de
vida de partida (crear/lobby/abandonar), no en `ui/`.

## Por qué `G` tiene un setter dedicado

En JavaScript, un `import { G } from './state.js'` crea un enlace de solo
lectura: otros módulos pueden leer y mutar propiedades de `G` (`G.planta =
1` funciona), pero no pueden **reasignar** `G` por completo. El HTML
original reemplazaba `G` entero al empezar una partida nueva o al
recibir un snapshot de red. Para que eso siga funcionando entre módulos,
`core/state.js` expone `setG(valor)`, y los tres puntos que antes hacían
`G = {...}` ahora llaman a `setG({...})`.

## Funciones expuestas en `window`

La UI construye buena parte de su HTML dinámicamente con
`innerHTML = '...onclick="fn()"...'`. Esos atributos buscan `fn` en
`window` en el momento del clic, así que las funciones referenciadas así
se asignan explícitamente a `window` al final de su módulo (búscalo como
`window.nombreFuncion = nombreFuncion;`). Es un detalle a tener en cuenta
si se renombra o se elimina alguna de esas funciones.

## Sprites: de base64 inline a archivos reales

El HTML original incrustaba ~28 imágenes como `data:image/png;base64,...`
directamente en el JavaScript. Ahora son archivos PNG reales en
`public/assets/sprites/`, cargados mediante `assetUrl(nombre)` en
`render/sprites.js` (usa `import.meta.env.BASE_URL`, por lo que respeta el
`base` configurado en `vite.config.js`).
