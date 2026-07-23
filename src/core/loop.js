// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W } from "./canvas.js";
import { ELEMENTOS, MAX_PLANTA, RAREZAS, ROLES, XP_POR_PLANTA } from "./constants.js";
import { iniciarLobby } from "./gameflow.js";
import { META } from "./save.js";
import { G } from "./state.js";
import { NET, netAplicarInputs } from "../net/peer.js";
import { fxOnda, fxParticulas, fxTexto } from "../render/effects.js";
import { aplicarImbuido, atacar, danoPilar, dispararArcano, golpeObjeto } from "../systems/abilities.js";
import { sfx } from "../systems/audio.js";
import { esJefe, escalaEnemigo } from "../systems/bosses.js";
import { curarP, danoAEnemigo, danoAlJugador, explotarBomber, ganarXP, masCercano, matarEnemigo, spawnClon, spawnEnemigo, statsTot, tipoAleatorio, vivos } from "../systems/combat.js";
import { aplicarLimites, colisionaMuro, dentroForma, iniciarPlanta } from "../systems/floorgen.js";
import { leerInput } from "../systems/input.js";
import { finPartida, plantaDespejada } from "../systems/loot.js";
import { abrirCartasParaJugador } from "../ui/cardsOverlay.js";
import { banner, toast } from "../ui/notifications.js";
import { abrirArenaPvp } from "../ui/pvp.js";
import { abrirTienda } from "../ui/shop.js";
import { abrirSkins } from "../ui/skins.js";
import { az, clamp, rnd } from "../utils/helpers.js";

