// Auto-generated during the modularization refactor (2026-07-23).
import { H, TAU, W } from "../core/canvas.js";
import { MAX_NIV_PJ, ROLES, SLOTS, XP_POR_PLANTA, XP_TABLA } from "../core/constants.js";
import { META } from "../core/save.js";
import { G } from "../core/state.js";
import { fxOnda, fxParticulas, fxTexto } from "../render/effects.js";
import { NIVEL_ULTI, danoPilar, golpeObjeto } from "./abilities.js";
import { sfx } from "./audio.js";
import { NOMBRES_MINI, arquetipoJefe, escalaEnemigo, nombreJefe } from "./bosses.js";
import { puntoValido } from "./floorgen.js";
import { finPartida, genItem } from "./loot.js";
import { banner, toast } from "../ui/notifications.js";
import { az, clamp, ri, rnd } from "../utils/helpers.js";

export function statsTot(p) {
        if (p._netStats) return p._netStats;
        const b = ROLES[p.rol];
        const t = {
          atk: b.atk,
          hpMax: b.hp,
          armor: b.armor,
          crit: b.crit,
          vel: b.vel,
          cdr: 0,
        };
        for (const s of SLOTS) {
          const it = p.equipo[s];
          if (!it) continue;
          for (const k in it.stats) {
            if (k === "hp") t.hpMax += it.stats[k];
            else t[k] += it.stats[k];
          }
        }
        // bonuses de cartas de nivel
        t.hpMax += p._bonusHP || 0;
        t.atk += p._bonusAtk || 0;
        t.armor += p._bonusArmor || 0;
        t.vel += p._bonusVel || 0;
        t.crit += p._bonusCrit || 0;
        t.cdr += p._bonusCdr || 0;
        // mejoras permanentes del mercader
        t.hpMax += META.mejoras.hp * 15;
        t.atk += META.mejoras.atk * 2;
        t.armor += META.mejoras.armor;
        t.vel += META.mejoras.vel * 4;
        // formas del druida
        if (p.rol === "druida" && p.forma && p.forma !== "humano") {
          if (p.forma === "aguila") {
            t.vel += 55;
            t.armor = Math.max(0, t.armor - 2);
            t.atk = Math.round(t.atk * 0.85);
          } else if (p.forma === "lobo") {
            t.vel += 22;
            t.crit += 15;
            t.atk = Math.round(t.atk * 1.15);
          } else if (p.forma === "oso") {
            t.armor += 10;
            t.vel -= 28;
            t.atk = Math.round(t.atk * 1.25);
          }
        }
        t.cdr = clamp(t.cdr, 0, 55);
        t.crit = clamp(t.crit, 0, 85);
        return t;
      }

export const vivos = () => G.players.filter((p) => !p.ko);

export function masCercano(x, y) {
        let mejor = null,
          md = 1e9;
        for (const p of vivos()) {
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < md) {
            md = d;
            mejor = p;
          }
        }
        return mejor;
      }

export function spawnClon(f, rol) {
        const esc = escalaEnemigo(f);
        let x,
          y,
          it = 0;
        do {
          x = rnd(60, W - 60);
          y = rnd(60, H * 0.5);
          it++;
        } while (
          (G.players.some((p) => Math.hypot(x - p.x, y - p.y) < 180) ||
            !puntoValido(x, y, 16)) &&
          it < 35
        );
        const hp = Math.round(
          esc.hpBase * 1.4 * (1 + 0.5 * (G.players.length - 1)),
        );
        G.enemigos.push({
          tipo: "melee",
          clonRol: rol,
          jefe: false,
          elite: false,
          ranged: false,
          nombre: "Reflejo de " + ROLES[rol].nombre.split(" ")[0],
          x,
          y,
          r: 17,
          hp,
          hpMax: hp,
          atk: Math.round(esc.atkBase * 1.15),
          vel: Math.min(esc.velBase * 1.05, 150),
          knockRes: 1,
          atkCd: rnd(0.3, 0.9),
          shootCd: 99,
          patCd: 99,
          chargeCd: 99,
          telT: 0,
          rushT: 0,
          rushDir: 0,
          blinkCd: 99,
          fuseT: -1,
          pilCd: 0,
          poisonT: 0,
          poisonDps: 0,
          poisonTick: 0,
          poisonOwner: null,
          burnT: 0,
          burnDps: 0,
          burnTick: 0,
          burnOwner: null,
          portalT: 0,
          portalX: 0,
          portalDmg: 0,
          portalOwner: null,
          stunT: 0,
          hurtT: 0,
          slowT: 0,
          kx: 0,
          ky: 0,
          fase: 0,
          invoco: false,
        });
      }

