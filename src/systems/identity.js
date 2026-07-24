// Identidad anónima persistente por dispositivo, usada para la membresía de
// gremios (el juego no tiene login: cada control local -teclado o un mando
// concreto- y cada invitado online conservan su propio id entre sesiones).
function claveId(ctrl) {
  if (ctrl.tipo === "pad") return "vespero_pid_pad" + ctrl.idx;
  if (ctrl.tipo === "net") return "vespero_pid_net";
  return "vespero_pid_kbm";
}

export function idJugador(ctrl) {
  const k = claveId(ctrl);
  let id = localStorage.getItem(k);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(k, id);
  }
  return id;
}