export function update(dt) {
        if (NET.modo === "host") netAplicarInputs();
        G.stats.tiempo += dt;
        const N = G.players.length;

        // jugadores
        for (const p of G.players) {
          // los jugadores 'net' ya reciben su inp de netAplicarInputs(); leerInput()
          // no sabe de mandos remotos y lo pisaría con un input vacío cada frame.
          if (p.ctrl.tipo !== "net") p.inp = leerInput(p);
          if (p.ko) {
            // reanimación (en la Arena PvP una caída es una eliminación
            // definitiva para ese combate: no hay revivir al rival)
            const cerca =
              G.escena !== "pvp" &&
              vivos().some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 42);
            if (cerca) p.reviveT += dt;
            else p.reviveT = Math.max(0, p.reviveT - dt * 1.5);
            if (p.reviveT >= 2) {
              p.ko = false;
              p.reviveT = 0;
              p.hp = Math.round(statsTot(p).hpMax * 0.4);
              p.res = ROLES[p.rol].res * 0.5;
              p.invulT = 1;
              fxOnda(p.x, p.y, 46, "#7fd4c1");
              toast(p.nombre + " vuelve a la lucha", "#7fd4c1");
            }
            continue;
          }
          const t = statsTot(p),
            b = ROLES[p.rol];
          for (const k of [
            "atkCd",
            "castCd",
            "skillCd",
            "dashCd",
            "invulT",
            "parryT",
            "parryCd",
            "golpeT",
            "swingT",
            "hasteT",
          ])
            if (p[k] > 0) p[k] -= dt;
          for (let i = 0; i < 3; i++) if (p.supCd[i] > 0) p.supCd[i] -= dt;
          if (p.formCd > 0) p.formCd -= dt;
          p.res = clamp(
            p.res +
              (p.rol === "mago" || p.rol === "clerigo" ? 16 : 14) *
                dt *
                (p.hasteT > 0 ? 1.3 : 1),
            0,
            b.res,
          );
          p.anim += dt;
          p.aim = p.inp.aimA;

          let vx = 0,
            vy = 0;
          if (p.rootT > 0) p.rootT -= dt;
          if (p.atrapado || p.rootT > 0) {
            // inmovilizado: arenas movedizas o telaraña
            p.dashT = 0;
          } else if (p.dashT > 0) {
            p.dashT -= dt;
            vx = p.dashX * 560;
            vy = p.dashY * 560;
            p.trail.push({ x: p.x, y: p.y, t: 0.25 });
          } else {
            const n = Math.hypot(p.inp.mx, p.inp.my);
            if (n > 0) {
              let velEf = t.vel * (p.enOrtiga ? 0.72 : 1);
              vx = (p.inp.mx / n) * velEf * Math.min(1, n);
              vy = (p.inp.my / n) * velEf * Math.min(1, n);
            }
          }
          p.x = clamp(p.x + vx * dt, 28, W - 28);
          p.y = clamp(p.y + vy * dt, 28, H - 28);
          for (const pl of G.pilares) {
            const d = Math.hypot(p.x - pl.x, p.y - pl.y);
            if (d < pl.r + p.r) {
              const a = Math.atan2(p.y - pl.y, p.x - pl.x);
              p.x = pl.x + Math.cos(a) * (pl.r + p.r);
              p.y = pl.y + Math.sin(a) * (pl.r + p.r);
            }
          }
          aplicarLimites(p);

          // ---- zonas del suelo ----
          p.enOrtiga = false;
          if (p.hazTick > 0) p.hazTick -= dt;
          let sobrePeligro = false;
          for (const hz of G.hazards) {
            const dh = Math.hypot(p.x - hz.x, p.y - hz.y);
            if (dh > hz.r) continue;
            sobrePeligro = true;
            if (hz.tipo === "grieta") {
              if (hz.estado === 0) {
                hz.estado = 1;
                hz.t = 0.55;
                fxTexto(hz.x, hz.y - 14, "¡cruje!", "#9a93ab");
              } else if (hz.estado === 2 && p.invulT <= 0 && p.dashT <= 0) {
                // caída al vacío
                const inst = G.planta >= 60;
                fxParticulas(p.x, p.y, 12, "#26232f");
                if (inst) {
                  fxTexto(p.x, p.y - 30, "¡CAÍDA MORTAL!", "#d1545c", true);
                  p.escudo = 0;
                  danoAlJugador(p, statsTot(p).hpMax * 4, { caida: true });
                } else {
                  danoAlJugador(
                    p,
                    statsTot(p).hpMax * 0.25 + statsTot(p).armor * 0.6,
                    { caida: true },
                  );
                  fxTexto(p.x, p.y - 30, "¡caes al vacío!", "#d1545c");
                }
                if (!p.ko) {
                  p.x = p.safeX;
                  p.y = p.safeY;
                  p.invulT = 0.8;
                }
              }
            } else if (hz.tipo === "arena") {
              if (
                !p.atrapado &&
                dh < hz.r - 6 &&
                p.dashT <= 0 &&
                p.invulT <= 0
              ) {
                p.atrapado = hz;
                p.qteT = 0;
                p.qteHits = 0;
                p.rescT = 0;
                fxTexto(p.x, p.y - 34, "¡ARENAS MOVEDIZAS!", "#c9a35a", true);
                toast(
                  p.nombre +
                    " se hunde — ayúdale o pulsa esquive en el momento justo",
                  "#c9a35a",
                );
              }
            } else if (hz.tipo === "ortiga" || hz.tipo === "telarana") {
              p.enOrtiga = true;
              if (p.hazTick <= 0 && p.invulT <= 0) {
                p.hazTick = 0.5;
                danoAlJugador(
                  p,
                  Math.max(
                    2,
                    escalaEnemigo(Math.max(1, G.planta)).atkBase * 0.3,
                  ),
                  { haz: hz },
                );
              }
            } else if (hz.tipo === "fuegoZona") {
              if (p.hazTick <= 0 && p.invulT <= 0) {
                p.hazTick = 0.5;
                danoAlJugador(
                  p,
                  Math.max(
                    3,
                    escalaEnemigo(Math.max(1, G.planta)).atkBase * 0.55,
                  ),
                  { haz: hz },
                );
                fxParticulas(p.x, p.y, 3, "#ff7d4d");
              }
            }
          }
          if (!sobrePeligro && !p.atrapado) {
            p.safeX = p.x;
            p.safeY = p.y;
          }

          // ---- lucha contra las arenas movedizas ----
          if (p.atrapado) {
            p.qteT = (p.qteT + dt * 1.1) % 1;
            // rescate por un compañero (más rápido que reanimar)
            const aliado = vivos().some(
              (q) =>
                q !== p && !q.atrapado && Math.hypot(q.x - p.x, q.y - p.y) < 46,
            );
            if (aliado) p.rescT += dt;
            else p.rescT = Math.max(0, p.rescT - dt);
            if (p.rescT >= 1.2 || p.qteHits >= 3) {
              const hz = p.atrapado;
              p.atrapado = null;
              p.invulT = 0.5;
              // salto hacia fuera
              const a = Math.atan2(p.y - hz.y, p.x - hz.x) || rnd(0, TAU);
              p.x = clamp(hz.x + Math.cos(a) * (hz.r + 16), 28, W - 28);
              p.y = clamp(hz.y + Math.sin(a) * (hz.r + 16), 28, H - 28);
              fxOnda(p.x, p.y, 30, "#c9a35a");
              fxParticulas(p.x, p.y, 10, "#c9a35a");
              toast(p.nombre + " escapa de las arenas", "#7fd4c1");
            }
          }
          for (let i = p.trail.length - 1; i >= 0; i--) {
            p.trail[i].t -= dt;
            if (p.trail[i].t <= 0) p.trail.splice(i, 1);
          }
          // Sombra Letal: el dash daña a quien atraviesas
          if (p.dashT > 0 && p._dashVictims) {
            for (const e of G.enemigos) {
              if ((e.hp <= 0 && !e.dummy) || p._dashVictims.has(e)) continue;
              if (Math.hypot(e.x - p.x, e.y - p.y) < 26 + e.r) {
                p._dashVictims.add(e);
                danoAEnemigo(
                  e,
                  statsTot(p).atk * 1.2,
                  p,
                  true,
                  p.dashX * 160,
                  p.dashY * 160,
                );
              }
            }
          }
          if (p.lvlT > 0) p.lvlT -= dt;
          // combo del guerrero: se desvanece sin golpear
          if (p.comboT > 0) {
            p.comboT -= dt;
            if (p.comboT <= 0) p.combo = 0;
          }
          // cadena de parries: se desvanece si pasa demasiado tiempo sin parry
          if (p.parryComboT > 0) {
            p.parryComboT -= dt;
            if (p.parryComboT <= 0) p.parryCombo = 0;
          }
          // sinergia elemental: los lanzadores cercanos imbuyen las armas físicas
          if (
            p.rol === "guerrero" ||
            p.rol === "picaro" ||
            p.rol === "arquero"
          ) {
            p.imbuido = null;
            let mejor = null;
            for (const q of vivos()) {
              if (q === p) continue;
              if (Math.hypot(q.x - p.x, q.y - p.y) >= 130) continue;
              if (q.rol === "mago") {
                mejor = { pri: 3, elem: q.elemento };
              } else if (q.rol === "clerigo" && (!mejor || mejor.pri < 2)) {
                mejor = { pri: 2, elem: "sagrado" };
              } else if (q.rol === "druida" && (!mejor || mejor.pri < 1)) {
                mejor = { pri: 1, elem: "zarzas" };
              }
            }
            if (mejor) p.imbuido = mejor.elem;
          }
          if (p.rol === "mago" && p.elemento === "arcano" && !p.atrapado) {
            if (p.inp.atkHeld && p.castCd <= 0 && p.res >= 12) {
              p.cargaT = Math.min(p.cargaT + dt, 1.1);
            } else if (!p.inp.atkHeld && p.cargaT > 0) {
              dispararArcano(p);
            }
          } else {
            if (p.cargaT > 0 && p.rol === "mago")
              dispararArcano(p); // cambió de elemento o quedó atrapado: suelta lo cargado
            else p.cargaT = 0;
            if (p.inp.atkHeld) atacar(p);
          }
        }

        // proyectiles
        for (let i = G.projs.length - 1; i >= 0; i--) {
          const pr = G.projs[i];
          pr.x += pr.vx * dt;
          pr.y += pr.vy * dt;
          pr.ttl -= dt;
          let fuera =
            pr.ttl <= 0 ||
            pr.x < 10 ||
            pr.x > W - 10 ||
            pr.y < 10 ||
            pr.y > H - 10;
          if (colisionaMuro(pr.x, pr.y, pr.r)) {
            fuera = true;
            fxParticulas(pr.x, pr.y, 3, "#6a5a94");
          }
          if (!dentroForma(pr.x, pr.y, 0)) fuera = true;
          for (const pl of G.pilares)
            if (Math.hypot(pr.x - pl.x, pr.y - pl.y) < pl.r) {
              if (pr.owner === "p" && pl.destructible)
                danoPilar(pl, pr.dmg * 0.8);
              fuera = true;
            }
          if (pr.owner === "p")
            for (const o of G.objetos) {
              if (o.tipo === "barril" || (o.tipo === "cofre" && !o.abierto)) {
                if (Math.hypot(pr.x - o.x, pr.y - o.y) < 14) {
                  golpeObjeto(o, pr.dmg);
                  fuera = true;
                  break;
                }
              }
            }
          if (fuera) {
            G.projs.splice(i, 1);
            continue;
          }
          if (pr.owner === "p") {
            let dado = false,
              restantes = pr.pierce || 0;
            for (const e of G.enemigos) {
              if (e.hp <= 0 && !e.dummy) continue;
              if (pr.golpeados && pr.golpeados.has(e)) continue;
              if (Math.hypot(pr.x - e.x, pr.y - e.y) < pr.r + e.r) {
                danoAEnemigo(
                  e,
                  pr.dmg,
                  pr.duenio || G.players[0],
                  true,
                  pr.vx * 0.12,
                  pr.vy * 0.12,
                );
                if (
                  pr.duenio &&
                  pr.duenio._poison &&
                  pr.duenio.rol === "picaro" &&
                  !e.dummy
                ) {
                  e.poisonT = 3;
                  e.poisonDps = statsTot(pr.duenio).atk * 0.3;
                  e.poisonOwner = pr.duenio;
                }
                // efectos elementales del mago
                if (pr.quema && !e.dummy) {
                  e.burnT = 2.5;
                  e.burnDps = statsTot(pr.duenio || G.players[0]).atk * 0.35;
                  e.burnOwner = pr.duenio;
                  fxTexto(e.x, e.y - e.r - 14, "🔥", "#ff7d4d");
                }
                if (pr.congela) {
                  e.slowT = Math.max(e.slowT, 1.3);
                  fxParticulas(e.x, e.y, 5, "#7fc9e8");
                }
                if (pr.tipo === "orbeArc" && pr.carga > 0.85) {
                  const ka = Math.atan2(pr.vy, pr.vx);
                  e.kx += Math.cos(ka) * 160 * (e.knockRes ?? 1);
                  e.ky += Math.sin(ka) * 160 * (e.knockRes ?? 1);
                }
                // arquero: foco para la Flecha Certera + sinergias elementales
                const du = pr.duenio;
                if (du && du.rol === "arquero" && pr.tipo === "flecha") {
                  if (du.imbuido) aplicarImbuido(du, e);
                  if (!pr.certera) {
                    if (e === du.focoE) du.focoN = (du.focoN || 0) + 1;
                    else {
                      du.focoE = e;
                      du.focoN = 1;
                    }
                    if (du.focoN >= 3) {
                      du.focoN = 0;
                      du.certera = true;
                      fxTexto(
                        du.x,
                        du.y - 30,
                        "🎯 ¡certera lista!",
                        "#ffd27f",
                        true,
                      );
                    }
                  }
                }
                if (restantes > 0) {
                  pr.pierce = restantes - 1;
                  if (!pr.golpeados) pr.golpeados = new Set();
                  pr.golpeados.add(e);
                } else dado = true;
                break;
              }
            }
            // fuego amigo: los proyectiles alcanzan a los compañeros (nunca al que dispara)
            if (!dado && (G.ff || G.escena === "pvp")) {
              for (const q of vivos()) {
                if (q === pr.duenio) continue;
                if (Math.hypot(pr.x - q.x, pr.y - q.y) < pr.r + q.r) {
                  danoAlJugador(q, pr.dmg * (G.escena === "pvp" ? 1 : 0.5), {
                    ff: pr.duenio,
                  });
                  if (G.escena !== "pvp")
                    fxTexto(
                      (pr.x + q.x) / 2,
                      q.y - 34,
                      "¡fuego amigo!",
                      "#ff9d3d",
                    );
                  dado = true;
                  break;
                }
              }
            }
            if (dado) G.projs.splice(i, 1);
          } else {
            let dado = false;
            for (const p of G.players) {
              if (p.ko) continue;
              if (Math.hypot(pr.x - p.x, pr.y - p.y) < pr.r + p.r) {
                danoAlJugador(p, pr.dmg, { proj: pr });
                // telaraña de la Tejedora: enraíza
                if (pr.root && !p.ko && p.invulT <= 0) {
                  p.rootT = 1.2;
                  fxTexto(p.x, p.y - 34, "¡ATRAPADO EN TELARAÑA!", "#e8e0d0");
                }
                dado = true;
                break;
              }
            }
            if (dado && !pr.parried) G.projs.splice(i, 1);
          }
        }

        // áreas
        for (let i = G.areas.length - 1; i >= 0; i--) {
          const a = G.areas[i];
          a.ttl -= dt;
          a.tick -= dt;
          if (a.nace > 0) a.nace -= dt;
          if (a.tick <= 0) {
            a.tick = 0.35;
            if (a.clase === "malArea") {
              for (const q of vivos())
                if (Math.hypot(q.x - a.x, q.y - a.y) < a.r + q.r * 0.5)
                  danoAlJugador(q, a.dps * 0.35, { area: a });
            } else if (a.clase === "elem") {
              const el = ELEMENTOS[a.elemento];
              const dpsMult = statsTot(a.duenio || G.players[0]).atk / 12;
              for (const e of G.enemigos) {
                if (e.hp <= 0 && !e.dummy) continue;
                if (Math.hypot(e.x - a.x, e.y - a.y) < a.r + e.r * 0.5) {
                  if (el.dps > 0)
                    danoAEnemigo(
                      e,
                      el.dps * 0.35 * a.mult * dpsMult,
                      a.duenio || G.players[0],
                      false,
                    );
                  if (el.slow > 0) e.slowT = Math.max(e.slowT, 0.5);
                }
              }
              // fuego amigo: las áreas dañinas queman a los aliados (no al dueño, no las sagradas)
              if (
                (G.ff || G.escena === "pvp") &&
                el.dps > 0 &&
                a.elemento !== "sagrado"
              ) {
                const multFF2 = G.escena === "pvp" ? 1 : 0.5;
                for (const q of vivos()) {
                  if (q === a.duenio) continue;
                  if (Math.hypot(q.x - a.x, q.y - a.y) < a.r + q.r * 0.5)
                    danoAlJugador(q, el.dps * 0.35 * a.mult * dpsMult * multFF2, {
                      ff: a.duenio,
                    });
                }
              }
              if (el.healPS > 0)
                for (const q of vivos())
                  if (Math.hypot(q.x - a.x, q.y - a.y) < a.r)
                    curarP(q, Math.round(el.healPS * 0.35 * a.mult));
            } else {
              // sanar
              const hm = a.healMult || 1;
              for (const q of vivos())
                if (Math.hypot(q.x - a.x, q.y - a.y) < a.r)
                  curarP(q, Math.round(14 * 0.35 * hm));
            }
          }
          if (a.ttl <= 0) G.areas.splice(i, 1);
        }

        // enemigos
        for (const e of G.enemigos) {
          if (e.hurtT > 0) e.hurtT -= dt;
          // muñeco de pruebas: solo regenera y limpia su log de DPS
          if (e.dummy) {
            e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.2 * dt);
            while (e.dmgLog.length && G.stats.tiempo - e.dmgLog[0].t > 5)
              e.dmgLog.shift();
            continue;
          }
          if (e.hp <= 0) continue; // muerto este mismo frame
          // veneno del pícaro
          if (e.poisonT > 0) {
            e.poisonT -= dt;
            e.poisonTick -= dt;
            if (e.poisonTick <= 0) {
              e.poisonTick = 0.5;
              const pd = Math.max(1, Math.round(e.poisonDps * 0.5));
              e.hp -= pd;
              if (e.poisonOwner) G.stats.dano += pd;
              fxTexto(e.x, e.y - e.r - 4, pd, "#6ac04a");
              if (e.hp <= 0) {
                matarEnemigo(e);
                continue;
              }
            }
          }
          // quemadura de la bola de fuego
          if (e.burnT > 0) {
            e.burnT -= dt;
            e.burnTick = (e.burnTick || 0) - dt;
            if (e.burnTick <= 0) {
              e.burnTick = 0.5;
              const bd = Math.max(1, Math.round((e.burnDps || 0) * 0.5));
              e.hp -= bd;
              if (e.burnOwner) G.stats.dano += bd;
              fxTexto(e.x, e.y - e.r - 4, bd, "#ff7d4d");
              fxParticulas(e.x, e.y, 2, "#ff7d4d");
              if (e.hp <= 0) {
                matarEnemigo(e);
                continue;
              }
            }
          }
          // tragado por el portal arcano
          if (e.portalT > 0) {
            e.portalT -= dt;
            if (e.portalT <= 0) {
              e.x = clamp((e.portalX ?? e.x) + rnd(-24, 24), 40, W - 40);
              e.y = 42;
              e.stunT = Math.max(e.stunT, 0.55);
              fxParticulas(e.x, e.y, 10, "#c084f0");
              fxOnda(e.x, e.y, 24, "#c084f0");
              fxTexto(e.x, e.y - 16, "¡caída!", "#c084f0");
              danoAEnemigo(
                e,
                e.portalDmg || 10,
                e.portalOwner || G.players[0],
                true,
              );
              if (e.hp <= 0) continue;
            } else continue; // dentro del portal: sin IA, sin colisiones
          }
          if (e.stunT > 0) {
            e.stunT -= dt;
            e.kx *= 0.85;
            e.ky *= 0.85;
            e.x += e.kx * dt;
            e.y += e.ky * dt;
            continue;
          }
          if (e.slowT > 0) e.slowT -= dt;
          const obj = masCercano(e.x, e.y);
          if (!obj) break;
          const velF = e.vel * (e.slowT > 0 ? 0.45 : 1);
          const d = Math.hypot(obj.x - e.x, obj.y - e.y);
          const dir = Math.atan2(obj.y - e.y, obj.x - e.x);

          if (e.jefe) {
            const arq = e.arquetipo || "invocador";
            e.patCd -= dt;
            e.metCd -= dt;

            // ===== JEFE SECRETO: El Magnate =====
            if (arq === "cerdo") {
              // se acerca dando pisotones; alterna 3 patrones
              if (e.patCd <= 0) {
                e.patCd = 2.6;
                const modo = (e.cerdoModo = ((e.cerdoModo || 0) + 1) % 3);
                if (modo === 0) {
                  // ráfaga de "tuits" en abanico hacia el jugador más cercano
                  const v2 = obj;
                  const a2 = Math.atan2(v2.y - e.y, v2.x - e.x);
                  for (let k = -2; k <= 2; k++)
                    G.projs.push({
                      owner: "e",
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a2 + k * 0.22) * 260,
                      vy: Math.sin(a2 + k * 0.22) * 260,
                      r: 6,
                      dmg: e.atk,
                      tipo: "tuit",
                      color: "#4a90d9",
                      ttl: 2.6,
                    });
                  fxTexto(e.x, e.y - e.r - 12, "¡TREMENDO!", "#e9b45c");
                } else if (modo === 1) {
                  // invoca lechones (mini secuaces)
                  for (let k = 0; k < 2; k++)
                    spawnEnemigo(G.planta, "runner", false);
                  const secu = G.enemigos.slice(-2);
                  secu.forEach((s) => {
                    s.nombre = "Lechón";
                    s.hp = Math.round(s.hp * 0.6);
                    s.hpMax = s.hp;
                  });
                  fxOnda(e.x, e.y, 50, "#e9b45c");
                  fxTexto(
                    e.x,
                    e.y - e.r - 12,
                    "¡mis mejores lechones!",
                    "#e9b45c",
                  );
                } else {
                  // carga embravecida con la bandera
                  e.rushDir = Math.atan2(obj.y - e.y, obj.x - e.x);
                  e.rushT = 0.7;
                  fxTexto(e.x, e.y - e.r - 12, "¡CARGA!", "#d1545c");
                }
              }
              // ejecución de la carga
              if (e.rushT > 0) {
                e.rushT -= dt;
                e.x += Math.cos(e.rushDir) * 360 * dt;
                e.y += Math.sin(e.rushDir) * 360 * dt;
                for (const p of vivos())
                  if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 4)
                    danoAlJugador(p, e.atk * 1.3, { melee: e });
                if (Math.random() < 0.4) fxParticulas(e.x, e.y, 2, "#e9b45c");
              } else if (d > e.r + obj.r + 6) {
                e.x +=
                  Math.cos(dir) * e.vel * 0.7 * (e.slowT > 0 ? 0.45 : 1) * dt;
                e.y +=
                  Math.sin(dir) * e.vel * 0.7 * (e.slowT > 0 ? 0.45 : 1) * dt;
              }
              // invocación de refuerzos al 50%
              if (!e.invoco && e.hp < e.hpMax * 0.5) {
                e.invoco = true;
                for (let k = 0; k < 3; k++)
                  spawnEnemigo(G.planta, "melee", false);
                banner("¡El Magnate reparte cargos!");
              }
              e.x = clamp(e.x, e.r, W - e.r);
              e.y = clamp(e.y, e.r, H - e.r);
              aplicarLimites(e);
              e.hurtT = Math.max(0, e.hurtT - dt);
              if (e.stunT > 0) e.stunT -= dt;
              if (e.slowT > 0) e.slowT -= dt;
              continue;
            }

            // --- teletransporte + siega del Segador ---
            if ((arq === "segador" || arq === "eterno") && e.segT > 0) {
              e.segT -= dt;
              if (e.segT <= 0) {
                // aparece y siega en área
                fxParticulas(e.x, e.y, 10, "#57496f");
                e.x = e.segX;
                e.y = e.segY;
                fxOnda(e.x, e.y, 86, "#c07be0");
                fxParticulas(e.x, e.y, 16, "#c07be0");
                G.shake = Math.max(G.shake, 5);
                for (const p of vivos())
                  if (Math.hypot(p.x - e.x, p.y - e.y) < 86 + p.r)
                    danoAlJugador(p, e.atk * 1.6, { melee: e });
                // charca de sombra residual
                G.areas.push({
                  clase: "malArea",
                  x: e.x,
                  y: e.y,
                  r: 44,
                  ttl: 4,
                  tick: 0,
                  nace: 0.15,
                  dps: e.atk * 0.4,
                  color: "#57496f",
                });
              }
            }

            if (e.patCd <= 0) {
              if (arq === "invocador" || arq === "eterno") {
                const nP =
                  G.planta >= 90
                    ? 20
                    : G.planta >= 60
                      ? 16
                      : G.planta >= 30
                        ? 14
                        : 12;
                const vOrbe = G.planta >= 90 ? 240 : G.planta >= 60 ? 220 : 200;
                e.patCd = G.planta >= 90 ? 2.2 : G.planta >= 60 ? 2.6 : 3.2;
                for (let k = 0; k < nP; k++) {
                  const a2 = (k / nP) * TAU + e.fase;
                  G.projs.push({
                    owner: "e",
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(a2) * vOrbe,
                    vy: Math.sin(a2) * vOrbe,
                    r: 5,
                    dmg: e.atk,
                    tipo: "orbe",
                    color: "#c07be0",
                    ttl: 3.2,
                  });
                }
                e.fase += 0.35;
                G.shake = Math.max(G.shake, 3);
              } else if (arq === "segador") {
                // marca destino junto a un jugador aleatorio y desaparece
                e.patCd = 4;
                const v2 = az(vivos());
                if (v2) {
                  e.segX = clamp(v2.x + rnd(-40, 40), 50, W - 50);
                  e.segY = clamp(v2.y + rnd(-40, 40), 50, H - 50);
                  e.segT = 0.8;
                  fxOnda(e.segX, e.segY, 86, "#57496f");
                  fxTexto(e.segX, e.segY, "⚠", "#c07be0", true);
                }
              } else if (arq === "gemelos") {
                // golpe de suelo: anillo corto de orbes
                e.patCd = e.rabioso ? 2.2 : 3.2;
                for (let k = 0; k < 8; k++) {
                  const a2 = (k / 8) * TAU + e.fase;
                  G.projs.push({
                    owner: "e",
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(a2) * 180,
                    vy: Math.sin(a2) * 180,
                    r: 5,
                    dmg: e.atk * 0.9,
                    tipo: "orbe",
                    color: "#ffb84d",
                    ttl: 1.6,
                  });
                }
                e.fase += 0.5;
                G.shake = Math.max(G.shake, 3);
              } else if (arq === "tejedora") {
                // dispara telarañas que inmovilizan
                e.patCd = 2.8;
                const v2 = az(vivos());
                if (v2) {
                  const a2 = Math.atan2(v2.y - e.y, v2.x - e.x);
                  for (let k = -1; k <= 1; k++)
                    G.projs.push({
                      owner: "e",
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a2 + k * 0.3) * 190,
                      vy: Math.sin(a2 + k * 0.3) * 190,
                      r: 5,
                      dmg: e.atk * 0.4,
                      tipo: "tela",
                      color: "#e8e0d0",
                      ttl: 2.6,
                      root: true,
                    });
                }
                // deja parches de telaraña ocasionales
                if (Math.random() < 0.4)
                  G.hazards.push({
                    tipo: "telarana",
                    x: e.x + rnd(-60, 60),
                    y: e.y + rnd(-60, 60),
                    r: 24,
                    estado: 0,
                    t: 0,
                    fase: 0,
                    ttl: 8,
                  });
              } else if (arq === "magma") {
                // meteoros telegrafiados sobre los jugadores
                e.patCd = 3.2;
                for (const p of vivos()) {
                  if (Math.random() < 0.8)
                    G.rayos.push({
                      x: clamp(p.x + rnd(-30, 30), 40, W - 40),
                      y: clamp(p.y + rnd(-30, 30), 40, H - 40),
                      t: 1.0,
                      meteoro: true,
                      dmg: e.atk * 1.4,
                    });
                }
              } else if (arq === "espejo") {
                // teletransporte + tríada arcana
                e.patCd = 2.6;
                if (Math.random() < 0.45) {
                  fxParticulas(e.x, e.y, 10, "#c07be0");
                  e.x = rnd(70, W - 70);
                  e.y = rnd(70, H * 0.6);
                  fxParticulas(e.x, e.y, 10, "#c07be0");
                }
                const v2 = az(vivos());
                if (v2) {
                  const a2 = Math.atan2(v2.y - e.y, v2.x - e.x);
                  for (let k = -1; k <= 1; k++)
                    G.projs.push({
                      owner: "e",
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a2 + k * 0.22) * 250,
                      vy: Math.sin(a2 + k * 0.22) * 250,
                      r: 4,
                      dmg: e.atk,
                      tipo: "orbe",
                      color: "#c084f0",
                      ttl: 2.4,
                    });
                }
              }
            }
            // el Eterno también lanza meteoros
            if (arq === "eterno" && e.metCd <= 0) {
              e.metCd = 4;
              for (const p of vivos())
                G.rayos.push({
                  x: clamp(p.x + rnd(-30, 30), 40, W - 40),
                  y: clamp(p.y + rnd(-30, 30), 40, H - 40),
                  t: 1.0,
                  meteoro: true,
                  dmg: e.atk * 1.3,
                });
              // y marca una siega
              const v2 = az(vivos());
              if (v2) {
                e.segX = v2.x;
                e.segY = v2.y;
                e.segT = 0.8;
                fxOnda(e.segX, e.segY, 86, "#57496f");
              }
            }
            // invocación al 50% (y al 25% para el Eterno)
            if (!e.invoco && e.hp < e.hpMax * 0.5) {
              e.invoco = true;
              const nInv = G.planta >= 50 ? 3 : 2;
              if (arq === "espejo") {
                for (const p of vivos()) spawnClon(G.planta, p.rol);
              } else
                for (let k = 0; k < nInv; k++)
                  spawnEnemigo(G.planta, tipoAleatorio(G.planta), k % 2 === 0);
              banner("¡" + e.nombre + " invoca refuerzos!");
            }
            if (arq === "eterno" && !e.invoco2 && e.hp < e.hpMax * 0.25) {
              e.invoco2 = true;
              for (const p of vivos()) spawnClon(G.planta, p.rol);
              banner("¡El Eterno refleja vuestras almas!");
            }
            const velJ = arq === "magma" ? e.vel * 0.6 : e.vel;
            if (e.segT <= 0 && d > e.r + obj.r + 6) {
              e.x += Math.cos(dir) * velJ * (e.slowT > 0 ? 0.45 : 1) * dt;
              e.y += Math.sin(dir) * velJ * (e.slowT > 0 ? 0.45 : 1) * dt;
            }
          } else if (e.mini) {
            // minijefe: persecución + ráfaga radial pequeña
            e.patCd -= dt;
            if (e.patCd <= 0) {
              e.patCd = 3.5;
              for (let k = 0; k < 7; k++) {
                const a2 = (k / 7) * TAU + e.fase;
                G.projs.push({
                  owner: "e",
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(a2) * 190,
                  vy: Math.sin(a2) * 190,
                  r: 4,
                  dmg: e.atk * 0.8,
                  tipo: "orbe",
                  color: "#8a55c8",
                  ttl: 2.2,
                });
              }
              e.fase += 0.6;
            }
            if (d > e.r + obj.r - 2) {
              e.x += Math.cos(dir) * velF * dt;
              e.y += Math.sin(dir) * velF * dt;
            }
          } else if (e.tipo === "runner") {
            // acechador: carga telegrafiada
            if (e.rushT > 0) {
              e.rushT -= dt;
              e.x += Math.cos(e.rushDir) * 400 * dt;
              e.y += Math.sin(e.rushDir) * 400 * dt;
            } else if (e.telT > 0) {
              e.telT -= dt;
              if (e.telT <= 0) {
                e.rushT = 0.38;
                e.rushDir = Math.atan2(obj.y - e.y, obj.x - e.x);
              }
            } else {
              e.chargeCd -= dt;
              if (e.chargeCd <= 0 && d < 280 && d > 60) {
                e.telT = 0.35;
                e.chargeCd = 2.6;
              } else if (d > e.r + obj.r - 2) {
                e.x += Math.cos(dir) * velF * dt;
                e.y += Math.sin(dir) * velF * dt;
              }
            }
          } else if (e.tipo === "bomber") {
            if (e.fuseT >= 0) {
              e.fuseT -= dt;
              if (e.fuseT <= 0) {
                explotarBomber(e);
                continue;
              }
            } else {
              if (d < 48) {
                e.fuseT = 0.7;
              } else {
                e.x += Math.cos(dir) * velF * dt;
                e.y += Math.sin(dir) * velF * dt;
              }
            }
          } else if (e.tipo === "caster") {
            e.blinkCd -= dt;
            if (d < 130 && e.blinkCd <= 0) {
              // teletransporte lejos del jugador
              fxParticulas(e.x, e.y, 8, "#c07be0");
              const a2 = dir + Math.PI + rnd(-0.8, 0.8);
              e.x = clamp(e.x + Math.cos(a2) * 230, 40, W - 40);
              e.y = clamp(e.y + Math.sin(a2) * 230, 40, H - 40);
              fxParticulas(e.x, e.y, 8, "#c07be0");
              e.blinkCd = 4;
            } else if (d > 320) {
              e.x += Math.cos(dir) * velF * dt;
              e.y += Math.sin(dir) * velF * dt;
            }
            e.shootCd -= dt;
            if (e.shootCd <= 0 && d < 440) {
              e.shootCd = 2.2;
              for (let k = -1; k <= 1; k++) {
                const a2 = dir + k * 0.22;
                G.projs.push({
                  owner: "e",
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(a2) * 240,
                  vy: Math.sin(a2) * 240,
                  r: 4,
                  dmg: e.atk,
                  tipo: "orbe",
                  color: "#c07be0",
                  ttl: 2.5,
                });
              }
            }
          } else if (e.ranged) {
            if (d > 300) {
              e.x += Math.cos(dir) * velF * dt;
              e.y += Math.sin(dir) * velF * dt;
            } else if (d < 170) {
              e.x -= Math.cos(dir) * velF * 0.8 * dt;
              e.y -= Math.sin(dir) * velF * 0.8 * dt;
            }
            e.shootCd -= dt;
            if (e.shootCd <= 0 && d < 420) {
              e.shootCd = 1.7;
              G.projs.push({
                owner: "e",
                x: e.x,
                y: e.y,
                vx: Math.cos(dir) * 230,
                vy: Math.sin(dir) * 230,
                r: 4,
                dmg: e.atk,
                tipo: "orbe",
                color: "#d1545c",
                ttl: 2.5,
              });
            }
          } else {
            // melee y tank
            if (d > e.r + obj.r - 2) {
              e.x += Math.cos(dir) * velF * dt;
              e.y += Math.sin(dir) * velF * dt;
            }
          }

          e.kx *= 0.85;
          e.ky *= 0.85;
          e.x += e.kx * dt;
          e.y += e.ky * dt;
          // colisión con pilares: empuje + los enemigos golpean columnas destructibles al empujar
          if (e.pilCd > 0) e.pilCd -= dt;
          for (const pl of G.pilares) {
            const dd = Math.hypot(e.x - pl.x, e.y - pl.y);
            if (dd < pl.r + e.r) {
              const a2 = Math.atan2(e.y - pl.y, e.x - pl.x);
              e.x = pl.x + Math.cos(a2) * (pl.r + e.r);
              e.y = pl.y + Math.sin(a2) * (pl.r + e.r);
              if (pl.destructible && e.pilCd <= 0 && !e.dummy) {
                e.pilCd = 1;
                danoPilar(pl, e.atk * 0.7);
              }
            }
          }
          e.x = clamp(e.x, 24, W - 24);
          e.y = clamp(e.y, 24, H - 24);
          aplicarLimites(e);
          e.atkCd -= dt;
          if (e.atkCd <= 0 && e.tipo !== "bomber") {
            for (const p of vivos()) {
              if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 3) {
                e.atkCd = e.tipo === "tank" ? 1.2 : 0.9;
                const mult = e.jefe
                  ? 1.4
                  : e.tipo === "tank"
                    ? 1.25
                    : e.rushT > 0
                      ? 1.3
                      : 1;
                danoAlJugador(p, e.atk * mult, { melee: e });
                break;
              }
            }
          }
        }
        for (let i = G.enemigos.length - 1; i >= 0; i--)
          if (G.enemigos[i].hp <= 0 && !G.enemigos[i].dummy)
            G.enemigos.splice(i, 1);

        // Arena PvP: comprueba si sólo queda un aspirante en pie
        if (G.escena === "pvp" && G.activo) {
          if (G.pvpFinT > 0) {
            G.pvpFinT -= dt;
            if (G.pvpFinT <= 0) iniciarLobby();
          } else {
            const v = vivos();
            if (v.length <= 1) {
              if (v.length === 1) {
                banner("⚔ ¡" + v[0].nombre + " gana la Arena!");
                toast("🏆 " + v[0].nombre + " es el vencedor", "#e9b45c");
              } else {
                banner("Combate sin vencedor");
              }
              G.pvpFinT = 3.5;
            }
          }
        }

        if (
          G.escena === "torre" &&
          G.enemigos.length === 0 &&
          !G.portal &&
          G.activo
        ) {
          if (G.planta === MAX_PLANTA) {
            finPartida(true);
            return;
          }
          // XP por completar planta
          const xpPlanta = XP_POR_PLANTA * (esJefe(G.planta) ? 4 : 1);
          for (const p of G.players) if (!p.ko) ganarXP(p, xpPlanta);
          // si algún jugador tiene tarjetas pendientes, abrir pantalla de cartas primero
          const conCartas = G.players.filter((p) => p.cartasPendientes > 0);
          if (conCartas.length > 0) {
            G.pausa = true;
            abrirCartasParaJugador(conCartas, 0, () => {
              G.pausa = false;
              plantaDespejada();
            });
          } else {
            plantaDespejada();
          }
        }

        // drops (cada jugador tiene su propia bolsa)
        for (let i = G.drops.length - 1; i >= 0; i--) {
          const dr = G.drops[i];
          const p = vivos().find(
            (q) => Math.hypot(dr.x - q.x, dr.y - q.y) < 26,
          );
          if (p) {
            if (dr.tipo === "vial") {
              curarP(p, Math.round(statsTot(p).hpMax * 0.15));
              sfx("carta");
            } else if (dr.tipo === "moneda") {
              const gan = Math.max(
                1,
                Math.round(dr.val * (1 + 0.1 * META.mejoras.fortuna)),
              );
              G.oroRun += gan;
              sfx("moneda");
              fxTexto(p.x, p.y - 30, "+" + gan + " 🪙", "#ffd27f");
            } else {
              p.bolsa.push(dr.item);
              sfx("moneda");
              toast(
                p.nombre +
                  " recoge " +
                  dr.item.nombre +
                  " [" +
                  RAREZAS[dr.item.rareza].n +
                  "] — Tab/Start",
                RAREZAS[dr.item.rareza].col,
              );
            }
            G.drops.splice(i, 1);
          }
        }

        // objetos interactivos por proximidad (cristal de maná)
        for (let i = G.objetos.length - 1; i >= 0; i--) {
          const o = G.objetos[i];
          if (o.tipo === "cristal") {
            const p = vivos().find(
              (q) => Math.hypot(o.x - q.x, o.y - q.y) < 24,
            );
            if (p) {
              p.res = clamp(p.res + 45, 0, ROLES[p.rol].res);
              fxTexto(
                p.x,
                p.y - 30,
                "+45 " + ROLES[p.rol].resNombre,
                "#6fb8e8",
              );
              fxParticulas(o.x, o.y, 8, "#6fb8e8");
              G.objetos.splice(i, 1);
            }
          }
        }

        // mercader (solo en lobby): abrir tienda por proximidad
        if (G.escena === "lobby" && G.mercader) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.mercader.x - q.x, G.mercader.y - q.y) < 50,
          );
          if (cerca && !G.tiendaLock && !G.pausa) {
            abrirTienda();
          }
          if (!cerca) G.tiendaLock = false;
        }
        // sastre de skins (solo en lobby)
        if (G.escena === "lobby" && G.skinNpc) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.skinNpc.x - q.x, G.skinNpc.y - q.y) < 50,
          );
          if (cerca && !G.skinLock && !G.pausa) {
            abrirSkins();
          }
          if (!cerca) G.skinLock = false;
        }
        // portal de la Arena PvP (solo en lobby): jugadores contra jugadores
        if (G.escena === "lobby" && G.arenaNpc) {
          const cerca = vivos().some(
            (q) => Math.hypot(G.arenaNpc.x - q.x, G.arenaNpc.y - q.y) < 50,
          );
          if (cerca && !G.arenaLock && !G.pausa) {
            abrirArenaPvp();
          }
          if (!cerca) G.arenaLock = false;
        }

        // fogata
        if (G.fogata && !G.fogataUsada) {
          const alguien = vivos().some(
            (q) => Math.hypot(G.fogata.x - q.x, G.fogata.y - q.y) < 52,
          );
          if (alguien) {
            G.descansoT += dt;
            if (G.descansoT >= 2.2) {
              G.fogataUsada = true;
              for (const q of G.players) {
                if (q.ko) continue;
                curarP(q, Math.round(statsTot(q).hpMax * 0.35));
                q.res = clamp(
                  q.res + ROLES[q.rol].res * 0.5,
                  0,
                  ROLES[q.rol].res,
                );
              }
              toast("El grupo descansa junto al fuego", "#7fd4c1");
            }
          } else if (G.descansoT > 0)
            G.descansoT = Math.max(0, G.descansoT - dt * 2);
        }

        // portal: todos los vivos dentro
        if (G.portal) {
          G.portal.t += dt;
          const vs = vivos();
          const dentro = vs.filter(
            (q) =>
              Math.hypot(G.portal.x - q.x, G.portal.y - q.y) < G.portal.r + 12,
          ).length;
          G.portal.dentro = dentro;
          G.portal.total = vs.length;
          if (vs.length > 0 && dentro === vs.length) {
            if (G.escena === "lobby") {
              G.planta = 1;
              iniciarPlanta();
              return;
            }
            G.planta++;
            const conCartas = G.players.filter((p) => p.cartasPendientes > 0);
            if (conCartas.length > 0) {
              G.pausa = true;
              abrirCartasParaJugador(conCartas, 0, () => {
                G.pausa = false;
                iniciarPlanta();
              });
            } else {
              iniciarPlanta();
            }
            return;
          }
        }

        // ---- hazards: progresión de grietas y caducidad de telarañas ----
        for (let i = G.hazards.length - 1; i >= 0; i--) {
          const hz = G.hazards[i];
          if (hz.tipo === "grieta" && hz.estado === 1) {
            hz.t -= dt;
            if (hz.t <= 0) {
              hz.estado = 2;
              fxParticulas(hz.x, hz.y, 10, "#26232f");
              G.shake = Math.max(G.shake, 2);
            }
          }
          if (hz.ttl !== undefined) {
            hz.ttl -= dt;
            if (hz.ttl <= 0) G.hazards.splice(i, 1);
          }
          hz.fase += dt;
        }

        // ---- clima ----
        if (G.escena === "torre") {
          if (G.clima === "lluvia" || G.clima === "tormenta") {
            for (let k = 0; k < (G.clima === "tormenta" ? 4 : 2); k++)
              G.wx.push({
                x: rnd(0, W),
                y: -10,
                vy: rnd(420, 560),
                vx: rnd(-40, -15),
                t: 1.4,
                tipo: "gota",
              });
          } else if (G.clima === "ceniza") {
            if (Math.random() < 0.5)
              G.wx.push({
                x: rnd(0, W),
                y: -6,
                vy: rnd(25, 55),
                vx: rnd(-14, 14),
                t: 12,
                tipo: "ceniza",
                fase: rnd(0, TAU),
              });
          }
          if (G.clima === "tormenta") {
            G.rayoCd -= dt;
            if (G.rayoCd <= 0) {
              G.rayoCd = rnd(4.5, 8);
              // el rayo cae cerca de una entidad aleatoria
              const objetivo =
                Math.random() < 0.6
                  ? az(vivos())
                  : az(G.enemigos.filter((e) => !e.dummy));
              const rx = objetivo
                ? clamp(objetivo.x + rnd(-50, 50), 40, W - 40)
                : rnd(60, W - 60);
              const ry = objetivo
                ? clamp(objetivo.y + rnd(-50, 50), 40, H - 40)
                : rnd(60, H - 60);
              G.rayos.push({
                x: rx,
                y: ry,
                t: 0.85,
                meteoro: false,
                dmg: escalaEnemigo(Math.max(1, G.planta)).atkBase * 1.2,
              });
            }
          }
        }
        for (let i = G.wx.length - 1; i >= 0; i--) {
          const w2 = G.wx[i];
          w2.x += (w2.vx || 0) * dt;
          w2.y += w2.vy * dt;
          w2.t -= dt;
          if (w2.t <= 0 || w2.y > H + 10) G.wx.splice(i, 1);
        }
        // impactos telegrafiados: rayos de tormenta y meteoros de jefe
        if (G.flashT > 0) G.flashT -= dt;
        for (let i = G.rayos.length - 1; i >= 0; i--) {
          const ry = G.rayos[i];
          ry.t -= dt;
          if (ry.t <= 0) {
            G.rayos.splice(i, 1);
            G.shake = Math.max(G.shake, 5);
            if (!ry.meteoro) G.flashT = 0.14;
            fxOnda(ry.x, ry.y, 46, ry.meteoro ? "#ff7d4d" : "#cfe4ff");
            fxParticulas(ry.x, ry.y, 14, ry.meteoro ? "#ff9d3d" : "#cfe4ff");
            // daña a jugadores Y enemigos
            for (const p of vivos())
              if (Math.hypot(p.x - ry.x, p.y - ry.y) < 46 + p.r)
                danoAlJugador(p, ry.dmg, { rayo: true });
            for (const e of G.enemigos) {
              if ((e.hp <= 0 && !e.dummy) || e.jefe) continue;
              if (Math.hypot(e.x - ry.x, e.y - ry.y) < 46 + e.r) {
                const rd = Math.max(1, Math.round(ry.dmg));
                if (e.dummy) {
                  e.hp = Math.max(1, e.hp - rd);
                  e.dmgLog.push({ t: G.stats.tiempo, d: rd });
                } else {
                  e.hp -= rd;
                  fxTexto(e.x, e.y - e.r - 6, rd, "#cfe4ff");
                  if (e.hp <= 0) matarEnemigo(e);
                }
              }
            }
            // los meteoros dejan suelo en llamas
            if (ry.meteoro)
              G.hazards.push({
                tipo: "fuegoZona",
                x: ry.x,
                y: ry.y,
                r: 26,
                estado: 0,
                t: 0,
                fase: 0,
                ttl: 6,
              });
          }
        }

        for (let i = G.fx.length - 1; i >= 0; i--) {
          G.fx[i].t -= dt;
          if (G.fx[i].t <= 0) G.fx.splice(i, 1);
        }
        for (let i = G.toasts.length - 1; i >= 0; i--) {
          G.toasts[i].t -= dt;
          if (G.toasts[i].t <= 0) G.toasts.splice(i, 1);
        }
        if (G.banner.t > 0) G.banner.t -= dt;
        if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
      }
