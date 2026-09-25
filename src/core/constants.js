// Auto-generated during the modularization refactor (2026-07-23).

// Tamaño de una sala (mundo) -- ya NO es lo mismo que el tamaño del
// viewport/canvas (960x560, ver core/canvas.js): con la cámara de
// personaje (ver render/world.js: cálculo de G.cam), una sala puede ser
// más grande que la pantalla y la cámara recorre ese espacio más amplio.
// systems/floorgen.js importa estas dos constantes con el ALIAS "W"/"H"
// (import { SALA_W as W, SALA_H as H } ...) precisamente para que todas
// las fórmulas de generarMapa()/posPuerta()/etc. -- escritas en su día
// asumiendo "la sala es la pantalla" -- sigan funcionando igual, solo
// que ahora a la escala de sala real en vez de a la de viewport.
// Ya NO son constantes: una sala diseñada en el Telar de Mazmorras puede
// tener EL TAMAÑO QUE SE PINTE (campo `w`/`h` en customRooms/*.json) --
// pedido expreso del usuario ("que las fases sean de las dimensiones que
// se pintan ahí, para tener libertad creativa"). Son `let` + setter a
// propósito: los imports de ES modules son enlaces VIVOS, así que todos
// los archivos que ya hacían `import { SALA_W }` (loop.js, world.js,
// peer.js, floorgen.js con alias W/H...) ven el valor nuevo sin tocar
// ni una de sus fórmulas. setSalaDims() lo llama generarMapa()/
// cargarSala() al entrar en cada sala, y iniciarLobby() para volver a la
// medida base.
export const SALA_W_BASE = 1600;
export const SALA_H_BASE = 1000;
export let SALA_W = SALA_W_BASE;
export let SALA_H = SALA_H_BASE;
export function setSalaDims(w, h) {
  SALA_W = Math.max(320, Math.round(w || SALA_W_BASE));
  SALA_H = Math.max(240, Math.round(h || SALA_H_BASE));
}

export const COLORES_J = ["#e9b45c", "#7fd4c1", "#c084f0", "#e06070"];

// Duración de la fase de escombro de un pilar de hielo tras llegar a 0 de
// vida (ver systems/abilities.js: danoPilar, pl.rotoT) -- compartida con
// render/world.js, que la usa para calcular en qué fotograma de las 8
// fases de rotura va según cuánto lleva reproduciéndose, no según la
// fracción de vida perdida (pedido expreso: la animación debe correr AL
// romperse, no ir cambiando golpe a golpe mientras sigue con vida).
export const PILAR_ROTO_DUR = 0.55;

export const ROLES = {
        guerrero: {
          nombre: "Guerrero",
          ico: "⚔️",
          desc: "Espada en arco, parry y aguante.",
          hp: 150,
          res: 100,
          resNombre: "Aguante",
          atk: 16,
          armor: 8,
          crit: 6,
          vel: 150,
          skill: {
            nombre: "Torbellino",
            desc: "Giro 360° a tu alrededor",
            cd: 5,
            coste: 30,
          },
        },
        arquero: {
          nombre: "Arquero",
          ico: "🏹",
          desc: "Flechas rápidas a distancia.",
          hp: 90,
          res: 100,
          resNombre: "Energía",
          atk: 12,
          armor: 2,
          crit: 22,
          vel: 172,
          skill: {
            nombre: "Lluvia de Flechas",
            desc: "Zona de flechas donde apuntes: daño continuo y ralentización durante 4 s",
            cd: 6,
            coste: 40,
          },
        },
        mago: {
          nombre: "Mago",
          ico: "🪄",
          desc: "Proyectiles elementales: quema, congela o carga el orbe arcano.",
          hp: 75,
          res: 130,
          resNombre: "Maná",
          atk: 13,
          armor: 1,
          crit: 12,
          vel: 152,
          skill: {
            nombre: "Cataclismo",
            desc: "Ulti según elemento: zona ígnea, escarcha o portal arcano",
            cd: 6,
            coste: 45,
          },
        },
        clerigo: {
          nombre: "Clérigo",
          ico: "✨",
          desc: "Soporte: cura, acelera y escuda al grupo.",
          hp: 115,
          res: 120,
          resNombre: "Maná",
          atk: 8,
          armor: 5,
          crit: 8,
          vel: 156,
          skill: {
            nombre: "Consagración",
            desc: "Gran área sagrada: daña enemigos y cura aliados",
            cd: 6,
            coste: 40,
          },
        },
        picaro: {
          nombre: "Pícaro",
          ico: "🗡️",
          desc: "Dagas veloces, crítico brutal y movilidad extrema.",
          hp: 95,
          res: 100,
          resNombre: "Energía",
          atk: 13,
          armor: 3,
          crit: 28,
          vel: 178,
          skill: {
            nombre: "Danza de Cuchillas",
            desc: "Encadena golpes a los enemigos más cercanos (o atraviesa en línea recta si no hay ninguno alrededor)",
            cd: 5,
            coste: 30,
          },
        },
        druida: {
          nombre: "Druida",
          ico: "🌿",
          desc: "Lanza ramas y se transforma en águila, lobo u oso.",
          hp: 110,
          res: 110,
          resNombre: "Naturaleza",
          atk: 10,
          armor: 4,
          crit: 12,
          vel: 160,
          skill: {
            nombre: "Ira Salvaje",
            desc: "Zarzas en el suelo: daño continuo y ralentización",
            cd: 6,
            coste: 40,
          },
        },
      };

