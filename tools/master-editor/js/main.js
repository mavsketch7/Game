// --- Punto de entrada: pestañas Niveles/Sprites + arranque del panel de sprites ---
import { iniciarPanelSprites } from "./panel.js";

const tabs = document.querySelectorAll(".tab[data-tab]");
const paneles = {
  niveles: document.getElementById("panel-niveles"),
  sprites: document.getElementById("panel-sprites"),
};

tabs.forEach((btn) => {
  btn.onclick = () => {
    tabs.forEach((b) => b.classList.remove("activa"));
    btn.classList.add("activa");
    Object.values(paneles).forEach((p) => p.classList.remove("activa"));
    paneles[btn.dataset.tab].classList.add("activa");
  };
});

iniciarPanelSprites();
