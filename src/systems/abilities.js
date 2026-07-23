// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W } from "../core/canvas.js";
import { ELEMENTOS, ELEM_MAGO, FORMAS_DRUIDA, FORMAS_INFO, ROLES, SUPS } from "../core/constants.js";
import { update } from "../core/loop.js";
import { G } from "../core/state.js";
import { fxOnda, fxParticulas, fxTajo, fxTexto } from "../render/effects.js";
import { sfx } from "./audio.js";
import { curarP, danoAEnemigo, danoAlJugador, masCercano, statsTot, vivos } from "./combat.js";
import { genItem } from "./loot.js";
import { toast } from "../ui/notifications.js";
import { clamp } from "../utils/helpers.js";

export function groundTarget(p, maxR) {
        let tx = p.inp ? p.inp.gtX : p.x,
          ty = p.inp ? p.inp.gtY : p.y;
        const d = Math.hypot(tx - p.x, ty - p.y);
        if (d > maxR) {
          tx = p.x + ((tx - p.x) / d) * maxR;
          ty = p.y + ((ty - p.y) / d) * maxR;
        }
        return { x: tx, y: ty };
      }

const cdHaste = (p) => (p.hasteT > 0 ? 0.55 : 1);

export function atacar(p) {
        if (p.atrapado) return;
        const t = statsTot(p);
        if (p.rol === "guerrero") {
          if (p.atkCd > 0) return;
          const colosal = (p.combo || 0) >= 4;
          p.atkCd =
            ((colosal ? 0.5 : 0.38) * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          p.swingT = colosal ? 0.26 : 0.18;
          if (colosal) {
            p.combo = 0;
            golpeArco(p, p.aim, 88, 2.1, t.atk * 2);
            fxOnda(p.x, p.y, 88, "#e9b45c");
            G.shake = Math.max(G.shake, 4);
            fxTexto(p.x, p.y - 36, "¡GOLPE COLOSAL!", "#e9b45c", true);
          } else {
            const hits = golpeArco(p, p.aim, 62, 1.5, t.atk);
            if (hits > 0) {
              p.combo = (p.combo || 0) + 1;
              p.comboT = 3;
              if (p.combo >= 4)
                fxTexto(p.x, p.y - 30, "⚔ ¡cargado!", "#e9b45c");
            }
          }
        } else if (p.rol === "arquero") {
          if (p.atkCd > 0) return;
          p.atkCd = (0.3 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          p.swingT = 0.3;
          const dmgFle = t.atk * (p.imbuido === "arcano" ? 1.15 : 1);
          if (p.certera) {
            // Flecha Certera: crítico natural, atraviesa y vuela más rápido
            p.certera = false;
            dispararProy(p, p.aim, dmgFle * 2, "flecha", "#ffd27f", 560);
            const pr = G.projs[G.projs.length - 1];
            pr.pierce = (pr.pierce || 0) + 2;
            pr.certera = true;
            fxOnda(p.x, p.y, 20, "#ffd27f");
          } else {
            dispararProy(p, p.aim, dmgFle, "flecha", "#e9e3d5", 480);
          }
        } else if (p.rol === "mago") {
          if (p.elemento === "arcano") return; // el arcano se carga manteniendo el ataque (gestionado en el update)
          if (p.castCd > 0) return;
          if (p.res < 8) {
            fxTexto(p.x, p.y - 24, "sin maná", "#9a93ab");
            return;
          }
          p.res -= 8;
          p.castCd = (0.45 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          if (p.elemento === "fuego") {
            dispararProy(p, p.aim, t.atk * 0.9, "bola", "#ff7d4d", 400);
            G.projs[G.projs.length - 1].quema = true;
          } else {
            dispararProy(p, p.aim, t.atk * 0.8, "carambano", "#7fc9e8", 430);
            G.projs[G.projs.length - 1].congela = true;
          }
        } else if (p.rol === "picaro") {
          if (p.atkCd > 0) return;
          p.atkCd = (0.2 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          p.swingT = 0.1;
          golpeArco(p, p.aim, 46, 1.1, t.atk * 0.75, true);
        } else if (p.rol === "druida") {
          if (p.atkCd > 0) return;
          const fd = p._formDmg || 1;
          if (p.forma === "humano") {
            p.atkCd = (0.4 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            dispararProy(p, p.aim, t.atk, "rama", "#8a6b43", 420);
          } else if (p.forma === "aguila") {
            p.atkCd = (0.25 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            p.swingT = 0.1;
            golpeArco(p, p.aim, 50, 1.2, t.atk * 0.7 * fd);
          } else if (p.forma === "lobo") {
            p.atkCd = (0.34 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            p.swingT = 0.14;
            golpeArco(p, p.aim, 55, 1.0, t.atk * 1.1 * fd);
          } else {
            // oso
            p.atkCd = (0.6 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
            p.swingT = 0.22;
            golpeArco(p, p.aim, 66, 1.7, t.atk * 1.5 * fd);
          }
        } else {
          // clérigo: proyectil sagrado básico
          if (p.atkCd > 0) return;
          p.atkCd = (0.45 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
          dispararProy(p, p.aim, t.atk, "orbe", "#ffe6a3", 380);
        }
      }

function golpeArco(p, dir, rango, arco, dmgBase, esPicaro) {
        fxTajo(p.x, p.y, dir, rango);
        sfx("golpe");
        let hits = 0;
        for (const e of G.enemigos) {
          if (e.hp <= 0 && !e.dummy) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < rango + e.r) {
            let da = Math.atan2(e.y - p.y, e.x - p.x) - dir;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            if (Math.abs(da) < arco / 2) {
              let dmg = dmgBase;
              if (p.imbuido === "arcano") dmg *= 1.15; // sinergia arcana
              // pícaro: puñalada por la espalda si el enemigo está centrado en otro
              let backstab = false;
              if (esPicaro && !e.dummy && !e.jefe) {
                const obj2 = masCercano(e.x, e.y);
                if (obj2 && obj2 !== p) {
                  backstab = true;
                  dmg *= 1.6;
                }
              }
              danoAEnemigo(
                e,
                dmg,
                p,
                true,
                Math.cos(dir) * 140,
                Math.sin(dir) * 140,
              );
              hits++;
              if (backstab)
                fxTexto(e.x, e.y - e.r - 16, "¡por la espalda!", "#c084f0");
              if (esPicaro && p._poison && !e.dummy) {
                e.poisonT = 3;
                e.poisonDps = statsTot(p).atk * 0.3;
                e.poisonOwner = p;
              }
              if (p.imbuido) aplicarImbuido(p, e);
            }
          }
        }
        // fuego amigo: el tajo alcanza a los compañeros en el arco (50% de daño;
        // en la Arena PvP es el único daño que existe, así que va al 100%)
        if (G.ff || G.escena === "pvp") {
          const multFF = G.escena === "pvp" ? 1 : 0.5;
          for (const q of vivos()) {
            if (q === p || q.invulT > 0) continue;
            const dq = Math.hypot(q.x - p.x, q.y - p.y);
            if (dq < rango + q.r) {
              let da = Math.atan2(q.y - p.y, q.x - p.x) - dir;
              while (da > Math.PI) da -= TAU;
              while (da < -Math.PI) da += TAU;
              if (Math.abs(da) < arco / 2) {
                danoAlJugador(q, dmgBase * multFF, { ff: p });
                if (G.escena !== "pvp")
                  fxTexto(
                    (p.x + q.x) / 2,
                    q.y - 34,
                    "¡fuego amigo!",
                    "#ff9d3d",
                  );
              }
            }
          }
        }
        // pilares destructibles y objetos
        for (const pl of G.pilares) {
          if (!pl.destructible) continue;
          if (Math.hypot(pl.x - p.x, pl.y - p.y) < rango + pl.r) {
            let da = Math.atan2(pl.y - p.y, pl.x - p.x) - dir;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            if (Math.abs(da) < arco / 2) danoPilar(pl, dmgBase * 0.7);
          }
        }
        for (const o of G.objetos) {
          if (o.tipo !== "barril" && !(o.tipo === "cofre" && !o.abierto))
            continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) < rango + 12) {
            let da = Math.atan2(o.y - p.y, o.x - p.x) - dir;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            if (Math.abs(da) < arco / 2) golpeObjeto(o, dmgBase);
          }
        }
        return hits;
      }

export const NIVEL_ULTI = 5;

export function aplicarImbuido(p, e) {
        const im = p.imbuido;
        if (!im) return;
        const t = statsTot(p);
        if (im === "fuego" && !e.dummy) {
          e.burnT = Math.max(e.burnT, 1.6);
          e.burnDps = Math.max(e.burnDps, t.atk * 0.25);
          e.burnOwner = p;
        } else if (im === "hielo") {
          e.slowT = Math.max(e.slowT, 0.9);
        } else if (im === "sagrado") {
          curarP(p, Math.max(1, Math.round(t.atk * 0.15)));
        } else if (im === "zarzas" && !e.dummy) {
          e.poisonT = Math.max(e.poisonT, 2);
          e.poisonDps = Math.max(e.poisonDps, t.atk * 0.2);
          e.poisonOwner = p;
        }
        // 'arcano' se aplica como multiplicador de daño en el propio golpe
      }

export function danoPilar(pl, dmg) {
        if (!pl.destructible || pl.hp <= 0) return;
        pl.hp -= Math.round(dmg);
        pl.hurtT = 0.15;
        if (pl.hp <= 0) {
          fxParticulas(pl.x, pl.y - 10, 16, "#57496f");
          G.shake = Math.max(G.shake, 3);
          G.decals.push({ x: pl.x, y: pl.y });
          if (Math.random() < 0.35)
            G.drops.push({
              tipo: "moneda",
              x: pl.x,
              y: pl.y,
              val: Math.max(1, Math.round(1 + G.planta * 0.2)),
            });
          const idx = G.pilares.indexOf(pl);
          if (idx >= 0) G.pilares.splice(idx, 1);
          toast("¡Columna destruida!", "#9a93ab");
        }
      }

export function golpeObjeto(o, dmg) {
        if (o.tipo === "barril") {
          o.hp -= dmg;
          if (o.hp <= 0) {
            fxParticulas(o.x, o.y, 10, "#6b4a2c");
            if (Math.random() < 0.55)
              G.drops.push({
                tipo: "moneda",
                x: o.x,
                y: o.y,
                val: Math.max(1, Math.round(1 + G.planta * 0.15)),
              });
            else if (Math.random() < 0.5)
              G.drops.push({ tipo: "vial", x: o.x, y: o.y });
            G.objetos.splice(G.objetos.indexOf(o), 1);
          }
        } else if (o.tipo === "cofre" && !o.abierto) {
          o.abierto = true;
          fxOnda(o.x, o.y, 26, "#e9b45c");
          G.drops.push({
            tipo: "item",
            x: o.x,
            y: o.y - 14,
            item: genItem(G.planta || 1),
          });
          G.drops.push({
            tipo: "moneda",
            x: o.x + 14,
            y: o.y,
            val: Math.max(2, Math.round(3 + G.planta * 0.25)),
          });
        }
      }

function dispararProy(p, dir, dmg, tipo, color, v) {
        if (tipo === "flecha") sfx("flecha");
        else if (tipo === "bola") sfx("fuego");
        else if (tipo === "carambano") sfx("hielo");
        else if (tipo === "orbeArc") sfx("magia");
        else if (tipo === "rama") sfx("flecha");
        const pr = {
          owner: "p",
          duenio: p,
          x: p.x + Math.cos(dir) * 16,
          y: p.y + Math.sin(dir) * 16,
          vx: Math.cos(dir) * v,
          vy: Math.sin(dir) * v,
          r: 4,
          dmg,
          tipo,
          color,
          ttl: 1.6,
        };
        if (tipo === "flecha" && p._pierceProy > 0) pr.pierce = p._pierceProy;
        G.projs.push(pr);
      }

function crearArea(x, y, r, elemento, mult, duenio) {
        const el = ELEMENTOS[elemento];
        const rFinal =
          r * (duenio && duenio._areaRadMult ? duenio._areaRadMult : 1);
        const ttlFinal =
          el.ttl * (duenio && duenio._areaDurMult ? duenio._areaDurMult : 1);
        G.areas.push({
          clase: "elem",
          x,
          y,
          r: rFinal,
          elemento,
          mult: mult || 1,
          duenio,
          ttl: ttlFinal,
          tick: 0,
          nace: 0.15,
        });
        fxOnda(x, y, rFinal, el.color);
      }

export function habilidad(p) {
        const t = statsTot(p),
          sk = ROLES[p.rol].skill;
        if (p.nivel < NIVEL_ULTI) {
          fxTexto(p.x, p.y - 24, "🔒 ulti al nivel " + NIVEL_ULTI, "#9a93ab");
          return;
        }
        if (p.skillCd > 0) return;
        if (p.res < sk.coste) {
          fxTexto(
            p.x,
            p.y - 24,
            "sin " + ROLES[p.rol].resNombre.toLowerCase(),
            "#9a93ab",
          );
          return;
        }
        p.res -= sk.coste;
        sfx("ulti");
        const cdMult = (1 - t.cdr / 100) * (p._ultCdMult || 1);
        p.skillCd = sk.cd * cdMult;
        function lanzarUlti() {
          if (p.rol === "guerrero") {
            fxOnda(p.x, p.y, 84, "#e9b45c");
            p.swingT = 0.22;
            for (const e of G.enemigos) {
              if (e.hp <= 0) continue;
              if (Math.hypot(e.x - p.x, e.y - p.y) < 84 + e.r) {
                const a = Math.atan2(e.y - p.y, e.x - p.x);
                danoAEnemigo(
                  e,
                  t.atk * 1.7,
                  p,
                  true,
                  Math.cos(a) * 220,
                  Math.sin(a) * 220,
                );
              }
            }
          } else if (p.rol === "arquero") {
            for (let i = -2; i <= 2; i++)
              dispararProy(
                p,
                p.aim + i * 0.16,
                t.atk * 0.9,
                "flecha",
                "#e9e3d5",
                480,
              );
          } else if (p.rol === "mago") {
            const g = groundTarget(p, 300);
            if (p.elemento === "fuego") {
              // zona que quema durante un tiempo breve
              crearArea(g.x, g.y, 95, "fuego", 2, p);
              fxOnda(g.x, g.y, 95, "#ff7d4d");
            } else if (p.elemento === "hielo") {
              // ralentización masiva en área
              crearArea(g.x, g.y, 110, "hielo", 1.5, p);
              fxOnda(g.x, g.y, 110, "#7fc9e8");
              fxOnda(g.x, g.y, 70, "#cfe4ff");
              for (const e of G.enemigos) {
                if (e.hp <= 0 && !e.dummy) continue;
                if (Math.hypot(e.x - g.x, e.y - g.y) < 110 + e.r) {
                  e.slowT = Math.max(e.slowT, 2.5);
                  fxParticulas(e.x, e.y, 4, "#7fc9e8");
                }
              }
            } else {
              // PORTAL ARCANO: los enemigos caen y reaparecen arriba con daño de caída
              sfx("portal");
              fxOnda(g.x, g.y, 90, "#c084f0");
              fxOnda(g.x, g.y, 55, "#e0c0ff");
              fxParticulas(g.x, g.y, 20, "#c084f0");
              G.areas.push({
                clase: "malArea",
                x: g.x,
                y: g.y,
                r: 90,
                ttl: 0.6,
                tick: 99,
                nace: 0.1,
                dps: 0,
                color: "#c084f0",
              });
              let tragados = 0;
              for (const e of G.enemigos) {
                if ((e.hp <= 0 && !e.dummy) || e.dummy) continue;
                if (Math.hypot(e.x - g.x, e.y - g.y) < 90 + e.r) {
                  if (e.jefe) {
                    // los jefes resisten el portal: solo daño parcial
                    danoAEnemigo(e, t.atk * 1.4, p, true);
                    fxTexto(e.x, e.y - e.r - 8, "¡resiste!", "#c084f0");
                  } else {
                    e.portalT = 0.7;
                    e.portalX = e.x;
                    e.portalDmg = t.atk * 2.2;
                    e.portalOwner = p;
                    fxParticulas(e.x, e.y, 8, "#c084f0");
                    tragados++;
                  }
                }
              }
              if (tragados > 0)
                fxTexto(
                  g.x,
                  g.y - 20,
                  "¡" + tragados + " tragado" + (tragados > 1 ? "s" : "") + "!",
                  "#c084f0",
                  true,
                );
            }
            G.shake = Math.max(G.shake, 4);
          } else if (p.rol === "picaro") {
            // Danza de Cuchillas: atraviesa 190px en línea, daña todo en el camino
            const dist = 190;
            const x0 = p.x,
              y0 = p.y;
            let x1 = clamp(p.x + Math.cos(p.aim) * dist, 28, W - 28);
            let y1 = clamp(p.y + Math.sin(p.aim) * dist, 28, H - 28);
            for (const e of G.enemigos) {
              if (e.hp <= 0 && !e.dummy) continue;
              // distancia del enemigo al segmento
              const dx = x1 - x0,
                dy = y1 - y0,
                len2 = dx * dx + dy * dy || 1;
              let u = ((e.x - x0) * dx + (e.y - y0) * dy) / len2;
              u = clamp(u, 0, 1);
              const px2 = x0 + u * dx,
                py2 = y0 + u * dy;
              if (Math.hypot(e.x - px2, e.y - py2) < 30 + e.r) {
                danoAEnemigo(
                  e,
                  t.atk * 1.6,
                  p,
                  true,
                  Math.cos(p.aim) * 180,
                  Math.sin(p.aim) * 180,
                );
              }
            }
            for (let k = 0; k < 5; k++)
              fxTajo(
                x0 + ((x1 - x0) * k) / 4,
                y0 + ((y1 - y0) * k) / 4,
                p.aim,
                26,
              );
            p.x = x1;
            p.y = y1;
            p.invulT = 0.5;
            p.trail.push({ x: x0, y: y0, t: 0.25 });
            G.shake = Math.max(G.shake, 3);
          } else if (p.rol === "druida") {
            const g = groundTarget(p, 280);
            crearArea(g.x, g.y, 100, "zarzas", 1.6, p);
            G.shake = Math.max(G.shake, 3);
          } else {
            crearArea(p.x, p.y, 105, "sagrado", 1.6, p);
          }
        }
        lanzarUlti();
        if (p._doubleUlti) {
          // segunda ejecución con pequeño delay visual
          G.fx.push({
            tipo: "txt",
            x: p.x,
            y: p.y - 44,
            txt: "×2",
            col: "#e9b45c",
            t: 0.9,
            t0: 0.9,
            grande: true,
          });
          setTimeout(() => {
            if (G && G.activo) lanzarUlti();
          }, 220);
        }
      }

export function castSup(p, i) {
        if (p.rol !== "clerigo") return;
        const s = SUPS[i],
          t = statsTot(p);
        if (p.supCd[i] > 0) return;
        if (p.res < s.coste) {
          fxTexto(p.x, p.y - 24, "sin maná", "#9a93ab");
          return;
        }
        p.res -= s.coste;
        p.supCd[i] = s.cd * (1 - t.cdr / 100);
        if (i === 0) {
          // área de sanación
          const g = groundTarget(p, 240);
          const healMult = p._healBonus || 1;
          G.areas.push({
            clase: "sanar",
            x: g.x,
            y: g.y,
            r: 64,
            duenio: p,
            ttl: 3,
            tick: 0,
            nace: 0.15,
            healMult,
          });
          fxOnda(g.x, g.y, 64, SUPS[0].color);
        } else if (i === 1) {
          // ímpetu
          for (const q of vivos())
            if (Math.hypot(q.x - p.x, q.y - p.y) < 130) {
              q.hasteT = 5;
              fxTexto(q.x, q.y - 30, "ÍMPETU", "#e9b45c");
            }
          fxOnda(p.x, p.y, 130, SUPS[1].color);
        } else {
          // égida
          const egidaMult = p._egidaBonus || 1;
          for (const q of vivos())
            if (Math.hypot(q.x - p.x, q.y - p.y) < 150) {
              const hm = statsTot(q).hpMax;
              q.escudo = Math.min(
                q.escudo + Math.round(hm * 0.18 * egidaMult),
                Math.round(hm * 0.5),
              );
              fxTexto(q.x, q.y - 30, "ÉGIDA", "#8fb8e8");
            }
          fxOnda(p.x, p.y, 150, SUPS[2].color);
        }
      }

export function esquivar(p) {
        // atrapado en arenas: el botón de esquive es el QTE de escape
        if (p.atrapado) {
          const enVentana = p.qteT >= 0.6 && p.qteT <= 0.85;
          if (enVentana) {
            p.qteHits++;
            fxOnda(p.x, p.y, 20 + p.qteHits * 8, "#7fd4c1");
            fxTexto(p.x, p.y - 30, "¡" + p.qteHits + "/3!", "#7fd4c1", true);
          } else {
            fxTexto(p.x, p.y - 30, "fallo…", "#9a93ab");
          }
          return;
        }
        // enraizado por telaraña: el esquive la rompe (cuesta el dash)
        if (p.rootT > 0) {
          if (p.dashCd > 0 || p.res < 18) return;
          p.res -= 18;
          p.rootT = 0;
          p.dashCd = 0.7;
          fxParticulas(p.x, p.y, 8, "#e8e0d0");
          fxTexto(p.x, p.y - 30, "¡libre!", "#7fd4c1");
          return;
        }
        if (p.dashCd > 0 || p.res < 18) return;
        p.res -= 18;
        let dx = p.inp ? p.inp.mx : 0,
          dy = p.inp ? p.inp.my : 0;
        if (dx === 0 && dy === 0) {
          dx = Math.cos(p.aim);
          dy = Math.sin(p.aim);
        }
        const n = Math.hypot(dx, dy) || 1;
        p.dashX = dx / n;
        p.dashY = dy / n;
        const durDash = p.rol === "picaro" ? 0.26 : 0.2;
        p.dashT = durDash;
        p.dashCd = 0.7;
        p.invulT = durDash + 0.04;
        p._dashVictims = p._dashDmg ? new Set() : null;
      }

export function activarParry(p) {
        if (p.parryCd > 0) return;
        p.parryT = 0.18;
        p.parryCd = 0.9;
      }

export function transformar(p, idx) {
        if (p.rol !== "druida" || p.formCd > 0) return;
        const destino = FORMAS_DRUIDA[idx];
        if (p.forma === destino) {
          p.forma = "humano";
          p.formCd = 0.6;
          fxOnda(p.x, p.y, 34, "#6ac04a");
          fxParticulas(p.x, p.y, 8, "#6ac04a");
          fxTexto(p.x, p.y - 32, "🌿 humano", "#6ac04a");
          return;
        }
        if (p.res < 20) {
          fxTexto(p.x, p.y - 24, "sin naturaleza", "#9a93ab");
          return;
        }
        p.res -= 20;
        p.forma = destino;
        p.formCd = 0.8;
        const fi = FORMAS_INFO[destino];
        fxOnda(p.x, p.y, 44, fi.color);
        fxOnda(p.x, p.y, 26, "#6ac04a");
        fxParticulas(p.x, p.y, 14, fi.color);
        fxTexto(p.x, p.y - 34, fi.ico + " " + fi.nombre, fi.color, true);
        // Vínculo Salvaje: transformarse cura
        if (p._formHeal > 0)
          curarP(p, Math.round(statsTot(p).hpMax * p._formHeal));
        // el cambio de forma puede reducir stats: ajustar hp al máximo actual
        p.hp = clamp(p.hp, 1, statsTot(p).hpMax);
      }

export function dispararArcano(p) {
        const t = statsTot(p);
        const c = clamp(p.cargaT / 1.1, 0, 1);
        p.cargaT = 0;
        if (p.castCd > 0) return;
        if (p.res < 12) {
          fxTexto(p.x, p.y - 24, "sin maná", "#9a93ab");
          return;
        }
        p.res -= 12;
        p.castCd = (0.5 * cdHaste(p)) / (1 + (p._hasteBonus || 0));
        const vel = 170 + c * 310; // sin carga: lentísimo
        const dmg = t.atk * (1.5 + c * 1.9); // más daño base que fuego/hielo, brutal cargado
        dispararProy(p, p.aim, dmg, "orbeArc", "#c084f0", vel);
        const pr = G.projs[G.projs.length - 1];
        pr.r = 4 + c * 7;
        pr.ttl = 2.2;
        pr.carga = c;
        if (c > 0.85) pr.pierce = (pr.pierce || 0) + 1; // a plena carga atraviesa un enemigo
        fxOnda(p.x, p.y, 16 + c * 22, "#c084f0");
        if (c > 0.85) G.shake = Math.max(G.shake, 2);
      }

export function cicloElem(p, d) {
        const i =
          (ELEM_MAGO.indexOf(p.elemento) + ELEM_MAGO.length + d) %
          ELEM_MAGO.length;
        p.elemento = ELEM_MAGO[i];
      }
