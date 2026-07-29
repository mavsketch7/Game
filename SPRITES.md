# Guía de sprites y assets

Directrices para preparar y entregar assets gráficos (personajes, armas,
equipamiento, objetos, tiles de mazmorra) de forma que se integren sin
ambigüedad. Está escrita a partir de errores reales de esta sesión: un
barril confundido con un cofre, dos medias-ilustraciones dentro de una
misma celda confundidas con un fotograma de animación, y un fragmento de
pared confundido con una columna. Todos esos fallos vinieron de lo mismo:
adivinar qué es cada tile mirando una hoja suelta, sin ninguna referencia
que confirmara su uso real.

## 0. Antes de nada: cómo evitar que vuelva a pasar

1. **No recortes ni renombres nada antes de enviarlo.** Copia la carpeta
   del pack tal cual la descargaste (README, licencia, ejemplos de mapa
   incluidos). El contexto que rodea a un tile dentro de su hoja original
   suele ser la única pista real de para qué sirve.
2. **Si el pack trae un mapa de ejemplo (`.tmx`, `.json` de Tiled, o
   incluso una captura de la página del asset), dilo explícitamente.**
   Es la fuente de verdad más fiable que hemos tenido en toda la sesión —
   muestra el uso que le dio el propio autor, no una suposición mía.
3. **Si ya sabes para qué es una pieza, dímelo con una frase.** "Fila 2,
   columna 5 es el suelo", o directamente un recorte con "esto es la
   columna" vale más que cualquier análisis visual mío.
4. **Indica el tamaño de tile en píxeles** si lo sabes (8, 16, 32...). La
   mayoría de estos fallos vienen de un cálculo de rejilla mal hecho sobre
   una hoja sin esa referencia.
5. Antes de que una pieza estructural (muro, suelo, columna) entre en el
   juego, te la enseño recortada para que confirmes que es lo que
   creemos que es — no solo para animaciones como el cofre.

## 1. Convenciones técnicas actuales del proyecto

Todo el arte vive en `public/assets/sprites/*.png` y se carga por nombre
desde `src/render/sprites.js` vía `assetUrl(name)`. Dos caminos conviven:

- **Sprites procedurales** (`buildSprite(rows, pal, esc)`): un array de
  strings donde cada carácter es una clave de paleta (`K`=contorno,
  `X`=color variable, `.`=transparente...), pintado píxel a píxel y
  escalado con `esc` (factor entero, sin filtrado). Así están definidos
  todos los héroes, enemigos, iconos de objetos que caen (`ESPADA_ROWS`,
  `ESCUDO_ROWS`, `ANILLO_ROWS` en torno a `sprites.js:165-196`) y el icono
  genérico de gema/drop. **No necesitan PNG** — si pides un enemigo o
  icono nuevo y no tienes arte, puedo generarlo así directamente a partir
  de una descripción.
- **PNG reales** (`ASSET_SRC` / `KENNEY_ICON_SRC` / `KENNEY_TILE_SRC`):
  para todo lo demás. Todos se re-escalan con `upscaleNN()` (vecino más
  cercano, sin difuminado) por un factor entero — normalmente **×3**
  (algunos iconos de clase usan ×3.5, ver `KENNEY_ICON_SCALE`).

### Tamaños de referencia ya en uso

| Asset | Tamaño en disco | Factor | Notas |
|---|---|---|---|
| `wall.png` | 16×16 | ×3 | relleno de muro, `createPattern` en bucle (`wallPatron()`) |
| `wallRemate.png` | 48×16 (3 tiles de 16×16) | ×3 | franja de remate/almenas para el borde superior de muros grandes |
| `cofre_f0.png` / `cofre_f4.png` | 32×32 | ×3 | cerrado / abierto — sin fotogramas intermedios (ver §3) |
| `esqueleto.png`, `ojo.png`, `guerrero.png`, `barril.png`, etc. (iconos de clase/enemigo) | 16×16 | ×3 (o ×3.5) | un icono = un PNG independiente, no una hoja compartida |
| `suelo1.png` / `suelo2.png` | 240×240 | tal cual (patrón grande) | textura de suelo, no tileable en el sentido estricto de rejilla |
| `jefe_cerdo.png` | 104×190 | tal cual | sprite único de jefe, sin escalar por rejilla |

Si me traes un pack nuevo con un tile size distinto (24px, 32px...), no
pasa nada — solo dímelo para no asumir 16px por defecto, que es lo más
frecuente hasta ahora.

## 2. Personajes (jugables y enemigos)

