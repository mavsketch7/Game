// Auto-generated during the modularization refactor (2026-07-23).
import { META, SKINS } from "../core/save.js";
import { G } from "../core/state.js";
import { HERO_ROWS, PALS, ROWS_CLASE, buildSprite } from "../render/sprites.js";
import { toast } from "./notifications.js";
import { mostrar, ocultar } from "./overlays.js";

export function abrirSkins() {
        if (!G || !G.activo) return;
        G.pausa = true;
        G.skinLock = true;
        const filas = SKINS.map((sk) => {
          const comprado = META.skins.comprados.includes(sk.id);
          // botones por jugador presente
          const botones = comprado
            ? G.players
                .map((p, i) => {
                  const enUso = META.skins.equipada[p.rol] === sk.id;
                  return (
                    '<button class="btn' +
                    (enUso ? " dorado" : "") +
                    '" style="padding:5px 9px;font-size:.72rem" onclick="equiparSkin(\'' +
                    sk.id +
                    "'," +
                    i +
                    ')">' +
                    (enUso ? "✔ " + p.nombre : p.nombre) +
                    "</button>"
                  );
                })
                .join("")
            : '<button class="btn' +
              (META.oro >= sk.precio ? " dorado" : "") +
              '" ' +
              (META.oro < sk.precio ? "disabled" : "") +
              " onclick=\"comprarSkin('" +
              sk.id +
              "')\">" +
              sk.precio +
              " 🪙</button>";
          const previews = G.players
            .map(
              (p, i) =>
                '<canvas id="skprev-' +
                sk.id +
                "-" +
                i +
                '" width="30" height="36"></canvas>',
            )
            .join("");
          const algunoEnUso = G.players.some(
            (p) => META.skins.equipada[p.rol] === sk.id,
          );
          return (
            '<div class="skin-fila' +
            (algunoEnUso ? " equipada" : "") +
            '">' +
            previews +
            '<div class="skin-info"><h4 style="color:' +
            sk.pal.G +
            '">' +
            sk.nombre +
            "</h4>" +
            '<div class="s-desc">' +
            sk.desc +
            "</div></div>" +
            '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
            botones +
            "</div>" +
            "</div>"
          );
        }).join("");
        document.getElementById("skins-inner").innerHTML =
          '<div class="tienda-cab">' +
          "<h2>🧵 El Sastre de Véspero</h2>" +
          '<div class="tienda-oro">Banca: ' +
          META.oro +
          " 🪙</div>" +
          '<p style="color:var(--ceniza);font-size:.8rem;margin-top:4px">Las skins se compran una vez y quedan desbloqueadas para siempre. Equípalas por jugador. "El estilo también es una estadística."</p>' +
          "</div>" +
          filas +
          '<div style="text-align:center;margin-top:14px">' +
          '<button class="btn" onclick="quitarSkins()">Quitar todas</button> ' +
          '<button class="btn dorado" onclick="cerrarSkins()">Cerrar (Esc)</button></div>';
        mostrar("skins");
        // pintar previews: sprite real de la clase teñido con la paleta de la skin
        for (const sk of SKINS) {
          G.players.forEach((p, i) => {
            const cnv = document.getElementById("skprev-" + sk.id + "-" + i);
            if (!cnv) return;
            const g = cnv.getContext("2d");
            g.imageSmoothingEnabled = false;
            g.clearRect(0, 0, 30, 36);
            const spr = buildSprite(ROWS_CLASE[p.rol] || HERO_ROWS, {
              ...PALS[p.rol],
              ...sk.pal,
            });
            g.drawImage(
              spr,
              (30 - spr.width * 0.7) / 2,
              (36 - spr.height * 0.7) / 2,
              spr.width * 0.7,
              spr.height * 0.7,
            );
          });
        }
      }

function comprarSkin(id) {
        const sk = SKINS.find((s) => s.id === id);
        if (!sk) return;
        if (META.skins.comprados.includes(id) || META.oro < sk.precio) return;
        META.oro -= sk.precio;
        META.skins.comprados.push(id);
        toast("🧵 Skin desbloqueada: " + sk.nombre, sk.pal.G);
        abrirSkins();
      }

function equiparSkin(id, pi) {
        const p = G.players[pi];
        if (!p) return;
        if (!META.skins.comprados.includes(id)) return;
        if (META.skins.equipada[p.rol] === id)
          delete META.skins.equipada[p.rol];
        else META.skins.equipada[p.rol] = id;
        abrirSkins();
      }

function quitarSkins() {
        META.skins.equipada = {};
        abrirSkins();
      }

export function cerrarSkins() {
        ocultar("skins");
        if (G) G.pausa = false;
      }

// Expuestas en window: referenciadas desde onclick="..." en HTML generado dinámicamente.
window.cerrarSkins = cerrarSkins;
window.comprarSkin = comprarSkin;
window.equiparSkin = equiparSkin;
window.quitarSkins = quitarSkins;
