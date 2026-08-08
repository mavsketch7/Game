// --- Exportar / Importar texto y gestión de Salas y Pinceles ---
import { COLS, ROWS, CELL, TIPOS, ASSETS, POR_ID, POR_CH, actualizarDiccionarios, CATEGORIAS_PINCEL } from "./config.js";
import { estado, crearGridVacia, crearSalaVacia, guardarEstado, clonarGrid, capaDe } from "./state.js";
import { construirPaleta, construirListaSalas } from "./ui.js";
import { abrirPicker } from "./picker.js";
import { mostrarDialogo } from "./dialog.js";
import { puertasFaltantes } from "./validacion.js";
import { exportarSalasJSON } from "./exportar-json.js";
import { borrarLocal } from "./autosave.js";

const MARCA_SUELO = "# Capa Suelo:";
const MARCA_ELEM = "# Capa Elementos:";

function exportarSala(s) {
  const lineas = [];
  lineas.push("=== SALA: " + s.nombre + " ===");
  if (s.nota) lineas.push("# Nota: " + s.nota);
  lineas.push("# Leyenda: " + TIPOS.map((t) => t.ch + "=" + t.label).join(" | "));
  lineas.push("# " + COLS + "x" + ROWS + " celdas de " + CELL + "px");

  const faltan = puertasFaltantes(s);
  if (faltan.length) {
    lineas.push("# ⚠ Puertas obligatorias faltantes: " + faltan.map(a => a.dir).join(", "));
  }

  lineas.push(MARCA_SUELO);
  for (let r = 0; r < ROWS; r++) lineas.push(s.grid[r].map((celda) => POR_ID[celda.base].ch).join(""));

  lineas.push(MARCA_ELEM);
  for (let r = 0; r < ROWS; r++) {
    lineas.push(s.grid[r].map((celda) => celda.elem ? POR_ID[celda.elem].ch : ".").join(""));
  }

  return lineas.join("\n");
}

function registrarTipoImportado(ch, label) {
  if (ch && label && !POR_CH[ch]) {
    TIPOS.push({
      id: "import_" + ch, ch: ch, color: "#9c88ff", label: label, tecla: "",
      img: null, sx: 0, sy: 0, sw: 32, sh: 32, capa: "elemento",
      capaExport: "ninguno", categoria: "personalizado"
    });
    actualizarDiccionarios();
  }
}

// Parsea el cuerpo de una sala. Soporta el formato de 2 capas (Suelo/Elementos) y,
// como fallback, el formato antiguo de una sola capa (compatibilidad con salas ya exportadas).
function parsearCuerpoSala(cuerpo) {
  const lineas = cuerpo.split("\n");
  let nota = "";
  let modo = "legado"; // "legado" | "suelo" | "elem"
  const filasSuelo = [], filasElem = [], filasLegado = [];

  for (const linea of lineas) {
    const l = linea.trim();
    if (!l) continue;
    if (l.startsWith("# Nota:")) { nota = l.slice(7).trim(); continue; }
    if (l.startsWith("# Leyenda:")) {
      l.slice(10).trim().split(" | ").forEach(p => {
        const [ch, label] = p.split("=");
        registrarTipoImportado(ch, label);
      });
      construirPaleta();
      continue;
    }
    if (l === MARCA_SUELO) { modo = "suelo"; continue; }
    if (l === MARCA_ELEM) { modo = "elem"; continue; }
    if (l.startsWith("#")) continue;

    if (modo === "suelo") filasSuelo.push(l);
    else if (modo === "elem") filasElem.push(l);
    else filasLegado.push(l);
  }

  return { nota, filasSuelo, filasElem, filasLegado };
}

function construirGridDesdeFilas(filasSuelo, filasElem, filasLegado) {
  const g = crearGridVacia();

  if (filasSuelo.length === ROWS && filasElem.length === ROWS) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const chBase = filasSuelo[r][c];
        const chElem = filasElem[r][c];
        g[r][c].base = POR_CH[chBase] ? POR_CH[chBase].id : "vacio";
        g[r][c].elem = (chElem && chElem !== "." && POR_CH[chElem]) ? POR_CH[chElem].id : null;
      }
    }
    return g;
  }

  // Formato antiguo (una sola capa): reparte cada carácter en base o elemento según su capa.
  if (filasLegado.length === ROWS) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = filasLegado[r][c];
        const t = POR_CH[ch];
        if (!t) { g[r][c].base = "vacio"; continue; }
        if (capaDe(t.id) === "suelo") g[r][c].base = t.id;
        else { g[r][c].base = "suelo"; g[r][c].elem = t.id; }
      }
    }
    return g;
  }

  return null; // dimensiones inválidas
}

