// --- Interacción con el lienzo, herramientas de dibujo y atajos de teclado ---
import { COLS, ROWS, CELL, TIPOS } from "./config.js";
import { estado, salaActiva, guardarEstado, deshacer, rehacer, capaDe } from "./state.js";
import { construirPaleta } from "./ui.js";

function celdaDesdeEvento(cv, e) {
  const rect = cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (cv.width / rect.width);
  const y = (e.clientY - rect.top) * (cv.height / rect.height);
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return { r, c };
}

// Lee/escribe la capa correspondiente ("base" o "elem") según el tipo de pincel.
function valorCapa(celda, idTipo) {
  return capaDe(idTipo) === "suelo" ? celda.base : celda.elem;
}

function pintarCelda(g, r, c, idTipo, borrar) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  const celda = g[r][c];
  if (borrar) {
    // El borrador quita primero el elemento superior; si no hay, limpia el suelo.
    if (celda.elem) celda.elem = null;
    else celda.base = "vacio";
    return;
  }
  if (capaDe(idTipo) === "suelo") celda.base = idTipo;
  else celda.elem = idTipo;
}

function rellenarArea(rIni, cIni, idTipoPincel, borrar) {
  const g = salaActiva().grid;
  const objetivo = valorCapa(g[rIni][cIni], idTipoPincel);
  const reemplazo = borrar ? null : idTipoPincel;
  const esSuelo = capaDe(idTipoPincel) === "suelo";
  const objetivoNormalizado = esSuelo ? (objetivo || "vacio") : objetivo;
  const reemplazoNormalizado = esSuelo ? (reemplazo || "vacio") : reemplazo;
  if (objetivoNormalizado === reemplazoNormalizado) return;

  const pila = [{ r: rIni, c: cIni }];
  const visitado = new Set();
  while (pila.length > 0) {
    const { r, c } = pila.pop();
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const key = r + "," + c;
    if (visitado.has(key)) continue;
    const celda = g[r][c];
    const actual = esSuelo ? celda.base : (celda.elem || null);
    if (actual !== objetivoNormalizado) continue;
    visitado.add(key);

    if (esSuelo) celda.base = reemplazoNormalizado;
    else celda.elem = reemplazoNormalizado;

    pila.push({ r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 });
  }
}

function aplicarPintado(r, c, borrar) {
  const g = salaActiva().grid;

  const doPaint = (y, x) => pintarCelda(g, y, x, estado.tipoActivo, borrar);

  doPaint(r, c);

  // Simetría
  const symX = document.getElementById("sym-x").checked;
  const symY = document.getElementById("sym-y").checked;

  if (symX) doPaint(r, COLS - 1 - c);
  if (symY) doPaint(ROWS - 1 - r, c);
  if (symX && symY) doPaint(ROWS - 1 - r, COLS - 1 - c);
}

function pintarForma(rMin, rMax, cMin, cMax, borrar) {
  for (let y = Math.min(rMin, rMax); y <= Math.max(rMin, rMax); y++) {
    for (let x = Math.min(cMin, cMax); x <= Math.max(cMin, cMax); x++) {
      aplicarPintado(y, x, borrar);
    }
  }
}

function usarCuentagotas(r, c) {
  const celda = salaActiva().grid[r][c];
  estado.tipoActivo = celda.elem || celda.base;
  construirPaleta();
}

export function inicializarInteracciones(cv, redibujar) {
  document.querySelectorAll(".grid-tools button[data-tool]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".grid-tools button[data-tool]").forEach(b => b.classList.remove("activa-tool"));
      btn.classList.add("activa-tool");
      estado.toolActiva = btn.dataset.tool;
    };
  });

  // "Modo Borrar": en pantallas táctiles no hay clic derecho, así que este botón
  // suple ese gesto -- mientras esté activo, pintar/rellenar borra en vez de dibujar.
  const btnModoBorrar = document.getElementById("btn-modo-borrar");
  btnModoBorrar.onclick = () => {
    estado.modoBorrar = !estado.modoBorrar;
    btnModoBorrar.classList.toggle("activa-tool", estado.modoBorrar);
  };

  // Pointer Events unifican ratón/dedo/lápiz (a diferencia de mousedown/touchstart por
  // separado): mismo código sirve para pintar tanto con el ratón como con el dedo.
  cv.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.button !== 2) return; // Solo izq (o su equivalente táctil) y der
    const cel = celdaDesdeEvento(cv, e);
    if (!cel) return;
    cv.setPointerCapture(e.pointerId); // sigue recibiendo pointermove/up aunque el dedo salga del canvas

    const borrar = e.button === 2 || estado.modoBorrar;

    if (estado.toolActiva === "cuentagotas") {
      if (!borrar) usarCuentagotas(cel.r, cel.c);
      redibujar();
      return;
    }

    estado.pintando = true;
    estado.inicioRect = cel;

    if (estado.toolActiva === "pincel") {
      aplicarPintado(cel.r, cel.c, borrar);
    } else if (estado.toolActiva === "cubo") {
      rellenarArea(cel.r, cel.c, estado.tipoActivo, borrar);
      guardarEstado(); // Cubo termina inmediatamente
      estado.pintando = false;
    }
    redibujar();
  });

  cv.addEventListener("pointerup", (e) => {
    if (!estado.pintando) return;
    estado.pintando = false;

    const borrar = e.button === 2 || estado.modoBorrar;

    // Aplicar rectángulo al soltar
    if (estado.toolActiva === "rect" && estado.fantasma.r >= 0 && estado.inicioRect) {
      pintarForma(estado.inicioRect.r, estado.fantasma.r, estado.inicioRect.c, estado.fantasma.c, borrar);
    }

    if (estado.toolActiva !== "cubo") guardarEstado();
    estado.inicioRect = null;
    redibujar();
  });

  cv.addEventListener("pointermove", (e) => {
    const cel = celdaDesdeEvento(cv, e);
    if (cel) {
      document.getElementById("coord").textContent = `Fila ${cel.r}, Columna ${cel.c}`;
      estado.fantasma = cel;
    } else {
      estado.fantasma = { r: -1, c: -1 };
    }

    if (estado.pintando) {
      if (estado.toolActiva === "pincel") {
        aplicarPintado(estado.fantasma.r, estado.fantasma.c, e.buttons === 2 || estado.modoBorrar);
      }
    }
    redibujar();
  });

  cv.addEventListener("contextmenu", e => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;

    // Ctrl+Z
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); if (deshacer()) redibujar(); return; }
    // Ctrl+Y
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); if (rehacer()) redibujar(); return; }

    const t = TIPOS.find((x) => x.tecla === e.key);
    if (t) { estado.tipoActivo = t.id; construirPaleta(); redibujar(); }
  });

  document.getElementById("btn-undo").onclick = () => { if (deshacer()) redibujar(); };
  document.getElementById("btn-redo").onclick = () => { if (rehacer()) redibujar(); };

  document.getElementById("notaSala").addEventListener("input", (e) => {
    salaActiva().nota = e.target.value;
  });
}
