// --- Mini editor de píxel a píxel para crear pinceles a mano ---
// Vive dentro del modal del picker (ver picker.js) como alternativa a cargar/recortar
// una imagen: dibuja un tile cuadrado directamente, con un botón de autogenerado como
// punto de partida (patrón simétrico aleatorio) que luego se puede retocar a mano.
const ZOOM = 12; // px de pantalla por píxel de sprite

const panel = document.getElementById("pixelart-panel");
const canvas = document.getElementById("pixelart-canvas");
const ctx = canvas.getContext("2d");
const inputColor = document.getElementById("pixelart-color");
const inputSize = document.getElementById("pixelart-size");
const btnBorrador = document.getElementById("pixelart-borrador");
const btnAutogenerar = document.getElementById("btn-pixelart-autogenerar");
const btnLimpiar = document.getElementById("btn-pixelart-limpiar");
const btnCerrar = document.getElementById("btn-pixelart-cerrar");
const btnUsar = document.getElementById("btn-pixelart-usar");

let tam = parseInt(inputSize.value) || 32;
let pixeles = crearGridPixeles(tam);
let borrando = false;
let pintando = false;
let onUsar = () => {};

export function setOnUsar(fn) { onUsar = fn; }

function crearGridPixeles(n) {
  return Array.from({ length: n }, () => new Array(n).fill(null));
}

function redimensionarLienzo() {
  tam = Math.max(4, Math.min(64, parseInt(inputSize.value) || 32));
  inputSize.value = tam;
  canvas.width = tam * ZOOM;
  canvas.height = tam * ZOOM;
  pixeles = crearGridPixeles(tam);
  dibujar();
}

function dibujar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Tablero de ajedrez de fondo para distinguir "sin pintar" (transparente) de negro real.
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      if (pixeles[y][x]) {
        ctx.fillStyle = pixeles[y][x];
      } else {
        ctx.fillStyle = ((x + y) % 2 === 0) ? "#1d1929" : "#26213a";
      }
      ctx.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= tam; i++) {
    ctx.beginPath(); ctx.moveTo(i * ZOOM, 0); ctx.lineTo(i * ZOOM, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * ZOOM); ctx.lineTo(canvas.width, i * ZOOM); ctx.stroke();
  }
}

function celdaDesde(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / (rect.width / tam));
  const y = Math.floor((e.clientY - rect.top) / (rect.height / tam));
  if (x < 0 || x >= tam || y < 0 || y >= tam) return null;
  return { x, y };
}

function pintarEn(e) {
  const c = celdaDesde(e);
  if (!c) return;
  pixeles[c.y][c.x] = borrando ? null : inputColor.value;
  dibujar();
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pintando = true;
  pintarEn(e);
});
canvas.addEventListener("pointermove", (e) => { if (pintando) pintarEn(e); });
canvas.addEventListener("pointerup", () => { pintando = false; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

btnBorrador.onclick = () => {
  borrando = !borrando;
  btnBorrador.classList.toggle("activa-tool", borrando);
};

inputSize.onchange = redimensionarLienzo;
btnLimpiar.onclick = () => { pixeles = crearGridPixeles(tam); dibujar(); };
btnCerrar.onclick = () => cerrarPixelArt();

// Genera un patrón simétrico aleatorio (relleno parcial + espejo horizontal), como
// punto de partida rápido para un pincel nuevo que luego se retoca a mano.
btnAutogenerar.onclick = () => {
  const paleta = ["#e9b45c", "#c084f0", "#5fb0e0", "#ff6b81", "#8fd3ff", "#70a1ff", "#ffa502", "#2ed573"];
  const colorBase = paleta[Math.floor(Math.random() * paleta.length)];
  const colorSombra = "#12101c";
  pixeles = crearGridPixeles(tam);
  const mitad = Math.ceil(tam / 2);
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < mitad; x++) {
      if (Math.random() >= 0.42) continue;
      const col = Math.random() < 0.15 ? colorSombra : colorBase;
      pixeles[y][x] = col;
      pixeles[y][tam - 1 - x] = col; // simetría horizontal, look "sprite retro"
    }
  }
  inputColor.value = colorBase;
  dibujar();
};

btnUsar.onclick = () => {
  const out = document.createElement("canvas");
  out.width = tam;
  out.height = tam;
  const octx = out.getContext("2d");
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      if (pixeles[y][x]) { octx.fillStyle = pixeles[y][x]; octx.fillRect(x, y, 1, 1); }
    }
  }
  const img = new Image();
  img.onload = () => onUsar(img, tam);
  img.src = out.toDataURL("image/png");
};

export function abrirPixelArt() {
  panel.classList.remove("oculto");
  redimensionarLienzo();
}

export function cerrarPixelArt() {
  panel.classList.add("oculto");
}
