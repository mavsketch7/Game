// Auto-generated during the modularization refactor (2026-07-23).
import { G } from "../core/state.js";
import { atacar, esquivar, habilidad } from "../systems/abilities.js";
import { mostrar, ocultar } from "./overlays.js";

const INFO_CLASE = {
        guerrero: {
          nombre: "Guerrero",
          color: "#e9b45c",
          habilidades: [
            {
              ico: "🗡️",
              nombre: "Ataque (clic izq.)",
              tec: "Clic · RT",
              desc: "Tajo en arco amplio delante del cursor. Golpea a todos los enemigos en el rango. Aplica knockback moderado.",
            },
            {
              ico: "💢",
              nombre: "Golpe Colosal (pasiva)",
              tec: "Automático",
              desc: "Cada tajo que conecta acumula un pip de furia (máx. 4, se desvanece a los 3 s sin golpear). Con 4 pips, tu siguiente ataque es un GOLPE COLOSAL: arco de 360° casi completo, ×2 de daño y onda expansiva.",
            },
            {
              ico: "✨",
              nombre: "Sinergia elemental",
              tec: "Cerca de un lanzador",
              desc: "Si un Mago, Clérigo o Druida está a menos de 130 px, tu espada se imbuye (chispa orbital de color): fuego = quemadura, hielo = ralentizar, arcano = +15% daño, sagrado = robo de vida, naturaleza = veneno.",
            },
            {
              ico: "🛡️",
              nombre: "Parry (clic der.)",
              tec: "Clic der. · LT",
              desc: "Ventana de 0.18 s. Si recibes un golpe durante ella, lo anulas, aturdes al atacante y contraatacas con ×1.5 daño (también refleja proyectiles cercanos). Encadena otro parry en menos de 2.6 s para subir de escalón: el daño y el aturdimiento suben en cada eslabón, y al 4º consecutivo desatas una Cadena Perfecta — una onda que aturde y golpea a todos los enemigos cercanos y te da un impulso de ímpetu.",
            },
            {
              ico: "💨",
              nombre: "Esquivar",
              tec: "Espacio · A",
              desc: "Dash rápido en la dirección de movimiento. Concede 0.24 s de invulnerabilidad. Cuesta 18 Aguante.",
            },
            {
              ico: "🌀",
              nombre: "Torbellino (ulti)",
              tec: "E · Y",
              desc: "Giro de 360° que golpea todo lo que esté en radio de 84 px con ×1.7 daño y gran knockback. Perfecta para sacar a los enemigos de posición.",
            },
            {
              ico: "🃏",
              nombre: "Mejoras especiales",
              tec: "Tarjetas de nivel",
              desc: "Acero Templado: cada parry cura el 8% de vida máxima. Torbellino Eterno: reduce el CD del Torbellino al 50%.",
            },
          ],
        },
        arquero: {
          nombre: "Arquero",
          color: "#3f7d4f",
          habilidades: [
            {
              ico: "🏹",
              nombre: "Flecha (clic izq.)",
              tec: "Clic · RT",
              desc: "Dispara una flecha física hacia el cursor a 480 px/s. Alta cadencia de fuego. Con la tarjeta Flecha Perforante, atraviesa un enemigo adicional.",
            },
            {
              ico: "🎯",
              nombre: "Flecha Certera (pasiva)",
              tec: "Automático",
              desc: "Acierta 3 flechas seguidas al MISMO enemigo y cargarás una Flecha Certera: tu siguiente disparo es dorado, hace ×2 de daño, vuela a 560 px/s y atraviesa 2 enemigos.",
            },
            {
              ico: "✨",
              nombre: "Sinergia elemental",
              tec: "Cerca de un lanzador",
              desc: "Con un Mago, Clérigo o Druida a menos de 130 px, tus flechas se imbuyen: fuego = quemadura, hielo = ralentizar, arcano = +15% daño, sagrado = robo de vida, naturaleza = veneno.",
            },
            {
              ico: "🛡️",
              nombre: "Parry",
              tec: "Clic der. · LT",
              desc: "Mismo sistema que el Guerrero. Si parryeas un proyectil enemigo, lo devuelves con ×1.4 daño.",
            },
            {
              ico: "💨",
              nombre: "Esquivar",
              tec: "Espacio · A",
              desc: "Dash con 0.24 s de invulnerabilidad. Deja una estela visual que confunde a los enemigos.",
            },
            {
              ico: "🌟",
              nombre: "Multidisparo (ulti)",
              tec: "E · Y",
              desc: "Lanza un abanico de 5 flechas en arco. Perfecto para grupos densos o cuando necesitas cubrir área.",
            },
            {
              ico: "🃏",
              nombre: "Mejoras especiales",
              tec: "Tarjetas de nivel",
              desc: "Flecha Perforante: las flechas traspasan un enemigo. Cadencia Mortal: +25% velocidad de ataque permanente.",
            },
          ],
        },
        mago: {
          nombre: "Mago",
          color: "#c07be0",
          habilidades: [
            {
              ico: "🔥",
              nombre: "1 — Bola de Fuego",
              tec: "1 · X + clic",
              desc: "Proyectil rápido que al impactar aplica QUEMADURA: daño en el tiempo durante 2.5 s. Cuesta 8 Maná. Ideal contra objetivos grandes y jefes.",
            },
            {
              ico: "❄️",
              nombre: "2 — Carámbano",
              tec: "2 · B + clic",
              desc: "Proyectil helado que al impactar RALENTIZA al enemigo 1.3 s. Algo menos de daño que el fuego, pero control constante. Cuesta 8 Maná.",
            },
            {
              ico: "🌌",
              nombre: "3 — Orbe Arcano (cargable)",
              tec: "3 · RB + mantener clic",
              desc: "MANTÉN el ataque para cargarlo (~1 s): crece en tamaño, daño y velocidad. Sin cargar hace más daño base que fuego/hielo pero vuela lentísimo. A plena carga: daño masivo, empuje y atraviesa un enemigo. Cuesta 12 Maná al soltar.",
            },
            {
              ico: "🌋",
              nombre: "Cataclismo Ígneo (ulti fuego)",
              tec: "E · Y",
              desc: "Zona en llamas de radio 95 px donde apuntes que quema durante un tiempo breve. Perfecta para bloquear pasillos y castigar grupos.",
            },
            {
              ico: "🧊",
              nombre: "Cataclismo Gélido (ulti hielo)",
              tec: "E · Y",
              desc: "Escarcha en área de radio 110 px: todos los enemigos dentro quedan ralentizados 2.5 s y el campo sigue enfriando mientras dura.",
            },
            {
              ico: "🌀",
              nombre: "Portal Arcano (ulti arcano)",
              tec: "E · Y",
              desc: "Abre un portal de radio 90 px: los enemigos caen dentro, desaparecen y REAPARECEN ARRIBA de la sala recibiendo daño de caída (×2.2) y aturdimiento. Los jefes resisten (solo daño parcial).",
            },
          ],
        },
        clerigo: {
          nombre: "Clérigo",
          color: "#e6e0d0",
          habilidades: [
            {
              ico: "✨",
              nombre: "Orbe sagrado (ataque)",
              tec: "Clic · RT",
              desc: "Dispara un proyectil de luz que daña enemigos. Menor daño que otras clases, pero permite atacar a distancia segura.",
            },
            {
              ico: "💚",
              nombre: "1 — Área de Sanación",
              tec: "1 · X",
              desc: "Crea una zona curativa de 64 px de radio (3 s) en el suelo. Todos los aliados dentro recuperan vida cada 0.35 s. Cuesta 30 Maná. Potenciada por la tarjeta Gracia Divina.",
            },
            {
              ico: "⚡",
              nombre: "2 — Ímpetu",
              tec: "2 · B",
              desc: "Otorga el buff Ímpetu a todos los aliados en radio 130 px durante 5 s. Con Ímpetu: +30% velocidad de ataque y regeneración de recurso acelerada.",
            },
            {
              ico: "🛡️",
              nombre: "3 — Égida",
              tec: "3 · RB",
              desc: "Otorga un escudo de absorción de daño (18% HP máx) a todos los aliados en radio 150 px. Potenciado por la tarjeta Escudo Eterno (+25% de escudo).",
            },
            {
              ico: "🌟",
              nombre: "Consagración (ulti)",
              tec: "E · Y",
              desc: "Gran área sagrada bajo tus pies (radio 105 px, 2.4 s). Daña a los enemigos que pasen por ella y cura a los aliados dentro cada tick. Combina daño y soporte en una sola habilidad.",
            },
          ],
        },
        picaro: {
          nombre: "Pícaro",
          color: "#8a4a5a",
          habilidades: [
            {
              ico: "🗡️",
              nombre: "Dagas gemelas (clic izq.)",
              tec: "Clic · RT",
              desc: "Puñaladas muy rápidas de corto alcance hacia el cursor. Menos daño por golpe pero cadencia altísima y 28% de crítico base — la clase con más crítico del juego.",
            },
            {
              ico: "🔪",
              nombre: "Por la espalda (pasiva)",
              tec: "Automático",
              desc: "Si apuñalas a un enemigo que está centrado en OTRO jugador, es una puñalada trapera: ×1.6 de daño. Deja que el tanque distraiga y masacra desde atrás. No funciona con jefes.",
            },
            {
              ico: "✨",
              nombre: "Sinergia elemental",
              tec: "Cerca de un lanzador",
              desc: "Con un Mago, Clérigo o Druida a menos de 130 px, tus dagas se imbuyen: fuego = quemadura, hielo = ralentizar, arcano = +15% daño, sagrado = robo de vida, naturaleza = veneno.",
            },
            {
              ico: "🛡️",
              nombre: "Parry",
              tec: "Clic der. · LT",
              desc: "Mismo sistema que el resto: ventana de 0.18 s que anula el golpe, aturde y contraataca.",
            },
            {
              ico: "💨",
              nombre: "Esquivar",
              tec: "Espacio · A",
              desc: "Dash más largo que el resto de clases con invulnerabilidad. Con la tarjeta Sombra Letal, daña a los enemigos que atraviesas.",
            },
            {
              ico: "⚔️",
              nombre: "Danza de Cuchillas (ulti)",
              tec: "E · Y",
              desc: "Te lanzas 190 px en línea recta hacia el cursor atravesando a todos los enemigos del camino con ×1.6 de daño e invulnerabilidad durante el desplazamiento.",
            },
            {
              ico: "🃏",
              nombre: "Mejoras especiales",
              tec: "Tarjetas de nivel",
              desc: "Hoja Envenenada: las dagas aplican veneno de 3 s. Sombra Letal: el esquive daña a quien atraviesas.",
            },
          ],
        },
        druida: {
          nombre: "Druida",
          color: "#6ac04a",
          habilidades: [
            {
              ico: "🌿",
              nombre: "Lanzar rama (forma humana)",
              tec: "Clic · RT",
              desc: "Lanza una rama giratoria a distancia (420 px/s). Daño completo del atributo. Es tu única opción a distancia: las formas animales luchan cuerpo a cuerpo.",
            },
            {
              ico: "🦅",
              nombre: "1 — Forma de Águila",
              tec: "1 · X",
              desc: "+55 velocidad de movimiento, garras rapidísimas de daño reducido (×0.7). Ideal para reposicionarte, recoger botín y esquivar patrones de jefe. −2 armadura.",
            },
            {
              ico: "🐺",
              nombre: "2 — Forma de Lobo",
              tec: "2 · B",
              desc: "+15% crítico, +15% daño y mordiscos ágiles. La forma DPS: rápida y letal en cuerpo a cuerpo.",
            },
            {
              ico: "🐻",
              nombre: "3 — Forma de Oso",
              tec: "3 · RB",
              desc: "+10 armadura y zarpazos lentos pero devastadores (×1.5 daño, arco enorme). La forma tanque para aguantar la línea. −28 velocidad.",
            },
            {
              ico: "🔄",
              nombre: "Cambio de forma",
              tec: "Repetir tecla",
              desc: "Cada transformación cuesta 20 Naturaleza. Pulsar la tecla de tu forma actual te devuelve a humano gratis. El parry, el esquive y la ulti funcionan en cualquier forma.",
            },
            {
              ico: "🌪️",
              nombre: "Ira Salvaje (ulti)",
              tec: "E · Y",
              desc: "Invoca un campo de zarzas de radio 100 px donde apuntes: daño continuo + ralentización del 50% durante 3 s. Funciona en cualquier forma.",
            },
            {
              ico: "🃏",
              nombre: "Mejoras especiales",
              tec: "Tarjetas de nivel",
              desc: "Vínculo Salvaje: transformarte cura el 10% de tu vida. Alfa de la Manada: +20% de daño en formas animales.",
            },
          ],
        },
      };

export function abrirInfo(rol) {
        const info = INFO_CLASE[rol];
        if (!info) return;
        document.getElementById("info-inner").innerHTML =
          '<div class="info-clase">' +
          '<div class="fila-cerrar">' +
          '<h2 style="color:' +
          info.color +
          '">' +
          info.nombre +
          " — Guía de habilidades</h2>" +
          '<button class="btn dorado" onclick="cerrarInfo()">Cerrar</button></div>' +
          '<div class="info-seccion"><h3>Habilidades</h3>' +
          '<div class="habil-lista">' +
          info.habilidades
            .map(
              (h) =>
                '<div class="habil-fila">' +
                '<div class="habil-ico">' +
                h.ico +
                "</div>" +
                '<div class="habil-txt">' +
                '<div class="habil-tec">' +
                h.tec +
                "</div>" +
                '<div class="habil-nombre">' +
                h.nombre +
                "</div>" +
                '<div class="habil-d">' +
                h.desc +
                "</div>" +
                "</div></div>",
            )
            .join("") +
          "</div></div></div>";
        mostrar("info-overlay");
      }

export function cerrarInfo() {
        ocultar("info-overlay");
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarInfo = cerrarInfo;