// Clérigo y druida en reserva (fuera del carrusel de selección) hasta
// que tengan su propio arte heroB -- ROLES/abilities.js/sprites.js las
// dejan intactas, solo dejan de ser elegibles desde aquí. Reactivar
// devolviéndolas a este array.
export const ORDEN_ROLES = [
        "guerrero",
        "arquero",
        "mago",
        "picaro",
      ];

export const FORMAS_DRUIDA = ["aguila", "lobo", "oso"];

export const FORMAS_INFO = {
        humano: { nombre: "Humano", ico: "🌿", color: "#6ac04a" },
        aguila: { nombre: "Águila", ico: "🦅", color: "#d8c090" },
        lobo: { nombre: "Lobo", ico: "🐺", color: "#8a93a3" },
        oso: { nombre: "Oso", ico: "🐻", color: "#8a5a30" },
      };

export const LOBBIES = {
        buenos: {
          nombre: "Buenos",
          icon: "✦",
          desc: "Todo el grupo: escudo del 12% de HP por planta y curas +20%.",
        },
        malos: {
          nombre: "Malos",
          icon: "⸸",
          desc: "Todo el grupo: robo de vida del 12% del daño infligido.",
        },
      };

export const ELEMENTOS = {
        fuego: {
          nombre: "Fuego",
          color: "#ff7d4d",
          dps: 26,
          slow: 0,
          healPS: 0,
          ttl: 2.2,
        },
        hielo: {
          nombre: "Hielo",
          color: "#7fc9e8",
          dps: 12,
          slow: 0.55,
          healPS: 0,
          ttl: 2.6,
        },
        arcano: {
          nombre: "Arcano",
          color: "#c07be0",
          dps: 22,
          slow: 0,
          healPS: 0,
          ttl: 1.9,
        },
        sagrado: {
          nombre: "Sagrado",
          color: "#ffe6a3",
          dps: 16,
          slow: 0,
          healPS: 12,
          ttl: 2.4,
        },
        zarzas: {
          nombre: "Zarzas",
          color: "#6ac04a",
          dps: 18,
          slow: 0.5,
          healPS: 0,
          ttl: 3,
        },
        // Lluvia de Flechas (ulti arquero, ver lanzarUlti() en
        // systems/abilities.js): mismo mecanismo de área que el resto
        // (crearArea/tick de daño+ralentización en core/loop.js), color
        // madera/latón para distinguirla del resto de zonas elementales.
        flechas: {
          nombre: "Flechas",
          color: "#c9a35a",
          dps: 14,
          slow: 0.4,
          healPS: 0,
          ttl: 4,
        },
      };

