// Cursor personalizado (guantelete) para toda la interfaz. Se oculta sobre
// el lienzo del juego, que ya gestiona su propia mira de apuntado
// (canvas#lienzo tiene cursor:none propio — ver core/canvas.js/render).
const wrap = document.getElementById("cursor-wrap");
const img = document.getElementById("cursor-img");

if (wrap && img) {
  img.src = `${import.meta.env.BASE_URL}assets/ui/cursor.png`;

  window.addEventListener(
    "mousemove",
    (e) => {
      wrap.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    },
    { passive: true },
  );
  window.addEventListener("mousedown", () => wrap.classList.add("pulsando"));
  window.addEventListener("mouseup", () => wrap.classList.remove("pulsando"));
  window.addEventListener("mouseleave", () => wrap.classList.add("oculto"));
  window.addEventListener("mouseenter", () => wrap.classList.remove("oculto"));

  const lienzo = document.getElementById("lienzo");
  if (lienzo) {
    lienzo.addEventListener("mouseenter", () => wrap.classList.add("oculto"));
    lienzo.addEventListener("mouseleave", () => wrap.classList.remove("oculto"));
  }
}