export function tipoAleatorio(f) {
        const pool = ["melee", "melee"];
        if (f >= 3) pool.push("ranged");
        if (f >= 8) pool.push("runner", "runner");
        if (f >= 12) pool.push("bomber");
        if (f >= 15) pool.push("tank");
        if (f >= 25) pool.push("caster");
        if (f >= 40) pool.push("bomber", "runner");
        if (f >= 60) pool.push("tank", "caster");
        return az(pool);
      }

export function spawnEnemigo(f, tipo, esElite) {
        const N = G.players.length;
        let x,
          y,
          it = 0;
        do {
          const lado = ri(0, 3);
          x = lado < 2 ? rnd(60, W - 60) : lado === 2 ? 60 : W - 60;
          y = lado === 0 ? 60 : lado === 1 ? H - 60 : rnd(60, H - 60);
          it++;
        } while (
          (G.players.some((p) => Math.hypot(x - p.x, y - p.y) < 220) ||
            !puntoValido(x, y, 18)) &&
          it < 40
        );
        if (!puntoValido(x, y, 18)) {
          x = W / 2 + rnd(-40, 40);
          y = H * 0.3;
        }

        const jefe = tipo === "jefe";
        const elite = !!esElite && !jefe;
        const esc = escalaEnemigo(f);
        // multiplicadores por tipo
        const TIPOS = {
          melee: { hpM: 1, atkM: 1, velM: 1, r: 14 },
          ranged: { hpM: 0.8, atkM: 1.1, velM: 0.85, r: 13 },
          runner: { hpM: 0.55, atkM: 0.9, velM: 1.35, r: 11 },
          tank: { hpM: 2.4, atkM: 1.3, velM: 0.5, r: 19 },
          caster: { hpM: 0.7, atkM: 1.15, velM: 0.7, r: 13 },
          bomber: { hpM: 0.5, atkM: 1.6, velM: 1.2, r: 12 },
          mini: { hpM: 3.4, atkM: 1.35, velM: 0.7, r: 22 },
          jefe: { hpM: 1, atkM: 1.6, velM: 0.75, r: 28 },
        };
        const tp = TIPOS[tipo] || TIPOS.melee;
        const multTipo = jefe
          ? f >= 90
            ? 14
            : f >= 70
              ? 10
              : f >= 50
                ? 8
                : 6
          : tp.hpM * (elite ? 2.2 : 1);
        const multCoop = 1 + 0.5 * (N - 1);
        const hp = Math.round(esc.hpBase * multTipo * multCoop);
        const vel = Math.min(
          esc.velBase * tp.velM * (elite ? 1.1 : 1),
          jefe ? 130 : tipo === "runner" ? 185 : 145,
        );
        const atk = Math.round(esc.atkBase * tp.atkM * (elite ? 1.3 : 1));
        const NOMBRES_TIPO = {
          melee: "Sombra",
          ranged: "Vigía",
          runner: "Acechador",
          tank: "Gólem",
          caster: "Hechicero",
          bomber: "Detonante",
        };
        const mini = tipo === "mini";

        G.enemigos.push({
          tipo,
          jefe,
          elite,
          mini,
          arquetipo: jefe ? arquetipoJefe(f) : null,
          ranged: tipo === "ranged" || tipo === "caster",
          nombre: jefe
            ? nombreJefe(f)
            : mini
              ? az(NOMBRES_MINI)
              : (elite ? "Élite · " : "") + (NOMBRES_TIPO[tipo] || "Sombra"),
          x,
          y,
          r: jefe ? 28 : elite ? tp.r + 4 : tp.r,
          hp,
          hpMax: hp,
          atk,
          vel,
          knockRes: tipo === "tank" ? 0.35 : jefe ? 0.15 : mini ? 0.4 : 1,
          atkCd: rnd(0.3, 0.9),
          shootCd: rnd(0.8, 1.8),
          patCd: rnd(1.8, 3.2),
          chargeCd: rnd(1, 2),
          telT: 0,
          rushT: 0,
          rushDir: 0,
          blinkCd: rnd(2, 4),
          fuseT: -1,
          pilCd: 0,
          poisonT: 0,
          poisonDps: 0,
          poisonTick: 0,
          poisonOwner: null,
          burnT: 0,
          burnDps: 0,
          burnTick: 0,
          burnOwner: null,
          portalT: 0,
          portalX: 0,
          portalDmg: 0,
          portalOwner: null,
          metCd: rnd(2, 3),
          segT: 0,
          segX: 0,
          segY: 0,
          stunT: 0,
          hurtT: 0,
          slowT: 0,
          kx: 0,
          ky: 0,
          fase: Math.random() * TAU,
          invoco: false,
          invoco2: false,
        });
      }

