# Formato de nivel (editor → motor)

Pipeline: diseñar en `tools/level-editor/` (abrir `index.html` con el `npm run dev`
levantado, o servirlo suelto) → botón **"Exportar JSON (motor)"** → guardar el
resultado como `src/systems/customRooms/<id>.json` → el motor lo detecta solo, sin
tocar código (ver `src/systems/customRooms.js`).

## Por qué JSON y no el texto ASCII

El editor también exporta un texto ASCII legible (dos capas, pensado para revisar/
diffear cambios en el propio editor), pero **el motor no lee texto**: trabaja con
rectángulos de píxeles para los muros y listas de puntos para el resto. El JSON ya
viene convertido a ese modelo — el motor solo necesita volcarlo en `G` (ver
`generarMapa()`/`poblarSala()` en `src/systems/floorgen.js`).

## Sistema de coordenadas

- Sala: 1600×1000 px (`SALA_W`/`SALA_H` en `src/core/constants.js`).
- Grid del editor: 40×25 celdas de 40×40 px cada una (`COLS`/`ROWS`/`CELL` en
  `tools/level-editor/js/config.js`).
- Todas las coordenadas del JSON son píxeles absolutos de sala, origen (0,0) en la
  esquina superior izquierda — igual que `G.muros`/`G.objetos`/`G.enemigos` en tiempo
  de ejecución.

## Esquema del JSON

Un archivo por sala, con esta forma (ver `src/systems/customRooms/arsenal.json` como
referencia real):

```json
{
  "id": "arsenal",
  "nombre": "Cámara del Arsenal",
  "muros": [
    { "x": 160, "y": 200, "w": 360, "h": 80 },
    { "x": 1200, "y": 200, "w": 120, "h": 80, "secreto": true }
  ],
  "objetos": [{ "tipo": "cofre", "x": 980, "y": 420 }],
  "enemigos": [{ "tipo": "tank", "x": 500, "y": 300 }],
  "pilares": [{ "x": 700, "y": 500, "destructible": true }]
}
```

- **`id`**: se usa como nombre de la "forma" en `FORMAS_MAPA` (ver `floorgen.js`) —
  debe ser único entre todos los `customRooms/*.json`. El editor lo deriva del
  nombre de la sala (minúsculas, sin espacios/acentos); puedes editarlo a mano en el
  JSON si quieres un id concreto.
- **`muros`**: rectángulos ya fusionados a partir de las celdas contiguas marcadas
  como muro/muro secreto en el editor. `secreto: true` hace que ese rectángulo se
  pueda revelar en el juego pulsando E (igual que la sala "arsenal" original).
- **`objetos`** / **`enemigos`** / **`pilares`**: opcionales. Si vienen vacíos, el
  motor puebla la sala proceduralmente como cualquier otra forma (ver
  `poblarSala()`). Si traen contenido, se coloca **exactamente** ahí en vez de
  sortearlo (`colocarContenidoFijo()` en `floorgen.js`).

## Catálogo de tipos (motorTipo)

Solo estos identificadores son válidos en `objetos[].tipo` / `enemigos[].tipo` — deben
coincidir con lo que espera el motor:

| Categoría | `motorTipo` válidos | Origen en el motor |
|---|---|---|
| Enemigos | `melee`, `ranged`, `runner`, `tank`, `caster`, `bomber`, `mini` | `src/systems/combat.js` (`tipoAleatorio`, tabla `TIPOS` de `spawnEnemigo`) |
| Objetos | `barril`, `cofre`, `cristal`, `brasero` | `src/systems/floorgen.js` (`ponHazardsYObjetos`) |
| Pilares | (sin campo `tipo`, solo `destructible: true/false`) | `src/systems/floorgen.js` (`ponPilares`, `G.pilares`) |

El pincel `jefe` no existe en el editor a propósito: los jefes se generan en su
propio flujo (`iniciarPlanta()`), nunca dentro de una mazmorra multi-sala.

## Puertas: solo hay que no bloquearlas

Las 4 puertas de una sala están en posiciones **fijas** (centro de cada borde,
`posPuerta()` en `floorgen.js`) y su destino lo decide en tiempo de ejecución el
grafo aleatorio de la mazmorra (`conectar()`) — una sala diseñada a mano **no**
declara a qué sala conecta cada puerta, solo tiene que dejar libre una ventana de
`HUECO_PUERTA` = 140 px alrededor de cada ancla que vaya a usarse.

