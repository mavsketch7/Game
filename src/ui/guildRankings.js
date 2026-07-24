import { rankingGremios } from "../systems/guilds.js";
import { mostrar, ocultar } from "./overlays.js";

function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

// Ranking global de gremios (punto 6): totales acumulados entre TODAS las
// partidas de TODOS los jugadores, a diferencia del ranking de la sesión
// actual (Tab, ver ui/inventory.js). Depende de la persistencia de
// Supabase — ver docs/supabase-schema-rankings-gremios.sql.
export async function abrirRankingGremios() {
  const inner = document.getElementById("ranking-gremios-inner");
  inner.innerHTML =
    '<div class="fila-cerrar"><h2 class="display">🏆 Rankings de gremios</h2>' +
    '<button class="btn dorado" onclick="cerrarRankingGremios()">Cerrar</button></div>' +
    '<p style="color:var(--ceniza);font-size:.8rem">Cargando…</p>';
  mostrar("ranking-gremios");
  let filas = "";
  try {
    const top = await rankingGremios(20);
    filas = top.length
      ? top
          .map(
            (g, i) =>
              '<div class="rank-fila"><span class="rank-pos">#' +
              (i + 1) +
              "</span><span class=\"rank-nombre\">" +
              escHtml(g.name) +
              "</span>" +
              '<span class="rank-stat" title="Daño total">⚔ ' +
              g.total_dano +
              '</span><span class="rank-stat" title="Enemigos derrotados">☠ ' +
              g.total_derrotados +
              '</span><span class="rank-stat" title="Parries exitosos">🛡‍⚔ ' +
              g.total_parries +
              "</span></div>",
          )
          .join("")
      : '<p style="color:var(--ceniza);font-size:.8rem">Todavía no hay gremios con partidas terminadas.</p>';
  } catch (e) {
    filas =
      '<p style="color:#d1545c;font-size:.8rem">No se pudo cargar el ranking (¿sin conexión?).</p>';
  }
  document.getElementById("ranking-gremios-inner").innerHTML =
    '<div class="fila-cerrar"><h2 class="display">🏆 Rankings de gremios</h2>' +
    '<button class="btn dorado" onclick="cerrarRankingGremios()">Cerrar</button></div>' +
    '<p style="color:var(--ceniza);font-size:.8rem;margin-bottom:8px">Suma de todas las partidas terminadas por cualquier miembro del gremio.</p>' +
    '<div class="ranking-sesion">' +
    filas +
    "</div>";
}

export function cerrarRankingGremios() {
  ocultar("ranking-gremios");
}

// Expuestas en window: referenciadas desde onclick="..." en el HTML estático
// (index.html) y en el HTML generado dinámicamente.
window.abrirRankingGremios = abrirRankingGremios;
window.cerrarRankingGremios = cerrarRankingGremios;
