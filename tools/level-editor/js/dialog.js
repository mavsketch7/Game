// --- Sistema de Modales Custom (reemplaza prompt, alert, confirm) ---
const modalUI = document.getElementById("dialog-modal");
const modalTitle = document.getElementById("dialog-title");
const modalMsg = document.getElementById("dialog-message");
const modalInput = document.getElementById("dialog-input");
const modalOk = document.getElementById("dialog-ok");
const modalCancel = document.getElementById("dialog-cancel");

export function mostrarDialogo({ titulo, mensaje, conInput, valorInput, btnOk, esPeligro }, callback) {
  modalTitle.textContent = titulo;
  modalMsg.textContent = mensaje || "";
  modalInput.style.display = conInput ? "block" : "none";
  modalInput.value = valorInput || "";
  modalOk.textContent = btnOk || "Aceptar";
  modalOk.className = esPeligro ? "rojo" : "dorado";

  modalUI.classList.remove("oculto");
  if (conInput) { modalInput.focus(); modalInput.select(); }

  const limpiar = () => {
    modalUI.classList.add("oculto");
    modalOk.onclick = null;
    modalCancel.onclick = null;
  };

  modalOk.onclick = () => {
    const val = conInput ? modalInput.value.trim() : true;
    limpiar();
    if (callback) callback(val);
  };
  modalCancel.onclick = () => {
    limpiar();
    if (callback) callback(null);
  };
}