El editor valida esto automáticamente antes de exportar (ver `js/validacion.js` →
`anclasBloqueadas()`): si un muro invade esa ventana en alguna de las 4 direcciones,
el mensaje tras exportar avisa qué dirección(es) quedarían bloqueadas. El pincel
"Puerta" del editor es solo una referencia visual para quien diseña — no se exporta
como geometría, ya que las puertas reales las coloca el motor.

## Dimensionado de sprites (para pinceles nuevos)

El editor dibuja cada tile estirando la imagen de origen al tamaño de celda
(`CELL` = 40×40 px, ver `dibujarTile()` en `js/render.js`) **sin preservar el
aspect ratio**. Esto es indiferente para los sprites reales del motor (se usan
sueltos, a tamaño natural completo, `sw:0/sh:0`), pero si vas a importar un PNG
propio como pincel nuevo (botón "➕ Nuevo Pincel" → selector ⚙️) conviene
dimensionarlo bien para que no salga deformado:

- **Cuadrado.** El tile final siempre se pinta en un cuadrado de 40×40 px, así
  que cualquier sprite no cuadrado (p. ej. una puerta de 160×29 o una pared de
  16×128) se verá estirado/aplastado al encajarlo. Usa lienzos cuadrados.
- **Múltiplo de 32 px.** El selector visual (picker) superpone una rejilla de
  recorte configurable (por defecto 32 px, `TAM_MAX_RECORTE` en `js/config.js`)
  y el recorte máximo que admite es 32×32. Si tu imagen es un spritesheet con
  varios tiles, que cada casilla mida 32×32 (o un múltiplo exacto, p. ej.
  64×64 con `picker-grid-size = 64`) para que los clics caigan justo en los
  bordes de cada sprite.
- **Spritesheet vs. sprite suelto.** Da igual cuál de los dos uses: el picker
  funciona tanto con una imagen que contenga un único tile de 32×32 como con
  una hoja grande de varios tiles — solo cambia si necesitas recortar
  (clic normal, alineado a rejilla) o arrastrar con Alt para una selección
  libre de hasta 32×32 px.
- **Fondo transparente (PNG con alfa).** El editor no rellena un color de
  fondo detrás del sprite (solo un placeholder oscuro si la imagen falla o no
  hay ninguna asignada), así que exporta con transparencia si el tile no debe
  tapar completamente la celda.

Los sprites reales del juego (`public/assets/sprites/`) no siguen esta regla
porque se dibujan a tamaño natural sin recorte — son referencia de arte del
motor, no de este flujo de pinceles personalizados.

## Elementos sin mapeo todavía (solo referencia visual)

Estos pinceles existen en el editor para poder diseñar visualmente, pero
**no se exportan** al JSON (`capaExport: "ninguno"` en `config.js`) porque el motor
no tiene hoy un equivalente por-celda:

- **`escalera`**: en el motor, la escalera de bajada (`G.escaleraAbajo`) es una
  posición fija por sala (siempre la sala de entrada), no algo que se pinte en una
  celda concreta.
- **`trampa`**: los hazards reales (`grieta`, `arena`, `ortiga`, `fuegoZona`) son
  zonas colocadas proceduralmente con radio variable, no un tile puntual — mapear
  `trampa` a un hazard concreto requeriría decidir tipo/radio, pendiente de diseño.

## Verificar una sala nueva en el juego

1. Diseña la sala en `tools/level-editor/`, revisa que no aparezca ningún aviso ⚠ de
   puertas bloqueadas al exportar.
2. Guarda el JSON en `src/systems/customRooms/<id>.json`.
3. `npm run dev` y añade `?qa=1` a la URL — la planta 1 fuerza la sala `"arsenal"`
   como sala de entrada (mismo interruptor que usa el cofre de pruebas, ver
   `core/gameflow.js`); para probar OTRA sala nueva, cambia temporalmente ese
   `actual.forma = "arsenal"` en `generarGrafoPlanta()` (`floorgen.js`) por el `id`
   de tu sala nueva mientras la pruebas.
4. Confirma visualmente: muros donde se pintaron, puertas abriendo en las anclas
   correctas, y (si el JSON trae contenido) objetos/enemigos/pilares en su sitio.