export const ELEM_MAGO = ["fuego", "hielo", "arcano"];

// Senda Elemental (mago, tecla C -- ver sendaElemental() en
// systems/abilities.js): buff largo, no un golpe puntual -- mientras dura,
// el mago deja tras de sí un rastro de parches del elemento activo
// (ELEMENTOS[p.elemento]), reutilizando el mismo sistema de áreas que ya
// usa la ulti (crearArea). Coste/cd altos a propósito para que NO esté
// activo todo el rato -- dur=7s con cd=50s (ambos arrancan a la vez al
// activarla) da un ~14% de uptime como mucho, jugando perfecto.
export const SENDA_ELEMENTAL = { nombre: "Senda Elemental", corto: "Senda", coste: 50, cd: 50, dur: 7 };

export const SUPS = [
        {
          nombre: "Área de sanación",
          corto: "Sanar",
          coste: 30,
          cd: 5,
          color: "#7fd4c1",
        },
        {
          nombre: "Ímpetu (vel. de ataque)",
          corto: "Ímpetu",
          coste: 25,
          cd: 8,
          color: "#e9b45c",
        },
        {
          nombre: "Égida (escudo)",
          corto: "Égida",
          coste: 30,
          cd: 9,
          color: "#8fb8e8",
        },
      ];

export const SLOTS = ["arma", "escudo", "casco", "peto", "piernas", "collar", "anillo"];

// Nº de variantes de arte real por clase para el arma (pack "iron-weapons",
// ver public/assets/sprites/weapons/iron-weapons/ y WEAPON_ART_POOL en
// render/sprites.js) -- vive aquí, no en render/sprites.js, para que
// systems/loot.js (genItem) pueda asignar un índice estable sin depender de
// código de render. Empieza a cambiar la mecánica de icono por clase: las
// que no aparecen aquí (mago, clérigo, druida) siguen con el sprite único
// de siempre (wood-weapons, teñido por rareza) hasta que tengan su propio
// pack de variantes.
export const ARMA_ARTE_VARIANTES = { guerrero: 6, arquero: 16, picaro: 6 };

// Nº de diseños de casco disponibles por clase (arte real, ver
// CASCO_IDLE_ARQUERO_TIN/CASCO_IDLE_ARQUERO_TIN2 en render/sprites.js) --
// mismo criterio que ARMA_ARTE_VARIANTES de arriba, con una diferencia:
// los objetos de casco NO están restringidos por clase (a diferencia del
// arma, cualquier personaje puede equipar cualquier casco), así que
// genItem() no puede consultar esto por `clase` (los objetos de armadura
// no la llevan) -- en su lugar sortea siempre un índice entre 0 y
// CASCO_VARIANTES_MAX-1 (item.cascoVariante), y cada clase con más de un
// diseño (por ahora, solo arquero) decide qué hacer con ese número; el
// resto simplemente lo ignora.
export const CASCO_VARIANTES = { arquero: 2 };
export const CASCO_VARIANTES_MAX = Math.max(1, ...Object.values(CASCO_VARIANTES));

// Etiqueta visible en la ficha de personaje -- "arma"/"escudo"
// internamente siguen siendo las mismas claves de siempre (restricción
// por clase, pivote de dibujo del arma en render/character.js, etc.),
// solo se les cambia el nombre que ve el jugador. Antes "Brazo derecho"/
// "Brazo izquierdo" -- pedido expreso: simplificar, "Principal"/
// "Secundaria" deja claro que son los dos huecos de arma sin que el
// texto se salga de la casilla pequeña del libro.
export const SLOT_LABEL = {
  arma: "Principal",
  escudo: "Secundaria",
  casco: "Casco",
  peto: "Peto",
  piernas: "Piernas",
  collar: "Collar",
  anillo: "Anillo",
};

export const RAREZAS = [
        { n: "Común", cls: "r0", col: "#b9b2c6", m: 1 },
        { n: "Raro", cls: "r1", col: "#6fb3e8", m: 1.5 },
        { n: "Épico", cls: "r2", col: "#c084f0", m: 2.2 },
        { n: "Legendario", cls: "r3", col: "#e9b45c", m: 3.2 },
        { n: "Mítico", cls: "r4", col: "#ff5a36", m: 4.5 },
      ];

