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

export const REGISTRO_ASSETS = [
  // --- Héroe: mismo cuerpo base (Body_A) para las 6 clases, difieren en el
  // arma que llevan en la mano (ver WEAPON_SRC en sprites.js). ---
  ...["guerrero", "arquero", "mago", "clerigo", "picaro", "druida"].map((rol) => ({
    id: "heroe_" + rol,
    nombre: rol[0].toUpperCase() + rol.slice(1),
    tipo: "heroe",
    cuerpoSrc: RUTA("characters/bodyA_idle_side.png"),
    armaSrc: ARMA_SRC[rol] || null,
  })),
  // --- Mobs: Orc Crew / Skeleton Crew (ver MOB_RUN en sprites.js). ---
  { id: "mob_esqueleto", nombre: "Esqueleto (melee)", tipo: "mob", cuerpoSrc: RUTA("mobs/skeletonBase_run.png"), armaSrc: null },
  { id: "mob_ojo", nombre: "Vigía (ranged)", tipo: "mob", cuerpoSrc: RUTA("mobs/orcShaman_run.png"), armaSrc: null },
  { id: "mob_hechicero", nombre: "Hechicero (caster)", tipo: "mob", cuerpoSrc: RUTA("mobs/skeletonMage_run.png"), armaSrc: null },
  { id: "mob_acechador", nombre: "Acechador (runner)", tipo: "mob", cuerpoSrc: RUTA("mobs/orcRogue_run.png"), armaSrc: null },
  { id: "mob_golem", nombre: "Gólem (tank)", tipo: "mob", cuerpoSrc: RUTA("mobs/orcWarrior_run.png"), armaSrc: null },
  { id: "mob_bruto", nombre: "Bruto (elite)", tipo: "mob", cuerpoSrc: RUTA("mobs/orc_run.png"), armaSrc: null },
];
