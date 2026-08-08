// --- Sistema de Modales Custom (reemplaza prompt, alert, confirm) ---
const modalUI = document.getElementById("dialog-modal");
const modalTitle = document.getElementById("dialog-title");
const modalMsg = document.getElementById("dialog-message");
const modalInput = document.getElementById("dialog-input");
const modalSelect = document.getElementById("dialog-select");
const modalOpcionDesc = document.getElementById("dialog-opcion-desc");
const modalOk = document.getElementById("dialog-ok");
const modalCancel = document.getElementById("dialog-cancel");

// opciones: [{ value, label, desc? }] -- si se pasa, añade un <select> al diálogo.
// Con conInput + opciones a la vez, el callback recibe { texto, opcion } en vez de
// un valor suelto (ver "Nuevo Pincel" en io.js: nombre + categoría de comportamiento).
export function mostrarDialogo({ titulo, mensaje, conInput, valorInput, opciones, valorOpcion, btnOk, esPeligro }, callback) {
  modalTitle.textContent = titulo;
  modalMsg.textContent = mensaje || "";
  modalInput.style.display = conInput ? "block" : "none";
  modalInput.value = valorInput || "";
  modalOk.textContent = btnOk || "Aceptar";
  modalOk.className = esPeligro ? "rojo" : "dorado";

  modalSelect.style.display = opciones ? "block" : "none";
  modalSelect.innerHTML = "";
  if (opciones) {
    let grupoActual = null, contenedor = modalSelect;
    for (const o of opciones) {
      if (o.grupo && o.grupo !== grupoActual) {
        grupoActual = o.grupo;
        contenedor = document.createElement("optgroup");
        contenedor.label = o.grupo;
        modalSelect.appendChild(contenedor);
      } else if (!o.grupo) {
        contenedor = modalSelect;
      }
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      contenedor.appendChild(opt);
    }
    modalSelect.value = valorOpcion || opciones[0].value;
    const actualizarDesc = () => {
      const actual = opciones.find(o => o.value === modalSelect.value);
      modalOpcionDesc.textContent = (actual && actual.desc) || "";
      modalOpcionDesc.style.display = (actual && actual.desc) ? "block" : "none";
    };
    modalSelect.onchange = actualizarDesc;
    actualizarDesc();
  } else {
    modalOpcionDesc.style.display = "none";
    modalSelect.onchange = null;
  }

  modalUI.classList.remove("oculto");
  if (conInput) { modalInput.focus(); modalInput.select(); }

  const limpiar = () => {
    modalUI.classList.add("oculto");
    modalOk.onclick = null;
    modalCancel.onclick = null;
  };

  modalOk.onclick = () => {
    let val;
    if (opciones) {
      val = conInput ? { texto: modalInput.value.trim(), opcion: modalSelect.value } : modalSelect.value;
    } else {
      val = conInput ? modalInput.value.trim() : true;
    }
    limpiar();
    if (callback) callback(val);
  };
  modalCancel.onclick = () => {
    limpiar();
    if (callback) callback(null);
  };
}