export const PRECIO_VENTA = [8, 20, 50, 120, 320];

// Elementos de las dagas del pícaro (Raro o mejor, ver genItem en
// systems/loot.js) -- efectos y sinergias entre las dos dagas en
// systems/dagas.js.
export const ELEMENTOS_DAGA = {
  fuego: { nombre: "Fuego", icono: "🔥", color: "#ff7d4d", desc: "quema al enemigo" },
  hielo: { nombre: "Hielo", icono: "❄", color: "#7fc9e8", desc: "ralentiza al enemigo" },
  rayo: { nombre: "Rayo", icono: "⚡", color: "#ffe36e", desc: "una chispa salta al enemigo más cercano" },
  veneno: { nombre: "Veneno", icono: "☠", color: "#8fd46a", desc: "envenena al enemigo" },
  agua: { nombre: "Agua", icono: "💧", color: "#5aa9e6", desc: "empuja y frena al enemigo" },
};
export const ELEMENTOS_DAGA_IDS = Object.keys(ELEMENTOS_DAGA);

export const NOMBRES_ARMA_CLASE = {
        guerrero: ["Espada", "Filo", "Hacha", "Mandoble"],
        arquero: ["Arco", "Ballesta", "Arco Largo"],
        mago: ["Cetro", "Vara", "Orbe"],
        clerigo: ["Báculo", "Cáliz", "Reliquia"],
        picaro: ["Daga", "Estilete", "Garra"],
        druida: ["Bastón", "Tótem", "Garrote"],
      };

export const NOMBRES_ITEM = {
        escudo: ["Escudo", "Broquel", "Rodela", "Pavés", "Égida"],
        casco: ["Yelmo", "Capucha", "Corona", "Máscara", "Capacete"],
        peto: ["Coraza", "Manto", "Cota", "Piel", "Sudario"],
        piernas: ["Grebas", "Botas", "Calzas", "Zancos", "Espinilleras"],
        collar: ["Collar", "Gargantilla", "Medallón", "Cadena", "Amuleto"],
        anillo: ["Anillo", "Talismán", "Sello", "Vial", "Reliquia"],
      };

// Un array de sufijos por franja de rareza (mismo orden que RAREZAS):
// así el nombre del objeto también escala en "grandiosidad" con su poder.
export const SUFIJOS = [
        ["del Anochecer", "de la Planta Rota", "del Peregrino"], // Común
        ["de Ceniza", "del Lucero", "del Camino Perdido"], // Raro
        ["del Juramento", "de Sangre Fría", "del Abismo"], // Épico
        ["del Ocaso Eterno", "de la Corona Caída", "del Último Aliento"], // Legendario
        ["de Véspero", "del Alba Robada", "del Fin de los Días"], // Mítico
      ];

export const ETQ = {
        atk: "Daño",
        hp: "Vida",
        armor: "Armadura",
        crit: "Crítico %",
        vel: "Velocidad",
        cdr: "Red. CD %",
      };

const CLIMAS = ["despejado", "lluvia", "niebla", "tormenta", "ceniza"];

export const NOMBRE_CLIMA = {
        despejado: "",
        lluvia: "🌧 Lluvia",
        niebla: "🌫 Niebla",
        tormenta: "⛈ Tormenta",
        ceniza: "🌋 Ceniza",
      };

// Antes 100 -- las plantas alargaban demasiado la partida (petición del
// usuario de acortar la torre). Con jefe cada 5 (esJefe() en
// systems/bosses.js), 20 deja 4 jefes en total. Fácil de reajustar: es la
// única constante que hay que tocar.
export const MAX_PLANTA = 20;

export const MAX_NIV_PJ = 50;

export const XP_POR_PLANTA = 100;

export const XP_TABLA = Array.from({ length: MAX_NIV_PJ + 1 }, (_, i) =>
        Math.round(400 + i * 180 + i * i * 8),
      );