- Un PNG por personaje, recorte único (no spritesheet de varios frames):
  hoy no hay animación por hoja de fotogramas para la mayoría de roles —
  solo `guerrero`/`arquero`/`picaro` tienen listas `REAL_RUN`/`REAL_ATTACK`
  preparadas (actualmente vacías, `sprites.js:831-848`) para el día que
  haya spritesheets de correr/atacar reales.
- Si envías una animación (correr, atacar), indícalo como **tira
  horizontal de N fotogramas de igual ancho** y dime cuántos frames y a
  qué acción corresponde cada uno — el código ya tiene el array preparado,
  solo falta la ruta y el recuento.
- La armadura equipada se pinta como una capa superpuesta
  (`ARMOR_ROWS`/`ESC_HEROE`, `spriteJugador()`) tintada según la rareza
  (`RAREZAS[...].col`), no como parte del sprite base — no hace falta un
  PNG de personaje distinto por cada pieza de armadura.

## 3. Cofres, barriles, props interactivos

- **Solo dos estados por prop interactivo: cerrado/inactivo y
  abierto/activado.** No mandes fotogramas de transición intermedios — el
  "pop" al abrirse se resuelve en código (escala con ease-out-back en
  `render/world.js`), no con arte. Si la hoja de origen trae fotogramas
  intermedios, hay bastantes probabilidades de que compartan celda con
  algo más (como pasó con `cofre_f3`, que resultó ser dos
  medias-ilustraciones distintas en una sola celda) — mejor evitarlos
  salvo que confirmes con una captura que cada fotograma es una
  ilustración completa y única.

## 4. Armas, armadura, accesorios que caen al suelo

- Hoy los iconos de drop (`iconoDrop()`, `sprites.js:184-196`) son
  procedurales: una silueta simple (espada/escudo/anillo) coloreada según
  la rareza del objeto, generada bajo demanda y cacheada por
  slot+rareza — no hay PNG por objeto.
- Si aportas iconos reales para objetos concretos (p. ej. el "Espada-
  Pistola" u otro objeto Mítico con pasiva única), lo ideal es **un PNG
  cuadrado pequeño (16×16 o 32×32) por objeto**, con el nombre del objeto
  o su `id` de efecto como nombre de archivo, para que el mapeo a
  `OBJETOS_MITICOS` (`src/systems/objetosMiticos.js`) sea directo.
- El haz de luz vertical al caer un objeto (`render/world.js`) es
  puramente de código (gradiente), no necesita arte adicional.

## 5. Tiles de mazmorra (muros, suelo, columnas, remates)

- **Confirma primero si el pack es de "autotiling" (bitmask de 4/8
  vecinos con piezas de esquina/borde) o de piezas grandes
  prefabricadas.** Ya se investigó a fondo el pack
  `free-2d-top-down-pixel-dungeon-asset-pack`: **no** es un kit de
  autotiling completo — no trae esquina interior, cruce en T, ni bordes en
  las 4 direcciones para el tile de relleno. Es un conjunto de piezas
  grandes (arcos, alacenas, columnas sueltas) más un tile de relleno liso
  y una tira de remate/almenas reutilizable. Si traes un pack nuevo,
  dime si es de uno u otro tipo — cambia totalmente cómo lo integro
  (patrón repetido con `createPattern` vs. piezas colocadas a mano).
- Los muros y el suelo se pintan como **patrón repetido** (`wallPatron()`/
  `remateMuroPatron()`), no como una rejilla de tiles individuales
  posicionados — así que un solo tile de relleno (16×16 o el tamaño que
  sea) es suficiente, no hace falta una hoja completa si solo quieres
  cambiar el color/textura del muro o el suelo.
- Para columnas/pilares independientes: tienen que ser un elemento
  recortable de forma aislada (silueta completa, no un fragmento que solo
  tiene sentido pegado a una pared) — el error de `pilar.png` fue
  precisamente enviar un fragmento de pared como si fuera una columna
  suelta.
- Si quieres piezas nuevas de remate/decoración de muro, una tira
  horizontal corta (como `wallRemate.png`, 3 tiles de 16×16) funciona
  igual que la actual: se repite con `createPattern` a lo largo del borde
  superior del muro.

## 6. Checklist rápida al entregar un pack nuevo

- [ ] Carpeta original sin recortar ni renombrar, con README/licencia si
      los trae.
- [ ] ¿Hay mapa de ejemplo (`.tmx`/`.json`) o captura de uso? Indícalo.
- [ ] Tamaño de tile en píxeles, si lo sabes.
- [ ] Para cada pieza que ya tengas identificada: una frase de "esto es
      para X" (categoría + fila/columna o recorte).
- [ ] ¿Autotiling completo o piezas grandes prefabricadas?
- [ ] Espera confirmación mía (con captura del recorte) antes de que algo
      estructural (muro/suelo/columna) quede wired en el juego.
