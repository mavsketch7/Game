// --- Registro de FASES (plantas) montadas a mano ---
// Mientras customRooms.js registra salas sueltas, aquí va el plano de una
// planta entera: qué salas la forman, en qué celda de la cuadrícula cae cada
// una y cuáles quedan conectadas por una puerta. Lo exporta el botón
// "Exportar fase (JSON)" del Telar de Mazmorras (artefacto de Claude), desde
// su panel "Mapa de la fase".
//
// Formato de cada archivo ./customFloors/*.json:
//   {
//     id: "fase_1",
//     planta: 1,                        // en qué planta se usa
//     salas: [ { sala: "<id de customRooms>", gx, gy, esInicial?, esFinal? } ],
//     puertas: [ { a: "<id sala>", dir: "N"|"S"|"E"|"O", b: "<id sala>" } ]
//   }
//
// Ver generarGrafoPlantaFija() en floorgen.js, que lo convierte en el mismo
// grafo de salas que produce el paseo aleatorio de siempre.
const modulos = import.meta.glob("./customFloors/*.json", { eager: true });

export const CUSTOM_FLOORS = {};
for (const mod of Object.values(modulos)) {
  const datos = mod.default || mod;
  if (datos && datos.id && Array.isArray(datos.salas)) CUSTOM_FLOORS[datos.id] = datos;
}

// La fase montada a mano para una planta concreta, si la hay.
export function faseDePlanta(planta) {
  for (const f of Object.values(CUSTOM_FLOORS)) if (f.planta === planta) return f;
  return null;
}
