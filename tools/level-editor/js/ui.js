// --- Paleta de Tiles y Lista de Salas ---
import { TIPOS, POR_ID, ROWS, COLS } from "./config.js";
import { estado, guardarEstado } from "./state.js";
import { abrirPicker } from "./picker.js";
import { puertasFaltantes } from "./validacion.js";

let onCambio = () => {}; // callback para redibujar tras cambios de estado

export function setOnCambio(fn) { onCambio = fn; }

function getSwatchStyle(t) {
  // t.img.src sirve tal cual como URL para el CSS (funciona igual para rutas del
  // proyecto que para imágenes propias cargadas como data URL, ver picker.js).
  if (t.img && t.img.complete && t.img.naturalWidth > 0 && t.img.src) {
    // Nota: la vista previa muestra la esquina superior del recorte; el pintado real
    // en el lienzo sí respeta el ancho/alto exacto (sw/sh) seleccionado en el picker.
    return `background-image: url('${t.img.src}'); background-position: -${t.sx}px -${t.sy}px; background-color: transparent;`;
  }
  return `background-color: ${t.color};`;
}

function crearItemPaleta(t) {
  const div = document.createElement("div");
  div.className = "paleta-item" + (t.id === estado.tipoActivo ? " activa" : "");

  const txt = `<span class="swatch" style="${getSwatchStyle(t)}"></span>
               <span style="flex:1">${t.label}</span>
               <span class="tecla">${t.tecla}</span>`;

  div.innerHTML = txt;
  div.onclick = () => { estado.tipoActivo = t.id; construirPaleta(); onCambio(); };

  // Botón engranaje
  const btnEdit = document.createElement("button");
  btnEdit.className = "btn-gear";
  btnEdit.innerHTML = "⚙️";
  btnEdit.title = "Cambiar gráfico";
  btnEdit.onclick = (e) => {
    e.stopPropagation();
    abrirPicker(t);
  };

  div.appendChild(btnEdit);
  return div;
}

export function construirPaleta() {
  const cont = document.getElementById("paleta");
  cont.innerHTML = "";

  const grupos = [
    { categoria: "suelo", titulo: "Suelo (capa base)" },
    { categoria: "estructura", titulo: "Estructura (muros y puertas)" },
    { categoria: "referencia", titulo: "Referencia visual (sin exportar aún)" },
    { categoria: "enemigo", titulo: "Enemigos" },
    { categoria: "objeto", titulo: "Objetos" },
    { categoria: "pilar", titulo: "Pilares" },
    { categoria: "personalizado", titulo: "Pinceles personalizados" },
  ];

  grupos.forEach(grupo => {
    const tipos = TIPOS.filter(t => (t.categoria || "personalizado") === grupo.categoria);
    if (!tipos.length) return;
    const rotulo = document.createElement("div");
    rotulo.textContent = grupo.titulo;
    rotulo.style.cssText = "font-size:0.7rem; color:var(--ceniza); text-transform:uppercase; letter-spacing:0.05em; margin:8px 0 4px;";
    cont.appendChild(rotulo);
    tipos.forEach(t => cont.appendChild(crearItemPaleta(t)));
  });
}

function dibujarMiniatura(canvas, sala) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const pw = w / COLS, ph = h / ROWS;
  ctx.fillStyle = "#12101c";
  ctx.fillRect(0, 0, w, h);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const celda = sala.grid[r][c];
      const base = POR_ID[celda.base];
      if (base) { ctx.fillStyle = base.color; ctx.fillRect(c * pw, r * ph, pw + 1, ph + 1); }
      if (celda.elem && POR_ID[celda.elem]) {
        ctx.fillStyle = POR_ID[celda.elem].color;
        ctx.fillRect(c * pw + pw * 0.2, r * ph + ph * 0.2, pw * 0.6, ph * 0.6);
      }
    }
  }
}

export function construirListaSalas() {
  const cont = document.getElementById("listaSalas");
  cont.innerHTML = "";
  estado.salas.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "sala-item" + (i === estado.salaActual ? " activa" : "");

    const mini = document.createElement("canvas");
    mini.width = 48; mini.height = 30;
    mini.style.cssText = "border-radius:3px; border:1px solid var(--borde); flex-shrink:0; image-rendering:pixelated;";
    dibujarMiniatura(mini, s);

    const faltan = puertasFaltantes(s);
    const aviso = faltan.length ? `<span title="Faltan puertas: ${faltan.map(a => a.dir).join(', ')}" style="color:#ff7675;">⚠</span>` : "";

    div.appendChild(mini);
    div.insertAdjacentHTML("beforeend", '<span class="nombre">' + s.nombre + "</span>" + aviso);
    div.onclick = () => {
      estado.salaActual = i;
      document.getElementById("notaSala").value = estado.salas[estado.salaActual].nota;
      construirListaSalas();
      onCambio();
    };
    cont.appendChild(div);
  });
  document.getElementById("notaSala").value = estado.salas[estado.salaActual].nota;
  // Guardar estado inicial si no lo tiene
  if (estado.salas[estado.salaActual].historial.length === 0) guardarEstado();
}