export function danoAEnemigo(e, raw, duenio, puedeCrit, kbx, kby) {
        if (e.hp <= 0 && !e.dummy) return;
        const t = statsTot(duenio);
        let dmg = raw * (0.9 + Math.random() * 0.2);
        const crit = puedeCrit && Math.random() * 100 < t.crit;
        if (crit) dmg *= 1.7;
        dmg = Math.max(1, Math.round(dmg));
        e.hurtT = 0.12;
        if (e.dummy) {
          e.hp = Math.max(1, e.hp - dmg);
          e.dmgLog.push({ t: G.stats.tiempo, d: dmg });
          fxTexto(e.x, e.y - e.r - 6, dmg, crit ? "#e9b45c" : "#e9e3d5", crit);
          return;
        }
        e.hp -= dmg;
        const kr = e.knockRes !== undefined ? e.knockRes : 1;
        e.kx += (kbx || 0) * kr;
        e.ky += (kby || 0) * kr;
        G.stats.dano += dmg;
        fxTexto(e.x, e.y - e.r - 6, dmg, crit ? "#e9b45c" : "#e9e3d5", crit);
        if (G.lobby === "malos") {
          const robo = Math.round(dmg * 0.12);
          if (robo > 0) curarP(duenio, robo, true);
        }
        if (e.hp <= 0) matarEnemigo(e);
      }

export function matarEnemigo(e) {
        G.stats.derrotados++;
        sfx(e.jefe ? "jefe" : "muerte");
        fxParticulas(e.x, e.y, e.jefe ? 26 : 10, "#6a5a94");
        if (e.jefe) G.shake = Math.max(G.shake, 8);
        // gemelos: el superviviente entra en cólera
        if (e.gemelo) {
          const otro = G.enemigos.find((o) => o !== e && o.gemelo && o.hp > 0);
          if (otro && !otro.rabioso) {
            otro.rabioso = true;
            otro.atk = Math.round(otro.atk * 1.45);
            otro.vel = Math.min(otro.vel * 1.35, 150);
            fxOnda(otro.x, otro.y, 60, "#ff5c5c");
            banner("¡El Coloso superviviente enfurece!");
          }
        }
        if (Math.random() < 0.12)
          G.drops.push({ tipo: "vial", x: e.x, y: e.y });
        // monedas
        if (e.jefe || e.mini || Math.random() < 0.6) {
          const val = Math.max(
            1,
            Math.round(
              (1 + G.planta * 0.3) *
                (e.jefe ? 15 : e.mini ? 6 : e.elite ? 3 : 1),
            ),
          );
          G.drops.push({
            tipo: "moneda",
            x: e.x + rnd(-10, 10),
            y: e.y + rnd(-10, 10),
            val,
          });
        }
        if (e.jefe || e.mini || Math.random() < 0.22) {
          const it2 = genItem(G.planta + (e.jefe ? 2 : e.mini ? 1 : 0));
          if (e.jefe)
            it2.rareza = Math.max(
              it2.rareza,
              G.planta >= 90 ? 3 : G.planta >= 50 ? 2 : 1,
            );
          if (e.mini) it2.rareza = Math.max(it2.rareza, 1);
          G.drops.push({
            tipo: "item",
            x: e.x + rnd(-8, 8),
            y: e.y + rnd(-8, 8),
            item: it2,
          });
        }
        // XP por matar
        const xpGanado = Math.round(
          e.jefe
            ? XP_POR_PLANTA * 4
            : e.mini
              ? XP_POR_PLANTA * 1.6
              : e.elite
                ? XP_POR_PLANTA * 0.8
                : XP_POR_PLANTA * 0.2,
        );
        for (const p of G.players) if (!p.ko) ganarXP(p, xpGanado);
      }

