// --- Registro (foto fija) de los sprites en uso hoy en el juego real ---
// Copia a mano de lo que carga src/render/sprites.js en el momento de escribir
// esto -- NO se actualiza sola si el código del juego cambia. Sirve como punto
// de partida navegable en la lista de personajes ("En uso hoy"), de solo
// lectura: si quieres editarlo, usa "➕ Nuevo personaje" y trabaja sobre una
// copia. Las rutas son relativas a la raíz del proyecto servida por Vite
// (mismo origen que usa el juego, ver assetUrl() en sprites.js).
const RUTA = (p) => "/assets/sprites/" + p;

const ARMA_SRC = {
  guerrero: RUTA("weapons/wood-weapons/sword-wood.png"),
  picaro: RUTA("weapons/wood-weapons/dagger-wood.png"),
  mago: RUTA("weapons/wood-weapons/magic-wood.png"),
  clerigo: RUTA("weapons/wood-weapons/hammer-wood.png"),
  druida: RUTA("weapons/wood-weapons/staff-wood.png"),
  arquero: RUTA("weapons/wood-weapons/bow-tension.png"), // hoja de 3 frames; se usa el 1º
};

// Solo 3 de las 6 clases tienen hoja de ataque propia en el pack real (ver
// REAL_ATTACK_SRC en sprites.js) -- arquero/clérigo/druida se quedan sin
// "attack" en el registro (Body_A no trae "disparar arco"/"lanzar hechizo"),
// el compositor cae al idle como referencia si se previsualiza ese estado.
const ATAQUE_SRC = {
  guerrero: RUTA("characters/bodyA_slice_side.png"),
  picaro: RUTA("characters/bodyA_pierce_side.png"),
  mago: RUTA("characters/bodyA_crush_side.png"),
};

export const REGISTRO_ASSETS = [
  // --- Héroe: mismo cuerpo base (Body_A) para las 6 clases, difieren en el
  // arma que llevan en la mano (ver WEAPON_SRC en sprites.js). ---
  ...["guerrero", "arquero", "mago", "clerigo", "picaro", "druida"].map((rol) => ({
    id: "heroe_" + rol,
    nombre: rol[0].toUpperCase() + rol.slice(1),
    tipo: "heroe",
    armaSrc: ARMA_SRC[rol] || null,
    cuerpoEstados: {
      idle: RUTA("characters/bodyA_idle_side.png"),
      run: RUTA("characters/bodyA_run_side.png"),
      attack: ATAQUE_SRC[rol] || null,
    },
  })),
  // --- Mobs: Orc Crew / Skeleton Crew (ver MOB_RUN en sprites.js). Solo
  // "run" está cableado en el juego real hoy, pero los "*_idle.png" ya
  // existen en public/assets/sprites/mobs/ sin usar -- se precargan aquí
  // igualmente, es pura ganancia (ver plan de la sesión). No hay hoja de
  // ataque de mob en el pack, así que "attack" queda null en los 6. ---
  { id: "mob_esqueleto", nombre: "Esqueleto (melee)", tipo: "mob", armaSrc: null, cuerpoEstados: { idle: RUTA("mobs/skeletonBase_idle.png"), run: RUTA("mobs/skeletonBase_run.png"), attack: null } },
  { id: "mob_ojo", nombre: "Vigía (ranged)", tipo: "mob", armaSrc: null, cuerpoEstados: { idle: RUTA("mobs/orcShaman_idle.png"), run: RUTA("mobs/orcShaman_run.png"), attack: null } },
  { id: "mob_hechicero", nombre: "Hechicero (caster)", tipo: "mob", armaSrc: null, cuerpoEstados: { idle: RUTA("mobs/skeletonMage_idle.png"), run: RUTA("mobs/skeletonMage_run.png"), attack: null } },
  { id: "mob_acechador", nombre: "Acechador (runner)", tipo: "mob", armaSrc: null, cuerpoEstados: { idle: RUTA("mobs/orcRogue_idle.png"), run: RUTA("mobs/orcRogue_run.png"), attack: null } },
  { id: "mob_golem", nombre: "Gólem (tank)", tipo: "mob", armaSrc: null, cuerpoEstados: { idle: RUTA("mobs/orcWarrior_idle.png"), run: RUTA("mobs/orcWarrior_run.png"), attack: null } },
  { id: "mob_bruto", nombre: "Bruto (elite)", tipo: "mob", armaSrc: null, cuerpoEstados: { idle: RUTA("mobs/orc_idle.png"), run: RUTA("mobs/orc_run.png"), attack: null } },
];