export function inicializarIO(redibujar) {
  document.getElementById("btn-exportar").onclick = () => {
    const texto = estado.salas.map(exportarSala).join("\n\n");
    const area = document.getElementById("texto");
    area.value = texto; area.focus(); area.select();

    const salasConAvisos = estado.salas.filter(s => puertasFaltantes(s).length > 0);
    const aviso = salasConAvisos.length
      ? ` ⚠ ${salasConAvisos.length} sala(s) sin todas las puertas obligatorias.`
      : "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(() => {
        document.getElementById("copiaEstado").textContent =
          "✓ Copiado al portapapeles (" + estado.salas.length + " salas)." + aviso;
      });
    } else {
      document.getElementById("copiaEstado").textContent = "Usa Ctrl+C para copiar." + aviso;
    }
  };

  document.getElementById("btn-importar").onclick = () => {
    const texto = document.getElementById("texto").value;
    const bloques = texto.split(/^===\s*SALA:\s*(.+?)\s*===\s*$/m);
    if (bloques.length < 3) {
      document.getElementById("copiaEstado").textContent = "⚠ No se encontró cabecera '=== SALA: nombre ==='.";
      return;
    }

    const nuevasSalas = [];
    for (let i = 1; i < bloques.length; i += 2) {
      const nombre = bloques[i].trim();
      const cuerpo = bloques[i + 1] || "";
      const { nota, filasSuelo, filasElem, filasLegado } = parsearCuerpoSala(cuerpo);

      const g = construirGridDesdeFilas(filasSuelo, filasElem, filasLegado);
      if (!g) {
        document.getElementById("copiaEstado").textContent = `⚠ Error de dimensiones en sala "${nombre}".`;
        return;
      }
      nuevasSalas.push({ nombre, nota, grid: g, historial: [clonarGrid(g)], indiceHistoria: 0 });
    }

    estado.salas = nuevasSalas;
    estado.salaActual = 0;
    construirListaSalas();
    redibujar();

    const faltantes = nuevasSalas.filter(s => puertasFaltantes(s).length > 0);
    document.getElementById("copiaEstado").textContent = faltantes.length
      ? `✓ Importación exitosa. ⚠ ${faltantes.length} sala(s) sin todas las puertas obligatorias.`
      : "✓ Importación exitosa.";
  };

  document.getElementById("btn-exportar-json").onclick = () => {
    const resultados = exportarSalasJSON(estado.salas);
    const texto = JSON.stringify(resultados.map(r => r.json), null, 2);
    const area = document.getElementById("texto");
    area.value = texto; area.focus(); area.select();

    const salasConAvisos = resultados
      .map((r, i) => ({ nombre: estado.salas[i].nombre, avisos: r.avisos }))
      .filter(r => r.avisos.length);
    const aviso = salasConAvisos.length
      ? " ⚠ " + salasConAvisos.map(s => `"${s.nombre}" bloquea ${s.avisos.map(a => a.dir).join(",")}`).join("; ")
      : "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(() => {
        document.getElementById("copiaEstado").textContent =
          "✓ JSON copiado al portapapeles (" + estado.salas.length + " salas)." + aviso;
      });
    } else {
      document.getElementById("copiaEstado").textContent = "JSON generado abajo. Usa Ctrl+C para copiar." + aviso;
    }
  };

  // Creación dinámica de pinceles: nombre + categoría de comportamiento (ver
  // CATEGORIAS_PINCEL en config.js -- un pincel de suelo, muro o puerta no son
  // intercambiables, cada uno provoca un efecto distinto al exportar/jugar).
  document.getElementById("btn-nuevo-pincel").onclick = () => {
    mostrarDialogo({
      titulo: "Nuevo Pincel",
      mensaje: "Nombre y categoría de comportamiento (determina si bloquea el paso, si spawnea un enemigo real, etc. -- no solo el dibujo):",
      conInput: true,
      opciones: CATEGORIAS_PINCEL,
      btnOk: "Crear"
    }, (resultado) => {
      if (!resultado || !resultado.texto) return;
      const { texto: nombre, opcion } = resultado;

      const cat = CATEGORIAS_PINCEL.find(c => c.value === opcion) || CATEGORIAS_PINCEL[0];

      const id = "custom_" + Date.now();
      const usedChs = TIPOS.map(t => t.ch);
      const allChs = "abcdefghijklnpqrstuvwxyzABCDEFGHIJKLMNOQRTUVWXYZ!$%&/()=?¿+*-<>[]{}";
      const newCh = allChs.split('').find(c => !usedChs.includes(c)) || "?";

      const usedKeys = TIPOS.map(t => t.tecla);
      const allKeys = "abcdefghijklmnopqrstuvwxyz";
      const newKey = allKeys.split('').find(k => !usedKeys.includes(k)) || "";

      const nuevoTipo = {
        id: id, ch: newCh, color: "#8854d0", label: nombre, tecla: newKey,
        img: ASSETS.wall, sx: 0, sy: 0, sw: 32, sh: 32,
        capa: cat.capa, capaExport: cat.capaExport, categoria: cat.categoria,
        ...(cat.motorTipo ? { motorTipo: cat.motorTipo } : {}),
      };

      TIPOS.push(nuevoTipo);
      actualizarDiccionarios();
      construirPaleta();
      abrirPicker(nuevoTipo);
    });
  };

  document.getElementById("btn-nueva-sala").onclick = () => {
    const defaultName = "Sala " + (estado.salas.length + 1);
    mostrarDialogo({
      titulo: "Crear Nueva Sala",
      mensaje: "Escribe el nombre de la sala:",
      conInput: true,
      valorInput: defaultName
    }, (nombre) => {
      if (!nombre) return;
      estado.salas.push(crearSalaVacia(nombre));
      estado.salaActual = estado.salas.length - 1;
      construirListaSalas();
      redibujar();
    });
  };

  document.getElementById("btn-renombrar-sala").onclick = () => {
    mostrarDialogo({
      titulo: "Renombrar Sala",
      conInput: true,
      valorInput: estado.salas[estado.salaActual].nombre
    }, (nombre) => {
      if (nombre) {
        estado.salas[estado.salaActual].nombre = nombre;
        construirListaSalas();
        redibujar();
      }
    });
  };

  document.getElementById("btn-borrar-sala").onclick = () => {
    if (estado.salas.length <= 1) {
      mostrarDialogo({ titulo: "Aviso", mensaje: "Tiene que quedar al menos una sala." });
      return;
    }
    mostrarDialogo({
      titulo: "Eliminar Sala",
      mensaje: `¿Seguro que deseas borrar "${estado.salas[estado.salaActual].nombre}"?`,
      esPeligro: true,
      btnOk: "Eliminar"
    }, (confirmado) => {
      if (confirmado) {
        estado.salas.splice(estado.salaActual, 1);
        estado.salaActual = Math.max(0, estado.salaActual - 1);
        construirListaSalas();
        redibujar();
      }
    });
  };

  document.getElementById("btn-limpiar").onclick = () => {
    mostrarDialogo({
      titulo: "Limpiar Lienzo",
      mensaje: "Esto vaciará toda la sala. ¿Continuar?",
      esPeligro: true,
      btnOk: "Limpiar"
    }, (confirmado) => {
      if (confirmado) {
        estado.salas[estado.salaActual].grid = crearGridVacia();
        guardarEstado();
        redibujar();
      }
    });
  };

  document.getElementById("btn-borrar-autoguardado").onclick = () => {
    mostrarDialogo({
      titulo: "Borrar Autoguardado",
      mensaje: "Esto borra el respaldo automático guardado en este navegador. La sesión actual (lo que ves ahora) no se ve afectada. ¿Continuar?",
      esPeligro: true,
      btnOk: "Borrar"
    }, (confirmado) => {
      if (confirmado) {
        borrarLocal();
        document.getElementById("copiaEstado").textContent = "🧹 Autoguardado borrado.";
      }
    });
  };
}