export function ganarXP(p, cantidad) {
        if (p.nivel >= MAX_NIV_PJ) return;
        p.xp += cantidad;
        while (p.nivel < MAX_NIV_PJ && p.xp >= p.xpSig) {
          p.xp -= p.xpSig;
          p.nivel++;
          sfx("nivel");
          p.xpSig = XP_TABLA[Math.min(p.nivel, MAX_NIV_PJ - 1)];
          if (p.nivel % 4 === 0) {
            p.cartasPendientes++;
          }
          if (p.nivel === NIVEL_ULTI) {
            toast(
              p.nombre +
                ": ⚡ ¡ULTI DESBLOQUEADA! (" +
                ROLES[p.rol].skill.nombre +
                " — E / Y)",
              "#e9b45c",
            );
            fxOnda(p.x, p.y, 64, "#ffd27f");
          }
          // celebración
          p.lvlT = 1.5;
          fxOnda(p.x, p.y, 50, "#e9b45c");
          fxOnda(p.x, p.y, 80, "#ffd27f");
          fxParticulas(p.x, p.y - 10, 20, "#e9b45c");
          fxParticulas(p.x, p.y - 10, 8, "#fff0c8");
          G.fx.push({
            tipo: "txt",
            x: p.x,
            y: p.y - 50,
            txt: "¡NIVEL " + p.nivel + "!",
            col: "#ffd27f",
            t: 1.6,
            t0: 1.6,
            grande: true,
          });
          G.shake = Math.max(G.shake, 3);
          toast(
            p.nombre +
              " sube al nivel " +
              p.nivel +
              (p.nivel % 4 === 0 ? " — ¡Tarjeta disponible!" : ""),
            "#e9b45c",
          );
        }
      }

export function curarP(p, cant, silencio) {
        if (p.ko) return;
        if (G.lobby === "buenos") cant = Math.round(cant * 1.2);
        const t = statsTot(p),
          antes = p.hp;
        p.hp = clamp(p.hp + cant, 0, t.hpMax);
        const real = p.hp - antes;
        if (real > 0 && !silencio)
          fxTexto(p.x, p.y - 24, "+" + real, "#7fd4c1");
      }

export function danoAlJugador(p, raw, fuente) {
        if (p.ko || p.invulT > 0) {
          if (!p.ko) fxTexto(p.x, p.y - 24, "esquivado", "#7fd4c1");
          return;
        }
        if (p.parryT > 0) {
          parryExitoso(p, fuente);
          return;
        }
        sfx("daño");
        const t = statsTot(p);
        let dmg = Math.max(
          1,
          Math.round(raw * (0.9 + Math.random() * 0.2) - t.armor * 0.6),
        );
        if (p.escudo > 0) {
          const abs = Math.min(p.escudo, dmg);
          p.escudo -= abs;
          dmg -= abs;
          if (abs > 0) fxTexto(p.x, p.y - 24, "-" + abs + " 🛡", "#8fb8e8");
        }
        if (dmg > 0) {
          p.hp -= dmg;
          p.golpeT = 0.25;
          G.shake = Math.max(G.shake, 4);
          fxTexto(p.x, p.y - 24, "-" + dmg, "#d1545c");
        }
        if (p.hp <= 0) {
          p.hp = 0;
          p.ko = true;
          p.reviveT = 0;
          if (p.rol === "druida") p.forma = "humano";
          fxOnda(p.x, p.y, 40, "#d1545c");
          if (G.escena === "pvp")
            toast(p.nombre + " ha sido eliminado", "#d1545c");
          else
            toast(p.nombre + " ha caído — acércate para reanimar", "#d1545c");
          if (G.escena !== "pvp" && vivos().length === 0) finPartida(false);
        }
      }

