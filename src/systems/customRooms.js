// --- Registro de salas diseñadas a mano en tools/level-editor/ ---
// Cada archivo en ./customRooms/*.json es el JSON que exporta el editor (botón
// "Exportar JSON (motor)"): { id, nombre, muros, objetos, enemigos, pilares }.
// Se cargan automáticamente con import.meta.glob de Vite -- añadir una sala nueva
// diseñada a mano es soltar el archivo en esa carpeta, sin tocar floorgen.js.
// Ver generarMapa() (usa CUSTOM_ROOMS[forma].muros) y poblarSala() (contenido fijo,
// solo si el JSON trae objetos/enemigos/pilares no vacíos) en floorgen.js.
const modulos = import.meta.glob("./customRooms/*.json", { eager: true });

export const CUSTOM_ROOMS = {};
for (const mod of Object.values(modulos)) {
  const datos = mod.default || mod;
  if (datos && datos.id) CUSTOM_ROOMS[datos.id] = datos;
}
