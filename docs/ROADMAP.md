# Roadmap: de app web a Steam y Android

Este refactor (2026-07) preparó el terreno para un empaquetado nativo
futuro, pero **no instaló ni configuró Electron/Capacitor** — eso es
trabajo aparte, con sus propios requisitos (firma de binarios, cuentas de
desarrollador, assets de tienda). Lo que sí se hizo pensando en esto:

- `npm run build` produce `dist/` como sitio 100% estático (HTML+CSS+JS+PNG),
  sin dependencias de servidor.
- `vite.config.js` usa `base: './'` (rutas relativas), necesario para que
  `dist/index.html` funcione servido desde `file://` o un esquema custom,
  no solo desde la raíz de un dominio.
- El código no depende de APIs exclusivas de navegador de escritorio: usa
  Canvas 2D, Web Audio, Gamepad API y `localStorage`-free state — todo
  soportado por los WebViews de Electron y Android/Capacitor.

## Steam (escritorio) → Electron

Camino recomendado por ser el más maduro para juegos HTML5 indie en Steam
(bindings de Steamworks bien probados para logros, cloud saves, etc.).

1. `npm install --save-dev electron electron-builder`.
2. Proceso principal mínimo que carga `dist/index.html` en un
   `BrowserWindow`.
3. Integrar `steamworks.js` (o `greenworks`) si se quieren logros/cloud
   saves — actualmente el juego no persiste nada entre sesiones (ver
   "Estado sin persistencia" abajo), así que cloud saves requeriría antes
   implementar un sistema de guardado.
4. `electron-builder` para generar el instalador y subirlo a Steamworks.

## Android → Capacitor

Camino recomendado sobre Cordova (su sucesor, mejor mantenido).

1. `npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android`.
2. `npx cap init` apuntando `webDir` a `dist/`.
3. `npx cap add android`, luego abrir el proyecto generado en Android
   Studio para firmar y publicar.
4. Revisar controles táctiles: hoy el juego asume teclado/ratón/mando; en
   Android haría falta un layout de controles táctiles (stick virtual +
   botones) como capa adicional, ya que el Gamepad API solo cubre mandos
   Bluetooth/USB conectados al dispositivo.

## Estado sin persistencia (gap conocido)

El juego actual **no usa `localStorage` en ningún sitio**: el oro, las
mejoras de tienda y las skins compradas (`META` en `core/save.js`) viven
solo en memoria y se pierden al recargar la página. Esto ya era así en el
HTML original — no es una regresión de este refactor. Antes de un release
en Steam/Android (donde los jugadores esperan progreso persistente) haría
falta:

- Serializar `META` a `localStorage` (web/Electron) o al storage nativo
  correspondiente (Capacitor: `@capacitor/preferences`).
- Cargarlo al arrancar `core/save.js`.

## Modo online (PeerJS)

El modo "jugar online" depende de la nube pública de PeerJS
(`0.peerjs.com`) para el intercambio inicial de señalización WebRTC.
Funciona igual en Electron/Capacitor siempre que haya conexión a
internet, pero para una versión Steam con matchmaking propio se
sustituiría por Steamworks P2P Networking — eso es un cambio de
`src/net/peer.js`, no de la arquitectura general.