function parryExitoso(p, fuente) {
        p.parryT = 0;
        p.parryCd = 0.45;
        sfx("parry");
        G.stats.parries++;
        // cadena de parries: cada parry consecutivo (sin dejar pasar más de
        // ~2.6s entre uno y otro) escala el contraataque; al 4º eslabón se
        // desata una onda de choque que aturde y golpea a todo enemigo cerca.
        p.parryCombo = (p.parryCombo || 0) + 1;
        p.parryComboT = 2.6;
        const combo = p.parryCombo;
        const escalon = Math.min(combo - 1, 3);
        const mult = 1.5 + escalon * 0.25; // 1.5 / 1.75 / 2 / 2.25
        const stunDur = 1.2 + escalon * 0.15;
        G.shake = Math.max(G.shake, 5 + escalon * 2);
        fxOnda(p.x, p.y, 70 + escalon * 12, "#e9b45c");
        fxTexto(
          p.x,
          p.y - 30,
          combo > 1 ? "¡PARRY x" + combo + "!" : "¡PARRY!",
          "#e9b45c",
          true,
        );
        const t = statsTot(p);
        if (fuente.melee) {
          const e = fuente.melee;
          e.stunT = Math.max(e.stunT, stunDur);
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          danoAEnemigo(
            e,
            t.atk * mult,
            p,
            true,
            Math.cos(a) * 160,
            Math.sin(a) * 160,
          );
        } else if (fuente.ff && G.escena === "pvp") {
          // duelo de parry en la Arena: el rival que golpeó recibe el
          // contraataque directamente (si él también está parryando en
          // ese instante, su propio parry se resuelve al procesar esto)
          danoAlJugador(fuente.ff, t.atk * mult, { ff: p });
        }
        // parryHeal de carta
        if (p._parryHeal > 0) {
          curarP(p, Math.round(statsTot(p).hpMax * p._parryHeal), false);
        }
        if (fuente.proj) {
          const pr = fuente.proj;
          pr.owner = "p";
          pr.duenio = p;
          pr.dmg *= 1.4 + escalon * 0.1;
          pr.vx *= -1.35;
          pr.vy *= -1.35;
          pr.color = "#e9b45c";
          pr.parried = true;
        }
        for (const pr of G.projs) {
          if (pr.owner === "e" && Math.hypot(pr.x - p.x, pr.y - p.y) < 70) {
            pr.owner = "p";
            pr.duenio = p;
            pr.dmg *= 1.4;
            pr.vx *= -1.35;
            pr.vy *= -1.35;
            pr.color = "#e9b45c";
            pr.parried = true;
          }
        }
        // cadena perfecta (4 parries seguidos): estallido de contraataque
        if (combo >= 4) {
          G.shake = Math.max(G.shake, 10);
          fxOnda(p.x, p.y, 150, "#ffe6a3");
          fxTexto(p.x, p.y - 48, "¡CADENA PERFECTA!", "#ffd27f", true);
          for (const e of G.enemigos) {
            if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 150) {
              e.stunT = Math.max(e.stunT, 1.3);
              danoAEnemigo(
                e,
                t.atk * 1.8,
                p,
                true,
                (e.x - p.x) * 0.7,
                (e.y - p.y) * 0.7,
              );
            }
          }
          p.hasteT = Math.max(p.hasteT, 2.5);
          p.parryCombo = 0;
          p.parryComboT = 0;
        }
      }

export function explotarBomber(e) {
        e.hp = 0;
        fxOnda(e.x, e.y, 70, "#ff9d3d");
        fxOnda(e.x, e.y, 45, "#ff5c5c");
        fxParticulas(e.x, e.y, 18, "#ff9d3d");
        G.shake = Math.max(G.shake, 6);
        for (const p of vivos()) {
          if (Math.hypot(p.x - e.x, p.y - e.y) < 70 + p.r)
            danoAlJugador(p, e.atk, { melee: e });
        }
        for (const pl of G.pilares) {
          if (pl.destructible && Math.hypot(pl.x - e.x, pl.y - e.y) < 80)
            danoPilar(pl, e.atk * 2);
        }
        for (let i = G.objetos.length - 1; i >= 0; i--) {
          const o = G.objetos[i];
          if (o.tipo === "barril" && Math.hypot(o.x - e.x, o.y - e.y) < 80)
            golpeObjeto(o, 99);
        }
        matarEnemigo(e);
      }
